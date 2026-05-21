'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '../layout'
import { t } from '@/lib/lang'

type Product = { id: string; name: string; price: number; quantity: number }

export default function SalePage() {
  const { store, lang, triggerRefresh } = useApp()
  const T = t[lang]
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [qty, setQty] = useState(1)
  const [payType, setPayType] = useState<'cash' | 'kaspi'>('cash')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadProducts() }, [store.id])

  async function loadProducts() {
    const supabase = createClient()
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id).gt('quantity', 0)
    setProducts(data || [])
  }

  const selected = products.find(p => p.id === selectedId)
  const totalPrice = selected ? selected.price * qty : 0

  async function handleSale() {
    if (!selectedId || !selected) { setError(T.fillAll); return }
    if (qty > selected.quantity) { setError(T.notEnoughStock); return }
    setLoading(true)
    setError('')
    const supabase = createClient()

    await supabase.from('sales').insert({
      store_id: store.id,
      product_id: selected.id,
      product_name: selected.name,
      quantity: qty,
      amount: totalPrice,
      payment_type: payType,
    })

    await supabase.from('products').update({ quantity: selected.quantity - qty }).eq('id', selected.id)

    setSelectedId('')
    setQty(1)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
    setLoading(false)
    triggerRefresh()
    loadProducts()
  }

  return (
    <div>
      <div className="card">
        <div className="section-title">{T.newSale}</div>
        <div className="gap">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">{T.selectProduct}</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.price.toLocaleString()} ₸ ({p.quantity} {T.pieces})
              </option>
            ))}
          </select>

          <div className="row-2">
            <input
              type="number" min={1} value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              placeholder={T.quantity}
            />
            <select value={payType} onChange={e => setPayType(e.target.value as 'cash' | 'kaspi')}>
              <option value="cash">{T.cash}</option>
              <option value="kaspi">Kaspi</option>
            </select>
          </div>

          {selected && (
            <div style={{
              background: '#f9fafb', borderRadius: 6, padding: '10px 12px',
              display: 'flex', justifyContent: 'space-between'
            }}>
              <span className="text-muted">{T.total}</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{totalPrice.toLocaleString()} ₸</span>
            </div>
          )}

          {error && <p style={{ color: '#D85A30', fontSize: 13 }}>{error}</p>}

          {success && (
            <div style={{ background: '#E1F5EE', borderRadius: 6, padding: '10px 12px', color: '#085041', fontSize: 14, textAlign: 'center' }}>
              ✓ Сатылды!
            </div>
          )}

          <button className="btn btn-success" onClick={handleSale} disabled={loading}>
            {loading ? T.loading : T.sell}
          </button>
        </div>
      </div>
    </div>
  )
}
