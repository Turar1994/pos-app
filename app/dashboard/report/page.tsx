'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Sale = { product_name: string; amount: number; payment_type: string; quantity: number; created_at: string }

type Period = 'today' | 'week' | 'month'

export default function ReportPage() {
  const { store, lang, refresh } = useApp()
  const T = t[lang]
  const [sales, setSales] = useState<Sale[]>([])
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
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      from = d.toISOString()
    } else if (period === 'month') {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      from = d.toISOString()
    }

    const { data } = await supabase
      .from('sales').select('*')
      .eq('store_id', store.id)
      .gte('created_at', from)
    setSales(data || [])
    setLoading(false)
  }

  const total = sales.reduce((s, x) => s + x.amount, 0)
  const cash = sales.filter(x => x.payment_type === 'cash').reduce((s, x) => s + x.amount, 0)
  const kaspi = sales.filter(x => x.payment_type === 'kaspi').reduce((s, x) => s + x.amount, 0)

  const topMap: Record<string, number> = {}
  sales.forEach(s => { topMap[s.product_name] = (topMap[s.product_name] || 0) + s.quantity })
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
              <span className="text-muted">{T.kaspi}</span>
              <span className="text-blue" style={{ fontWeight: 600 }}>{kaspi.toLocaleString()} ₸</span>
            </div>
            <div className="row">
              <span className="text-muted">{T.txCount}</span>
              <span style={{ fontWeight: 600 }}>{sales.length}</span>
            </div>
          </div>

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
