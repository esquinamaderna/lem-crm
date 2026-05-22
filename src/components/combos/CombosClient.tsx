'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, round500 } from '@/lib/utils'
import type { Producto } from '@/types/database'

interface ComboItem {
  id?: number
  producto_id: number
  producto_nombre: string
  cantidad_kg: number
  precio_unit: number // precio/kg del producto
}

interface Combo {
  id: number
  nombre: string
  descripcion: string
  precio: number
  descuento_pct: number
  activo: boolean
  color: string
  combo_items?: ComboItem[]
}

const COLORES = [
  { label: 'Azul',     val: '#3266ad' },
  { label: 'Naranja',  val: '#d85a30' },
  { label: 'Verde',    val: '#1d9e75' },
  { label: 'Violeta',  val: '#7f77dd' },
  { label: 'Dorado',   val: '#9a7a1a' },
  { label: 'Rojo',     val: '#aa2020' },
]

const b = (v?: 'gold'|'red'|'green'|'blue'): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif',
  border: v==='gold' ? '1px solid var(--gold)' : v==='red' ? '1px solid rgba(190,50,50,.3)' : v==='green' ? '1px solid rgba(30,140,70,.3)' : v==='blue' ? '1px solid rgba(30,100,180,.3)' : '1px solid var(--border)',
  background: v==='gold' ? 'var(--gold)' : v==='red' ? 'rgba(190,50,50,.08)' : v==='green' ? 'rgba(30,140,70,.08)' : v==='blue' ? 'rgba(30,100,180,.08)' : 'var(--card)',
  color: v==='gold' ? '#fff' : v==='red' ? '#aa2020' : v==='green' ? '#1a7a40' : v==='blue' ? '#1050a0' : 'var(--text)',
})
const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }

