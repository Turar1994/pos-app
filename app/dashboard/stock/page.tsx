'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Product = { id: string; name: string; price: number; cost_price?: number; quantity: number; expiry_date?: string; category?: string; unit?: string; barcode?: string }

const CATEGORIES = [
  { key: 'all', kz: 'Барлығы', ru: 'Все', icon: '📋' },
  { key: 'drinks', kz: 'Сусындар', ru: 'Напитки', icon: '🥤' },
  { key: 'bread', kz: 'Нан өнімдері', ru: 'Хлеб', icon: '🍞' },
  { key: 'dairy', kz: 'Сүт өнімдері', ru: 'Молочные', icon: '🥛' },
  { key: 'sweets', kz: 'Тәттілер', ru: 'Сладости', icon: '🍫' },
  { key: 'meat', kz: 'Ет өнімдері', ru: 'Мясо', icon: '🥩' },
  { key: 'fruits', kz: 'Жемістер', ru: 'Фрукты', icon: '🍎' },
  { key: 'vegetables', kz: 'Көкөністер', ru: 'Овощи', icon: '🥦' },
  { key: 'grocery', kz: 'Бакалея', ru: 'Бакалея', icon: '🍜' },
  { key: 'hygiene', kz: 'Тазалық', ru: 'Гигиена', icon: '🧴' },
  { key: 'other', kz: 'Басқа', ru: 'Другое', icon: '📦' },
]

const UNITS = ['шт', 'кг']

