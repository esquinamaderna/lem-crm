'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today, nowTime, fechaES } from '@/lib/utils'
import type { Producto, Pedido, PedidoItem } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'

const ESTADOS = ['recibido', 'preparando', 'listo', 'entregado', 'cobrado'] as const
const CANALES = ['Mostrador', 'WhatsApp', 'Instagram', 'Tienda Nube', 'Teléfono']
const PAGOS = ['Efectivo', 'Transferencia', 'Transferencia MP', 'MercadoPago', 'Débito', 'Crédito', 'Pendiente']
const ESTADO_COLOR: Record<string, string> = { recibido: '#7a776f', preparando: '#1050a0', listo: '#9a7a1a', entregado: '#6030a0', cobrado: '#1a7a40', cancelado: '#aa2020' }
const b = (v?: 'gold' | 'red' | 'green'): React.CSSProperties => ({ padding: '8px 12px', borderRadius: 6, border: `1px solid ${v === 'gold' ? 'var(--gold)' : v === 'red' ? 'rgba(190,50,50,.25)' : v === 'green' ? 'rgba(30,140,70,.25)' : 'var(--border)'}`, background: v === 'gold' ? 'var(--gold)' : v === 'red' ? 'rgba(190,50,50,.10)' : v === 'green' ? 'rgba(30,140,70,.10)' : 'var(--card)', color: v === 'gold' ? '#0f0f0f' : v === 'red' ? '#aa2020' : v === 'green' ? '#1a7a40' : 'var(--text)', cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif' })
const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }

type CartItem = { id: number; nombre: string; pv: number; qty: number; descPct: number; descMonto: number }
type PedidoConItems = Pedido & { pedido_items: PedidoItem[] }

function pedNum(n: number) { return 'P' + String(n).padStart(4, '0') }

const badgeEstado = (estado: string) => (
  <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 4, fontSize: 11, color: ESTADO_COLOR[estado] || 'var(--muted)', border: `1px solid ${ESTADO_COLOR[estado] || 'var(--muted)'}44`, background: `${ESTADO_COLOR[estado] || 'var(--muted)'}18` }}>{estado}</span>
)