export function CombosClient() {
  const [combos, setCombos] = useState<Combo[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [modal, setModal] = useState<'nuevo'|'editar'|null>(null)
  const [editando, setEditando] = useState<Combo|null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [fNombre, setFNombre] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fDescPct, setFDescPct] = useState(12)
  const [fPrecioManual, setFPrecioManual] = useState('')
  const [fColor, setFColor] = useState('#3266ad')
  const [fItems, setFItems] = useState<ComboItem[]>([])
  const [fProdSel, setFProdSel] = useState('')
  const [fCantidad, setFCantidad] = useState(0.25)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('combos').select('*, combo_items(*)').order('nombre'),
      supabase.from('productos').select('*').eq('activo', true).order('nombre'),
    ])
    setCombos((c || []) as Combo[])
    setProductos((p || []) as Produto[])
  }

  // Precio sugerido = suma(componentes) × (1 - descuento%) → ceil 500
  const precioSugerido = fItems.length > 0
    ? round500(fItems.reduce((s, i) => s + i.precio_unit * i.cantidad_kg, 0) * (1 - fDescPct / 100))
    : 0

  const precioFinal = fPrecioManual ? (parseFloat(fPrecioManual) || 0) : precioSugerido

  function abrirNuevo() {
    setEditando(null)
    setFNombre(''); setFDesc(''); setFDescPct(12); setFPrecioManual('')
    setFColor('#3266ad'); setFItems([]); setFProdSel(''); setFCantidad(0.25)
    setModal('nuevo')
  }

  function abrirEditar(c: Combo) {
    setEditando(c)
    setFNombre(c.nombre); setFDesc(c.descripcion || ''); setFDescPct(c.descuento_pct)
    setFPrecioManual(String(c.precio)); setFColor(c.color || '#3266ad')
    setFItems((c.combo_items || []).map(i => ({
      id: i.id,
      producto_id: i.producto_id,
      producto_nombre: i.producto_nombre,
      cantidad_kg: i.cantidad_kg,
      precio_unit: (productos.find(p => p.id === i.producto_id) as any)?.precio_venta || 0,
    })))
    setModal('editar')
  }

  function addItem() {
    const id = parseInt(fProdSel)
    const p = productos.find((x: any) => x.id === id)
    if (!p || !fCantidad) return
    setFItems(prev => {
      const ex = prev.find(i => i.producto_id === id)
      if (ex) return prev.map(i => i.producto_id === id ? { ...i, cantidad_kg: parseFloat((i.cantidad_kg + fCantidad).toFixed(3)) } : i)
      return [...prev, { producto_id: id, producto_nombre: (p as any).nombre, cantidad_kg: fCantidad, precio_unit: (p as any).precio_venta }]
    })
    setFProdSel('')
  }

  async function guardar() {
    if (!fNombre.trim()) { alert('Ingresá el nombre del combo'); return }
    if (!fItems.length) { alert('Agregá al menos un componente'); return }
    if (!precioFinal) { alert('El precio no puede ser 0'); return }
    setSaving(true)
    try {
      const data = { nombre: fNombre.trim(), descripcion: fDesc, precio: precioFinal, descuento_pct: fDescPct, color: fColor, activo: true }
      if (editando) {
        await supabase.from('combos').update(data).eq('id', editando.id)
        await supabase.from('combo_items').delete().eq('combo_id', editando.id)
        await supabase.from('combo_items').insert(fItems.map(i => ({ combo_id: editando.id, producto_id: i.producto_id, producto_nombre: i.producto_nombre, cantidad_kg: i.cantidad_kg })))
      } else {
        const { data: cb } = await supabase.from('combos').insert(data).select().single()
        if (cb) await supabase.from('combo_items').insert(fItems.map(i => ({ combo_id: cb.id, producto_id: i.producto_id, producto_nombre: i.producto_nombre, cantidad_kg: i.cantidad_kg })))
      }
      setModal(null); load()
    } catch (e) { console.error(e); alert('Error al guardar') }
    setSaving(false)
  }

  async function toggleActivo(id: number, activo: boolean) {
    await supabase.from('combos').update({ activo: !activo }).eq('id', id)
    load()
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este combo?')) return
    await supabase.from('combos').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Combos y porciones</div>
          <div style={{ fontSize: 12, color: 'var(--dim)' }}>{combos.filter(c => c.activo).length} activos · {combos.length} total</div>
        </div>
        <button onClick={abrirNuevo} style={{ ...b('gold'), padding: '8px 18px' }}>+ Nuevo combo</button>
      </div>

      {/* Grilla de combos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
        {combos.map(c => (
          <div key={c.id} style={{ background: 'var(--card)', border: `1px solid var(--border)`, borderRadius: 8, padding: 16, boxShadow: 'var(--shadow)', opacity: c.activo ? 1 : 0.55, borderTop: `3px solid ${c.color || '#7f77dd'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', flex: 1, paddingRight: 8 }}>{c.nombre}</div>
              <div style={{ fontSize: 18, color: c.color || 'var(--gold)', fontWeight: 'bold', flexShrink: 0 }}>{fmt(c.precio)}</div>
            </div>

            {c.descripcion && <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{c.descripcion}</div>}

            {/* Componentes */}
            <div style={{ marginBottom: 10 }}>
              {(c.combo_items || []).map((i, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid var(--borderl)', color: 'var(--muted)' }}>
                  <span>{i.producto_nombre}</span>
                  <span>{fmtN(i.cantidad_kg * 1000, 0)} g</span>
                </div>
              ))}
            </div>

            {c.descuento_pct > 0 && (
              <div style={{ fontSize: 11, color: '#1a7a40', marginBottom: 8 }}>✓ {c.descuento_pct}% descuento sobre precio de lista</div>
            )}

            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button onClick={() => abrirEditar(c)} style={{ ...b(), padding: '4px 10px', fontSize: 11, flex: 1 }}>✏ Editar</button>
              <button onClick={() => toggleActivo(c.id, c.activo)} style={{ ...b(c.activo ? undefined : 'green'), padding: '4px 10px', fontSize: 11, flex: 1 }}>
                {c.activo ? 'Desactivar' : '✓ Activar'}
              </button>
              <button onClick={() => eliminar(c.id)} style={{ ...b('red'), padding: '4px 8px', fontSize: 11 }}>✕</button>
            </div>
          </div>
        ))}

        {combos.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--dim)', padding: 40, fontSize: 13 }}>
            No hay combos creados aún. Creá el primero con el botón de arriba.
          </div>
        )}
      </div>

      {/* Modal nuevo/editar */}
      {modal && (
        <div style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--gold-d)', borderRadius: 12, padding: 22, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>
                {modal === 'nuevo' ? 'Nuevo combo' : 'Editar combo'}
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>

            {/* Nombre y descripción */}
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Nombre del combo *</label>
              <input value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="ej: Porción Milanesa + Papas" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Descripción (opcional)</label>
              <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="ej: Milanesa de pollo 250g + Papas 100g" />
            </div>

            {/* Color */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Color en el POS</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLORES.map(col => (
                  <button key={col.val} onClick={() => setFColor(col.val)}
                    style={{ width: 32, height: 32, borderRadius: 6, background: col.val, border: fColor === col.val ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer', title: col.label }} />
                ))}
              </div>
            </div>

            {/* Componentes */}
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Componentes</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <select value={fProdSel} onChange={e => setFProdSel(e.target.value)} style={{ flex: 2 }}>
                <option value="">— Seleccionar producto —</option>
                {productos.map((p: any) => <option key={p.id} value={p.id}>{p.nombre} · {fmt(p.precio_venta)}/kg</option>)}
              </select>
              <input type="number" value={fCantidad} onChange={e => setFCantidad(parseFloat(e.target.value) || 0.1)}
                min={0.05} step={0.05} style={{ width: 80 }} placeholder="kg" />
              <button onClick={addItem} style={{ ...b('green'), whiteSpace: 'nowrap' }}>+ Agregar</button>
            </div>

            {fItems.length > 0 && (
              <div style={{ marginBottom: 14, background: 'var(--bg)', borderRadius: 8, padding: 12 }}>
                {fItems.map((i, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--borderl)', fontSize: 13 }}>
                    <div style={{ flex: 1 }}>{i.producto_nombre}</div>
                    <input type="number" value={i.cantidad_kg} min={0.05} step={0.05}
                      onChange={e => setFItems(prev => prev.map((x, j) => j === idx ? { ...x, cantidad_kg: parseFloat(e.target.value) || 0.1 } : x))}
                      style={{ width: 70, fontSize: 12, padding: '3px 6px' }} />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>kg</span>
                    <span style={{ fontSize: 12, color: 'var(--gold)', minWidth: 70, textAlign: 'right' }}>{fmt(i.precio_unit * i.cantidad_kg)}</span>
                    <button onClick={() => setFItems(prev => prev.filter((_, j) => j !== idx))}
                      style={{ color: '#aa2020', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--muted)', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                  <span>Total lista sin descuento</span>
                  <span>{fmt(fItems.reduce((s, i) => s + i.precio_unit * i.cantidad_kg, 0))}</span>
                </div>
              </div>
            )}

            {/* Precio */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Descuento sobre lista (%)</label>
                <input type="number" value={fDescPct} onChange={e => { setFDescPct(parseFloat(e.target.value) || 0); setFPrecioManual('') }}
                  min={0} max={50} step={1} />
              </div>
              <div>
                <label style={lbl}>Precio final (editable)</label>
                <input type="number" value={fPrecioManual || precioSugerido} onChange={e => setFPrecioManual(e.target.value)}
                  placeholder={String(precioSugerido)} />
              </div>
            </div>

            {/* Preview precio */}
            {fItems.length > 0 && (
              <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--gold-bg)', border: '1px solid var(--gold-d)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--muted)' }}>Total lista</span>
                  <span style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>{fmt(fItems.reduce((s, i) => s + i.precio_unit * i.cantidad_kg, 0))}</span>
                </div>
                {fDescPct > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#1a7a40' }}>
                    <span>Descuento {fDescPct}%</span>
                    <span>−{fmt(fItems.reduce((s, i) => s + i.precio_unit * i.cantidad_kg, 0) * fDescPct / 100)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: 'var(--gold)', fontWeight: 'bold' }}>
                  <span>Precio del combo</span>
                  <span>{fmt(precioFinal)}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>Redondeado al múltiplo de $500 más cercano hacia arriba</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ ...b(), flex: 1 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ ...b('gold'), flex: 2, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Guardando...' : modal === 'nuevo' ? 'Crear combo' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
