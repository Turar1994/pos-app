'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Product = { id: string; name: string; price: number; quantity: number; unit?: string; category?: string; barcode?: string }
type CartItem = { product: Product; qty: number; amount: number }

const CATEGORIES = [
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
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [payType, setPayType] = useState<'cash' | 'kaspi'>('cash')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [kgModal, setKgModal] = useState<Product | null>(null)
  const [kgValue, setKgValue] = useState('')
  const [showDebtForm, setShowDebtForm] = useState(false)
  const [debtorName, setDebtorName] = useState('')
  const [debtorPhone, setDebtorPhone] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')
  const [scanSuccess, setScanSuccess] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [hint, setHint] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<any>(null)
  const productsRef = useRef<Product[]>([])
  const lastScannedRef = useRef<string>('')
  const lastTimeRef = useRef<number>(0)
  const audioCtxRef = useRef<any>(null)
  const hintTimerRef = useRef<any>(null)
  const scanningRef = useRef(false)

  useEffect(() => { loadProducts() }, [store.id])
  useEffect(() => { productsRef.current = products }, [products])

  async function loadProducts() {
    const supabase = createClient()
    const { data } = await supabase.from('products').select('*')
      .eq('store_id', store.id).gt('quantity', 0).order('name')
    setProducts(data || [])
  }

  function unlockAudio() {
    try {
      if (audioCtxRef.current) return
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return
      audioCtxRef.current = new AC()
      const buf = audioCtxRef.current.createBuffer(1, 1, 22050)
      const src = audioCtxRef.current.createBufferSource()
      src.buffer = buf
      src.connect(audioCtxRef.current.destination)
      src.start(0)
    } catch (e) {}
  }

  function playBeep(ok = true) {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      const ctx = audioCtxRef.current || (AC ? new AC() : null)
      if (!ctx) return
      audioCtxRef.current = ctx
      if (ctx.state === 'suspended') ctx.resume()
      if (ok) {
        [0, 0.14].forEach((d, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain()
          o.connect(g); g.connect(ctx.destination)
          o.frequency.value = i === 0 ? 1200 : 1600
          o.type = 'sine'
          g.gain.setValueAtTime(0.5, ctx.currentTime + d)
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.13)
          o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.13)
        })
      } else {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.frequency.value = 300; o.type = 'sine'
        g.gain.setValueAtTime(0.5, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
        o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.35)
      }
    } catch (e) {}
  }

  async function startScanner() {
    unlockAudio()
    setScanning(true)
    scanningRef.current = true
    setScanMsg('')
    setScanSuccess(false)
    setHint(0)
    lastScannedRef.current = ''

    hintTimerRef.current = setTimeout(() => setHint(1), 6000)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      })

      // Continuous autofocus
      const track = stream.getVideoTracks()[0]
      try {
        await (track as any).applyConstraints({
          advanced: [{ focusMode: 'continuous' }]
        })
      } catch (e) {}

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // ZXing reader
      const { BrowserMultiFormatReader, NotFoundException } = await import('@zxing/library')
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      reader.decodeFromStream(stream, videoRef.current!, (result, err) => {
        if (!scanningRef.current) return
        if (result) {
          const code = result.getText()
          const now = Date.now()
          if (code === lastScannedRef.current && now - lastTimeRef.current < 1200) return
          lastScannedRef.current = code
          lastTimeRef.current = now
          handleBarcode(code)
        }
      })

    } catch (e) {
      setScanMsg(lang === 'kz' ? 'Камераға рұқсат жоқ' : 'Нет доступа к камере')
    }
  }

  function stopScanner() {
    scanningRef.current = false
    if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null }
    if (readerRef.current) {
      try { readerRef.current.reset() } catch (e) {}
      readerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
    setScanMsg('')
    setScanSuccess(false)
    setTorchOn(false)
    setHint(0)
    lastScannedRef.current = ''
  }

  async function toggleTorch() {
    try {
      const track = streamRef.current?.getVideoTracks()[0]
      if (!track) return
      const newVal = !torchOn
      await (track as any).applyConstraints({ advanced: [{ torch: newVal }] })
      setTorchOn(newVal)
    } catch (e) {}
  }

  function handleBarcode(code: string) {
    const product = productsRef.current.find(p => p.barcode === code)
    if (!product) {
      setScanMsg(lang === 'kz' ? `Табылмады: ${code}` : `Не найден: ${code}`)
      setScanSuccess(false)
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      playBeep(false)
      setTimeout(() => setScanMsg(''), 2000)
      return
    }
    if (product.unit === 'кг') {
      stopScanner()
      setKgModal(product); setKgValue('')
      return
    }
    setCart(prev => {
      const ex = prev.find(c => c.product.id === product.id)
      if (ex) {
        if (ex.qty >= product.quantity) return prev
        return prev.map(c => c.product.id === product.id
          ? { ...c, qty: c.qty + 1, amount: (c.qty + 1) * product.price } : c)
      }
      return [...prev, { product, qty: 1, amount: product.price }]
    })
    setScanMsg(`✅ ${product.name}`)
    setScanSuccess(true)
    if (navigator.vibrate) navigator.vibrate(60)
    playBeep(true)
    setTimeout(() => { setScanMsg(''); setScanSuccess(false) }, 1200)
  }

  function addToCart(product: Product) {
    if (product.unit === 'кг') { setKgModal(product); setKgValue(''); return }
    const ex = cart.find(c => c.product.id === product.id)
    if (ex) {
      if (ex.qty >= product.quantity) return
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
    const ex = cart.find(c => c.product.id === kgModal.id)
    if (ex) {
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
      const nq = Math.max(1, c.qty + delta)
      if (nq > c.product.quantity) return c
      return { ...c, qty: nq, amount: nq * c.product.price }
    }))
  }

  const totalAmount = cart.reduce((s, c) => s + c.amount, 0)

  async function handleSale(isDebt = false) {
    if (cart.length === 0 || (isDebt && !debtorName)) return
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

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (selectedCat === null || p.category === selectedCat)
  )
  const availableCats = CATEGORIES.filter(c => products.some(p => p.category === c.key))
  const showCategoryGrid = !search && selectedCat === null
  const hintText = hint >= 1
    ? (lang === 'kz' ? '💡 Жарықты қосыңыз немесе жақынырақ апарыңыз' : '💡 Включите фонарик или поднесите ближе')
    : (lang === 'kz' ? '📷 Штрихкодты рамкаға бағыттаңыз' : '📷 Наведите штрихкод на рамку')

  return (
    <div>
      {kgModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, width: '100%', maxWidth: 320 }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{kgModal.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              {lang === 'kz' ? `Қалдық: ${kgModal.quantity} кг` : `Остаток: ${kgModal.quantity} кг`}
            </div>
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

      {scanning && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 999, display: 'flex', flexDirection: 'column' }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />

          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* Рамка */}
            <div style={{
              width: 280, height: 140,
              border: `3px solid ${scanSuccess ? '#0F6E56' : 'rgba(255,80,80,0.9)'}`,
              borderRadius: 14,
              boxShadow: `0 0 0 9999px rgba(0,0,0,0.5), 0 0 20px ${scanSuccess ? 'rgba(15,110,86,0.5)' : 'rgba(255,80,80,0.3)'}`,
              position: 'relative',
              transition: 'all 0.2s',
            }}>
              {[
                { top: -3, left: -3, borderTop: '4px solid', borderLeft: '4px solid', borderRadius: '4px 0 0 0' },
                { top: -3, right: -3, borderTop: '4px solid', borderRight: '4px solid', borderRadius: '0 4px 0 0' },
                { bottom: -3, left: -3, borderBottom: '4px solid', borderLeft: '4px solid', borderRadius: '0 0 0 4px' },
                { bottom: -3, right: -3, borderBottom: '4px solid', borderRight: '4px solid', borderRadius: '0 0 4px 0' },
              ].map((s, i) => (
                <div key={i} style={{
                  position: 'absolute', width: 22, height: 22,
                  borderColor: scanSuccess ? '#0F6E56' : '#fff', ...s
                }} />
              ))}
              {!scanSuccess && (
                <div style={{
                  position: 'absolute', top: '50%', left: 6, right: 6, height: 2,
                  background: 'rgba(255,80,80,0.75)',
                  boxShadow: '0 0 6px rgba(255,80,80,0.6)',
                }} />
              )}
            </div>
            <div style={{
              marginTop: 16, color: '#fff', fontSize: 13,
              background: 'rgba(0,0,0,0.65)', padding: '8px 18px',
              borderRadius: 99, maxWidth: 300, textAlign: 'center'
            }}>
              {scanMsg || hintText}
            </div>
          </div>

          {scanMsg && (
            <div style={{
              position: 'absolute', bottom: 130, left: 20, right: 20,
              background: scanSuccess ? '#0F6E56' : '#D85A30',
              color: '#fff', borderRadius: 12, padding: '14px',
              textAlign: 'center', fontSize: 16, fontWeight: 600,
            }}>{scanMsg}</div>
          )}

          <div style={{ position: 'absolute', bottom: 44, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 16 }}>
            <button onClick={toggleTorch} style={{
              background: torchOn ? '#F59E0B' : 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.3)', borderRadius: 99,
              padding: '12px 24px', fontSize: 20, cursor: 'pointer', color: '#fff'
            }}>{torchOn ? '🔦' : '💡'}</button>
            <button onClick={stopScanner} style={{
              background: '#fff', border: 'none', borderRadius: 99,
              padding: '12px 40px', fontSize: 15, fontWeight: 600, cursor: 'pointer'
            }}>{lang === 'kz' ? '✕ Жабу' : '✕ Закрыть'}</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder={lang === 'kz' ? '🔍 Товар іздеу...' : '🔍 Поиск товара...'}
          value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <button onClick={startScanner} style={{
          padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)',
          background: '#fff', cursor: 'pointer', fontSize: 22, flexShrink: 0
        }}>📷</button>
      </div>

      {showCategoryGrid ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
          {availableCats.map(c => (
            <button key={c.key} onClick={() => setSelectedCat(c.key)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '18px 8px', border: '2px solid var(--border)', borderRadius: 16,
              background: '#fff', cursor: 'pointer', gap: 8,
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)', transition: 'all 0.15s'
            }}>
              <span style={{ fontSize: 40 }}>{c.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'center', lineHeight: 1.3 }}>
                {lang === 'kz' ? c.kz : c.ru}
              </span>
              <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>
                {products.filter(p => p.category === c.key).length} {lang === 'kz' ? 'дана' : 'шт'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {selectedCat !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <button onClick={() => setSelectedCat(null)} style={{
                padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)',
                background: '#fff', cursor: 'pointer', fontSize: 13, color: 'var(--muted)'
              }}>← {lang === 'kz' ? 'Артқа' : 'Назад'}</button>
              <span style={{ fontSize: 20 }}>{CATEGORIES.find(c => c.key === selectedCat)?.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
                {lang === 'kz' ? CATEGORIES.find(c => c.key === selectedCat)?.kz : CATEGORIES.find(c => c.key === selectedCat)?.ru}
              </span>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {filtered.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} style={{
                background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
                padding: '12px', cursor: 'pointer', userSelect: 'none',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>{p.price.toLocaleString()} ₸</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>/{p.unit || 'шт'}</div>
                <div style={{ fontSize: 11, color: p.quantity <= 5 ? '#D85A30' : 'var(--muted)', marginTop: 4 }}>
                  {lang === 'kz' ? 'Қалдық:' : 'Остаток:'} {p.quantity} {p.unit || 'шт'}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 14 }}>
                {lang === 'kz' ? 'Товар табылмады' : 'Товары не найдены'}
              </div>
            )}
          </div>
        </>
      )}

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
            <button className="btn" onClick={() => setShowDebtForm(!showDebtForm)} style={{ borderColor: '#D97706', color: '#D97706' }}>
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