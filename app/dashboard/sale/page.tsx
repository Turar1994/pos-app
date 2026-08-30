'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'
import { useCountUp } from '@/lib/useCountUp'
import { usePullToRefresh } from '@/lib/usePullToRefresh'

type Product = { id: string; name: string; price: number; quantity: number; unit?: string; category?: string; barcode?: string; expiry_date?: string }
type CartItem = { product: Product; qty: number; amount: number }

const CATEGORIES = [
  { key: 'drinks',     kz: 'Сусындар',  ru: 'Напитки',   icon: '🥤', img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=160&h=160&fit=crop&auto=format' },
  { key: 'bread',      kz: 'Нан',       ru: 'Хлеб',      icon: '🍞', img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&h=160&fit=crop&auto=format' },
  { key: 'dairy',      kz: 'Сүт',       ru: 'Молочные',  icon: '🥛', img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=160&h=160&fit=crop&auto=format' },
  { key: 'sweets',     kz: 'Тәттілер', ru: 'Сладости',  icon: '🍫', img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=160&h=160&fit=crop&auto=format' },
  { key: 'meat',       kz: 'Ет',        ru: 'Мясо',      icon: '🥩', img: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=160&h=160&fit=crop&auto=format' },
  { key: 'fruits',     kz: 'Жемістер', ru: 'Фрукты',    icon: '🍎', img: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=160&h=160&fit=crop&auto=format' },
  { key: 'vegetables', kz: 'Көкөністер', ru: 'Овощи',   icon: '🥦', img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=160&h=160&fit=crop&auto=format' },
  { key: 'grocery',    kz: 'Бакалея',   ru: 'Бакалея',  icon: '🍜', img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=160&h=160&fit=crop&auto=format' },
  { key: 'hygiene',    kz: 'Тазалық',  ru: 'Гигиена',   icon: '🧴', img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=160&h=160&fit=crop&auto=format' },
  { key: 'other',      kz: 'Басқа',     ru: 'Другое',    icon: '📦', img: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=160&h=160&fit=crop&auto=format' },
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
  type FlyDot = { id: number; startX: number; startY: number; dx: number; dy: number; active: boolean; icon: string }
  const [flyDots, setFlyDots] = useState<FlyDot[]>([])
  const [cartBounceAnim, setCartBounceAnim] = useState(false)
  const [newCartIds, setNewCartIds] = useState<Set<string>>(new Set())
  const [totalKey, setTotalKey] = useState(0)
  const prevTotalRef = useRef(0)
  const cartSectionRef = useRef<HTMLDivElement>(null)
  const [pressedId, setPressedId] = useState<string | null>(null)
  type Ripple = { id: number; productId: string; x: number; y: number }
  const [ripples, setRipples] = useState<Ripple[]>([])
  const [successFading, setSuccessFading] = useState(false)
  const [salesCount, setSalesCount] = useState<Record<string, number>>({})

  const searchRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<any>(null)
  const productsRef = useRef<Product[]>([])
  const lastScannedRef = useRef<string>('')
  const lastTimeRef = useRef<number>(0)
  const audioCtxRef = useRef<any>(null)
  const hintTimerRef = useRef<any>(null)
  const scanningRef = useRef(false)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const [prodRes, salesRes] = await Promise.all([
      supabase.from('products').select('*').eq('store_id', store.id).gt('quantity', 0).order('name'),
      supabase.from('sales').select('product_id').eq('store_id', store.id)
    ])
    const counts: Record<string, number> = {}
    salesRes.data?.forEach(s => { if (s.product_id) counts[s.product_id] = (counts[s.product_id] || 0) + 1 })
    setSalesCount(counts)
    setProducts(prodRes.data || [])
  }, [store.id])

  const ptr = usePullToRefresh(loadData)

  useEffect(() => { loadData() }, [store.id])
  useEffect(() => { productsRef.current = products }, [products])
  // Auto-focus search on mount
  useEffect(() => { setTimeout(() => searchRef.current?.focus(), 120) }, [])

  async function loadProducts() { await loadData() }

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

    hintTimerRef.current = setTimeout(() => setHint(1), 8000)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        }
      })

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

      // Native BarcodeDetector (Chrome Android) — аппараттық жеделдету, лазер жылдамдығы
      if ('BarcodeDetector' in window) {
        let detector: any
        try {
          detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e', 'code_39', 'code_93', 'qr_code', 'pdf417', 'data_matrix', 'aztec', 'itf']
          })
        } catch {
          detector = new (window as any).BarcodeDetector()
        }
        const scan = async () => {
          if (!scanningRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current!)
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue
              const now = Date.now()
              if (code === lastScannedRef.current && now - lastTimeRef.current < 1500) {
                requestAnimationFrame(scan); return
              }
              lastScannedRef.current = code
              lastTimeRef.current = now
              handleBarcode(code)
              return
            }
          } catch {}
          requestAnimationFrame(scan)
        }
        requestAnimationFrame(scan)
      } else {
        // ZXing fallback
        const { BrowserMultiFormatReader } = await import('@zxing/library')
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader
        reader.decodeFromStream(stream, videoRef.current!, (result) => {
          if (!scanningRef.current || !result) return
          const code = result.getText()
          const now = Date.now()
          if (code === lastScannedRef.current && now - lastTimeRef.current < 1500) return
          lastScannedRef.current = code
          lastTimeRef.current = now
          handleBarcode(code)
        })
      }

    } catch (e) {
      setScanMsg(lang === 'kz' ? 'Камераға рұқсат жоқ' : 'Нет доступа к камере')
      setScanning(false)
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

  function isExpired(p: Product) {
    return !!p.expiry_date && p.expiry_date < new Date().toISOString().split('T')[0]
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
    if (isExpired(product)) {
      setScanMsg(lang === 'kz' ? `❌ Мерзімі өтті: ${product.name}` : `❌ Просрочено: ${product.name}`)
      setScanSuccess(false)
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      playBeep(false)
      setTimeout(() => setScanMsg(''), 2500)
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

  function addToCart(product: Product, e?: React.MouseEvent) {
    if (isExpired(product)) return
    if (product.unit === 'кг') { setKgModal(product); setKgValue(''); return }

    // Haptic
    if (navigator.vibrate) navigator.vibrate(28)

    // Ripple
    if (e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const r: Ripple = { id: Date.now(), productId: product.id, x: e.clientX - rect.left, y: e.clientY - rect.top }
      setRipples(prev => [...prev, r])
      setTimeout(() => setRipples(prev => prev.filter(ri => ri.id !== r.id)), 400)
    }

    const ex = cart.find(c => c.product.id === product.id)
    if (ex) {
      if (ex.qty >= product.quantity) return
      setCart(cart.map(c => c.product.id === product.id
        ? { ...c, qty: c.qty + 1, amount: (c.qty + 1) * product.price } : c))
    } else {
      setCart(prev => [...prev, { product, qty: 1, amount: product.price }])
      setNewCartIds(prev => new Set(prev).add(product.id))
      setTimeout(() => setNewCartIds(prev => { const s = new Set(prev); s.delete(product.id); return s }), 500)
    }

    // Arc fly animation
    if (e) {
      const catIcon = product.category
        ? ({ drinks:'🥤',bread:'🍞',dairy:'🥛',sweets:'🍫',meat:'🥩',fruits:'🍎',vegetables:'🥦',grocery:'🍜',hygiene:'🧴',other:'📦' } as any)[product.category] ?? '🛒'
        : '🛒'
      const cardRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const startX = cardRect.left + cardRect.width / 2
      const startY = cardRect.top + cardRect.height / 2

      let endX = window.innerWidth / 2
      let endY = window.innerHeight - 90
      if (cartSectionRef.current) {
        const cartRect = cartSectionRef.current.getBoundingClientRect()
        endX = cartRect.left + 60
        endY = cartRect.top + 20
      }

      const id = Date.now()
      const dot: FlyDot = { id, startX, startY, dx: endX - startX, dy: endY - startY, active: false, icon: catIcon }
      setFlyDots(prev => [...prev, dot])

      requestAnimationFrame(() => requestAnimationFrame(() => {
        setFlyDots(prev => prev.map(d => d.id === id ? { ...d, active: true } : d))
      }))

      setTimeout(() => {
        setFlyDots(prev => prev.filter(d => d.id !== id))
        setCartBounceAnim(true)
        setTimeout(() => setCartBounceAnim(false), 320)
      }, 360)
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
  const displayTotal = useCountUp(totalAmount, 280)

  useEffect(() => {
    if (prevTotalRef.current !== totalAmount) {
      setTotalKey(k => k + 1)
      prevTotalRef.current = totalAmount
    }
  }, [totalAmount])

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
    if (navigator.vibrate) navigator.vibrate([40, 20, 40])
    setCart([]); setSearch(''); setDebtorName(''); setDebtorPhone(''); setDueDate(''); setShowDebtForm(false); setSelectedCat(null)
    const msg = isDebt ? (lang === 'kz' ? 'Қарыз тіркелді' : 'Долг записан') : (lang === 'kz' ? 'Сатылды!' : 'Продано!')
    setSuccessFading(false)
    setSuccess(msg)
    setTimeout(() => setSuccessFading(true), 800)
    setTimeout(() => { setSuccess(''); setSuccessFading(false); searchRef.current?.focus() }, 1050)
    setLoading(false); triggerRefresh(); loadProducts()
  }

  const searchNorm = search.trim().replace(/\s+/g, ' ').toLowerCase()
  const filtered = products
    .filter(p => p.name.toLowerCase().includes(searchNorm) && (selectedCat === null || p.category === selectedCat))
    .sort((a, b) => (salesCount[b.id] || 0) - (salesCount[a.id] || 0))
  const availableCats = CATEGORIES.filter(c => products.some(p => p.category === c.key))
  const showCategoryGrid = !search && selectedCat === null
  const hintText = hint >= 1
    ? (lang === 'kz' ? '💡 Жарықты қосыңыз немесе жақынырақ апарыңыз' : '💡 Включите фонарик или поднесите ближе')
    : (lang === 'kz' ? '📷 Штрихкодты рамкаға бағыттаңыз' : '📷 Наведите штрихкод на рамку')

  return (
    <div>
      {/* Floating success card */}
      {success && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div className={successFading ? 'anim-success-card-out' : 'anim-success-card-in'} style={{
            background: 'var(--card-bg)',
            borderRadius: 28,
            padding: '32px 52px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            boxShadow: '0 24px 64px rgba(15,23,42,0.16), 0 6px 20px rgba(15,23,42,0.08)',
          }}>
            <span className="anim-checkmark" style={{ fontSize: 56, lineHeight: 1 }}>✅</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{success}</span>
          </div>
        </div>
      )}

      {/* Arc fly animation — outer moves X, inner moves Y (arc path) */}
      {flyDots.map(dot => (
        <div key={dot.id} style={{
          position: 'fixed',
          left: dot.startX - 18,
          top: dot.startY - 18,
          width: 36,
          height: 36,
          zIndex: 9999,
          pointerEvents: 'none',
          transition: dot.active ? 'transform 330ms cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
          transform: dot.active ? `translateX(${dot.dx}px)` : 'translateX(0)',
        }}>
          <div style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            borderRadius: '50%',
            background: 'var(--primary)',
            boxShadow: '0 4px 14px rgba(22,163,74,0.40)',
            transition: dot.active ? 'transform 330ms cubic-bezier(0.55, 0.055, 0.675, 0.19), opacity 330ms ease-in' : 'none',
            transform: dot.active ? `translateY(${dot.dy}px) scale(0.22)` : 'translateY(0) scale(1)',
            opacity: dot.active ? 0 : 1,
          }}>
            {dot.icon}
          </div>
        </div>
      ))}

      {/* KG Bottom Sheet */}
      {kgModal && (
        <div className="sheet-overlay" onClick={() => setKgModal(null)}>
          <div className="sheet-body" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{kgModal.name}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {lang === 'kz' ? `Қалдық: ${kgModal.quantity} кг` : `Остаток: ${kgModal.quantity} кг`}
            </div>
            <input type="number" step="0.001" placeholder="0.000" value={kgValue}
              onChange={e => setKgValue(e.target.value)} autoFocus
              style={{ marginBottom: 10, fontSize: 28, textAlign: 'center', fontWeight: 700, border: '2px solid var(--accent)', borderRadius: 12 }} />
            {kgValue && parseFloat(kgValue) > 0 && (
              <div style={{ textAlign: 'center', fontSize: 17, marginBottom: 16, color: 'var(--accent)', fontWeight: 700 }}>
                = {(parseFloat(kgValue) * kgModal.price).toLocaleString()} ₸
              </div>
            )}
            <div className="row-2">
              <button className="btn btn-primary pressable" onClick={addKgToCart}>{lang === 'kz' ? 'Қосу' : 'Добавить'}</button>
              <button className="btn pressable" onClick={() => setKgModal(null)}>{lang === 'kz' ? 'Болдырмау' : 'Отмена'}</button>
            </div>
          </div>
        </div>
      )}

      {scanning && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 999, display: 'flex', flexDirection: 'column' }}>
          <style>{`
            @keyframes laserSweep {
              0%   { top: 6px;  opacity: 1; }
              48%  { top: calc(100% - 8px); opacity: 1; }
              50%  { top: calc(100% - 8px); opacity: 0; }
              52%  { top: 6px;  opacity: 0; }
              54%  { opacity: 1; }
              100% { top: 6px;  opacity: 1; }
            }
            @keyframes cornerPulse {
              0%,100% { opacity:1; } 50% { opacity:0.5; }
            }
          `}</style>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />

          {/* Dark overlay с прозрачным окном */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {/* Top dark */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 'calc(50% + 70px)', background: 'rgba(0,0,0,0.6)' }} />
            {/* Bottom dark */}
            <div style={{ position: 'absolute', top: 'calc(50% + 70px)', left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)' }} />
            {/* Left dark */}
            <div style={{ position: 'absolute', top: 'calc(50% - 70px)', left: 0, width: 'calc(50% - 140px)', height: 140, background: 'rgba(0,0,0,0.6)' }} />
            {/* Right dark */}
            <div style={{ position: 'absolute', top: 'calc(50% - 70px)', right: 0, width: 'calc(50% - 140px)', height: 140, background: 'rgba(0,0,0,0.6)' }} />

            {/* Scanner window */}
            <div style={{
              position: 'absolute',
              left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 280, height: 140,
              overflow: 'hidden',
            }}>
              {/* Laser line */}
              {!scanSuccess && (
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: 2,
                  background: 'linear-gradient(90deg, transparent, #FF3B30 20%, #FF3B30 80%, transparent)',
                  boxShadow: '0 0 8px 2px rgba(255,59,48,0.8)',
                  animation: 'laserSweep 1.6s ease-in-out infinite',
                }} />
              )}
              {scanSuccess && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>✅</div>
              )}
            </div>

            {/* Corner brackets */}
            {(() => {
              const color = scanSuccess ? '#22C55E' : '#fff'
              const corners = [
                { top: 'calc(50% - 70px)', left: 'calc(50% - 140px)', borderTop: `3px solid ${color}`, borderLeft: `3px solid ${color}`, borderRadius: '6px 0 0 0' },
                { top: 'calc(50% - 70px)', right: 'calc(50% - 140px)', borderTop: `3px solid ${color}`, borderRight: `3px solid ${color}`, borderRadius: '0 6px 0 0' },
                { bottom: 'calc(50% - 70px)', left: 'calc(50% - 140px)', borderBottom: `3px solid ${color}`, borderLeft: `3px solid ${color}`, borderRadius: '0 0 0 6px' },
                { bottom: 'calc(50% - 70px)', right: 'calc(50% - 140px)', borderBottom: `3px solid ${color}`, borderRight: `3px solid ${color}`, borderRadius: '0 0 6px 0' },
              ]
              return corners.map((s, i) => (
                <div key={i} style={{ position: 'absolute', width: 28, height: 28, ...s }} />
              ))
            })()}

            {/* Hint text */}
            <div style={{
              position: 'absolute', top: 'calc(50% + 90px)', left: '50%', transform: 'translateX(-50%)',
              color: '#fff', fontSize: 13, whiteSpace: 'nowrap',
              background: 'rgba(0,0,0,0.5)', padding: '6px 16px', borderRadius: 99,
            }}>
              {scanMsg || (lang === 'kz' ? 'Штрихкодты рамкаға бағыттаңыз' : 'Наведите штрихкод на рамку')}
            </div>
          </div>

          {/* Result toast */}
          {scanMsg && !scanSuccess && (
            <div style={{
              position: 'absolute', bottom: 130, left: 20, right: 20,
              background: '#D85A30', color: '#fff', borderRadius: 12,
              padding: '14px', textAlign: 'center', fontSize: 15, fontWeight: 600,
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

      {(ptr.progress > 0 || ptr.refreshing) && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 48, opacity: ptr.refreshing ? 1 : ptr.progress }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--primary-light)', borderTopColor: 'var(--primary)', animation: ptr.refreshing ? 'ptrSpin 0.7s linear infinite' : 'none', transform: ptr.refreshing ? 'none' : `rotate(${ptr.progress * 270}deg)` }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          ref={searchRef}
          placeholder={lang === 'kz' ? '🔍 Товар іздеу...' : '🔍 Поиск товара...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button onClick={startScanner} style={{
          padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--card-bg)', cursor: 'pointer', fontSize: 22, flexShrink: 0
        }}>📷</button>
      </div>

      {showCategoryGrid ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="stagger-list">
            {availableCats.map(c => (
              <button key={c.key}
                onClick={() => setSelectedCat(c.key)}
                onPointerDown={() => setPressedId('cat-' + c.key)}
                onPointerUp={() => setPressedId(null)}
                onPointerLeave={() => setPressedId(null)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '24px 12px 20px', border: '1.5px solid var(--border)', borderRadius: 20,
                  background: 'var(--card-bg)', gap: 10, cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  boxShadow: pressedId === 'cat-' + c.key
                    ? '0 1px 3px rgba(0,0,0,0.10)'
                    : 'var(--shadow-sm)',
                  transform: pressedId === 'cat-' + c.key
                    ? 'perspective(400px) rotateX(10deg) scale(0.95) translateY(3px)'
                    : 'perspective(400px) rotateX(0deg) scale(1) translateY(0)',
                  transition: 'transform 140ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 140ms ease-out',
                  transformStyle: 'preserve-3d',
                }}>
                <img
                  src={c.img}
                  alt={c.kz}
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 14, display: 'block' }}
                  onError={e => { const t = e.target as HTMLImageElement; t.style.display = 'none'; t.nextElementSibling && ((t.nextElementSibling as HTMLElement).style.display = 'block') }}
                />
                <span style={{ fontSize: 52, lineHeight: 1, display: 'none' }}>{c.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', textAlign: 'center', lineHeight: 1.3, display: 'block' }}>
                  {lang === 'kz' ? c.kz : c.ru}
                </span>
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, display: 'block' }}>
                  {products.filter(p => p.category === c.key).length} {lang === 'kz' ? 'дана' : 'шт'}
                </span>
              </button>
            ))}
          </div>
          {/* Big scanner button */}
          <button onClick={startScanner} style={{
            width: '100%', padding: '17px', borderRadius: 18, border: 'none',
            background: 'var(--primary)', color: '#fff',
            fontSize: 17, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 4px 18px rgba(22,163,74,0.32)',
            WebkitTapHighlightColor: 'transparent',
            marginBottom: 12,
            transition: 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <span style={{ fontSize: 22 }}>⬛</span>
            {lang === 'kz' ? 'Сканерлеу' : 'Сканировать'}
          </button>
        </>
      ) : (
        <>
          {selectedCat !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <button onClick={() => setSelectedCat(null)} style={{
                padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)',
                background: 'var(--card-bg)', cursor: 'pointer', fontSize: 13, color: 'var(--muted)'
              }}>← {lang === 'kz' ? 'Артқа' : 'Назад'}</button>
              {(() => { const cat = CATEGORIES.find(c => c.key === selectedCat); return cat ? (
                <img src={cat.img} alt={cat.kz} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 8 }} />
              ) : null })()}
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                {lang === 'kz' ? CATEGORIES.find(c => c.key === selectedCat)?.kz : CATEGORIES.find(c => c.key === selectedCat)?.ru}
              </span>
            </div>
          )}
          <div key={search + '|' + String(selectedCat)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }} className="filter-in">
            {filtered.map(p => {
              const expired = isExpired(p)
              return (
              <div key={p.id}
                onClick={(e) => addToCart(p, e)}
                onPointerDown={() => !expired && setPressedId('prod-' + p.id)}
                onPointerUp={() => setPressedId(null)}
                onPointerLeave={() => setPressedId(null)}
                style={{
                  position: 'relative', overflow: 'hidden',
                  background: expired ? 'var(--surface)' : 'var(--card-bg)',
                  border: `1px solid ${expired ? 'var(--danger)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '12px', userSelect: 'none',
                  cursor: expired ? 'not-allowed' : 'pointer',
                  opacity: expired ? 0.7 : 1,
                  WebkitTapHighlightColor: 'transparent',
                  boxShadow: pressedId === 'prod-' + p.id
                    ? '0 1px 2px rgba(0,0,0,0.08)'
                    : '0 2px 8px rgba(0,0,0,0.06)',
                  transform: pressedId === 'prod-' + p.id
                    ? 'perspective(400px) rotateX(10deg) scale(0.95) translateY(3px)'
                    : 'perspective(400px) rotateX(0deg) scale(1) translateY(0)',
                  transition: 'transform 140ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 140ms ease-out',
                  transformStyle: 'preserve-3d',
                }}>
                {!expired && ripples.filter(r => r.productId === p.id).map(r => (
                  <span key={r.id} className="ripple-wave" style={{ left: r.x, top: r.y }} />
                ))}
                {expired && (
                  <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 10, background: 'var(--danger)', color: '#fff', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>
                    {lang === 'kz' ? 'ӨТТІ' : 'ПРОСРОЧЕНО'}
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5, color: expired ? 'var(--danger)' : 'var(--text)' }}>{p.name}</div>
                <div style={{ fontSize: 13, color: expired ? 'var(--muted)' : 'var(--accent)', fontWeight: 700 }}>{p.price.toLocaleString()} ₸</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>/{p.unit || 'шт'}</div>
                <div style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center' }}>
                  {expired
                    ? <span style={{ color: 'var(--danger)' }}>❌ {p.expiry_date}</span>
                    : <>
                        {p.quantity <= 5 && <span className="low-stock-dot" style={{ background: p.quantity <= 2 ? 'var(--danger)' : 'var(--warning)' }} />}
                        <span style={{ color: p.quantity <= 2 ? 'var(--danger)' : p.quantity <= 5 ? 'var(--warning)' : 'var(--muted)' }}>
                          {lang === 'kz' ? 'Қалдық:' : 'Остаток:'} {p.quantity} {p.unit || 'шт'}
                        </span>
                      </>
                  }
                </div>
              </div>
            )})}
            {filtered.length === 0 && (
              <div className="anim-fade-in" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '36px 24px', color: 'var(--muted)', fontSize: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
                {lang === 'kz' ? 'Товар табылмады' : 'Товары не найдены'}
              </div>
            )}
          </div>
        </>
      )}

      {cart.length > 0 && (
        <div className="card" ref={cartSectionRef}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span
              className={cartBounceAnim ? 'cart-bounce' : ''}
              style={{ fontSize: 22, display: 'inline-block' }}
            >🛒</span>
            <span className="section-title" style={{ marginBottom: 0 }}>
              {lang === 'kz' ? 'Корзина' : 'Корзина'} · {cart.reduce((s, c) => s + c.qty, 0)} {lang === 'kz' ? 'дана' : 'шт'}
            </span>
          </div>
          {cart.map(item => (
            <div key={item.product.id}
              className={newCartIds.has(item.product.id) ? 'anim-slide-up' : ''}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', gap: 8 }}>
              {/* Left: name + unit price */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{item.product.price.toLocaleString()} ₸/{item.product.unit || 'шт'}</div>
              </div>
              {/* Right: controls */}
              {item.product.unit === 'кг' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>{item.amount.toLocaleString()} ₸</span>
                  <button onClick={() => removeFromCart(item.product.id)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'var(--danger-light)', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => updateQty(item.product.id, -1)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'var(--surface)', cursor: 'pointer', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>−</button>
                  <span style={{ minWidth: 28, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.product.id, 1)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'var(--primary-light)', color: 'var(--primary-dark)', cursor: 'pointer', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>+</button>
                  <span style={{ fontWeight: 700, fontSize: 14, minWidth: 52, textAlign: 'right', color: 'var(--primary)' }}>{item.amount.toLocaleString()} ₸</span>
                  <button onClick={() => removeFromCart(item.product.id)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'var(--danger-light)', color: 'var(--danger)', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>✕</button>
                </div>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 700, fontSize: 16, borderTop: '2px solid #e5e7eb', marginTop: 4 }}>
            <span>{lang === 'kz' ? 'Жалпы' : 'Итого'}</span>
            <span style={{ color: 'var(--accent)', transition: 'color 150ms' }}>{displayTotal.toLocaleString()} ₸</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {(['cash', 'kaspi'] as const).map(pt => (
              <button key={pt} onClick={() => setPayType(pt)} style={{
                padding: '13px 8px', borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${payType === pt ? 'var(--primary)' : 'var(--border)'}`,
                background: payType === pt ? 'var(--primary-light)' : 'var(--card-bg)',
                color: payType === pt ? 'var(--primary-dark)' : 'var(--muted)',
                fontWeight: payType === pt ? 700 : 500, fontSize: 15,
                transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent',
              }}>
                {pt === 'cash' ? `💵 ${T.cash}` : '📱 Kaspi'}
              </button>
            ))}
          </div>
          <div className="row-2">
            <button className="btn btn-success pressable" onClick={() => handleSale(false)} disabled={loading}>
              {loading ? T.loading : (lang === 'kz' ? '✓ Сату' : '✓ Продать')}
            </button>
            <button className="btn pressable" onClick={() => setShowDebtForm(!showDebtForm)} style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}>
              💳 {lang === 'kz' ? 'Қарызға' : 'В долг'}
            </button>
          </div>
          {showDebtForm && (
            <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 12, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input placeholder={lang === 'kz' ? 'Аты-жөні *' : 'Имя должника *'} value={debtorName} onChange={e => setDebtorName(e.target.value)} />
              <input placeholder={lang === 'kz' ? 'Телефон' : 'Телефон'} value={debtorPhone} onChange={e => setDebtorPhone(e.target.value)} />
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              <button className="btn" onClick={() => handleSale(true)} disabled={loading}
                style={{ background: 'var(--warning)', color: '#fff', borderColor: 'var(--warning)' }}>
                {loading ? T.loading : (lang === 'kz' ? 'Қарызға беру' : 'Выдать в долг')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}