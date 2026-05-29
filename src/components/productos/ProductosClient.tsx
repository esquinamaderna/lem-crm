'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, CAT_COLOR, round500 } from '@/lib/utils'
import type { Producto } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'

const CATS = ['VACUNO','CERDO','POLLO','PAPAS','JUMBALAY','PACKS','CORTES','EMBUTIDOS']
const b = (v?:'gold'|'red'|'green'): React.CSSProperties => ({ padding:'8px 12px',borderRadius:6,border:`1px solid ${v==='gold'?'var(--gold)':v==='red'?'rgba(190,50,50,.25)':v==='green'?'rgba(30,140,70,.25)':'var(--border)'}`,background:v==='gold'?'var(--gold)':v==='red'?'rgba(190,50,50,.10)':v==='green'?'rgba(30,140,70,.10)':'var(--card)',color:v==='gold'?'#0f0f0f':v==='red'?'#aa2020':v==='green'?'#1a7a40':'var(--text)',cursor:'pointer',fontSize:12,fontFamily:'Georgia,serif' })
const lbl: React.CSSProperties = { fontSize:11,color:'var(--muted)',display:'block',marginBottom:4 }
const overlay: React.CSSProperties = { display:'flex',position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,alignItems:'center',justifyContent:'center',padding:'16px' }
const mbox: React.CSSProperties = { background:'var(--card)',border:'1px solid var(--gold-d)',borderRadius:12,padding:22,width:'100%',maxWidth:520,maxHeight:'88vh',overflowY:'auto',boxSizing:'border-box' as const }

