'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

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
}

export default function DebtsPage() {
  const { store, lang } = useApp()
  const T = t[lang]
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'unpaid' | 'paid' | 'all'>('unpaid')

  useEffect(() => { loadDebts() }, [store.id])

  async function loadDebts() {
    const supabase = createClient()
    const { data } = await supabase.from('debts').select('*')
      .eq('store_id', store.id).order('created_at', { ascending: false })
    setDebts(data || [])
    setLoading(false)
  }

  async function markPaid(id: string) {
    await createClient().from('debts').update({ is_paid: true, paid_at: new Date().toISOString() }).eq('id', id)
    loadDebts()
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
          <div className="stat-value" style={{ color: overdueList.length > 0 ? '#D85A30' : '#0F6E56' }}>
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
          { key: 'paid', kz: 'Төленген', ru: 'Оплачено' },
          { key: 'all', kz: 'Барлығы', ru: 'Все' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)} style={{
            padding: '6px 14px', borderRadius: 6, border: '1px solid #e5e7eb',
            background: filter === f.key ? '#185FA5' : '#fff',
            color: filter === f.key ? '#fff' : '#6b7280',
            cursor: 'pointer', fontSize: 13
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
        return (
          <div key={d.id} className="card" style={{
            padding: 14, marginBottom: 8,
            borderLeft: `4px solid ${d.is_paid ? '#0F6E56' : overdue ? '#D85A30' : dueSoon ? '#D97706' : '#185FA5'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{d.debtor_name}</span>
                  {d.is_paid
                    ? <span className="badge badge-active">✅ {lang === 'kz' ? 'Төленді' : 'Оплачено'}</span>
                    : overdue
                      ? <span className="badge badge-low">❌ {lang === 'kz' ? 'Мерзімі өтті' : 'Просрочено'}</span>
                      : dueSoon
                        ? <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>⚠️ {lang === 'kz' ? 'Жақында' : 'Скоро'}</span>
                        : <span className="badge" style={{ background: '#E6F1FB', color: '#0C447C' }}>💳 {lang === 'kz' ? 'Қарыз' : 'Долг'}</span>
                  }
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {d.debtor_phone && <span>📞 {d.debtor_phone}</span>}
                  {d.product_name && <span>📦 {d.product_name} × {d.quantity || 1}</span>}
                  <span>📅 {new Date(d.created_at).toLocaleDateString('kk-KZ')}</span>
                  {d.due_date && (
                    <span style={{ color: overdue ? '#D85A30' : '#6b7280' }}>
                      ⏰ {lang === 'kz' ? 'Мерзімі' : 'До'}: {new Date(d.due_date).toLocaleDateString('kk-KZ')}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', marginLeft: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: d.is_paid ? '#0F6E56' : '#D85A30' }}>
                  {d.amount.toLocaleString()} ₸
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                  {!d.is_paid && (
                    <button className="btn btn-sm btn-success" onClick={() => markPaid(d.id)}>
                      ✓ {lang === 'kz' ? 'Төленді' : 'Оплачено'}
                    </button>
                  )}
                  <button className="btn btn-sm btn-danger" onClick={() => deleteDebt(d.id)}>🗑</button>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
