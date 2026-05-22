'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Product = { id: string; name: string; price: number; quantity: number }
type Sale = { id: string; product_name: string; amount: number; payment_type: string; quantity: number; created_at: string }

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
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadData() }, [store.id])

  async function loadData() {
    const supabase = createClient()
    const { data: prods } = await supabase.from('products').select('*').eq('store_id', store.id).gt('quantity', 0).order('name')
    const today = new Date().toISOString().split('T')[0]
    const { data: salesData } = await supabase.from('sales').select('*').eq('store_id', store.id).gte('created_at', today).order('created_at', { ascending: false })
    setProducts(prods || [])
    setSales(salesData || [])
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
    setSelectedId(''); setQty(1); setSearch(''); setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
    setLoading(false); triggerRefresh(); loadData()
  }

  async function deleteSale(id: string) {
    if (!confirm(lang === 'kz' ? 'Жоюға сенімдісіз бе?' : 'Вы уверены?')) return
    await createClient().from('sales').delete().eq('id', id)
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
                {filtered.length === 0 ? (
                  <div style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>
                    {lang === 'kz' ? 'Табылмады' : 'Не найдено'}
                  </div>
                ) : filtered.map(p => (
                  <div key={p.id} onClick={() => { setSelectedId(p.id); setSearch(p.name); setShowList(false) }}
                    style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 14, display: 'flex', justifyContent: 'space-between' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <span>{p.name}</span>
                    <span style={{ color: '#6b7280' }}>{p.price.toLocaleString()} ₸ · {p.quantity} {T.pieces}</span>
                  </div>
                ))}
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
          {success && <div style={{ background: '#E1F5EE', borderRadius: 6, padding: '10px 12px', color: '#085041', fontSize: 14, textAlign: 'center' }}>
            ✓ {lang === 'kz' ? 'Сатылды!' : 'Продано!'}
          </div>}

          <button className="btn btn-success" onClick={handleSale} disabled={loading || !selectedId}>
            {loading ? T.loading : T.sell}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">{lang === 'kz' ? 'Бүгінгі сатылымдар' : 'Сегодняшние продажи'}</div>
        {sales.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '12px 0' }}>{T.noSales}</p>
        ) : sales.map(sale => (
          <div key={sale.id} className="row">
            <div>
              <div style={{ fontSize: 14 }}>{sale.product_name} × {sale.quantity}</div>
              <span className={`badge badge-${sale.payment_type}`}>{sale.payment_type === 'cash' ? T.cash : 'Kaspi'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 600 }}>{sale.amount.toLocaleString()} ₸</span>
              <span onClick={() => deleteSale(sale.id)} style={{ color: '#D85A30', cursor: 'pointer', fontSize: 18 }}>🗑</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
