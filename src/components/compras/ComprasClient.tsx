'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today } from '@/lib/utils'

// ── Ingredientes necesarios por kg de producto elaborado ──
const INGREDIENTES_POR_PRODUCTO: Record<string, { nombre: string; qty: number; unidad: string }[]> = {
  'Milanesa de Pollo s/provenzal': [
    { nombre: 'Pechuga de pollo', qty: 0.5, unidad: 'kg' },
    { nombre: 'Pan rallado', qty: 0.2765, unidad: 'kg' },
    { nombre: 'Pan rallado Crunch', qty: 0.068, unidad: 'kg' },
    { nombre: 'Huevos frescos', qty: 2.8, unidad: 'u' },
  ],
  'Milanesa de Pollo c/provenzal': [
    { nombre: 'Pechuga de pollo', qty: 0.5, unidad: 'kg' },
    { nombre: 'Pan rallado', qty: 0.2765, unidad: 'kg' },
    { nombre: 'Pan rallado Crunch', qty: 0.068, unidad: 'kg' },
    { nombre: 'Huevos frescos', qty: 2.8, unidad: 'u' },
  ],
  'Milanesa de Nalga UG': [
    { nombre: 'Nalga (fileteada)', qty: 0.5, unidad: 'kg' },
    { nombre: 'Pan rallado', qty: 0.2765, unidad: 'kg' },
    { nombre: 'Huevos frescos', qty: 3.6, unidad: 'u' },
  ],
  'Milanesa de Peceto': [
    { nombre: 'Peceto (fileteado)', qty: 0.85, unidad: 'kg' },
    { nombre: 'Pan rallado', qty: 0.15, unidad: 'kg' },
    { nombre: 'Huevos frescos', qty: 2, unidad: 'u' },
  ],
  'Milanesa de Carré de Cerdo': [
    { nombre: 'Carré de cerdo', qty: 0.9, unidad: 'kg' },
    { nombre: 'Pan rallado', qty: 0.2, unidad: 'kg' },
    { nombre: 'Pan rallado Crunch', qty: 0.08, unidad: 'kg' },
    { nombre: 'Huevos frescos', qty: 2, unidad: 'u' },
  ],
  'Ribs Kansas BBQ': [
    { nombre: 'Ribs de cerdo', qty: 1.0, unidad: 'kg' },
  ],
  'Pechuguitas de Pollo': [
    { nombre: 'Pechuga de pollo', qty: 1.0, unidad: 'kg' },
  ],
  'Medallones de Pollo × 12': [
    { nombre: 'Recortes de pechuga', qty: 0.9, unidad: 'kg' },
    { nombre: 'Pan rallado', qty: 0.2, unidad: 'kg' },
    { nombre: 'Huevos frescos', qty: 2, unidad: 'u' },
  ],
  'Medallones de Pollo × 6': [
    { nombre: 'Recortes de pechuga', qty: 0.55, unidad: 'kg' },
    { nombre: 'Pan rallado', qty: 0.0375, unidad: 'kg' },
    { nombre: 'Huevos frescos', qty: 1, unidad: 'u' },
  ],
}

interface Producto {
  id: number
  nombre: string
  categoria: string
  precio_venta: number
  costo: number
  stock_kg: number
  tipo_producto?: string
  unidad_venta?: string
}

interface LineaCompra {
  nombre: string
  tipo: 'ingrediente' | 'reventa'
  categoria: string
  cantNecesaria: number
  cantAjuste: number
  unidad: string
  precioRef: number
  fuente: string // qué producto lo necesita
}

const b = (v?: 'gold' | 'blue' | 'red'): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif',
  border: v === 'gold' ? '1px solid var(--gold)' : v === 'red' ? '1px solid rgba(190,50,50,.3)' : v === 'blue' ? '1px solid rgba(30,100,180,.3)' : '1px solid var(--border)',
  background: v === 'gold' ? 'var(--gold)' : v === 'red' ? 'rgba(190,50,50,.08)' : v === 'blue' ? 'rgba(30,100,180,.08)' : 'var(--card)',
  color: v === 'gold' ? '#fff' : v === 'red' ? '#aa2020' : v === 'blue' ? '#1050a0' : 'var(--text)',
})
const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }

