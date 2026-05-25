'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { t, Lang } from '@/lib/lang'

export default function AuthPage() {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('kz')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const T = t[lang]

  // Login fields
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register fields
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [regBirth, setRegBirth] = useState('')
  const [regStore, setRegStore] = useState('')
  const [regAddress, setRegAddress] = useState('')

  function phoneToEmail(phone: string) {
    // Барлық цифрлерді алу
    let clean = phone.replace(/\D/g, '')
    // 8 немесе 7 басталса — алып тастап, 7 қосу
    if (clean.startsWith('8')) clean = '7' + clean.slice(1)
    if (clean.startsWith('77')) clean = clean // дұрыс
    if (clean.length === 10) clean = '7' + clean // 10 сан болса 7 қос
    // Тек соңғы 10 санды алу (қосымша 7 болса)
    if (clean.length > 11) clean = clean.slice(-11)
    return `${clean}@pos.kz`
  }

  async function handleLogin() {
    if (!loginPhone || !loginPassword) { setError(T.fillAll); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const email = phoneToEmail(loginPhone)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password: loginPassword })
    if (authError || !data.session) {
      setError(lang === 'kz' ? 'Номер немесе пароль қате' : 'Неверный номер или пароль')
      setLoading(false); return
    }

    // Блок тексеру — clients-те жоқ болса да рұқсат жоқ
    const { data: client } = await supabase.from('clients').select('status, subscription_end').eq('email', email).maybeSingle()
    
    if (!client) {
      // clients-те жоқ = жойылған немесе тіркелмеген = рұқсат жоқ
      await supabase.auth.signOut()
      setError(lang === 'kz' ? 'Аккаунтыңыз табылмады. Байланысыңыз: turar.toreniyazov@gmail.com' : 'Аккаунт не найден. Свяжитесь: turar.toreniyazov@gmail.com')
      setLoading(false); return
    }

    if (client.status === 'blocked') {
      await supabase.auth.signOut()
      setError(lang === 'kz' ? 'Аккаунтыңыз блокталған. Байланысыңыз: turar.toreniyazov@gmail.com' : 'Аккаунт заблокирован. Свяжитесь: turar.toreniyazov@gmail.com')
      setLoading(false); return
    }

    if (client.status === 'inactive') {
      await supabase.auth.signOut()
      setError(lang === 'kz' ? 'Аккаунтыңыз әлі белсендірілмеген. Байланысыңыз: turar.toreniyazov@gmail.com' : 'Аккаунт ещё не активирован. Свяжитесь: turar.toreniyazov@gmail.com')
      setLoading(false); return
    }

    if (client.subscription_end && new Date(client.subscription_end) < new Date()) {
      await supabase.auth.signOut()
      setError(lang === 'kz' ? 'Подписка мерзімі өтті. Төлем жасаңыз.' : 'Срок подписки истёк. Произведите оплату.')
      setLoading(false); return
    }

    router.replace('/dashboard')
  }

  async function handleRegister() {
    if (!regPhone || !regPassword || !regName || !regStore) { setError(T.fillAll); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const email = phoneToEmail(regPhone)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password: regPassword })
    if (signUpError) {
      setError(lang === 'kz' ? 'Бұл номер тіркелген' : 'Этот номер уже зарегистрирован')
      setLoading(false); return
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: regName,
        phone: regPhone,
        birth_date: regBirth || null,
        store_name: regStore,
        address: regAddress,
      })
      await supabase.from("clients").update({ store_name: regStore, phone: regPhone, full_name: regName, birth_date: regBirth || null, address: regAddress }).eq("email", email)
    }
    // Тіркелгеннен кейін автоматты кірмейміз — админ белсендіруін күтеміз
    await supabase.auth.signOut()
    setError(lang === 'kz' 
      ? '✅ Тіркелу сәтті! Кіру үшін админ белсендіруін күтіңіз. Байланысыңыз: turar.toreniyazov@gmail.com' 
      : '✅ Регистрация успешна! Ожидайте активации от администратора. Контакт: turar.toreniyazov@gmail.com')
    setLoading(false)
    setIsLogin(true)
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
            }}>{l === 'kz' ? 'ҚАЗ' : 'РУС'}</button>
          ))}
        </div>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>{T.appName}</h1>
      <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
        {isLogin ? T.login : T.register}
      </p>

      {isLogin ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder={lang === 'kz' ? 'Телефон номері (+7...)' : 'Номер телефона (+7...)'}
            value={loginPhone} onChange={e => setLoginPhone(e.target.value)} />
          <input type="password" placeholder={T.password}
            value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder={lang === 'kz' ? 'Телефон номері (+7...)' : 'Номер телефона (+7...)'}
            value={regPhone} onChange={e => setRegPhone(e.target.value)} />
          <input placeholder={lang === 'kz' ? 'Аты-жөні' : 'ФИО'}
            value={regName} onChange={e => setRegName(e.target.value)} />
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>
              {lang === 'kz' ? 'Туған күні' : 'Дата рождения'}
            </label>
            <input type="date" value={regBirth} onChange={e => setRegBirth(e.target.value)} />
          </div>
          <input placeholder={lang === 'kz' ? 'Дүкен аты *' : 'Название магазина *'}
            value={regStore} onChange={e => setRegStore(e.target.value)} />
          <input placeholder={lang === 'kz' ? 'Мекен-жай' : 'Адрес'}
            value={regAddress} onChange={e => setRegAddress(e.target.value)} />
          <input type="password" placeholder={lang === 'kz' ? 'Пароль (кемінде 6 таңба)' : 'Пароль (минимум 6 символов)'}
            value={regPassword} onChange={e => setRegPassword(e.target.value)} />
        </div>
      )}

      {error && <p style={{ color: '#D85A30', fontSize: 13, margin: '12px 0 0' }}>{error}</p>}

      <button className="btn btn-primary" onClick={isLogin ? handleLogin : handleRegister}
        disabled={loading} style={{ marginTop: 16, width: '100%' }}>
        {loading ? T.loading : isLogin ? T.loginBtn : T.registerBtn}
      </button>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#6b7280' }}>
        {isLogin ? T.noAccount : T.hasAccount}{' '}
        <span onClick={() => { setIsLogin(!isLogin); setError('') }}
          style={{ color: '#185FA5', cursor: 'pointer', fontWeight: 500 }}>
          {isLogin ? T.registerBtn : T.loginBtn}
        </span>
      </p>
    </div>
  )
}
