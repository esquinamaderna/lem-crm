'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today, nowTime, fechaES } from '@/lib/utils'
import type { OrdenProduccion, Producto } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'
import { useRouter } from 'next/navigation'

const ESTADOS = ['pendiente', 'en_progreso', 'completado'] as const
const ESTADO_COLOR: Record<string, string> = { pendiente: '#9a7a1a', en_progreso: '#1050a0', completado: '#1a7a40', cancelado: '#aa2020' }
const b = (v?: 'gold' | 'blue' | 'red'): React.CSSProperties => ({ padding: '4px 9px', borderRadius: 6, border: `1px solid ${v === 'gold' ? 'var(--gold)' : v === 'blue' ? 'rgba(30,100,180,.25)' : v === 'red' ? 'rgba(190,50,50,.25)' : 'var(--border)'}`, background: v === 'gold' ? 'var(--gold)' : v === 'blue' ? 'rgba(30,100,180,.10)' : v === 'red' ? 'rgba(190,50,50,.10)' : 'var(--card)', color: v === 'gold' ? '#0f0f0f' : v === 'blue' ? '#1050a0' : v === 'red' ? '#aa2020' : 'var(--text)', cursor: 'pointer', fontSize: 11, fontFamily: 'Georgia,serif' })
const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }

// Item de la sesión de producción del día
type SesionItem = { prodId: number; nombre: string; cant: number; lote: string }

