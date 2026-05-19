'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, today, nowTime, fechaES } from '@/lib/utils'
import type { MovimientoCaja } from '@/types/database'

const b = (v?: 'gold'): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 6, border: `1px solid ${v === 'gold' ? 'var(--gold)' : 'var(--border)'}`, background: v === 'gold' ? 'var(--gold)' : 'var(--card)', color: v === 'gold' ? '#0f0f0f' : 'var(--text)', cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif' })
const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }

export function CajaClient() {
  const [movs, setMovs] = useState<MovimientoCaja[]>([])
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso')
  const [concepto, setConcepto] = useState('')
  const [semanal, setSemanal] = useState<{ dia: string; fecha: string; ing: number; eg: number }[]>([])
  const [modalResumen, setModalResumen] = useState(false)

  useEffect(() => { loadHoy(); loadSemanal() }, [])

  async function loadHoy() {
    const { data } = await supabase.from('caja').select('*').eq('fecha', today()).order('created_at', { ascending: false })
    setMovs(data || [])
  }

  async function loadSemanal() {
    const rows = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const fecha = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit' })
      const { data } = await supabase.from('caja').select('tipo,monto').eq('fecha', fecha)
      const ing = (data || []).filter(m => m.tipo === 'ingreso').reduce((s: number, m: { monto: number }) => s + m.monto, 0)
      const eg = (data || []).filter(m => m.tipo === 'egreso').reduce((s: number, m: { monto: number }) => s + m.monto, 0)
      rows.push({ dia: label, fecha, ing, eg })
    }
    setSemanal(rows)
  }

  async function addMov() {
    const m = parseFloat(monto)
    if (!m || !concepto.trim()) return
    await supabase.from('caja').insert({ fecha: today(), hora: nowTime(), tipo, concepto, monto: m })
    setMonto(''); setConcepto('')
    loadHoy(); loadSemanal()
  }

  const ingresos = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const egresos = movs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)

  function imprimirResumenDia() {
    const ingRows = movs.filter(m => m.tipo === 'ingreso').map(m => `<tr><td style="padding:3px 6px;border-bottom:1px solid #eee">${m.hora}</td><td style="padding:3px 6px;border-bottom:1px solid #eee">${m.concepto}</td><td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;color:#1a7a1a">${fmt(m.monto)}</td></tr>`).join('')
    const egRows = movs.filter(m => m.tipo === 'egreso').map(m => `<tr><td style="padding:3px 6px;border-bottom:1px solid #eee">${m.hora}</td><td style="padding:3px 6px;border-bottom:1px solid #eee">${m.concepto}</td><td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;color:#b00">${fmt(m.monto)}</td></tr>`).join('')
    const html = `<div style="font-family:Georgia,serif;max-width:600px;color:#111;padding:16px">
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px">
        <div style="font-size:18px;font-weight:bold">LA ESQUINA DE MADERNA</div>
        <div style="font-size:13px">Cierre de caja — ${fechaES(today())}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">
        <div style="text-align:center;padding:10px;border:1px solid #ccc;border-radius:6px">
          <div style="font-size:11px;color:#666">INGRESOS</div>
          <div style="font-size:20px;font-weight:bold;color:#1a7a1a">${fmt(ingresos)}</div>
        </div>
        <div style="text-align:center;padding:10px;border:1px solid #ccc;border-radius:6px">
          <div style="font-size:11px;color:#666">EGRESOS</div>
          <div style="font-size:20px;font-weight:bold;color:#b00">${fmt(egresos)}</div>
        </div>
        <div style="text-align:center;padding:10px;border:2px solid #000;border-radius:6px">
          <div style="font-size:11px;color:#666">NETO DEL DÍA</div>
          <div style="font-size:20px;font-weight:bold">${fmt(ingresos - egresos)}</div>
        </div>
      </div>
      ${ingRows ? `<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:bold;margin-bottom:6px;color:#1a7a1a">INGRESOS (${movs.filter(m => m.tipo === 'ingreso').length})</div><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left;padding:4px 6px;background:#f5f5f5">Hora</th><th style="text-align:left;padding:4px 6px;background:#f5f5f5">Concepto</th><th style="text-align:right;padding:4px 6px;background:#f5f5f5">Monto</th></tr></thead><tbody>${ingRows}</tbody></table></div>` : ''}
      ${egRows ? `<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:bold;margin-bottom:6px;color:#b00">EGRESOS (${movs.filter(m => m.tipo === 'egreso').length})</div><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left;padding:4px 6px;background:#f5f5f5">Hora</th><th style="text-align:left;padding:4px 6px;background:#f5f5f5">Concepto</th><th style="text-align:right;padding:4px 6px;background:#f5f5f5">Monto</th></tr></thead><tbody>${egRows}</tbody></table></div>` : ''}
      <div style="border-top:2px solid #000;padding-top:8px;margin-top:8px;text-align:right">
        <div style="font-size:11px;color:#666">Total movimientos: ${movs.length}</div>
        <div style="font-size:16px;font-weight:bold">Neto: ${fmt(ingresos - egresos)}</div>
        <div style="font-size:10px;color:#999;margin-top:4px">Generado ${new Date().toLocaleString('es-AR')}</div>
      </div>
    </div>`
    const pa = document.getElementById('print-area')
    if (pa) { pa.innerHTML = html; window.print() }
  }

  const overlay: React.CSSProperties = { display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', zIndex: 200, alignItems: 'center', justifyContent: 'center', padding: 16 }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
        {[['Ingresos hoy', fmt(ingresos), '#4caf7d'], ['Egresos hoy', fmt(egresos), '#d95f5f'], ['Neto hoy', fmt(ingresos - egresos), ''], ['Movimientos', String(movs.length), '']].map(([l, v, c]) => (
          <div key={l} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>{l}</div>
            <div style={{ fontSize: 20, color: c || 'var(--gold)' }}>{v}</div>
          </div>
        ))}
      </div>

      <div className='fichas-grid'>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Nuevo movimiento</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={lbl}>Monto</label><input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" /></div>
            <div><label style={lbl}>Tipo</label><select value={tipo} onChange={e => setTipo(e.target.value as 'ingreso' | 'egreso')}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></div>
          </div>
          <div style={{ marginBottom: 10 }}><label style={lbl}>Concepto</label><input value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Descripción..." /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addMov} style={{ ...b('gold'), flex: 1 }}>Registrar</button>
            <button onClick={imprimirResumenDia} style={{ ...b(), fontSize: 11 }}>🖨 Resumen del día</button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>Movimientos de hoy</div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {movs.length === 0
              ? <div style={{ color: 'var(--dim)', fontSize: 12, textAlign: 'center', padding: 14 }}>Sin movimientos hoy</div>
              : movs.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--borderl)', fontSize: 12 }}>
                  <div>
                    <div>{m.concepto}</div>
                    <div style={{ fontSize: 10, color: 'var(--dim)' }}>{m.hora}</div>
                  </div>
                  <div style={{ color: m.tipo === 'ingreso' ? '#4caf7d' : '#d95f5f', fontWeight: 'normal' }}>
                    {m.tipo === 'ingreso' ? '+' : '-'}{m.monto > 0 ? fmt(m.monto) : '$0'}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Resumen semanal</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Día', 'Ingresos', 'Egresos', 'Neto'].map(h => <th key={h} style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', padding: '7px 10px', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {semanal.map(d => (
                <tr key={d.dia} style={{ background: d.fecha === today() ? 'rgba(201,162,39,.05)' : 'transparent' }}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', fontWeight: d.fecha === today() ? 'bold' : 'normal' }}>{d.dia}{d.fecha === today() ? ' ◀' : ''}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: '#4caf7d' }}>{fmt(d.ing)}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: '#d95f5f' }}>{fmt(d.eg)}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: d.ing - d.eg >= 0 ? '#4caf7d' : '#d95f5f' }}>{fmt(d.ing - d.eg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
