'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type TxItem = { id: string; product_name: string; amount: number; payment_type: string; created_at: string; quantity: number; is_debt?: boolean; debtor_name?: string }

export default function HomePage() {
  const { store, lang, refresh } = useApp()
  const T = t[lang]
  const [sales, setSales] = useState<TxItem[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [overdueDebts, setOverdueDebts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [store.id, refresh])

  async function loadData() {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const weekLater = new Date(); weekLater.setDate(weekLater.getDate() + 7)

    const [salesRes, debtsRes, paidDebtsRes, lowStockRes, overdueRes] = await Promise.all([
      supabase.from('sales').select('*').eq('store_id', store.id).gte('created_at', today).order('created_at', { ascending: false }).limit(5),
      supabase.from('debts').select('*').eq('store_id', store.id).eq('is_paid', false),
      supabase.from('debts').select('*').eq('store_id', store.id).eq('is_paid', true).gte('paid_at', today),
      supabase.from('products').select('*').eq('store_id', store.id).lte('quantity', 5),
      supabase.from('debts').select('*').eq('store_id', store.id).eq('is_paid', false).lt('due_date', new Date().toISOString().split('T')[0]),
    ])

    const paidToday = (paidDebtsRes.data || []).map((d: any) => ({
      id: d.id, product_name: d.product_name, amount: d.amount,
      payment_type: 'debt_paid', quantity: d.quantity || 1,
      created_at: d.paid_at, is_debt: true, debtor_name: d.debtor_name
    }))

    const allTx = [
      ...(salesRes.data || []).map((s: any) => ({ ...s, is_debt: false })),
      ...paidToday
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)

    setSales(allTx)
    setLowStock(lowStockRes.data || [])
    setOverdueDebts(overdueRes.data || [])
    setLoading(false)
  }

  const regularSales = sales.filter((x: any) => !x.is_debt)
  const totalRevenue = sales.reduce((s, x) => s + x.amount, 0)
  const cashTotal = regularSales.filter((x: any) => x.payment_type === 'cash').reduce((s: number, x: any) => s + x.amount, 0)
  const kaspiTotal = regularSales.filter((x: any) => x.payment_type === 'kaspi').reduce((s: number, x: any) => s + x.amount, 0)

  if (loading) return <p className="text-muted" style={{ padding: 16 }}>{T.loading}</p>

  return (
    <div>
      {(lowStock.length > 0 || overdueDebts.length > 0) && (
        <div style={{ marginBottom: 10 }}>
          {lowStock.length > 0 && (
            <div className="alert" style={{ marginBottom: 6 }}>
              📦 {T.lowStock}: {lowStock.map(p => p.name).join(', ')}
            </div>
          )}
          {overdueDebts.length > 0 && (
            <div className="alert">
              ⚠️ {lang === 'kz' ? 'Мерзімі өткен қарыздар' : 'Просроченные долги'}: {overdueDebts.map(d => d.debtor_name).join(', ')}
            </div>
          )}
        </div>
      )}

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
          <div className="stat-label">Kaspi</div>
          <div className="stat-value text-blue">{kaspiTotal.toLocaleString()} ₸</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">{T.recentSales}</div>
        {sales.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '12px 0', fontSize: 13 }}>{T.noSales}</p>
          : sales.map(sale => (
            <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14 }}>
                {sale.product_name} ×{sale.quantity}
                {sale.is_debt && <span style={{ fontSize: 11, color: '#D97706', marginLeft: 6 }}>💳 {(sale as any).debtor_name}</span>}
              </div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{sale.amount.toLocaleString()} ₸</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}
