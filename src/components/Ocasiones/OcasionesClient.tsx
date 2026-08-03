'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const CATS = ['VACUNO','CERDO','POLLO','PAPAS','JUMBALAY','PACKS','CORTES','EMBUTIDOS','CONGELADOS', 'ALMACEN', 'ENCURTIDOS', 'FIAMBRES', 'QUESOS', 'PIZZAS', 'EMPANADAS']

type Ocasion = {
  id: number
  nombre: string
  descripcion: string | null
  icono: string | null
  categorias: string[]
  activo: boolean
  orden: number
}

const b = (v?:'gold'|'red'|'green'): React.CSSProperties => ({ padding:'8px 12px',borderRadius:6,border:`1px solid ${v==='gold'?'var(--gold)':v==='red'?'rgba(190,50,50,.25)':v==='green'?'rgba(30,140,70,.25)':'var(--border)'}`,background:v==='gold'?'var(--gold)':v==='red'?'rgba(190,50,50,.10)':v==='green'?'rgba(30,140,70,.10)':'var(--card)',color:v==='gold'?'#0f0f0f':v==='red'?'#aa2020':v==='green'?'#1a7a40':'var(--text)',cursor:'pointer',fontSize:12,fontFamily:'Georgia,serif' })
const lbl: React.CSSProperties = { fontSize:11,color:'var(--muted)',display:'block',marginBottom:4 }
const overlay: React.CSSProperties = { display:'flex',position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,alignItems:'center',justifyContent:'center',padding:'16px' }
const mbox: React.CSSProperties = { background:'var(--card)',border:'1px solid var(--gold-d)',borderRadius:12,padding:22,width:'100%',maxWidth:520,maxHeight:'88vh',overflowY:'auto',boxSizing:'border-box' as const }

