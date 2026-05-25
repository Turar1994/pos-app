'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Sale = { id: string; product_name: string; amount: number; payment_type: string; created_at: string; quantity: number }
type Debt = { id: string; product_name: string; amount: number; debtor_name: string; due_date: string | null; is_paid: boolean; created_at: string; quantity: number }
type Product = { id: string; name: string; quantity: number; expiry_date?: string }

export default function HomePage() {
  const { store, lang, refresh } = useApp()
  const T = t[lang]
  const [sales, setSales] = useState<Sale[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [lowStock, setLowStock] = useState<Product[]>([])
  const [expiryWarning, setExpiryWarning] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [store.id, refresh])

  async function loadData() {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const weekLater = new Date(); weekLater.setDate(weekLater.getDate() + 7)
    const weekStr = weekLater.toISOString().split('T')[0]

    const [salesRes, debtsRes, paidDebtsRes, prodRes, expiryRes] = await Promise.all([
      supabase.from('sales').select('*').eq('store_id', store.id).gte('created_at', today).order('created_at', { ascending: false }),
      supabase.from('debts').select('*').eq('store_id', store.id).eq('is_paid', false).order('created_at', { ascending: false }),
      supabase.from('debts').select('*').eq('store_id', store.id).eq('is_paid', true).gte('paid_at', today).order('paid_at', { ascending: false }),
      supabase.from('products').select('*').eq('store_id', store.id).lte('quantity', 5),
      supabase.from('products').select('*').eq('store_id', store.id).not('expiry_date', 'is', null).lte('expiry_date', weekStr)
    ])

    setSales(salesRes.data || [])
    setDebts(debtsRes.data || [])
    // Төленген қарыздарды бүгінгі сатылымдарға қосу
    const paidToday = (paidDebtsRes.data || []).map((d: any) => ({
      id: d.id, product_name: d.product_name, amount: d.amount,
      payment_type: 'debt_paid', quantity: d.quantity || 1,
      created_at: d.paid_at, is_debt: true, debtor_name: d.debtor_name
    }))
    setSales(prev => [...(salesRes.data || []).map((s: any) => ({...s, is_debt: false, debtor_name: ''})), ...paidToday]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as any)
    setLowStock(prodRes.data || [])
    setExpiryWarning(expiryRes.data || [])
    setLoading(false)
  }

  const regularSales = sales.filter((x: any) => !x.is_debt)
  const paidDebtSales = sales.filter((x: any) => x.is_debt)
  const totalRevenue = sales.reduce((s, x) => s + x.amount, 0)
  const cashTotal = regularSales.filter((x: any) => x.payment_type === 'cash').reduce((s: number, x: any) => s + x.amount, 0)
  const kaspiTotal = regularSales.filter((x: any) => x.payment_type === 'kaspi').reduce((s: number, x: any) => s + x.amount, 0)
  const paidDebtTotal = paidDebtSales.reduce((s: number, x: any) => s + x.amount, 0)
  const today = new Date().toISOString().split('T')[0]
  const overdueDebts = debts.filter(d => d.due_date && new Date(d.due_date) < new Date())
  const totalDebt = debts.reduce((s, d) => s + d.amount, 0)

  const allToday = [
    ...sales.map(s => ({ ...s, is_debt: false, debtor_name: '' })),
    ...debts.filter(d => d.created_at.startsWith(today)).map(d => ({
      id: d.id, product_name: d.product_name, amount: d.amount,
      payment_type: 'debt', quantity: d.quantity, created_at: d.created_at,
      is_debt: true, debtor_name: d.debtor_name
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

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
          <div className="stat-label">Kaspi</div>
          <div className="stat-value text-blue">{kaspiTotal.toLocaleString()} ₸</div>
        </div>
      </div>

      {totalDebt > 0 && (
        <div className="stat-card" style={{ marginBottom: 10 }}>
          <div className="stat-label">💳 {lang === 'kz' ? 'Жалпы қарыз' : 'Общий долг'}</div>
          <div className="stat-value text-red">{totalDebt.toLocaleString()} ₸</div>
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="alert">📦 {T.lowStock}: {lowStock.map(p => `${p.name} (${p.quantity} ${T.pieces})`).join(', ')}</div>
      )}

      {expiryWarning.length > 0 && (
        <div className="alert">
          ⏰ {lang === 'kz' ? 'Мерзімі бітуге жақын' : 'Срок годности истекает'}:{' '}
          {expiryWarning.map(p => {
            const diff = Math.ceil((new Date(p.expiry_date!).getTime() - Date.now()) / 86400000)
            return `${p.name} (${diff < 0 ? (lang === 'kz' ? 'өтті!' : 'истёк!') : diff + (lang === 'kz' ? ' күн' : ' дн.')})`
          }).join(', ')}
        </div>
      )}

      {overdueDebts.length > 0 && (
        <div className="alert">
          ⚠️ {lang === 'kz' ? 'Мерзімі өткен қарыздар' : 'Просроченные долги'}:{' '}
          {overdueDebts.map(d => `${d.debtor_name} (${d.amount.toLocaleString()} ₸)`).join(', ')}
        </div>
      )}

      <div className="card">
        <div className="section-title">{T.recentSales}</div>
        {allToday.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '12px 0' }}>{T.noSales}</p>
          : allToday.slice(0, 10).map(sale => (
            <div key={sale.id} className="row">
              <div>
                <div style={{ fontSize: 14 }}>{sale.product_name} × {sale.quantity}</div>
                {(sale as any).is_debt
                  ? <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>💳 {lang === 'kz' ? 'Қарыз' : 'Долг'} — {(sale as any).debtor_name}</span>
                  : <span className={`badge badge-${sale.payment_type}`}>{sale.payment_type === 'cash' ? T.cash : 'Kaspi'}</span>
                }
              </div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{sale.amount.toLocaleString()} ₸</div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
