'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'
import { fmtDateTime, fmtDate, fmtTime } from '@/lib/date'
import { usePullToRefresh } from '@/lib/usePullToRefresh'
import { useCountUp } from '@/lib/useCountUp'

type Receipt = {
  id: string; receipt_number: number; total_amount: number
  payment_type: string; created_at: string; debtor_name?: string
  items?: any[]
}
type PaidDebt = {
  id: string; debtor_name: string; amount: number; product_name: string
  quantity: number; paid_at: string; created_at: string; debtor_phone?: string
}
type Period = 'today' | 'week' | 'month'
type StagnantProduct = {
  id: string; name: string; price: number; quantity: number
  unit?: string; category?: string
  lastSale: string | null; daysSince: number | null
}

export default function ReportPage() {
  const { store, lang, refresh } = useApp()
  const T = t[lang]
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [paidDebts, setPaidDebts] = useState<PaidDebt[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; count: number; amount: number }[]>([])
  const [unpaidTotal, setUnpaidTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('today')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showStagnant, setShowStagnant] = useState(false)
  const [stagnantProducts, setStagnantProducts] = useState<StagnantProduct[]>([])
  const [stagnantLoading, setStagnantLoading] = useState(false)

  const ptr = usePullToRefresh(useCallback(() => loadData(), [store.id, period]))

  useEffect(() => { loadData() }, [store.id, refresh, period])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()
    const now = new Date()
    let from = ''
    if (period === 'today') from = now.toISOString().split('T')[0]
    else if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString() }
    else { const d = new Date(now); d.setDate(d.getDate() - 30); from = d.toISOString() }

    const [receiptsRes, unpaidRes, paidDebtsRes] = await Promise.all([
      // Тек қолма-қол және Kaspi чектері
      supabase.from('receipts').select('*').eq('store_id', store.id)
        .gte('created_at', from).neq('payment_type', 'debt')
        .order('created_at', { ascending: false }),
      supabase.from('debts').select('amount').eq('store_id', store.id).eq('is_paid', false),
      // Кезеңде төленген қарыздар (paid_at бойынша)
      supabase.from('debts').select('*').eq('store_id', store.id)
        .eq('is_paid', true).gte('paid_at', from)
        .order('paid_at', { ascending: false }),
    ])

    // Топ продаж үшін 30 күн
    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)
    const { data: salesData } = await supabase.from('sales').select('product_name, quantity, amount')
      .eq('store_id', store.id).gte('created_at', monthAgo.toISOString())

    const topMap: Record<string, { count: number; amount: number }> = {}
    salesData?.forEach(s => {
      if (!topMap[s.product_name]) topMap[s.product_name] = { count: 0, amount: 0 }
      topMap[s.product_name].count += Number(s.quantity)
      topMap[s.product_name].amount += s.amount
    })
    const top = Object.entries(topMap).sort((a, b) => b[1].count - a[1].count).slice(0, 3).map(([name, v]) => ({ name, ...v }))

    const allReceipts = receiptsRes.data || []
    const receiptsWithItems = await Promise.all(allReceipts.map(async (r: any) => {
      const { data: items } = await supabase.from('sales').select('*').eq('receipt_id', r.id)
      return { ...r, items: items || [] }
    }))

    setReceipts(receiptsWithItems)
    setPaidDebts(paidDebtsRes.data || [])
    setTopProducts(top)
    setUnpaidTotal((unpaidRes.data || []).reduce((s: number, d: any) => s + d.amount, 0))
    setLoading(false)
  }

  async function loadStagnantProducts() {
    setStagnantLoading(true)
    const supabase = createClient()
    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)

    const [productsRes, salesRes] = await Promise.all([
      supabase.from('products').select('*').eq('store_id', store.id).gt('quantity', 0),
      supabase.from('sales').select('product_id, created_at').eq('store_id', store.id),
    ])

    // Build last sale date per product
    const lastSaleMap: Record<string, string> = {}
    salesRes.data?.forEach((s: any) => {
      if (s.product_id && (!lastSaleMap[s.product_id] || s.created_at > lastSaleMap[s.product_id])) {
        lastSaleMap[s.product_id] = s.created_at
      }
    })

    const stagnant = (productsRes.data || [])
      .filter((p: any) => {
        const last = lastSaleMap[p.id]
        if (!last) return true
        return new Date(last) < monthAgo
      })
      .map((p: any) => {
        const last = lastSaleMap[p.id] || null
        const daysSince = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null
        return { ...p, lastSale: last, daysSince }
      })
      .sort((a: StagnantProduct, b: StagnantProduct) => {
        if (a.daysSince === null && b.daysSince === null) return 0
        if (a.daysSince === null) return -1
        if (b.daysSince === null) return 1
        return b.daysSince - a.daysSince
      })

    setStagnantProducts(stagnant)
    setStagnantLoading(false)
  }

  const cashTotal = receipts.filter(r => r.payment_type === 'cash').reduce((s, r) => s + r.total_amount, 0)
  const kaspiTotal = receipts.filter(r => r.payment_type === 'kaspi').reduce((s, r) => s + r.total_amount, 0)
  const paidDebtTotal = paidDebts.reduce((s, d) => s + d.amount, 0)
  const total = cashTotal + kaspiTotal + paidDebtTotal

  const displayTotal     = useCountUp(total,        700)
  const displayCash      = useCountUp(cashTotal,     600)
  const displayKaspi     = useCountUp(kaspiTotal,    600)
  const displayPaidDebt  = useCountUp(paidDebtTotal, 600)
  const displayUnpaid    = useCountUp(unpaidTotal,   600)

  const periods = [
    { key: 'today', kz: 'Бүгін', ru: 'Сегодня' },
    { key: 'week', kz: '7 күн', ru: '7 дней' },
    { key: 'month', kz: '30 күн', ru: '30 дней' },
  ]

  const medals = ['🥇', '🥈', '🥉']

  // ── Stagnant products view ──────────────────────────────
  if (showStagnant) {
    const CAT_LABELS: Record<string, { kz: string; ru: string }> = {
      drinks: { kz: 'Сусындар', ru: 'Напитки' }, bread: { kz: 'Нан', ru: 'Хлеб' },
      dairy: { kz: 'Сүт', ru: 'Молочные' }, sweets: { kz: 'Тәттілер', ru: 'Сладости' },
      meat: { kz: 'Ет', ru: 'Мясо' }, fruits: { kz: 'Жемістер', ru: 'Фрукты' },
      vegetables: { kz: 'Көкөністер', ru: 'Овощи' }, grocery: { kz: 'Бакалея', ru: 'Бакалея' },
      hygiene: { kz: 'Тазалық', ru: 'Гигиена' }, other: { kz: 'Басқа', ru: 'Другое' },
    }
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={() => setShowStagnant(false)} style={{
            padding: '7px 16px', borderRadius: 99, border: '1px solid var(--border)',
            background: 'var(--card-bg)', cursor: 'pointer', fontSize: 13, color: 'var(--muted)',
          }}>← {lang === 'kz' ? 'Артқа' : 'Назад'}</button>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
            🧊 {lang === 'kz' ? 'Тұрып қалған тауарлар' : 'Стоячие товары'}
          </span>
        </div>

        {stagnantLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />)}
          </div>
        ) : stagnantProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              {lang === 'kz' ? 'Тұрып қалған тауар жоқ!' : 'Нет стоячих товаров!'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {lang === 'kz' ? 'Барлық тауарлар соңғы 30 күнде сатылды' : 'Все товары продавались за последние 30 дней'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: 13, color: lang === 'kz' ? '#92400E' : '#92400E' }}>
              <span style={{ fontWeight: 700 }}>⚠️ {stagnantProducts.length} {lang === 'kz' ? 'тауар' : 'товаров'}</span>
              {' '}{lang === 'kz' ? '— 1 айдан астам сатылмады. Алып тастауды немесе жаңа партия алмауды қараңыз.' : '— не продавались более 1 месяца. Рассмотрите вывод из ассортимента.'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stagnantProducts.map(p => {
                const daysText = p.daysSince === null
                  ? (lang === 'kz' ? 'Ешқашан сатылмаған' : 'Никогда не продавался')
                  : `${p.daysSince} ${lang === 'kz' ? 'күн' : 'дн.'}`
                const urgency = p.daysSince === null || p.daysSince >= 90 ? 'high' : p.daysSince >= 60 ? 'mid' : 'low'
                const borderColor = urgency === 'high' ? 'var(--danger)' : urgency === 'mid' ? 'var(--warning)' : 'var(--muted)'
                const badgeBg = urgency === 'high' ? 'var(--danger-light)' : urgency === 'mid' ? 'rgba(245,158,11,0.12)' : 'var(--surface)'
                const badgeColor = urgency === 'high' ? 'var(--danger)' : urgency === 'mid' ? 'var(--warning)' : 'var(--muted)'
                const cat = p.category ? CAT_LABELS[p.category] : null
                return (
                  <div key={p.id} style={{
                    background: 'var(--card-bg)', borderRadius: 14, padding: '12px 14px',
                    border: '1px solid var(--border)', borderLeft: `4px solid ${borderColor}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span>{p.price.toLocaleString()} ₸</span>
                        <span>·</span>
                        <span>{lang === 'kz' ? 'Қалдық:' : 'Остаток:'} {p.quantity} {p.unit || 'шт'}</span>
                        {cat && <><span>·</span><span>{lang === 'kz' ? cat.kz : cat.ru}</span></>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                        background: badgeBg, color: badgeColor, whiteSpace: 'nowrap',
                      }}>
                        {daysText}
                      </div>
                      {p.lastSale && (
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                          {lang === 'kz' ? 'Соңғы:' : 'Посл:'} {fmtDate(p.lastSale)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      {(ptr.progress > 0 || ptr.refreshing) && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 48, opacity: ptr.refreshing ? 1 : ptr.progress }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--primary-light)', borderTopColor: 'var(--primary)', animation: ptr.refreshing ? 'ptrSpin 0.7s linear infinite' : 'none', transform: ptr.refreshing ? 'none' : `rotate(${ptr.progress * 270}deg)` }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {periods.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key as Period)} style={{
            flex: 1, padding: '10px 4px', borderRadius: 10,
            border: `2px solid ${period === p.key ? 'var(--primary)' : 'var(--border)'}`,
            background: period === p.key ? 'var(--primary-light)' : 'var(--card-bg)',
            color: period === p.key ? 'var(--primary-dark)' : 'var(--muted)',
            fontWeight: period === p.key ? 700 : 500, cursor: 'pointer', fontSize: 13,
            transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent',
          }}>
            {lang === 'kz' ? p.kz : p.ru}
          </button>
        ))}
      </div>

      {loading ? (
        <div>
          <div className="skeleton" style={{ height: 180, borderRadius: 20, marginBottom: 12 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)}
          </div>
        </div>
      ) : (
        <>
          {/* Hero total card */}
          <div className="hero-wave" style={{ borderRadius: 22, padding: '22px 20px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {lang === 'kz' ? 'Жалпы түсім' : 'Общая выручка'}
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
                {displayTotal.toLocaleString()} <span style={{ fontSize: 18 }}>₸</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
                {receipts.length + paidDebts.length} {lang === 'kz' ? 'транзакция' : 'транзакций'}
              </div>
            </div>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[
              { label: `💵 ${T.cash}`, value: displayCash, color: 'var(--primary)' },
              { label: '📱 Kaspi', value: displayKaspi, color: 'var(--blue)' },
              { label: `✅ ${lang === 'kz' ? 'Өтелген қарыз' : 'Долги оплачены'}`, value: displayPaidDebt, color: 'var(--primary)' },
              { label: `💳 ${lang === 'kz' ? 'Өтелмеген қарыз' : 'Долг (не оплачено)'}`, value: displayUnpaid, color: 'var(--danger)' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--card-bg)', borderRadius: 14, padding: '14px', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color, letterSpacing: -0.5 }}>{s.value.toLocaleString()} ₸</div>
              </div>
            ))}
          </div>

          {topProducts.length > 0 && (
            <div style={{ background: 'var(--card-bg)', borderRadius: 20, padding: '16px 18px', marginBottom: 12, border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
              <div className="section-title">{lang === 'kz' ? 'Топ сатылымдар (30 күн)' : 'Топ продаж (30 дней)'}</div>
              {topProducts.map((p, i) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < topProducts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 24, width: 32, textAlign: 'center' }}>{medals[i]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{p.count} {lang === 'kz' ? 'дана' : 'шт'}</div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>{p.amount.toLocaleString()} ₸</span>
                </div>
              ))}
            </div>
          )}

          {/* Stagnant products button */}
          <button onClick={() => { setShowStagnant(true); loadStagnantProducts() }} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 18px', marginBottom: 12,
            background: 'var(--card-bg)', border: '1.5px solid var(--border)',
            borderRadius: 16, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            boxShadow: 'var(--shadow-sm)', transition: 'transform 0.12s',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              🧊
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                {lang === 'kz' ? 'Тұрып қалған тауарлар' : 'Стоячие товары'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {lang === 'kz' ? '1 айдан астам сатылмаған товарлар' : 'Товары без продаж более 1 месяца'}
              </div>
            </div>
            <span style={{ color: 'var(--muted)', fontSize: 18 }}>›</span>
          </button>

          <div style={{ background: 'var(--card-bg)', borderRadius: 20, padding: '16px 18px', marginBottom: 12, border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
            <div className="section-title">{lang === 'kz' ? 'Транзакциялар' : 'Транзакции'}</div>
            {receipts.length === 0 && paidDebts.length === 0
              ? <p style={{ textAlign: 'center', padding: '20px 0', fontSize: 14, color: 'var(--muted)' }}>{T.noData}</p>
              : <>
                {receipts.map((r, idx) => (
                  <div key={r.id}>
                    <div onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', cursor: 'pointer',
                      borderBottom: expandedId === r.id ? 'none' : '1px solid var(--border)'
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: r.payment_type === 'cash' ? 'var(--primary-light)' : 'var(--blue-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                      }}>
                        {r.payment_type === 'cash' ? '💵' : '📱'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                          {r.payment_type === 'cash' ? (lang === 'kz' ? 'Наличный' : 'Наличные') : 'Kaspi'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {fmtTime(r.created_at)} · №{r.receipt_number}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{r.total_amount.toLocaleString()} ₸</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{expandedId === r.id ? '▲' : '▼'}</div>
                      </div>
                    </div>
                    {expandedId === r.id && r.items && (
                      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '12px 14px', marginBottom: 10, fontFamily: 'monospace', border: '1px solid var(--border)' }}>
                        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                          {store.name} · №{r.receipt_number} · {fmtDateTime(r.created_at)}
                        </div>
                        <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8 }}>
                          {r.items.map((item: any, i: number) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                              <span>{item.product_name} ×{item.quantity}</span>
                              <span style={{ fontWeight: 600 }}>{item.amount.toLocaleString()} ₸</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ borderTop: '1px dashed var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
                          <span>{lang === 'kz' ? 'ЖАЛПЫ' : 'ИТОГО'}</span>
                          <span style={{ color: 'var(--primary)' }}>{r.total_amount.toLocaleString()} ₸</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {paidDebts.map(d => (
                  <div key={d.id}>
                    <div onClick={() => setExpandedId(expandedId === 'debt-' + d.id ? null : 'debt-' + d.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', cursor: 'pointer',
                      borderBottom: expandedId === 'debt-' + d.id ? 'none' : '1px solid var(--border)'
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: 'var(--primary-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                      }}>✅</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                          {lang === 'kz' ? 'Қарыз өтелді' : 'Долг погашен'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {d.debtor_name} · {fmtTime(d.paid_at)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>{d.amount.toLocaleString()} ₸</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{expandedId === 'debt-' + d.id ? '▲' : '▼'}</div>
                      </div>
                    </div>
                    {expandedId === 'debt-' + d.id && (
                      <div style={{ background: 'var(--primary-light)', borderRadius: 12, padding: '12px 14px', marginBottom: 10, border: '1px solid #BBF7D0' }}>
                        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text)' }}>
                          <div>👤 <b>{d.debtor_name}</b></div>
                          {d.debtor_phone && <div>📞 {d.debtor_phone}</div>}
                          <div>📦 {d.product_name} × {d.quantity || 1}</div>
                          <div style={{ borderTop: '1px solid #BBF7D0', marginTop: 4, paddingTop: 6, color: 'var(--muted)', fontSize: 12 }}>
                            {lang === 'kz' ? 'Берілген' : 'Выдан'}: <b style={{ color: 'var(--text)' }}>{fmtDate(d.created_at)}</b>
                            {' · '}
                            {lang === 'kz' ? 'Төленді' : 'Оплачен'}: <b style={{ color: 'var(--primary-dark)' }}>{fmtDate(d.paid_at)}</b>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            }
          </div>
        </>
      )}
    </div>
  )
}
