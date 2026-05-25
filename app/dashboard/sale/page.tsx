'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Product = { id: string; name: string; price: number; quantity: number }
type Sale = { id: string; product_name: string; amount: number; payment_type: string; quantity: number; created_at: string; is_debt?: boolean; debtor_name?: string }

export default function SalePage() {
  const { store, lang, triggerRefresh } = useApp()
  const T = t[lang]
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [search, setSearch] = useState('')
  const [showList, setShowList] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [qty, setQty] = useState(1)
  const [payType, setPayType] = useState<'cash' | 'kaspi'>('cash')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Қарыз формасы
  const [showDebtForm, setShowDebtForm] = useState(false)
  const [debtorName, setDebtorName] = useState('')
  const [debtorPhone, setDebtorPhone] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => { loadData() }, [store.id])

  async function loadData() {
    const supabase = createClient()
    const { data: prods } = await supabase.from('products').select('*').eq('store_id', store.id).gt('quantity', 0).order('name')
    const today = new Date().toISOString().split('T')[0]
    const { data: salesData } = await supabase.from('sales').select('*').eq('store_id', store.id).gte('created_at', today).order('created_at', { ascending: false })
    // Бүгінгі қарыздар
    const { data: debtsData } = await supabase.from('debts').select('*').eq('store_id', store.id).gte('created_at', today).order('created_at', { ascending: false })
    
    setProducts(prods || [])
    const allSales = [
      ...(salesData || []).map(s => ({ ...s, is_debt: false })),
      ...(debtsData || []).map(d => ({
        id: d.id, product_name: d.product_name, amount: d.amount,
        payment_type: 'debt', quantity: d.quantity || 1,
        created_at: d.created_at, is_debt: true, debtor_name: d.debtor_name
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setSales(allSales)
  }

  const filtered = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  const selected = products.find(p => p.id === selectedId)
  const totalPrice = selected ? selected.price * qty : 0

  async function handleSale() {
    if (!selectedId || !selected) { setError(T.fillAll); return }
    if (qty > selected.quantity) { setError(T.notEnoughStock); return }
    setLoading(true); setError('')
    const supabase = createClient()
    await supabase.from('sales').insert({
      store_id: store.id, product_id: selected.id,
      product_name: selected.name, quantity: qty,
      amount: totalPrice, payment_type: payType,
    })
    await supabase.from('products').update({ quantity: selected.quantity - qty }).eq('id', selected.id)
    setSelectedId(''); setQty(1); setSearch('')
    setSuccess(lang === 'kz' ? '✅ Сатылды!' : '✅ Продано!')
    setTimeout(() => setSuccess(''), 2000)
    setLoading(false); triggerRefresh(); loadData()
  }

  async function handleDebt() {
    if (!selectedId || !selected) { setError(T.fillAll); return }
    if (!debtorName) { setError(lang === 'kz' ? 'Қарыз алушы атын енгізіңіз' : 'Введите имя должника'); return }
    if (qty > selected.quantity) { setError(T.notEnoughStock); return }
    setLoading(true); setError('')
    const supabase = createClient()
    await supabase.from('debts').insert({
      store_id: store.id, product_id: selected.id,
      product_name: selected.name, quantity: qty,
      amount: totalPrice, debtor_name: debtorName,
      debtor_phone: debtorPhone, due_date: dueDate || null,
      is_paid: false
    })
    await supabase.from('products').update({ quantity: selected.quantity - qty }).eq('id', selected.id)
    setSelectedId(''); setQty(1); setSearch('')
    setDebtorName(''); setDebtorPhone(''); setDueDate('')
    setShowDebtForm(false)
    setSuccess(lang === 'kz' ? '✅ Қарыз тіркелді!' : '✅ Долг записан!')
    setTimeout(() => setSuccess(''), 2000)
    setLoading(false); triggerRefresh(); loadData()
  }

  async function deleteSale(id: string, isDebt: boolean) {
    if (!confirm(lang === 'kz' ? 'Жоюға сенімдісіз бе?' : 'Вы уверены?')) return
    const supabase = createClient()
    if (isDebt) await supabase.from('debts').delete().eq('id', id)
    else await supabase.from('sales').delete().eq('id', id)
    loadData(); triggerRefresh()
  }

  return (
    <div>
      <div className="card">
        <div className="section-title">{T.newSale}</div>
        <div className="gap">
          <div style={{ position: 'relative' }}>
            <input
              placeholder={lang === 'kz' ? '🔍 Товар іздеу немесе тізімнен таңда...' : '🔍 Поиск или выберите из списка...'}
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedId(''); setShowList(true) }}
              onFocus={() => setShowList(true)}
            />
            {showList && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6,
                maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {filtered.length === 0
                  ? <div style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>{lang === 'kz' ? 'Табылмады' : 'Не найдено'}</div>
                  : filtered.map(p => (
                    <div key={p.id}
                      onClick={() => { setSelectedId(p.id); setSearch(p.name); setShowList(false) }}
                      style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 14, display: 'flex', justifyContent: 'space-between', background: '#fff' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <span>{p.name}</span>
                      <span style={{ color: '#6b7280' }}>{p.price.toLocaleString()} ₸ · {p.quantity} {T.pieces}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          <div className="row-2">
            <input type="number" min={1} value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              placeholder={T.quantity} />
            <select value={payType} onChange={e => setPayType(e.target.value as 'cash' | 'kaspi')}>
              <option value="cash">{T.cash}</option>
              <option value="kaspi">Kaspi</option>
            </select>
          </div>

          {selected && (
            <div style={{ background: '#f9fafb', borderRadius: 6, padding: '10px 12px', display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">{T.total}</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{totalPrice.toLocaleString()} ₸</span>
            </div>
          )}

          {error && <p style={{ color: '#D85A30', fontSize: 13 }}>{error}</p>}
          {success && <div style={{ background: '#E1F5EE', borderRadius: 6, padding: '10px 12px', color: '#085041', fontSize: 14, textAlign: 'center' }}>{success}</div>}

          <div className="row-2">
            <button className="btn btn-success" onClick={handleSale} disabled={loading || !selectedId}>
              {loading ? T.loading : T.sell}
            </button>
            <button className="btn" onClick={() => { if (!selectedId) { setError(T.fillAll); return } setShowDebtForm(!showDebtForm) }}
              style={{ borderColor: '#D97706', color: '#D97706' }} disabled={!selectedId}>
              💳 {lang === 'kz' ? 'Қарызға беру' : 'В долг'}
            </button>
          </div>

          {showDebtForm && (
            <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>
                💳 {lang === 'kz' ? 'Қарыз мәліметтері' : 'Данные о долге'}
              </div>
              <input placeholder={lang === 'kz' ? 'Аты-жөні *' : 'Имя должника *'}
                value={debtorName} onChange={e => setDebtorName(e.target.value)} />
              <input placeholder={lang === 'kz' ? 'Телефон' : 'Телефон'}
                value={debtorPhone} onChange={e => setDebtorPhone(e.target.value)} />
              <div>
                <label style={{ fontSize: 12, color: '#92400E', marginBottom: 4, display: 'block' }}>
                  {lang === 'kz' ? 'Қайтару мерзімі' : 'Срок возврата'}
                </label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <button className="btn" onClick={handleDebt} disabled={loading}
                style={{ background: '#D97706', color: '#fff', borderColor: '#D97706' }}>
                {loading ? T.loading : (lang === 'kz' ? 'Қарызға беру' : 'Выдать в долг')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-title">{lang === 'kz' ? 'Бүгінгі сатылымдар' : 'Сегодняшние продажи'}</div>
        {sales.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '12px 0' }}>{T.noSales}</p>
          : sales.map(sale => (
            <div key={sale.id} className="row">
              <div>
                <div style={{ fontSize: 14 }}>{sale.product_name} × {sale.quantity}</div>
                {sale.is_debt
                  ? <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>💳 {lang === 'kz' ? 'Қарыз' : 'Долг'} — {sale.debtor_name}</span>
                  : <span className={`badge badge-${sale.payment_type}`}>{sale.payment_type === 'cash' ? T.cash : 'Kaspi'}</span>
                }
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 600 }}>{sale.amount.toLocaleString()} ₸</span>
                <span onClick={() => deleteSale(sale.id, sale.is_debt || false)} style={{ color: '#D85A30', cursor: 'pointer', fontSize: 18 }}>🗑</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