export function ComprasClient() {
  const [productos, setProductos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [ajustes, setAjustes] = useState<Record<string, number>>({})
  const [cantidades, setCantidades] = useState<Record<string, number>>({}) // kg a producir por producto elaborado
  const [tab, setTab] = useState<'compra' | 'config'>('compra')
  const [stockMinReventa, setStockMinReventa] = useState<Record<number, number>>({}) // stock mínimo deseado

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('productos').select('*').eq('activo', true).order('nombre')
    setProductos((data || []) as Produto[])
    // Inicializar cantidades de elaborados con 5 kg por defecto
    const cantInit: Record<string, number> = {}
    ;(data || []).filter((p: any) => p.tipo_producto === 'elaborado').forEach((p: any) => {
      cantInit[p.nombre] = 5
    })
    setCantidades(cantInit)
    // Stock mínimo reventa: 5 unidades/kg por defecto
    const stkInit: Record<number, number> = {}
    ;(data || []).filter((p: any) => p.tipo_producto === 'reventa').forEach((p: any) => {
      stkInit[p.id] = 5
    })
    setStockMinReventa(stkInit)
    setLoading(false)
  }

  // ── Calcular ingredientes necesarios para producción planificada ──
  const ingredientesAgrupados: Record<string, { cant: number; unidad: string; fuentes: string[] }> = {}

  const elaborados = productos.filter(p => p.tipo_producto === 'elaborado')
  elaborados.forEach(p => {
    const kgPlanificados = cantidades[p.nombre] || 0
    const ings = INGREDIENTES_POR_PRODUCTO[p.nombre] || []
    ings.forEach(ing => {
      const key = ing.nombre
      if (!ingredientesAgrupados[key]) ingredientesAgrupados[key] = { cant: 0, unidad: ing.unidad, fuentes: [] }
      ingredientesAgrupados[key].cant += ing.qty * kgPlanificados
      if (!ingredientesAgrupados[key].fuentes.includes(p.nombre)) {
        ingredientesAgrupados[key].fuentes.push(p.nombre)
      }
    })
  })

  // ── Calcular reventa a reponer ──
  const reventa = productos.filter(p =>
    p.tipo_producto === 'reventa' &&
    !['PAPAS','EMBUTIDOS'].includes(p.categoria) // papas y embutidos van por pedido especial
  )

  // Stock actual vs mínimo deseado
  const reventaAComprar = reventa.filter(p => {
    const minimo = stockMinReventa[p.id] || 5
    return (p.stock_kg || 0) < minimo
  })

  // ── Total inversión ──
  const totalIngredientes = Object.entries(ingredientesAgrupados).reduce((s, [nombre, data]) => {
    const ajuste = ajustes[nombre] || 0
    const cant = Math.max(0, data.cant + ajuste)
    // Buscar precio del ingrediente en productos o usar estimación
    return s + cant * 8000 // precio promedio estimado hasta tener tabla de precios
  }, 0)

  const totalReventa = reventaAComprar.reduce((s, p) => {
    const minimo = stockMinReventa[p.id] || 5
    const falta = Math.max(0, minimo - (p.stock_kg || 0))
    const ajuste = ajustes[`rev_${p.id}`] || 0
    return s + (falta + ajuste) * p.costo
  }, 0)

  function imprimirOrden() {
    const fecha = today()
    let html = `
      <style>body{font-family:Georgia,serif;color:#111;max-width:700px;margin:0 auto;padding:20px}
      h1{font-size:18px;font-weight:normal;letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid #9a7a1a;padding-bottom:6px;margin-bottom:16px}
      .seccion{margin-bottom:20px}.subtitulo{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#888;margin-bottom:8px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{text-align:left;padding:5px 8px;font-size:10px;color:#888;border-bottom:1px solid #eee;text-transform:uppercase}
      td{padding:6px 8px;border-bottom:1px solid #f0f0f0}
      .total{font-size:16px;font-weight:bold;padding:10px 0;border-top:2px solid #111}
      @media print{body{padding:10mm}}</style>
      <h1>Orden de compra — La Esquina de Maderna</h1>
      <p style="font-size:12px;color:#888;margin-bottom:20px">Fecha: ${fecha} · Generado desde el CRM</p>

      <div class="seccion">
        <div class="subtitulo">Ingredientes para producción</div>
        <table><thead><tr><th>Ingrediente</th><th>Cantidad</th><th>Unidad</th><th>Para</th></tr></thead><tbody>
    `
    Object.entries(ingredientesAgrupados).forEach(([nombre, data]) => {
      const ajuste = ajustes[nombre] || 0
      const cant = Math.max(0, data.cant + ajuste)
      if (cant > 0) {
        html += `<tr><td>${nombre}</td><td>${fmtN(cant, 2)}</td><td>${data.unidad}</td><td style="color:#888;font-size:11px">${data.fuentes.join(', ')}</td></tr>`
      }
    })
    html += `</tbody></table></div>
      <div class="seccion">
        <div class="subtitulo">Reventa a reponer</div>
        <table><thead><tr><th>Producto</th><th>Stock actual</th><th>Stock mínimo</th><th>A comprar</th><th>Costo est.</th></tr></thead><tbody>
    `
    reventaAComprar.forEach(p => {
      const minimo = stockMinReventa[p.id] || 5
      const falta = Math.max(0, minimo - (p.stock_kg || 0))
      const ajuste = ajustes[`rev_${p.id}`] || 0
      const total = falta + ajuste
      html += `<tr><td>${p.nombre}</td><td>${fmtN(p.stock_kg, 1)} ${p.unidad_venta || 'kg'}</td><td>${minimo}</td><td>${fmtN(total, 1)}</td><td>${fmt(total * p.costo)}</td></tr>`
    })
    html += `</tbody></table></div>
      <div class="total">Total estimado reventa: ${fmt(totalReventa)}</div>
    `
    const ventana = window.open('', '_blank', 'width=800,height=600')
    if (!ventana) return
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Orden de compra</title></head><body>${html}</body></html>`)
    ventana.document.close()
    setTimeout(() => { ventana.print(); ventana.close() }, 400)
  }

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '7px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif',
    border: tab === t ? '1px solid var(--gold)' : '1px solid var(--border)',
    background: tab === t ? 'var(--gold-bg)' : 'var(--card)',
    color: tab === t ? 'var(--gold)' : 'var(--muted)',
  })

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Orden de compra</div>
          <div style={{ fontSize: 12, color: 'var(--dim)' }}>Planificá la próxima compra de ingredientes y reposición de stock</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={imprimirOrden} style={b('blue')}>🖨 Imprimir orden</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button style={tabStyle('compra')} onClick={() => setTab('compra')}>📋 Orden de compra</button>
        <button style={tabStyle('config')} onClick={() => setTab('config')}>⚙ Stock mínimos</button>
      </div>

      {tab === 'compra' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Columna izquierda: Producción planificada → ingredientes */}
          <div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
                Producción planificada
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                Ingresá los kg que planificás producir de cada producto elaborado.
              </div>
              {elaborados.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--borderl)', fontSize: 13 }}>
                  <div style={{ flex: 1 }}>{p.nombre}</div>
                  <input type="number" value={cantidades[p.nombre] || 0} min={0} step={0.5}
                    onChange={e => setCantidades(prev => ({ ...prev, [p.nombre]: parseFloat(e.target.value) || 0 }))}
                    style={{ width: 70, fontSize: 12, padding: '3px 6px' }} />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>kg</span>
                </div>
              ))}
            </div>

            {/* Ingredientes calculados */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
                Ingredientes a comprar
              </div>
              {Object.keys(ingredientesAgrupados).length === 0
                ? <div style={{ color: 'var(--dim)', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Ingresá cantidades arriba</div>
                : Object.entries(ingredientesAgrupados).map(([nombre, data]) => {
                    const ajuste = ajustes[nombre] || 0
                    const cant = Math.max(0, data.cant + ajuste)
                    return (
                      <div key={nombre} style={{ padding: '7px 0', borderBottom: '1px solid var(--borderl)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <div style={{ flex: 1, fontSize: 12 }}>{nombre}</div>
                          <input type="number" value={ajuste}
                            onChange={e => setAjustes(prev => ({ ...prev, [nombre]: parseFloat(e.target.value) || 0 }))}
                            style={{ width: 60, fontSize: 11, padding: '2px 5px' }}
                            title="Ajuste manual (+ para agregar, - para reducir)" />
                          <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 'bold', minWidth: 70, textAlign: 'right' }}>
                            {fmtN(cant, 2)} {data.unidad}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--dim)' }}>Para: {data.fuentes.join(' · ')}</div>
                      </div>
                    )
                  })
              }
            </div>
          </div>

          {/* Columna derecha: Reventa a reponer */}
          <div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>
                Reventa a reponer
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                Productos con stock por debajo del mínimo configurado.
              </div>

              {reventaAComprar.length === 0
                ? <div style={{ color: '#1a7a40', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>✓ Todo el stock de reventa está al día</div>
                : reventaAComprar.map(p => {
                    const minimo = stockMinReventa[p.id] || 5
                    const falta = Math.max(0, minimo - (p.stock_kg || 0))
                    const ajuste = ajustes[`rev_${p.id}`] || 0
                    const total = falta + ajuste
                    const costo = total * p.costo
                    return (
                      <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--borderl)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12 }}>{p.nombre}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                              Stock: <span style={{ color: '#aa2020' }}>{fmtN(p.stock_kg, 1)}</span> / mínimo: {minimo} {p.unidad_venta || 'u'}
                            </div>
                          </div>
                          <input type="number" value={ajuste}
                            onChange={e => setAjustes(prev => ({ ...prev, [`rev_${p.id}`]: parseFloat(e.target.value) || 0 }))}
                            style={{ width: 55, fontSize: 11, padding: '2px 5px' }}
                            title="Ajuste manual" />
                          <div style={{ textAlign: 'right', minWidth: 80 }}>
                            <div style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 'bold' }}>{fmtN(total, 1)} {p.unidad_venta || 'u'}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{fmt(costo)}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })
              }

              {reventaAComprar.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 15, fontWeight: 'bold' }}>
                  <span style={{ color: 'var(--muted)' }}>Total reventa</span>
                  <span style={{ color: 'var(--gold)' }}>{fmt(totalReventa)}</span>
                </div>
              )}
            </div>

            {/* Resumen de inversión */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Resumen de inversión</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--muted)' }}>Ingredientes elaboración</span>
                <span>Ver detalle →</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: 'var(--muted)' }}>Reposición reventa</span>
                <span style={{ color: 'var(--gold)' }}>{fmt(totalReventa)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--dim)', padding: '8px 10px', background: 'var(--bg)', borderRadius: 6 }}>
                Los ingredientes se cargan con precios desde Fichas → Actualizar precios. La inversión total en ingredientes se calcula automáticamente una vez que los precios estén actualizados.
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>
            Stock mínimo por producto de reventa
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            Cuando el stock baja de este umbral, el producto aparece en la orden de compra automáticamente.
          </div>
          {['JUMBALAY', 'CORTES', 'EMBUTIDOS', 'PAPAS'].map(cat => {
            const prods = productos.filter(p => p.categoria === cat && p.tipo_producto === 'reventa')
            if (!prods.length) return null
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>{cat}</div>
                {prods.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--borderl)', fontSize: 13 }}>
                    <div style={{ flex: 1 }}>{p.nombre}</div>
                    <span style={{ fontSize: 11, color: '#aa2020' }}>Stock: {fmtN(p.stock_kg, 1)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <label style={{ fontSize: 11, color: 'var(--muted)' }}>Mínimo:</label>
                      <input type="number" value={stockMinReventa[p.id] || 5} min={0} step={1}
                        onChange={e => setStockMinReventa(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                        style={{ width: 60, fontSize: 12, padding: '3px 6px' }} />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.unidad_venta || 'u'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
