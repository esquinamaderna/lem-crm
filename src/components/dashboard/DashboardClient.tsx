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
  const [pctMP, setPctMP] = useState(30)
  const [tab, setTab] = useState<'resumen' | 'costos' | 'equilibrio'>('resumen')
  const [loading, setLoading] = useState(true)

  // Form nuevo costo
  const [fConcepto, setFConcepto] = useState('')
  const [fCategoria, setFCategoria] = useState<CatFijo>('fijo')
  const [fMonto, setFMonto] = useState('')
  const [fNotas, setFNotas] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: v }, { data: vm }] = await Promise.all([
      supabase.from('costos_fijos_mensuales').select('*').eq('periodo', periodo).order('categoria').order('concepto'),
      supabase.from('ventas').select('total, fecha').gte('fecha', periodo + '-01').lte('fecha', periodo + '-31'),
      supabase.from('ventas').select('medio_pago, total').gte('fecha', periodo + '-01').lte('fecha', periodo + '-31'),
    ])
    setCostos((c || []) as CostoFijo[])
    setVentas((v || []) as VentaMes[])
    const medios = (vm || []) as {medio_pago: string, total: number}[]
    setVentasPorMedio(medios)
    // Calcular % MP automáticamente desde ventas reales
    if (medios.length > 0) {
      const totalVtas = medios.reduce((s, v) => s + v.total, 0)
      const totalMP = medios.filter(v => v.medio_pago === 'MercadoPago').reduce((s, v) => s + v.total, 0)
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
  const costoMPReal = ventasTotalMes * (pctMP / 100) * MP_TASA
  const totalCostosReales = totalCostosCargados + costoMPReal

  // FC promedio ponderado (usamos 47% como base, ajustable)
  const FC_PROM = 0.47
  const margenBruto = ventasTotalMes * (1 - FC_PROM)
  const resultadoNeto = margenBruto - totalCostosReales
  const enNegros = resultadoNeto >= 0

  // Punto de equilibrio del mes
  const cm = 1 - FC_PROM - (pctMP / 100) * MP_TASA
  const puntoEq = cm > 0 ? totalCostosCargados / cm : 0
  const faltaParaEq = Math.max(0, puntoEq - ventasTotalMes)
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
        <div style={{ display: 'flex', gap: 6 }}>
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
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button style={tabStyle('resumen')} onClick={() => setTab('resumen')}>📊 Resumen del mes</button>
        <button style={tabStyle('costos')} onClick={() => setTab('costos')}>📋 Cargar costos</button>
        <button style={tabStyle('equilibrio')} onClick={() => setTab('equilibrio')}>⚖ Punto de equilibrio</button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>Cargando datos...</div>}

      {/* ══ RESUMEN ══ */}
      {!loading && tab === 'resumen' && (
        <div>
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
                ✓ El negocio está en positivo este mes. Resultado neto: <strong>{fmt(resultadoNeto)}</strong>
              </div>
            )}
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
            {kpi('Ventas del mes', fmt(ventasTotalMes), 'var(--gold)')}
            {kpi('Costos cargados', fmt(totalCostosReales), '#aa2020')}
            {kpi('Margen bruto', fmt(margenBruto), margenBruto > totalCostosReales ? '#1a7a40' : '#aa2020')}
            {kpi('Resultado neto', fmt(resultadoNeto), enNegros ? '#1a7a40' : '#aa2020')}
            {kpi('Punto equilibrio', fmt(puntoEq), 'var(--text)')}
            {kpi('Proyección cierre', fmt(proyeccionMes), proyeccionMes >= puntoEq ? '#1a7a40' : '#aa2020', 'basado en ritmo actual')}
          </div>

          {/* Desglose costos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
            {(['fijo', 'variable', 'operativo'] as CatFijo[]).map(cat => {
              const items = costos.filter(c => c.categoria === cat)
              const total = items.reduce((s, c) => s + c.monto, 0)
              return (
                <div key={cat} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: CAT_COLOR[cat] }}>{CAT_LABEL[cat]}</div>
                    <div style={{ fontSize: 15, fontWeight: 'bold', color: CAT_COLOR[cat] }}>{fmt(total)}</div>
                  </div>
                  {items.length === 0
                    ? <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '10px 0' }}>Sin costos cargados</div>
                    : items.map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--borderl)' }}>
                        <span style={{ color: 'var(--muted)' }}>{c.concepto}</span>
                        <span>{fmt(c.monto)}</span>
                      </div>
                    ))}
                  {cat === 'variable' && costoMPReal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--borderl)', color: 'var(--muted)' }}>
                      <span>Comisión MP ({pctMP}%)</span>
                      <span style={{ fontStyle: 'italic' }}>{fmt(costoMPReal)} (auto)</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Alertas */}
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
    </div>
  )
}
