'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'

type MonthlyExpenses = {
  id?: string
  utilities: number   // свет, вода, ком. услуги
  salary: number      // заработная плата
  rent: number        // аренда
  other: number       // другие расходы
}

const DEFAULT_EXPENSES: MonthlyExpenses = { utilities: 0, salary: 0, rent: 0, other: 0 }

export default function ProfitPage() {
  const { store, lang } = useApp()
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [revenue, setRevenue] = useState(0)
  const [expenses, setExpenses] = useState<MonthlyExpenses>(DEFAULT_EXPENSES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => { loadData() }, [month, store.id])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()
    const [year, m] = month.split('-').map(Number)
    const startOfMonth = `${month}-01`
    const lastDay = new Date(year, m, 0).getDate()
    const endOfMonth = `${month}-${String(lastDay).padStart(2, '0')}T23:59:59`

    const [revenueRes, expensesRes] = await Promise.all([
      supabase.from('receipts').select('total_amount').eq('store_id', store.id)
        .gte('created_at', startOfMonth).lte('created_at', endOfMonth)
        .neq('payment_type', 'debt'),
      supabase.from('monthly_expenses').select('*').eq('store_id', store.id).eq('month', month).maybeSingle(),
    ])

    const rev = (revenueRes.data || []).reduce((s: number, r: any) => s + r.total_amount, 0)
    setRevenue(rev)
    if (expensesRes.data) {
      setExpenses({
        id: expensesRes.data.id,
        utilities: expensesRes.data.utilities || 0,
        salary: expensesRes.data.salary || 0,
        rent: expensesRes.data.rent || 0,
        other: expensesRes.data.other || 0,
      })
    } else {
      setExpenses(DEFAULT_EXPENSES)
    }
    setLoading(false)
  }

  async function saveExpenses() {
    setSaving(true)
    const supabase = createClient()
    const payload = { store_id: store.id, month, utilities: expenses.utilities, salary: expenses.salary, rent: expenses.rent, other: expenses.other }
    if (expenses.id) {
      await supabase.from('monthly_expenses').update(payload).eq('id', expenses.id)
    } else {
      const { data } = await supabase.from('monthly_expenses').insert(payload).select().single()
      if (data) setExpenses(prev => ({ ...prev, id: data.id }))
    }
    setSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  const totalExpenses = expenses.utilities + expenses.salary + expenses.rent + expenses.other
  const netProfit = revenue - totalExpenses

  const expenseRows = [
    { key: 'utilities' as const, icon: '💡', label: lang === 'kz' ? 'Свет, су, ком. қызметтер' : 'Свет, вода, ком. услуги' },
    { key: 'salary'    as const, icon: '👷', label: lang === 'kz' ? 'Жалақы'                   : 'Заработная плата' },
    { key: 'rent'      as const, icon: '🏠', label: lang === 'kz' ? 'Жалдау ақысы'             : 'Аренда' },
    { key: 'other'     as const, icon: '📋', label: lang === 'kz' ? 'Басқа шығындар'            : 'Другие расходы' },
  ]

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

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />)}
        </div>
      ) : (
        <>
          {/* Revenue */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{lang === 'kz' ? '📈 Түсім (сатылым)' : '📈 Выручка (продажи)'}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{revenue.toLocaleString()} ₸</div>
              </div>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>💰</div>
            </div>
          </div>

          {/* Expense categories */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-title">📉 {lang === 'kz' ? 'Шығындар' : 'Расходы'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {expenseRows.map(row => (
                <div key={row.key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{row.icon}</span>
                    <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{row.label}</label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={expenses[row.key] === 0 ? '' : expenses[row.key]}
                      onChange={e => setExpenses(prev => ({ ...prev, [row.key]: Number(e.target.value) || 0 }))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 15, minWidth: 16 }}>₸</span>
                  </div>
                </div>
              ))}

              {/* Total expenses */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{lang === 'kz' ? 'Жалпы шығын' : 'Итого расходов'}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--danger)' }}>{totalExpenses.toLocaleString()} ₸</span>
              </div>

              {saveSuccess && <p style={{ color: 'var(--primary)', fontSize: 13, margin: 0 }}>✓ {lang === 'kz' ? 'Сақталды!' : 'Сохранено!'}</p>}
              <button className="btn btn-primary" onClick={saveExpenses} disabled={saving}>
                {saving ? (lang === 'kz' ? 'Сақталуда...' : 'Сохранение...') : (lang === 'kz' ? 'Сақтау' : 'Сохранить')}
              </button>
            </div>
          </div>

          {/* Net profit */}
          <div style={{
            borderRadius: 20, padding: '24px 20px', marginBottom: 8,
            background: netProfit >= 0 ? 'var(--primary)' : 'var(--danger)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>
                {lang === 'kz' ? 'Таза пайда' : 'Чистая прибыль'} · {monthLabel}
              </div>
              <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: -1.5 }}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()} ₸
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 12, display: 'flex', justifyContent: 'center', gap: 20 }}>
                <span>{lang === 'kz' ? 'Түсім:' : 'Выручка:'} {revenue.toLocaleString()} ₸</span>
                <span>−</span>
                <span>{lang === 'kz' ? 'Шығын:' : 'Расходы:'} {totalExpenses.toLocaleString()} ₸</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
