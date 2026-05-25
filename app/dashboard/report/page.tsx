'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Sale = { product_name: string; amount: number; payment_type: string; quantity: number }
type Debt = { product_name: string; amount: number; debtor_name: string; is_paid: boolean; paid_at: string | null; quantity: number }
type Period = 'today' | 'week' | 'month'

export default function ReportPage() {
  const { store, lang, refresh } = useApp()
  const T = t[lang]
  const [sales, setSales] = useState<Sale[]>([])
  const [paidDebts, setPaidDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('today')

  useEffect(() => { loadData() }, [store.id, refresh, period])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()
    const now = new Date()
    let from = ''

    if (period === 'today') {
      from = now.toISOString().split('T')[0]
    } else if (period === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 7)
      from = d.toISOString()
    } else {
      const d = new Date(now); d.setDate(d.getDate() - 30)
      from = d.toISOString()
    }

    const { data: salesData } = await supabase.from('sales').select('*')
      .eq('store_id', store.id).gte('created_at', from)

    // Төленген қарыздар — paid_at мерзіміне қарай
    const { data: debtsData } = await supabase.from('debts').select('*')
      .eq('store_id', store.id).eq('is_paid', true).gte('paid_at', from)

    setSales(salesData || [])
    setPaidDebts(debtsData || [])
    setLoading(false)
  }

  const salesTotal = sales.reduce((s, x) => s + x.amount, 0)
  const debtTotal = paidDebts.reduce((s, d) => s + d.amount, 0)
  const total = salesTotal + debtTotal

  const cash = sales.filter(x => x.payment_type === 'cash').reduce((s, x) => s + x.amount, 0)
  const kaspi = sales.filter(x => x.payment_type === 'kaspi').reduce((s, x) => s + x.amount, 0)

  const topMap: Record<string, number> = {}
  sales.forEach(s => { topMap[s.product_name] = (topMap[s.product_name] || 0) + s.quantity })
  paidDebts.forEach(d => { topMap[d.product_name] = (topMap[d.product_name] || 0) + (d.quantity || 1) })
  const top3 = Object.entries(topMap).sort((a, b) => b[1] - a[1]).slice(0, 3)

  const periods = [
    { key: 'today', kz: 'Бүгін', ru: 'Сегодня' },
    { key: 'week', kz: '7 күн', ru: '7 дней' },
    { key: 'month', kz: '30 күн', ru: '30 дней' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {periods.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key as Period)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 6, border: '1px solid #e5e7eb',
            background: period === p.key ? '#185FA5' : '#fff',
            color: period === p.key ? '#fff' : '#6b7280',
            fontWeight: period === p.key ? 600 : 400,
            cursor: 'pointer', fontSize: 13
          }}>
            {lang === 'kz' ? p.kz : p.ru}
          </button>
        ))}
      </div>

      {loading ? <p className="text-muted">{T.loading}</p> : (
        <>
          <div className="card">
            <div className="section-title">{T.dailyReport}</div>
            <div className="row">
              <span className="text-muted">{T.totalRevenue}</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{total.toLocaleString()} ₸</span>
            </div>
            <div className="row">
              <span className="text-muted">{T.cash}</span>
              <span className="text-green" style={{ fontWeight: 600 }}>{cash.toLocaleString()} ₸</span>
            </div>
            <div className="row">
              <span className="text-muted">Kaspi</span>
              <span className="text-blue" style={{ fontWeight: 600 }}>{kaspi.toLocaleString()} ₸</span>
            </div>
            {debtTotal > 0 && (
              <div className="row">
                <span className="text-muted">💳 {lang === 'kz' ? 'Төленген қарыздар' : 'Погашенные долги'}</span>
                <span style={{ fontWeight: 600, color: '#D97706' }}>{debtTotal.toLocaleString()} ₸</span>
              </div>
            )}
            <div className="row">
              <span className="text-muted">{T.txCount}</span>
              <span style={{ fontWeight: 600 }}>{sales.length + paidDebts.length}</span>
            </div>
          </div>

          {paidDebts.length > 0 && (
            <div className="card">
              <div className="section-title">
                💳 {lang === 'kz' ? 'Төленген қарыздар' : 'Погашенные долги'}
              </div>
              {paidDebts.map((d, i) => (
                <div key={i} className="row">
                  <div>
                    <div style={{ fontSize: 14 }}>{d.product_name} × {d.quantity || 1}</div>
                    <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>
                      💳 {d.debtor_name}
                    </span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#D97706' }}>{d.amount.toLocaleString()} ₸</span>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="section-title">{T.topSales}</div>
            {top3.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '12px 0' }}>{T.noData}</p>
            ) : (
              top3.map(([name, count], i) => (
                <div key={name} className="row">
                  <span style={{ fontSize: 14 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {name}
                  </span>
                  <span className="text-muted">{count} {T.pieces}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
