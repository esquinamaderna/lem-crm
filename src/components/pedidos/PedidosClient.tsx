'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today, nowTime } from '@/lib/utils'
import type { Producto, Pedido, PedidoItem } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'

const ESTADOS = ['recibido', 'preparando', 'listo', 'entregado', 'cobrado'] as const
const CANALES = ['Mostrador', 'WhatsApp', 'Instagram', 'Tienda Nube', 'Teléfono']
const PAGOS = ['Efectivo', 'Transferencia', 'MercadoPago', 'Débito', 'Crédito', 'Pendiente']

const ESTADO_COLOR: Record<string, string> = {
  recibido: '#7a776f', preparando: '#5b9bd5', listo: '#c9a227',
  entregado: '#9b72d4', cobrado: '#4caf7d', cancelado: '#d95f5f',
}

function pedNum(n: number) { return 'P' + String(n).padStart(4, '0') }

type CartItem = { id: number; nombre: string; pv: number; qty: number }
type PedidoConItems = Pedido & { pedido_items: PedidoItem[] }

export function PedidosClient() {
  const [pedidos, setPedidos] = useState<PedidoConItems[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modal, setModal] = useState<'nuevo' | 'detalle' | 'ticket' | 'comanda' | null>(null)
  const [detalle, setDetalle] = useState<PedidoConItems | null>(null)
  const [printHTML, setPrintHTML] = useState('')

  // Form nuevo pedido
  const [fCli, setFCli] = useState(''); const [fTel, setFTel] = useState('')
  const [fCanal, setFCanal] = useState('Mostrador'); const [fPago, setFPago] = useState('Efectivo')
  const [fNotas, setFNotas] = useState(''); const [fItems, setFItems] = useState<CartItem[]>([])
  const [fProdSel, setFProdSel] = useState(''); const [fKg, setFKg] = useState(0.5)

  useEffect(() => { load() }, [filtroEstado])

  async function load() {
    let q = supabase.from('pedidos').select('*, pedido_items(*)').order('created_at', { ascending: false })
    if (filtroEstado) q = q.eq('estado', filtroEstado)
    const { data } = await q
    setPedidos((data || []) as PedidoConItems[])

    const { data: prods } = await supabase.from('productos').select('*').eq('activo', true).order('nombre')
    setProductos(prods && prods.length ? prods : PRODUCTOS_DEFAULT.map((p, i) => ({ ...p, id: i + 1 })) as Producto[])
  }

  const total_fItems = fItems.reduce((s, i) => s + i.pv * i.qty, 0)

  function addFItem() {
    const id = parseInt(fProdSel); const p = productos.find(x => x.id === id); if (!p || !fKg) return
    setFItems(prev => { const ex = prev.find(i => i.id === id); if (ex) return prev.map(i => i.id === id ? { ...i, qty: parseFloat((i.qty + fKg).toFixed(1)) } : i); return [...prev, { id, nombre: p.nombre, pv: p.precio_venta, qty: fKg }] })
  }

  async function guardarPedido() {
    if (!fCli.trim() || !fItems.length) return
    const { data: cnt } = await supabase.from('pedidos').select('id', { count: 'exact', head: true })
    const num = pedNum(((cnt as unknown as { count: number })?.count ?? 0) + 1)
    const ped = { numero: num, fecha: today(), hora: nowTime(), cliente: fCli, telefono: fTel, canal: fCanal as Pedido['canal'], estado: 'recibido' as const, medio_pago: fPago, total: total_fItems, cobrado: false, notas: fNotas }
    const { data: pd } = await supabase.from('pedidos').insert(ped).select().single()
    if (!pd) return
    await supabase.from('pedido_items').insert(fItems.map(i => ({ pedido_id: pd.id, producto_id: i.id, producto_nombre: i.nombre, cantidad_kg: i.qty, precio_unit: i.pv })))
    await supabase.from('comandas').insert({ numero: 'CP' + num, pedido_id: pd.id, tipo: 'venta', contenido: { cliente: fCli, items: fItems, total: total_fItems }, impresa: false })
    setModal(null); setFCli(''); setFTel(''); setFItems([]); setFNotas('')
    load()
  }

  async function avanzar(id: number, estadoActual: string) {
    const ci = ESTADOS.indexOf(estadoActual as typeof ESTADOS[number])
    if (ci < ESTADOS.length - 1) {
      const nuevoEstado = ESTADOS[ci + 1]
      await supabase.from('pedidos').update({ estado: nuevoEstado, cobrado: nuevoEstado === 'cobrado', updated_at: new Date().toISOString() }).eq('id', id)
      load()
      if (detalle?.id === id) setDetalle(prev => prev ? { ...prev, estado: nuevoEstado, cobrado: nuevoEstado === 'cobrado' } : prev)
    }
  }

  async function cancelar(id: number) {
    if (!confirm('¿Cancelar este pedido?')) return
    await supabase.from('pedidos').update({ estado: 'cancelado' }).eq('id', id)
    setModal(null); load()
  }

  async function marcarCobrado(id: number) {
    await supabase.from('pedidos').update({ cobrado: true, estado: 'cobrado' }).eq('id', id)
    load(); setDetalle(prev => prev ? { ...prev, cobrado: true, estado: 'cobrado' } : prev)
  }

  function verDetalle(p: PedidoConItems) { setDetalle(p); setModal('detalle') }

  function imprimirTicketPed(p: PedidoConItems) {
    const items = p.pedido_items || []
    const rows = items.map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>${i.producto_nombre} × ${fmtN(i.cantidad_kg)} kg</span><span>${fmt(i.precio_unit * i.cantidad_kg)}</span></div>`).join('')
    setPrintHTML(`<div style="font-family:'Courier New',monospace;font-size:12px;color:#111;background:#fff;padding:14px;max-width:290px;border:1px solid #ccc">
      <div style="text-align:center;font-weight:bold;border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:7px">LA ESQUINA DE MADERNA<br><small style="font-size:10px;font-weight:normal">Tigre, Buenos Aires</small></div>
      <div style="font-size:11px;margin-bottom:7px"><div>Pedido: <strong>${p.numero}</strong></div><div>Fecha: ${p.fecha} · ${p.hora}</div><div>Cliente: ${p.cliente}</div><div>Pago: ${p.medio_pago || '—'}</div></div>
      <div style="border-top:1px dashed #000;margin:5px 0"></div>${rows}<div style="border-top:1px dashed #000;margin:5px 0"></div>
      <div style="font-weight:bold;border-top:1px solid #000;padding-top:4px;display:flex;justify-content:space-between;font-size:14px"><span>TOTAL</span><span>${fmt(p.total || 0)}</span></div>
      <div style="text-align:center;font-size:10px;margin-top:8px;border-top:1px dashed #000;padding-top:5px">¡Gracias! · @laesquinademaderna</div>
    </div>`)
    setModal('ticket')
  }

  function imprimirComandaPed(p: PedidoConItems) {
    const rows = (p.pedido_items || []).map(i => `<div style="display:flex;gap:8px;margin-bottom:4px;font-size:13px"><strong style="min-width:50px">${fmtN(i.cantidad_kg)} kg</strong><span>${i.producto_nombre}</span></div>`).join('')
    setPrintHTML(`<div style="font-family:'Courier New',monospace;border:2px solid #000;padding:10px;max-width:270px;background:#fff;color:#000">
      <div style="text-align:center;font-weight:bold;font-size:15px;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:7px">PEDIDO ${p.numero} · ${p.hora}</div>
      <div style="font-size:12px;margin-bottom:6px">Cliente: <strong>${p.cliente}</strong>${p.canal ? ` · ${p.canal}` : ''}</div>
      <div style="border-top:1px dashed #000;padding-top:6px">${rows}</div>
      <div style="border-top:2px solid #000;margin-top:6px;padding-top:5px;font-size:11px">TOTAL: ${fmt(p.total || 0)}</div>
    </div>`)
    setModal('comanda')
  }

  const print = () => { const pa = document.getElementById('print-area'); if (pa) { pa.innerHTML = printHTML; window.print() } }

  const pendientes = pedidos.filter(p => !['cobrado', 'cancelado'].includes(p.estado)).length
  const cobrados = pedidos.filter(p => p.estado === 'cobrado').length
  const hoyTotal = pedidos.filter(p => p.fecha === today()).reduce((s, p) => s + (p.total || 0), 0)

  const overlay: React.CSSProperties = { display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', zIndex: 200, alignItems: 'center', justifyContent: 'center', padding: 16 }
  const mbox = (wide?: boolean): React.CSSProperties => ({ background: 'var(--card)', border: '1px solid var(--gold-d)', borderRadius: 12, padding: 22, width: '100%', maxWidth: wide ? 800 : 480, maxHeight: '90vh', overflowY: 'auto' })
  const btn = (v?: 'gold' | 'red' | 'green'): React.CSSProperties => ({ padding: '4px 9px', borderRadius: 6, border: `1px solid ${v === 'gold' ? 'var(--gold)' : v === 'red' ? 'rgba(217,95,95,.25)' : v === 'green' ? 'rgba(76,175,125,.25)' : 'var(--border)'}`, background: v === 'gold' ? 'var(--gold)' : v === 'red' ? 'rgba(217,95,95,.12)' : v === 'green' ? 'rgba(76,175,125,.12)' : 'var(--card)', color: v === 'gold' ? '#0f0f0f' : v === 'red' ? '#d95f5f' : v === 'green' ? '#4caf7d' : 'var(--text)', cursor: 'pointer', fontSize: 11, fontFamily: 'Georgia,serif' })

  return (
    <div>
      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
        {[['Total pedidos', pedidos.length, ''], ['Activos', pendientes, '#d95f5f'], ['Cobrados', cobrados, '#4caf7d'], ['Facturado hoy', fmt(hoyTotal), '']].map(([l, v, c]) => (
          <div key={String(l)} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>{l}</div>
            <div style={{ fontSize: 20, color: (c as string) || 'var(--gold)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ width: 140 }}>
            <option value="">Todos</option>
            {[...ESTADOS, 'cancelado'].map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
        <button onClick={() => { setFCli(''); setFTel(''); setFItems([]); setFNotas(''); setModal('nuevo') }} style={{ ...btn('gold'), padding: '6px 14px', fontSize: 12 }}>+ Nuevo pedido</button>
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['#', 'Fecha', 'Cliente', 'Canal', 'Items', 'Total', 'Estado', 'Cobrado', ''].map(h => <th key={h} style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', padding: '7px 10px', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
          <tbody>
            {pedidos.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--dim)', padding: 20 }}>Sin pedidos</td></tr>
              : pedidos.map(p => (
                <tr key={p.id}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--gold)' }}>{p.numero}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{p.fecha}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{p.cliente}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}><span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(91,155,213,.12)', color: '#5b9bd5', border: '1px solid rgba(91,155,213,.25)' }}>{p.canal}</span></td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', fontSize: 11, color: 'var(--muted)' }}>{(p.pedido_items || []).length} productos</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--gold)' }}>{fmt(p.total || 0)}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}><span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, color: ESTADO_COLOR[p.estado] || 'var(--muted)', border: `1px solid ${ESTADO_COLOR[p.estado] || 'var(--muted)'}33`, background: `${ESTADO_COLOR[p.estado] || 'var(--muted)'}18` }}>{p.estado}</span></td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{p.cobrado ? <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(76,175,125,.12)', color: '#4caf7d', border: '1px solid rgba(76,175,125,.25)' }}>✓</span> : <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(217,95,95,.12)', color: '#d95f5f', border: '1px solid rgba(217,95,95,.25)' }}>Pend.</span>}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => verDetalle(p)} style={btn()}>Ver</button>
                      <button onClick={() => avanzar(p.id, p.estado)} style={btn()}>→</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Pedido */}
      {modal === 'nuevo' && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={mbox(true)}>
            <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>Nuevo Pedido</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Cliente *</label><input value={fCli} onChange={e => setFCli(e.target.value)} placeholder="Nombre" /></div>
              <div><label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Teléfono</label><input value={fTel} onChange={e => setFTel(e.target.value)} placeholder="Opcional" /></div>
              <div><label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Canal</label><select value={fCanal} onChange={e => setFCanal(e.target.value)}>{CANALES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Pago</label><select value={fPago} onChange={e => setFPago(e.target.value)}>{PAGOS.map(p => <option key={p}>{p}</option>)}</select></div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>Productos</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select value={fProdSel} onChange={e => setFProdSel(e.target.value)} style={{ flex: 2 }}><option value="">— Seleccionar —</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {fmt(p.precio_venta)}/kg</option>)}</select>
                <input type="number" value={fKg} onChange={e => setFKg(parseFloat(e.target.value))} min={0.1} step={0.1} style={{ width: 80 }} />
                <button onClick={addFItem} style={btn('green')}>+ Agregar</button>
              </div>
              {fItems.map(i => (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid var(--borderl)', fontSize: 12 }}>
                  <div style={{ flex: 1 }}>{i.nombre}</div>
                  <span style={{ color: 'var(--muted)' }}>{fmtN(i.qty)} kg</span>
                  <div style={{ color: 'var(--gold)' }}>{fmt(i.pv * i.qty)}</div>
                  <button onClick={() => setFItems(prev => prev.filter(x => x.id !== i.id))} style={btn('red')}>✕</button>
                </div>
              ))}
              <div style={{ textAlign: 'right', marginTop: 8, color: 'var(--gold)', fontSize: 15 }}>Total: {fmt(total_fItems)}</div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Notas</label><textarea value={fNotas} onChange={e => setFNotas(e.target.value)} rows={2} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setModal(null)} style={btn()}>Cancelar</button>
              <button onClick={guardarPedido} style={btn('gold')}>Guardar pedido</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {modal === 'detalle' && detalle && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={mbox(true)}>
            <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>Pedido {detalle.numero} — {detalle.cliente}</div>
            {/* Pipeline */}
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
              {ESTADOS.map((e, i) => {
                const ci = ESTADOS.indexOf(detalle.estado as typeof ESTADOS[number])
                const isActive = i === ci; const isDone = i < ci
                return <div key={e} onClick={() => avanzar(detalle.id, ESTADOS[i > 0 ? i - 1 : 0])} style={{ flex: 1, padding: '8px 6px', textAlign: 'center', fontSize: 10, letterSpacing: '.5px', textTransform: 'uppercase', color: isActive ? '#0f0f0f' : isDone ? 'var(--gold)' : 'var(--muted)', background: isActive ? 'var(--gold)' : isDone ? 'var(--gold-bg)' : 'var(--surface)', borderRight: '1px solid var(--border)', cursor: 'pointer' }}>{e}</div>
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12, fontSize: 13 }}>
              {[['Canal', detalle.canal], ['Pago', detalle.medio_pago || '—'], ['Fecha', `${detalle.fecha} · ${detalle.hora}`], ['Tel.', detalle.telefono || '—']].map(([l, v]) => (
                <div key={l}><div style={{ fontSize: 11, color: 'var(--muted)' }}>{l}</div><div>{v}</div></div>
              ))}
            </div>
            {detalle.notas && <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--muted)' }}>📌 {detalle.notas}</div>}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 10 }}>
              <thead><tr>{['Producto', 'Cantidad', 'Subtotal'].map(h => <th key={h} style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
              <tbody>{(detalle.pedido_items || []).map(i => <tr key={i.id}><td style={{ padding: '7px 8px', borderBottom: '1px solid var(--borderl)' }}>{i.producto_nombre}</td><td style={{ padding: '7px 8px', borderBottom: '1px solid var(--borderl)' }}>{fmtN(i.cantidad_kg)} kg</td><td style={{ padding: '7px 8px', borderBottom: '1px solid var(--borderl)', textAlign: 'right', color: 'var(--gold)' }}>{fmt(i.precio_unit * i.cantidad_kg)}</td></tr>)}</tbody>
            </table>
            <div style={{ textAlign: 'right', fontSize: 17, color: 'var(--gold)', marginBottom: 12 }}>Total: {fmt(detalle.total || 0)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {!detalle.cobrado && <button onClick={() => marcarCobrado(detalle.id)} style={btn('green')}>✓ Cobrar</button>}
                <button onClick={() => cancelar(detalle.id)} style={btn('red')}>Cancelar pedido</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => imprimirComandaPed(detalle)} style={btn()}>🗒 Comanda</button>
                <button onClick={() => imprimirTicketPed(detalle)} style={btn()}>🧾 Ticket</button>
                <button onClick={() => setModal(null)} style={btn()}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal ticket/comanda print */}
      {(modal === 'ticket' || modal === 'comanda') && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ ...mbox(), maxWidth: 380 }}>
            <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>{modal === 'ticket' ? '🧾 Ticket' : '🗒 Comanda'}</div>
            <div dangerouslySetInnerHTML={{ __html: printHTML }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button onClick={print} style={btn()}>🖨 Imprimir</button>
              <button onClick={() => setModal(null)} style={btn()}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
