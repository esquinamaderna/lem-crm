'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today, fechaES } from '@/lib/utils'

const MP_TASA = 0.0599 * 1.21  // 5.99% + IVA

function periodoActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function periodoLabel(p: string) {
  const [y, m] = p.split('-')
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${meses[parseInt(m) - 1]} ${y}`
}

const CATEGORIAS_FIJO = ['fijo', 'variable', 'operativo'] as const
type CatFijo = typeof CATEGORIAS_FIJO[number]

const CAT_LABEL: Record<CatFijo, string> = {
  fijo: 'Costo fijo',
  variable: 'Costo variable',
  operativo: 'Gasto operativo / mantenimiento',
}

const CAT_COLOR: Record<CatFijo, string> = {
  fijo: '#3266ad',
  variable: '#d85a30',
  operativo: '#1d9e75',
}

interface CostoFijo {
  id: number
  periodo: string
  concepto: string
  categoria: CatFijo
  monto: number
  notas?: string
}

interface VentaMes {
  total: number
  fecha: string
}

const b = (v?: 'gold' | 'red' | 'green' | 'blue'): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif',
  border: `1px solid ${v === 'gold' ? 'var(--gold)' : v === 'red' ? 'rgba(190,50,50,.3)' : v === 'green' ? 'rgba(30,140,70,.3)' : v === 'blue' ? 'rgba(30,100,180,.3)' : 'var(--border)'}`,
  background: v === 'gold' ? 'var(--gold)' : v === 'red' ? 'rgba(190,50,50,.08)' : v === 'green' ? 'rgba(30,140,70,.08)' : v === 'blue' ? 'rgba(30,100,180,.08)' : 'var(--card)',
  color: v === 'gold' ? '#fff' : v === 'red' ? '#aa2020' : v === 'green' ? '#1a7a40' : v === 'blue' ? '#1050a0' : 'var(--text)',
})

const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }

const CONCEPTOS_DEFAULT = [
  { concepto: 'Alquiler', categoria: 'fijo' as CatFijo },
  { concepto: 'Sueldos producción', categoria: 'fijo' as CatFijo },
  { concepto: 'Servicios (luz, gas, agua)', categoria: 'fijo' as CatFijo },
  { concepto: 'Internet + Bot WhatsApp', categoria: 'fijo' as CatFijo },
  { concepto: 'Monotributo', categoria: 'fijo' as CatFijo },
  { concepto: 'Seguros', categoria: 'fijo' as CatFijo },
  { concepto: 'Amortización equipos', categoria: 'fijo' as CatFijo },
  { concepto: 'Envío y embalajes', categoria: 'variable' as CatFijo },
  { concepto: 'Comisión delivery/MP', categoria: 'variable' as CatFijo },
  { concepto: 'Reparación / mantenimiento', categoria: 'operativo' as CatFijo },
  { concepto: 'Service equipos', categoria: 'operativo' as CatFijo },
]

export function DashboardClient() {
  const [periodo, setPeriodo] = useState(periodoActual())
  const [costos, setCostos] = useState<CostoFijo[]>([])
  const [ventas, setVentas] = useState<VentaMes[]>([])
  const [ventasPorMedio, setVentasPorMedio] = useState<{medio_pago: string, total: number}[]>([])
  const [ventaItems, setVentaItems] = useState<any[]>([])
  const [pctMP, setPctMP] = useState(30)
  const [tab, setTab] = useState<'resumen' | 'costos' | 'equilibrio' | 'compras'>('resumen')
  const [loading, setLoading] = useState(true)

  // Form nuevo costo
  const [fConcepto, setFConcepto] = useState('')
  const [fCategoria, setFCategoria] = useState<CatFijo>('fijo')
  const [fMonto, setFMonto] = useState('')
  const [fNotas, setFNotas] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [ajustesCompra, setAjustesCompra] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    setLoading(true)
    // Cargar datos en paralelo (sin join en venta_items para evitar error 400)
    const [{ data: c }, { data: v }, { data: vm }, { data: ventaIds }, { data: prodData }] = await Promise.all([
      supabase.from('costos_fijos_mensuales').select('*').eq('periodo', periodo).order('categoria').order('concepto'),
      supabase.from('ventas').select('total, fecha').gte('fecha', periodo + '-01').lte('fecha', periodo + '-31'),
      supabase.from('ventas').select('medio_pago, total').gte('fecha', periodo + '-01').lte('fecha', periodo + '-31'),
      supabase.from('ventas').select('id').gte('fecha', periodo + '-01').lte('fecha', periodo + '-31'),
      supabase.from('productos').select('id, tipo_producto, costo, precio_venta').eq('activo', true),
    ])
    setCostos((c || []) as CostoFijo[])
    setVentas((v || []) as VentaMes[])
    // Obtener venta_items por IDs de ventas del período
    const prodMap: Record<number, any> = {}
    ;(prodData || []).forEach((p: any) => { prodMap[p.id] = p })
    const ids = (ventaIds || []).map((v: any) => v.id)
    if (ids.length > 0) {
      const { data: vi } = await supabase.from('venta_items')
        .select('producto_id, cantidad_kg, precio_final')
        .in('venta_id', ids)
      const viEnriquecido = (vi || []).map((item: any) => ({
        ...item,
        productos: prodMap[item.producto_id] || null
      }))
      setVentaItems(viEnriquecido)
    } else {
      setVentaItems([])
    }
    const medios = (vm || []) as {medio_pago: string, total: number}[]
    setVentasPorMedio(medios)
    // Calcular % MP automáticamente desde ventas reales
    if (medios.length > 0) {
      const totalVtas = medios.reduce((s, v) => s + v.total, 0)
      const totalMP = medios.filter(v => v.medio_pago === 'MercadoPago').reduce((s, v) => s + v.total, 0) // Transferencia MP no tiene comisión
      if (totalVtas > 0) setPctMP(Math.round(totalMP / totalVtas * 100))
    }
    setLoading(false)
  }, [periodo])

  useEffect(() => { load() }, [load])

  // ── Cálculos ──
  // Estadísticas de medios de pago calculadas automáticamente
  const mediosPago = ventasPorMedio.reduce((acc, v) => {
    acc[v.medio_pago] = (acc[v.medio_pago] || 0) + v.total
    return acc
  }, {} as Record<string, number>)
  const totalVentasMedio = Object.values(mediosPago).reduce((s, v) => s + v, 0)
  const pctMPReal = totalVentasMedio > 0 ? Math.round((mediosPago['MercadoPago'] || 0) / totalVentasMedio * 100) : null

  const totalFijo     = costos.filter(c => c.categoria === 'fijo').reduce((s, c) => s + c.monto, 0)
  const totalVariable = costos.filter(c => c.categoria === 'variable').reduce((s, c) => s + c.monto, 0)
  const totalOperativo = costos.filter(c => c.categoria === 'operativo').reduce((s, c) => s + c.monto, 0)
  const totalCostosCargados = totalFijo + totalVariable + totalOperativo

  const ventasTotalMes = ventas.reduce((s, v) => s + v.total, 0)
  // Solo "MercadoPago" tiene comisión — "Transferencia MP" es transferencia bancaria sin costo
  const ventasConComisionMP = Object.entries(mediosPago)
    .filter(([medio]) => medio === 'MercadoPago')
    .reduce((s, [, v]) => s + v, 0)
  const costoMPReal = ventasConComisionMP > 0
    ? ventasConComisionMP * MP_TASA
    : ventasTotalMes * (pctMP / 100) * MP_TASA
  const totalCostosReales = totalCostosCargados + costoMPReal

  // FC promedio ponderado (usamos 47% como base, ajustable)
  const FC_PROM = 0.47
  const margenBruto = ventasTotalMes * (1 - FC_PROM)
  const resultadoNeto = margenBruto - totalCostosReales
  const enNegros = resultadoNeto >= 0

  const enNegrosOperativo = resultadoNeto >= 0

  // Punto de equilibrio del mes
  const cm = 1 - FC_PROM - (pctMP / 100) * MP_TASA
  const puntoEq = cm > 0 ? totalCostosCargados / cm : 0
  const faltaParaEq = Math.max(0, puntoEq - ventasTotalMes)

  // ── Reposición calculada por tipo de producto ──
  // Si hay venta_items con tipo, calcular FC real separado por elaborado/reventa
  // Si no hay datos suficientes, usar FC_PROM como fallback
  const itemsElaborados = ventaItems.filter((i: any) => i.productos?.tipo_producto === 'elaborado')
  const itemsReventa    = ventaItems.filter((i: any) => i.productos?.tipo_producto === 'reventa')

  const ventasElaborados = itemsElaborados.reduce((s: number, i: any) => s + (i.precio_final || 0), 0)
  const ventasReventa    = itemsReventa.reduce((s: number, i: any) => s + (i.precio_final || 0), 0)

  // FC real de elaborados (costo ingredientes / PV)
  const costoElaborados = itemsElaborados.reduce((s: number, i: any) => {
    const fc = i.productos ? i.productos.costo / (i.productos.precio_venta || 1) : FC_PROM
    return s + (i.precio_final || 0) * fc
  }, 0)
  // FC real de reventa (costo compra / PV)  
  const costoReventa = itemsReventa.reduce((s: number, i: any) => {
    const fc = i.productos ? i.productos.costo / (i.productos.precio_venta || 1) : 0.65
    return s + (i.precio_final || 0) * fc
  }, 0)

  // Calcular reposición siempre sobre ventas reales (o punto equilibrio si no hay ventas)
  // FC real si hay items con datos, FC_PROM como fallback
  const hayDatosItems = ventaItems.length > 0 && (costoElaborados + costoReventa) > 0
  const baseCalculo = ventasTotalMes > 0 ? ventasTotalMes : puntoEq
  
  let costoReposicionElaborados: number
  let costoReposicionReventa: number
  
  if (hayDatosItems) {
    // Usar FC real calculado desde los items vendidos
    costoReposicionElaborados = costoElaborados
    costoReposicionReventa = costoReventa
  } else {
    // Estimar: 70% elaborados (FC 47%), 30% reventa (FC 65%)
    costoReposicionElaborados = baseCalculo * 0.70 * FC_PROM
    costoReposicionReventa    = baseCalculo * 0.30 * 0.65
  }
  const costoReposicion = costoReposicionElaborados + costoReposicionReventa

  const resultadoCaja = resultadoNeto - costoReposicion
  const enNegrosCaja = resultadoCaja >= 0

  // FC promedio real del mix vendido
  const fcRealMix = ventasTotalMes > 0 ? (costoElaborados + costoReventa) / ventasTotalMes : FC_PROM
  const pctAvance = puntoEq > 0 ? Math.min(100, ventasTotalMes / puntoEq * 100) : 0

  const diasMes = new Date(parseInt(periodo.split('-')[0]), parseInt(periodo.split('-')[1]), 0).getDate()
  const diaHoy = new Date().getDate()
  const proyeccionMes = ventasTotalMes > 0 ? (ventasTotalMes / diaHoy) * diasMes : 0

  async function guardarCosto() {
    if (!fConcepto.trim() || !fMonto) return
    setSaving(true)
    const data = { periodo, concepto: fConcepto, categoria: fCategoria, monto: parseFloat(fMonto), notas: fNotas }
    if (editId) {
      await supabase.from('costos_fijos_mensuales').update(data).eq('id', editId)
    } else {
      await supabase.from('costos_fijos_mensuales').insert(data)
    }
    setFConcepto(''); setFMonto(''); setFNotas(''); setEditId(null)
    setSaving(false); load()
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este costo?')) return
    await supabase.from('costos_fijos_mensuales').delete().eq('id', id)
    load()
  }

  async function copiarDelMesAnterior() {
    const [y, m] = periodo.split('-').map(Number)
    const mesAnterior = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
    const { data } = await supabase.from('costos_fijos_mensuales').select('*').eq('periodo', mesAnterior)
    if (!data || data.length === 0) { alert('No hay costos cargados en el mes anterior'); return }
    const nuevos = data.map(({ id: _, periodo: __, created_at: ___, ...rest }) => ({ ...rest, periodo }))
    await supabase.from('costos_fijos_mensuales').insert(nuevos)
    load()
  }

  function abrirEdicion(c: CostoFijo) {
    setEditId(c.id); setFConcepto(c.concepto); setFCategoria(c.categoria)
    setFMonto(String(c.monto)); setFNotas(c.notas || ''); setTab('costos')
  }

  const periodos = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '7px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif',
    border: tab === t ? '1px solid var(--gold)' : '1px solid var(--border)',
    background: tab === t ? 'var(--gold-bg)' : 'var(--card)',
    color: tab === t ? 'var(--gold)' : 'var(--muted)',
  })

  const kpi = (label: string, value: string, color?: string, sub?: string) => (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 20, color: color || 'var(--gold)', fontWeight: 'normal' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3 }}>{sub}</div>}
    </div>
  )


  function imprimirResumenMensual() {
    const label = periodoLabel(periodo)
    const html = `
      <style>
        body { font-family: Georgia, serif; color: #111; max-width: 680px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 22px; font-weight: normal; letter-spacing: 2px; text-transform: uppercase; border-bottom: 2px solid #9a7a1a; padding-bottom: 8px; margin-bottom: 20px; }
        .subtitulo { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #888; margin-bottom: 6px; }
        .fila { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
        .fila.negativo { color: #aa2020; }
        .fila.separador { border-bottom: 2px solid #333; font-weight: bold; font-size: 15px; margin: 4px 0; }
        .resultado { display: flex; justify-content: space-between; padding: 16px 20px; margin-top: 16px; border-radius: 6px; font-size: 22px; font-weight: bold; }
        .positivo { background: #e8f5ed; color: #1a7a40; border: 2px solid #1a7a40; }
        .negativo-box { background: #fceaea; color: #aa2020; border: 2px solid #aa2020; }
        .nota { font-size: 11px; color: #888; margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; }
        .bloque { margin-bottom: 20px; }
        .medios { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px,1fr)); gap: 10px; margin-top: 8px; }
        .medio-card { border: 1px solid #eee; border-radius: 6px; padding: 10px; }
        .medio-card .medio-nombre { font-size: 11px; color: #888; margin-bottom: 4px; }
        .medio-card .medio-monto { font-size: 15px; font-weight: bold; }
        .medio-card .medio-pct { font-size: 11px; color: #888; }
        @media print { body { padding: 10mm; } }
      </style>

      <h1>La Esquina de Maderna — ${label}</h1>
      <p style="font-size:12px;color:#888;margin-bottom:24px;">Resumen financiero mensual · Generado ${new Date().toLocaleDateString('es-AR')}</p>

      <div class="bloque">
        <div class="subtitulo">Estado de resultados</div>
        <div class="fila"><span>Ventas del mes</span><span><strong>${fmt(ventasTotalMes)}</strong></span></div>
        <div class="fila negativo"><span>− Materia prima (FC ${(FC_PROM*100).toFixed(0)}%)</span><span>−${fmt(ventasTotalMes * FC_PROM)}</span></div>
        <div class="fila separador"><span>= Margen bruto</span><span>${fmt(margenBruto)}</span></div>
        <div class="fila negativo"><span>− Costos fijos</span><span>−${fmt(totalFijo)}</span></div>
        ${costoMPReal > 0 ? `<div class="fila negativo"><span>− Comisión MercadoPago (${pctMPReal ?? pctMP}%)</span><span>−${fmt(costoMPReal)}</span></div>` : ''}
        ${(totalVariable + totalOperativo) > 0 ? `<div class="fila negativo"><span>− Gastos variables y operativos</span><span>−${fmt(totalVariable + totalOperativo)}</span></div>` : ''}
        <div class="resultado ${enNegrosOperativo ? 'positivo' : 'negativo-box'}">
          <span>MARGEN OPERATIVO</span>
          <span>${enNegrosOperativo ? '+' : ''}${fmt(resultadoNeto)}</span>
        </div>
        <div style="margin-top:10px;padding:10px 14px;background:#f0f4ff;border-radius:6px;border:1px solid #b0c4e8;">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;">
            <span style="color:#666">− Reposición materia prima (FC ${(FC_PROM*100).toFixed(0)}%)</span>
            <span style="color:#aa2020">−${fmt(costoReposicion)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:bold;border-top:1px solid #b0c4e8;padding-top:6px;margin-top:4px;">
            <span>DINERO DISPONIBLE EN CAJA</span>
            <span style="color:${enNegrosCaja ? '#1a7a40' : '#aa2020'}">${enNegrosCaja ? '+' : ''}${fmt(resultadoCaja)}</span>
          </div>
        </div>
      </div>

      <div class="bloque">
        <div class="subtitulo">Punto de equilibrio</div>
        <div class="fila"><span>Ventas necesarias para cubrir todos los costos</span><span><strong>${fmt(puntoEq)}</strong></span></div>
        <div class="fila"><span>Ventas reales del mes</span><span>${fmt(ventasTotalMes)}</span></div>
        <div class="fila"><span>Avance al equilibrio</span><span><strong>${pctAvance.toFixed(1)}%</strong></span></div>
        <div class="fila"><span>Proyección al cierre del mes</span><span>${fmt(proyeccionMes)}</span></div>
      </div>

      ${Object.keys(mediosPago).length > 0 ? `
      <div class="bloque">
        <div class="subtitulo">Medios de pago</div>
        <div class="medios">
          ${Object.entries(mediosPago).sort((a,b)=>b[1]-a[1]).map(([medio, total]) => {
            const pct = totalVentasMedio > 0 ? (total / totalVentasMedio * 100) : 0
            const esMP = medio === 'MercadoPago'
            return `<div class="medio-card">
              <div class="medio-nombre">${medio}</div>
              <div class="medio-monto" style="color:${esMP?'#1050a0':'#111'}">${fmt(total)}</div>
              <div class="medio-pct">${pct.toFixed(1)}% del total</div>
              ${esMP ? `<div style="font-size:11px;color:#aa2020;margin-top:2px;">Comisión: ${fmt(total * MP_TASA)}</div>` : ''}
            </div>`
          }).join('')}
        </div>
      </div>` : ''}

      ${costos.length > 0 ? `
      <div class="bloque">
        <div class="subtitulo">Detalle de costos — ${label}</div>
        ${(['fijo','variable','operativo']).map(cat => {
          const items = costos.filter(c => c.categoria === cat)
          if (!items.length) return ''
          const total = items.reduce((s,c) => s + c.monto, 0)
          return `<div style="margin-bottom:10px;">
            <div style="font-size:11px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">${CAT_LABEL[cat as CatFijo]} — ${fmt(total)}</div>
            ${items.map(c => `<div class="fila" style="font-size:13px;"><span style="color:#666;">${c.concepto}</span><span>${fmt(c.monto)}</span></div>`).join('')}
          </div>`
        }).join('')}
      </div>` : ''}

      <div class="nota">
        💡 FC ${(FC_PROM*100).toFixed(0)}% = el ${(FC_PROM*100).toFixed(0)}% del precio de venta es costo de materia prima. Del ${(100-FC_PROM*100).toFixed(0)}% restante (margen bruto) se pagan todos los gastos operativos del negocio. La ganancia real es lo que queda después de pagar absolutamente todo.
        <br><br>Generado desde el CRM de La Esquina de Maderna · ${new Date().toLocaleString('es-AR')}
      </div>
    `
    const ventana = window.open('', '_blank', 'width=800,height=600')
    if (!ventana) return
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resumen ${label}</title></head><body>${html}</body></html>`)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => { ventana.print(); ventana.close() }, 400)
  }

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Dashboard financiero</div>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ width: 160, fontSize: 14 }}>
            {periodos.map(p => <option key={p} value={p}>{periodoLabel(p)}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {pctMPReal !== null ? (
              <span style={{ background: 'rgba(30,100,180,.08)', border: '1px solid rgba(30,100,180,.25)', borderRadius: 6, padding: '4px 10px', color: '#1050a0', fontSize: 12 }}>
                MP real: <strong>{pctMPReal}%</strong>
              </span>
            ) : (
              <>
                <span>MP estimado:</span>
                <input type="number" value={pctMP} onChange={e => setPctMP(parseInt(e.target.value))} min={0} max={100} style={{ width: 60, fontSize: 12, padding: '4px 8px' }} />
                <span>%</span>
              </>
            )}
          </div>
          <button
            onClick={imprimirResumenMensual}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif', whiteSpace: 'nowrap' }}
          >
            🖨 Imprimir resumen
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button style={tabStyle('resumen')} onClick={() => setTab('resumen')}>📊 Resumen del mes</button>
        <button style={tabStyle('costos')} onClick={() => setTab('costos')}>📋 Cargar costos</button>
        <button style={tabStyle('equilibrio')} onClick={() => setTab('equilibrio')}>⚖ Punto de equilibrio</button>
        <button style={tabStyle('compras')} onClick={() => setTab('compras')}>🛒 Proyección de compras</button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>Cargando datos...</div>}

      {/* ══ RESUMEN ══ */}
      {!loading && tab === 'resumen' && (
        <div>
          {/* CASCADA DE RESULTADO — el número más importante, bien grande */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: 'var(--shadow)' }}>

            {/* Fila 1: Ventas */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 12, borderBottom: '1px solid var(--borderl)', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Ventas del mes</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{ventas.length} transacciones registradas</div>
              </div>
              <div style={{ fontSize: 32, color: 'var(--gold)', fontWeight: 'normal' }}>{fmt(ventasTotalMes)}</div>
            </div>

            {/* Fila 2: Materia prima */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 12, borderBottom: '1px solid var(--borderl)', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>− Materia prima (FC {(FC_PROM*100).toFixed(0)}%)</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>Costo de producción de lo vendido</div>
              </div>
              <div style={{ fontSize: 24, color: '#aa2020' }}>−{fmt(ventasTotalMes * FC_PROM)}</div>
            </div>

            {/* Fila 3: Margen bruto */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 12, borderBottom: '2px solid var(--border)', marginBottom: 12, background: 'var(--bg)', margin: '-4px -4px 12px -4px', padding: '10px 14px', borderRadius: 6 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>= Margen bruto</div>
                <div style={{ fontSize: 12, color: '#aa2020' }}>⚠ Esto NO es la ganancia — todavía hay que pagar los gastos</div>
              </div>
              <div style={{ fontSize: 26, color: 'var(--text)' }}>{fmt(margenBruto)}</div>
            </div>

            {/* Fila 4: Costos fijos */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 12, borderBottom: '1px solid var(--borderl)', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>− Costos fijos</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>Alquiler · Sueldos · Internet · Monotributo · Seguros</div>
              </div>
              <div style={{ fontSize: 22, color: '#aa2020' }}>−{fmt(totalFijo)}</div>
            </div>

            {/* Fila 5: Comisión MP */}
            {costoMPReal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 12, borderBottom: '1px solid var(--borderl)', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>− Comisión MercadoPago</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)' }}>{pctMPReal ?? pctMP}% de ventas × 7.24% efectivo</div>
                </div>
                <div style={{ fontSize: 22, color: '#aa2020' }}>−{fmt(costoMPReal)}</div>
              </div>
            )}

            {/* Fila 6: Gastos variables y operativos */}
            {(totalVariable + totalOperativo) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 12, borderBottom: '1px solid var(--borderl)', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>− Gastos variables y operativos</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)' }}>Embalajes · Reparaciones · Mantenimiento</div>
                </div>
                <div style={{ fontSize: 22, color: '#aa2020' }}>−{fmt(totalVariable + totalOperativo)}</div>
              </div>
            )}

            {/* DOS RESULTADOS — margen operativo y realidad de caja */}
            <div className="resultado-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>

              {/* Columna 1: Ganancia operativa (sin reposición) */}
              <div style={{ padding: '16px 18px', borderRadius: 10, background: enNegrosOperativo ? 'rgba(26,122,64,.08)' : 'rgba(170,32,32,.06)', border: `2px solid ${enNegrosOperativo ? 'rgba(26,122,64,.3)' : 'rgba(170,32,32,.3)'}` }}>
                <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Margen operativo</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.4 }}>
                  Ganancia después de cubrir costos fijos y variables. <strong>No incluye reposición de materia prima.</strong> Útil para evaluar si el precio de venta es correcto.
                </div>
                <div style={{ fontSize: 36, fontWeight: 'bold', color: enNegrosOperativo ? '#1a7a40' : '#aa2020', letterSpacing: -1 }}>
                  {enNegrosOperativo ? '+' : ''}{fmt(resultadoNeto)}
                </div>
                <div style={{ fontSize: 11, color: enNegrosOperativo ? '#1a7a40' : '#aa2020', marginTop: 4 }}>
                  {enNegrosOperativo ? '✓ El modelo de precios funciona' : '✗ Los precios no cubren los costos'}
                </div>
              </div>

              {/* Columna 2: Realidad de caja (con reposición) */}
              <div style={{ padding: '16px 18px', borderRadius: 10, background: enNegrosCaja ? 'rgba(26,122,64,.08)' : 'rgba(170,32,32,.06)', border: `2px solid ${enNegrosCaja ? 'rgba(26,122,64,.3)' : 'rgba(170,32,32,.3)'}` }}>
                <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Realidad de caja</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.4 }}>
                  Ganancia real después de reservar <strong>{fmt(costoReposicion)}</strong> para reponer stock del próximo mes.
                  {hayDatosItems
                    ? ` FC real del mix: ${(fcRealMix*100).toFixed(1)}% (elaborados ${(costoReposicionElaborados/Math.max(ventasTotalMes,1)*100).toFixed(1)}% + reventa ${(costoReposicionReventa/Math.max(ventasTotalMes,1)*100).toFixed(1)}%)`
                    : ` FC estimado ${(FC_PROM*100).toFixed(0)}% (sin ventas registradas aún)`}
                </div>
                <div style={{ fontSize: 36, fontWeight: 'bold', color: enNegrosCaja ? '#1a7a40' : '#aa2020', letterSpacing: -1 }}>
                  {enNegrosCaja ? '+' : ''}{fmt(resultadoCaja)}
                </div>
                <div style={{ fontSize: 11, color: enNegrosCaja ? '#1a7a40' : '#aa2020', marginTop: 4 }}>
                  {enNegrosCaja ? '✓ El negocio genera caja libre' : '✗ No alcanza para reponer stock'}
                </div>
              </div>
            </div>

            {/* Desglose reposición por tipo */}
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(30,100,180,.06)', border: '1px solid rgba(30,100,180,.2)', borderRadius: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--muted)' }}>Margen operativo</span>
                <span style={{ color: enNegrosOperativo ? '#1a7a40' : '#aa2020', fontWeight: 'bold' }}>{fmt(resultadoNeto)}</span>
              </div>
              {costoReposicionElaborados > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, color: '#aa2020' }}>
                  <span>− Reposición ingredientes (elaborados)</span>
                  <span>−{fmt(costoReposicionElaborados)}</span>
                </div>
              )}
              {costoReposicionReventa > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#aa2020' }}>
                  <span>− Reposición stock (reventa)</span>
                  <span>−{fmt(costoReposicionReventa)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#aa2020', borderTop: '1px dashed rgba(170,32,32,.2)', paddingTop: 4 }}>
                <span>Total reposición {hayDatosItems ? `(FC real ${(fcRealMix*100).toFixed(1)}%)` : `(FC estimado ${(FC_PROM*100).toFixed(0)}%)`}</span>
                <span>−{fmt(costoReposicion)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 6, fontWeight: 'bold' }}>
                <span>= Dinero disponible en caja</span>
                <span style={{ color: enNegrosCaja ? '#1a7a40' : '#aa2020', fontSize: 15 }}>{fmt(resultadoCaja)}</span>
              </div>
            </div>

            {/* Nota educativa */}
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(154,122,26,.06)', border: '1px solid rgba(154,122,26,.2)', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
              💡 <strong style={{ color: 'var(--text)' }}>FC {(FC_PROM*100).toFixed(0)}% no significa ganar el {(100-FC_PROM*100).toFixed(0)}%.</strong> Del margen bruto hay que pagar costos fijos, comisiones y reponer la materia prima para el próximo ciclo. El dinero disponible en caja es lo que realmente queda libre.
            </div>
          </div>

          {/* Barra de progreso al equilibrio */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16, boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Avance al punto de equilibrio — {periodoLabel(periodo)}</span>
              <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{pctAvance.toFixed(1)}%</span>
            </div>
            <div style={{ height: 14, background: 'var(--bg)', borderRadius: 7, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ height: '100%', borderRadius: 7, width: `${pctAvance}%`, background: pctAvance >= 100 ? '#1a7a40' : pctAvance >= 70 ? '#9a7a1a' : '#aa2020', transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
              <span>Vendido: <strong style={{ color: 'var(--text)' }}>{fmt(ventasTotalMes)}</strong></span>
              <span>Equilibrio: <strong style={{ color: 'var(--text)' }}>{fmt(puntoEq)}</strong></span>
            </div>
            {faltaParaEq > 0 && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(170,32,32,.08)', border: '1px solid rgba(170,32,32,.2)', borderRadius: 6, fontSize: 12, color: '#aa2020' }}>
                Te faltan <strong>{fmt(faltaParaEq)}</strong> para cubrir todos los costos este mes.
                {proyeccionMes > 0 && <span style={{ marginLeft: 8, color: 'var(--muted)' }}>Proyección al cierre: {fmt(proyeccionMes)}</span>}
              </div>
            )}
            {faltaParaEq === 0 && ventasTotalMes > 0 && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(26,122,64,.08)', border: '1px solid rgba(26,122,64,.2)', borderRadius: 6, fontSize: 12, color: '#1a7a40' }}>
                ✓ El negocio cubre sus costos. Ganancia neta acumulada: <strong>{fmt(resultadoNeto)}</strong>
              </div>
            )}
          </div>

          {/* Estadísticas medios de pago */}
          {ventasPorMedio.length > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)', marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Medios de pago — {periodoLabel(periodo)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
                {Object.entries(mediosPago).sort((a,b) => b[1]-a[1]).map(([medio, total]) => {
                  const pct = totalVentasMedio > 0 ? (total / totalVentasMedio * 100) : 0
                  const esMP = medio === 'MercadoPago'
                  return (
                    <div key={medio} style={{ background: 'var(--bg)', borderRadius: 6, padding: '10px 12px', border: `1px solid ${esMP ? 'rgba(30,100,180,.25)' : 'var(--border)'}` }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{medio}</div>
                      <div style={{ fontSize: 16, fontWeight: 'bold', color: esMP ? '#1050a0' : 'var(--text)' }}>{fmt(total)}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{pct.toFixed(1)}% del total</div>
                      {esMP && <div style={{ fontSize: 11, color: '#aa2020', marginTop: 3 }}>Comisión: {fmt(total * MP_TASA)}</div>}
              {medio === 'Transferencia MP' && <div style={{ fontSize: 11, color: '#1a7a40', marginTop: 3 }}>Sin comisión ✓</div>}
                      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 6 }}>
                        <div style={{ height: '100%', borderRadius: 2, width: pct + '%', background: esMP ? '#1050a0' : '#1a7a40' }} />
                      </div>
                    </div>
                  )
                })}
                <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '10px 12px', border: '1px solid rgba(154,122,26,.25)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Comisión MP total</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#aa2020' }}>{fmt((mediosPago['MercadoPago'] || 0) * MP_TASA)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>7.24% efectivo s/ventas MP</div>
                </div>
              </div>
            </div>
          )}

          {/* Alerta costos no cargados */}
          {costos.length === 0 && (
            <div style={{ padding: '12px 16px', background: 'rgba(154,122,26,.08)', border: '1px solid rgba(154,122,26,.25)', borderRadius: 8, fontSize: 13, color: 'var(--gold)', marginBottom: 12 }}>
              No hay costos cargados para {periodoLabel(periodo)}.
              <button onClick={() => setTab('costos')} style={{ marginLeft: 10, ...b('gold'), padding: '3px 10px', fontSize: 11 }}>Cargar ahora →</button>
            </div>
          )}
        </div>
      )}

      {/* ══ CARGAR COSTOS ══ */}
      {!loading && tab === 'costos' && (
        <div className="fichas-grid">
          {/* Formulario */}
          <div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
                {editId ? 'Editar costo' : `Agregar costo — ${periodoLabel(periodo)}`}
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={lbl}>Concepto</label>
                <input value={fConcepto} onChange={e => setFConcepto(e.target.value)} placeholder="ej: Alquiler, Reparación heladera..." list="conceptos-list" />
                <datalist id="conceptos-list">
                  {CONCEPTOS_DEFAULT.map(c => <option key={c.concepto} value={c.concepto} />)}
                </datalist>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={lbl}>Categoría</label>
                  <select value={fCategoria} onChange={e => setFCategoria(e.target.value as CatFijo)}>
                    {CATEGORIAS_FIJO.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Monto ($)</label>
                  <input type="number" value={fMonto} onChange={e => setFMonto(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Notas (opcional)</label>
                <input value={fNotas} onChange={e => setFNotas(e.target.value)} placeholder="ej: incluye IVA, mes de mayo..." />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {editId && <button onClick={() => { setEditId(null); setFConcepto(''); setFMonto(''); setFNotas('') }} style={b()}>Cancelar</button>}
                <button onClick={guardarCosto} disabled={saving} style={{ ...b('gold'), flex: 1, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Guardando...' : editId ? 'Guardar cambio' : 'Agregar costo'}
                </button>
              </div>
            </div>

            {costos.length === 0 && (
              <button onClick={copiarDelMesAnterior} style={{ ...b('blue'), width: '100%', marginBottom: 14 }}>
                📋 Copiar costos del mes anterior
              </button>
            )}

            {/* Resumen rápido */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>Resumen {periodoLabel(periodo)}</div>
              {(['fijo', 'variable', 'operativo'] as CatFijo[]).map(cat => {
                const total = costos.filter(c => c.categoria === cat).reduce((s, c) => s + c.monto, 0)
                return total > 0 ? (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--borderl)', fontSize: 13 }}>
                    <span style={{ color: CAT_COLOR[cat] }}>{CAT_LABEL[cat]}</span>
                    <span style={{ fontWeight: 'bold' }}>{fmt(total)}</span>
                  </div>
                ) : null
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 15 }}>
                <span style={{ color: 'var(--muted)' }}>TOTAL COSTOS</span>
                <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{fmt(totalCostosCargados)}</span>
              </div>
            </div>
          </div>

          {/* Lista de costos cargados */}
          <div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
                Costos cargados — {periodoLabel(periodo)}
              </div>
              {costos.length === 0
                ? <div style={{ textAlign: 'center', color: 'var(--dim)', padding: '20px 0', fontSize: 13 }}>Sin costos cargados este mes</div>
                : (['fijo', 'variable', 'operativo'] as CatFijo[]).map(cat => {
                  const items = costos.filter(c => c.categoria === cat)
                  if (!items.length) return null
                  return (
                    <div key={cat} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: CAT_COLOR[cat], marginBottom: 6 }}>{CAT_LABEL[cat]}</div>
                      {items.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--borderl)', fontSize: 13 }}>
                          <div style={{ flex: 1 }}>
                            <div>{c.concepto}</div>
                            {c.notas && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.notas}</div>}
                          </div>
                          <div style={{ fontWeight: 'bold', color: 'var(--text)', minWidth: 90, textAlign: 'right' }}>{fmt(c.monto)}</div>
                          <button onClick={() => abrirEdicion(c)} style={{ ...b(), padding: '3px 8px', fontSize: 11 }}>✏</button>
                          <button onClick={() => eliminar(c.id)} style={{ ...b('red'), padding: '3px 8px', fontSize: 11 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )
                })
              }
            </div>
          </div>
        </div>
      )}

      {/* ══ PUNTO DE EQUILIBRIO ══ */}
      {!loading && tab === 'equilibrio' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
            {kpi('Costos fijos cargados', fmt(totalFijo))}
            {kpi('Costos variables', fmt(totalVariable + costoMPReal))}
            {kpi('Gastos operativos', fmt(totalOperativo))}
            {kpi('Total costos reales', fmt(totalCostosReales), '#aa2020')}
            {kpi('Punto de equilibrio', fmt(puntoEq), 'var(--gold)', `FC prom. ${(FC_PROM*100).toFixed(0)}%`)}
            {kpi('Ventas necesarias/día', fmt(puntoEq / diasMes), 'var(--muted)', `para ${diasMes} días`)}
          </div>

          {/* Tabla: qué vender para llegar */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14, boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
              ¿Cuánto vender por día para llegar al equilibrio?
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>{['Producto', 'PV/kg', 'Kg/día necesarios', 'Kg/mes', 'Facturación mensual'].map(h => (
                    <th key={h} style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {[
                    { nombre: 'Milanesa de Pollo s/provenzal', pv: 12000 },
                    { nombre: 'Milanesa de Nalga UG',          pv: 30000 },
                    { nombre: 'Ribs Kansas BBQ',               pv: 15000 },
                    { nombre: 'Medallones de Pollo × 12',      pv: 17000 },
                    { nombre: 'Caritas de Papa',               pv: 17000 },
                    { nombre: 'Nuggets Crocantes',             pv: 21000 },
                    { nombre: 'Mix equilibrado (FC 47%)',      pv: 14500 },
                  ].map(p => {
                    const kgDia = puntoEq / diasMes / p.pv
                    const kgMes = kgDia * diasMes
                    const factMes = kgMes * p.pv
                    return (
                      <tr key={p.nombre}>
                        <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--borderl)' }}>{p.nombre}</td>
                        <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--gold)' }}>{fmt(p.pv)}</td>
                        <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--borderl)', fontWeight: 'bold' }}>{fmtN(kgDia, 1)} kg</td>
                        <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--borderl)' }}>{fmtN(kgMes, 0)} kg</td>
                        <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--gold)' }}>{fmt(factMes)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, padding: '8px 10px', background: 'var(--bg)', borderRadius: 6 }}>
              La última fila "Mix equilibrado" asume un FC promedio del 47% y precio promedio de $14.500/kg. Es el escenario más realista con un mix variado de productos.
            </div>
          </div>

          {/* Estadísticas medios de pago */}
          {ventasPorMedio.length > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)', marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Medios de pago — {periodoLabel(periodo)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
                {Object.entries(mediosPago).sort((a,b) => b[1]-a[1]).map(([medio, total]) => {
                  const pct = totalVentasMedio > 0 ? (total / totalVentasMedio * 100) : 0
                  const esMP = medio === 'MercadoPago'
                  return (
                    <div key={medio} style={{ background: 'var(--bg)', borderRadius: 6, padding: '10px 12px', border: `1px solid ${esMP ? 'rgba(30,100,180,.25)' : 'var(--border)'}` }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{medio}</div>
                      <div style={{ fontSize: 16, fontWeight: 'bold', color: esMP ? '#1050a0' : 'var(--text)' }}>{fmt(total)}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{pct.toFixed(1)}% del total</div>
                      {esMP && <div style={{ fontSize: 11, color: '#aa2020', marginTop: 3 }}>Comisión: {fmt(total * MP_TASA)}</div>}
              {medio === 'Transferencia MP' && <div style={{ fontSize: 11, color: '#1a7a40', marginTop: 3 }}>Sin comisión ✓</div>}
                      {/* Barra de proporción */}
                      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 6 }}>
                        <div style={{ height: '100%', borderRadius: 2, width: pct + '%', background: esMP ? '#1050a0' : '#1a7a40' }} />
                      </div>
                    </div>
                  )
                })}
                <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '10px 12px', border: '1px solid rgba(154,122,26,.25)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Comisión MP total</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#aa2020' }}>{fmt((mediosPago['MercadoPago'] || 0) * MP_TASA)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>7.24% efectivo s/ventas MP</div>
                </div>
              </div>
            </div>
          )}

          {/* Alerta si los costos no están cargados */}
          {costos.length === 0 && (
            <div style={{ padding: '12px 16px', background: 'rgba(154,122,26,.08)', border: '1px solid rgba(154,122,26,.25)', borderRadius: 8, fontSize: 13, color: 'var(--gold)' }}>
              Para un cálculo preciso, cargá los costos reales de {periodoLabel(periodo)} en la pestaña "Cargar costos".
              <button onClick={() => setTab('costos')} style={{ marginLeft: 10, ...b('gold'), padding: '3px 10px', fontSize: 11 }}>Ir a costos →</button>
            </div>
          )}
        </div>
      )}
      {/* ══ PROYECCIÓN DE COMPRAS ══ */}
      {!loading && tab === 'compras' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}>
            Basado en las ventas del período seleccionado. Ajustá las cantidades según lo que planificás producir la próxima semana.
          </div>

          {/* Tabla de ingredientes proyectados */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)', marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14 }}>Materia prima proyectada para próxima producción</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>{['Ingrediente', 'Precio actual', 'Kg proyectados (ventas)', 'Ajuste manual', 'Kg a comprar', 'Costo estimado'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '7px 10px', fontSize: 10, color: 'var(--muted)', borderBottom: '1px solid var(--border)', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {[
                    { ing: 'Pechuga de pollo',          precio: 6700,  kgPorMillon: 8.5  },
                    { ing: 'Recortes de pechuga',       precio: 6700,  kgPorMillon: 3.0  },
                    { ing: 'Nalga (fileteada)',          precio: 24000, kgPorMillon: 1.5  },
                    { ing: 'Peceto (fileteado)',         precio: 11699, kgPorMillon: 1.0  },
                    { ing: 'Carré de cerdo',            precio: 11000, kgPorMillon: 1.8  },
                    { ing: 'Ribs de cerdo',             precio: 5300,  kgPorMillon: 4.0  },
                    { ing: 'Pan rallado',               precio: 1696,  kgPorMillon: 5.5  },
                    { ing: 'Pan rallado Crunch',        precio: 4180,  kgPorMillon: 1.5  },
                    { ing: 'Huevos frescos (u)',        precio: 196.67,kgPorMillon: 60   },
                    { ing: 'Caritas congeladas',        precio: 7444,  kgPorMillon: 3.5  },
                    { ing: 'Papas bastón congeladas',  precio: 4333,  kgPorMillon: 5.0  },
                    { ing: 'Papas Noisette congeladas', precio: 7300,  kgPorMillon: 3.0  },
                    { ing: 'Nuggets crocantes (Sadia)', precio: 9200,  kgPorMillon: 2.5  },
                    { ing: 'Film / envase unitario',    precio: 81.25, kgPorMillon: 120  },
                  ].map(row => {
                    const baseRef = ventasTotalMes > 0 ? ventasTotalMes : puntoEq
                    const kgProyectado = parseFloat((row.kgPorMillon * baseRef / 1000000).toFixed(1))
                    const ajuste = ajustesCompra[row.ing] ?? 0
                    const kgFinal = Math.max(0, parseFloat((kgProyectado + ajuste).toFixed(1)))
                    const costo = kgFinal * row.precio
                    const esProteina = ['Pechuga de pollo','Recortes de pechuga','Nalga (fileteada)','Peceto (fileteado)','Carré de cerdo','Ribs de cerdo','Caritas congeladas','Papas bastón congeladas','Papas Noisette congeladas','Nuggets crocantes (Sadia)'].includes(row.ing)
                    return (
                      <tr key={row.ing} style={{ background: esProteina ? 'rgba(154,122,26,.03)' : 'transparent' }}>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', fontWeight: esProteina ? 'bold' : 'normal' }}>
                          {esProteina && <span style={{ color: 'var(--gold)', marginRight: 6, fontSize: 10 }}>★</span>}
                          {row.ing}
                        </td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--muted)' }}>{fmt(row.precio)}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--muted)' }}>
                          {kgProyectado} {row.ing.includes('(u)') || row.ing.includes('envase') ? 'u' : 'kg'}
                          <div style={{ fontSize: 10, color: 'var(--dim)' }}>
                            {ventasTotalMes > 0 ? 'basado en ventas reales' : 'basado en punto equilibrio'}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', width: 120 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button onClick={() => setAjustesCompra(prev => ({ ...prev, [row.ing]: (prev[row.ing] ?? 0) - 1 }))}
                              style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 14 }}>−</button>
                            <input type="number" value={ajuste}
                              onChange={e => setAjustesCompra(prev => ({ ...prev, [row.ing]: parseFloat(e.target.value) || 0 }))}
                              style={{ width: 54, textAlign: 'center', fontSize: 12, padding: '3px 4px' }} />
                            <button onClick={() => setAjustesCompra(prev => ({ ...prev, [row.ing]: (prev[row.ing] ?? 0) + 1 }))}
                              style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 14 }}>+</button>
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', fontWeight: 'bold', color: kgFinal > kgProyectado ? '#1050a0' : kgFinal < kgProyectado ? '#aa2020' : 'var(--text)' }}>
                          {kgFinal} {row.ing.includes('(u)') || row.ing.includes('envase') ? 'u' : 'kg'}
                        </td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', textAlign: 'right', color: 'var(--gold)', fontWeight: 'bold' }}>
                          {fmt(costo)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ padding: '12px 10px', fontWeight: 'bold', fontSize: 15 }}>TOTAL A COMPRAR</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: 20, fontWeight: 'bold', color: 'var(--gold)' }}>
                      {fmt([
                        { ing: 'Pechuga de pollo', precio: 6700, kgPorMillon: 8.5 },
                        { ing: 'Recortes de pechuga', precio: 6700, kgPorMillon: 3.0 },
                        { ing: 'Nalga (fileteada)', precio: 24000, kgPorMillon: 1.5 },
                        { ing: 'Peceto (fileteado)', precio: 11699, kgPorMillon: 1.0 },
                        { ing: 'Carré de cerdo', precio: 11000, kgPorMillon: 1.8 },
                        { ing: 'Ribs de cerdo', precio: 5300, kgPorMillon: 4.0 },
                        { ing: 'Pan rallado', precio: 1696, kgPorMillon: 5.5 },
                        { ing: 'Pan rallado Crunch', precio: 4180, kgPorMillon: 1.5 },
                        { ing: 'Huevos frescos (u)', precio: 196.67, kgPorMillon: 60 },
                        { ing: 'Caritas congeladas', precio: 7444, kgPorMillon: 3.5 },
                        { ing: 'Papas bastón congeladas', precio: 4333, kgPorMillon: 5.0 },
                        { ing: 'Papas Noisette congeladas', precio: 7300, kgPorMillon: 3.0 },
                        { ing: 'Nuggets crocantes (Sadia)', precio: 9200, kgPorMillon: 2.5 },
                        { ing: 'Film / envase unitario', precio: 81.25, kgPorMillon: 120 },
                      ].reduce((sum, row) => {
                        const baseRef = ventasTotalMes > 0 ? ventasTotalMes : puntoEq
                        const kgProyectado = parseFloat((row.kgPorMillon * baseRef / 1000000).toFixed(1))
                        const ajuste = ajustesCompra[row.ing] ?? 0
                        const kgFinal = Math.max(0, parseFloat((kgProyectado + ajuste).toFixed(1)))
                        return sum + kgFinal * row.precio
                      }, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Panel de control de compra */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Ganancia real proyectada</div>
              <div style={{ fontSize: 24, color: enNegros ? '#1a7a40' : '#aa2020', fontWeight: 'bold' }}>{fmt(resultadoNeto)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Después de todos los costos</div>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Ventas del período</div>
              <div style={{ fontSize: 24, color: 'var(--gold)', fontWeight: 'bold' }}>{fmt(ventasTotalMes)}</div>
              <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4 }}>{ventasTotalMes > 0 ? 'datos reales' : 'sin ventas aún — usando punto equilibrio'}</div>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Base de cálculo</div>
              <div style={{ fontSize: 16, color: 'var(--text)' }}>{ventasTotalMes > 0 ? 'Ventas reales del mes' : 'Punto de equilibrio'}</div>
              <button onClick={() => setAjustesCompra({})} style={{ marginTop: 8, ...b('red'), padding: '4px 10px', fontSize: 11, width: '100%' }}>Resetear ajustes</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
