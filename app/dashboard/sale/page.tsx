'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Product = { id: string; name: string; price: number; quantity: number; unit?: string; category?: string; barcode?: string }
type CartItem = { product: Product; qty: number; amount: number }

const CATEGORIES = [
  { key: 'all', kz: 'Барлығы', ru: 'Все', icon: '📋' },
  { key: 'drinks', kz: 'Сусындар', ru: 'Напитки', icon: '🥤' },
  { key: 'bread', kz: 'Нан', ru: 'Хлеб', icon: '🍞' },
  { key: 'dairy', kz: 'Сүт', ru: 'Молочные', icon: '🥛' },
  { key: 'sweets', kz: 'Тәттілер', ru: 'Сладости', icon: '🍫' },
  { key: 'meat', kz: 'Ет', ru: 'Мясо', icon: '🥩' },
  { key: 'fruits', kz: 'Жемістер', ru: 'Фрукты', icon: '🍎' },
  { key: 'vegetables', kz: 'Көкөністер', ru: 'Овощи', icon: '🥦' },
  { key: 'grocery', kz: 'Бакалея', ru: 'Бакалея', icon: '🍜' },
  { key: 'hygiene', kz: 'Тазалық', ru: 'Гигиена', icon: '🧴' },
  { key: 'other', kz: 'Басқа', ru: 'Другое', icon: '📦' },
]