export function OcasionesClient() {
  const [ocasiones, setOcasiones] = useState<Ocasion[]>([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState<'nuevo'|'editar'|null>(null)
  const [edit, setEdit] = useState<Ocasion | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setCargando(true)
    const { data } = await supabase.from('ocasiones' as any).select('*').order('orden')
    setOcasiones((data as any) || [])
    setCargando(false)
  }

  function abrirNuevo() {
    setEdit({ id: 0, nombre: '', descripcion: '', icono: '🍴', categorias: [], activo: true, orden: (ocasiones.length ? Math.max(...ocasiones.map(o => o.orden)) + 1 : 1) })
    setModal('nuevo')
  }

  function abrirEditar(o: Ocasion) {
    setEdit({ ...o })
    setModal('editar')
  }

  function toggleCat(cat: string) {
    setEdit(prev => {
      if (!prev) return prev
      const tiene = prev.categorias.includes(cat)
      return { ...prev, categorias: tiene ? prev.categorias.filter(c => c !== cat) : [...prev.categorias, cat] }
    })
  }

  async function guardar() {
    if (!edit) return
    if (!edit.nombre.trim()) { alert('Ingresá un nombre'); return }
    if (!edit.categorias.length) { alert('Elegí al menos una categoría'); return }
    setGuardando(true)
    try {
      if (modal === 'nuevo') {
        await supabase.from('ocasiones' as any).insert({
          nombre: edit.nombre, descripcion: edit.descripcion, icono: edit.icono,
          categorias: edit.categorias, activo: edit.activo, orden: edit.orden,
        } as any)
      } else {
        await supabase.from('ocasiones' as any).update({
          nombre: edit.nombre, descripcion: edit.descripcion, icono: edit.icono,
          categorias: edit.categorias, activo: edit.activo, orden: edit.orden,
        } as any).eq('id', edit.id)
      }
      setModal(null); setEdit(null); load()
    } catch (e) { alert('Error al guardar') }
    setGuardando(false)
  }

  async function toggleActivo(o: Ocasion) {
    await supabase.from('ocasiones' as any).update({ activo: !o.activo } as any).eq('id', o.id)
    setOcasiones(prev => prev.map(x => x.id === o.id ? { ...x, activo: !x.activo } : x))
  }

  async function eliminar(o: Ocasion) {
    if (!confirm(`¿Eliminar "${o.nombre}"? Esto no se puede deshacer.`)) return
    await supabase.from('ocasiones' as any).delete().eq('id', o.id)
    load()
  }

  if (cargando) return <div style={{ color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', textTransform: 'uppercase' }}>Ocasiones de compra</div>
        <button onClick={abrirNuevo} style={{ ...b('gold'), whiteSpace: 'nowrap' }}>+ Ocasión</button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, padding: '10px 12px', background: 'var(--bg)', borderRadius: 6, lineHeight: 1.5 }}>
        Estos son los accesos rápidos que ven los clientes arriba del catálogo en la tienda (ej: "Cena de hoy", "Freezer lleno"). Cada uno agrupa una o más categorías de producto. Solo se muestran las que estén activas.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ocasiones.map(o => (
          <div key={o.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', opacity: o.activo ? 1 : 0.5 }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>{o.icono || '🍴'}</div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 14, fontWeight: 'bold' }}>{o.nombre}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{o.descripcion}</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {o.categorias.map(c => (
                  <span key={c} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>{c}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => toggleActivo(o)} style={{ ...b(o.activo ? 'green' : undefined), padding: '4px 8px', fontSize: 11 }}>
                {o.activo ? 'Activa' : 'Inactiva'}
              </button>
              <button onClick={() => abrirEditar(o)} style={{ ...b(), padding: '4px 8px', fontSize: 11 }}>✏️ Editar</button>
              <button onClick={() => eliminar(o)} style={{ ...b('red'), padding: '4px 8px', fontSize: 11 }}>🗑️</button>
            </div>
          </div>
        ))}
        {!ocasiones.length && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Todavía no hay ocasiones cargadas.</div>}
      </div>

      {modal && edit && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) { setModal(null); setEdit(null) } }}>
          <div style={mbox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', textTransform: 'uppercase' }}>{modal === 'nuevo' ? 'Nueva ocasión' : 'Editar ocasión'}</div>
              <button onClick={() => { setModal(null); setEdit(null) }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={lbl}>Ícono</label><input value={edit.icono || ''} onChange={e => setEdit(prev => prev ? { ...prev, icono: e.target.value } : prev)} placeholder="🍽️" style={{ textAlign: 'center' }} /></div>
              <div><label style={lbl}>Nombre</label><input value={edit.nombre} onChange={e => setEdit(prev => prev ? { ...prev, nombre: e.target.value } : prev)} placeholder="ej: Cena de hoy" /></div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Descripción corta</label>
              <input value={edit.descripcion || ''} onChange={e => setEdit(prev => prev ? { ...prev, descripcion: e.target.value } : prev)} placeholder="ej: Listo para cocinar ya" />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Orden (menor = aparece primero)</label>
              <input type="number" value={edit.orden} onChange={e => setEdit(prev => prev ? { ...prev, orden: parseInt(e.target.value) || 0 } : prev)} style={{ width: 100 }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Categorías incluidas</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATS.map(c => (
                  <button key={c} type="button" onClick={() => toggleCat(c)}
                    style={{ padding: '5px 11px', borderRadius: 6, fontSize: 11, fontFamily: 'Georgia,serif', cursor: 'pointer',
                      border: edit.categorias.includes(c) ? '1px solid var(--gold)' : '1px solid var(--border)',
                      background: edit.categorias.includes(c) ? 'var(--gold-bg)' : 'var(--card)',
                      color: edit.categorias.includes(c) ? 'var(--gold)' : 'var(--muted)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <input type="checkbox" id="chk-activo-oc" checked={edit.activo} onChange={e => setEdit(prev => prev ? { ...prev, activo: e.target.checked } : prev)} />
              <label htmlFor="chk-activo-oc" style={{ fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>Visible en la tienda</label>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setModal(null); setEdit(null) }} style={{ ...b(), flex: 1 }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ ...b('gold'), flex: 1, opacity: guardando ? 0.6 : 1 }}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
