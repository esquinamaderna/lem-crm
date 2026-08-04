'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard')
    })
  }, [router])

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    setCargando(false)
    if (error) { setError('Usuario o contraseña incorrectos.'); return }
    router.replace('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 16 }}>
      <form onSubmit={entrar} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 12, letterSpacing: 2, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' }}>La Esquina de Maderna</div>
        <div style={{ fontSize: 18, marginBottom: 24, textAlign: 'center' }}>Panel interno</div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Contraseña</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} required />
        </div>

        {error && <div style={{ fontSize: 12, color: '#aa2020', marginBottom: 14 }}>{error}</div>}

        <button type="submit" disabled={cargando} style={{
          width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--gold)',
          background: 'var(--gold)', color: '#0f0f0f', cursor: 'pointer', fontSize: 13,
          fontFamily: 'Georgia,serif', opacity: cargando ? 0.6 : 1,
        }}>
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
