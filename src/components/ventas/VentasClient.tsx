'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today, fechaES } from '@/lib/utils'

const b = (v?: 'gold'): React.CSSProperties => ({ padding: '4px 9px', borderRadius: 6, border: `1px solid ${v === 'gold' ? 'var(--gold)' : 'var(--border)'}`, background: v === 'gold' ? 'var(--gold)' : 'var(--card)', color: v === 'gold' ? '#0f0f0f' : 'var(--text)', cursor: 'pointer', fontSize: 11, fontFamily: 'Georgia,serif' })

type VentaRow = {
  id: number; numero_ticket: string; fecha: string; hora: string
  cliente: string; medio_pago: string; total: number; estado: string
  venta_items: { id: number; producto_nombre: string; cantidad_kg: number; precio_unit: number }[]
}
type PedidoRow = {
  id: number; numero: string; fecha: string; hora: string
  cliente: string; canal: string; medio_pago: string; total: number; estado: string; cobrado: boolean
  pedido_items: { id: number; producto_nombre: string; cantidad_kg: number; precio_unit: number }[]
}

type TabType = 'ventas' | 'pedidos' | 'todas'

export function VentasClient() {
  const [ventas, setVentas] = useState<VentaRow[]>([])
  const [pedidos, setPedidos] = useState<PedidoRow[]>([])
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [tab, setTab] = useState<TabType>('todas')
  const [modal, setModal] = useState(false)
  const [det, setDet] = useState<VentaRow | PedidoRow | null>(null)
  const [detTipo, setDetTipo] = useState<'venta' | 'pedido'>('venta')

  useEffect(() => { load() }, [desde, hasta])

  async function load() {
    let qv = supabase.from('ventas').select('*, venta_items(*)').order('created_at', { ascending: false })
    let qp = supabase.from('pedidos').select('*, pedido_items(*)').order('created_at', { ascending: false })
    if (desde) { qv = qv.gte('fecha', desde); qp = qp.gte('fecha', desde) }
    if (hasta) { qv = qv.lte('fecha', hasta); qp = qp.lte('fecha', hasta) }
    const [rv, rp] = await Promise.all([qv, qp])
    setVentas((rv.data || []) as VentaRow[])
    setPedidos((rp.data || []) as PedidoRow[])
  }

  const totalVentas = ventas.reduce((s, v) => s + v.total, 0)
  const totalPedidos = pedidos.filter(p => p.cobrado).reduce((s, p) => s + (p.total || 0), 0)
  const hoyV = ventas.filter(v => v.fecha === today()).reduce((s, v) => s + v.total, 0)
  const hoyP = pedidos.filter(p => p.fecha === today() && p.cobrado).reduce((s, p) => s + (p.total || 0), 0)

  function buildTicketHTML(v: VentaRow) {
    const rows = v.venta_items.map(i =>
      `<div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>${i.producto_nombre} × ${fmtN(i.cantidad_kg, 3)} kg</span><span>${fmt(i.precio_unit * i.cantidad_kg)}</span></div>`
    ).join('')
    return `<div style="font-family:'Courier New',monospace;font-size:12px;color:#111;background:#fff;padding:14px;max-width:290px;border:1px solid #ccc">
      <div style="text-align:center;font-weight:bold;border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:7px">LA ESQUINA DE MADERNA<br><small>Tigre, Buenos Aires</small></div>
      <div style="font-size:11px;margin-bottom:7px"><div>Ticket: <strong>${v.numero_ticket}</strong></div><div>${fechaES(v.fecha)} · ${v.hora?.substring(0, 5)}</div><div>Cliente: ${v.cliente}</div><div>Pago: ${v.medio_pago}</div></div>
      <div style="border-top:1px dashed #000;margin:5px 0"></div>${rows}<div style="border-top:1px dashed #000;margin:5px 0"></div>
      <div style="font-weight:bold;display:flex;justify-content:space-between;font-size:14px"><span>TOTAL</span><span>${fmt(v.total)}</span></div>
      <div style="text-align:center;font-size:10px;margin-top:8px;border-top:1px dashed #000;padding-top:5px">¡Gracias! · @laesquinademaderna</div>
    </div>`
  }

  function buildComandaHTML(p: PedidoRow) {
    const rows = p.pedido_items.map(i =>
      `<div style="display:flex;gap:8px;margin-bottom:4px;font-size:13px"><strong style="min-width:60px">${fmtN(i.cantidad_kg, 3)} kg</strong><span>${i.producto_nombre}</span></div>`
    ).join('')
    return `<div style="font-family:'Courier New',monospace;border:2px solid #000;padding:10px;max-width:270px;background:#fff;color:#000">
      <div style="text-align:center;font-weight:bold;font-size:15px;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:7px">COMANDA ${p.numero}</div>
      <div style="font-size:12px;margin-bottom:6px">Cliente: <strong>${p.cliente}</strong> · ${p.canal}</div>
      <div style="border-top:1px dashed #000;padding-top:6px">${rows}</div>
      <div style="border-top:2px solid #000;margin-top:6px;padding-top:5px;font-size:13px;font-weight:bold">TOTAL: ${fmt(p.total || 0)}</div>
    </div>`
  }

  function print(html: string) {
    const pa = document.getElementById('print-area')
    if (pa) { pa.innerHTML = html; window.print() }
  }

  function exportCSV() {
    const rows = [['Tipo', 'Número', 'Fecha', 'Cliente', 'Total', 'Estado']]
    ventas.forEach(v => rows.push(['Venta', v.numero_ticket, v.fecha, v.cliente, String(v.total), v.estado]))
    pedidos.forEach(p => rows.push(['Pedido', p.numero, p.fecha, p.cliente, String(p.total || 0), p.estado]))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }))
    a.download = `comandas_${today()}.csv`
    a.click()
  }

  const overlay: React.CSSProperties = { display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, alignItems: 'center', justifyContent: 'center', padding: '16px' }
  const mbox: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--gold-d)', borderRadius: 12, padding: 22, width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box' as const }
  const ESTADO_COLOR: Record<string, string> = { cobrada: '#1a7a40', pendiente: '#9a7a1a', anulada: '#aa2020', recibido: '#7a776f', preparando: '#1050a0', listo: '#9a7a1a', entregado: '#6030a0', cobrado: '#1a7a40', cancelado: '#aa2020' }

  return (
    <div>
      <style>{`.resp-table{display:block}@media(max-width:640px){.resp-table{display:none!important}.resp-cards{display:flex!important}}`}</style>
      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          ['Ventas (mostrador)', String(ventas.length), ''],
          ['Pedidos (canal)', String(pedidos.length), ''],
          ['Total ventas', fmt(totalVentas), ''],
          ['Hoy (ventas+pedidos)', fmt(hoyV + hoyP), ''],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>{l}</div>
            <div style={{ fontSize: 18, color: (c as string) || 'var(--gold)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filtros y tabs */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8, paddingTop: 20 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['todas', 'ventas', 'pedidos'] as TabType[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${tab === t ? 'var(--gold)' : 'var(--border)'}`, background: tab === t ? 'var(--gold-bg)' : 'var(--card)', color: tab === t ? 'var(--gold)' : 'var(--muted)', cursor: 'pointer', fontSize: 11, fontFamily: 'Georgia,serif' }}>
              {t === 'todas' ? 'Todas' : t === 'ventas' ? 'Ventas (mostrador)' : 'Pedidos (canal)'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>Desde</div>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 145 }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>Hasta</div>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 145 }} />
          </div>
          <button onClick={exportCSV} style={{ ...b(), alignSelf: 'flex-end' }}>⬇ CSV</button>
        </div>
      </div>

      {/* VENTAS */}
      {(tab === 'todas' || tab === 'ventas') && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>Ventas — Mostrador</div>
          <div style={{ overflowX: 'auto', width: '100%' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 500 }}>
            <thead><tr>{['Ticket', 'Fecha', 'Cliente', 'Pago', 'Total', 'Estado', ''].map(h => <th key={h} style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', padding: '7px 10px', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {ventas.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--dim)', padding: 16 }}>Sin ventas</td></tr>
                : ventas.map(v => (
                  <tr key={v.id}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--gold)' }}>{v.numero_ticket}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{fechaES(v.fecha)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{v.cliente}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{v.medio_pago}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--gold)' }}>{fmt(v.total)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, color: ESTADO_COLOR[v.estado] || 'var(--muted)', border: `1px solid ${ESTADO_COLOR[v.estado] || 'var(--muted)'}44`, background: `${ESTADO_COLOR[v.estado] || 'var(--muted)'}18` }}>{v.estado}</span>
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setDet(v); setDetTipo('venta'); setModal(true) }} style={b()}>Ver</button>
                        <button onClick={() => print(buildTicketHTML(v))} style={b()}>🧾</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table></div>
        </div>
      )}

      {/* PEDIDOS */}
      {(tab === 'todas' || tab === 'pedidos') && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>Pedidos — Canales</div>
          <div style={{ overflowX: 'auto', width: '100%' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 500 }}>
            <thead><tr>{['#', 'Fecha', 'Cliente', 'Canal', 'Total', 'Estado', 'Cobrado', ''].map(h => <th key={h} style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', padding: '7px 10px', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {pedidos.length === 0
                ? <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--dim)', padding: 16 }}>Sin pedidos</td></tr>
                : pedidos.map(p => (
                  <tr key={p.id}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--gold)' }}>{p.numero}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{fechaES(p.fecha)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{p.cliente}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(30,100,180,.10)', color: '#1050a0', border: '1px solid rgba(30,100,180,.25)' }}>{p.canal}</span>
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--gold)' }}>{fmt(p.total || 0)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, color: ESTADO_COLOR[p.estado] || 'var(--muted)', border: `1px solid ${ESTADO_COLOR[p.estado] || 'var(--muted)'}44`, background: `${ESTADO_COLOR[p.estado] || 'var(--muted)'}18` }}>{p.estado}</span>
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>
                      {p.cobrado
                        ? <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(30,140,70,.10)', color: '#1a7a40', border: '1px solid rgba(30,140,70,.25)' }}>✓</span>
                        : <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(190,50,50,.10)', color: '#aa2020', border: '1px solid rgba(190,50,50,.25)' }}>Pend.</span>}
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setDet(p); setDetTipo('pedido'); setModal(true) }} style={b()}>Ver</button>
                        <button onClick={() => print(buildComandaHTML(p))} style={b()}>🗒</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table></div>
        </div>
      )}

      {/* Modal detalle */}
      {modal && det && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={mbox}>
            <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>
              {detTipo === 'venta' ? `Venta ${(det as VentaRow).numero_ticket}` : `Pedido ${(det as PedidoRow).numero}`}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12, fontSize: 13 }}>
              {detTipo === 'venta' ? [
                ['Fecha', `${fechaES((det as VentaRow).fecha)} · ${(det as VentaRow).hora?.substring(0, 5)}`],
                ['Cliente', det.cliente],
                ['Pago', (det as VentaRow).medio_pago],
                ['Estado', det.estado],
              ].map(([l, v]) => <div key={l}><div style={{ fontSize: 11, color: 'var(--muted)' }}>{l}</div><div>{v}</div></div>)
                : [
                  ['Fecha', `${fechaES((det as PedidoRow).fecha)} · ${(det as PedidoRow).hora?.substring(0, 5)}`],
                  ['Cliente', det.cliente],
                  ['Canal', (det as PedidoRow).canal],
                  ['Pago', (det as PedidoRow).medio_pago || '—'],
                ].map(([l, v]) => <div key={l}><div style={{ fontSize: 11, color: 'var(--muted)' }}>{l}</div><div>{v}</div></div>)}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 }}>
              <thead><tr>{['Producto', 'Cantidad', 'Subtotal'].map(h => <th key={h} style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
              <tbody>
                {detTipo === 'venta'
                  ? (det as VentaRow).venta_items.map(i => <tr key={i.id}><td style={{ padding: '7px 8px', borderBottom: '1px solid var(--borderl)' }}>{i.producto_nombre}</td><td style={{ padding: '7px 8px', borderBottom: '1px solid var(--borderl)' }}>{fmtN(i.cantidad_kg, 3)} kg</td><td style={{ padding: '7px 8px', borderBottom: '1px solid var(--borderl)', textAlign: 'right', color: 'var(--gold)' }}>{fmt(i.precio_unit * i.cantidad_kg)}</td></tr>)
                  : (det as PedidoRow).pedido_items.map(i => <tr key={i.id}><td style={{ padding: '7px 8px', borderBottom: '1px solid var(--borderl)' }}>{i.producto_nombre}</td><td style={{ padding: '7px 8px', borderBottom: '1px solid var(--borderl)' }}>{fmtN(i.cantidad_kg, 3)} kg</td><td style={{ padding: '7px 8px', borderBottom: '1px solid var(--borderl)', textAlign: 'right', color: 'var(--gold)' }}>{fmt(i.precio_unit * i.cantidad_kg)}</td></tr>)}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', fontSize: 17, color: 'var(--gold)', marginBottom: 12 }}>Total: {fmt(det.total || 0)}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {detTipo === 'venta'
                ? <button onClick={() => print(buildTicketHTML(det as VentaRow))} style={b()}>🧾 Ticket</button>
                : <button onClick={() => print(buildComandaHTML(det as PedidoRow))} style={b()}>🗒 Comanda</button>}
              <button onClick={() => setModal(false)} style={b()}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
