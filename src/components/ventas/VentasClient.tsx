'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today } from '@/lib/utils'

const btn=(v?:'gold'):React.CSSProperties=>({padding:'4px 9px',borderRadius:6,border:`1px solid ${v==='gold'?'var(--gold)':'var(--border)'}`,background:v==='gold'?'var(--gold)':'var(--card)',color:v==='gold'?'#0f0f0f':'var(--text)',cursor:'pointer',fontSize:11,fontFamily:'Georgia,serif'})

type VentaRow = { id:number; numero_ticket:string; fecha:string; hora:string; cliente:string; medio_pago:string; total:number; estado:string; venta_items:{id:number;producto_nombre:string;cantidad_kg:number;precio_unit:number}[] }

export function VentasClient() {
  const [ventas, setVentas] = useState<VentaRow[]>([])
  const [desde, setDesde] = useState(''); const [hasta, setHasta] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modal, setModal] = useState(false)
  const [det, setDet] = useState<VentaRow|null>(null)

  useEffect(()=>{load()},[])
  async function load() {
    let q = supabase.from('ventas').select('*, venta_items(*)').order('created_at',{ascending:false})
    if(desde) q=q.gte('fecha',desde)
    if(hasta) q=q.lte('fecha',hasta)
    if(filtroEstado) q=q.eq('estado',filtroEstado)
    const {data} = await q
    setVentas((data||[]) as VentaRow[])
  }

  const total = ventas.reduce((s,v)=>s+v.total,0)
  const prom = ventas.length ? total/ventas.length : 0
  const hoyT = ventas.filter(v=>v.fecha===today()).reduce((s,v)=>s+v.total,0)

  function exportCSV() {
    const rows=[['Ticket','Fecha','Hora','Cliente','Pago','Total','Estado']]
    ventas.forEach(v=>rows.push([v.numero_ticket,v.fecha,v.hora,v.cliente,v.medio_pago,String(v.total),v.estado]))
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'})); a.download=`ventas_${today()}.csv`; a.click()
  }

  function buildTicketHTML(v:VentaRow) {
    const rows = v.venta_items.map(i=>`<div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>${i.producto_nombre} × ${fmtN(i.cantidad_kg)} kg</span><span>${fmt(i.precio_unit*i.cantidad_kg)}</span></div>`).join('')
    return `<div style="font-family:'Courier New',monospace;font-size:12px;color:#111;background:#fff;padding:14px;max-width:290px;border:1px solid #ccc">
      <div style="text-align:center;font-weight:bold;border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:7px">LA ESQUINA DE MADERNA<br><small>Tigre, Buenos Aires</small></div>
      <div style="font-size:11px;margin-bottom:7px"><div>Ticket: <strong>${v.numero_ticket}</strong></div><div>${v.fecha} · ${v.hora}</div><div>Cliente: ${v.cliente}</div><div>Pago: ${v.medio_pago}</div></div>
      <div style="border-top:1px dashed #000;margin:5px 0"></div>${rows}<div style="border-top:1px dashed #000;margin:5px 0"></div>
      <div style="font-weight:bold;display:flex;justify-content:space-between;font-size:14px"><span>TOTAL</span><span>${fmt(v.total)}</span></div>
    </div>`
  }

  const ESTADO_COLOR:Record<string,string>={cobrada:'#4caf7d',pendiente:'#c9a227',anulada:'#d95f5f'}
  const overlay:React.CSSProperties={display:'flex',position:'fixed',inset:0,background:'rgba(0,0,0,.82)',zIndex:200,alignItems:'center',justifyContent:'center',padding:16}

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:16}}>
        {[['Ventas',ventas.length,''],['Total',fmt(total),''],['Ticket prom.',fmt(prom),''],['Hoy',fmt(hoyT),'']].map(([l,v,c])=>(
          <div key={String(l)} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginBottom:5}}>{l}</div>
            <div style={{fontSize:20,color:(c as string)||'var(--gold)'}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input type="date" value={desde} onChange={e=>setDesde(e.target.value)} style={{width:135}} />
          <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} style={{width:135}} />
          <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)} style={{width:130}}><option value="">Todos estados</option><option value="cobrada">cobrada</option><option value="pendiente">pendiente</option><option value="anulada">anulada</option></select>
          <button onClick={load} style={btn()}>Filtrar</button>
        </div>
        <button onClick={exportCSV} style={btn()}>⬇ CSV</button>
      </div>

      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:14}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead><tr>{['Ticket','Fecha','Hora','Cliente','Pago','Total','Estado',''].map(h=><th key={h} style={{fontSize:10,letterSpacing:'1.2px',textTransform:'uppercase',color:'var(--muted)',textAlign:'left',padding:'7px 10px',borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
          <tbody>
            {ventas.length===0 ? <tr><td colSpan={8} style={{textAlign:'center',color:'var(--dim)',padding:20}}>Sin ventas</td></tr>
              : ventas.map(v=>(
              <tr key={v.id}>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)',color:'var(--gold)'}}>{v.numero_ticket}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>{v.fecha}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>{v.hora}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>{v.cliente}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><span style={{display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:10,background:'rgba(91,155,213,.12)',color:'#5b9bd5',border:'1px solid rgba(91,155,213,.25)'}}>{v.medio_pago}</span></td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)',color:'var(--gold)'}}>{fmt(v.total)}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><span style={{display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:10,color:ESTADO_COLOR[v.estado]||'var(--muted)',border:`1px solid ${ESTADO_COLOR[v.estado]||'var(--muted)'}44`,background:`${ESTADO_COLOR[v.estado]||'var(--muted)'}18`}}>{v.estado}</span></td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>{setDet(v);setModal(true)}} style={btn()}>Ver</button>
                    <button onClick={()=>{const pa=document.getElementById('print-area');if(pa){pa.innerHTML=buildTicketHTML(v);window.print()}}} style={btn()}>🧾</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && det && (
        <div style={overlay} onClick={e=>{if(e.target===e.currentTarget)setModal(false)}}>
          <div style={{background:'var(--card)',border:'1px solid var(--gold-d)',borderRadius:12,padding:22,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{fontSize:13,letterSpacing:1,color:'var(--gold)',marginBottom:16,textTransform:'uppercase'}}>Venta {det.numero_ticket}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12,fontSize:13}}>
              {[['Fecha',`${det.fecha} · ${det.hora}`],['Cliente',det.cliente],['Pago',det.medio_pago],['Estado',det.estado]].map(([l,v])=>(
                <div key={l}><div style={{fontSize:11,color:'var(--muted)'}}>{l}</div><div>{v}</div></div>
              ))}
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginBottom:12}}>
              <thead><tr>{['Producto','Kg','Subtotal'].map(h=><th key={h} style={{fontSize:10,textTransform:'uppercase',color:'var(--muted)',textAlign:'left',padding:'6px 8px',borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
              <tbody>{det.venta_items.map(i=><tr key={i.id}><td style={{padding:'7px 8px',borderBottom:'1px solid var(--borderl)'}}>{i.producto_nombre}</td><td style={{padding:'7px 8px',borderBottom:'1px solid var(--borderl)'}}>{fmtN(i.cantidad_kg)}</td><td style={{padding:'7px 8px',borderBottom:'1px solid var(--borderl)',textAlign:'right',color:'var(--gold)'}}>{fmt(i.precio_unit*i.cantidad_kg)}</td></tr>)}</tbody>
            </table>
            <div style={{textAlign:'right',fontSize:17,color:'var(--gold)',marginBottom:12}}>Total: {fmt(det.total)}</div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button onClick={()=>{const pa=document.getElementById('print-area');if(pa){pa.innerHTML=buildTicketHTML(det);window.print()}}} style={btn()}>🧾 Ticket</button>
              <button onClick={()=>setModal(false)} style={btn()}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
