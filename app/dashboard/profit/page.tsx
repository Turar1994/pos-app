'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'

type Expense = { id: string; name: string; amount: number; month: string }

export default function ProfitPage() {
  const { store, lang } = useApp()
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [revenue, setRevenue] = useState(0)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { loadData() }, [month, store.id])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()
    const startOfMonth = `${month}-01`
    const endOfMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).toISOString().split('T')[0]

    const [revenueRes, expensesRes] = await Promise.all([
      supabase.from('receipts').select('total_amount').eq('store_id', store.id)
        .gte('created_at', startOfMonth).lte('created_at', endOfMonth + 'T23:59:59')
        .neq('payment_type', 'debt'),
      supabase.from('expenses').select('*').eq('store_id', store.id).eq('month', month).order('created_at', { ascending: false }),
    ])

    const rev = (revenueRes.data || []).reduce((s: number, r: any) => s + r.total_amount, 0)
    setRevenue(rev)
    setExpenses(expensesRes.data || [])
    setLoading(false)
  }

  async function addExpense() {
    if (!newName.trim() || !newAmount || isNaN(Number(newAmount))) return
    setAdding(true)
    const supabase = createClient()
    const { data } = await supabase.from('expenses').insert({ store_id: store.id, name: newName.trim(), amount: Number(newAmount), month }).select().single()
    if (data) setExpenses(prev => [data, ...prev])
    setNewName(''); setNewAmount('')
    setAdding(false)
  }

  async function deleteExpense(id: string) {
    const supabase = createClient()
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = revenue - totalExpenses

  const monthLabel = new Date(month + '-01').toLocaleDateString(lang === 'kz' ? 'kk-KZ' : 'ru-RU', { month: 'long', year: 'numeric' })

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>
        💹 {lang === 'kz' ? 'Пайда' : 'Прибыль'}
      </h2>

      {/* Month selector */}
      <div className="card" style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>
          {lang === 'kz' ? 'Ай' : 'Месяц'}
        </label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ fontWeight: 600 }} />
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{lang === 'kz' ? 'Түсім' : 'Выручка'}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{revenue.toLocaleString()} ₸</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{lang === 'kz' ? 'Шығын' : 'Расходы'}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)' }}>{totalExpenses.toLocaleString()} ₸</div>
        </div>
      </div>

      {/* Net profit */}
      <div className="card" style={{ marginBottom: 16, background: netProfit >= 0 ? 'var(--primary)' : 'var(--danger)', border: 'none' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
            {lang === 'kz' ? 'Таза пайда' : 'Чистая прибыль'} · {monthLabel}
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>
            {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()} ₸
          </div>
        </div>
      </div>

      {/* Add expense */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="section-title">{lang === 'kz' ? 'Шығын қосу' : 'Добавить расход'}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder={lang === 'kz' ? 'Атауы (су, свет...)' : 'Название (вода, свет...)'}
            value={newName} onChange={e => setNewName(e.target.value)}
            style={{ flex: 2 }}
          />
          <input
            type="number" placeholder="₸" value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addExpense()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={addExpense} disabled={adding} style={{ flexShrink: 0, padding: '0 16px' }}>
            +
          </button>
        </div>
      </div>

      {/* Expenses list */}
      <div className="card">
        <div className="section-title">{lang === 'kz' ? 'Шығындар тізімі' : 'Список расходов'}</div>
        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>...</p>
        ) : expenses.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
            {lang === 'kz' ? 'Шығын жоқ' : 'Расходов нет'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {expenses.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{e.name}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--danger)' }}>-{e.amount.toLocaleString()} ₸</div>
                <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              <span>{lang === 'kz' ? 'Барлығы' : 'Итого'}</span>
              <span style={{ color: 'var(--danger)' }}>{totalExpenses.toLocaleString()} ₸</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
