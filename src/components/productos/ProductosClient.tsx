'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, CAT_COLOR } from '@/lib/utils'
import type { Producto } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'

const CATS = ['VACUNO','CERDO','POLLO','PAPAS','JUMBALAY','PACKS']
const btn = (v?:'gold'|'red'|'green'):React.CSSProperties => ({padding:'4px 9px',borderRadius:6,border:`1px solid ${v==='gold'?'var(--gold)':v==='red'?'rgba(217,95,95,.25)':v==='green'?'rgba(76,175,125,.25)':'var(--border)'}`,background:v==='gold'?'var(--gold)':v==='red'?'rgba(217,95,95,.12)':v==='green'?'rgba(76,175,125,.12)':'var(--card)',color:v==='gold'?'#0f0f0f':v==='red'?'#d95f5f':v==='green'?'#4caf7d':'var(--text)',cursor:'pointer',fontSize:11,fontFamily:'Georgia,serif'})

export function ProductosClient() {
  const [prods, setProds] = useState<Producto[]>([])
  const [search, setSearch] = useState('')
  const [catF, setCatF] = useState('')
  const [modal, setModal] = useState<'nuevo'|'stock'|null>(null)
  const [stockProd, setStockProd] = useState<Producto|null>(null)
  const [stkTipo, setStkTipo] = useState('set')
  const [stkVal, setStkVal] = useState('')
  const [stkMotivo, setStkMotivo] = useState('')
  const [npNombre, setNpNombre] = useState(''); const [npCat, setNpCat] = useState('VACUNO')
  const [npPv, setNpPv] = useState(''); const [npCosto, setNpCosto] = useState('')
  const [npStock, setNpStock] = useState('0'); const [npVida, setNpVida] = useState('90')
  const [npInst, setNpInst] = useState('')

  useEffect(()=>{load()},[])
  async function load() {
    const {data} = await supabase.from('productos').select('*').eq('activo',true).order('nombre')
    setProds(data && data.length ? data : PRODUCTOS_DEFAULT.map((p,i)=>({...p,id:i+1})) as Producto[])
  }

  const filtered = prods.filter(p=>(!search||p.nombre.toLowerCase().includes(search.toLowerCase()))&&(!catF||p.categoria===catF))
  const stockBajo = prods.filter(p=>p.stock_kg<2).length
  const valorStock = prods.reduce((s,p)=>s+p.precio_venta*p.stock_kg,0)
  const fcProm = prods.length ? prods.reduce((s,p)=>s+p.costo/p.precio_venta,0)/prods.length : 0

  async function guardarNuevo() {
    if(!npNombre.trim()) return
    const pv=parseFloat(npPv); const costo=parseFloat(npCosto); const stock=parseFloat(npStock)||0; const vida=parseInt(npVida)||90
    const {data} = await supabase.from('productos').insert({nombre:npNombre,categoria:npCat as Producto['categoria'],precio_venta:pv,costo,stock_kg:stock,vida_util_dias:vida,instrucciones:npInst,activo:true}).select().single()
    if(data) setProds(prev=>[...prev,data])
    setModal(null); setNpNombre(''); setNpPv(''); setNpCosto(''); setNpStock('0')
  }

  function abrirStock(p:Producto) { setStockProd(p); setStkVal(''); setStkMotivo(''); setStkTipo('set'); setModal('stock') }

  async function confirmarStock() {
    if(!stockProd) return
    const val=parseFloat(stkVal); if(isNaN(val)) return
    let nuevo: number
    if(stkTipo==='set') nuevo=val
    else if(stkTipo==='add') nuevo=parseFloat((stockProd.stock_kg+val).toFixed(1))
    else nuevo=Math.max(0,parseFloat((stockProd.stock_kg-val).toFixed(1)))
    await supabase.from('productos').update({stock_kg:nuevo}).eq('id',stockProd.id)
    setProds(prev=>prev.map(p=>p.id===stockProd.id?{...p,stock_kg:nuevo}:p))
    setModal(null)
  }

  const overlay:React.CSSProperties={display:'flex',position:'fixed',inset:0,background:'rgba(0,0,0,.82)',zIndex:200,alignItems:'center',justifyContent:'center',padding:16}
  const mbox:React.CSSProperties={background:'var(--card)',border:'1px solid var(--gold-d)',borderRadius:12,padding:22,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'}
  const lbl:React.CSSProperties={fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}

  const stkResultado = ()=>{
    if(!stockProd||!stkVal) return null
    const v=parseFloat(stkVal); if(isNaN(v)) return null
    if(stkTipo==='set') return v
    if(stkTipo==='add') return parseFloat((stockProd.stock_kg+v).toFixed(1))
    return Math.max(0,parseFloat((stockProd.stock_kg-v).toFixed(1)))
  }

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:16}}>
        {[['Productos',prods.length,''],['Stock bajo (<2kg)',stockBajo,'#d95f5f'],['Valor en stock',fmt(valorStock),''],['FC promedio',`${(fcProm*100).toFixed(0)}%`,'']].map(([l,v,c])=>(
          <div key={String(l)} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginBottom:5}}>{l}</div>
            <div style={{fontSize:20,color:(c as string)||'var(--gold)'}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{display:'flex',gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{width:220}} />
          <select value={catF} onChange={e=>setCatF(e.target.value)} style={{width:140}}><option value="">Todas</option>{CATS.map(c=><option key={c}>{c}</option>)}</select>
        </div>
        <button onClick={()=>setModal('nuevo')} style={{...btn('gold'),padding:'6px 14px',fontSize:12}}>+ Producto</button>
      </div>

      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:14}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead><tr>{['Producto','Cat.','PV/kg','Costo/kg','FC%','Margen','Stock','Estado',''].map(h=><th key={h} style={{fontSize:10,letterSpacing:'1.2px',textTransform:'uppercase',color:'var(--muted)',textAlign:'left',padding:'7px 10px',borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(p=>{
              const fc=p.costo/p.precio_venta; const stk=p.stock_kg||0
              const fcColor=fc<=0.45?'#4caf7d':fc<=0.60?'#c9a227':'#d95f5f'
              const stkColor=stk<2?'#d95f5f':stk<5?'#d97c3a':'#4caf7d'
              return <tr key={p.id}>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:6,height:6,borderRadius:'50%',background:CAT_COLOR[p.categoria]||'var(--dim)',flexShrink:0}} />{p.nombre}</div></td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><span style={{display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:10,color:CAT_COLOR[p.categoria],border:`1px solid ${CAT_COLOR[p.categoria]}44`,background:`${CAT_COLOR[p.categoria]}18`}}>{p.categoria}</span></td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)',color:'var(--gold)'}}>{fmt(p.precio_venta)}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>{fmt(p.costo)}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><span style={{display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:10,color:fcColor,border:`1px solid ${fcColor}44`,background:`${fcColor}18`}}>{(fc*100).toFixed(0)}%</span></td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>{fmt(p.precio_venta-p.costo)}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)',color:stkColor}}>{fmtN(stk)} kg</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><span style={{display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:10,color:stkColor,border:`1px solid ${stkColor}44`,background:`${stkColor}18`}}>{stk<2?'Bajo':stk<5?'Medio':'OK'}</span></td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><button onClick={()=>abrirStock(p)} style={btn()}>📦 Stock</button></td>
              </tr>
            })}
          </tbody>
        </table>
      </div>

      {modal==='nuevo' && (
        <div style={overlay} onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div style={mbox}>
            <div style={{fontSize:13,letterSpacing:1,color:'var(--gold)',marginBottom:16,textTransform:'uppercase'}}>Nuevo Producto</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><label style={lbl}>Nombre</label><input value={npNombre} onChange={e=>setNpNombre(e.target.value)} /></div>
              <div><label style={lbl}>Categoría</label><select value={npCat} onChange={e=>setNpCat(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label style={lbl}>PV ($/kg)</label><input type="number" value={npPv} onChange={e=>setNpPv(e.target.value)} /></div>
              <div><label style={lbl}>Costo ($/kg)</label><input type="number" value={npCosto} onChange={e=>setNpCosto(e.target.value)} /></div>
              <div><label style={lbl}>Stock inicial (kg)</label><input type="number" value={npStock} onChange={e=>setNpStock(e.target.value)} /></div>
              <div><label style={lbl}>Vida útil (días)</label><input type="number" value={npVida} onChange={e=>setNpVida(e.target.value)} /></div>
            </div>
            <div style={{marginBottom:12}}><label style={lbl}>Instrucciones de cocción</label><input value={npInst} onChange={e=>setNpInst(e.target.value)} /></div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button onClick={()=>setModal(null)} style={btn()}>Cancelar</button>
              <button onClick={guardarNuevo} style={btn('gold')}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {modal==='stock' && stockProd && (
        <div style={overlay} onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div style={{...mbox,maxWidth:380}}>
            <div style={{fontSize:13,letterSpacing:1,color:'var(--gold)',marginBottom:16,textTransform:'uppercase'}}>Ajustar Stock</div>
            <div style={{marginBottom:12,fontSize:13,padding:'8px 12px',background:'var(--gold-bg)',border:'1px solid var(--gold-d)',borderRadius:6}}>
              <strong>{stockProd.nombre}</strong><br/>
              <span style={{color:'var(--muted)'}}>Stock actual: <span style={{color:'var(--gold)'}}>{fmtN(stockProd.stock_kg)} kg</span></span>
            </div>
            <div style={{marginBottom:10}}><label style={lbl}>Tipo de ajuste</label>
              <select value={stkTipo} onChange={e=>setStkTipo(e.target.value)}>
                <option value="set">Establecer stock exacto</option>
                <option value="add">Agregar al stock actual</option>
                <option value="sub">Descontar del stock actual</option>
              </select>
            </div>
            <div style={{marginBottom:10}}><label style={lbl}>Cantidad (kg)</label><input type="number" value={stkVal} onChange={e=>setStkVal(e.target.value)} placeholder="0.0" min="0" step="0.1" /></div>
            <div style={{marginBottom:10}}><label style={lbl}>Motivo</label><input value={stkMotivo} onChange={e=>setStkMotivo(e.target.value)} placeholder="ej: compra semanal, ajuste, merma..." /></div>
            {stkResultado()!==null && <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>→ Stock resultante: <strong style={{color:'var(--gold)'}}>{fmtN(stkResultado()!)} kg</strong></div>}
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button onClick={()=>setModal(null)} style={btn()}>Cancelar</button>
              <button onClick={confirmarStock} style={btn('gold')}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
