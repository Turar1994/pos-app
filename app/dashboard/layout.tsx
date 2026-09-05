'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, Lang } from '@/lib/lang'
import { AppContext } from '@/lib/context'

type Store = { id: string; name: string; kaspi_number?: string; kaspi_qr_url?: string; owner_password?: string }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [lang, setLang] = useState<Lang>('kz')
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [storeName, setStoreName] = useState('')
  const [refresh, setRefresh] = useState(0)
  const T = t[lang]
  const [blocked, setBlocked] = useState<string | null>(null)

  // Role system
  const [role, setRole] = useState<'cashier' | 'owner' | null>(null)
  const [showOwnerPwd, setShowOwnerPwd] = useState(false)
  const [ownerPwdInput, setOwnerPwdInput] = useState('')
  const [ownerPwdError, setOwnerPwdError] = useState('')
  const [settingPwd, setSettingPwd] = useState(false)
  const [newPwd1, setNewPwd1] = useState('')
  const [newPwd2, setNewPwd2] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (saved) setThemeState(saved)
    const savedLang = localStorage.getItem('lang') as Lang | null
    if (savedLang) setLang(savedLang)
  }, [])

  function setTheme(t: 'light' | 'dark') { setThemeState(t); localStorage.setItem('theme', t) }
  function changeLang(l: Lang) { setLang(l); localStorage.setItem('lang', l) }

  useEffect(() => { loadStore() }, [])
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
    if (!client || client.deleted_at) { await supabase.auth.signOut(); router.replace('/auth'); return }
    if (client.status === 'blocked') {
      setBlocked(lang === 'kz' ? 'Аккаунтыңыз блокталған. Байланысыңыз: turar.toreniyazov@gmail.com' : 'Аккаунт заблокирован. Свяжитесь: turar.toreniyazov@gmail.com')
      return
    }
    if (client.status === 'inactive') {
      setBlocked(lang === 'kz' ? 'Аккаунтыңыз белсендірілмеген.' : 'Аккаунт деактивирован.')
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

  async function refreshStore() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('stores').select('*').eq('user_id', session.user.id).single()
    if (data) setStore(data)
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

  async function logout() { await createClient().auth.signOut(); router.replace('/auth') }

  function selectCashier() { setRole('cashier'); sessionStorage.setItem('role', 'cashier') }

  function selectOwner() {
    if (!store?.owner_password) { setShowOwnerPwd(true); setSettingPwd(true) }
    else { setShowOwnerPwd(true); setSettingPwd(false) }
    setOwnerPwdInput(''); setOwnerPwdError(''); setNewPwd1(''); setNewPwd2('')
  }

  async function confirmOwnerPwd() {
    if (settingPwd) {
      if (!newPwd1 || !newPwd2) { setOwnerPwdError(lang === 'kz' ? 'Барлық өрісті толтырыңыз' : 'Заполните все поля'); return }
      if (newPwd1 !== newPwd2) { setOwnerPwdError(lang === 'kz' ? 'Парольдер сәйкес емес' : 'Пароли не совпадают'); return }
      if (newPwd1.length < 4) { setOwnerPwdError(lang === 'kz' ? 'Кемінде 4 таңба' : 'Минимум 4 символа'); return }
      const supabase = createClient()
      await supabase.from('stores').update({ owner_password: newPwd1 }).eq('id', store!.id)
      setStore(prev => prev ? { ...prev, owner_password: newPwd1 } : prev)
      setRole('owner'); sessionStorage.setItem('role', 'owner')
      setShowOwnerPwd(false)
    } else {
      if (ownerPwdInput !== store?.owner_password) {
        setOwnerPwdError(lang === 'kz' ? 'Пароль қате' : 'Неверный пароль')
        return
      }
      setRole('owner'); sessionStorage.setItem('role', 'owner')
      setShowOwnerPwd(false)
    }
  }

  function switchRole() { setRole(null); sessionStorage.removeItem('role') }

  // Screens
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛒</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`, opacity: 0.4 }} />
        ))}
      </div>
      <style>{`@keyframes dotPulse { 0%,80%,100%{transform:scale(0.6);opacity:0.3} 40%{transform:scale(1);opacity:1} }`}</style>
    </div>
  )

  if (blocked) return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.92)', zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>🔒</div>
      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{lang === 'kz' ? 'Қатынас жабық' : 'Доступ закрыт'}</h2>
      <p style={{ color: '#94A3B8', fontSize: 14, maxWidth: 300, lineHeight: 1.7 }}>{blocked}</p>
      <button onClick={logout} style={{ marginTop: 28, padding: '12px 28px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
        {lang === 'kz' ? 'Шығу' : 'Выйти'}
      </button>
    </div>
  )

  if (!store) return (
    <div style={{ padding: '48px 20px' }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{T.createStoreTitle}</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>{lang === 'kz' ? 'Дүкеніңіздің атын енгізіңіз' : 'Введите название магазина'}</p>
      </div>
      <div className="gap">
        <input placeholder={T.storeName} value={storeName} onChange={e => setStoreName(e.target.value)} style={{ fontSize: 16 }} />
        <button className="btn btn-primary" onClick={createStore}>{T.createStore}</button>
      </div>
    </div>
  )

  // Role selection screen
  if (!role) return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>🏪</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{store.name}</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 32 }}>
        {lang === 'kz' ? 'Кім ретінде кіресіз?' : 'Войти как:'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        <button onClick={selectCashier} style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px',
          background: 'var(--card-bg)', border: '2px solid var(--border)', borderRadius: 20,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent', textAlign: 'left',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>👨‍💼</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>
              {lang === 'kz' ? 'Дүкенші' : 'Кассир'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
              {lang === 'kz' ? 'Паролсыз кіру' : 'Вход без пароля'}
            </div>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 20 }}>›</span>
        </button>

        <button onClick={selectOwner} style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px',
          background: 'var(--card-bg)', border: '2px solid var(--primary)', borderRadius: 20,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent', textAlign: 'left',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>👑</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>
              {lang === 'kz' ? 'Дүкен иесі' : 'Владелец'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
              {lang === 'kz' ? 'Пароль қажет' : 'Требуется пароль'}
            </div>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: 20 }}>›</span>
        </button>
      </div>

      <button onClick={logout} style={{ marginTop: 32, fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px' }}>
        {lang === 'kz' ? 'Шығу' : 'Выйти'}
      </button>

      {/* Owner password modal */}
      {showOwnerPwd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 320 }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>🔐</div>
            <h3 style={{ textAlign: 'center', fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
              {settingPwd
                ? (lang === 'kz' ? 'Иесі паролін белгілеңіз' : 'Установите пароль владельца')
                : (lang === 'kz' ? 'Иесі паролі' : 'Пароль владельца')}
            </h3>

            {settingPwd ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="password" placeholder={lang === 'kz' ? 'Жаңа пароль' : 'Новый пароль'} value={newPwd1} onChange={e => setNewPwd1(e.target.value)} autoFocus style={{ textAlign: 'center', letterSpacing: 4 }} />
                <input type="password" placeholder={lang === 'kz' ? 'Қайталаңыз' : 'Повторите'} value={newPwd2} onChange={e => setNewPwd2(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmOwnerPwd()} style={{ textAlign: 'center', letterSpacing: 4 }} />
              </div>
            ) : (
              <input type="password" placeholder="••••••" value={ownerPwdInput} onChange={e => setOwnerPwdInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmOwnerPwd()} autoFocus style={{ textAlign: 'center', letterSpacing: 6, fontSize: 22 }} />
            )}

            {ownerPwdError && <p style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center', marginTop: 8 }}>{ownerPwdError}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowOwnerPwd(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--muted)', fontWeight: 600 }}>
                {lang === 'kz' ? 'Болдырмау' : 'Отмена'}
              </button>
              <button onClick={confirmOwnerPwd} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
                {settingPwd ? (lang === 'kz' ? 'Белгілеу' : 'Установить') : (lang === 'kz' ? 'Кіру' : 'Войти')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Role-based navigation tabs
  const cashierTabs = [
    { path: '/dashboard',       label: lang === 'kz' ? 'Басты' : 'Главная',    icon: '🏠' },
    { path: '/dashboard/sale',  label: lang === 'kz' ? 'Сату' : 'Продажа',     icon: '💰' },
    { path: '/dashboard/stock', label: lang === 'kz' ? 'Склад' : 'Склад',      icon: '📦' },
    { path: '/dashboard/debts', label: lang === 'kz' ? 'Қарыз' : 'Долги',      icon: '💳' },
  ]
  const ownerTabs = [
    { path: '/dashboard/stock',  label: lang === 'kz' ? 'Склад' : 'Склад',     icon: '📦' },
    { path: '/dashboard/report', label: lang === 'kz' ? 'Есеп' : 'Отчёт',      icon: '📊' },
    { path: '/dashboard/debts',  label: lang === 'kz' ? 'Қарыз' : 'Долги',     icon: '💳' },
    { path: '/dashboard/profit', label: lang === 'kz' ? 'Пайда' : 'Прибыль',   icon: '💹' },
    { path: '/dashboard/profile',label: lang === 'kz' ? 'Кабинет' : 'Кабинет', icon: '👤' },
  ]
  const tabs = role === 'cashier' ? cashierTabs : ownerTabs

  return (
    <AppContext.Provider value={{ store, lang, setLang: changeLang, theme, setTheme, refresh, triggerRefresh: () => setRefresh(r => r + 1), role, refreshStore }}>
      <div data-theme={theme} style={{ paddingBottom: 74, minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Header */}
        <div className="app-header" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 8px rgba(15,23,42,0.05)', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: role === 'owner' ? '#8B5CF6' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              {role === 'owner' ? '👑' : '🛒'}
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', letterSpacing: -0.3 }}>{store.name}</span>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{role === 'owner' ? (lang === 'kz' ? 'Иесі' : 'Владелец') : (lang === 'kz' ? 'Дүкенші' : 'Кассир')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 2, padding: '3px', background: 'var(--surface)', borderRadius: 10 }}>
              {(['kz', 'ru'] as Lang[]).map(l => (
                <button key={l} onClick={() => changeLang(l)} style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: lang === l ? 'var(--card-bg)' : 'transparent', color: lang === l ? 'var(--text)' : 'var(--muted)', fontWeight: lang === l ? 700 : 500, cursor: 'pointer', fontSize: 12, boxShadow: lang === l ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', transition: 'all 0.15s' }}>
                  {l === 'kz' ? 'ҚАЗ' : 'РУС'}
                </button>
              ))}
            </div>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s', flexShrink: 0 }}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onClick={switchRole} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--muted)', fontWeight: 500, WebkitTapHighlightColor: 'transparent' }}>
              ⇄
            </button>
          </div>
        </div>

        <div key={pathname} style={{ padding: '14px 14px 0' }} className="anim-page-in">
          {children}
        </div>

        {/* Bottom Nav */}
        <nav className="app-nav" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, display: 'flex', boxShadow: '0 -4px 20px rgba(15,23,42,0.08)' }}>
          {tabs.map(tab => {
            const active = pathname === tab.path
            return (
              <button key={tab.path} onClick={() => router.push(tab.path)} style={{ flex: 1, padding: '10px 4px 8px', border: 'none', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: active ? 'var(--primary)' : 'var(--muted)', fontSize: 10, fontWeight: active ? 700 : 500, cursor: 'pointer', position: 'relative', transition: 'color 0.15s', WebkitTapHighlightColor: 'transparent' }}>
                {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 3, borderRadius: '0 0 3px 3px', background: 'var(--primary)' }} />}
                <span style={{ fontSize: 22, filter: active ? 'none' : 'grayscale(0.3) opacity(0.7)', transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)', transform: active ? 'scale(1.12)' : 'scale(1)', display: 'block' }}>{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>
    </AppContext.Provider>
  )
}