export default function StockPage() {
  const { store, lang } = useApp()
  const T = t[lang]
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [scanningBarcode, setScanningBarcode] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)

  const [form, setForm] = useState({
    name: '', category: 'other', cost_price: '',
    price: '', quantity: '', unit: 'шт', expiry_date: '', barcode: ''
  })

  useEffect(() => { loadProducts() }, [store.id])

  async function loadProducts() {
    const supabase = createClient()
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id).order('name')
    setProducts(data || [])
  }

  async function saveProduct() {
    if (!form.name.trim() || !form.price) return
    setLoading(true)
    const supabase = createClient()
    const payload = {
      store_id: store.id, name: form.name.trim(),
      category: form.category, cost_price: parseFloat(form.cost_price) || 0,
      price: parseFloat(form.price), quantity: parseFloat(form.quantity) || 0,
      unit: form.unit, expiry_date: form.expiry_date || null,
      barcode: form.barcode || null
    }
    if (editId) {
      await supabase.from('products').update(payload).eq('id', editId)
      setEditId(null)
    } else {
      await supabase.from('products').insert(payload)
    }
    setForm({ name: '', category: 'other', cost_price: '', price: '', quantity: '', unit: 'шт', expiry_date: '', barcode: '' })
    setShowAdd(false); setLoading(false); loadProducts()
  }

  async function deleteProduct(id: string) {
    if (!confirm(lang === 'kz' ? 'Жоюға сенімдісіз бе?' : 'Вы уверены?')) return
    await createClient().from('products').delete().eq('id', id)
    loadProducts()
  }

  function startEdit(p: Product) {
    setEditId(p.id)
    setForm({
      name: p.name, category: p.category || 'other',
      cost_price: String(p.cost_price || ''), price: String(p.price),
      quantity: String(p.quantity), unit: p.unit || 'шт',
      expiry_date: p.expiry_date || '', barcode: p.barcode || ''
    })
    setShowAdd(true)
  }

  async function startBarcodeScanner() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      setScanningBarcode(true)
      setTimeout(async () => {
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        detectBarcode()
      }, 100)
    } catch (e) {
      alert(lang === 'kz' ? 'Камераға рұқсат жоқ' : 'Нет доступа к камере')
    }
  }

  function stopBarcodeScanner() {
    cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanningBarcode(false)
  }

  async function detectBarcode() {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detectBarcode)
      return
    }
    try {
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
        })
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0) {
          setForm(prev => ({ ...prev, barcode: barcodes[0].rawValue }))
          stopBarcodeScanner()
          return
        }
      }
    } catch (e) {}
    animFrameRef.current = requestAnimationFrame(detectBarcode)
  }

  function getExpiryStatus(expiry?: string) {
    if (!expiry) return null
    const diff = (new Date(expiry).getTime() - Date.now()) / 86400000
    if (diff < 0) return 'expired'
    if (diff <= 7) return 'soon'
    return 'ok'
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCat === 'all' || p.category === selectedCat
    return matchSearch && matchCat
  })

  const catCounts = CATEGORIES.reduce((acc, c) => {
    acc[c.key] = c.key === 'all' ? products.length : products.filter(p => p.category === c.key).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      {/* Штрихкод сканер (склад үшін) */}
      {scanningBarcode && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 260, height: 160, border: '3px solid #fff', borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
            <div style={{ marginTop: 16, color: '#fff', fontSize: 14, background: 'rgba(0,0,0,0.5)', padding: '6px 16px', borderRadius: 99 }}>
              {lang === 'kz' ? 'Штрихкодты рамкаға тигізіңіз' : 'Наведите на штрихкод'}
            </div>
          </div>
          <button onClick={stopBarcodeScanner} style={{
            position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
            background: '#fff', border: 'none', borderRadius: 99, padding: '12px 32px',
            fontSize: 15, fontWeight: 600, cursor: 'pointer'
          }}>
            {lang === 'kz' ? '✕ Жабу' : '✕ Закрыть'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input placeholder={lang === 'kz' ? '🔍 Товар іздеу...' : '🔍 Поиск товара...'}
          value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <button className="btn btn-primary" style={{ width: 'auto', padding: '0 16px' }}
          onClick={() => {
            setShowAdd(!showAdd); setEditId(null)
            setForm({ name: '', category: 'other', cost_price: '', price: '', quantity: '', unit: 'шт', expiry_date: '', barcode: '' })
          }}>
          + {lang === 'kz' ? 'Қосу' : 'Добавить'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 10, border: '2px solid #185FA5' }}>
          <div className="section-title">
            {editId ? (lang === 'kz' ? 'Өзгерту' : 'Редактировать') : (lang === 'kz' ? 'Жаңа товар' : 'Новый товар')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder={lang === 'kz' ? 'Товар аты *' : 'Название *'}
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                <option key={c.key} value={c.key}>{c.icon} {lang === 'kz' ? c.kz : c.ru}</option>
              ))}
            </select>
            <div className="row-2">
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 3 }}>
                  {lang === 'kz' ? 'Келген баға' : 'Цена закупки'}
                </label>
                <input type="number" placeholder="0" value={form.cost_price}
                  onChange={e => setForm({ ...form, cost_price: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 3 }}>
                  {lang === 'kz' ? 'Сату бағасы *' : 'Цена продажи *'}
                </label>
                <input type="number" placeholder="0" value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
            </div>
            <div className="row-2">
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 3 }}>
                  {lang === 'kz' ? 'Саны' : 'Количество'}
                </label>
                <input type="number" step={form.unit === 'кг' ? '0.001' : '1'}
                  placeholder="0" value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 3 }}>
                  {lang === 'kz' ? 'Өлшем' : 'Единица'}
                </label>
                <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 3 }}>
                {lang === 'kz' ? 'Жарамдылық мерзімі (міндетті емес)' : 'Срок годности (необязательно)'}
              </label>
              <input type="date" value={form.expiry_date}
                onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 3 }}>
                {lang === 'kz' ? 'Штрихкод (міндетті емес)' : 'Штрихкод (необязательно)'}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  placeholder="1234567890123"
                  value={form.barcode}
                  onChange={e => setForm({ ...form, barcode: e.target.value })}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={startBarcodeScanner}
                  style={{
                    padding: '0 14px', borderRadius: 8, border: '1px solid #e5e7eb',
                    background: '#fff', cursor: 'pointer', fontSize: 20, flexShrink: 0
                  }}
                >📷</button>
              </div>
              {form.barcode && (
                <div style={{ fontSize: 11, color: '#0F6E56', marginTop: 4 }}>
                  ✓ {form.barcode}
                </div>
              )}
            </div>
            <div className="row-2">
              <button className="btn btn-primary" onClick={saveProduct} disabled={loading}>
                {loading ? T.loading : (lang === 'kz' ? 'Сақтау' : 'Сохранить')}
              </button>
              <button className="btn" onClick={() => { setShowAdd(false); setEditId(null) }}>
                {lang === 'kz' ? 'Болдырмау' : 'Отмена'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Категориялар */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 10 }}>
        {CATEGORIES.filter(c => c.key === 'all' || catCounts[c.key] > 0).map(c => (
          <button key={c.key} onClick={() => setSelectedCat(c.key)} style={{
            padding: '6px 12px', borderRadius: 99, border: '1px solid #e5e7eb',
            background: selectedCat === c.key ? '#185FA5' : '#fff',
            color: selectedCat === c.key ? '#fff' : '#6b7280',
            cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0
          }}>
            {c.icon} {lang === 'kz' ? c.kz : c.ru} ({catCounts[c.key]})
          </button>
        ))}
      </div>

      {/* Товарлар тізімі */}
      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: 20, fontSize: 13 }}>{T.noProducts}</p>
          : filtered.map(p => {
            const expStatus = getExpiryStatus(p.expiry_date)
            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {p.price.toLocaleString()} ₸/{p.unit || 'шт'}
                    {p.barcode && <span style={{ marginLeft: 6, color: '#9ca3af' }}>#{p.barcode}</span>}
                    {expStatus === 'expired' && <span style={{ color: '#D85A30', marginLeft: 6 }}>❌ мерзімі өтті</span>}
                    {expStatus === 'soon' && <span style={{ color: '#D97706', marginLeft: 6 }}>⚠️ {p.expiry_date}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
                    background: p.quantity <= 5 ? '#FAECE7' : '#E1F5EE',
                    color: p.quantity <= 5 ? '#712B13' : '#085041'
                  }}>
                    {p.quantity} {p.unit || 'шт'}
                  </span>
                  <span onClick={() => startEdit(p)} style={{ cursor: 'pointer', fontSize: 15 }}>✏️</span>
                  <span onClick={() => deleteProduct(p.id)} style={{ cursor: 'pointer', fontSize: 15 }}>🗑</span>
                </div>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}
