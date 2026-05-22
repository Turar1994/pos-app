'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { t } from '@/lib/lang'

type Profile = {
  full_name: string
  phone: string
  birth_date: string
  store_name: string
  address: string
}

export default function ProfilePage() {
  const { lang } = useApp()
  const T = t[lang]
  const [profile, setProfile] = useState<Profile>({ full_name: '', phone: '', birth_date: '', store_name: '', address: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passSuccess, setPassSuccess] = useState('')
  const [passError, setPassError] = useState('')

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
    setSaving(false); setSuccess(lang === 'kz' ? 'Сақталды!' : 'Сохранено!')
    setTimeout(() => setSuccess(''), 3000)
  }

  async function changePassword() {
    if (!newPassword || !newPassword2) { setPassError(lang === 'kz' ? 'Барлық өрісті толтырыңыз' : 'Заполните все поля'); return }
    if (newPassword !== newPassword2) { setPassError(lang === 'kz' ? 'Парольдер сәйкес емес' : 'Пароли не совпадают'); return }
    if (newPassword.length < 6) { setPassError(lang === 'kz' ? 'Кемінде 6 таңба' : 'Минимум 6 символов'); return }
    setPassLoading(true); setPassError(''); setPassSuccess('')
    const { error } = await createClient().auth.updateUser({ password: newPassword })
    if (error) { setPassError(error.message); setPassLoading(false); return }
    setNewPassword(''); setNewPassword2(''); setPassLoading(false)
    setPassSuccess(lang === 'kz' ? 'Пароль өзгертілді!' : 'Пароль изменён!')
    setTimeout(() => setPassSuccess(''), 3000)
  }

  if (loading) return <p className="text-muted">{T.loading}</p>

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        {lang === 'kz' ? 'Жеке кабинет' : 'Личный кабинет'}
      </h2>
      <div className="card">
        <div className="section-title">{lang === 'kz' ? 'Жеке мәліметтер' : 'Личные данные'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>{lang === 'kz' ? 'Аты-жөні' : 'ФИО'}</label>
            <input value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>{lang === 'kz' ? 'Телефон номері' : 'Номер телефона'}</label>
            <input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>{lang === 'kz' ? 'Туған күні' : 'Дата рождения'}</label>
            <input type="date" value={profile.birth_date} onChange={e => setProfile({ ...profile, birth_date: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>{lang === 'kz' ? 'Дүкен аты' : 'Название магазина'}</label>
            <input value={profile.store_name} onChange={e => setProfile({ ...profile, store_name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>{lang === 'kz' ? 'Мекен-жай' : 'Адрес'}</label>
            <input value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} />
          </div>
          {success && <p style={{ color: '#0F6E56', fontSize: 13 }}>✓ {success}</p>}
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
            {saving ? T.loading : (lang === 'kz' ? 'Сақтау' : 'Сохранить')}
          </button>
        </div>
      </div>
      <div className="card">
        <div className="section-title">{lang === 'kz' ? 'Пароль өзгерту' : 'Изменить пароль'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" placeholder={lang === 'kz' ? 'Жаңа пароль' : 'Новый пароль'} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <input type="password" placeholder={lang === 'kz' ? 'Жаңа паролді қайталаңыз' : 'Повторите новый пароль'} value={newPassword2} onChange={e => setNewPassword2(e.target.value)} />
          {passError && <p style={{ color: '#D85A30', fontSize: 13 }}>{passError}</p>}
          {passSuccess && <p style={{ color: '#0F6E56', fontSize: 13 }}>✓ {passSuccess}</p>}
          <button className="btn btn-primary" onClick={changePassword} disabled={passLoading}>
            {passLoading ? T.loading : (lang === 'kz' ? 'Паролді өзгерту' : 'Изменить пароль')}
          </button>
        </div>
      </div>
    </div>
  )
}
