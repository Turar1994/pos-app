'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Receipt = {
  id: string; receipt_number: number; total_amount: number
  payment_type: string; created_at: string
  debtor_name?: string; items?: any[]
}

export default function HomePage() {
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

  useEffect(() => { loadData() }, [store.id, refresh])

  async function loadData() {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const [receiptsRes, paidDebtsRes, lowStockRes, overdueRes] = await Promise.all([
      supabase.from('receipts').select('*').eq('store_id', store.id).gte('created_at', today).order('created_at', { ascending: false }),
      supabase.from('receipts').select('*').eq('store_id', store.id).eq('payment_type', 'debt').not('debtor_name', 'is', null),
      supabase.from('products').select('*').eq('store_id', store.id).lte('quantity', 5),
      supabase.from('debts').select('*').eq('store_id', store.id).eq('is_paid', false).lt('due_date', today),
    ])

    const receipts = receiptsRes.data || []
    const total = receipts.filter(r => r.payment_type !== 'debt').reduce((s: number, r: any) => s + r.total_amount, 0)
    const paidDebtTotal = (paidDebtsRes.data || []).filter((r: any) => r.created_at?.startsWith(today)).reduce((s: number, r: any) => s + r.total_amount, 0)

    setTodayTotal(total + paidDebtTotal)
    setTxCount(receipts.length)
    setCashTotal(receipts.filter((r: any) => r.payment_type === 'cash').reduce((s: number, r: any) => s + r.total_amount, 0))
    setKaspiTotal(receipts.filter((r: any) => r.payment_type === 'kaspi').reduce((s: number, r: any) => s + r.total_amount, 0))

    // Соңғы чекті жүктеу
    if (receipts.length > 0) {
      const last = receipts[0]
      const { data: items } = await supabase.from('sales').select('*').eq('receipt_id', last.id)
      const { data: debtItems } = await supabase.from('debts').select('*').eq('receipt_id', last.id)
      setLastReceipt({ ...last, items: items?.length ? items : debtItems || [] })
    }

    setLowStock(lowStockRes.data || [])
    setOverdueDebts(overdueRes.data || [])
    setLoading(false)
  }

  if (loading) return <p className="text-muted" style={{ padding: 16 }}>{T.loading}</p>

  return (
    <div>
      {(lowStock.length > 0 || overdueDebts.length > 0) && (
        <div style={{ marginBottom: 10 }}>
          {lowStock.length > 0 && <div className="alert" style={{ marginBottom: 6 }}>📦 {T.lowStock}: {lowStock.map(p => p.name).join(', ')}</div>}
          {overdueDebts.length > 0 && <div className="alert">⚠️ {lang === 'kz' ? 'Мерзімі өткен қарыздар' : 'Просроченные долги'}: {overdueDebts.map(d => d.debtor_name).join(', ')}</div>}
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">{T.todayRevenue}</div>
          <div className="stat-value">{todayTotal.toLocaleString()} ₸</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T.transactions}</div>
          <div className="stat-value">{txCount}</div>
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

      {lastReceipt && (
        <div className="card" style={{ fontFamily: 'monospace' }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{store.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              {new Date(lastReceipt.created_at).toLocaleString('kk-KZ')}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              {lang === 'kz' ? 'Чек №' : 'Чек №'}{lastReceipt.receipt_number}
            </div>
          </div>
          <div style={{ borderTop: '1px dashed #e5e7eb', borderBottom: '1px dashed #e5e7eb', padding: '8px 0', marginBottom: 8 }}>
            {lastReceipt.items?.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                <span>{item.product_name} ×{item.quantity}</span>
                <span>{item.amount.toLocaleString()} ₸</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
            <span>{lang === 'kz' ? 'ЖАЛПЫ' : 'ИТОГО'}</span>
            <span>{lastReceipt.total_amount.toLocaleString()} ₸</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: 6, fontSize: 11, color: '#6b7280' }}>
            {lastReceipt.payment_type === 'cash' ? (lang === 'kz' ? 'Наличный' : 'Наличные') :
             lastReceipt.payment_type === 'kaspi' ? 'Kaspi' :
             `💳 ${lang === 'kz' ? 'Қарыз' : 'Долг'}: ${lastReceipt.debtor_name}`}
          </div>
        </div>
      )}
    </div>
  )
}
