'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from './layout'
import { t } from '@/lib/lang'

type Sale = { id: string; product_name: string; amount: number; payment_type: string; created_at: string; quantity: number }
type Product = { id: string; name: string; quantity: number }

export default function HomePage() {
  const { store, lang, refresh } = useApp()
  const T = t[lang]
  const [sales, setSales] = useState<Sale[]>([])
  const [lowStock, setLowStock] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [store.id, refresh])

  async function loadData() {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data: salesData } = await supabase
      .from('sales').select('*')
      .eq('store_id', store.id)
      .gte('created_at', today)
      .order('created_at', { ascending: false })

    const { data: prodData } = await supabase
      .from('products').select('*')
      .eq('store_id', store.id)
      .lte('quantity', 5)

    setSales(salesData || [])
    setLowStock(prodData || [])
    setLoading(false)
  }

  const totalRevenue = sales.reduce((s, x) => s + x.amount, 0)
  const cashTotal = sales.filter(x => x.payment_type === 'cash').reduce((s, x) => s + x.amount, 0)
  const kaspiTotal = sales.filter(x => x.payment_type === 'kaspi').reduce((s, x) => s + x.amount, 0)

  if (loading) return <p className="text-muted">{T.loading}</p>

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">{T.todayRevenue}</div>
          <div className="stat-value">{totalRevenue.toLocaleString()} ₸</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T.transactions}</div>
          <div className="stat-value">{sales.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T.cash}</div>
          <div className="stat-value text-green">{cashTotal.toLocaleString()} ₸</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T.kaspi}</div>
          <div className="stat-value text-blue">{kaspiTotal.toLocaleString()} ₸</div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="alert">
          ⚠️ {T.lowStock}: {lowStock.map(p => `${p.name} (${p.quantity} ${T.pieces})`).join(', ')}
        </div>
      )}

      <div className="card">
        <div className="section-title">{T.recentSales}</div>
        {sales.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '12px 0' }}>{T.noSales}</p>
        ) : (
          sales.slice(0, 8).map(sale => (
            <div key={sale.id} className="row">
              <div>
                <div style={{ fontSize: 14 }}>{sale.product_name}</div>
                <span className={`badge badge-${sale.payment_type}`}>
                  {sale.payment_type === 'cash' ? T.cash : 'Kaspi'}
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{sale.amount.toLocaleString()} ₸</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
