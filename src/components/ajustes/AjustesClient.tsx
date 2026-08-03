'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const b = (v?:'gold'|'red'|'green'): React.CSSProperties => ({ padding:'8px 12px',borderRadius:6,border:`1px solid ${v==='gold'?'var(--gold)':v==='red'?'rgba(190,50,50,.25)':v==='green'?'rgba(30,140,70,.25)':'var(--border)'}`,background:v==='gold'?'var(--gold)':v==='red'?'rgba(190,50,50,.10)':v==='green'?'rgba(30,140,70,.10)':'var(--card)',color:v==='gold'?'#0f0f0f':v==='red'?'#aa2020':v==='green'?'#1a7a40':'var(--text)',cursor:'pointer',fontSize:12,fontFamily:'Georgia,serif' })
const lbl: React.CSSProperties = { fontSize:11,color:'var(--muted)',display:'block',marginBottom:4 }

export function AjustesClient() {
  const [logoUrl, setLogoUrl] = useState('')
  const [logoUrlGuardada, setLogoUrlGuardada] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setCargando(true)
    const { data } = await supabase.from('tienda_ajustes').select('*').eq('id', 1).single()
    const url = (data as any)?.logo_url || ''
    setLogoUrl(url)
    setLogoUrlGuardada(url)
    setCargando(false)
  }

  async function guardar() {
    setGuardando(true)
    setMensaje('')
    const { error } = await supabase.from('tienda_ajustes').update({ logo_url: logoUrl || null } as any).eq('id', 1)
    if (error) {
      setMensaje('Error al guardar. Si es la primera vez, puede que falte la columna logo_url en la tabla tienda_ajustes (pedile a Dario que corra la migración).')
    } else {
      setLogoUrlGuardada(logoUrl)
      setMensaje('✓ Logo actualizado. Puede tardar un minuto en verse en la tienda.')
    }
    setGuardando(false)
  }

  if (cargando) return <div style={{ color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>
        Ajustes de la tienda
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 18 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#fff', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
          }}>
            {logoUrlGuardada
              ? <img src={logoUrlGuardada} alt="Logo actual" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>sin logo</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            Este es el logo que se muestra en el encabezado de la tienda web.
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={lbl}>URL de la imagen del logo</label>
          <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." style={{ width: '100%' }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
          Para conseguir la URL: subí la imagen a Supabase (Storage → bucket público) o a cualquier servicio de imágenes, y pegá acá el link directo al archivo (que termine en .png o .jpg).
        </div>

        {mensaje && <div style={{ fontSize: 12, color: mensaje.startsWith('✓') ? '#1a7a40' : '#aa2020', marginBottom: 12 }}>{mensaje}</div>}

        <button onClick={guardar} disabled={guardando || logoUrl === logoUrlGuardada} style={{ ...b('gold'), opacity: (guardando || logoUrl === logoUrlGuardada) ? 0.6 : 1 }}>
          {guardando ? 'Guardando…' : 'Guardar logo'}
        </button>
      </div>
    </div>
  )
}