export function ProduccionClient() {
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [filtro, setFiltro] = useState('')
  const [modal, setModal] = useState<'sesion' | null>(null)
  const [sesionItems, setSesionItems] = useState<SesionItem[]>([])
  const [sesionFecha, setSesionFecha] = useState(today())
  const [sesionResp, setSesionResp] = useState('')
  const [selProd, setSelProd] = useState('')
  const [selCant, setSelCant] = useState('5')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => { load() }, [filtro])

  async function load() {
    let q = supabase.from('ordenes_produccion').select('*').order('created_at', { ascending: false })
    if (filtro) q = q.eq('estado', filtro)
    const { data } = await q
    setOrdenes(data || [])
    const { data: prods } = await supabase.from('productos').select('*').eq('activo', true).order('nombre')
    const todosProd = prods && prods.length ? prods : PRODUCTOS_DEFAULT.map((p, i) => ({ ...p, id: i + 1 })) as Producto[]
    const CATS_REV = ['JUMBALAY','CORTES','EMBUTIDOS']
    const NOMS_REV = ['Bastones','Caritas','Noisette','Nuggets','Aceituna','Mermelada','Untable','Miel','Pickles','Chutney','Chorizo CSR','Morcilla','Salchicha','Jamón','Salada CSR','Ahumada','Ribs CSR','Colorado CSR','Solomillo','Carré CSR','Pecho CSR','Bondiola CSR','Churrasco CSR','Matambrito','Aceite de Oliva','Tomate Triturado']
    const soloElab = todosProd.filter((p: any) => {
      if (CATS_REV.includes(p.categoria)) return false
      if (p.tipo_producto === 'reventa') return false
      if (NOMS_REV.some((n: string) => (p.nombre || '').startsWith(n))) return false
      return true
    })
    setProductos(soloElab as Producto[])
  }

  function addSesionItem() {
    const id = parseInt(selProd)
    const p = productos.find(x => x.id === id)
    if (!p || !selCant) return
    const cant = parseFloat(selCant)
    // Generar lote automático
    const lote = 'L' + String(ordenes.length + sesionItems.length + 1).padStart(3, '0') + '-' + sesionFecha.replace(/-/g, '').slice(4)
    setSesionItems(prev => [...prev, { prodId: id, nombre: p.nombre, cant, lote }])
  }

  async function guardarSesion() {
    if (!sesionItems.length) return
    setSaving(true)
    try {
      for (const item of sesionItems) {
        const prod = productos.find(p => p.id === item.prodId)
        if (!prod) continue
        const vence = new Date(sesionFecha)
        vence.setDate(vence.getDate() + prod.vida_util_dias)
        const venceISO = vence.toISOString().split('T')[0]
        // Crear orden
        await supabase.from('ordenes_produccion').insert({
          numero_lote: item.lote,
          producto_id: item.prodId,
          producto_nombre: item.nombre,
          cantidad_kg: item.cant,
          fecha_produccion: sesionFecha,
          fecha_vencimiento: venceISO,
          estado: 'completado', // producción del día = ya completado
          responsable: sesionResp,
          etiquetas_generadas: 0,
        })
        // Descontar stock (la producción consume materia prima, el stock se actualiza con el inventario de productos terminados)
        // En este caso, la producción AGREGA al stock del producto terminado
        await supabase.from('productos').update({
          stock_kg: Math.max(0, prod.stock_kg + item.cant),
        }).eq('id', item.prodId)
      }
      setModal(null)
      setSesionItems([])
      load()
    } catch (e) { console.error(e); alert('Error al guardar la producción') }
    setSaving(false)
  }

  async function eliminarOrden(id: number, lote: string) {
    if (!confirm(`¿Eliminar la orden ${lote}?\nEsta acción no se puede deshacer.`)) return
    if (!confirm(`Confirmás que querés eliminar la orden ${lote}?`)) return
    await supabase.from('ordenes_produccion').delete().eq('id', id)
    load()
  }

  async function avanzar(id: number, estadoActual: string) {
    const ci = ESTADOS.indexOf(estadoActual as typeof ESTADOS[number])
    if (ci < ESTADOS.length - 1) {
      await supabase.from('ordenes_produccion').update({ estado: ESTADOS[ci + 1] }).eq('id', id)
      load()
    }
  }

  const overlay: React.CSSProperties = { display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, alignItems: 'center', justifyContent: 'center', padding: '16px' }
  const mbox: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--gold-d)', borderRadius: 12, padding: 22, width: '100%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box' as const }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ width: 160 }}>
            <option value="">Todas las órdenes</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_progreso">En progreso</option>
            <option value="completado">Completado</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/fichas')} style={b()}>+ Nueva desde ficha</button>
          <button onClick={() => { setSesionItems([]); setSesionFecha(today()); setModal('sesion') }} style={{ ...b('gold'), padding: '6px 14px', fontSize: 12 }}>+ Cargar producción</button>
        </div>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
          <thead><tr>{['Lote', 'Producto', 'Cantidad', 'Fecha Prod.', 'Vence', 'Estado', 'Etiquetas', ''].map(h => <th key={h} style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', padding: '7px 10px', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
          <tbody>
            {ordenes.length === 0
              ? <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--dim)', padding: 20 }}>Sin órdenes de producción</td></tr>
              : ordenes.map(o => (
                <tr key={o.id}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--gold)' }}>{o.numero_lote}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{o.producto_nombre}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{fmtN(o.cantidad_kg)} kg</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{fechaES(o.fecha_produccion)}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: '#aa2020' }}>{fechaES(o.fecha_vencimiento)}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, color: ESTADO_COLOR[o.estado] || 'var(--muted)', border: `1px solid ${ESTADO_COLOR[o.estado] || 'var(--muted)'}44`, background: `${ESTADO_COLOR[o.estado] || 'var(--muted)'}18` }}>{o.estado}</span>
                  </td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{o.etiquetas_generadas || 0}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {o.estado === 'pendiente' && <button onClick={() => avanzar(o.id, o.estado)} style={{...b('blue'), padding:'3px 8px', fontSize:10}}>Iniciar</button>}
                      {o.estado === 'en_progreso' && <button onClick={() => avanzar(o.id, o.estado)} style={{...b('green'), padding:'3px 8px', fontSize:10}}>Completar</button>}
                      <button onClick={() => router.push('/etiquetas?orden=' + o.id)} style={b('blue')}>🏷</button>
                      <button onClick={() => eliminarOrden(o.id, o.numero_lote)} style={{padding:'3px 7px',borderRadius:6,border:'1px solid rgba(217,95,95,.3)',background:'rgba(217,95,95,.1)',color:'#aa2020',cursor:'pointer',fontSize:11,fontFamily:'Georgia,serif'}}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal sesión de producción */}
      {modal === 'sesion' && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={mbox}>
            <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>Cargar Producción del Día</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
              <div><label style={lbl}>Fecha de producción</label><input type="date" value={sesionFecha} onChange={e => setSesionFecha(e.target.value)} /></div>
              <div><label style={lbl}>Responsable</label><input value={sesionResp} onChange={e => setSesionResp(e.target.value)} placeholder="Nombre" /></div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>Agregar productos producidos</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <select value={selProd} onChange={e => setSelProd(e.target.value)} style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <option value="">— Seleccionar producto —</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <input type="number" value={selCant} onChange={e => setSelCant(e.target.value)} placeholder="kg" min="0.1" step="0.5" style={{ width: 70, flexShrink: 0 }} />
                <button onClick={addSesionItem} style={b('gold')}>+ Agregar</button>
              </div>

              {sesionItems.length === 0
                ? <div style={{ color: 'var(--dim)', fontSize: 12, textAlign: 'center', padding: 12 }}>Agregá los productos que se produjeron hoy</div>
                : sesionItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--borderl)', fontSize: 13 }}>
                    <div style={{ flex: 1 }}>{item.nombre}</div>
                    <span style={{ color: 'var(--gold)' }}>{fmtN(item.cant)} kg</span>
                    <input value={item.lote} onChange={e => setSesionItems(prev => prev.map((x, j) => j === i ? { ...x, lote: e.target.value } : x))} style={{ width: 100, fontSize: 11, padding: '2px 6px' }} />
                    <button onClick={() => setSesionItems(prev => prev.filter((_, j) => j !== i))} style={{ color: '#aa2020', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </div>
                ))
              }
            </div>

            {sesionItems.length > 0 && (
              <div style={{ background: 'var(--gold-bg)', border: '1px solid var(--gold-d)', borderRadius: 6, padding: 10, marginBottom: 14, fontSize: 12 }}>
                <strong>Resumen:</strong> {sesionItems.length} producto{sesionItems.length !== 1 ? 's' : ''} · {fmt(sesionItems.reduce((s, i) => { const p = productos.find(x => x.id === i.prodId); return s + (p ? p.precio_venta * i.cant : 0) }, 0))} en stock generado
                <div style={{ color: 'var(--muted)', marginTop: 4 }}>El stock de cada producto se actualizará automáticamente</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setModal(null)} style={b()}>Cancelar</button>
              <button onClick={guardarSesion} disabled={saving || !sesionItems.length} style={{ ...b('gold'), opacity: saving || !sesionItems.length ? 0.6 : 1 }}>
                {saving ? 'Guardando...' : `Guardar producción (${sesionItems.length} productos)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
