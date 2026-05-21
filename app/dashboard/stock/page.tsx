'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Product = { id: string; name: string; price: number; quantity: number }

export default function StockPage() {
  const { store, lang } = useApp()
  const T = t[lang]
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('')
  const [loading, setLoading] = useState(false)

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
      store_id: store.id,
      name: name.trim(),
      price: parseFloat(price),
      quantity: parseInt(qty) || 0
    })
    setName(''); setPrice(''); setQty('')
    setLoading(false)
    loadProducts()
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="card">
        <div className="section-title">{T.addProduct}</div>
        <div className="gap">
          <input placeholder={T.productName} value={name} onChange={e => setName(e.target.value)} />
          <div className="row-2">
            <input type="number" placeholder={T.price} value={price} onChange={e => setPrice(e.target.value)} />
            <input type="number" placeholder={T.qty} value={qty} onChange={e => setQty(e.target.value)} />
          </div>
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
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '12px 0' }}>
            {search ? (lang === 'kz' ? 'Табылмады' : 'Не найдено') : T.noProducts}
          </p>
        ) : (
          filtered.map(p => (
            <div key={p.id} className="row">
              <div>
                <div style={{ fontSize: 14 }}>{p.name}</div>
                <div className="text-muted">{p.price.toLocaleString()} ₸</div>
              </div>
              <span className={p.quantity <= 5 ? 'badge badge-low' : 'badge badge-cash'}>
                {p.quantity} {T.pieces}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
