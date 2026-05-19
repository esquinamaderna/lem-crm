'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Suspense } from 'react'
import { fmtN, today, fechaES, dateAddISO, dateAdd } from '@/lib/utils'
import type { Producto, OrdenProduccion } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'

const lbl:React.CSSProperties={fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}
const btn=(v?:'gold'):React.CSSProperties=>({padding:'4px 9px',borderRadius:6,border:`1px solid ${v==='gold'?'var(--gold)':'var(--border)'}`,background:v==='gold'?'var(--gold)':'var(--card)',color:v==='gold'?'#0f0f0f':'var(--text)',cursor:'pointer',fontSize:11,fontFamily:'Georgia,serif'})

function buildEtqHTML(p:Producto, fpFmt:string, venceFmt:string, peso:string, lote:string, inst:string) {
  return `<div style="border:2px solid #000;border-radius:4px;padding:10px 12px;max-width:270px;background:#fff;color:#000;font-family:Georgia,serif">
    <div style="font-size:15px;font-weight:bold;letter-spacing:1px;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:7px">LA ESQUINA DE MADERNA</div>
    <div style="font-size:17px;font-weight:bold;line-height:1.2;margin-bottom:5px">${p.nombre}</div>
    <div style="font-size:13px;color:#333">${peso}</div>
    <div style="font-size:11px;border-top:1px solid #ccc;padding-top:5px;margin-top:5px">
      <div style="display:flex;justify-content:space-between"><span><strong>Prod:</strong> ${fpFmt}</span><span><strong>Lote:</strong> ${lote}</span></div>
      <div style="font-size:13px;font-weight:bold;color:#b00;margin-top:5px">CONSUMIR ANTES DEL ${venceFmt}</div>
      ${inst?`<div style="font-size:10px;color:#444;border-top:1px dashed #ccc;padding-top:4px;margin-top:4px">${inst}</div>`:''}
    </div>
    <div style="font-size:9px;color:#999;margin-top:5px;text-align:right">chefprivado.ar</div>
  </div>`
}

function buildComandaHTML(p:Producto, peso:string, lote:string, fpFmt:string) {
  const receta:string[] = Array.isArray(p.receta) ? p.receta : typeof p.receta==='string' ? JSON.parse(p.receta||'[]') : []
  return `<div style="font-family:'Courier New',monospace;border:2px solid #000;padding:10px;max-width:270px;background:#fff;color:#000">
    <div style="text-align:center;font-weight:bold;font-size:13px;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:7px">COMANDA PROD.</div>
    <div style="font-size:12px;margin:5px 0"><strong>${p.nombre}</strong></div>
    <div style="font-size:11px;border-top:1px dashed #000;padding-top:5px"><div>Cantidad: <strong>${peso}</strong></div><div>Lote: <strong>${lote}</strong></div><div>Fecha: <strong>${fpFmt}</strong></div><div>Vida útil: <strong>${p.vida_util_dias} días</strong></div></div>
    ${receta.length?`<div style="border-top:1px dashed #000;margin-top:5px;padding-top:5px;font-size:10px">${receta.map((s,i)=>`<div>${i+1}. ${s}</div>`).join('')}</div>`:''}
  </div>`
}

export function EtiquetasClient() {
  return <Suspense fallback={null}><EtiquetasInner /></Suspense>
}

