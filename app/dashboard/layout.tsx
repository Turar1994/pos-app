'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, Lang } from '@/lib/lang'
import { AppContext } from '@/lib/context'

type Store = { id: string; name: string }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [lang, setLang] = useState<Lang>('kz')
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [storeName, setStoreName] = useState('')
  const [refresh, setRefresh] = useState(0)
  const T = t[lang]

  const [blocked, setBlocked] = useState<string | null>(null)

  useEffect(() => { loadStore() }, [])

  // Әр 60 секунд сайын статусты тексеру
  useEffect(() => {
    const interval = setInterval(checkStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  async function checkStatus() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/auth'); return }
    const { data: client } = await supabase.from('clients')
      .select('status, subscription_end, deleted_at')
      .eq('email', session.user.email!)
      .maybeSingle()
    if (!client || client.deleted_at) {
      await supabase.auth.signOut()
      router.replace('/auth')
      return
    }
    if (client.status === 'blocked') {
      setBlocked(lang === 'kz' ? 'Аккаунтыңыз блокталған. Байланысыңыз: turar.toreniyazov@gmail.com' : 'Аккаунт заблокирован. Свяжитесь: turar.toreniyazov@gmail.com')
      return
    }
    if (client.status === 'inactive') {
      setBlocked(lang === 'kz' ? 'Аккаунтыңыз белсендірілмеген. Байланысыңыз: turar.toreniyazov@gmail.com' : 'Аккаунт деактивирован. Свяжитесь: turar.toreniyazov@gmail.com')
      return
    }
    if (client.subscription_end && new Date(client.subscription_end) < new Date()) {
      setBlocked(lang === 'kz' ? 'Подписка мерзімі өтті. Төлем жасаңыз: turar.toreniyazov@gmail.com' : 'Срок подписки истёк. Оплатите: turar.toreniyazov@gmail.com')
      return
    }
    setBlocked(null)
  }

  async function loadStore() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/auth'); return }
    const { data } = await supabase.from('stores').select('*').eq('user_id', session.user.id).single()
    if (data) setStore(data)
    await checkStatus()
    setLoading(false)
  }

  async function createStore() {
    if (!storeName.trim()) return
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('stores').insert({ name: storeName, user_id: session.user.id }).select().single()
    if (data) {
      setStore(data)
      await supabase.from('clients').update({ store_name: storeName }).eq('email', session.user.email!)
      await supabase.from('profiles').update({ store_name: storeName }).eq('id', session.user.id)
    }
  }

  async function logout() {
    await createClient().auth.signOut()
    router.replace('/auth')
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p className="text-muted">{T.loading}</p>
    </div>
  )

  if (blocked) return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      padding: 24, textAlign: 'center'
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
        {lang === 'kz' ? 'Қатынас жабық' : 'Доступ закрыт'}
      </h2>
      <p style={{ color: '#e5e7eb', fontSize: 14, maxWidth: 300, lineHeight: 1.6 }}>
        {blocked}
      </p>
      <button onClick={logout} style={{
        marginTop: 24, padding: '10px 24px',
        background: '#D85A30', color: '#fff',
        border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14
      }}>
        {lang === 'kz' ? 'Шығу' : 'Выйти'}
      </button>
    </div>
  )

  if (!store) return (
    <div style={{ padding: '40px 20px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>{T.createStoreTitle}</h1>
      <div className="gap">
        <input placeholder={T.storeName} value={storeName} onChange={e => setStoreName(e.target.value)} />
        <button className="btn btn-primary" onClick={createStore}>{T.createStore}</button>
      </div>
    </div>
  )

  const tabs = [
    { path: '/dashboard', label: T.home, icon: '🏠' },
    { path: '/dashboard/sale', label: T.sale, icon: '💰' },
    { path: '/dashboard/stock', label: T.stock, icon: '📦' },
    { path: '/dashboard/report', label: T.report, icon: '📊' },
    { path: '/dashboard/debts', label: lang === 'kz' ? 'Қарыз' : 'Долги', icon: '💳' },
    { path: '/dashboard/profile', label: lang === 'kz' ? 'Кабинет' : 'Кабинет', icon: '👤' },
  ]

  return (
    <AppContext.Provider value={{ store, lang, setLang, refresh, triggerRefresh: () => setRefresh(r => r + 1) }}>
      <div style={{ paddingBottom: 70 }}>
        <div style={{
          background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{store.name}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['kz', 'ru'] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: '3px 8px', borderRadius: 99, border: '1px solid #e5e7eb',
                  background: lang === l ? '#f3f4f6' : 'transparent',
                  fontWeight: lang === l ? 600 : 400, cursor: 'pointer', fontSize: 11
                }}>{l === 'kz' ? 'ҚАЗ' : 'РУС'}</button>
              ))}
            </div>
            <button onClick={logout} style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 99,
              border: '1px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: '#D85A30'
            }}>{T.logout}</button>
          </div>
        </div>

        <div style={{ padding: '12px' }}>{children}</div>

        <nav style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430, background: '#fff',
          borderTop: '1px solid #e5e7eb', display: 'flex'
        }}>
          {tabs.map(tab => {
            const active = pathname === tab.path
            return (
              <button key={tab.path} onClick={() => router.push(tab.path)} style={{
                flex: 1, padding: '8px 2px', border: 'none', background: 'transparent',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                borderTop: active ? '2px solid #185FA5' : '2px solid transparent',
                color: active ? '#185FA5' : '#6b7280', fontSize: 9, fontWeight: active ? 600 : 400
              }}>
                <span style={{ fontSize: 17 }}>{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>
    </AppContext.Provider>
  )
}
