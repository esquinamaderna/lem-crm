'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fechaES } from '@/lib/utils'
import type { OrdenProduccion } from '@/types/database'
import { useRouter } from 'next/navigation'

const ESTADOS = ['pendiente','en_progreso','completado'] as const
const ESTADO_COLOR:Record<string,string> = {pendiente:'#c9a227',en_progreso:'#5b9bd5',completado:'#4caf7d',cancelado:'#d95f5f'}
const btn = (v?:'gold'|'red'|'blue'):React.CSSProperties => ({padding:'4px 9px',borderRadius:6,border:`1px solid ${v==='gold'?'var(--gold)':v==='red'?'rgba(217,95,95,.25)':v==='blue'?'rgba(91,155,213,.25)':'var(--border)'}`,background:v==='gold'?'var(--gold)':v==='red'?'rgba(217,95,95,.12)':v==='blue'?'rgba(91,155,213,.12)':'var(--card)',color:v==='gold'?'#0f0f0f':v==='red'?'#d95f5f':v==='blue'?'#5b9bd5':'var(--text)',cursor:'pointer',fontSize:11,fontFamily:'Georgia,serif'})

export function ProduccionClient() {
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([])
  const [filtro, setFiltro] = useState('')
  const router = useRouter()

  useEffect(()=>{load()},[filtro])
  async function load() {
    let q = supabase.from('ordenes_produccion').select('*').order('created_at',{ascending:false})
    if(filtro) q = q.eq('estado',filtro)
    const {data} = await q
    setOrdenes(data || [])
  }

  async function avanzar(id:number, estadoActual:string) {
    const ci = ESTADOS.indexOf(estadoActual as typeof ESTADOS[number])
    if(ci < ESTADOS.length-1) {
      await supabase.from('ordenes_produccion').update({estado:ESTADOS[ci+1]}).eq('id',id)
      load()
    }
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{display:'flex',gap:8}}>
          <select value={filtro} onChange={e=>setFiltro(e.target.value)} style={{width:150}}>
            <option value="">Todas</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_progreso">En progreso</option>
            <option value="completado">Completado</option>
          </select>
        </div>
        <button onClick={()=>router.push('/fichas')} style={{...btn('gold'),padding:'6px 14px',fontSize:12}}>+ Nueva orden (desde Fichas)</button>
      </div>

      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:14}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead><tr>{['Lote','Producto','Cantidad','Fecha Prod.','Vence','Estado','Etiquetas',''].map(h=><th key={h} style={{fontSize:10,letterSpacing:'1.2px',textTransform:'uppercase',color:'var(--muted)',textAlign:'left',padding:'7px 10px',borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
          <tbody>
            {ordenes.length===0 ? <tr><td colSpan={8} style={{textAlign:'center',color:'var(--dim)',padding:20}}>Sin órdenes de producción</td></tr>
              : ordenes.map(o=>(
              <tr key={o.id}>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)',color:'var(--gold)'}}>{o.numero_lote}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>{o.producto_nombre}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>{o.cantidad_kg} kg</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>{fechaES(o.fecha_produccion)}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>{fechaES(o.fecha_vencimiento)}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><span style={{display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:10,color:ESTADO_COLOR[o.estado]||'var(--muted)',border:`1px solid ${ESTADO_COLOR[o.estado]||'var(--muted)'}44`,background:`${ESTADO_COLOR[o.estado]||'var(--muted)'}18`}}>{o.estado}</span></td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>{o.etiquetas_generadas||0}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>
                  <div style={{display:'flex',gap:4}}>
                    {o.estado!=='completado' && <button onClick={()=>avanzar(o.id,o.estado)} style={btn()}>→</button>}
                    <button onClick={()=>router.push('/etiquetas?orden='+o.id)} style={btn('blue')}>🏷 Etiquetar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
