'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Receipt = {
  id: string; receipt_number: number; total_amount: number
  payment_type: string; created_at: string; debtor_name?: string
  items?: any[]
}
type Period = 'today' | 'week' | 'month'

export default function ReportPage() {
  const { store, lang, refresh } = useApp()
  const T = t[lang]
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; count: number; amount: number }[]>([])
  const [unpaidTotal, setUnpaidTotal] = useState(0)
  const [paidDebtTotal, setPaidDebtTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('today')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [store.id, refresh, period])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()
    const now = new Date()
    let from = ''
    if (period === 'today') from = now.toISOString().split('T')[0]
    else if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString() }
    else { const d = new Date(now); d.setDate(d.getDate() - 30); from = d.toISOString() }

    const [receiptsRes, unpaidRes] = await Promise.all([
      supabase.from('receipts').select('*').eq('store_id', store.id).gte('created_at', from).order('created_at', { ascending: false }),
      supabase.from('debts').select('amount').eq('store_id', store.id).eq('is_paid', false),
    ])

    // Топ продаж үшін 30 күн sales
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

    // Чектерге items қосу
    const allReceipts = receiptsRes.data || []
    const receiptsWithItems = await Promise.all(allReceipts.map(async (r: any) => {
      const { data: items } = await supabase.from('sales').select('*').eq('receipt_id', r.id)
      const { data: debtItems } = await supabase.from('debts').select('*').eq('receipt_id', r.id)
      return { ...r, items: items?.length ? items : debtItems || [] }
    }))

    const paidDebt = allReceipts.filter((r: any) => r.payment_type === 'debt').reduce((s: number, r: any) => s + r.total_amount, 0)

    setReceipts(receiptsWithItems)
    setTopProducts(top)
    setUnpaidTotal((unpaidRes.data || []).reduce((s: number, d: any) => s + d.amount, 0))
    setPaidDebtTotal(paidDebt)
    setLoading(false)
  }

  const salesReceipts = receipts.filter(r => r.payment_type !== 'debt')
  const total = receipts.reduce((s, r) => s + r.total_amount, 0)
  const cashTotal = receipts.filter(r => r.payment_type === 'cash').reduce((s, r) => s + r.total_amount, 0)
  const kaspiTotal = receipts.filter(r => r.payment_type === 'kaspi').reduce((s, r) => s + r.total_amount, 0)

  const periods = [
    { key: 'today', kz: 'Бүгін', ru: 'Сегодня' },
    { key: 'week', kz: '7 күн', ru: '7 дней' },
    { key: 'month', kz: '30 күн', ru: '30 дней' },
  ]

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {periods.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key as Period)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 6, border: '1px solid #e5e7eb',
            background: period === p.key ? '#185FA5' : '#fff',
            color: period === p.key ? '#fff' : '#6b7280',
            fontWeight: period === p.key ? 600 : 400, cursor: 'pointer', fontSize: 13
          }}>
            {lang === 'kz' ? p.kz : p.ru}
          </button>
        ))}
      </div>

      {loading ? <p className="text-muted">{T.loading}</p> : (
        <>
          <div className="card">
            <div className="row" style={{ padding: '8px 0' }}>
              <span className="text-muted">{lang === 'kz' ? 'Жалпы сатылым' : 'Общая выручка'}</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{total.toLocaleString()} ₸</span>
            </div>
            <div className="row" style={{ padding: '8px 0' }}>
              <span className="text-muted">{T.cash}</span>
              <span style={{ fontWeight: 600, color: '#0F6E56' }}>{cashTotal.toLocaleString()} ₸</span>
            </div>
            <div className="row" style={{ padding: '8px 0' }}>
              <span className="text-muted">Kaspi</span>
              <span style={{ fontWeight: 600, color: '#185FA5' }}>{kaspiTotal.toLocaleString()} ₸</span>
            </div>
            <div className="row" style={{ padding: '8px 0' }}>
              <span className="text-muted">{lang === 'kz' ? 'Транзакция саны' : 'Транзакций'}</span>
              <span style={{ fontWeight: 600 }}>{receipts.length}</span>
            </div>
            <div className="row" style={{ padding: '8px 0' }}>
              <span className="text-muted">💳 {lang === 'kz' ? 'Қарызға сатылған' : 'Продано в долг'}</span>
              <span style={{ fontWeight: 600, color: '#D97706' }}>{unpaidTotal.toLocaleString()} ₸</span>
            </div>
            <div className="row" style={{ padding: '8px 0', borderBottom: 'none' }}>
              <span className="text-muted">✅ {lang === 'kz' ? 'Қарыз төлемдері' : 'Погашено долгов'}</span>
              <span style={{ fontWeight: 600, color: '#0F6E56' }}>{paidDebtTotal.toLocaleString()} ₸</span>
            </div>
          </div>

          {topProducts.length > 0 && (
            <div className="card">
              <div className="section-title">{lang === 'kz' ? 'Топ сатылымдар (30 күн)' : 'Топ продаж (30 дней)'}</div>
              {topProducts.map((p, i) => (
                <div key={p.name} className="row" style={{ padding: '10px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{medals[i]}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{p.count} {lang === 'kz' ? 'дана' : 'шт'}</div>
                    </div>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.amount.toLocaleString()} ₸</span>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="section-title">{lang === 'kz' ? 'Чектер' : 'Чеки'}</div>
            {receipts.length === 0
              ? <p className="text-muted" style={{ textAlign: 'center', padding: 12, fontSize: 13 }}>{T.noData}</p>
              : receipts.map(r => (
                <div key={r.id} style={{ borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>
                  <div onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        {new Date(r.created_at).toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}№{r.receipt_number}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 2 }}>
                        {r.payment_type === 'cash' ? (lang === 'kz' ? '💵 Наличный' : '💵 Наличные') :
                         r.payment_type === 'kaspi' ? '📱 Kaspi' :
                         `💳 ${lang === 'kz' ? 'Қарыз' : 'Долг'}: ${r.debtor_name}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{r.total_amount.toLocaleString()} ₸</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{expandedId === r.id ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {expandedId === r.id && r.items && (
                    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontFamily: 'monospace' }}>
                      <div style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                        {store.name} · №{r.receipt_number} · {new Date(r.created_at).toLocaleString('kk-KZ')}
                      </div>
                      <div style={{ borderTop: '1px dashed #d1d5db', paddingTop: 8 }}>
                        {r.items.map((item: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                            <span>{item.product_name} ×{item.quantity}</span>
                            <span>{item.amount.toLocaleString()} ₸</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ borderTop: '1px dashed #d1d5db', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
                        <span>{lang === 'kz' ? 'ЖАЛПЫ' : 'ИТОГО'}</span>
                        <span>{r.total_amount.toLocaleString()} ₸</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </>
      )}
    </div>
  )
}
