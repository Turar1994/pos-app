'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, Lang } from '@/lib/lang'

export default function AuthPage() {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('kz')
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const T = t[lang]

  async function handleSubmit() {
    if (!email || !password) { setError(T.fillAll); return }
    setLoading(true); setError('')
    const supabase = createClient()

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(T.fillAll); setLoading(false); return }

      // Блок тексеру
      const { data: client } = await supabase
        .from('clients').select('status, subscription_end').eq('email', email).single()

      if (client) {
        // Блокталған
        if (client.status === 'blocked') {
          await supabase.auth.signOut()
          setError(lang === 'kz' ? 'Аккаунтыңыз блокталған. Байланысыңыз: +7 XXX XXX XXXX' : 'Ваш аккаунт заблокирован. Свяжитесь: +7 XXX XXX XXXX')
          setLoading(false); return
        }
        // Подписка мерзімі өткен
        if (client.subscription_end && new Date(client.subscription_end) < new Date()) {
          await supabase.auth.signOut()
          setError(lang === 'kz' ? 'Подписка мерзімі өтті. Төлем жасаңыз.' : 'Срок подписки истёк. Произведите оплату.')
          setLoading(false); return
        }
      }

      router.replace('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.replace('/dashboard')
    }
  }

  return (
    <div style={{ padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['kz', 'ru'] as Lang[]).map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: '4px 12px', borderRadius: 99, border: '1px solid #e5e7eb',
              background: lang === l ? '#f3f4f6' : 'transparent',
              fontWeight: lang === l ? 600 : 400, cursor: 'pointer', fontSize: 13
            }}>
              {l === 'kz' ? 'ҚАЗ' : 'РУС'}
            </button>
          ))}
        </div>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>{T.appName}</h1>
      <p style={{ color: '#6b7280', marginBottom: 32, fontSize: 14 }}>
        {isLogin ? T.login : T.register}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <input type="email" placeholder={T.email} value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder={T.password} value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
      </div>

      {error && <p style={{ color: '#D85A30', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? T.loading : isLogin ? T.loginBtn : T.registerBtn}
      </button>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#6b7280' }}>
        {isLogin ? T.noAccount : T.hasAccount}{' '}
        <span onClick={() => setIsLogin(!isLogin)} style={{ color: '#185FA5', cursor: 'pointer', fontWeight: 500 }}>
          {isLogin ? T.registerBtn : T.loginBtn}
        </span>
      </p>
    </div>
  )
}