export function ProductosClient() {
  const [prods, setProds] = useState<Producto[]>([])
  const [search, setSearch] = useState('')
  const [catF, setCatF] = useState('')
  const [modal, setModal] = useState<'nuevo'|'stock'|null>(null)
  const [stockProd, setStockProd] = useState<Producto|null>(null)
  const [stkTipo, setStkTipo] = useState('set'); const [stkVal, setStkVal] = useState(''); const [stkMotivo, setStkMotivo] = useState('')
  const [npNombre, setNpNombre] = useState(''); const [npCat, setNpCat] = useState('VACUNO')
  const [npPv, setNpPv] = useState(''); const [npCosto, setNpCosto] = useState(''); const [npStock, setNpStock] = useState('0'); const [npVida, setNpVida] = useState('90')
  const [npUnidad, setNpUnidad] = useState('kg'); const [npInst, setNpInst] = useState('')

  useEffect(()=>{load()},[])
  async function load() {
    const {data} = await supabase.from('productos').select('*').eq('activo',true).order('nombre')
    setProds(data && data.length ? data : PRODUCTOS_DEFAULT.map((p,i)=>({...p,id:i+1})) as Producto[])
  }

  const filtered = prods.filter(p=>(!search||p.nombre.toLowerCase().includes(search.toLowerCase()))&&(!catF||p.categoria===catF))

  async function guardarNuevo() {
    if(!npNombre.trim()) return
    const pv=parseFloat(npPv); const costo=parseFloat(npCosto)
    await supabase.from('productos').insert({nombre:npNombre,categoria:npCat as Producto['categoria'],precio_venta:pv,costo,stock_kg:parseFloat(npStock)||0,vida_util_dias:parseInt(npVida)||90,instrucciones:npInst,activo:true,unidad_venta:npUnidad})
    setModal(null); setNpNombre(''); setNpPv(''); setNpCosto(''); setNpStock('0'); load()
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

  const stkResultado = () => {
    if(!stockProd||!stkVal) return null
    const v=parseFloat(stkVal); if(isNaN(v)) return null
    if(stkTipo==='set') return v
    if(stkTipo==='add') return parseFloat((stockProd.stock_kg+v).toFixed(1))
    return Math.max(0,parseFloat((stockProd.stock_kg-v).toFixed(1)))
  }

  return (
    <div>
      <style>{`.pg{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}`}</style>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:16}}>
        {[['Productos',prods.length,''],['Stock bajo',prods.filter(p=>p.stock_kg<2).length,'#aa2020'],['Valor stock',fmt(prods.reduce((s,p)=>s+p.precio_venta*p.stock_kg,0)),''],['FC prom.',(prods.length?`${(prods.reduce((s,p)=>s+p.costo/p.precio_venta,0)/prods.length*100).toFixed(0)}%`:'—'),'']].map(([l,v,c])=>(
          <div key={String(l)} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginBottom:5}}>{l}</div>
            <div style={{fontSize:18,color:(c as string)||'var(--gold)'}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,gap:8,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:8,flex:1,flexWrap:'wrap'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{minWidth:140,flex:1}} />
          <select value={catF} onChange={e=>setCatF(e.target.value)} style={{width:140}}><option value="">Todas</option>{CATS.map(c=><option key={c}>{c}</option>)}</select>
        </div>
        <button onClick={()=>setModal('nuevo')} style={{...b('gold'),whiteSpace:'nowrap'}}>+ Producto</button>
      </div>

      {/* Cards móvil */}
      <div className="resp-cards" style={{display:'none',flexDirection:'column',gap:10}}>
        {filtered.map(p=>{
          const fc=p.costo/p.precio_venta; const stk=p.stock_kg||0
          return <div key={p.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:14}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:CAT_COLOR[p.categoria]||'var(--dim)',flexShrink:0}} />
                <span style={{fontSize:13,fontWeight:'bold'}}>{p.nombre}</span>
              </div>
              <span style={{display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:10,color:CAT_COLOR[p.categoria],border:`1px solid ${CAT_COLOR[p.categoria]}44`,background:`${CAT_COLOR[p.categoria]}18`}}>{p.categoria}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10,fontSize:12}}>
              <div><div style={{color:'var(--muted)',fontSize:10}}>PV / {(p as any).unidad_venta||'kg'}</div><div style={{color:'var(--gold)'}}>{fmt(p.precio_venta)}</div></div>
              <div><div style={{color:'var(--muted)',fontSize:10}}>FC</div><div style={{color:fc<=0.45?'#1a7a40':fc<=0.60?'#9a7a1a':'#aa2020'}}>{(fc*100).toFixed(0)}%</div></div>
              <div><div style={{color:'var(--muted)',fontSize:10}}>Stock</div><div style={{color:stk<2?'#aa2020':stk<5?'#b05010':'#1a7a40'}}>{fmtN(stk)} kg</div></div>
            </div>
            <button onClick={()=>abrirStock(p)} style={{...b(),width:'100%'}}>📦 Ajustar stock</button>
          </div>
        })}
      </div>

      {/* Tabla desktop */}
      <div className="resp-table" style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:14,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:600}}>
          <thead><tr>{['Producto','Cat.','Tipo','PV','Costo','FC%','Stock','Unidad',''].map(h=><th key={h} style={{fontSize:10,letterSpacing:'1.2px',textTransform:'uppercase',color:'var(--muted)',textAlign:'left',padding:'7px 10px',borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(p=>{
              const fc=p.costo/p.precio_venta; const stk=p.stock_kg||0
              const fcColor=fc<=0.45?'#1a7a40':fc<=0.60?'#9a7a1a':'#aa2020'
              const stkColor=stk<2?'#aa2020':stk<5?'#b05010':'#1a7a40'
              return <tr key={p.id}>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:6,height:6,borderRadius:'50%',background:CAT_COLOR[p.categoria]||'var(--dim)',flexShrink:0}} />{p.nombre}</div></td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><span style={{display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:10,color:CAT_COLOR[p.categoria],border:`1px solid ${CAT_COLOR[p.categoria]}44`,background:`${CAT_COLOR[p.categoria]}18`}}>{p.categoria}</span></td>
                {(()=>{ const tipo = (p as any).tipo_producto || (['JUMBALAY','CORTES','EMBUTIDOS','PAPAS'].includes(p.categoria) ? 'reventa' : 'elaborado'); const esRev = tipo==='reventa'; return (
                  <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><span style={{fontSize:10,padding:'2px 6px',borderRadius:4,background:esRev?'rgba(30,100,180,.08)':'rgba(26,122,64,.08)',border:esRev?'1px solid rgba(30,100,180,.25)':'1px solid rgba(26,122,64,.25)',color:esRev?'#1050a0':'#1a7a40'}}>{tipo}</span></td>
                )})()}
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)',color:'var(--gold)'}}>{fmt(p.precio_venta)}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>{fmt(p.costo)}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><span style={{display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:10,color:fcColor,border:`1px solid ${fcColor}44`,background:`${fcColor}18`}}>{(fc*100).toFixed(0)}%</span></td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)',color:stkColor}}>{fmtN(stk, (p as any).unidad_venta==='u' ? 0 : 1)} {(p as any).unidad_venta||'kg'}</td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><span style={{fontSize:10,padding:'2px 6px',borderRadius:4,background:'var(--bg)',border:'1px solid var(--border)',color:'var(--muted)'}}>{(p as any).unidad_venta||'kg'}</span></td>
                <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}><button onClick={()=>abrirStock(p)} style={{...b(),padding:'4px 8px',fontSize:11}}>📦 Stock</button></td>
              </tr>
            })}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo */}
      {modal==='nuevo' && (
        <div style={overlay} onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div style={mbox}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}><div style={{fontSize:13,letterSpacing:1,color:'var(--gold)',textTransform:'uppercase'}}>Nuevo Producto</div><button onClick={()=>setModal(null)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20}}>✕</button></div>
            <div className="pg" style={{marginBottom:10}}>
              <div><label style={lbl}>Nombre</label><input value={npNombre} onChange={e=>setNpNombre(e.target.value)} /></div>
              <div><label style={lbl}>Categoría</label><select value={npCat} onChange={e=>setNpCat(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label style={lbl}>PV ($/kg)</label><input type="number" value={npPv} onChange={e=>setNpPv(e.target.value)} /></div>
              <div><label style={lbl}>Costo ($/kg)</label><input type="number" value={npCosto} onChange={e=>setNpCosto(e.target.value)} /></div>
              <div><label style={lbl}>Unidad de venta</label><select value={npUnidad} onChange={e=>setNpUnidad(e.target.value)}><option value="kg">kg (por peso)</option><option value="u">u (por unidad)</option><option value="L">L (por litro)</option></select></div><div><label style={lbl}>Stock inicial</label><input type="number" value={npStock} onChange={e=>setNpStock(e.target.value)} /></div>
              <div><label style={lbl}>Vida útil (días)</label><input type="number" value={npVida} onChange={e=>setNpVida(e.target.value)} /></div>
              <div><label style={lbl}>Unidad de venta</label>
                <select value={npUnidad||'kg'} onChange={e=>setNpUnidad(e.target.value)}>
                  <option value="kg">kg (por peso)</option>
                  <option value="u">u (por unidad)</option>
                </select>
              </div>
            </div>
            <div style={{marginBottom:12}}><label style={lbl}>Instrucciones</label><input value={npInst} onChange={e=>setNpInst(e.target.value)} /></div>
            <div style={{display:'flex',gap:8}}><button onClick={()=>setModal(null)} style={{...b(),flex:1}}>Cancelar</button><button onClick={guardarNuevo} style={{...b('gold'),flex:1}}>Guardar</button></div>
          </div>
        </div>
      )}

      {/* Modal stock */}
      {modal==='stock' && stockProd && (
        <div style={overlay} onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div style={mbox}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}><div style={{fontSize:13,letterSpacing:1,color:'var(--gold)',textTransform:'uppercase'}}>Ajustar Stock</div><button onClick={()=>setModal(null)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20}}>✕</button></div>
            <div style={{marginBottom:12,padding:'10px 12px',background:'var(--gold-bg)',border:'1px solid var(--gold-d)',borderRadius:6,fontSize:13}}>
              <strong>{stockProd.nombre}</strong><br/><span style={{color:'var(--muted)'}}>Stock actual: <span style={{color:'var(--gold)'}}>{fmtN(stockProd.stock_kg)} {(stockProd as any).unidad_venta||'kg'}</span></span>
            </div>
            <div style={{marginBottom:10}}><label style={lbl}>Tipo de ajuste</label>
              <select value={stkTipo} onChange={e=>setStkTipo(e.target.value)}>
                <option value="set">Establecer exacto</option>
                <option value="add">Agregar al stock</option>
                <option value="sub">Descontar del stock</option>
              </select>
            </div>
            <div style={{marginBottom:10}}><label style={lbl}>Unidad de venta</label>
              <select defaultValue={(stockProd as any).unidad_venta||'kg'} onChange={async e=>{
                await supabase.from('productos').update({unidad_venta:e.target.value}).eq('id',stockProd.id)
                setProds(prev=>prev.map(p=>p.id===stockProd.id?{...p,unidad_venta:e.target.value as any}:p))
              }}><option value="kg">kg (por peso)</option><option value="u">u (por unidad)</option><option value="L">L (por litro)</option></select></div>
            <div style={{marginBottom:10}}><label style={lbl}>Cantidad ({(stockProd as any).unidad_venta||'kg'})</label><input type="number" value={stkVal} onChange={e=>setStkVal(e.target.value)} placeholder="0.0" min="0" step={(stockProd as any).unidad_venta==='u'?'1':'0.1'} /></div>
            <div style={{marginBottom:10}}><label style={lbl}>Motivo</label><input value={stkMotivo} onChange={e=>setStkMotivo(e.target.value)} placeholder="ej: compra semanal, merma..." /></div>
            {stkResultado()!==null && <div style={{fontSize:13,color:'var(--muted)',marginBottom:12}}>→ Stock resultante: <strong style={{color:'var(--gold)'}}>{fmtN(stkResultado()!)} {(stockProd as any)?.unidad_venta||'kg'}</strong></div>}
            <div style={{display:'flex',gap:8}}><button onClick={()=>setModal(null)} style={{...b(),flex:1}}>Cancelar</button><button onClick={confirmarStock} style={{...b('gold'),flex:1}}>Confirmar</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
