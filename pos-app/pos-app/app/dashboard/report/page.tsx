'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '../layout'
import { t } from '@/lib/lang'

type Sale = { product_name: string; amount: number; payment_type: string; quantity: number }

export default function ReportPage() {
  const { store, lang, refresh } = useApp()
  const T = t[lang]
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [store.id, refresh])

  async function loadData() {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('sales').select('*')
      .eq('store_id', store.id)
      .gte('created_at', today)
    setSales(data || [])
    setLoading(false)
  }

  const total = sales.reduce((s, x) => s + x.amount, 0)
  const cash = sales.filter(x => x.payment_type === 'cash').reduce((s, x) => s + x.amount, 0)
  const kaspi = sales.filter(x => x.payment_type === 'kaspi').reduce((s, x) => s + x.amount, 0)

  const topMap: Record<string, number> = {}
  sales.forEach(s => { topMap[s.product_name] = (topMap[s.product_name] || 0) + s.quantity })
  const top3 = Object.entries(topMap).sort((a, b) => b[1] - a[1]).slice(0, 3)

  if (loading) return <p className="text-muted">{T.loading}</p>

  return (
    <div>
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
    </div>
  )
}
