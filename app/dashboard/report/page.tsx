'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Sale = { id: string; product_name: string; amount: number; payment_type: string; quantity: number; created_at: string }
type Debt = { id: string; product_name: string; amount: number; debtor_name: string; quantity: number; paid_at: string }
type Period = 'today' | 'week' | 'month'

export default function ReportPage() {
  const { store, lang, refresh } = useApp()
  const T = t[lang]
  const [sales, setSales] = useState<Sale[]>([])
  const [paidDebts, setPaidDebts] = useState<Debt[]>([])
  const [unpaidDebts, setUnpaidDebts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('today')

  useEffect(() => { loadData() }, [store.id, refresh, period])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()
    const now = new Date()
    let from = ''
    if (period === 'today') from = now.toISOString().split('T')[0]
    else if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString() }
    else { const d = new Date(now); d.setDate(d.getDate() - 30); from = d.toISOString() }

    const [salesRes, paidRes, unpaidRes] = await Promise.all([
      supabase.from('sales').select('*').eq('store_id', store.id).gte('created_at', from).order('created_at', { ascending: false }),
      supabase.from('debts').select('*').eq('store_id', store.id).eq('is_paid', true).gte('paid_at', from).order('paid_at', { ascending: false }),
      supabase.from('debts').select('*').eq('store_id', store.id).eq('is_paid', false),
    ])
    setSales(salesRes.data || [])
    setPaidDebts(paidRes.data || [])
    setUnpaidDebts(unpaidRes.data || [])
    setLoading(false)
  }

  const salesTotal = sales.reduce((s, x) => s + x.amount, 0)
  const debtTotal = paidDebts.reduce((s, d) => s + d.amount, 0)
  const total = salesTotal + debtTotal
  const unpaidTotal = unpaidDebts.reduce((s, d) => s + d.amount, 0)

  // Барлық транзакциялар
  const allTx = [
    ...sales.map(s => ({ ...s, type: s.payment_type, is_debt: false, time: s.created_at })),
    ...paidDebts.map(d => ({ ...d, type: 'debt', is_debt: true, time: d.paid_at }))
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

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
              <span className="text-muted">{lang === 'kz' ? 'Транзакция саны' : 'Транзакций'}</span>
              <span style={{ fontWeight: 600 }}>{allTx.length}</span>
            </div>
            <div className="row" style={{ padding: '8px 0' }}>
              <span className="text-muted">💳 {lang === 'kz' ? 'Қарызға сатылған' : 'Продано в долг'}</span>
              <span style={{ fontWeight: 600, color: '#D97706' }}>{unpaidTotal.toLocaleString()} ₸</span>
            </div>
            <div className="row" style={{ padding: '8px 0', borderBottom: 'none' }}>
              <span className="text-muted">✅ {lang === 'kz' ? 'Қарыз төлемдері' : 'Погашено долгов'}</span>
              <span style={{ fontWeight: 600, color: '#0F6E56' }}>{debtTotal.toLocaleString()} ₸</span>
            </div>
          </div>

          <div className="card">
            <div className="section-title">{lang === 'kz' ? 'Транзакциялар' : 'Транзакции'}</div>
            {allTx.length === 0
              ? <p className="text-muted" style={{ textAlign: 'center', padding: 12, fontSize: 13 }}>{T.noData}</p>
              : allTx.map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>
                      {new Date(tx.time).toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: 14 }}>{tx.product_name} ×{tx.quantity}</div>
                    {tx.is_debt && <span style={{ fontSize: 11, color: '#D97706' }}>💳 {(tx as any).debtor_name}</span>}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{tx.amount.toLocaleString()} ₸</span>
                </div>
              ))
            }
          </div>
        </>
      )}
    </div>
  )
}
