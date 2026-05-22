'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today, nowTime, CAT_COLOR } from '@/lib/utils'
import type { Producto, CartItem } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'

const CATS = ['Todos', 'VACUNO', 'CERDO', 'POLLO', 'PAPAS', 'JUMBALAY', 'PACKS']
const PAGOS = ['Efectivo', 'Transferencia', 'Transferencia MP', 'MercadoPago', 'Débito', 'Crédito']
const btnSm: React.CSSProperties = { padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif' }

function ticketNum(n: number) { return 'T' + String(n).padStart(4, '0') }

export function POSClient() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cat, setCat] = useState('Todos')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cliente, setCliente] = useState('')
  const [pago, setPago] = useState('Efectivo')
  const [notas, setNotas] = useState('')
  const [descPct, setDescPct] = useState('')
  const [descMonto, setDescMonto] = useState('')
  const [modal, setModal] = useState<'ticket' | 'comanda' | 'cart' | null>(null)
  const [ticketHTML, setTicketHTML] = useState('')
  const [comandaHTML, setComandaHTML] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('productos').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => {
        if (data && data.length > 0) setProductos(data)
        else setProductos(PRODUCTOS_DEFAULT.map((p, i) => ({ ...p, id: i + 1 })) as Producto[])
      })
  }, [])

  const filtered = cat === 'Todos' ? productos : productos.filter(p => p.categoria === cat)
  const calcSubItem = (i: CartItem) => i.pv * i.qty
  const calcDescItem = (i: CartItem) => {
    const sub = calcSubItem(i)
    if (i.descMonto > 0) return Math.min(i.descMonto, sub)
    if (i.descPct > 0) return sub * (i.descPct / 100)
    return 0
  }
  const calcNetItem = (i: CartItem) => calcSubItem(i) - calcDescItem(i)
  const subtotalConDescItems = cart.reduce((s, i) => s + calcNetItem(i), 0)
  const subtotal = cart.reduce((s, i) => s + calcSubItem(i), 0)
  const descItemsTotal = cart.reduce((s, i) => s + calcDescItem(i), 0)
  const descuentoGlobal = descMonto ? (parseFloat(descMonto) || 0) : descPct ? subtotalConDescItems * (parseFloat(descPct) / 100) : 0
  const descuentoValor = descItemsTotal + descuentoGlobal
  const total = Math.max(0, subtotalConDescItems - descuentoGlobal)
  const cartCount = cart.reduce((s, i) => s + 1, 0)

  const addToCart = (p: Producto) => {
    setCart(prev => {
      const ex = prev.find(c => c.id === p.id)
      if (ex) return prev.map(c => c.id === p.id ? { ...c, qty: parseFloat((c.qty + 0.5).toFixed(3)) } : c)
      return [...prev, { id: p.id, nombre: p.nombre, pv: p.precio_venta, qty: 0.5, descPct: 0, descMonto: 0 }]
    })
  }

  const changeQty = (id: number, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0.1, parseFloat((c.qty + delta).toFixed(3))) } : c))
  }

  const setQtyManual = (id: number, val: string) => {
    const n = parseFloat(parseFloat(val).toFixed(3))
    if (!isNaN(n) && n > 0) setCart(prev => prev.map(c => c.id === id ? { ...c, qty: n } : c))
  }

  const removeFromCart = (id: number) => setCart(prev => prev.filter(c => c.id !== id))

  const buildTicket = useCallback((num: string) => {
    const rows = cart.map(i => {
      const sub = i.pv * i.qty
      const desc = i.descMonto > 0 ? Math.min(i.descMonto, sub) : i.descPct > 0 ? sub * (i.descPct / 100) : 0
      const net = sub - desc
      return `<div style="display:flex;justify-content:space-between;margin-bottom:2px">
        <span>${i.nombre} × ${fmtN(i.qty, 3)} kg</span>
        <span>${desc > 0 ? `<s style="color:#999;font-size:10px">${fmt(sub)}</s> ${fmt(net)}` : fmt(sub)}</span>
      </div>`
    }).join('')
    const descLine = descuentoValor > 0 ? `<div style="display:flex;justify-content:space-between;color:#c00;margin-top:3px"><span>Descuento${descPct ? ` ${descPct}%` : ''}</span><span>-${fmt(descuentoValor)}</span></div>` : ''
    return `<div style="font-family:'Courier New',monospace;font-size:12px;color:#111;background:#fff;padding:14px;border-radius:6px;max-width:290px;border:1px solid #ccc">
      <div style="text-align:center;font-weight:bold;border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:7px">LA ESQUINA DE MADERNA<br><small style="font-size:10px;font-weight:normal">Tigre, Buenos Aires</small></div>
      <div style="font-size:11px;margin-bottom:7px"><div>Ticket: <strong>${num}</strong></div><div>${today()} · ${nowTime()}</div><div>Cliente: ${cliente || 'Mostrador'}</div><div>Pago: ${pago}</div></div>
      <div style="border-top:1px dashed #000;margin:5px 0"></div>${rows}${descLine}
      <div style="border-top:1px dashed #000;margin:5px 0"></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
      <div style="font-weight:bold;border-top:1px solid #000;padding-top:4px;display:flex;justify-content:space-between;font-size:14px"><span>TOTAL</span><span>${fmt(total)}</span></div>
      <div style="text-align:center;font-size:10px;margin-top:8px;border-top:1px dashed #000;padding-top:5px">¡Gracias! · @laesquinademaderna · chefprivado.ar</div>
    </div>`
  }, [cart, cliente, pago, subtotal, total, descuentoValor, descPct])

  const cobrar = async () => {
    if (!cart.length) return
    setLoading(true)
    try {
      const { count } = await supabase.from('ventas').select('*', { count: 'exact', head: true })
      const num = ticketNum((count ?? 0) + 1)
      const venta = { numero_ticket: num, fecha: today(), hora: nowTime(), cliente: cliente || 'Mostrador', medio_pago: pago, total, estado: 'cobrada' as const, notas }
      const { data: vd, error } = await supabase.from('ventas').insert(venta).select().single()
      if (error) throw error
      await supabase.from('venta_items').insert(cart.map(i => ({ venta_id: vd.id, producto_id: i.id, producto_nombre: i.nombre, cantidad_kg: i.qty, precio_unit: i.pv, descuento_monto: calcDescItem(i), precio_final: calcNetItem(i) })))
      await supabase.from('caja').insert({ fecha: today(), hora: nowTime(), tipo: 'ingreso', concepto: `Venta ${num} — ${cliente || 'Mostrador'}`, monto: total, venta_id: vd.id })
      await supabase.from('comandas').insert({ numero: 'C' + num, venta_id: vd.id, tipo: 'venta', contenido: { cliente, items: cart, total, pago, descuento: descuentoValor }, impresa: false })
      for (const ci of cart) {
        const prod = productos.find(p => p.id === ci.id)
        if (prod) await supabase.from('productos').update({ stock_kg: Math.max(0, parseFloat((prod.stock_kg - ci.qty).toFixed(3))) }).eq('id', ci.id)
      }
      setTicketHTML(buildTicket(num))
      setModal('ticket')
      setProductos(prev => prev.map(p => { const ci = cart.find(c => c.id === p.id); return ci ? { ...p, stock_kg: Math.max(0, parseFloat((p.stock_kg - ci.qty).toFixed(3))) } : p }))
      setCart([]); setCliente(''); setNotas(''); setDescPct(''); setDescMonto('')
    } catch (e) { console.error(e); alert('Error al procesar la venta') }
    setLoading(false)
  }

  const print = (html: string) => { const pa = document.getElementById('print-area'); if (pa) { pa.innerHTML = html; window.print() } }

  // ── Cart panel (reutilizado en desktop sidebar y mobile modal) ──
  const CartPanel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 320, minHeight: 60 }}>
        {cart.length === 0
          ? <div style={{ color: 'var(--dim)', fontSize: 12, textAlign: 'center', padding: 20 }}>Sin productos</div>
          : cart.map(i => {
              const sub = calcSubItem(i)
              const desc = calcDescItem(i)
              const net = calcNetItem(i)
              return (
                <div key={i.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--borderl)' }}>
                  {/* Fila cantidad */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <div style={{ flex: 1, fontSize: 11, lineHeight: 1.3 }}>{i.nombre}</div>
                    <button onClick={() => changeQty(i.id, -0.1)} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>−</button>
                    <input type="number" value={i.qty} step="0.1" min="0.1" onChange={e => setQtyManual(i.id, e.target.value)}
                      style={{ width: 48, textAlign: 'center', fontSize: 11, padding: '2px 3px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4 }} />
                    <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>kg</span>
                    <button onClick={() => changeQty(i.id, 0.1)} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>+</button>
                    <div style={{ minWidth: 55, textAlign: 'right', fontSize: 11, flexShrink: 0, color: desc > 0 ? 'var(--muted)' : 'var(--gold)', textDecoration: desc > 0 ? 'line-through' : 'none' }}>{fmt(sub)}</div>
                    {desc > 0 && <div style={{ minWidth: 50, textAlign: 'right', color: 'var(--gold)', fontSize: 12, fontWeight: 'bold', flexShrink: 0 }}>{fmt(net)}</div>}
                    <button onClick={() => removeFromCart(i.id)} style={{ color: '#aa2020', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✕</button>
                  </div>
                  {/* Descuento por ítem */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--dim)', minWidth: 52 }}>Dto ítem:</span>
                    <input type="number" placeholder="%" value={i.descPct || ''}
                      onChange={e => setCart(prev => prev.map(c => c.id === i.id ? { ...c, descPct: parseFloat(e.target.value) || 0, descMonto: 0 } : c))}
                      style={{ width: 44, fontSize: 10, padding: '1px 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
                    <span style={{ fontSize: 10, color: 'var(--dim)' }}>%  ó</span>
                    <input type="number" placeholder="$" value={i.descMonto || ''}
                      onChange={e => setCart(prev => prev.map(c => c.id === i.id ? { ...c, descMonto: parseFloat(e.target.value) || 0, descPct: 0 } : c))}
                      style={{ width: 56, fontSize: 10, padding: '1px 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
                    {desc > 0 && <span style={{ fontSize: 10, color: '#aa2020', flexShrink: 0 }}>−{fmt(desc)}</span>}
                  </div>
                </div>
              )
            })}
      </div>

      {/* Descuento global sobre el total */}
      <div style={{ borderTop: '1px solid var(--borderl)', paddingTop: 8, marginTop: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>Descuento sobre el total</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="number" value={descPct} onChange={e => { setDescPct(e.target.value); setDescMonto('') }} placeholder="% ej: 10" style={{ fontSize: 12, padding: '5px 8px' }} />
          <input type="number" value={descMonto} onChange={e => { setDescMonto(e.target.value); setDescPct('') }} placeholder="$ fijo" style={{ fontSize: 12, padding: '5px 8px' }} />
        </div>
      </div>

      {/* Totales */}
      <div style={{ borderTop: '1px solid var(--gold-d)', paddingTop: 10, marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}><span style={{ color: 'var(--muted)' }}>Subtotal bruto</span><span>{fmt(subtotal)}</span></div>
        {descItemsTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2, color: '#aa2020' }}><span>Dto. por ítems</span><span>−{fmt(descItemsTotal)}</span></div>}
        {descuentoGlobal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2, color: '#aa2020' }}><span>Dto. total{descPct ? ` ${descPct}%` : ''}</span><span>−{fmt(descuentoGlobal)}</span></div>}
        {descuentoValor > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#aa2020', borderTop: '1px solid var(--borderl)', paddingTop: 3 }}><span>Total descuentos</span><span>−{fmt(descuentoValor)}</span></div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: 'var(--gold)' }}><span>TOTAL</span><span>{fmt(total)}</span></div>
      </div>

      {/* Campos */}
      <div style={{ marginTop: 10 }}>
        <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Cliente</label><input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Mostrador" /></div>
        <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Pago</label>
          <select value={pago} onChange={e => setPago(e.target.value)}>{PAGOS.map(p => <option key={p}>{p}</option>)}</select>
        </div>
        <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Notas</label><input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional" /></div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => setCart([])} style={{ flex: 1, padding: '9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontFamily: 'Georgia,serif' }}>Limpiar</button>
          <button onClick={cobrar} disabled={loading || !cart.length} style={{ flex: 1, padding: '9px', borderRadius: 6, border: '1px solid var(--gold)', background: 'var(--gold)', color: '#0f0f0f', cursor: 'pointer', fontSize: 13, fontFamily: 'Georgia,serif', fontWeight: 'bold', opacity: loading || !cart.length ? 0.6 : 1 }}>
            {loading ? '...' : 'Cobrar'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => {
            if (!cart.length) return
            const rows = cart.map(i => `<div style="display:flex;gap:8px;margin-bottom:4px;font-size:13px"><strong style="min-width:60px">${fmtN(i.qty, 3)} kg</strong><span>${i.nombre}</span></div>`).join('')
            setComandaHTML(`<div style="font-family:'Courier New',monospace;border:2px solid #000;padding:10px;max-width:270px;background:#fff;color:#000"><div style="text-align:center;font-weight:bold;font-size:15px;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:7px">COMANDA · ${nowTime()}</div><div style="font-size:12px;margin-bottom:6px">Cliente: <strong>${cliente || 'Mostrador'}</strong></div><div style="border-top:1px dashed #000;padding-top:6px">${rows}</div><div style="border-top:2px solid #000;margin-top:6px;padding-top:5px;font-size:13px;font-weight:bold">TOTAL: ${fmt(total)}</div></div>`)
            setModal('comanda')
          }} style={{ ...btnSm, flex: 1 }}>🗒 Comanda</button>
          <button onClick={() => { if (!cart.length) return; setTicketHTML(buildTicket('PREV')); setModal('ticket') }} style={{ ...btnSm, flex: 1 }}>🧾 Ticket</button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        .pos-layout { display: grid; grid-template-columns: 1fr 340px; gap: 14px; height: calc(100vh - 82px); }
        .pos-sidebar { display: flex; flex-direction: column; }
        .pos-fab { display: none; }
        .pos-cats { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; overflow-x: auto; padding-bottom: 2px; }
        .prod-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
        @media (max-width: 1024px) {
          .pos-layout { grid-template-columns: 1fr; height: auto; }
          .pos-sidebar { display: none; }
          .pos-fab { display: flex !important; position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 80; min-width: 220px; }
          .pos-cats { flex-wrap: nowrap; }
          .prod-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="pos-layout">
        {/* Productos */}
        <div style={{ overflowY: 'auto', paddingBottom: 80 }}>
          <div className="pos-cats">
            {CATS.map(c => {
              const color = CAT_COLOR[c]
              const isActive = c === cat
              const isTodos = c === 'Todos'
              return (
                <button key={c} onClick={() => setCat(c)} style={{
                  padding: '5px 13px', borderRadius: 20, cursor: 'pointer', flexShrink: 0,
                  fontSize: 11, fontFamily: 'Georgia,serif', whiteSpace: 'nowrap',
                  border: isActive ? `1px solid ${isTodos ? 'var(--gold)' : color}` : `1px solid ${isTodos ? 'var(--border)' : color + '55'}`,
                  background: isActive ? (isTodos ? 'var(--gold-bg)' : color + '22') : 'var(--card)',
                  color: isActive ? (isTodos ? 'var(--gold)' : color) : (isTodos ? 'var(--muted)' : color + '99'),
                }}>{c}</button>
              )
            })}
          </div>
          <div className="prod-grid">
            {filtered.map(p => {
              const stk = p.stock_kg || 0
              const sinStock   = stk <= 0
              const stockBajo  = stk > 0 && stk < 2
              const stockMedio = stk >= 2 && stk < 5
              const catCol     = CAT_COLOR[p.categoria] || '#888'
              const barCol     = sinStock ? '#ccc' : stockBajo ? '#aa2020' : stockMedio ? '#b05010' : '#1a7a40'
              const cardBorder = sinStock   ? '1px solid #ddd'
                               : stockBajo  ? '1px solid rgba(170,32,32,.4)'
                               : stockMedio ? `1px solid ${catCol}66`
                               : '1px solid var(--border)'
              const cardBg     = sinStock   ? '#f2f2f2'
                               : stockBajo  ? 'rgba(170,32,32,.04)'
                               : stockMedio ? `${catCol}0d`
                               : 'var(--card)'
              return (
                <div key={p.id}
                  onClick={() => !sinStock && addToCart(p)}
                  style={{ background: cardBg, border: cardBorder, borderRadius: 8, padding: 11, cursor: sinStock ? 'not-allowed' : 'pointer', position: 'relative', userSelect: 'none', opacity: sinStock ? 0.55 : 1, transition: 'all .15s' }}>
                  {/* Punto categoría — más grande */}
                  <div style={{ position: 'absolute', top: 8, right: 8, width: 11, height: 11, borderRadius: '50%', background: catCol, boxShadow: `0 0 0 2px ${catCol}33` }} />
                  <div style={{ fontSize: 12, lineHeight: 1.3, marginBottom: 6, paddingRight: 16 }}>{p.nombre}</div>
                  <div style={{ fontSize: 15, color: sinStock ? '#bbb' : 'var(--gold)' }}>{fmt(p.precio_venta)}</div>
                  <div style={{ fontSize: 10, marginTop: 2, color: barCol, fontWeight: stockBajo ? 'bold' : 'normal' }}>
                    {sinStock ? 'Sin stock' : `Stock: ${fmtN(stk)} kg`}
                  </div>
                  <div style={{ height: 3, background: 'var(--borderl)', borderRadius: 2, marginTop: 4 }}>
                    <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(100, stk / 20 * 100)}%`, background: barCol }} />
                  </div>
                  {sinStock && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#aaa', background: 'rgba(255,255,255,.85)', padding: '2px 8px', borderRadius: 4, border: '1px solid #ddd' }}>Sin stock</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="pos-sidebar">
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>Orden</div>
            <CartPanel />
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <button className="pos-fab" onClick={() => setModal('cart')}
        style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 20px', borderRadius: 30, border: '1px solid var(--gold)', background: cart.length ? 'var(--gold)' : '#ffffff', color: cart.length ? '#0f0f0f' : 'var(--muted)', cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 14, fontWeight: 'bold', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
        <span>🛒 {cartCount > 0 ? `${cartCount} ítem${cartCount > 1 ? 's' : ''}` : 'Ver carrito'}</span>
        {total > 0 && <span>{fmt(total)}</span>}
      </button>

      {/* Mobile cart modal */}
      {modal === 'cart' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', position: 'absolute', inset: 0 }} onClick={() => setModal(null)} />
          <div style={{ position: 'relative', background: 'var(--card)', border: '1px solid var(--gold-d)', borderRadius: '16px 16px 0 0', padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>Orden</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <CartPanel />
          </div>
        </div>
      )}

      {/* Modales ticket / comanda */}
      {(modal === 'ticket' || modal === 'comanda') && (
        <div style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--gold-d)', borderRadius: 12, padding: 22, width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>{modal === 'ticket' ? '🧾 Ticket' : '🗒 Comanda'}</div>
            <div dangerouslySetInnerHTML={{ __html: modal === 'ticket' ? ticketHTML : comandaHTML }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button onClick={() => print(modal === 'ticket' ? ticketHTML : comandaHTML)} style={btnSm}>🖨 Imprimir</button>
              <button onClick={() => setModal(null)} style={btnSm}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
