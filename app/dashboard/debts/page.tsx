'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'
import { fmtDate } from '@/lib/date'
import { usePullToRefresh } from '@/lib/usePullToRefresh'

type Debt = {
  id: string
  product_name: string
  amount: number
  quantity: number
  debtor_name: string
  debtor_phone: string
  debt_date: string
  due_date: string | null
  is_paid: boolean
  created_at: string
  paid_at?: string
}

export default function DebtsPage() {
  const { store, lang } = useApp()
  const T = t[lang]
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'unpaid' | 'paid' | 'all'>('unpaid')
  const [paidAnimId, setPaidAnimId] = useState<string | null>(null)

  const ptr = usePullToRefresh(useCallback(() => loadDebts(), [store.id]))

  useEffect(() => { loadDebts() }, [store.id])

  async function loadDebts() {
    const supabase = createClient()
    const { data } = await supabase.from('debts').select('*')
      .eq('store_id', store.id).order('created_at', { ascending: false })
    setDebts(data || [])
    setLoading(false)
  }

  async function markPaid(id: string) {
    if (navigator.vibrate) navigator.vibrate(50)
    setPaidAnimId(id)
    await createClient().from('debts').update({ is_paid: true, paid_at: new Date().toISOString() }).eq('id', id)
    setTimeout(() => { setPaidAnimId(null); setFilter('paid'); loadDebts() }, 700)
  }

  async function deleteDebt(id: string) {
    if (!confirm(lang === 'kz' ? 'Жоюға сенімдісіз бе?' : 'Вы уверены?')) return
    await createClient().from('debts').delete().eq('id', id)
    loadDebts()
  }

  function isOverdue(due: string | null, is_paid: boolean) {
    if (!due || is_paid) return false
    return new Date(due) < new Date()
  }

  function isDueSoon(due: string | null, is_paid: boolean) {
    if (!due || is_paid) return false
    const diff = (new Date(due).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 3
  }

  const unpaid = debts.filter(d => !d.is_paid)
  const overdueList = unpaid.filter(d => isOverdue(d.due_date, d.is_paid))
  const totalUnpaid = unpaid.reduce((s, d) => s + d.amount, 0)

  const filtered = debts.filter(d => {
    if (filter === 'unpaid') return !d.is_paid
    if (filter === 'paid') return d.is_paid
    return true
  })

  if (loading) return <p className="text-muted">{T.loading}</p>

  return (
    <div>
      {(ptr.progress > 0 || ptr.refreshing) && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 48, opacity: ptr.refreshing ? 1 : ptr.progress }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--primary-light)', borderTopColor: 'var(--primary)', animation: ptr.refreshing ? 'ptrSpin 0.7s linear infinite' : 'none', transform: ptr.refreshing ? 'none' : `rotate(${ptr.progress * 270}deg)` }} />
        </div>
      )}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
        {lang === 'kz' ? 'Қарыздар' : 'Долги'}
      </h2>

      {/* Статистика */}
      <div className="stat-grid" style={{ marginBottom: 10 }}>
        <div className="stat-card">
          <div className="stat-label">{lang === 'kz' ? 'Жалпы қарыз' : 'Общий долг'}</div>
          <div className="stat-value text-red">{totalUnpaid.toLocaleString()} ₸</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{lang === 'kz' ? 'Мерзімі өткен' : 'Просрочено'}</div>
          <div className="stat-value" style={{ color: overdueList.length > 0 ? 'var(--danger)' : 'var(--primary)' }}>
            {overdueList.length}
          </div>
        </div>
      </div>

      {overdueList.length > 0 && (
        <div className="alert" style={{ marginBottom: 10 }}>
          ⚠️ {lang === 'kz'
            ? `Мерзімі өткен қарыздар: ${overdueList.map(d => `${d.debtor_name} (${d.amount.toLocaleString()} ₸)`).join(', ')}`
            : `Просроченные долги: ${overdueList.map(d => `${d.debtor_name} (${d.amount.toLocaleString()} ₸)`).join(', ')}`
          }
        </div>
      )}

      {/* Фильтр */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[
          { key: 'unpaid', kz: 'Төленбеген', ru: 'Не оплачено' },
          { key: 'paid',   kz: 'Төленген',   ru: 'Оплачено' },
          { key: 'all',    kz: 'Барлығы',    ru: 'Все' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)} style={{
            padding: '8px 16px', borderRadius: 10,
            border: `2px solid ${filter === f.key ? 'var(--primary)' : 'var(--border)'}`,
            background: filter === f.key ? 'var(--primary-light)' : 'var(--card-bg)',
            color: filter === f.key ? 'var(--primary-dark)' : 'var(--muted)',
            fontWeight: filter === f.key ? 700 : 500,
            cursor: 'pointer', fontSize: 13, transition: 'all 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}>
            {lang === 'kz' ? f.kz : f.ru}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>
          {lang === 'kz' ? 'Қарыз жоқ' : 'Долгов нет'}
        </div>
      ) : filtered.map(d => {
        const overdue = isOverdue(d.due_date, d.is_paid)
        const dueSoon = isDueSoon(d.due_date, d.is_paid)
        const borderColor = d.is_paid ? 'var(--primary)' : overdue ? 'var(--danger)' : dueSoon ? 'var(--warning)' : 'var(--blue)'
        return (
          <div key={d.id} className={overdue ? 'pulse-danger' : ''} style={{
            position: 'relative', overflow: 'hidden',
            background: 'var(--card-bg)', borderRadius: 18, padding: '16px', marginBottom: 10,
            border: '1px solid var(--border)',
            borderLeft: `4px solid ${borderColor}`,
            boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
            transition: 'opacity 0.3s, transform 0.3s',
            opacity: paidAnimId === d.id ? 0.5 : 1,
          }}>
            {paidAnimId === d.id && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(220, 252, 231, 0.85)', borderRadius: 18, zIndex: 2,
              }}>
                <span className="anim-checkmark" style={{ fontSize: 52 }}>✅</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{d.debtor_name}</span>
                  {d.is_paid
                    ? <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)' }}>✅ {lang === 'kz' ? 'Төленді' : 'Оплачено'}</span>
                    : overdue
                      ? <span className="badge anim-breathe" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>🔴 {lang === 'kz' ? 'Мерзімі өтті' : 'Просрочено'}</span>
                      : dueSoon
                        ? <span className="badge" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>⚠️ {lang === 'kz' ? 'Жақында' : 'Скоро'}</span>
                        : <span className="badge" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>💳 {lang === 'kz' ? 'Қарыз' : 'Долг'}</span>
                  }
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap', lineHeight: 1.8 }}>
                  {d.debtor_phone && <span>📞 {d.debtor_phone}</span>}
                  {d.product_name && <span>📦 {d.product_name} × {d.quantity || 1}</span>}
                  <span>📅 {fmtDate(d.created_at)}</span>
                  {d.due_date && !d.is_paid && (
                    <span style={{ color: overdue ? 'var(--danger)' : 'var(--muted)' }}>
                      ⏰ {lang === 'kz' ? 'Дейін' : 'До'}: {fmtDate(d.due_date!)}
                    </span>
                  )}
                  {d.is_paid && d.paid_at && (
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      ✅ {fmtDate(d.paid_at!)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', marginLeft: 14 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: d.is_paid ? 'var(--primary)' : overdue ? 'var(--danger)' : 'var(--text)', letterSpacing: -0.5 }}>
                  {d.amount.toLocaleString()} ₸
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                  {!d.is_paid && (
                    <button className="btn btn-sm btn-success" onClick={() => markPaid(d.id)}>
                      ✓ {lang === 'kz' ? 'Төленді' : 'Оплачено'}
                    </button>
                  )}
                  <button className="btn btn-sm btn-danger" onClick={() => deleteDebt(d.id)} style={{ padding: '7px 10px' }}>🗑</button>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