export default function SalePage() {
  const { store, lang, triggerRefresh } = useApp()
  const T = t[lang]
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('all')
  const [payType, setPayType] = useState<'cash' | 'kaspi'>('cash')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [kgModal, setKgModal] = useState<Product | null>(null)
  const [kgValue, setKgValue] = useState('')
  const [showDebtForm, setShowDebtForm] = useState(false)
  const [debtorName, setDebtorName] = useState('')
  const [debtorPhone, setDebtorPhone] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Сканер
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)
  const lastScannedRef = useRef<string>('')
  const lastScannedTimeRef = useRef<number>(0)
  const productsRef = useRef<Product[]>([])

  useEffect(() => { loadProducts() }, [store.id])
  useEffect(() => { productsRef.current = products }, [products])

  async function loadProducts() {
    const supabase = createClient()
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id).gt('quantity', 0).order('name')
    setProducts(data || [])
  }

  async function startScanner() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: 'continuous',
        } as any
      })
      // Автофокус қосу
      const track = stream.getVideoTracks()[0]
      if (track && 'applyConstraints' in track) {
        try {
          await (track as any).applyConstraints({
            advanced: [{ focusMode: 'continuous' }]
          })
        } catch (e) {}
      }
      streamRef.current = stream
      setScanning(true)
      setScanMsg('')
      setTimeout(async () => {
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        detectBarcodes()
      }, 100)
    } catch (e) {
      setScanMsg(lang === 'kz' ? 'Камераға рұқсат жоқ' : 'Нет доступа к камере')
    }
  }

  function stopScanner() {
    cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
    setScanMsg('')
    lastScannedRef.current = ''
  }

  const detectBarcodes = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detectBarcodes)
      return
    }
    try {
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'codabar']
        })
        // Бүкіл видео фреймін сканерлеу — рамка шарты жоқ
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue
          const now = Date.now()
          if (code !== lastScannedRef.current || now - lastScannedTimeRef.current > 2000) {
            lastScannedRef.current = code
            lastScannedTimeRef.current = now
            handleBarcode(code)
          }
        }
      }
    } catch (e) {}
    // 60fps жылдамдықта сканерлеу
    animFrameRef.current = requestAnimationFrame(detectBarcodes)
  }, [])

  function handleBarcode(code: string) {
    const product = productsRef.current.find(p => p.barcode === code)
    if (!product) {
      setScanMsg(lang === 'kz' ? `"${code}" — Товар табылмады` : `"${code}" — Товар не найден`)
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      setTimeout(() => setScanMsg(''), 2000)
      return
    }

    // Товар табылды — корзинаға қосу
    if (product.unit === 'кг') {
      stopScanner()
      setKgModal(product); setKgValue('')
      return
    }

    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id)
      if (existing) {
        if (existing.qty >= product.quantity) return prev
        return prev.map(c => c.product.id === product.id
          ? { ...c, qty: c.qty + 1, amount: (c.qty + 1) * product.price } : c)
      }
      return [...prev, { product, qty: 1, amount: product.price }]
    })

    setScanMsg(`✅ ${product.name}`)
    if (navigator.vibrate) navigator.vibrate(50)
    setTimeout(() => setScanMsg(''), 1500)
  }

  function addToCart(product: Product) {
    if (product.unit === 'кг') { setKgModal(product); setKgValue(''); return }
    const existing = cart.find(c => c.product.id === product.id)
    if (existing) {
      if (existing.qty >= product.quantity) return
      setCart(cart.map(c => c.product.id === product.id
        ? { ...c, qty: c.qty + 1, amount: (c.qty + 1) * product.price } : c))
    } else {
      setCart([...cart, { product, qty: 1, amount: product.price }])
    }
  }

  function addKgToCart() {
    if (!kgModal || !kgValue) return
    const qty = parseFloat(kgValue)
    if (isNaN(qty) || qty <= 0 || qty > kgModal.quantity) return
    const existing = cart.find(c => c.product.id === kgModal.id)
    if (existing) {
      setCart(cart.map(c => c.product.id === kgModal.id
        ? { ...c, qty: +(c.qty + qty).toFixed(3), amount: +((c.qty + qty) * kgModal.price).toFixed(0) } : c))
    } else {
      setCart([...cart, { product: kgModal, qty, amount: +(qty * kgModal.price).toFixed(0) }])
    }
    setKgModal(null); setKgValue('')
  }

  function removeFromCart(id: string) { setCart(cart.filter(c => c.product.id !== id)) }

  function updateQty(id: string, delta: number) {
    setCart(cart.map(c => {
      if (c.product.id !== id) return c
      const newQty = Math.max(1, c.qty + delta)
      if (newQty > c.product.quantity) return c
      return { ...c, qty: newQty, amount: newQty * c.product.price }
    }))
  }

  const totalAmount = cart.reduce((s, c) => s + c.amount, 0)

  async function handleSale(isDebt = false) {
    if (cart.length === 0) return
    if (isDebt && !debtorName) return
    setLoading(true)
    const supabase = createClient()

    const { data: receipt } = await supabase.from('receipts').insert({
      store_id: store.id, total_amount: totalAmount,
      payment_type: isDebt ? 'debt' : payType,
      debtor_name: isDebt ? debtorName : null,
      debtor_phone: isDebt ? debtorPhone : null,
      due_date: isDebt && dueDate ? dueDate : null,
    }).select().single()

    for (const item of cart) {
      const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product.id).single()
      if (!prod || prod.quantity < item.qty) continue
      if (isDebt) {
        await supabase.from('debts').insert({
          store_id: store.id, product_id: item.product.id,
          product_name: item.product.name, quantity: item.qty,
          amount: item.amount, debtor_name: debtorName,
          debtor_phone: debtorPhone, due_date: dueDate || null,
          is_paid: false, receipt_id: receipt?.id
        })
      } else {
        await supabase.from('sales').insert({
          store_id: store.id, product_id: item.product.id,
          product_name: item.product.name, quantity: item.qty,
          amount: item.amount, payment_type: payType, receipt_id: receipt?.id
        })
      }
      await supabase.from('products').update({ quantity: prod.quantity - item.qty }).eq('id', item.product.id)
    }

    setCart([]); setDebtorName(''); setDebtorPhone(''); setDueDate(''); setShowDebtForm(false)
    setSuccess(isDebt ? (lang === 'kz' ? '✅ Қарыз тіркелді!' : '✅ Долг записан!') : (lang === 'kz' ? '✅ Сатылды!' : '✅ Продано!'))
    setTimeout(() => setSuccess(''), 2000)
    setLoading(false); triggerRefresh(); loadProducts()
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCat === 'all' || p.category === selectedCat
    return matchSearch && matchCat
  })

  const availableCats = CATEGORIES.filter(c => c.key === 'all' || products.some(p => p.category === c.key))

  return (
    <div>
      {/* KG Modal */}
      {kgModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, width: '100%', maxWidth: 320 }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{kgModal.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{lang === 'kz' ? `Қалдық: ${kgModal.quantity} кг` : `Остаток: ${kgModal.quantity} кг`}</div>
            <input type="number" step="0.001" placeholder="0.000" value={kgValue}
              onChange={e => setKgValue(e.target.value)} autoFocus
              style={{ marginBottom: 8, fontSize: 22, textAlign: 'center', fontWeight: 600 }} />
            {kgValue && parseFloat(kgValue) > 0 && (
              <div style={{ textAlign: 'center', fontSize: 15, marginBottom: 12, color: '#185FA5', fontWeight: 600 }}>
                = {(parseFloat(kgValue) * kgModal.price).toLocaleString()} ₸
              </div>
            )}
            <div className="row-2">
              <button className="btn btn-primary" onClick={addKgToCart}>{lang === 'kz' ? 'Қосу' : 'Добавить'}</button>
              <button className="btn" onClick={() => setKgModal(null)}>{lang === 'kz' ? 'Болдырмау' : 'Отмена'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Сканер */}
      {scanning && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 999, display: 'flex', flexDirection: 'column' }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
              {/* Жай сызық — рамка шарты жоқ */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: '80%', height: 2, background: 'rgba(255,80,80,0.8)', boxShadow: '0 0 8px rgba(255,80,80,0.8)' }} />
            <div style={{ marginTop: 20, color: '#fff', fontSize: 14, textAlign: 'center', background: 'rgba(0,0,0,0.6)', padding: '8px 20px', borderRadius: 99 }}>
              {lang === 'kz' ? '📷 Штрихкодты камераға бағыттаңыз' : '📷 Наведите камеру на штрихкод'}
            </div>
          </div>
          {scanMsg && (
            <div style={{
              position: 'absolute', bottom: 120, left: 20, right: 20,
              background: scanMsg.startsWith('✅') ? '#0F6E56' : '#D85A30',
              color: '#fff', borderRadius: 10, padding: '12px 16px',
              textAlign: 'center', fontSize: 15, fontWeight: 500
            }}>
              {scanMsg}
            </div>
          )}
          <button onClick={stopScanner} style={{
            position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
            background: '#fff', border: 'none', borderRadius: 99, padding: '12px 32px',
            fontSize: 15, fontWeight: 600, cursor: 'pointer'
          }}>
            {lang === 'kz' ? '✕ Жабу' : '✕ Закрыть'}
          </button>
        </div>
      )}

      {/* Поиск + Сканер */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input placeholder={lang === 'kz' ? '🔍 Товар іздеу...' : '🔍 Поиск товара...'}
          value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <button onClick={startScanner} style={{
          padding: '0 14px', borderRadius: 8, border: '1px solid #e5e7eb',
          background: '#fff', cursor: 'pointer', fontSize: 20, flexShrink: 0
        }}>📷</button>
      </div>

      {/* Категориялар */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 10 }}>
        {availableCats.map(c => (
          <button key={c.key} onClick={() => setSelectedCat(c.key)} style={{
            padding: '5px 10px', borderRadius: 99, border: '1px solid #e5e7eb',
            background: selectedCat === c.key ? '#185FA5' : '#fff',
            color: selectedCat === c.key ? '#fff' : '#6b7280',
            cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0
          }}>{c.icon} {lang === 'kz' ? c.kz : c.ru}</button>
        ))}
      </div>

      {/* Товарлар */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {filtered.map(p => (
          <div key={p.id} onClick={() => addToCart(p)} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            padding: '10px 12px', cursor: 'pointer', userSelect: 'none'
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{p.price.toLocaleString()} ₸/{p.unit || 'шт'}</div>
            <div style={{ fontSize: 11, color: p.quantity <= 5 ? '#D85A30' : '#0F6E56', marginTop: 2 }}>
              {p.quantity} {p.unit || 'шт'}
            </div>
          </div>
        ))}
      </div>

      {/* Корзина */}
      {cart.length > 0 && (
        <div className="card">
          <div className="section-title">{lang === 'kz' ? 'Корзина' : 'Корзина'}</div>
          {cart.map(item => (
            <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.product.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{item.product.price.toLocaleString()} ₸/{item.product.unit || 'шт'}</div>
              </div>
              {item.product.unit === 'кг' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{item.qty} кг</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{item.amount.toLocaleString()} ₸</span>
                  <span onClick={() => removeFromCart(item.product.id)} style={{ color: '#D85A30', cursor: 'pointer', fontSize: 16 }}>✕</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => updateQty(item.product.id, -1)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: 16 }}>−</button>
                  <span style={{ minWidth: 24, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.product.id, 1)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: 16 }}>+</button>
                  <span style={{ fontWeight: 600, fontSize: 13, minWidth: 56, textAlign: 'right' }}>{item.amount.toLocaleString()} ₸</span>
                  <span onClick={() => removeFromCart(item.product.id)} style={{ color: '#D85A30', cursor: 'pointer', fontSize: 16 }}>✕</span>
                </div>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 700, fontSize: 16, borderTop: '2px solid #e5e7eb', marginTop: 4 }}>
            <span>{lang === 'kz' ? 'Жалпы' : 'Итого'}</span>
            <span>{totalAmount.toLocaleString()} ₸</span>
          </div>

          <select value={payType} onChange={e => setPayType(e.target.value as 'cash' | 'kaspi')} style={{ marginBottom: 8 }}>
            <option value="cash">{T.cash}</option>
            <option value="kaspi">Kaspi</option>
          </select>

          {success && <div style={{ background: '#E1F5EE', borderRadius: 6, padding: '8px 12px', color: '#085041', fontSize: 14, textAlign: 'center', marginBottom: 8 }}>{success}</div>}

          <div className="row-2">
            <button className="btn btn-success" onClick={() => handleSale(false)} disabled={loading}>
              {loading ? T.loading : (lang === 'kz' ? '✓ Сату' : '✓ Продать')}
            </button>
            <button className="btn" onClick={() => setShowDebtForm(!showDebtForm)}
              style={{ borderColor: '#D97706', color: '#D97706' }}>
              💳 {lang === 'kz' ? 'Қарызға' : 'В долг'}
            </button>
          </div>

          {showDebtForm && (
            <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 12, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input placeholder={lang === 'kz' ? 'Аты-жөні *' : 'Имя должника *'} value={debtorName} onChange={e => setDebtorName(e.target.value)} />
              <input placeholder={lang === 'kz' ? 'Телефон' : 'Телефон'} value={debtorPhone} onChange={e => setDebtorPhone(e.target.value)} />
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              <button className="btn" onClick={() => handleSale(true)} disabled={loading}
                style={{ background: '#D97706', color: '#fff', borderColor: '#D97706' }}>
                {loading ? T.loading : (lang === 'kz' ? 'Қарызға беру' : 'Выдать в долг')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
