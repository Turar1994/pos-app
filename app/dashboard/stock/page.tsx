'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Product = { id: string; name: string; price: number; quantity: number; expiry_date?: string }

export default function StockPage() {
  const { store, lang } = useApp()
  const T = t[lang]
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('')
  const [expiry, setExpiry] = useState('')
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editQty, setEditQty] = useState('')
  const [editExpiry, setEditExpiry] = useState('')

  useEffect(() => { loadProducts() }, [store.id])

  async function loadProducts() {
    const supabase = createClient()
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id).order('name')
    setProducts(data || [])
  }

  async function addProduct() {
    if (!name.trim() || !price) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('products').insert({
      store_id: store.id, name: name.trim(),
      price: parseFloat(price), quantity: parseInt(qty) || 0,
      expiry_date: expiry || null
    })
    setName(''); setPrice(''); setQty(''); setExpiry('')
    setLoading(false); loadProducts()
  }

  async function deleteProduct(id: string) {
    if (!confirm(lang === 'kz' ? 'Жоюға сенімдісіз бе?' : 'Вы уверены?')) return
    const supabase = createClient()
    await supabase.from('products').delete().eq('id', id)
    loadProducts()
  }

  async function saveEdit() {
    if (!editId) return
    const supabase = createClient()
    await supabase.from('products').update({
      name: editName, price: parseFloat(editPrice),
      quantity: parseInt(editQty) || 0,
      expiry_date: editExpiry || null
    }).eq('id', editId)
    setEditId(null); loadProducts()
  }

  function startEdit(p: Product) {
    setEditId(p.id); setEditName(p.name)
    setEditPrice(String(p.price)); setEditQty(String(p.quantity))
    setEditExpiry(p.expiry_date || '')
  }

  function getExpiryStatus(expiry?: string) {
    if (!expiry) return null
    const exp = new Date(expiry)
    const now = new Date()
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (diff < 0) return 'expired'
    if (diff <= 7) return 'soon'
    return 'ok'
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const expiringSoon = products.filter(p => ['soon', 'expired'].includes(getExpiryStatus(p.expiry_date) || ''))

  return (
    <div>
      {expiringSoon.length > 0 && (
        <div className="alert">
          ⚠️ {lang === 'kz' ? 'Мерзімі бітуге жақын' : 'Истекает срок'}:{' '}
          {expiringSoon.map(p => {
            const status = getExpiryStatus(p.expiry_date)
            return `${p.name} (${status === 'expired' ? (lang === 'kz' ? 'өтіп кетті!' : 'истёк!') : p.expiry_date})`
          }).join(', ')}
        </div>
      )}

      <div className="card">
        <div className="section-title">{T.addProduct}</div>
        <div className="gap">
          <input placeholder={T.productName} value={name} onChange={e => setName(e.target.value)} />
          <div className="row-2">
            <input type="number" placeholder={T.price} value={price} onChange={e => setPrice(e.target.value)} />
            <input type="number" placeholder={T.qty} value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
            placeholder={lang === 'kz' ? 'Жарамдылық мерзімі (міндетті емес)' : 'Срок годности (необязательно)'}
            style={{ color: expiry ? '#111' : '#9ca3af' }}
          />
          <button className="btn btn-primary" onClick={addProduct} disabled={loading}>
            {loading ? T.loading : T.add}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">{T.products} ({filtered.length})</div>
        <div style={{ marginBottom: 10 }}>
          <input
            placeholder={lang === 'kz' ? '🔍 Товар іздеу...' : '🔍 Поиск товара...'}
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '12px 0' }}>
            {search ? (lang === 'kz' ? 'Табылмады' : 'Не найдено') : T.noProducts}
          </p>
        ) : filtered.map(p => {
          const expiryStatus = getExpiryStatus(p.expiry_date)
          return editId === p.id ? (
            <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
              <div className="gap">
                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder={T.productName} />
                <div className="row-2">
                  <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder={T.price} />
                  <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} placeholder={T.qty} />
                </div>
                <input type="date" value={editExpiry} onChange={e => setEditExpiry(e.target.value)} />
                <div className="row-2">
                  <button className="btn btn-primary" onClick={saveEdit}>{lang === 'kz' ? 'Сақтау' : 'Сохранить'}</button>
                  <button className="btn" onClick={() => setEditId(null)}>{lang === 'kz' ? 'Болдырмау' : 'Отмена'}</button>
                </div>
              </div>
            </div>
          ) : (
            <div key={p.id} className="row">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.name}
                  {expiryStatus === 'expired' && <span className="badge badge-low">❌ {lang === 'kz' ? 'өтті' : 'истёк'}</span>}
                  {expiryStatus === 'soon' && <span className="badge badge-low">⚠️ {p.expiry_date}</span>}
                  {expiryStatus === 'ok' && <span style={{ fontSize: 11, color: '#0F6E56' }}>✓ {p.expiry_date}</span>}
                </div>
                <div className="text-muted">{p.price.toLocaleString()} ₸</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={p.quantity <= 5 ? 'badge badge-low' : 'badge badge-cash'}>
                  {p.quantity} {T.pieces}
                </span>
                <span onClick={() => startEdit(p)} style={{ cursor: 'pointer', fontSize: 16 }}>✏️</span>
                <span onClick={() => deleteProduct(p.id)} style={{ cursor: 'pointer', fontSize: 16 }}>🗑</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
