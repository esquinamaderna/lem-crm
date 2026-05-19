'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, today, nowTime } from '@/lib/utils'
import type { MovimientoCaja } from '@/types/database'

const btn=(v?:'gold'):React.CSSProperties=>({padding:'6px 12px',borderRadius:6,border:`1px solid ${v==='gold'?'var(--gold)':'var(--border)'}`,background:v==='gold'?'var(--gold)':'var(--card)',color:v==='gold'?'#0f0f0f':'var(--text)',cursor:'pointer',fontSize:12,fontFamily:'Georgia,serif',width:'100%'})
const lbl:React.CSSProperties={fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}

export function CajaClient() {
  const [movs, setMovs] = useState<MovimientoCaja[]>([])
  const [monto, setMonto] = useState(''); const [tipo, setTipo] = useState<'ingreso'|'egreso'>('ingreso')
  const [concepto, setConcepto] = useState('')
  const [semanal, setSemanal] = useState<{dia:string;ing:number;eg:number}[]>([])

  useEffect(()=>{ loadHoy(); loadSemanal() }, [])

  async function loadHoy() {
    const {data} = await supabase.from('caja').select('*').eq('fecha',today()).order('created_at',{ascending:false})
    setMovs(data||[])
  }

  async function loadSemanal() {
    const rows = []
    for(let i=6;i>=0;i--) {
      const d=new Date(); d.setDate(d.getDate()-i)
      const fecha=d.toISOString().split('T')[0]
      const label=d.toLocaleDateString('es-AR',{weekday:'short',day:'2-digit'})
      const {data} = await supabase.from('caja').select('tipo,monto').eq('fecha',fecha)
      const ing=(data||[]).filter(m=>m.tipo==='ingreso').reduce((s:number,m:{monto:number})=>s+m.monto,0)
      const eg=(data||[]).filter(m=>m.tipo==='egreso').reduce((s:number,m:{monto:number})=>s+m.monto,0)
      rows.push({dia:label,ing,eg})
    }
    setSemanal(rows)
  }

  async function addMov() {
    const m=parseFloat(monto); if(!m||!concepto.trim()) return
    await supabase.from('caja').insert({fecha:today(),hora:nowTime(),tipo,concepto,monto:m})
    setMonto(''); setConcepto('')
    loadHoy(); loadSemanal()
  }

  const ingresos=movs.filter(m=>m.tipo==='ingreso').reduce((s,m)=>s+m.monto,0)
  const egresos=movs.filter(m=>m.tipo==='egreso').reduce((s,m)=>s+m.monto,0)

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:16}}>
        {[['Ingresos hoy',fmt(ingresos),'#4caf7d'],['Egresos hoy',fmt(egresos),'#d95f5f'],['Neto hoy',fmt(ingresos-egresos),''],['Movimientos',movs.length,'']].map(([l,v,c])=>(
          <div key={String(l)} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginBottom:5}}>{l}</div>
            <div style={{fontSize:20,color:(c as string)||'var(--gold)'}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:14}}>
          <div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:12}}>Nuevo movimiento</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div><label style={lbl}>Monto</label><input type="number" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0" /></div>
            <div><label style={lbl}>Tipo</label><select value={tipo} onChange={e=>setTipo(e.target.value as 'ingreso'|'egreso')}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></div>
          </div>
          <div style={{marginBottom:10}}><label style={lbl}>Concepto</label><input value={concepto} onChange={e=>setConcepto(e.target.value)} placeholder="Descripción..." /></div>
          <button onClick={addMov} style={btn('gold')}>Registrar</button>
          <hr style={{border:'none',borderTop:'1px solid var(--border)',margin:'14px 0'}} />
          <div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:10}}>Movimientos de hoy</div>
          <div style={{maxHeight:320,overflowY:'auto'}}>
            {movs.length===0 ? <div style={{color:'var(--dim)',fontSize:12,textAlign:'center',padding:14}}>Sin movimientos hoy</div>
              : movs.map(m=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--borderl)',fontSize:12}}>
                <div><div>{m.concepto}</div><div style={{fontSize:10,color:'var(--dim)'}}>{m.hora}</div></div>
                <div style={{color:m.tipo==='ingreso'?'#4caf7d':'#d95f5f'}}>{m.tipo==='ingreso'?'+':'-'}{m.monto>0?fmt(m.monto):'$0'}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:14}}>
          <div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:12}}>Resumen semanal</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr>{['Día','Ingresos','Egresos','Neto'].map(h=><th key={h} style={{fontSize:10,letterSpacing:'1.2px',textTransform:'uppercase',color:'var(--muted)',textAlign:'left',padding:'7px 10px',borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
            <tbody>
              {semanal.map(d=>(
                <tr key={d.dia}>
                  <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)'}}>{d.dia}</td>
                  <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)',color:'#4caf7d'}}>{fmt(d.ing)}</td>
                  <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)',color:'#d95f5f'}}>{fmt(d.eg)}</td>
                  <td style={{padding:'8px 10px',borderBottom:'1px solid var(--borderl)',color:d.ing-d.eg>=0?'#4caf7d':'#d95f5f'}}>{fmt(d.ing-d.eg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
