'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'
import { fmtDateTime } from '@/lib/date'
import { usePullToRefresh } from '@/lib/usePullToRefresh'
import { useCountUp } from '@/lib/useCountUp'

type Receipt = {
  id: string; receipt_number: number; total_amount: number
  payment_type: string; created_at: string
  debtor_name?: string; items?: any[]
}

export default function HomePage() {
  const router = useRouter()
  const { store, lang, refresh } = useApp()
  const T = t[lang]
  const [todayTotal, setTodayTotal] = useState(0)
  const [txCount, setTxCount] = useState(0)
  const [cashTotal, setCashTotal] = useState(0)
  const [kaspiTotal, setKaspiTotal] = useState(0)
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null)
  const [lowStock, setLowStock] = useState<any[]>([])
  const [overdueDebts, setOverdueDebts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const refresh2 = useCallback(() => loadData(), [store.id])
  const ptr = usePullToRefresh(refresh2)

  useEffect(() => { loadData() }, [store.id, refresh])

  async function loadData() {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const [receiptsRes, paidTodayRes, lowStockRes, overdueRes] = await Promise.all([
      supabase.from('receipts').select('*').eq('store_id', store.id)
        .gte('created_at', today).neq('payment_type', 'debt')
        .order('created_at', { ascending: false }),
      supabase.from('debts').select('amount').eq('store_id', store.id)
        .eq('is_paid', true).gte('paid_at', today),
      supabase.from('products').select('*').eq('store_id', store.id).lte('quantity', 5),
      supabase.from('debts').select('*').eq('store_id', store.id).eq('is_paid', false).lt('due_date', today),
    ])

    const receipts = receiptsRes.data || []
    const cashKaspiTotal = receipts.reduce((s: number, r: any) => s + r.total_amount, 0)
    const debtPaidToday = (paidTodayRes.data || []).reduce((s: number, d: any) => s + d.amount, 0)

    setTodayTotal(cashKaspiTotal + debtPaidToday)
    setTxCount(receipts.length)
    setCashTotal(receipts.filter((r: any) => r.payment_type === 'cash').reduce((s: number, r: any) => s + r.total_amount, 0))
    setKaspiTotal(receipts.filter((r: any) => r.payment_type === 'kaspi').reduce((s: number, r: any) => s + r.total_amount, 0))

    if (receipts.length > 0) {
      const last = receipts[0]
      const { data: items } = await supabase.from('sales').select('*').eq('receipt_id', last.id)
      setLastReceipt({ ...last, items: items || [] })
    } else {
      setLastReceipt(null)
    }

    setLowStock(lowStockRes.data || [])
    setOverdueDebts(overdueRes.data || [])
    setLoading(false)
  }

  const hasWarning = lowStock.length > 0 || overdueDebts.length > 0
  const displayRevenue = useCountUp(todayTotal, 900)
  const displayCash = useCountUp(cashTotal, 700)
  const displayKaspi = useCountUp(kaspiTotal, 700)

  if (loading) return (
    <div>
      {/* Skeleton hero */}
      <div className="skeleton" style={{ height: 160, marginBottom: 12, borderRadius: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 140, borderRadius: 20 }} />
    </div>
  )

  return (
    <div className="home-stagger">
      {/* Pull-to-refresh indicator */}
      {(ptr.progress > 0 || ptr.refreshing) && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: 48, transition: 'opacity 0.2s',
          opacity: ptr.refreshing ? 1 : ptr.progress
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '2.5px solid var(--primary-light)',
            borderTopColor: 'var(--primary)',
            animation: ptr.refreshing ? 'ptrSpin 0.7s linear infinite' : 'none',
            transform: ptr.refreshing ? 'none' : `rotate(${ptr.progress * 270}deg)`,
            transition: ptr.refreshing ? 'none' : 'transform 0.1s',
          }} />
        </div>
      )}
      {/* Warning row — quick-action chips */}
      {hasWarning && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {lowStock.length > 0 && (
            <button onClick={() => router.push('/dashboard/stock')} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              transition: 'transform 0.12s', fontSize: 13, color: '#92400E', fontWeight: 600,
            }}>
              <span className="low-stock-dot" style={{ background: 'var(--warning)', flexShrink: 0 }} />
              {lowStock.length} {lang === 'kz' ? 'тауар аз қалды →' : 'товаров на исходе →'}
            </button>
          )}
          {overdueDebts.length > 0 && (
            <button onClick={() => router.push('/dashboard/debts')} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              transition: 'transform 0.12s', fontSize: 13, color: '#B91C1C', fontWeight: 600,
            }}>
              💳 {overdueDebts.length} {lang === 'kz' ? 'қарыздың мерзімі өтті →' : 'долга просрочено →'}
            </button>
          )}
        </div>
      )}

      {/* Hero revenue card */}
      <div className="hero-wave" style={{
        borderRadius: 22, padding: '24px 22px', marginBottom: 12,
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500, marginBottom: 6 }}>
            {T.todayRevenue}
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, color: '#fff', letterSpacing: -1.5, lineHeight: 1 }}>
            {displayRevenue.toLocaleString()}
            <span style={{ fontSize: 20, fontWeight: 600, marginLeft: 4 }}>₸</span>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{lang === 'kz' ? 'Транзакция' : 'Транзакций'}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{txCount}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{T.cash}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{displayCash.toLocaleString()} ₸</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>Kaspi</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{displayKaspi.toLocaleString()} ₸</div>
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)'
        }} />
        <div style={{
          position: 'absolute', bottom: -20, right: 40,
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)'
        }} />
      </div>

      {/* Last receipt */}
      {lastReceipt && (
        <div className="anim-fade-in" style={{
          background: '#fff', borderRadius: 20, marginBottom: 12,
          boxShadow: '0 4px 16px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.04)',
          overflow: 'hidden', border: '1px solid var(--border)'
        }}>
          <div style={{
            background: 'var(--surface)', padding: '12px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {lang === 'kz' ? 'Соңғы чек' : 'Последний чек'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>
              №{lastReceipt.receipt_number}
            </span>
          </div>
          <div style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, fontFamily: 'monospace' }}>
              {store.name} · {fmtDateTime(lastReceipt.created_at)}
            </div>
            <div style={{ borderTop: '1px dashed var(--border)', borderBottom: '1px dashed var(--border)', padding: '10px 0', marginBottom: 10 }}>
              {lastReceipt.items?.map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '3px 0', color: 'var(--text)' }}>
                  <span>{item.product_name} <span style={{ color: 'var(--muted)' }}>×{item.quantity}</span></span>
                  <span style={{ fontWeight: 600 }}>{item.amount.toLocaleString()} ₸</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {lastReceipt.payment_type === 'cash'
                    ? (lang === 'kz' ? '💵 Наличный' : '💵 Наличные')
                    : lastReceipt.payment_type === 'kaspi'
                    ? '📱 Kaspi'
                    : `💳 ${lastReceipt.debtor_name}`}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', letterSpacing: -0.5 }}>
                {lastReceipt.total_amount.toLocaleString()} ₸
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
