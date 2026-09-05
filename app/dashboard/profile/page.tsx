'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Profile = { full_name: string; phone: string; birth_date: string; store_name: string; address: string }

export default function ProfilePage() {
  const { lang, store, refreshStore } = useApp()
  const T = t[lang]
  const [profile, setProfile] = useState<Profile>({ full_name: '', phone: '', birth_date: '', store_name: '', address: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passSuccess, setPassSuccess] = useState('')
  const [passError, setPassError] = useState('')

  // Kaspi settings
  const [kaspiNumber, setKaspiNumber] = useState(store.kaspi_number || '')
  const [kaspiQr, setKaspiQr] = useState(store.kaspi_qr_url || '')
  const [kaspiSaving, setKaspiSaving] = useState(false)
  const [kaspiSuccess, setKaspiSuccess] = useState('')
  const [qrUploading, setQrUploading] = useState(false)

  // Owner password
  const [ownerPwd1, setOwnerPwd1] = useState('')
  const [ownerPwd2, setOwnerPwd2] = useState('')
  const [ownerPwdSaving, setOwnerPwdSaving] = useState(false)
  const [ownerPwdSuccess, setOwnerPwdSuccess] = useState('')
  const [ownerPwdError, setOwnerPwdError] = useState('')

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (data) setProfile({ full_name: data.full_name || '', phone: data.phone || '', birth_date: data.birth_date || '', store_name: data.store_name || '', address: data.address || '' })
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true); setSuccess('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('profiles').upsert({ id: session.user.id, ...profile })
    await supabase.from('clients').update({ store_name: profile.store_name, phone: profile.phone }).eq('email', session.user.email!)
    setSaving(false)
    setSuccess(lang === 'kz' ? 'Сақталды!' : 'Сохранено!')
    setTimeout(() => setSuccess(''), 3000)
  }

  async function changePassword() {
    if (!oldPassword || !newPassword || !newPassword2) { setPassError(lang === 'kz' ? 'Барлық өрісті толтырыңыз' : 'Заполните все поля'); return }
    if (newPassword !== newPassword2) { setPassError(lang === 'kz' ? 'Парольдер сәйкес емес' : 'Пароли не совпадают'); return }
    if (newPassword.length < 6) { setPassError(lang === 'kz' ? 'Кемінде 6 таңба' : 'Минимум 6 символов'); return }
    setPassLoading(true); setPassError(''); setPassSuccess('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: session.user.email!, password: oldPassword })
    if (signInError) { setPassError(lang === 'kz' ? 'Ескі пароль қате' : 'Старый пароль неверный'); setPassLoading(false); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPassError(error.message); setPassLoading(false); return }
    setOldPassword(''); setNewPassword(''); setNewPassword2('')
    setPassLoading(false)
    setPassSuccess(lang === 'kz' ? 'Пароль өзгертілді!' : 'Пароль изменён!')
    setTimeout(() => setPassSuccess(''), 3000)
  }

  function handleQrFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setQrUploading(true)
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 400
      const scale = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      setKaspiQr(dataUrl)
      URL.revokeObjectURL(url)
      setQrUploading(false)
    }
    img.onerror = () => { URL.revokeObjectURL(url); setQrUploading(false) }
    img.src = url
    e.target.value = ''
  }

  async function saveKaspi() {
    setKaspiSaving(true); setKaspiSuccess('')
    const supabase = createClient()
    await supabase.from('stores').update({ kaspi_number: kaspiNumber || null, kaspi_qr_url: kaspiQr || null }).eq('id', store.id)
    await refreshStore()
    setKaspiSaving(false)
    setKaspiSuccess(lang === 'kz' ? 'Сақталды!' : 'Сохранено!')
    setTimeout(() => setKaspiSuccess(''), 3000)
  }

  async function saveOwnerPwd() {
    if (!ownerPwd1 || !ownerPwd2) { setOwnerPwdError(lang === 'kz' ? 'Барлық өрісті толтырыңыз' : 'Заполните все поля'); return }
    if (ownerPwd1 !== ownerPwd2) { setOwnerPwdError(lang === 'kz' ? 'Парольдер сәйкес емес' : 'Пароли не совпадают'); return }
    if (ownerPwd1.length < 4) { setOwnerPwdError(lang === 'kz' ? 'Кемінде 4 таңба' : 'Минимум 4 символа'); return }
    setOwnerPwdSaving(true); setOwnerPwdError(''); setOwnerPwdSuccess('')
    const supabase = createClient()
    await supabase.from('stores').update({ owner_password: ownerPwd1 }).eq('id', store.id)
    await refreshStore()
    setOwnerPwd1(''); setOwnerPwd2('')
    setOwnerPwdSaving(false)
    setOwnerPwdSuccess(lang === 'kz' ? 'Пароль өзгертілді!' : 'Пароль изменён!')
    setTimeout(() => setOwnerPwdSuccess(''), 3000)
  }

  if (loading) return <p className="text-muted">{T.loading}</p>

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{lang === 'kz' ? 'Жеке кабинет' : 'Личный кабинет'}</h2>

      <div className="card">
        <div className="section-title">{lang === 'kz' ? 'Жеке мәліметтер' : 'Личные данные'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: lang === 'kz' ? 'Аты-жөні' : 'ФИО', key: 'full_name', type: 'text' },
            { label: lang === 'kz' ? 'Телефон номері' : 'Номер телефона', key: 'phone', type: 'text' },
            { label: lang === 'kz' ? 'Туған күні' : 'Дата рождения', key: 'birth_date', type: 'date' },
            { label: lang === 'kz' ? 'Дүкен аты' : 'Название магазина', key: 'store_name', type: 'text' },
            { label: lang === 'kz' ? 'Мекен-жай' : 'Адрес', key: 'address', type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>{f.label}</label>
              <input type={f.type} value={(profile as any)[f.key]} onChange={e => setProfile({ ...profile, [f.key]: e.target.value })} />
            </div>
          ))}
          {success && <p style={{ color: 'var(--primary)', fontSize: 13 }}>✓ {success}</p>}
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
            {saving ? T.loading : (lang === 'kz' ? 'Сақтау' : 'Сохранить')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">📱 Kaspi</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>
              {lang === 'kz' ? 'Kaspi нөмірі' : 'Номер Kaspi'}
            </label>
            <input placeholder="+7 777 123 45 67" value={kaspiNumber} onChange={e => setKaspiNumber(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, display: 'block' }}>
              {lang === 'kz' ? 'QR код суреті' : 'Изображение QR-кода'}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {kaspiQr ? (
                <div style={{ position: 'relative' }}>
                  <img src={kaspiQr} alt="Kaspi QR" style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: 16, border: '2px solid var(--border)' }} />
                  <button onClick={() => setKaspiQr('')} style={{ position: 'absolute', top: -8, right: -8, width: 26, height: 26, borderRadius: '50%', background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×</button>
                </div>
              ) : (
                <div style={{ width: 180, height: 180, borderRadius: 16, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)' }}>
                  <span style={{ fontSize: 36 }}>🖼️</span>
                  <span style={{ fontSize: 12 }}>{lang === 'kz' ? 'QR жоқ' : 'QR не загружен'}</span>
                </div>
              )}
              <label style={{ display: 'block', cursor: 'pointer' }}>
                <input type="file" accept="image/*" onChange={handleQrFileChange} style={{ display: 'none' }} />
                <div style={{ padding: '10px 20px', borderRadius: 12, border: '1.5px solid var(--primary)', color: 'var(--primary)', fontWeight: 600, fontSize: 14, background: 'var(--primary-light)', cursor: 'pointer' }}>
                  {qrUploading ? (lang === 'kz' ? 'Жүктелуде...' : 'Загрузка...') : (lang === 'kz' ? '📷 Сурет таңдау' : '📷 Выбрать фото')}
                </div>
              </label>
            </div>
          </div>
          {kaspiSuccess && <p style={{ color: 'var(--primary)', fontSize: 13 }}>✓ {kaspiSuccess}</p>}
          <button className="btn btn-primary" onClick={saveKaspi} disabled={kaspiSaving}>
            {kaspiSaving ? T.loading : (lang === 'kz' ? 'Сақтау' : 'Сохранить')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">👑 {lang === 'kz' ? 'Иесі паролі' : 'Пароль владельца'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            {store.owner_password
              ? (lang === 'kz' ? 'Иесі парольін өзгертіңіз' : 'Изменить пароль владельца')
              : (lang === 'kz' ? 'Иесі паролі белгіленбеген' : 'Пароль владельца не установлен')}
          </p>
          <input type="password" placeholder={lang === 'kz' ? 'Жаңа пароль' : 'Новый пароль'} value={ownerPwd1} onChange={e => setOwnerPwd1(e.target.value)} />
          <input type="password" placeholder={lang === 'kz' ? 'Қайталаңыз' : 'Повторите'} value={ownerPwd2} onChange={e => setOwnerPwd2(e.target.value)} />
          {ownerPwdError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{ownerPwdError}</p>}
          {ownerPwdSuccess && <p style={{ color: 'var(--primary)', fontSize: 13 }}>✓ {ownerPwdSuccess}</p>}
          <button className="btn btn-primary" onClick={saveOwnerPwd} disabled={ownerPwdSaving}>
            {ownerPwdSaving ? T.loading : (lang === 'kz' ? 'Паролді белгілеу' : 'Установить пароль')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">{lang === 'kz' ? 'Кіру паролін өзгерту' : 'Изменить пароль входа'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" placeholder={lang === 'kz' ? 'Ескі пароль' : 'Старый пароль'} value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
          <input type="password" placeholder={lang === 'kz' ? 'Жаңа пароль' : 'Новый пароль'} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <input type="password" placeholder={lang === 'kz' ? 'Жаңа паролді қайталаңыз' : 'Повторите новый пароль'} value={newPassword2} onChange={e => setNewPassword2(e.target.value)} />
          {passError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{passError}</p>}
          {passSuccess && <p style={{ color: 'var(--primary)', fontSize: 13 }}>✓ {passSuccess}</p>}
          <button className="btn btn-primary" onClick={changePassword} disabled={passLoading}>
            {passLoading ? T.loading : (lang === 'kz' ? 'Паролді өзгерту' : 'Изменить пароль')}
          </button>
        </div>
      </div>
    </div>
  )
}
