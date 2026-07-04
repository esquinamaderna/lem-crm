'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today, nowTime, CAT_COLOR } from '@/lib/utils'
import type { Producto, CartItem } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'

const CATS = ['Todos', 'VACUNO', 'CERDO', 'POLLO', 'PAPAS', 'JUMBALAY', 'PACKS', 'CORTES', 'EMBUTIDOS']
const PAGOS = ['Efectivo', 'Transferencia', 'Transferencia MP', 'MercadoPago', 'Débito', 'Crédito']
const btnSm: React.CSSProperties = { padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif' }

function ticketNum(n: number) { return 'T' + String(n).padStart(4, '0') }

export function POSClient() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [combos, setCombos] = useState<Combo[]>([])
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
    supabase.from('combos').select('*, combo_items(*)').eq('activo', true).order('nombre')
      .then(({ data }) => setCombos((data || []) as Combo[]))
  }, [])

  const [mostrarSinStock, setMostrarSinStock] = useState(false)
  const filteredBase = cat === 'Todos' ? productos : productos.filter(p => p.categoria === cat)
  const filtered = mostrarSinStock ? filteredBase : filteredBase.filter(p => (p.stock_kg || 0) > 0)
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

  const addComboToCart = (c: Combo) => {
    // Verificar stock de cada componente
    const sinStock = (c.combo_items || []).filter(ci => {
      const prod = productos.find(p => p.id === ci.producto_id)
      return !prod || (prod.stock_kg || 0) < ci.cantidad_kg
    })
    if (sinStock.length > 0) {
      alert('Stock insuficiente para:\n' + sinStock.map(ci => ci.producto_nombre).join('\n'))
      return
    }
    setCart(prev => {
      const ex = prev.find(i => i.id === -c.id) // id negativo para combos
      if (ex) return prev.map(i => i.id === -c.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, {
        id: -c.id, // negativo = combo
        nombre: c.nombre,
        pv: c.precio,
        qty: 1,
        descPct: 0,
        descMonto: 0,
        esCombo: true,
        comboItems: c.combo_items || [],
      } as any]
    })
  }

  const addToCart = (p: Producto) => {
    if (!p.stock_kg || p.stock_kg <= 0) return
    const esU = (p as any).unidad_venta === 'u'
    const step = esU ? 1 : 0.5
    setCart(prev => {
      const ex = prev.find(c => c.id === p.id)
      const qtyActual = ex ? ex.qty : 0
      const qtyNueva = esU ? qtyActual + 1 : parseFloat((qtyActual + step).toFixed(3))
      if (qtyNueva > p.stock_kg) {
        const maxPermitido = esU ? Math.floor(p.stock_kg) : parseFloat(p.stock_kg.toFixed(3))
        if (ex) return prev.map(c => c.id === p.id ? { ...c, qty: maxPermitido } : c)
        return [...prev, { id: p.id, nombre: p.nombre, pv: p.precio_venta, qty: Math.min(step, maxPermitido), descPct: 0, descMonto: 0, unidad: (p as any).unidad_venta || 'kg' }]
      }
      if (ex) return prev.map(c => c.id === p.id ? { ...c, qty: qtyNueva } : c)
      return [...prev, { id: p.id, nombre: p.nombre, pv: p.precio_venta, qty: step, descPct: 0, descMonto: 0, unidad: (p as any).unidad_venta || 'kg' }]
    })
  }

  const changeQty = (id: number, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0.1, parseFloat((c.qty + delta).toFixed(3))) } : c))
  }

  const setQtyManual = (id: number, val: string) => {
    const n = parseFloat(parseFloat(val).toFixed(3))
    if (isNaN(n) || n <= 0) return
    const prod = productos.find(p => p.id === id)
    if (prod && n > prod.stock_kg) {
      // Permitir escribir pero mostrar en rojo — la validación final es al cobrar
      setCart(prev => prev.map(c => c.id === id ? { ...c, qty: n } : c))
    } else {
      setCart(prev => prev.map(c => c.id === id ? { ...c, qty: n } : c))
    }
  }

  const removeFromCart = (id: number) => setCart(prev => prev.filter(c => c.id !== id))

  const buildTicket = useCallback((num: string) => {
    const rows = cart.map(i => {
      const sub = i.pv * i.qty
      const desc = i.descMonto > 0 ? Math.min(i.descMonto, sub) : i.descPct > 0 ? sub * (i.descPct / 100) : 0
      const net = sub - desc
      const esCombo = (i as any).esCombo
      const comboItems = (i as any).comboItems || []
      if (esCombo) {
        // Ticket: mostrar nombre del combo, componentes y precio
        const detalle = comboItems.map((ci: any) => `<div style="padding-left:10px;font-size:10px;color:#666">· ${ci.producto_nombre} ${fmtN(ci.cantidad_kg * 1000, 0)}g × ${i.qty}</div>`).join('')
        return `<div style="margin-bottom:4px">
          <div style="display:flex;justify-content:space-between">
            <span>🍱 ${i.nombre} × ${i.qty}</span>
            <span>${fmt(net)}</span>
          </div>${detalle}
        </div>`
      }
      const unidad = (i as any).unidad || 'kg'
      const qtyStr = unidad === 'u' ? `${i.qty} u` : `${fmtN(i.qty, 3)} ${unidad}`
      return `<div style="display:flex;justify-content:space-between;margin-bottom:2px">
        <span>${i.nombre} × ${qtyStr}</span>
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
    // Validar stock antes de cobrar
    const sinStock = cart.filter(ci => {
      const prod = productos.find(p => p.id === ci.id)
      if (!prod || (ci as any).esCombo) return false
      return ci.qty > prod.stock_kg
    })
    if (sinStock.length > 0) {
      const nombres = sinStock.map(ci => {
        const prod = productos.find(p => p.id === ci.id)
        return `${ci.nombre}: pedís ${fmtN(ci.qty, 1)} kg, hay ${fmtN(prod?.stock_kg || 0, 1)} kg`
      }).join('\n')
      alert(`Stock insuficiente:\n\n${nombres}\n\nAjustá las cantidades antes de cobrar.`)
      return
    }
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
      // Descontar stock — productos simples y componentes de combos
      for (const ci of cart) {
        if ((ci as any).esCombo) {
          // Combo: descontar cada componente × cantidad de combos vendidos
          for (const comp of ((ci as any).comboItems || [])) {
            const prod = productos.find(p => p.id === comp.producto_id)
            if (prod) {
              const newStk = Math.max(0, parseFloat((prod.stock_kg - comp.cantidad_kg * ci.qty).toFixed(3)))
              await supabase.from('productos').update({ stock_kg: newStk }).eq('id', comp.producto_id)
            }
          }
        } else {
          const prod = productos.find(p => p.id === ci.id)
          if (prod) await supabase.from('productos').update({ stock_kg: Math.max(0, parseFloat((prod.stock_kg - ci.qty).toFixed(3))) }).eq('id', ci.id)
        }
      }
      setTicketHTML(buildTicket(num))
      setModal('ticket')
      // Actualizar stock local
      setProductos(prev => {
        let updated = [...prev]
        for (const ci of cart) {
          if ((ci as any).esCombo) {
            for (const comp of ((ci as any).comboItems || [])) {
              updated = updated.map(p => p.id === comp.producto_id ? { ...p, stock_kg: Math.max(0, parseFloat((p.stock_kg - comp.cantidad_kg * ci.qty).toFixed(3))) } : p)
            }
          } else {
            updated = updated.map(p => p.id === ci.id ? { ...p, stock_kg: Math.max(0, parseFloat((p.stock_kg - ci.qty).toFixed(3))) } : p)
          }
        }
        return updated
      })
      setCart([]); setCliente(''); setNotas(''); setDescPct(''); setDescMonto('')
    } catch (e) { console.error(e); alert('Error al procesar la venta') }
    setLoading(false)
  }

  const print = (html: string) => { const pa = document.getElementById('print-area'); if (pa) { pa.innerHTML = html; window.print() } }

  // ── Cart panel (reutilizado en desktop sidebar y mobile modal) ──
  const cartPanelJSX = (
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
                    {(() => {
                      const esCombo = (i as any).esCombo
                      const unidad = esCombo ? 'u' : ((i as any).unidad || 'kg')
                      const esPorUnidad = esCombo || unidad === 'u' || unidad === 'L'
                      const step = esPorUnidad ? 1 : 0.1
                      const prod = !esCombo ? productos.find(p => p.id === i.id) : null
                      const sobreStock = prod && i.qty > prod.stock_kg
                      return (<>
                        <button onClick={() => setCart(prev => prev.map(c => c.id === i.id ? { ...c, qty: Math.max(esPorUnidad ? 1 : 0.1, parseFloat((c.qty - step).toFixed(3))) } : c))}
                          style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>−</button>
                        <input type="number" value={i.qty} step={step} min={step}
                          onChange={e => {
                            const val = esPorUnidad ? (parseInt(e.target.value) || 1) : (parseFloat(e.target.value) || 0.1)
                            setCart(prev => prev.map(c => c.id === i.id ? { ...c, qty: val } : c))
                          }}
                          style={{ width: 48, textAlign: 'center', fontSize: 11, padding: '2px 3px', background: sobreStock ? 'rgba(170,32,32,.08)' : 'var(--surface)', border: `1px solid ${sobreStock ? '#aa2020' : 'var(--border)'}`, color: sobreStock ? '#aa2020' : 'var(--text)', borderRadius: 4 }}
                          title={sobreStock ? `Stock: ${fmtN(prod?.stock_kg || 0, 1)} ${unidad}` : ''} />
                        <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{unidad}</span>
                        <button onClick={() => setCart(prev => prev.map(c => c.id === i.id ? { ...c, qty: parseFloat((c.qty + step).toFixed(3)) } : c))}
                          style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>+</button>
                      </>)
                    })()}
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
            const rows = cart.map(i => {
              const esCombo = (i as any).esCombo
              const comboItems = (i as any).comboItems || []
              if (esCombo) {
                const detalle = comboItems.map((ci: any) => `<div style="padding-left:16px;font-size:11px;color:#555">· ${ci.producto_nombre} ${fmtN(ci.cantidad_kg * 1000, 0)}g</div>`).join('')
                return `<div style="margin-bottom:6px"><div style="display:flex;gap:8px;font-size:13px"><strong style="min-width:60px">× ${i.qty}</strong><span>🍱 ${i.nombre}</span></div>${detalle}</div>`
              }
              const unidadC = (i as any).unidad || 'kg'
              const qtyComanda = unidadC === 'u' ? `${i.qty} u` : `${fmtN(i.qty, 3)} ${unidadC}`
              return `<div style="display:flex;gap:8px;margin-bottom:4px;font-size:13px"><strong style="min-width:60px">${qtyComanda}</strong><span>${i.nombre}</span></div>`
            }).join('')
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
            <button onClick={() => setMostrarSinStock(v => !v)}
              style={{ padding: '5px 12px', borderRadius: 20, cursor: 'pointer', flexShrink: 0, fontSize: 11, fontFamily: 'Georgia,serif', whiteSpace: 'nowrap', border: mostrarSinStock ? '1px solid var(--border)' : '1px solid var(--gold-d)', background: mostrarSinStock ? 'var(--surface)' : 'var(--gold-bg)', color: mostrarSinStock ? 'var(--dim)' : 'var(--gold)' }}>
              {mostrarSinStock ? '👁 Ver todos' : '✓ Con stock'}
            </button>
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
                    {sinStock ? 'Sin stock' : `Stock: ${fmtN(stk)}${(p as any).unidad_venta === 'u' ? ' u' : ' kg'}`}
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

          {/* ─── COMBOS Y PORCIONES ─── */}
          {combos.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🍱</span> Combos y porciones
              </div>
              <div className="prod-grid">
                {combos.map(c => {
                  const stockOk = (c.combo_items || []).every(ci => {
                    const prod = productos.find(p => p.id === ci.producto_id)
                    return prod && (prod.stock_kg || 0) >= ci.cantidad_kg
                  })
                  return (
                    <div key={c.id}
                      onClick={() => stockOk && addComboToCart(c)}
                      style={{
                        background: stockOk ? c.color + '11' : '#f0f0f0',
                        border: '1px solid ' + (stockOk ? c.color + '44' : '#ddd'),
                        borderTop: '3px solid ' + (stockOk ? c.color : '#ccc'),
                        borderRadius: 8, padding: 11,
                        cursor: stockOk ? 'pointer' : 'not-allowed',
                        opacity: stockOk ? 1 : 0.5,
                        position: 'relative', userSelect: 'none',
                      }}>
                      <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 14 }}>🍱</div>
                      <div style={{ fontSize: 12, lineHeight: 1.3, marginBottom: 6, paddingRight: 20, fontWeight: 'bold' }}>{c.nombre}</div>
                      <div style={{ fontSize: 15, color: stockOk ? c.color : '#aaa', fontWeight: 'bold' }}>{fmt(c.precio)}</div>
                      {c.descripcion && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{c.descripcion}</div>}
                      {!stockOk && (
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, color: '#aaa', background: 'rgba(255,255,255,.85)', padding: '2px 8px', borderRadius: 4, border: '1px solid #ddd' }}>Sin stock</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        <div className="pos-sidebar">
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>Orden</div>
            {cartPanelJSX}
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
            {cartPanelJSX}
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
