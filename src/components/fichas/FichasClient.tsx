'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today, dateAddISO, fechaES } from '@/lib/utils'
import type { Producto } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'
import { useRouter } from 'next/navigation'

const btn = (v?:'gold'|'red'|'green'|'blue'):React.CSSProperties => ({padding:'4px 9px',borderRadius:6,border:`1px solid ${v==='gold'?'var(--gold)':v==='red'?'rgba(217,95,95,.25)':v==='green'?'rgba(76,175,125,.25)':v==='blue'?'rgba(91,155,213,.25)':'var(--border)'}`,background:v==='gold'?'var(--gold)':v==='red'?'rgba(217,95,95,.12)':v==='green'?'rgba(76,175,125,.12)':v==='blue'?'rgba(91,155,213,.12)':'var(--card)',color:v==='gold'?'#0f0f0f':v==='red'?'#d95f5f':v==='green'?'#4caf7d':v==='blue'?'#5b9bd5':'var(--text)',cursor:'pointer',fontSize:11,fontFamily:'Georgia,serif'})
const lbl:React.CSSProperties={fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}
const overlay:React.CSSProperties={display:'flex',position:'fixed',inset:0,background:'rgba(0,0,0,.82)',zIndex:200,alignItems:'center',justifyContent:'center',padding:16}
const mbox=(wide?:boolean):React.CSSProperties=>({background:'var(--card)',border:'1px solid var(--gold-d)',borderRadius:12,padding:22,width:'100%',maxWidth:wide?700:520,maxHeight:'90vh',overflowY:'auto'})

export function FichasClient() {
  const [prods, setProds] = useState<Producto[]>([])
  const [sel, setSel] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [pfCant, setPfCant] = useState('5')
  const [pfFecha, setPfFecha] = useState(today())
  const [pfLote, setPfLote] = useState('')
  const [pfResp, setPfResp] = useState('')
  const [pfNotas, setPfNotas] = useState('')
  const router = useRouter()

  useEffect(() => {
    supabase.from('productos').select('*').eq('activo', true).order('nombre').then(({ data }) => {
      setProds(data && data.length ? data : PRODUCTOS_DEFAULT.map((p, i) => ({ ...p, id: i + 1 })) as Producto[])
    })
    supabase.from('ordenes_produccion').select('id', { count: 'exact', head: true }).then(({ count }) => {
      setPfLote('L' + String((count || 0) + 1).padStart(3, '0'))
    })
  }, [])

  const prod = prods.find(p => p.id === sel)
  const receta: string[] = prod ? (Array.isArray(prod.receta) ? prod.receta : typeof prod.receta === 'string' ? JSON.parse(prod.receta || '[]') : []) : []
  const venceISO = prod && pfFecha ? dateAddISO(pfFecha, prod.vida_util_dias) : ''
  const costoTotal = prod ? parseFloat(pfCant) * prod.costo : 0

  async function crearOrden() {
    if (!prod || !pfCant) return
    const { data } = await supabase.from('ordenes_produccion').insert({ numero_lote: pfLote, producto_id: prod.id, producto_nombre: prod.nombre, cantidad_kg: parseFloat(pfCant), fecha_produccion: pfFecha, fecha_vencimiento: venceISO, estado: 'pendiente', responsable: pfResp, notas: pfNotas, etiquetas_generadas: 0 }).select().single()
    setModal(false)
    if (data) router.push('/etiquetas?orden=' + data.id)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Fichas Técnicas</div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <select value={sel} onChange={e => setSel(e.target.value ? parseInt(e.target.value) : '')} style={{ width: '100%' }}>
            <option value="">— Seleccionar producto —</option>
            {prods.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        {prod && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>{prod.nombre}</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, marginBottom: 10 }}>
              <span>PV: <span style={{ color: 'var(--gold)' }}>{fmt(prod.precio_venta)}/kg</span></span>
              <span>Costo: {fmt(prod.costo)}/kg</span>
              <span>Margen: {fmt(prod.precio_venta - prod.costo)}/kg</span>
              <span>Vida útil: {prod.vida_util_dias} días</span>
            </div>
            {prod.instrucciones && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{prod.instrucciones}</div>}
            <ol style={{ listStyle: 'none', counterReset: 'step' }}>
              {receta.map((paso, i) => (
                <li key={i} style={{ counterIncrement: 'step', display: 'flex', gap: 10, marginBottom: 7, fontSize: 12, lineHeight: 1.5 }}>
                  <span style={{ minWidth: 20, height: 20, borderRadius: '50%', background: 'var(--gold-bg)', border: '1px solid var(--gold-d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--gold)', flexShrink: 0 }}>{i + 1}</span>
                  {paso}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Iniciar Producción</div>
        {!prod ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, color: 'var(--dim)', fontSize: 12, textAlign: 'center', paddingTop: 40, paddingBottom: 40 }}>Seleccioná un producto para iniciar una orden</div>
        ) : (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--gold-bg)', border: '1px solid var(--gold-d)', borderRadius: 6, fontSize: 12 }}>
              <strong style={{ color: 'var(--gold)' }}>{prod.nombre}</strong><br />
              <span style={{ color: 'var(--muted)' }}>Vida útil: {prod.vida_util_dias} días · Costo: {fmt(prod.costo)}/kg</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={lbl}>Cantidad (kg)</label><input type="number" value={pfCant} onChange={e => setPfCant(e.target.value)} min="0.1" step="0.1" /></div>
              <div><label style={lbl}>Fecha de producción</label><input type="date" value={pfFecha} onChange={e => setPfFecha(e.target.value)} /></div>
              <div><label style={lbl}>Lote</label><input value={pfLote} onChange={e => setPfLote(e.target.value)} /></div>
              <div><label style={lbl}>Responsable</label><input value={pfResp} onChange={e => setPfResp(e.target.value)} placeholder="Nombre" /></div>
            </div>
            <div style={{ marginBottom: 10 }}><label style={lbl}>Notas</label><textarea value={pfNotas} onChange={e => setPfNotas(e.target.value)} rows={2} /></div>
            {pfCant && venceISO && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                Costo estimado: <span style={{ color: 'var(--gold)' }}>{fmt(costoTotal)}</span> · Vence: <strong>{fechaES(venceISO)}</strong>
              </div>
            )}
            <button onClick={crearOrden} style={{ ...btn('gold'), width: '100%', padding: '8px', fontSize: 13 }}>Crear orden + ir a etiquetas →</button>
          </div>
        )}
      </div>
    </div>
  )
}
