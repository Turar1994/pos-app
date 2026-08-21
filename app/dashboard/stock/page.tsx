'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'
import { usePullToRefresh } from '@/lib/usePullToRefresh'

type Product = { id: string; name: string; price: number; cost_price?: number; quantity: number; expiry_date?: string; category?: string; unit?: string; barcode?: string }

const CATEGORIES = [
  { key: 'drinks',     kz: 'Сусындар',    ru: 'Напитки',   icon: '🥤', img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=160&h=160&fit=crop&auto=format' },
  { key: 'bread',      kz: 'Нан өнімдері', ru: 'Хлеб',     icon: '🍞', img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&h=160&fit=crop&auto=format' },
  { key: 'dairy',      kz: 'Сүт өнімдері', ru: 'Молочные', icon: '🥛', img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=160&h=160&fit=crop&auto=format' },
  { key: 'sweets',     kz: 'Тәттілер',    ru: 'Сладости',  icon: '🍫', img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=160&h=160&fit=crop&auto=format' },
  { key: 'meat',       kz: 'Ет өнімдері', ru: 'Мясо',      icon: '🥩', img: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=160&h=160&fit=crop&auto=format' },
  { key: 'fruits',     kz: 'Жемістер',    ru: 'Фрукты',    icon: '🍎', img: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=160&h=160&fit=crop&auto=format' },
  { key: 'vegetables', kz: 'Көкөністер',  ru: 'Овощи',     icon: '🥦', img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=160&h=160&fit=crop&auto=format' },
  { key: 'grocery',    kz: 'Бакалея',     ru: 'Бакалея',   icon: '🍜', img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=160&h=160&fit=crop&auto=format' },
  { key: 'hygiene',    kz: 'Тазалық',     ru: 'Гигиена',   icon: '🧴', img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=160&h=160&fit=crop&auto=format' },
  { key: 'other',      kz: 'Басқа',       ru: 'Другое',    icon: '📦', img: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=160&h=160&fit=crop&auto=format' },
]

// Keyword → Unsplash photo mapping for individual products
const PRODUCT_KEYWORD_PHOTOS: [string, string][] = [
  // Жемістер
  ['алма',      'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=80&h=80&fit=crop&auto=format'],
  ['банан',     'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=80&h=80&fit=crop&auto=format'],
  ['апельсин',  'https://images.unsplash.com/photo-1587393855524-087f83d95bc9?w=80&h=80&fit=crop&auto=format'],
  ['лимон',     'https://images.unsplash.com/photo-1582348871739-a68a25bc5f5d?w=80&h=80&fit=crop&auto=format'],
  ['мандарин',  'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?w=80&h=80&fit=crop&auto=format'],
  ['жүзім',     'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=80&h=80&fit=crop&auto=format'],
  ['алмұрт',    'https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?w=80&h=80&fit=crop&auto=format'],
  ['шабдалы',   'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=80&h=80&fit=crop&auto=format'],
  ['қарбыз',    'https://images.unsplash.com/photo-1563114773-84221bd62daa?w=80&h=80&fit=crop&auto=format'],
  ['клубника',  'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=80&h=80&fit=crop&auto=format'],
  // Көкөністер
  ['картоп',    'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=80&h=80&fit=crop&auto=format'],
  ['пияз',      'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=80&h=80&fit=crop&auto=format'],
  ['сәбіз',     'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=80&h=80&fit=crop&auto=format'],
  ['қырыққабат','https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=80&h=80&fit=crop&auto=format'],
  ['қияр',      'https://images.unsplash.com/photo-1449300079323-02847b0a42a3?w=80&h=80&fit=crop&auto=format'],
  ['қызанақ',   'https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=80&h=80&fit=crop&auto=format'],
  ['сарымсақ',  'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=80&h=80&fit=crop&auto=format'],
  ['болгар',    'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=80&h=80&fit=crop&auto=format'],
  ['баклажан',  'https://images.unsplash.com/photo-1503140234323-4df3e163571b?w=80&h=80&fit=crop&auto=format'],
  // Нан
  ['нан',       'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=80&h=80&fit=crop&auto=format'],
  ['батон',     'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=80&h=80&fit=crop&auto=format'],
  ['лаваш',     'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=80&h=80&fit=crop&auto=format'],
  ['печенье',   'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=80&h=80&fit=crop&auto=format'],
  ['вафли',     'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=80&h=80&fit=crop&auto=format'],
  // Сүт өнімдері
  ['сүт',       'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=80&h=80&fit=crop&auto=format'],
  ['кефир',     'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=80&h=80&fit=crop&auto=format'],
  ['йогурт',    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=80&h=80&fit=crop&auto=format'],
  ['сметана',   'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=80&h=80&fit=crop&auto=format'],
  ['сыр',       'https://images.unsplash.com/photo-1559561853-08451507e312?w=80&h=80&fit=crop&auto=format'],
  ['масло',     'https://images.unsplash.com/photo-1587334274328-64186a80aeee?w=80&h=80&fit=crop&auto=format'],
  // Тәттілер
  ['шоколад',   'https://images.unsplash.com/photo-1511381939415-e44015466834?w=80&h=80&fit=crop&auto=format'],
  ['зефир',     'https://images.unsplash.com/photo-1557925923-33b27f6de811?w=80&h=80&fit=crop&auto=format'],
  ['халва',     'https://images.unsplash.com/photo-1558642084-fd07fae5282e?w=80&h=80&fit=crop&auto=format'],
  // Ет
  ['сосиска',   'https://images.unsplash.com/photo-1628196237330-42a04c74e785?w=80&h=80&fit=crop&auto=format'],
  ['колбаса',   'https://images.unsplash.com/photo-1628196237330-42a04c74e785?w=80&h=80&fit=crop&auto=format'],
  ['шужық',     'https://images.unsplash.com/photo-1628196237330-42a04c74e785?w=80&h=80&fit=crop&auto=format'],
  ['тауық',     'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=80&h=80&fit=crop&auto=format'],
  // Сусындар
  ['кола',      'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=80&h=80&fit=crop&auto=format'],
  ['шай',       'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=80&h=80&fit=crop&auto=format'],
  ['нескафе',   'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=80&h=80&fit=crop&auto=format'],
  ['шырын',     'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=80&h=80&fit=crop&auto=format'],
  ['айран',     'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=80&h=80&fit=crop&auto=format'],
  ['су',        'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=80&h=80&fit=crop&auto=format'],
  // Бакалея
  ['күріш',     'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=80&h=80&fit=crop&auto=format'],
  ['гречка',    'https://images.unsplash.com/photo-1614728263952-84ea256f9697?w=80&h=80&fit=crop&auto=format'],
  ['макарон',   'https://images.unsplash.com/photo-1556761223-4c4282c73f77?w=80&h=80&fit=crop&auto=format'],
  ['тұз',       'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=80&h=80&fit=crop&auto=format'],
  ['қант',      'https://images.unsplash.com/photo-1558642084-fd07fae5282e?w=80&h=80&fit=crop&auto=format'],
  ['ұн',        'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=80&h=80&fit=crop&auto=format'],
  ['майонез',   'https://images.unsplash.com/photo-1597263705688-8be3ac57f2b0?w=80&h=80&fit=crop&auto=format'],
  ['кетчуп',    'https://images.unsplash.com/photo-1617718262756-2cbe4e3baea6?w=80&h=80&fit=crop&auto=format'],
  ['май',       'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=80&h=80&fit=crop&auto=format'],
  // Тазалық
  ['сабын',     'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=80&h=80&fit=crop&auto=format'],
  ['шампунь',   'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=80&h=80&fit=crop&auto=format'],
  ['тіс пастасы','https://images.unsplash.com/photo-1559628129-67cf63b72248?w=80&h=80&fit=crop&auto=format'],
  ['туалет',    'https://images.unsplash.com/photo-1584408836858-7f9d7d6e6889?w=80&h=80&fit=crop&auto=format'],
]

function getProductPhoto(name: string, catImg: string): string {
  const n = name.toLowerCase()
  for (const [kw, url] of PRODUCT_KEYWORD_PHOTOS) {
    if (n.includes(kw)) return url
  }
  return catImg
}

const UNITS = ['шт', 'кг']

const SEED_PRODUCTS: { name: string; category: string; unit: string }[] = [
  // Сусындар
  { name: 'Су (0.5л)', category: 'drinks', unit: 'шт' },
  { name: 'Су (1.5л)', category: 'drinks', unit: 'шт' },
  { name: 'Газды су', category: 'drinks', unit: 'шт' },
  { name: 'Шай (қара)', category: 'drinks', unit: 'шт' },
  { name: 'Шай (жасыл)', category: 'drinks', unit: 'шт' },
  { name: 'Нескафе', category: 'drinks', unit: 'шт' },
  { name: 'Апельсин шырыны', category: 'drinks', unit: 'шт' },
  { name: 'Алма шырыны', category: 'drinks', unit: 'шт' },
  { name: 'Кола', category: 'drinks', unit: 'шт' },
  { name: 'Fanta', category: 'drinks', unit: 'шт' },
  { name: 'Sprite', category: 'drinks', unit: 'шт' },
  { name: 'Айран', category: 'drinks', unit: 'шт' },
  { name: 'Энергетик', category: 'drinks', unit: 'шт' },
  { name: 'Боржоми', category: 'drinks', unit: 'шт' },
  { name: 'Компот', category: 'drinks', unit: 'шт' },
  // Нан өнімдері
  { name: 'Нан (ақ)', category: 'bread', unit: 'шт' },
  { name: 'Нан (қара)', category: 'bread', unit: 'шт' },
  { name: 'Батон', category: 'bread', unit: 'шт' },
  { name: 'Лаваш', category: 'bread', unit: 'шт' },
  { name: 'Тоқаш', category: 'bread', unit: 'шт' },
  { name: 'Сушки', category: 'bread', unit: 'кг' },
  { name: 'Сухари', category: 'bread', unit: 'шт' },
  { name: 'Печенье', category: 'bread', unit: 'кг' },
  { name: 'Крекер', category: 'bread', unit: 'шт' },
  { name: 'Пряник', category: 'bread', unit: 'кг' },
  // Сүт өнімдері
  { name: 'Сүт (1л)', category: 'dairy', unit: 'шт' },
  { name: 'Кефир', category: 'dairy', unit: 'шт' },
  { name: 'Сметана', category: 'dairy', unit: 'шт' },
  { name: 'Творог', category: 'dairy', unit: 'шт' },
  { name: 'Йогурт', category: 'dairy', unit: 'шт' },
  { name: 'Ряженка', category: 'dairy', unit: 'шт' },
  { name: 'Сыр (қатты)', category: 'dairy', unit: 'кг' },
  { name: 'Сыр (балқытылған)', category: 'dairy', unit: 'шт' },
  { name: 'Масло сливочное', category: 'dairy', unit: 'шт' },
  { name: 'Маргарин', category: 'dairy', unit: 'шт' },
  { name: 'Қаймақ', category: 'dairy', unit: 'шт' },
  // Тәттілер
  { name: 'Шоколад', category: 'sweets', unit: 'шт' },
  { name: 'Карамель', category: 'sweets', unit: 'кг' },
  { name: 'Ирис', category: 'sweets', unit: 'кг' },
  { name: 'Мармелад', category: 'sweets', unit: 'кг' },
  { name: 'Зефир', category: 'sweets', unit: 'кг' },
  { name: 'Халва', category: 'sweets', unit: 'кг' },
  { name: 'Вафли', category: 'sweets', unit: 'шт' },
  { name: 'Козинак', category: 'sweets', unit: 'шт' },
  { name: 'Конфеты ассорти', category: 'sweets', unit: 'кг' },
  { name: 'Чупа-чупс', category: 'sweets', unit: 'шт' },
  { name: 'Драже', category: 'sweets', unit: 'шт' },
  // Ет өнімдері
  { name: 'Сосиска', category: 'meat', unit: 'кг' },
  { name: 'Колбаса (пісірілген)', category: 'meat', unit: 'кг' },
  { name: 'Колбаса (ысталған)', category: 'meat', unit: 'кг' },
  { name: 'Шужық', category: 'meat', unit: 'кг' },
  { name: 'Тауық еті', category: 'meat', unit: 'кг' },
  { name: 'Шпрот (консерва)', category: 'meat', unit: 'шт' },
  { name: 'Тунец (консерва)', category: 'meat', unit: 'шт' },
  { name: 'Сардина (консерва)', category: 'meat', unit: 'шт' },
  { name: 'Тұшпара (пельмень)', category: 'meat', unit: 'кг' },
  // Жемістер
  { name: 'Алма', category: 'fruits', unit: 'кг' },
  { name: 'Банан', category: 'fruits', unit: 'кг' },
  { name: 'Апельсин', category: 'fruits', unit: 'кг' },
  { name: 'Лимон', category: 'fruits', unit: 'кг' },
  { name: 'Мандарин', category: 'fruits', unit: 'кг' },
  { name: 'Жүзім', category: 'fruits', unit: 'кг' },
  { name: 'Алмұрт', category: 'fruits', unit: 'кг' },
  { name: 'Өрік', category: 'fruits', unit: 'кг' },
  { name: 'Шабдалы', category: 'fruits', unit: 'кг' },
  { name: 'Қарбыз', category: 'fruits', unit: 'кг' },
  { name: 'Қауын', category: 'fruits', unit: 'кг' },
  { name: 'Клубника', category: 'fruits', unit: 'кг' },
  // Көкөністер
  { name: 'Картоп', category: 'vegetables', unit: 'кг' },
  { name: 'Пияз', category: 'vegetables', unit: 'кг' },
  { name: 'Сәбіз', category: 'vegetables', unit: 'кг' },
  { name: 'Қырыққабат', category: 'vegetables', unit: 'кг' },
  { name: 'Қияр', category: 'vegetables', unit: 'кг' },
  { name: 'Қызанақ', category: 'vegetables', unit: 'кг' },
  { name: 'Сарымсақ', category: 'vegetables', unit: 'кг' },
  { name: 'Қызылша', category: 'vegetables', unit: 'кг' },
  { name: 'Болгар бурышы', category: 'vegetables', unit: 'кг' },
  { name: 'Баклажан', category: 'vegetables', unit: 'кг' },
  { name: 'Кабачок', category: 'vegetables', unit: 'кг' },
  { name: 'Укроп/Петрушка', category: 'vegetables', unit: 'шт' },
  // Бакалея
  { name: 'Күріш', category: 'grocery', unit: 'кг' },
  { name: 'Гречка', category: 'grocery', unit: 'кг' },
  { name: 'Макарон', category: 'grocery', unit: 'шт' },
  { name: 'Сұлы жармасы', category: 'grocery', unit: 'шт' },
  { name: 'Манна жармасы', category: 'grocery', unit: 'кг' },
  { name: 'Тары', category: 'grocery', unit: 'кг' },
  { name: 'Тұз', category: 'grocery', unit: 'шт' },
  { name: 'Қант', category: 'grocery', unit: 'кг' },
  { name: 'Ұн', category: 'grocery', unit: 'кг' },
  { name: 'Өсімдік майы', category: 'grocery', unit: 'шт' },
  { name: 'Кетчуп', category: 'grocery', unit: 'шт' },
  { name: 'Майонез', category: 'grocery', unit: 'шт' },
  { name: 'Горчица', category: 'grocery', unit: 'шт' },
  { name: 'Сірке суы', category: 'grocery', unit: 'шт' },
  { name: 'Соевый соус', category: 'grocery', unit: 'шт' },
  { name: 'Тушенка', category: 'grocery', unit: 'шт' },
  { name: 'Бұршақ (консерва)', category: 'grocery', unit: 'шт' },
  { name: 'Жүгері (консерва)', category: 'grocery', unit: 'шт' },
  { name: 'Приправа', category: 'grocery', unit: 'шт' },
  { name: 'Бульон кубигі', category: 'grocery', unit: 'шт' },
  { name: 'Сода пищевая', category: 'grocery', unit: 'шт' },
  // Тазалық
  { name: 'Сабын (қатты)', category: 'hygiene', unit: 'шт' },
  { name: 'Сабын (сұйық)', category: 'hygiene', unit: 'шт' },
  { name: 'Шампунь', category: 'hygiene', unit: 'шт' },
  { name: 'Гель для душа', category: 'hygiene', unit: 'шт' },
  { name: 'Тіс пастасы', category: 'hygiene', unit: 'шт' },
  { name: 'Тіс щеткасы', category: 'hygiene', unit: 'шт' },
  { name: 'Дезодорант', category: 'hygiene', unit: 'шт' },
  { name: 'Туалет қағазы', category: 'hygiene', unit: 'шт' },
  { name: 'Қағаз орамал', category: 'hygiene', unit: 'шт' },
  { name: 'Кір жуғыш ұнтақ', category: 'hygiene', unit: 'шт' },
  { name: 'Ыдыс жуғыш', category: 'hygiene', unit: 'шт' },
  { name: 'Мата жуғыш (кондиционер)', category: 'hygiene', unit: 'шт' },
  { name: 'Мақта таяқшалары', category: 'hygiene', unit: 'шт' },
  { name: 'Таңғыш (прокладки)', category: 'hygiene', unit: 'шт' },
]

export default function StockPage() {
  const { store, lang } = useApp()
  const T = t[lang]
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showSeed, setShowSeed] = useState(false)
  const [seedCats, setSeedCats] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.key)))
  const [seeding, setSeeding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<any>(null)
  const scanningRef = useRef(false)

  // Form field refs for auto-advance
  const nameRef     = useRef<HTMLInputElement>(null)
  const costRef     = useRef<HTMLInputElement>(null)
  const priceRef    = useRef<HTMLInputElement>(null)
  const qtyRef      = useRef<HTMLInputElement>(null)
  const barcodeRef  = useRef<HTMLInputElement>(null)

  // Auto-focus name when form opens
  useEffect(() => { if (showAdd) setTimeout(() => nameRef.current?.focus(), 80) }, [showAdd])

  function advance(next: React.RefObject<HTMLInputElement | null>) {
    next.current?.focus()
    next.current?.select()
  }

  const [form, setForm] = useState({
    name: '', category: 'other', cost_price: '',
    price: '', quantity: '', unit: 'шт', expiry_date: '', barcode: ''
  })

  const ptr = usePullToRefresh(useCallback(() => loadProducts(), [store.id]))

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
      barcode: form.barcode.trim() || null
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

  async function seedProducts() {
    setSeeding(true)
    const supabase = createClient()
    const toInsert = SEED_PRODUCTS
      .filter(p => seedCats.has(p.category))
      .map(p => ({ store_id: store.id, name: p.name, category: p.category, unit: p.unit, price: 0, cost_price: 0, quantity: 0 }))
    await supabase.from('products').insert(toInsert)
    setShowSeed(false)
    setSeeding(false)
    loadProducts()
  }

  async function deleteProduct(id: string) {
    if (!confirm(lang === 'kz' ? 'Бұл товарды жою керек пе?' : 'Удалить этот товар?')) return
    const supabase = createClient()
    // Алдымен sales/debts кестелеріндегі product_id сілтемелерін тазалап, FK constraint-тен өтеміз
    await supabase.from('sales').update({ product_id: null }).eq('product_id', id)
    await supabase.from('debts').update({ product_id: null }).eq('product_id', id)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      alert(lang === 'kz' ? 'Жою мүмкін болмады. Қайтадан көріңіз.' : 'Не удалось удалить. Попробуйте ещё раз.')
      return
    }
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function startScanner() {
    setScanning(true)
    scanningRef.current = true
    setScanMsg('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
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

      const { BrowserMultiFormatReader } = await import('@zxing/library')
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      reader.decodeFromStream(stream, videoRef.current!, (result, err) => {
        if (!scanningRef.current) return
        if (result) {
          const code = result.getText()
          setForm(prev => ({ ...prev, barcode: code }))
          if (navigator.vibrate) navigator.vibrate(60)
          stopScanner()
        }
      })
    } catch (e) {
      setScanMsg(lang === 'kz' ? 'Камераға рұқсат жоқ' : 'Нет доступа к камере')
      setScanning(false)
    }
  }

  function stopScanner() {
    scanningRef.current = false
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
  }

  function getExpiryStatus(expiry?: string) {
    if (!expiry) return null
    const diff = (new Date(expiry).getTime() - Date.now()) / 86400000
    if (diff < 0) return 'expired'
    if (diff <= 7) return 'soon'
    return 'ok'
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (selectedCat === null || p.category === selectedCat)
  )

  const catCounts = CATEGORIES.reduce((acc, c) => {
    acc[c.key] = products.filter(p => p.category === c.key).length
    return acc
  }, {} as Record<string, number>)

  const availableCats = CATEGORIES.filter(c => catCounts[c.key] > 0)
  const showCategoryGrid = !search && selectedCat === null && !showAdd

  return (
    <div>
      {(ptr.progress > 0 || ptr.refreshing) && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 48, opacity: ptr.refreshing ? 1 : ptr.progress }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--primary-light)', borderTopColor: 'var(--primary)', animation: ptr.refreshing ? 'ptrSpin 0.7s linear infinite' : 'none', transform: ptr.refreshing ? 'none' : `rotate(${ptr.progress * 270}deg)` }} />
        </div>
      )}
      {/* ZXing Scanner Modal */}
      {scanning && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 280, height: 140,
              border: '3px solid rgba(255,80,80,0.9)',
              borderRadius: 14,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5), 0 0 20px rgba(255,80,80,0.3)',
              position: 'relative',
            }}>
              {[
                { top: -3, left: -3, borderTop: '4px solid', borderLeft: '4px solid', borderRadius: '4px 0 0 0' },
                { top: -3, right: -3, borderTop: '4px solid', borderRight: '4px solid', borderRadius: '0 4px 0 0' },
                { bottom: -3, left: -3, borderBottom: '4px solid', borderLeft: '4px solid', borderRadius: '0 0 0 4px' },
                { bottom: -3, right: -3, borderBottom: '4px solid', borderRight: '4px solid', borderRadius: '0 0 4px 0' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute', width: 22, height: 22, borderColor: '#fff', ...s }} />
              ))}
              <div style={{ position: 'absolute', top: '50%', left: 6, right: 6, height: 2, background: 'rgba(255,80,80,0.75)', boxShadow: '0 0 6px rgba(255,80,80,0.6)' }} />
            </div>
            <div style={{ marginTop: 16, color: '#fff', fontSize: 13, background: 'rgba(0,0,0,0.65)', padding: '8px 18px', borderRadius: 99 }}>
              {lang === 'kz' ? '📷 Штрихкодты рамкаға бағыттаңыз' : '📷 Наведите штрихкод на рамку'}
            </div>
          </div>
          {scanMsg && (
            <div style={{ position: 'absolute', bottom: 130, left: 20, right: 20, background: '#D85A30', color: '#fff', borderRadius: 12, padding: '14px', textAlign: 'center', fontSize: 15 }}>
              {scanMsg}
            </div>
          )}
          <button onClick={stopScanner} style={{
            position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)',
            background: '#fff', border: 'none', borderRadius: 99,
            padding: '12px 40px', fontSize: 15, fontWeight: 600, cursor: 'pointer'
          }}>
            {lang === 'kz' ? '✕ Жабу' : '✕ Закрыть'}
          </button>
        </div>
      )}

      {/* Стандартты тізім модалы */}
      {showSeed && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '80vh', overflow: 'auto', padding: '20px 16px 32px' }}>
            <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 99, margin: '0 auto 16px' }} />
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>
              {lang === 'kz' ? '📋 Стандартты тауарлар тізімі' : '📋 Стандартный список товаров'}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
              {lang === 'kz'
                ? 'Қай санаттарды қосу керек? Баға мен санын өзіңіз кейін енгізесіз.'
                : 'Какие категории добавить? Цену и количество заполните сами позже.'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <button onClick={() => setSeedCats(new Set(CATEGORIES.map(c => c.key)))} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {lang === 'kz' ? 'Барлығын белгілеу' : 'Выбрать все'}
              </button>
              <button onClick={() => setSeedCats(new Set())} style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {lang === 'kz' ? 'Тазалау' : 'Снять все'}
              </button>
            </div>
            {CATEGORIES.map(c => {
              const count = SEED_PRODUCTS.filter(p => p.category === c.key).length
              const checked = seedCats.has(c.key)
              return (
                <div key={c.key} onClick={() => {
                  const next = new Set(seedCats)
                  if (checked) next.delete(c.key); else next.add(c.key)
                  setSeedCats(next)
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  border: `2px solid ${checked ? 'var(--accent)' : '#e5e7eb'}`,
                  borderRadius: 12, marginBottom: 8, cursor: 'pointer',
                  background: checked ? '#f0faf5' : '#fff'
                }}>
                  <span style={{ fontSize: 26 }}>{c.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{lang === 'kz' ? c.kz : c.ru}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{count} {lang === 'kz' ? 'тауар' : 'товаров'}</div>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? 'var(--accent)' : '#d1d5db'}`,
                    background: checked ? 'var(--accent)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {checked && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>}
                  </div>
                </div>
              )
            })}
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={seedProducts} disabled={seeding || seedCats.size === 0} style={{ flex: 2 }}>
                {seeding ? (lang === 'kz' ? 'Қосылуда...' : 'Добавляется...') : `${lang === 'kz' ? 'Қосу' : 'Добавить'} (${SEED_PRODUCTS.filter(p => seedCats.has(p.category)).length})`}
              </button>
              <button className="btn" onClick={() => setShowSeed(false)} style={{ flex: 1 }}>
                {lang === 'kz' ? 'Болдырмау' : 'Отмена'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input placeholder={lang === 'kz' ? '🔍 Товар іздеу...' : '🔍 Поиск товара...'}
          value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <button onClick={() => setShowSeed(true)} style={{
          width: 'auto', padding: '0 12px', borderRadius: 8,
          border: '1px solid var(--accent)', background: '#f0faf5',
          color: 'var(--accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap'
        }}>
          📋
        </button>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '0 16px' }}
          onClick={() => {
            setShowAdd(!showAdd); setEditId(null)
            setForm({ name: '', category: 'other', cost_price: '', price: '', quantity: '', unit: 'шт', expiry_date: '', barcode: '' })
          }}>
          + {lang === 'kz' ? 'Қосу' : 'Добавить'}
        </button>
      </div>

      {showAdd && (
        <div className="card anim-pop-in" style={{ marginBottom: 10, border: '2px solid var(--primary)' }}>
          <div className="section-title">
            {editId ? (lang === 'kz' ? 'Өзгерту' : 'Редактировать') : (lang === 'kz' ? 'Жаңа товар' : 'Новый товар')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              ref={nameRef}
              placeholder={lang === 'kz' ? 'Товар аты *' : 'Название товара *'}
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && advance(costRef)}
              autoComplete="off"
            />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                <option key={c.key} value={c.key}>{c.icon} {lang === 'kz' ? c.kz : c.ru}</option>
              ))}
            </select>
            <div className="row-2">
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
                  {lang === 'kz' ? 'Келген баға' : 'Цена закупки'}
                </label>
                <input
                  ref={costRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.cost_price}
                  onChange={e => setForm({ ...form, cost_price: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && advance(priceRef)}
                  onFocus={e => e.target.select()}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
                  {lang === 'kz' ? 'Сату бағасы *' : 'Цена продажи *'}
                </label>
                <input
                  ref={priceRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && advance(qtyRef)}
                  onFocus={e => e.target.select()}
                />
              </div>
            </div>
            <div className="row-2">
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
                  {lang === 'kz' ? 'Саны' : 'Количество'}
                </label>
                <input
                  ref={qtyRef}
                  type="text"
                  inputMode={form.unit === 'кг' ? 'decimal' : 'numeric'}
                  placeholder="0" value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && advance(barcodeRef)}
                  onFocus={e => e.target.select()}
                />
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
                  ref={barcodeRef}
                  placeholder="1234567890123"
                  value={form.barcode}
                  inputMode="numeric"
                  onChange={e => setForm({ ...form, barcode: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && saveProduct()}
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={startScanner} style={{
                  padding: '0 14px', borderRadius: 8, border: '1px solid #e5e7eb',
                  background: '#fff', cursor: 'pointer', fontSize: 20, flexShrink: 0
                }}>📷</button>
              </div>
              {form.barcode && (
                <div style={{ fontSize: 11, color: '#0F6E56', marginTop: 4 }}>✓ {form.barcode}</div>
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

      {showCategoryGrid ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="stagger-list">
          {availableCats.map(c => (
            <button key={c.key} onClick={() => setSelectedCat(c.key)} className="pressable" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '24px 12px 20px', border: '1.5px solid var(--border)', borderRadius: 20,
              background: 'var(--card-bg)', gap: 10,
              boxShadow: 'var(--shadow-sm)', WebkitTapHighlightColor: 'transparent',
            }}>
              <img
                src={c.img} alt={c.kz}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 14, display: 'block' }}
                onError={e => { const t = e.target as HTMLImageElement; t.style.display='none'; (t.nextSibling as HTMLElement)?.style && ((t.nextSibling as HTMLElement).style.display='block') }}
              />
              <span style={{ fontSize: 52, lineHeight: 1, display: 'none' }}>{c.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', textAlign: 'center', lineHeight: 1.3 }}>
                {lang === 'kz' ? c.kz : c.ru}
              </span>
              <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                {catCounts[c.key]} {lang === 'kz' ? 'дана' : 'шт'}
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
          <div className="card" style={{ padding: 0 }}>
            {filtered.length === 0
              ? <p className="text-muted" style={{ textAlign: 'center', padding: 20, fontSize: 13 }}>{T.noProducts}</p>
              : <div key={selectedCat} className="stagger-list">{filtered.map(p => {
                const expStatus = getExpiryStatus(p.expiry_date)
                const catImg = CATEGORIES.find(c => c.key === p.category)?.img || CATEGORIES[9].img
                const productPhoto = getProductPhoto(p.name, catImg)
                return (
                  <div key={p.id} className="card-pressable" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', gap: 10 }}>
                    {/* Product photo */}
                    <img
                      src={productPhoto} alt={p.name}
                      style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {p.price.toLocaleString()} ₸/{p.unit || 'шт'}
                        {p.barcode && <span style={{ marginLeft: 6 }}>#{p.barcode}</span>}
                        {expStatus === 'expired' && <span style={{ color: 'var(--danger)', marginLeft: 6 }}>❌ мерзімі өтті</span>}
                        {expStatus === 'soon' && <span style={{ color: 'var(--warning)', marginLeft: 6 }}>⚠️ {p.expiry_date}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                        background: p.quantity <= 5 ? 'var(--danger-light)' : 'var(--primary-light)',
                        color: p.quantity <= 5 ? 'var(--danger)' : 'var(--primary-dark)',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        {p.quantity <= 5 && <span className="low-stock-dot" style={{ background: p.quantity <= 2 ? 'var(--danger)' : 'var(--warning)' }} />}
                        {p.quantity} {p.unit || 'шт'}
                      </span>
                      <span onClick={() => startEdit(p)} style={{ cursor: 'pointer', fontSize: 15 }}>✏️</span>
                      <span onClick={() => deleteProduct(p.id)} style={{ cursor: 'pointer', fontSize: 15 }}>🗑</span>
                    </div>
                  </div>
                )
              })}</div>
            }
          </div>
        </>
      )}
    </div>
  )
}