function EtiquetasInner() {
  const params = useSearchParams()
  const [prods, setProds] = useState<Producto[]>([])
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([])
  const [selProd, setSelProd] = useState<number|''>('')
  const [selOrden, setSelOrden] = useState<number|''>('')
  const [fprod, setFprod] = useState(today())
  const [lote, setLote] = useState('')
  const [peso, setPeso] = useState('1 kg')
  const [batch, setBatch] = useState(1)
  const [inst, setInst] = useState('')

  useEffect(()=>{
    supabase.from('productos').select('*').eq('activo',true).order('nombre').then(({data})=>{
      const ps = data && data.length ? data : PRODUCTOS_DEFAULT.map((p,i)=>({...p,id:i+1})) as Producto[]
      setProds(ps)
      if(ps.length) setSelProd(ps[0].id)
    })
    supabase.from('ordenes_produccion').select('*').neq('estado','cancelado').order('created_at',{ascending:false}).then(({data})=>setOrdenes(data||[]))
    supabase.from('ordenes_produccion').select('id',{count:'exact',head:true}).then(({count})=>setLote('L'+String((count||0)+1).padStart(3,'0')))
  },[])

  useEffect(()=>{
    const ordenId = params.get('orden')
    if(ordenId && ordenes.length) {
      const o = ordenes.find(x=>x.id===parseInt(ordenId))
      if(o) { setSelOrden(o.id); setSelProd(o.producto_id||''); setFprod(o.fecha_produccion); setLote(o.numero_lote); setPeso(fmtN(o.cantidad_kg)+' kg') }
    }
  },[params, ordenes])

  const prod = prods.find(p=>p.id===selProd)
  const fpFmt = fprod ? fechaES(fprod) : fechaES(today())
  const venceISO = prod && fprod ? dateAddISO(fprod, prod.vida_util_dias) : ''
  const venceFmt = venceISO ? fechaES(venceISO) : ''
  const instrFinal = inst || prod?.instrucciones || ''

  async function imprimir() {
    if(!prod) return
    if(selOrden) {
      const o = ordenes.find(x=>x.id===selOrden)
      if(o) await supabase.from('ordenes_produccion').update({etiquetas_generadas:(o.etiquetas_generadas||0)+batch}).eq('id',o.id)
    }
    const pa = document.getElementById('print-area')
    if(!pa) return
    let html = `<style>body{background:#fff;color:#000} @media print{body *{display:none} #print-area,#print-area *{display:block!important} #print-area{padding:4mm;display:grid;grid-template-columns:1fr 1fr;gap:8mm}}</style>`
    for(let i=1;i<=batch;i++) html += buildEtqHTML(prod, fpFmt, venceFmt, peso, `${lote}-${String(i).padStart(2,'0')}`, instrFinal)
    pa.innerHTML = html
    window.print()
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:14}}>
        <div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:12}}>Generador de Etiquetas</div>
        <div style={{marginBottom:12}}>
          <label style={lbl}>Cargar desde orden de producción</label>
          <select value={selOrden} onChange={e=>{
            const id=parseInt(e.target.value); setSelOrden(id||'')
            const o=ordenes.find(x=>x.id===id)
            if(o){setSelProd(o.producto_id||'');setFprod(o.fecha_produccion);setLote(o.numero_lote);setPeso(fmtN(o.cantidad_kg)+' kg')}
          }} style={{width:'100%'}}>
            <option value="">— O completar manualmente —</option>
            {ordenes.map(o=><option key={o.id} value={o.id}>{o.numero_lote} · {o.producto_nombre} · {fechaES(o.fecha_produccion)}</option>)}
          </select>
        </div>
        <hr style={{border:'none',borderTop:'1px solid var(--border)',margin:'12px 0'}} />
        <div style={{marginBottom:10}}><label style={lbl}>Producto</label>
          <select value={selProd} onChange={e=>setSelProd(parseInt(e.target.value))} style={{width:'100%'}}>
            {prods.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
          <div><label style={lbl}>Fecha producción</label><input type="date" value={fprod} onChange={e=>setFprod(e.target.value)} /></div>
          <div><label style={lbl}>Lote</label><input value={lote} onChange={e=>setLote(e.target.value)} placeholder="L001" /></div>
          <div><label style={lbl}>Peso / Cantidad</label><input value={peso} onChange={e=>setPeso(e.target.value)} placeholder="500 g" /></div>
          <div><label style={lbl}>Cantidad etiquetas</label><input type="number" value={batch} onChange={e=>setBatch(parseInt(e.target.value)||1)} min={1} max={50} /></div>
        </div>
        <div style={{marginBottom:12}}><label style={lbl}>Instrucciones extra</label><textarea value={inst} onChange={e=>setInst(e.target.value)} rows={2} placeholder={prod?.instrucciones||''} /></div>
        {prod && venceFmt && <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>Vence: <strong style={{color:'#d95f5f'}}>{venceFmt}</strong> · ({prod.vida_util_dias} días desde producción)</div>}
        <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
          <button onClick={imprimir} style={btn('gold')}>🖨 {batch>1?`Imprimir ${batch} etiquetas`:'Imprimir etiqueta'}</button>
        </div>
      </div>

      <div>
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:14,marginBottom:12}}>
          <div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:12}}>Vista previa — Etiqueta</div>
          {prod && venceFmt ? <div dangerouslySetInnerHTML={{__html:buildEtqHTML(prod,fpFmt,venceFmt,peso,lote,instrFinal)}} /> : <div style={{color:'var(--dim)',fontSize:12}}>Seleccioná un producto</div>}
        </div>
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:14}}>
          <div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:12}}>Comanda de producción</div>
          {prod ? <div dangerouslySetInnerHTML={{__html:buildComandaHTML(prod,peso,lote,fpFmt)}} /> : <div style={{color:'var(--dim)',fontSize:12}}>Seleccioná un producto</div>}
        </div>
      </div>
    </div>
  )
}