export function PedidosClient() {
  const [pedidos, setPedidos] = useState<PedidoConItems[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modal, setModal] = useState<'nuevo' | 'detalle' | 'print' | null>(null)
  const [detalle, setDetalle] = useState<PedidoConItems | null>(null)
  const [printHTML, setPrintHTML] = useState('')
  const [printTitle, setPrintTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [fCli, setFCli] = useState(''); const [fTel, setFTel] = useState('')
  const [fCanal, setFCanal] = useState('Mostrador'); const [fPago, setFPago] = useState('Efectivo')
  const [fNotas, setFNotas] = useState(''); const [fItems, setFItems] = useState<CartItem[]>([])
  const [fProdSel, setFProdSel] = useState(''); const [fKg, setFKg] = useState<number>(0.5)
  const [fDescPct, setFDescPct] = useState(''); const [fDescMonto, setFDescMonto] = useState('')

  useEffect(() => { load() }, [filtroEstado])

  async function load() {
    let q = supabase.from('pedidos').select('*, pedido_items(id, pedido_id, producto_id, producto_nombre, cantidad_kg, precio_unit)').order('created_at', { ascending: false })
    if (filtroEstado) q = q.eq('estado', filtroEstado)
    const { data } = await q
    setPedidos((data || []) as PedidoConItems[])
    const { data: prods } = await supabase.from('productos').select('*').eq('activo', true).order('nombre')
    setProductos(prods && prods.length ? prods : PRODUCTOS_DEFAULT.map((p, i) => ({ ...p, id: i + 1 })) as Producto[])
  }

  const calcSubtotalItem = (i: CartItem) => (isNaN(i.pv) || isNaN(i.qty) ? 0 : i.pv * i.qty)
  const calcDescuentoItem = (i: CartItem) => {
    const sub = calcSubtotalItem(i)
    if (i.descMonto > 0) return Math.min(i.descMonto, sub)
    if (i.descPct > 0) return sub * (i.descPct / 100)
    return 0
  }
  const calcTotalItem = (i: CartItem) => calcSubtotalItem(i) - calcDescuentoItem(i)
  const subtotalConDescItems = fItems.reduce((s, i) => s + calcTotalItem(i), 0)
  const descItemsTotalF = fItems.reduce((s, i) => s + calcDescuentoItem(i), 0)
  const descGlobalF = fDescMonto ? (parseFloat(fDescMonto) || 0) : fDescPct ? subtotalConDescItems * (parseFloat(fDescPct) / 100) : 0
  const totalFItems = Math.max(0, subtotalConDescItems - descGlobalF)

  function addFItem() {
    const id = parseInt(fProdSel); const p = productos.find(x => x.id === id); if (!p || !fKg || fKg <= 0) return
    setFItems(prev => { const ex = prev.find(i => i.id === id); if (ex) return prev.map(i => i.id === id ? { ...i, qty: parseFloat((i.qty + fKg).toFixed(3)) } : i); return [...prev, { id, nombre: p.nombre, pv: p.precio_venta, qty: parseFloat(fKg.toString()) || 0.5, descPct: 0, descMonto: 0 }] })
  }

  async function guardarPedido() {
    if (!fCli.trim()) { alert('Ingresá el nombre del cliente'); return }
    if (!fItems.length) { alert('Agregá al menos un producto'); return }
    setSaving(true)
    try {
      const { count } = await supabase.from('pedidos').select('*', { count: 'exact', head: true })
      const num = pedNum((count ?? 0) + 1)
      const pedido = { numero: num, fecha: today(), hora: nowTime(), cliente: fCli.trim(), telefono: fTel, canal: fCanal as Pedido['canal'], estado: 'recibido' as const, medio_pago: fPago, total: totalFItems, cobrado: false, notas: fNotas }
      const { data: pd, error } = await supabase.from('pedidos').insert(pedido).select().single()
      if (error) { alert('Error: ' + error.message); return }
      await supabase.from('pedido_items').insert(fItems.map(i => ({ pedido_id: pd.id, producto_id: i.id, producto_nombre: i.nombre, cantidad_kg: i.qty, precio_unit: i.pv, descuento_pct: i.descPct || 0, descuento_monto: calcDescuentoItem(i), precio_final: calcTotalItem(i) })))
      await supabase.from('comandas').insert({ numero: 'CP' + num, pedido_id: pd.id, tipo: 'venta', contenido: { cliente: fCli, items: fItems, total: totalFItems }, impresa: false })
      setModal(null); setFCli(''); setFTel(''); setFItems([]); setFNotas(''); setFDescPct(''); setFDescMonto(''); load()
    } catch (e) { console.error(e); alert('Error inesperado') }
    setSaving(false)
  }

  async function avanzar(id: number, estadoActual: string) {
    const ci = ESTADOS.indexOf(estadoActual as typeof ESTADOS[number])
    if (ci < ESTADOS.length - 1) {
      const nuevo = ESTADOS[ci + 1]
      await supabase.from('pedidos').update({ estado: nuevo, cobrado: nuevo === 'cobrado' }).eq('id', id)
      load()
      if (detalle?.id === id) setDetalle(prev => prev ? { ...prev, estado: nuevo, cobrado: nuevo === 'cobrado' } : prev)
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

  function impTicket(p: PedidoConItems) {
    const rows = (p.pedido_items || []).map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>${i.producto_nombre} × ${fmtN(i.cantidad_kg, 3)} kg</span><span>${fmt(i.precio_unit * i.cantidad_kg)}</span></div>`).join('')
    setPrintHTML(`<div style="font-family:'Courier New',monospace;font-size:12px;color:#111;background:#fff;padding:14px;max-width:290px;border:1px solid #ccc"><div style="text-align:center;font-weight:bold;border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:7px">LA ESQUINA DE MADERNA</div><div style="font-size:11px;margin-bottom:7px"><div>Pedido: <strong>${p.numero}</strong></div><div>${fechaES(p.fecha)} · ${p.hora?.substring(0, 5)}</div><div>Cliente: ${p.cliente}</div><div>Pago: ${p.medio_pago || '—'}</div></div><div style="border-top:1px dashed #000;margin:5px 0"></div>${rows}<div style="border-top:1px dashed #000;margin:5px 0"></div><div style="font-weight:bold;display:flex;justify-content:space-between;font-size:14px"><span>TOTAL</span><span>${fmt(p.total || 0)}</span></div><div style="text-align:center;font-size:10px;margin-top:8px;border-top:1px dashed #000;padding-top:5px">¡Gracias! · @laesquinademaderna</div></div>`)
    setPrintTitle('🧾 Ticket'); setModal('print')
  }

  function impComanda(p: PedidoConItems) {
    const rows = (p.pedido_items || []).map(i => `<div style="display:flex;gap:8px;margin-bottom:4px;font-size:13px"><strong style="min-width:60px">${fmtN(i.cantidad_kg, 3)} kg</strong><span>${i.producto_nombre}</span></div>`).join('')
    setPrintHTML(`<div style="font-family:'Courier New',monospace;border:2px solid #000;padding:10px;max-width:270px;background:#fff;color:#000"><div style="text-align:center;font-weight:bold;font-size:15px;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:7px">PEDIDO ${p.numero} · ${p.hora?.substring(0, 5)}</div><div style="font-size:12px;margin-bottom:6px">Cliente: <strong>${p.cliente}</strong>${p.canal ? ` · ${p.canal}` : ''}</div><div style="border-top:1px dashed #000;padding-top:6px">${rows}</div><div style="border-top:2px solid #000;margin-top:6px;padding-top:5px;font-size:11px">TOTAL: ${fmt(p.total || 0)}</div></div>`)
    setPrintTitle('🗒 Comanda'); setModal('print')
  }

  const print = () => { const pa = document.getElementById('print-area'); if (pa) { pa.innerHTML = printHTML; window.print() } }
  const pendientes = pedidos.filter(p => !['cobrado', 'cancelado'].includes(p.estado)).length
  const hoyTotal = pedidos.filter(p => p.fecha === today()).reduce((s, p) => s + (p.total || 0), 0)
  const overlay: React.CSSProperties = { display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, alignItems: 'center', justifyContent: 'center', padding: '16px' }
  const mbox = (wide?: boolean): React.CSSProperties => ({ background: 'var(--card)', border: '1px solid var(--gold-d)', borderRadius: 12, padding: 22, width: '100%', maxWidth: wide ? 800 : 520, maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box' as const })

  return (
    <div>
      <style>{`.ped-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}`}</style>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
        {[['Total', String(pedidos.length), ''], ['Activos', String(pendientes), '#aa2020'], ['Cobrados', String(pedidos.filter(p => p.estado === 'cobrado').length), '#1a7a40'], ['Hoy', fmt(hoyTotal), '']].map(([l, v, c]) => (
          <div key={l} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>{l}</div>
            <div style={{ fontSize: 20, color: (c as string) || 'var(--gold)' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ width: 160 }}>
          <option value="">Todos</option>
          {[...ESTADOS, 'cancelado'].map(e => <option key={e}>{e}</option>)}
        </select>
        <button onClick={() => { setFCli(''); setFTel(''); setFItems([]); setFNotas(''); setModal('nuevo') }} style={{ ...b('gold'), whiteSpace: 'nowrap' }}>+ Nuevo pedido</button>
      </div>

      {/* Cards móvil */}
      <div className="resp-cards" style={{ display: 'none' }}>
        {pedidos.length === 0 ? <div style={{ color: 'var(--dim)', textAlign: 'center', padding: 20 }}>Sin pedidos</div>
          : pedidos.map(p => (
            <div key={p.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{p.numero}</span>
                {badgeEstado(p.estado)}
              </div>
              <div style={{ fontSize: 14, marginBottom: 4 }}>{p.cliente}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{fechaES(p.fecha)} · {p.canal} · {p.cobrado ? <span style={{ color: '#1a7a40' }}>✓ Cobrado</span> : <span style={{ color: '#aa2020' }}>Pendiente</span>}</div>
              <div style={{ fontSize: 16, color: 'var(--gold)', marginBottom: 10 }}>{fmt(p.total || 0)}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => {
              try {
                const { data: ped } = await supabase.from('pedidos').select('*').eq('id', p.id).single()
                const { data: items } = await supabase.from('pedido_items')
                  .select('id, pedido_id, producto_id, producto_nombre, cantidad_kg, precio_unit')
                  .eq('pedido_id', p.id)
                const { data: stockFresco } = await supabase.from('productos').select('id, nombre, stock_kg').eq('activo', true)
                if (stockFresco) {
                  setProductos(stockFresco)
                  const mapa: Record<string, number> = {}
                  stockFresco.forEach((pr: any) => { mapa[pr.nombre.toLowerCase().trim()] = pr.stock_kg })
                  setStockMap(mapa)
                }
                const pedidoCompleto = { ...(ped || p), pedido_items: items || [] }
                setDetalle(pedidoCompleto as PedidoConItems)
                setModal('detalle')
              } catch (err) { console.error(err); setDetalle(p); setModal('detalle') }
            }} style={{ ...b(), flex: 1 }}>Ver</button>
                <button onClick={() => avanzar(p.id, p.estado)} style={{ ...b('gold'), flex: 1 }}>
                {p.estado==='recibido'?'▶ Preparar':p.estado==='preparando'?'✓ Listo':p.estado==='listo'?'📦 Entregar':p.estado==='entregado'?'💰 Cobrar':'Avanzar'}
              </button>
              </div>
            </div>
          ))}
      </div>

      {/* Tabla desktop */}
      <div className="resp-table" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
          <thead><tr>{['#', 'Fecha', 'Cliente', 'Canal', 'Total', 'Estado', 'Cobrado', ''].map(h => <th key={h} style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', padding: '7px 10px', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
          <tbody>
            {pedidos.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--dim)', padding: 20 }}>Sin pedidos</td></tr>
              : pedidos.map(p => (
                <tr key={p.id}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--gold)' }}>{p.numero}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{fechaES(p.fecha)}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{p.cliente}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}><span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(30,100,180,.10)', color: '#1050a0', border: '1px solid rgba(30,100,180,.25)' }}>{p.canal}</span></td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--gold)' }}>{fmt(p.total || 0)}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{badgeEstado(p.estado)}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>{p.cobrado ? <span style={{ color: '#1a7a40', fontSize: 12 }}>✓</span> : <span style={{ color: '#aa2020', fontSize: 12 }}>Pend.</span>}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}><div style={{ display: 'flex', gap: 4 }}><button onClick={async () => {
                          try {
                            // Cargar pedido y items por separado (evita 400 del join)
                            const { data: ped } = await supabase.from('pedidos').select('*').eq('id', p.id).single()
                            const { data: items } = await supabase.from('pedido_items')
                              .select('id, pedido_id, producto_id, producto_nombre, cantidad_kg, precio_unit')
                              .eq('pedido_id', p.id)
                            const { data: stockFresco } = await supabase.from('productos').select('id, nombre, stock_kg').eq('activo', true)
                            if (stockFresco) {
                              setProductos(stockFresco)
                              const mapa: Record<string, number> = {}
                              stockFresco.forEach((pr: any) => { mapa[pr.nombre.toLowerCase().trim()] = pr.stock_kg })
                              setStockMap(mapa)
                            }
                            const pedidoCompleto = { ...(ped || p), pedido_items: items || [] }
                            setDetalle(pedidoCompleto as PedidoConItems)
                            setModal('detalle')
                          } catch (err) { console.error(err); setDetalle(p); setModal('detalle') }
                        }} style={{ ...b(), padding: '4px 8px', fontSize: 11 }}>Ver</button><button onClick={() => avanzar(p.id, p.estado)} style={{ padding:'4px 8px', fontSize:10, borderRadius:6, cursor:'pointer', fontFamily:'Georgia,serif', border:'1px solid rgba(201,162,39,.3)', background:'rgba(201,162,39,.1)', color:'var(--gold)' }}>
                        {p.estado==='recibido'?'Preparar':p.estado==='preparando'?'Listo':p.estado==='listo'?'Entregar':p.estado==='entregado'?'Cobrar':'→'}
                      </button></div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo */}
      {modal === 'nuevo' && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={mbox(true)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', textTransform: 'uppercase' }}>Nuevo Pedido</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div className="ped-grid" style={{ marginBottom: 10 }}>
              <div><label style={lbl}>Cliente *</label><input value={fCli} onChange={e => setFCli(e.target.value)} placeholder="Nombre del cliente" /></div>
              <div><label style={lbl}>Teléfono</label><input value={fTel} onChange={e => setFTel(e.target.value)} placeholder="Opcional" /></div>
              <div><label style={lbl}>Canal</label><select value={fCanal} onChange={e => setFCanal(e.target.value)}>{CANALES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label style={lbl}>Medio de pago</label><select value={fPago} onChange={e => setFPago(e.target.value)}>{PAGOS.map(p => <option key={p}>{p}</option>)}</select></div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>Productos</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <select value={fProdSel} onChange={e => setFProdSel(e.target.value)} style={{ flex: 2, minWidth: 160 }}><option value="">— Seleccionar —</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {fmt(p.precio_venta)}/kg</option>)}</select>
                <input type="number" value={fKg} onChange={e => setFKg(parseFloat(e.target.value) || 0.5)} min={0.1} step={0.1} style={{ width: 80 }} />
                <button onClick={addFItem} style={{ ...b('green'), whiteSpace: 'nowrap' }}>+ Agregar</button>
              </div>
              {fItems.map(i => {
                const sub = calcSubtotalItem(i)
                const desc = calcDescuentoItem(i)
                const total = calcTotalItem(i)
                return (
                  <div key={i.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--borderl)' }}>
                    {/* Fila producto */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, fontSize: 13 }}>
                      <div style={{ flex: 1 }}>{i.nombre} — {fmtN(i.qty, 3)} kg</div>
                      <div style={{ color: desc > 0 ? 'var(--muted)' : 'var(--gold)', textDecoration: desc > 0 ? 'line-through' : 'none', fontSize: 12 }}>{fmt(sub)}</div>
                      {desc > 0 && <div style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{fmt(total)}</div>}
                      <button onClick={() => setFItems(prev => prev.filter(x => x.id !== i.id))} style={{ color: '#aa2020', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
                    </div>
                    {/* Descuento por ítem */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 70 }}>Descuento:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="number" placeholder="%" value={i.descPct || ''}
                          onChange={e => setFItems(prev => prev.map(x => x.id === i.id ? { ...x, descPct: parseFloat(e.target.value) || 0, descMonto: 0 } : x))}
                          style={{ width: 55, fontSize: 11, padding: '2px 5px' }} />
                        <span style={{ fontSize: 11, color: 'var(--dim)' }}>%</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--dim)' }}>ó</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="number" placeholder="$ fijo" value={i.descMonto || ''}
                          onChange={e => setFItems(prev => prev.map(x => x.id === i.id ? { ...x, descMonto: parseFloat(e.target.value) || 0, descPct: 0 } : x))}
                          style={{ width: 75, fontSize: 11, padding: '2px 5px' }} />
                      </div>
                      {desc > 0 && <span style={{ fontSize: 11, color: '#aa2020' }}>−{fmt(desc)}</span>}
                    </div>
                  </div>
                )
              })}
              {/* Descuento global sobre el total del pedido */}
              <div style={{ borderTop: '1px solid var(--borderl)', paddingTop: 10, marginTop: 8 }}>
                <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Descuento sobre el total del pedido</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="number" value={fDescPct} onChange={e => { setFDescPct(e.target.value); setFDescMonto('') }} placeholder="% ej: 10" style={{ fontSize: 12, padding: '5px 8px' }} />
                  <input type="number" value={fDescMonto} onChange={e => { setFDescMonto(e.target.value); setFDescPct('') }} placeholder="$ fijo" style={{ fontSize: 12, padding: '5px 8px' }} />
                </div>
              </div>
              {/* ── ALERTA DE STOCK INSUFICIENTE ── */}
              {fItems.filter(i => {
                const prod = productos.find(p => p.id === i.id)
                return prod && i.qty > prod.stock_kg
              }).length > 0 && (
                <div style={{ margin: '12px 0', padding: '14px 16px', background: '#fff0f0', border: '2px solid #aa2020', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>🚨</span>
                    <span style={{ fontSize: 14, fontWeight: 'bold', color: '#aa2020', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      Producción urgente requerida
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#7a1010', marginBottom: 10 }}>
                    El pedido se puede registrar pero <strong>no hay stock suficiente</strong> para entregar:
                  </div>
                  {fItems.filter(i => {
                    const prod = productos.find(p => p.id === i.id)
                    return prod && i.qty > prod.stock_kg
                  }).map(i => {
                    const prod = productos.find(p => p.id === i.id)!
                    const falta = parseFloat((i.qty - prod.stock_kg).toFixed(3))
                    return (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', border: '1px solid #d98080', borderRadius: 6, marginBottom: 6 }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#aa2020', fontSize: 13 }}>{i.nombre}</div>
                          <div style={{ fontSize: 12, color: '#7a1010', marginTop: 2 }}>
                            Pedido: {fmtN(i.qty, 2)} kg · Stock: {fmtN(prod.stock_kg, 2)} kg
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#aa2020' }}>−{fmtN(falta, 2)} kg</div>
                          <div style={{ fontSize: 11, color: '#7a1010' }}>a producir</div>
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ fontSize: 12, color: '#7a1010', marginTop: 6, padding: '6px 10px', background: 'rgba(170,32,32,.08)', borderRadius: 4 }}>
                    ⚠ Informar al cliente que la entrega requiere producción previa. El pedido queda registrado como "recibido".
                  </div>
                </div>
              )}

              {/* ── Resumen de totales ── */}
              <div style={{ borderTop: '1px solid var(--gold-d)', paddingTop: 10, marginTop: 8 }}>
                {fItems.reduce((s, i) => s + calcSubtotalItem(i), 0) !== subtotalConDescItems && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>
                    <span>Subtotal bruto</span><span>{fmt(fItems.reduce((s, i) => s + calcSubtotalItem(i), 0))}</span>
                  </div>
                )}
                {descItemsTotalF > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aa2020', marginBottom: 2 }}>
                    <span>Dto. por ítems</span><span>−{fmt(descItemsTotalF)}</span>
                  </div>
                )}
                {descGlobalF > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aa2020', marginBottom: 4, borderTop: '1px solid var(--borderl)', paddingTop: 3 }}>
                    <span>Dto. total{fDescPct ? ` ${fDescPct}%` : ''}</span><span>−{fmt(descGlobalF)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: 'var(--gold)', fontWeight: 'bold' }}>
                  <span>TOTAL</span><span>{fmt(totalFItems)}</span>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={lbl}>Notas</label><textarea value={fNotas} onChange={e => setFNotas(e.target.value)} rows={2} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ ...b(), flex: 1 }}>Cancelar</button>
              <button onClick={guardarPedido} disabled={saving} style={{ ...b('gold'), flex: 1, opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando...' : 'Guardar pedido'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {modal === 'detalle' && detalle && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={mbox(true)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', textTransform: 'uppercase' }}>Pedido {detalle.numero}</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            {/* Pipeline */}
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 14 }}>
              {ESTADOS.map((e, i) => {
                const ci = ESTADOS.indexOf(detalle.estado as typeof ESTADOS[number])
                return <div key={e} onClick={() => avanzar(detalle.id, i > 0 ? ESTADOS[i - 1] : ESTADOS[0])} style={{ flex: 1, padding: '8px 4px', textAlign: 'center', fontSize: 10, letterSpacing: '.3px', textTransform: 'uppercase', color: i === ci ? '#0f0f0f' : i < ci ? 'var(--gold)' : 'var(--muted)', background: i === ci ? 'var(--gold)' : i < ci ? 'var(--gold-bg)' : 'var(--surface)', borderRight: '1px solid var(--border)', cursor: 'pointer' }}>{e}</div>
              })}
            </div>
            <div className="ped-grid" style={{ marginBottom: 12, fontSize: 13 }}>
              {[['Canal', detalle.canal], ['Pago', detalle.medio_pago || '—'], ['Fecha', `${fechaES(detalle.fecha)} · ${detalle.hora?.substring(0, 5)}`], ['Tel.', detalle.telefono || '—']].map(([l, v]) => <div key={l}><div style={{ fontSize: 11, color: 'var(--muted)' }}>{l}</div><div>{v}</div></div>)}
            </div>
            {detalle.notas && <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--muted)' }}>📌 {detalle.notas}</div>}

            {/* Alerta de stock insuficiente en detalle del pedido */}
            {['recibido', 'preparando'].includes(detalle.estado) && (detalle.pedido_items || []).length > 0 && (() => {
              // Calcular ítems con stock insuficiente
              const alertas = (detalle.pedido_items || []).map(i => {
                const key = i.producto_nombre.toLowerCase().trim()
                // Usar stockMap (cargado al abrir el detalle) o fallback a productos[]
                const stockDisp = key in stockMap
                  ? stockMap[key]
                  : (productos.find(p => p.nombre.toLowerCase().trim() === key)?.stock_kg ?? null)
                const falta = stockDisp !== null ? parseFloat((i.cantidad_kg - stockDisp).toFixed(2)) : 0
                return { ...i, stockDisp, falta, sinStock: stockDisp !== null && i.cantidad_kg > stockDisp }
              }).filter(a => a.sinStock)

              if (!alertas.length) return null
              return (
                <div style={{ marginBottom: 14, padding: '14px 16px', background: '#fff0f0', border: '2px solid #aa2020', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>🚨</span>
                    <span style={{ fontSize: 14, fontWeight: 'bold', color: '#aa2020', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Producción urgente requerida
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#7a1010', marginBottom: 10 }}>
                    Stock insuficiente para entregar este pedido:
                  </div>
                  {alertas.map(i => (
                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#fff', border: '1px solid #d98080', borderRadius: 6, marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#aa2020', fontSize: 13 }}>{i.producto_nombre}</div>
                        <div style={{ fontSize: 11, color: '#7a1010', marginTop: 2 }}>
                          Pedido: {fmtN(i.cantidad_kg, 2)} kg · Stock actual: {fmtN(i.stockDisp ?? 0, 2)} kg
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#aa2020' }}>−{fmtN(i.falta, 2)} kg</div>
                        <div style={{ fontSize: 11, color: '#7a1010' }}>a producir</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: '#7a1010', marginTop: 6, padding: '6px 10px', background: 'rgba(170,32,32,.08)', borderRadius: 4 }}>
                    ⚠ Coordinar producción antes de la entrega.
                  </div>
                </div>
              )
            })()}
            {(detalle.pedido_items || []).map(i => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--borderl)', fontSize: 13 }}>
                <span>{i.producto_nombre}</span><span style={{ color: 'var(--muted)' }}>{fmtN(i.cantidad_kg, 3)} kg</span><span style={{ color: 'var(--gold)' }}>{fmt(i.precio_unit * i.cantidad_kg)}</span>
              </div>
            ))}
            <div style={{ textAlign: 'right', fontSize: 18, color: 'var(--gold)', margin: '10px 0' }}>Total: {fmt(detalle.total || 0)}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {!detalle.cobrado && <button onClick={() => marcarCobrado(detalle.id)} style={{ ...b('green'), flex: 1 }}>✓ Cobrar</button>}
              <button onClick={() => cancelar(detalle.id)} style={{ ...b('red'), flex: 1 }}>Cancelar</button>
              <button onClick={() => impComanda(detalle)} style={{ ...b(), flex: 1 }}>🗒 Comanda</button>
              <button onClick={() => impTicket(detalle)} style={{ ...b(), flex: 1 }}>🧾 Ticket</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Print */}
      {modal === 'print' && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ ...mbox(), maxWidth: 380 }}>
            <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>{printTitle}</div>
            <div dangerouslySetInnerHTML={{ __html: printHTML }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={print} style={{ ...b(), flex: 1 }}>🖨 Imprimir</button>
              <button onClick={() => setModal(null)} style={{ ...b(), flex: 1 }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
