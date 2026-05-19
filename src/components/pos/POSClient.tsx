'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today, nowTime, CAT_COLOR, dateAddISO } from '@/lib/utils'
import type { Producto, CartItem } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'

const CATS = ['Todos', 'VACUNO', 'CERDO', 'POLLO', 'PAPAS', 'JUMBALAY', 'PACKS']
const PAGOS = ['Efectivo', 'Transferencia', 'MercadoPago', 'Débito', 'Crédito']

function ticketNum(n: number) { return 'T' + String(n).padStart(4, '0') }

export function POSClient() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cat, setCat] = useState('Todos')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cliente, setCliente] = useState('')
  const [pago, setPago] = useState('Efectivo')
  const [notas, setNotas] = useState('')
  const [modal, setModal] = useState<'ticket' | 'comanda' | null>(null)
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
  const total = cart.reduce((s, i) => s + i.pv * i.qty, 0)

  const addToCart = (p: Producto) => {
    setCart(prev => {
      const ex = prev.find(c => c.id === p.id)
      if (ex) return prev.map(c => c.id === p.id ? { ...c, qty: parseFloat((c.qty + 0.5).toFixed(1)) } : c)
      return [...prev, { id: p.id, nombre: p.nombre, pv: p.precio_venta, qty: 0.5 }]
    })
  }

  const changeQty = (id: number, delta: number) => {
    setCart(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, qty: parseFloat((c.qty + delta).toFixed(1)) } : c)
      return updated.filter(c => c.qty > 0)
    })
  }

  const buildTicket = useCallback((num: string) => {
    const rows = cart.map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>${i.nombre} × ${fmtN(i.qty)} kg</span><span>${fmt(i.pv * i.qty)}</span></div>`).join('')
    return `<div style="font-family:'Courier New',monospace;font-size:12px;color:#111;background:#fff;padding:14px;border-radius:6px;max-width:290px;border:1px solid #ccc">
      <div style="text-align:center;font-weight:bold;border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:7px">LA ESQUINA DE MADERNA<br><small style="font-size:10px;font-weight:normal">Tigre, Buenos Aires</small></div>
      <div style="font-size:11px;margin-bottom:7px"><div>Ticket: <strong>${num}</strong></div><div>Fecha: ${today()} · ${nowTime()}</div><div>Cliente: ${cliente || 'Mostrador'}</div><div>Pago: ${pago}</div></div>
      <div style="border-top:1px dashed #000;margin:5px 0"></div>${rows}<div style="border-top:1px dashed #000;margin:5px 0"></div>
      <div style="font-weight:bold;border-top:1px solid #000;padding-top:4px;display:flex;justify-content:space-between;font-size:14px"><span>TOTAL</span><span>${fmt(total)}</span></div>
      <div style="text-align:center;font-size:10px;margin-top:8px;border-top:1px dashed #000;padding-top:5px">¡Gracias! · @laesquinademaderna · chefprivado.ar</div>
    </div>`
  }, [cart, cliente, pago, total])

  const cobrar = async () => {
    if (!cart.length) return
    setLoading(true)
    try {
      const { data: countData } = await supabase.from('ventas').select('id', { count: 'exact', head: true })
      const num = ticketNum((countData as unknown as { count: number })?.count ?? 0 + 1)
      const venta = { numero_ticket: num, fecha: today(), hora: nowTime(), cliente: cliente || 'Mostrador', medio_pago: pago, total, estado: 'cobrada' as const, notas }
      const { data: ventaData, error } = await supabase.from('ventas').insert(venta).select().single()
      if (error) throw error
      const items = cart.map(i => ({ venta_id: ventaData.id, producto_id: i.id, producto_nombre: i.nombre, cantidad_kg: i.qty, precio_unit: i.pv }))
      await supabase.from('venta_items').insert(items)
      await supabase.from('caja').insert({ fecha: today(), hora: nowTime(), tipo: 'ingreso', concepto: `Venta ${num} — ${cliente || 'Mostrador'}`, monto: total, venta_id: ventaData.id })
      await supabase.from('comandas').insert({ numero: 'C' + num, venta_id: ventaData.id, tipo: 'venta', contenido: { cliente, items: cart, total, pago }, impresa: false })
      for (const ci of cart) {
        const prod = productos.find(p => p.id === ci.id)
        if (prod) await supabase.from('productos').update({ stock_kg: Math.max(0, prod.stock_kg - ci.qty) }).eq('id', ci.id)
      }
      setTicketHTML(buildTicket(num))
      setModal('ticket')
      setCart([]); setCliente(''); setNotas('')
      setProductos(prev => prev.map(p => { const ci = cart.find(c => c.id === p.id); return ci ? { ...p, stock_kg: Math.max(0, p.stock_kg - ci.qty) } : p }))
    } catch (e) { console.error(e); alert('Error al procesar la venta') }
    setLoading(false)
  }

  const verTicketPreview = () => {
    if (!cart.length) return
    setTicketHTML(buildTicket('PREV'))
    setModal('ticket')
  }

  const abrirComanda = () => {
    if (!cart.length) return
    const rows = cart.map(i => `<div style="display:flex;gap:8px;margin-bottom:4px;font-size:13px"><strong style="min-width:50px">${fmtN(i.qty)} kg</strong><span>${i.nombre}</span></div>`).join('')
    setComandaHTML(`<div style="font-family:'Courier New',monospace;border:2px solid #000;padding:10px;max-width:270px;background:#fff;color:#000">
      <div style="text-align:center;font-weight:bold;font-size:15px;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:7px">COMANDA · ${nowTime()}</div>
      <div style="font-size:12px;margin-bottom:6px">Cliente: <strong>${cliente || 'Mostrador'}</strong></div>
      <div style="border-top:1px dashed #000;padding-top:6px">${rows}</div>
      <div style="border-top:2px solid #000;margin-top:6px;padding-top:5px;font-size:11px;text-align:center">PREPARAR Y EMBALAR</div>
    </div>`)
    setModal('comanda')
  }

  const print = (html: string) => {
    const pa = document.getElementById('print-area')
    if (pa) { pa.innerHTML = html; window.print() }
  }

  const s: Record<string, React.CSSProperties> = {
    wrap: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, height: 'calc(100vh - 82px)' },
    prods: { overflowY: 'auto' },
    side: { display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' },
    card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 },
    catRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 },
    overlay: { display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', zIndex: 200, alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalBox: { background: 'var(--card)', border: '1px solid var(--gold-d)', borderRadius: 12, padding: 22, width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' },
  }

  return (
    <div style={s.wrap}>
      {/* Productos */}
      <div style={s.prods}>
        <div style={s.catRow}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{ padding: '4px 11px', borderRadius: 20, border: `1px solid ${c === cat ? 'var(--gold)' : 'var(--border)'}`, background: c === cat ? 'var(--gold-bg)' : 'var(--card)', color: c === cat ? 'var(--gold)' : 'var(--muted)', cursor: 'pointer', fontSize: 11, fontFamily: 'Georgia,serif' }}>{c}</button>
          ))}
        </div>
        <div style={s.grid}>
          {filtered.map(p => {
            const stk = p.stock_kg || 0
            const col = stk < 2 ? 'var(--red,#d95f5f)' : stk < 5 ? '#d97c3a' : '#4caf7d'
            return (
              <div key={p.id} onClick={() => addToCart(p)} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 11, cursor: 'pointer', position: 'relative', transition: 'all .15s' }}>
                <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: CAT_COLOR[p.categoria] || 'var(--dim)' }} />
                <div style={{ fontSize: 12, lineHeight: 1.3, marginBottom: 6, paddingRight: 12 }}>{p.nombre}</div>
                <div style={{ fontSize: 15, color: 'var(--gold)' }}>{fmt(p.precio_venta)}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>Stock: {fmtN(stk)} kg</div>
                <div style={{ height: 3, background: 'var(--borderl)', borderRadius: 2, marginTop: 4 }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(100, stk / 20 * 100)}%`, background: col }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sidebar */}
      <div style={s.side}>
        <div style={{ ...s.card, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Orden</div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 80, maxHeight: 280 }}>
            {cart.length === 0
              ? <div style={{ color: 'var(--dim)', fontSize: 12, textAlign: 'center', padding: 16 }}>Sin productos</div>
              : cart.map(i => (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid var(--borderl)', fontSize: 12 }}>
                  <div style={{ flex: 1, lineHeight: 1.3 }}>{i.nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <button onClick={() => changeQty(i.id, -0.5)} style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>−</button>
                    <span style={{ fontSize: 11, minWidth: 32, textAlign: 'center' }}>{fmtN(i.qty)} kg</span>
                    <button onClick={() => changeQty(i.id, 0.5)} style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>+</button>
                  </div>
                  <div style={{ minWidth: 68, textAlign: 'right', color: 'var(--gold)', fontSize: 12 }}>{fmt(i.pv * i.qty)}</div>
                </div>
              ))}
          </div>
          <div style={{ borderTop: '1px solid var(--gold-d)', paddingTop: 10, marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}><span style={{ color: 'var(--muted)' }}>Subtotal</span><span>{fmt(total)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, color: 'var(--gold)' }}><span>TOTAL</span><span>{fmt(total)}</span></div>
          </div>
        </div>

        <div style={s.card}>
          <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Cliente</label><input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Mostrador" /></div>
          <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Pago</label>
            <select value={pago} onChange={e => setPago(e.target.value)}>{PAGOS.map(p => <option key={p}>{p}</option>)}</select>
          </div>
          <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Notas</label><input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional" /></div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={() => setCart([])} style={{ flex: 1, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif' }}>Limpiar</button>
            <button onClick={cobrar} disabled={loading || !cart.length} style={{ flex: 1, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--gold)', background: 'var(--gold)', color: '#0f0f0f', cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif', opacity: loading || !cart.length ? 0.6 : 1 }}>{loading ? 'Procesando...' : 'Cobrar'}</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={abrirComanda} style={{ flex: 1, padding: '4px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontSize: 11, fontFamily: 'Georgia,serif' }}>🗒 Comanda</button>
            <button onClick={verTicketPreview} style={{ flex: 1, padding: '4px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontSize: 11, fontFamily: 'Georgia,serif' }}>🧾 Ticket</button>
          </div>
        </div>
      </div>

      {/* Modal ticket */}
      {modal === 'ticket' && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={s.modalBox}>
            <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>🧾 Ticket</div>
            <div dangerouslySetInnerHTML={{ __html: ticketHTML }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button onClick={() => print(ticketHTML)} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontSize: 11, fontFamily: 'Georgia,serif' }}>🖨 Imprimir</button>
              <button onClick={() => setModal(null)} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontSize: 11, fontFamily: 'Georgia,serif' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal comanda */}
      {modal === 'comanda' && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={s.modalBox}>
            <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>🗒 Comanda</div>
            <div dangerouslySetInnerHTML={{ __html: comandaHTML }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button onClick={() => print(comandaHTML)} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontSize: 11, fontFamily: 'Georgia,serif' }}>🖨 Imprimir</button>
              <button onClick={() => setModal(null)} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontSize: 11, fontFamily: 'Georgia,serif' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
