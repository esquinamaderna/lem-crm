'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  type BoxProducto, type BoxTamano, type BoxTipo, type BoxOcasion, type Grupo,
  NAVIDENA, OCASIONES_NAVIDAD, key, pool, priced, minimum, generate, metrics, slotAllowed, cents,
  type LemProducto, lemToBox, valorSuper,
} from '@/lib/box-engine'
import seed from '@/lib/box-seed.json'

// ── Helpers de estilo (mismo lenguaje que el resto del CRM) ─────────
const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
const whole = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
const pct = (n: number) => new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 1 }).format(n)
const norm = (s: string) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const b = (v?: 'gold' | 'red' | 'green' | 'dark'): React.CSSProperties => ({
  padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif',
  border: v === 'gold' ? '1px solid var(--gold)' : v === 'red' ? '1px solid rgba(190,50,50,.3)' : v === 'green' ? '1px solid rgba(30,140,70,.3)' : v === 'dark' ? '1px solid #1a1814' : '1px solid var(--border)',
  background: v === 'gold' ? 'var(--gold)' : v === 'red' ? 'rgba(190,50,50,.08)' : v === 'green' ? 'rgba(30,140,70,.08)' : v === 'dark' ? '#1a1814' : 'var(--card)',
  color: v === 'gold' ? '#fff' : v === 'red' ? '#aa2020' : v === 'green' ? '#1a7a40' : v === 'dark' ? '#c9a227' : 'var(--text)',
})
const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }
const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }
const eyebrow: React.CSSProperties = { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }
const GROUP_COLOR: Record<string, { bg: string; fg: string; label: string }> = {
  A: { bg: '#e0eae2', fg: '#254c39', label: 'Protagonista' },
  B: { bg: '#fae9cf', fg: '#83500c', label: 'Intermedio' },
  C: { bg: '#e8edf0', fg: '#456475', label: 'Base' },
  Especial: { bg: '#efe6f7', fg: '#5d3a7a', label: 'Especial' },
}
function Tag({ g }: { g: string }) {
  const c = GROUP_COLOR[g] || GROUP_COLOR.C
  return <span style={{ background: c.bg, color: c.fg, borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700, fontFamily: 'Arial,sans-serif' }}>{g === 'Especial' ? 'E' : g}</span>
}
function Modal({ open, onClose, title, sub, children, wide }: { open: boolean; onClose: () => void; title: string; sub?: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 200, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--gold-d)', borderRadius: 12, width: '100%', maxWidth: wide ? 900 : 560, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 20px 10px', gap: 12 }}>
          <div>
            {sub && <div style={{ ...eyebrow, marginBottom: 4 }}>{sub}</div>}
            <div style={{ fontSize: 18 }}>{title}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '0 20px 20px', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}

type Tab = 'armador' | 'catalogo' | 'guardados' | 'ajustes'
interface Armado {
  id: number; nombre: string; tipo: string; ocasion: string | null; tamano: number; precio: number
  items: { id: string; nombre: string; marca: string | null; presentacion: string | null; costo: number; grupo: string; origen?: 'box' | 'lem'; producto_id?: number | null; cantidad?: number; unidad?: string }[]
  en_venta?: boolean
  valor_super?: number | null
  costo_mercaderia: number; packaging: number; comision: number; margen: number | null; notas: string | null; created_at: string
}

export function BoxesClient() {
  const [tab, setTab] = useState<Tab>('armador')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [productos, setProductos] = useState<BoxProducto[]>([])
  const [tipos, setTipos] = useState<BoxTipo[]>([])
  const [ocasiones, setOcasiones] = useState<BoxOcasion[]>([])
  const [tamanos, setTamanos] = useState<BoxTamano[]>([])
  const [packaging, setPackaging] = useState(500)
  const [comision, setComision] = useState(4)
  const [armados, setArmados] = useState<Armado[]>([])
  const [lem, setLem] = useState<LemProducto[]>([])
  const [toast, setToast] = useState('')

  function avisar(t: string) { setToast(t); setTimeout(() => setToast(''), 4000) }

  useEffect(() => { load() }, [])

  async function load() {
    setCargando(true); setError('')
    try {
      const db = supabase as any
      // Carga inicial automática del catálogo si las tablas están vacías
      const { count } = await db.from('box_productos').select('id', { count: 'exact', head: true })
      if (count === 0) await db.from('box_productos').upsert(seed.productos, { onConflict: 'id', ignoreDuplicates: true })
      const { count: ct } = await db.from('box_tipos').select('nombre', { count: 'exact', head: true })
      if (ct === 0) await db.from('box_tipos').upsert(seed.tipos, { onConflict: 'nombre', ignoreDuplicates: true })
      const { count: co } = await db.from('box_ocasiones').select('id', { count: 'exact', head: true })
      if (co === 0) await db.from('box_ocasiones').upsert(seed.ocasiones, { onConflict: 'id', ignoreDuplicates: true })

      const [p, t, o, s, a, g, l] = await Promise.all([
        db.from('box_productos').select('*').order('id'),
        db.from('box_tipos').select('*').order('orden'),
        db.from('box_ocasiones').select('*').order('orden'),
        db.from('box_tamanos').select('*').order('tamano'),
        db.from('box_ajustes').select('*').eq('id', 1).maybeSingle(),
        db.from('boxes_armados').select('*').order('created_at', { ascending: false }),
        db.from('productos').select('id,nombre,categoria,costo,precio_venta,unidad_venta,stock_kg').eq('activo', true).order('nombre'),
      ])
      if (p.error) throw p.error
      setProductos((p.data || []).map((x: any) => ({ ...x, activo: x.activo !== false, costo: x.costo === null ? null : Number(x.costo), precio_super: x.precio_super == null ? null : Number(x.precio_super) })))
      setTipos(t.data || [])
      setOcasiones(o.data || [])
      setTamanos((s.data || []).map((x: any) => ({ ...x, precio: Number(x.precio), objetivo: Number(x.objetivo) })))
      if (a.data) { setPackaging(Number(a.data.packaging)); setComision(Number(a.data.comision_pct)) }
      setArmados(g.data || [])
      setLem(l.data || [])
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar. ¿Corriste supabase/add-boxes.sql?')
    }
    setCargando(false)
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'armador', label: 'Armador' },
    { id: 'catalogo', label: `Catálogo (${productos.length})` },
    { id: 'guardados', label: `Guardados (${armados.length})` },
    { id: 'ajustes', label: 'Ajustes' },
  ]

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...eyebrow, marginBottom: 2 }}>Boxes de almacén</div>
          <div style={{ fontSize: 24 }}>Armá tu box</div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              ...b(tab === t.id ? 'dark' : undefined), textTransform: 'uppercase', letterSpacing: .8, fontSize: 11,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {cargando ? <div style={{ ...card, color: 'var(--muted)' }}>Cargando boxes…</div>
        : error ? <div style={{ ...card, color: '#aa2020' }}>{error}</div>
        : tab === 'armador' && !tamanos.length ? <div style={card}>Faltan tamaños de box. Cargalos en Ajustes.</div>
        : tab === 'armador' ? <Armador {...{ productos, lem, tipos, ocasiones, tamanos, packaging, comision, avisar }} onSaved={a => { setArmados(x => [a, ...x]); }} />
        : tab === 'catalogo' ? <Catalogo {...{ productos, setProductos, tipos, avisar }} />
        : tab === 'guardados' ? <Guardados {...{ armados, setArmados, avisar }} />
        : <Ajustes {...{ tamanos, setTamanos, packaging, setPackaging, comision, setComision, avisar }} />}

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: '#1a1814', color: '#f5f3ef', padding: '12px 20px', borderRadius: 10, zIndex: 300, fontSize: 13, boxShadow: 'var(--shadow-md)', maxWidth: 'calc(100% - 30px)' }}>{toast}</div>}

      <style>{`
        .bx-layout { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:18px; align-items:start; }
        .bx-sizes { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
        .bx-slots { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .bx-grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
        .bx-summary { position:sticky; top:70px; }
        .bx-slot:hover { border-color: var(--gold) !important; }
        .bx-pick:not(:disabled):hover { border-color: var(--gold) !important; background: var(--gold-bg) !important; }
        @media (max-width: 900px) { .bx-layout { grid-template-columns:1fr; } .bx-summary { position:static; } }
        @media (max-width: 560px) { .bx-sizes { grid-template-columns:repeat(2,1fr); } .bx-slots, .bx-grid3 { grid-template-columns:1fr; } }
      `}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ARMADOR
// ══════════════════════════════════════════════════════════════════
function Armador({ productos, lem, tipos, ocasiones, tamanos, packaging, comision, avisar, onSaved }: {
  productos: BoxProducto[]; lem: LemProducto[]; tipos: BoxTipo[]; ocasiones: BoxOcasion[]; tamanos: BoxTamano[]
  packaging: number; comision: number; avisar: (t: string) => void; onSaved: (a: Armado) => void
}) {
  const [ocasion, setOcasion] = useState('')
  const [tipo, setTipo] = useState('Despensa')
  const [tamano, setTamano] = useState(tamanos[0]?.tamano ?? 10)
  const rule = tamanos.find(t => t.tamano === tamano) || tamanos[0]
  const [items, setItems] = useState<(BoxProducto | null)[]>(rule.grupos.map(() => null))
  const [modal, setModal] = useState<'tipos' | 'ocasiones' | 'picker' | 'guardar' | null>(null)
  const [slot, setSlot] = useState(0)
  const [q, setQ] = useState('')
  const [fuente, setFuente] = useState<'box' | 'lem'>('box')
  const [lemSel, setLemSel] = useState<LemProducto | null>(null)
  const [lemCant, setLemCant] = useState('1')
  const [fNombre, setFNombre] = useState('')
  const [fNotas, setFNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  const esNavidad = OCASIONES_NAVIDAD.includes(ocasion)
  const occ = ocasiones.find(o => o.id === ocasion)
  const tipoInfo = tipos.find(t => t.nombre === tipo)
  const reset = (r = rule) => setItems(r.grupos.map(() => null))

  function elegirTipo(t: string) { setTipo(t); reset(); setModal(null) }
  function elegirTamano(n: number) { const r = tamanos.find(t => t.tamano === n)!; setTamano(n); reset(r) }
  function elegirOcasion(id: string) {
    setOcasion(id)
    if (OCASIONES_NAVIDAD.includes(id)) { setTipo(NAVIDENA); reset() }
    else if (tipo === NAVIDENA) { setTipo('Despensa'); reset() }
    setModal(null)
  }
  function modoHabitual() { setOcasion(''); if (tipo === NAVIDENA) { setTipo('Despensa'); reset() } }

  const m = metrics(items, rule, packaging, comision)
  const budget = rule.objetivo
  const min = useMemo(() => minimum(productos, tipo, rule.grupos), [productos, tipo, rule])
  const chosen = items.filter(Boolean).length
  const counts = Object.fromEntries((['A', 'B', 'C'] as Grupo[]).map(g => [g, new Set(pool(productos, tipo, g).map(key)).size]))
  const missing = (['A', 'B', 'C'] as Grupo[]).map(g => ({ g, n: Math.max(0, rule.grupos.filter(x => x === g).length - counts[g]) })).filter(x => x.n)
  const headsReady = rule.grupos.every((g, i) => g !== 'A' || !!items[i])
  const over = m.cost > budget
  const estimados = items.filter(p => p && p.precio_tipo !== 'manual').length
  const vs = valorSuper(items, rule.precio)
  const nA = rule.grupos.filter(x => x === 'A').length

  function azar() {
    const r = generate(productos, tipo, rule, budget)
    if (!r.ok) { avisar('Faltan productos compatibles con costo.'); return }
    setItems(r.items)
    avisar(r.over ? 'Se armó la combinación más económica. Revisá el exceso de costo.' : 'Box armado. Podés cambiar cualquier producto.')
  }

  function abrirPicker(i: number) { setSlot(i); setQ(''); setLemSel(null); setModal('picker') }
  function elegirLem(p: LemProducto) { setLemSel(p); setLemCant((p.unidad_venta || 'kg') === 'kg' ? '0.5' : '1') }
  function confirmarLem() {
    const c = Number(lemCant)
    if (!lemSel || !(c > 0)) { avisar('Ingresá una cantidad válida.'); return }
    pick(lemToBox(lemSel, c, rule.grupos[slot], tipo)); setLemSel(null)
  }
  function pick(p: BoxProducto) { setItems(prev => prev.map((x, i) => i === slot ? p : x)); setModal(null) }

  const pickerList = useMemo(() => {
    if (modal !== 'picker') return []
    const g = rule.grupos[slot], qq = norm(q)
    return productos
      .filter(p => p.activo !== false && p.tipos.includes(tipo) && p.grupo === g && slotAllowed(tipo, p, slot) && norm([p.nombre, p.marca, p.presentacion].join(' ')).includes(qq))
      .sort((a, c) => (+!priced(a)) - (+!priced(c)) || (a.costo ?? 0) - (c.costo ?? 0))
  }, [modal, slot, q, productos, tipo, rule])
  const usedKeys = new Set(items.filter((p, i) => p && i !== slot).map(p => key(p!)))
  const lemList = useMemo(() => {
    if (modal !== 'picker' || fuente !== 'lem') return []
    const qq = norm(q)
    return lem.filter(p => norm([p.nombre, p.categoria].join(' ')).includes(qq)).slice(0, 120)
  }, [modal, fuente, q, lem])

  async function guardar() {
    if (!m.complete) return
    setGuardando(true)
    const row = {
      nombre: fNombre.trim() || (occ ? `Caja ${occ.nombre}` : `Box ${tipo}`) + ` ${whole(rule.precio)}`,
      tipo, ocasion: ocasion || null, tamano: rule.tamano, precio: rule.precio,
      items: items.map(p => ({ id: p!.id, nombre: p!.nombre, marca: p!.marca, presentacion: p!.presentacion, costo: p!.costo, grupo: p!.grupo, precio_super: p!.precio_super ?? null,
        origen: p!.lem ? 'lem' : 'box', producto_id: p!.lem?.producto_id ?? null, cantidad: p!.lem?.cantidad ?? 1, unidad: p!.lem?.unidad ?? 'u' })),
      costo_mercaderia: m.cost, valor_super: vs.faltan === 0 && vs.total > 0 ? vs.total : null, packaging, comision: m.fee, margen: m.margin, notas: fNotas.trim() || null,
    }
    const { data, error } = await (supabase as any).from('boxes_armados').insert(row).select().single()
    setGuardando(false)
    if (error) { avisar('Error al guardar: ' + error.message); return }
    onSaved(data); setModal(null); setFNombre(''); setFNotas('')
    avisar('Box guardado.')
  }

  const familias = Array.from(new Set(tipos.map(t => t.familia)))

  return (
    <div className="bx-layout">
      <div>
        <section style={{ ...card, padding: 20 }}>
          {/* Modo */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={modoHabitual} style={{ ...b(!ocasion ? 'dark' : undefined), flex: 1 }}>Box habitual</button>
            <button onClick={() => setModal('ocasiones')} style={{ ...b(ocasion ? 'dark' : undefined), flex: 1 }}>Caja de ocasión</button>
          </div>
          {occ && (
            <div style={{ background: 'var(--gold-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <button onClick={() => setModal('ocasiones')} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'Georgia,serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><span style={{ fontSize: 16, color: 'var(--text)' }}>{occ.nombre}</span><br /><span style={{ fontSize: 12, color: 'var(--gold)' }}>{occ.fecha}</span></span>
                <span style={{ color: 'var(--muted)' }}>⌄</span>
              </button>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                {esNavidad ? 'Selección navideña exclusiva: un pan dulce obligatorio, dulces variados y sidra con alcohol en Box20/25.' : 'Elegí el tipo de productos para esta celebración.'}
              </div>
            </div>
          )}

          {/* 1. Tipo */}
          <div style={lbl}>1 · ¿Qué tipo de box?</div>
          <button disabled={esNavidad} onClick={() => setModal('tipos')} style={{ width: '100%', textAlign: 'left', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', cursor: esNavidad ? 'not-allowed' : 'pointer', fontFamily: 'Georgia,serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <span style={{ fontSize: 18, color: 'var(--text)' }}>{tipo === NAVIDENA ? 'Caja navideña' : 'Box ' + tipo}</span><br />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{tipoInfo?.descripcion}</span>
            </span>
            {!esNavidad && <span style={{ color: 'var(--muted)' }}>⌄</span>}
          </button>

          {/* 2. Tamaño */}
          <div style={{ ...lbl, marginTop: 18 }}>2 · Tamaño</div>
          <div className="bx-sizes">
            {tamanos.map(t => {
              const on = t.tamano === tamano
              return (
                <button key={t.tamano} onClick={() => elegirTamano(t.tamano)} style={{
                  padding: '10px 6px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Georgia,serif', textAlign: 'center',
                  border: on ? '2px solid var(--gold)' : '1px solid var(--border)', background: on ? 'var(--gold-bg)' : 'var(--card)',
                }}>
                  <div style={{ fontSize: 18, color: 'var(--text)' }}>{whole(t.precio)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.grupos.length} productos</div>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, flexWrap: 'wrap' }}>
              {(['A', 'B', 'C'] as Grupo[]).filter(g => rule.grupos.includes(g)).map((g, i) => (
                <span key={g} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{i > 0 && <span style={{ color: 'var(--muted)' }}>+</span>}<span>{rule.grupos.filter(x => x === g).length}</span><Tag g={g} /></span>
              ))}
            </div>
            <button onClick={azar} disabled={!Number.isFinite(min)} style={{ ...b('gold'), padding: '10px 18px', fontSize: 13 }}>🎲 Armalo al azar</button>
          </div>

          {(missing.length > 0 || !Number.isFinite(min) || min > cents(budget)) && (
            <div style={{ border: '1px solid #ead4ac', background: '#fff8e9', borderRadius: 8, padding: '10px 14px', fontSize: 12, marginTop: 12, color: '#754917' }}>
              {missing.length
                ? `El catálogo necesita ${missing.map(x => `${x.n} producto${x.n > 1 ? 's' : ''} ${x.g}`).join(' y ')} distintos con costo para este tamaño. Elegí otro tamaño o tipo, o sumá productos en Catálogo.`
                : !Number.isFinite(min) ? 'No hay suficientes productos distintos para cubrir A/B/C sin repetir.'
                : `El costo mínimo posible es ${money(min / 100)}. Supera el objetivo por ${money(min / 100 - budget)}; el azar elegirá la combinación más económica.`}
            </div>
          )}
        </section>

        {/* Slots */}
        <section style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 16 }}>Tu selección <span style={{ color: 'var(--muted)', fontSize: 13 }}>{chosen} / {rule.grupos.length}</span></div>
            <button onClick={() => reset()} disabled={!chosen} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: chosen ? 'pointer' : 'not-allowed', fontFamily: 'Georgia,serif', fontSize: 12, textDecoration: 'underline' }}>Vaciar box</button>
          </div>
          <div className="bx-slots">
            {rule.grupos.map((g, i) => {
              const p = items[i]
              const label = tipo === NAVIDENA && i === 0 ? 'Pan dulce obligatorio' : g === 'A' ? `Protagonista ${i + 1}` : `Producto ${i + 1}`
              const locked = g !== 'A' && !headsReady
              if (!p) {
                const disp = new Set(pool(productos, tipo, g, items.filter(Boolean) as BoxProducto[]).filter(x => slotAllowed(tipo, x, i)).map(key)).size
                return (
                  <button key={i} className="bx-slot" disabled={locked} onClick={() => abrirPicker(i)} style={{
                    display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', padding: 14, borderRadius: 10, minHeight: 104,
                    border: '1px dashed #bdb5a8', background: 'transparent', cursor: locked ? 'not-allowed' : 'pointer', fontFamily: 'Georgia,serif', opacity: locked ? .55 : 1,
                  }}>
                    <span style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', display: 'grid', placeItems: 'center', fontSize: 22, color: 'var(--muted)', flex: 'none' }}>{locked ? '·' : '+'}</span>
                    <span>
                      <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}><Tag g={g} />{label}</span>
                      <span style={{ fontSize: 14, color: 'var(--text)' }}>{locked ? 'Primero elegí los protagonistas' : 'Elegir producto'}</span><br />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{disp} productos distintos con costo</span>
                    </span>
                  </button>
                )
              }
              return (
                <div key={i} className="bx-slot" style={{ ...card, padding: 14, position: 'relative', minHeight: 104 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}><Tag g={g} />{label}</div>
                  <div style={{ fontSize: 15, paddingRight: 22 }}>{p.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 8px' }}>{p.marca} · {p.presentacion}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: 'var(--gold)' }}>{money(p.costo || 0)}{p.precio_super ? <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>súper {whole(p.precio_super)}</span> : null}</span>
                    <button onClick={() => abrirPicker(i)} style={{ background: 'none', border: 'none', textDecoration: 'underline', fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia,serif', color: 'var(--text)' }}>Cambiar</button>
                  </div>
                  <button onClick={() => setItems(prev => prev.map((x, j) => j === i ? null : x))} aria-label={`Quitar ${p.nombre}`} style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', fontSize: 18, color: 'var(--muted)', cursor: 'pointer' }}>×</button>
                </div>
              )
            })}
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>Un solo producto de cada clase, sin importar marca, presentación o grupo. Los importes de referencia se reemplazan por tu costo real en Catálogo.</p>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--muted)', marginTop: 8, flexWrap: 'wrap' }}>
            {(['A', 'B', 'C'] as const).map(g => <span key={g} style={{ display: 'flex', gap: 5, alignItems: 'center' }}><Tag g={g} />{GROUP_COLOR[g].label}</span>)}
          </div>
        </section>
      </div>

      {/* Resumen */}
      <aside className="bx-summary" style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ background: '#1a1814', color: '#f5f3ef', padding: 20, borderBottom: '2px solid #9a7a1a' }}>
          <div style={{ fontSize: 11, color: '#9e9890', letterSpacing: 1, textTransform: 'uppercase' }}>Precio de venta</div>
          <div style={{ fontSize: 38, color: '#c9a227', lineHeight: 1.2, margin: '4px 0 8px' }}>{whole(rule.precio)}</div>
          <div style={{ fontSize: 15 }}>{occ ? 'Caja ' + occ.nombre : 'Box ' + tipo}</div>
          <div style={{ fontSize: 12, color: '#9e9890' }}>{occ ? tipo + ' · ' : ''}{rule.grupos.length} productos · {nA} protagonista{nA > 1 ? 's' : ''}</div>
        </div>
        <div style={{ padding: 18 }}>
          <span style={{
            fontSize: 12, padding: '5px 10px', borderRadius: 6, display: 'inline-block',
            background: !m.complete ? '#fff1d7' : over ? '#fce8e4' : 'rgba(30,140,70,.1)',
            color: !m.complete ? '#8b5510' : over ? '#a32e27' : '#1a7a40',
          }}>{!m.complete ? `Faltan ${rule.grupos.length - chosen} productos` : over ? 'Supera el objetivo' : 'Box completo'}</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 16, fontSize: 13 }}>
            <span>Mercadería{m.complete ? '' : ' parcial'}</span><span style={{ fontSize: 19 }}>{money(m.cost)}</span>
          </div>
          <div style={{ height: 6, background: 'var(--borderl)', borderRadius: 6, margin: '8px 0' }}>
            <div style={{ height: '100%', borderRadius: 6, transition: 'width .2s', width: `${Math.min(100, budget > 0 ? m.cost / budget * 100 : 0)}%`, background: over ? '#a32e27' : '#548567' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Objetivo: {money(budget)} · {over ? 'Exceso' : 'Disponible'}: {money(Math.abs(budget - m.cost))}</div>
          <div style={{ margin: '16px 0', fontSize: 13, display: 'grid', gap: 7 }}>
            {[
              ['Packaging', money(packaging)],
              [`Comisión (${comision.toLocaleString('es-AR')}%)`, money(m.fee)],
              ['Costo variable total', m.complete ? money(m.total) : '—'],
              ['Contribución', m.complete ? money(m.profit) : '—'],
            ].map(([k, v]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>{k}</span><span>{v}</span></div>)}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>Margen</span>
            <span style={{ fontSize: 26, color: m.complete && m.margin < .3 ? '#a32e27' : 'var(--text)' }}>{m.complete ? pct(m.margin) : '—'}</span>
          </div>
          {chosen > 0 && (
            <div style={{ marginTop: 14, borderRadius: 8, padding: 12, background: vs.total > 0 && vs.ahorro < 0 ? '#fce8e4' : 'rgba(30,140,70,.08)', border: '1px solid ' + (vs.total > 0 && vs.ahorro < 0 ? 'rgba(163,46,39,.25)' : 'rgba(30,140,70,.2)') }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Percepción del cliente</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--muted)' }}>En el súper pagaría</span><span>{vs.total > 0 ? money(vs.total) : '—'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}><span style={{ color: 'var(--muted)' }}>Precio del box</span><span>{money(rule.precio)}</span></div>
              {vs.total > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,.08)' }}>
                  <span style={{ fontSize: 13 }}>{vs.ahorro >= 0 ? 'Ahorra' : 'Paga de más'}</span>
                  <span style={{ fontSize: 20, color: vs.ahorro >= 0 ? '#1a7a40' : '#a32e27' }}>{money(Math.abs(vs.ahorro))} <span style={{ fontSize: 13 }}>({pct(Math.abs(vs.ahorroPct))})</span></span>
                </div>
              )}
              {vs.faltan > 0 && <div style={{ fontSize: 11, color: '#83500c', marginTop: 6 }}>{vs.faltan} producto{vs.faltan > 1 ? 's' : ''} sin precio de súper: el valor está incompleto.</div>}
            </div>
          )}
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, lineHeight: 1.5 }}>
            {m.complete ? 'Después de mercadería, packaging y comisión. No incluye costos fijos.' : 'Completá el box para ver costo total y margen.'}
            {estimados > 0 && ` Incluye ${estimados} importe${estimados > 1 ? 's' : ''} de referencia sin validar.`}
          </p>
          <button disabled={!m.complete} onClick={() => setModal('guardar')} style={{ ...b('gold'), width: '100%', marginTop: 12, padding: '10px', opacity: m.complete ? 1 : .5, cursor: m.complete ? 'pointer' : 'not-allowed' }}>Guardar box</button>
        </div>
      </aside>

      {/* Modal tipos */}
      <Modal open={modal === 'tipos'} onClose={() => setModal(null)} title="¿Qué necesitás resolver?" sub={`${tipos.length} tipos de box`} wide>
        {familias.map(f => (
          <div key={f}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--muted)', margin: '14px 0 8px' }}>{f}</div>
            <div className="bx-grid3">
              {tipos.filter(t => t.familia === f && (t.nombre !== NAVIDENA || esNavidad)).map(t => (
                <button key={t.nombre} className="bx-pick" onClick={() => elegirTipo(t.nombre)} style={{
                  textAlign: 'left', padding: 12, borderRadius: 8, cursor: 'pointer', fontFamily: 'Georgia,serif',
                  border: t.nombre === tipo ? '1px solid var(--gold)' : '1px solid var(--border)', background: t.nombre === tipo ? 'var(--gold-bg)' : 'var(--card2)',
                }}>
                  <div style={{ fontSize: 14, color: 'var(--text)' }}>{t.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.descripcion}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </Modal>

      {/* Modal ocasiones */}
      <Modal open={modal === 'ocasiones'} onClose={() => setModal(null)} title="Elegí la ocasión" sub="Argentina · Calendario" wide>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Celebraciones y fechas de regalo. Las fechas móviles corresponden a 2026.</p>
        <div className="bx-grid3">
          {ocasiones.map(o => (
            <div key={o.id} style={{ border: o.id === ocasion ? '1px solid var(--gold)' : '1px solid var(--border)', background: o.id === ocasion ? 'var(--gold-bg)' : 'var(--card)', borderRadius: 8, padding: 12 }}>
              <button onClick={() => elegirOcasion(o.id)} style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'Georgia,serif', width: '100%', padding: 0 }}>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>{o.nombre}</div>
                <div style={{ fontSize: 12, color: 'var(--gold)' }}>{o.fecha}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{o.regla}</div>
              </button>
              {o.fuente && <a href={o.fuente} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--muted)' }}>Fuente de la fecha</a>}
            </div>
          ))}
        </div>
      </Modal>

      {/* Modal picker */}
      <Modal open={modal === 'picker'} onClose={() => setModal(null)} title="Elegí un producto" sub={`Box ${tipo} · Grupo ${rule.grupos[slot]}`} wide>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button onClick={() => { setFuente('box'); setLemSel(null) }} style={{ ...b(fuente === 'box' ? 'dark' : undefined), flex: 1 }}>Almacén box ({productos.length})</button>
          {!(tipo === NAVIDENA && slot === 0) && <button onClick={() => setFuente('lem')} style={{ ...b(fuente === 'lem' ? 'dark' : undefined), flex: 1 }}>Productos LEM ({lem.length})</button>}
        </div>
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={fuente === 'box' ? 'Buscá por producto, marca o presentación…' : 'Buscá por producto o categoría del CRM…'} style={{ marginBottom: 6 }} />
        {fuente === 'lem' && !(tipo === NAVIDENA && slot === 0) ? (<>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>Productos cargados en el CRM. Entran en cualquier lugar del box; el costo se calcula por la cantidad que pongas y al vender el box se descuenta del stock.</div>
          {lemSel && (
            <div style={{ border: '1px solid var(--gold)', background: 'var(--gold-bg)', borderRadius: 8, padding: 12, marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <div style={{ fontSize: 15 }}>{lemSel.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{lemSel.categoria} · costo {money(Number(lemSel.costo) || 0)}/{lemSel.unidad_venta || 'kg'} · stock {Number(lemSel.stock_kg || 0).toLocaleString('es-AR')} {lemSel.unidad_venta || 'kg'}</div>
              </div>
              <div style={{ width: 120 }}>
                <label style={lbl}>Cantidad ({lemSel.unidad_venta || 'kg'})</label>
                <input type="number" min={0} step={(lemSel.unidad_venta || 'kg') === 'kg' ? 0.05 : 1} value={lemCant} onChange={e => setLemCant(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') confirmarLem() }} />
              </div>
              <div style={{ fontSize: 14, minWidth: 90 }}>{money((Number(lemSel.costo) || 0) * (Number(lemCant) || 0))}</div>
              <button onClick={confirmarLem} style={b('gold')}>Sumar al box</button>
            </div>
          )}
          <div className="bx-slots">
            {lemList.map(p => {
              const dup = usedKeys.has('lem:' + p.id)
              const u = p.unidad_venta || 'kg'
              return (
                <button key={p.id} className="bx-pick" disabled={dup} onClick={() => elegirLem(p)} style={{
                  textAlign: 'left', padding: 12, borderRadius: 8, border: lemSel?.id === p.id ? '1px solid var(--gold)' : '1px solid var(--border)', background: 'var(--card)',
                  cursor: dup ? 'not-allowed' : 'pointer', opacity: dup ? .5 : 1, fontFamily: 'Georgia,serif', display: 'flex', flexDirection: 'column', gap: 3, minHeight: 80,
                }}>
                  <span style={{ fontSize: 14, color: 'var(--text)' }}>{p.nombre}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.categoria} · stock {Number(p.stock_kg || 0).toLocaleString('es-AR')} {u}</span>
                  <span style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: 'var(--text)' }}>
                    {dup ? 'Ya está en tu box' : `Costo ${money(Number(p.costo) || 0)}/${u}`}
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>PV {whole(Number(p.precio_venta) || 0)}</span>
                  </span>
                </button>
              )
            })}
            {!lemList.length && <p style={{ color: 'var(--muted)', gridColumn: '1/-1', textAlign: 'center', padding: 24 }}>No hay productos del CRM para esta búsqueda.</p>}
          </div>
        </>) : (<>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
          {pickerList.filter(p => priced(p) && !usedKeys.has(key(p))).length} variantes disponibles · {pickerList.filter(p => !priced(p)).length} sin costo
        </div>
        <div className="bx-slots">
          {pickerList.map(p => {
            const dup = usedKeys.has(key(p)), dis = dup || !priced(p)
            return (
              <button key={p.id} className="bx-pick" disabled={dis} onClick={() => pick(p)} style={{
                textAlign: 'left', padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)',
                cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? .5 : 1, fontFamily: 'Georgia,serif', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 100,
              }}>
                <span style={{ fontSize: 15, color: 'var(--text)' }}>{p.nombre}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.marca} · {p.presentacion}</span>
                <span style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, color: 'var(--text)' }}>
                  {dup ? 'Ya hay este producto en tu box' : priced(p) ? money(p.costo!) : 'Sin costo cargado'}
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>{p.estado}</span>
                </span>
              </button>
            )
          })}
          {!pickerList.length && <p style={{ color: 'var(--muted)', gridColumn: '1/-1', textAlign: 'center', padding: 24 }}>No hay productos para esta búsqueda.</p>}
        </div>
        </>)}
      </Modal>

      {/* Modal guardar */}
      <Modal open={modal === 'guardar'} onClose={() => setModal(null)} title="Guardar box" sub={`${whole(rule.precio)} · margen ${pct(m.margin)}`}>
        <label style={lbl}>Nombre</label>
        <input value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder={(occ ? `Caja ${occ.nombre}` : `Box ${tipo}`) + ` ${whole(rule.precio)}`} style={{ marginBottom: 12 }} />
        <label style={lbl}>Notas (opcional)</label>
        <textarea value={fNotas} onChange={e => setFNotas(e.target.value)} rows={3} placeholder="Cliente, fecha de entrega, observaciones…" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={() => setModal(null)} style={b()}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={b('gold')}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// CATÁLOGO
// ══════════════════════════════════════════════════════════════════
const SUPER_TIPO: Record<string, { l: string; c: string }> = {
  exacto: { l: 'Carrefour · mismo producto', c: '#1a7a40' },
  equiv: { l: 'Carrefour · equivalente', c: '#456475' },
  marca: { l: 'Carrefour · otra medida', c: '#83500c' },
  aprox: { l: 'Carrefour · aproximado', c: '#83500c' },
  manual: { l: 'Cargado a mano', c: '#1a7a40' },
}
const superLink = (n: string) => { const t = encodeURIComponent(n.replace(/\s*\(x\d+\)$/, '').replace(/%/g, '')); return `https://www.carrefour.com.ar/${t}?_q=${t}&map=ft` }
const EMPTY: BoxProducto = { id: '', nombre: '', marca: '', presentacion: '', costo: null, grupo: 'B', familia: '', tipos: [], estado: 'Ingresado manualmente', precio_tipo: 'manual', precio_nota: 'Costo cargado por el usuario.', precio_fecha: '', precio_fuente: null, activo: true }

function Catalogo({ productos, setProductos, tipos, avisar }: {
  productos: BoxProducto[]; setProductos: React.Dispatch<React.SetStateAction<BoxProducto[]>>; tipos: BoxTipo[]; avisar: (t: string) => void
}) {
  const [q, setQ] = useState('')
  const [fGrupo, setFGrupo] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fEstado, setFEstado] = useState<'' | 'validar' | 'manual'>('')
  const [edit, setEdit] = useState<BoxProducto | null>(null)
  const [esNuevo, setEsNuevo] = useState(false)

  const lista = productos.filter(p =>
    norm([p.id, p.nombre, p.marca, p.presentacion].join(' ')).includes(norm(q)) &&
    (!fGrupo || p.grupo === fGrupo) && (!fTipo || p.tipos.includes(fTipo)) &&
    (!fEstado || (fEstado === 'manual' ? p.precio_tipo === 'manual' : p.precio_tipo !== 'manual')))
  const aValidar = productos.filter(p => p.precio_tipo !== 'manual').length

  async function guardarCosto(p: BoxProducto, valor: string) {
    const costo = valor === '' ? null : Number(valor)
    if (costo !== null && (!Number.isFinite(costo) || costo < 0)) return
    if (costo === p.costo) return
    const patch = { costo, estado: costo === null ? 'A cotizar' : 'Ingresado manualmente', precio_tipo: 'manual', precio_fuente: null, precio_fecha: new Date().toLocaleDateString('es-AR'), precio_nota: 'Costo cargado por el usuario.', updated_at: new Date().toISOString() }
    const { error } = await (supabase as any).from('box_productos').update(patch).eq('id', p.id)
    if (error) { avisar('Error: ' + error.message); return }
    setProductos(prev => prev.map(x => x.id === p.id ? { ...x, ...patch } : x))
    avisar(`Costo de ${p.nombre} ${p.marca || ''} actualizado.`)
  }

  async function guardarSuper(p: BoxProducto, valor: string) {
    const v = valor === '' ? null : Number(valor)
    if (v !== null && (!Number.isFinite(v) || v < 0)) return
    if (v === (p.precio_super ?? null)) return
    const patch = { precio_super: v, super_tipo: v === null ? null : 'manual', super_nombre: v === null ? null : 'Cargado a mano', super_url: null, super_fecha: new Date().toLocaleDateString('es-AR') }
    const { error } = await (supabase as any).from('box_productos').update(patch).eq('id', p.id)
    if (error) { avisar('Error: ' + error.message); return }
    setProductos(prev => prev.map(x => x.id === p.id ? { ...x, ...patch } : x))
    avisar(`Precio súper de ${p.nombre} actualizado.`)
  }

  async function toggleActivo(p: BoxProducto) {
    const { error } = await (supabase as any).from('box_productos').update({ activo: !p.activo }).eq('id', p.id)
    if (!error) setProductos(prev => prev.map(x => x.id === p.id ? { ...x, activo: !p.activo } : x))
  }

  function nuevo() {
    const max = Math.max(0, ...productos.filter(p => /^M\d+$/.test(p.id)).map(p => +p.id.slice(1)))
    setEdit({ ...EMPTY, id: 'M' + String(max + 1).padStart(3, '0'), precio_fecha: new Date().toLocaleDateString('es-AR') })
    setEsNuevo(true)
  }

  async function guardarEdit() {
    if (!edit) return
    if (!edit.nombre.trim()) { avisar('Ingresá un nombre'); return }
    if (!edit.tipos.length) { avisar('Elegí al menos un tipo de box'); return }
    const row = { ...edit, familia: edit.familia?.trim() || null, costo: edit.costo === null || (edit.costo as any) === '' ? null : Number(edit.costo), updated_at: new Date().toISOString() }
    const db = (supabase as any).from('box_productos')
    const { error } = esNuevo ? await db.insert(row) : await db.update(row).eq('id', edit.id)
    if (error) { avisar('Error: ' + error.message); return }
    setProductos(prev => esNuevo ? [...prev, row] : prev.map(x => x.id === row.id ? row : x))
    setEdit(null); avisar(esNuevo ? 'Producto agregado.' : 'Producto actualizado.')
  }

  return (
    <div>
      <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar producto, marca, código…" style={{ flex: '1 1 220px', width: 'auto' }} />
        <select value={fGrupo} onChange={e => setFGrupo(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Todos los grupos</option>{['A', 'B', 'C', 'Especial'].map(g => <option key={g}>{g}</option>)}
        </select>
        <select value={fTipo} onChange={e => setFTipo(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Todos los tipos</option>{tipos.map(t => <option key={t.nombre}>{t.nombre}</option>)}
        </select>
        <select value={fEstado} onChange={e => setFEstado(e.target.value as any)} style={{ width: 'auto' }}>
          <option value="">Todos los costos</option><option value="validar">A validar ({aValidar})</option><option value="manual">Costo propio</option>
        </select>
        <button onClick={nuevo} style={b('gold')}>+ Producto</button>
      </div>
      <p style={{ fontSize: 12, color: '#83500c', margin: '0 2px 12px' }}>
        {aValidar} productos tienen importes de referencia (Excel original, precios minoristas publicados o estimados). Cargá tu costo de compra real en la columna Costo: se guarda al salir del campo.
      </p>
      <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 920 }}>
          <thead><tr>
            {['Producto', 'Grupo', 'Tipos', 'Origen del costo', 'Costo', 'Precio súper', ''].map(h => <th key={h} style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', padding: '10px', borderBottom: '1px solid var(--border)' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {lista.map(p => (
              <tr key={p.id} style={{ opacity: p.activo ? 1 : .45 }}>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}>
                  <div>{p.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.marca} · {p.presentacion} · <span style={{ fontFamily: 'monospace' }}>{p.id}</span></div>
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)' }}><Tag g={p.grupo} /></td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', fontSize: 11, color: 'var(--muted)', maxWidth: 220 }}>{p.tipos.join(', ')}</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', fontSize: 11, maxWidth: 240 }}>
                  <span style={{ color: p.precio_tipo === 'manual' ? '#1a7a40' : '#83500c' }}>{p.estado}</span>
                  <div style={{ color: 'var(--muted)' }}>{p.precio_fecha}{p.precio_fuente && <> · <a href={p.precio_fuente} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)' }}>ver fuente</a></>}</div>
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', width: 130 }}>
                  <input key={p.id + ':' + p.costo} type="number" min={0} step="0.01" defaultValue={p.costo ?? ''} placeholder="Sin costo"
                    onBlur={e => guardarCosto(p, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    style={{ padding: '6px 8px', fontSize: 13 }} />
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', width: 170 }}>
                  <input key={p.id + ':s:' + p.precio_super} type="number" min={0} step="0.01" defaultValue={p.precio_super ?? ''} placeholder="Sin ref."
                    onBlur={e => guardarSuper(p, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    style={{ padding: '6px 8px', fontSize: 13 }} />
                  {p.precio_super ? (
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }} title={p.super_nombre || ''}>
                      <span style={{ color: SUPER_TIPO[p.super_tipo || '']?.c || 'var(--muted)' }}>{SUPER_TIPO[p.super_tipo || '']?.l || p.super_tipo}</span>
                      {p.costo ? <> · margen {pct(1 - Number(p.costo) / Number(p.precio_super))}</> : null}
                      {p.super_nombre && p.super_tipo !== 'manual' && <> · <a href={superLink(p.super_nombre)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)' }}>ver</a></>}
                    </div>
                  ) : null}
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', whiteSpace: 'nowrap' }}>
                  <button onClick={() => { setEdit({ ...p }); setEsNuevo(false) }} style={{ ...b(), padding: '4px 9px', fontSize: 11 }}>Editar</button>{' '}
                  <button onClick={() => toggleActivo(p)} style={{ ...b(p.activo ? undefined : 'green'), padding: '4px 9px', fontSize: 11 }}>{p.activo ? 'Pausar' : 'Activar'}</button>
                </td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No se encontraron productos.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={esNuevo ? 'Nuevo producto' : 'Editar producto'} sub={edit?.id}>
        {edit && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div><label style={lbl}>Producto</label><input value={edit.nombre} onChange={e => setEdit({ ...edit, nombre: e.target.value })} placeholder="Ej: Yerba" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={lbl}>Marca</label><input value={edit.marca || ''} onChange={e => setEdit({ ...edit, marca: e.target.value })} /></div>
              <div><label style={lbl}>Presentación</label><input value={edit.presentacion || ''} onChange={e => setEdit({ ...edit, presentacion: e.target.value })} placeholder="1 kg" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div><label style={lbl}>Grupo</label>
                <select value={edit.grupo} onChange={e => setEdit({ ...edit, grupo: e.target.value as Grupo })}>{['A', 'B', 'C', 'Especial'].map(g => <option key={g}>{g}</option>)}</select></div>
              <div><label style={lbl}>Costo ($)</label><input type="number" min={0} step="0.01" value={edit.costo ?? ''} onChange={e => setEdit({ ...edit, costo: e.target.value === '' ? null : Number(e.target.value) })} /></div>
              <div><label style={lbl}>Familia (anti-repetido)</label><input value={edit.familia || ''} onChange={e => setEdit({ ...edit, familia: e.target.value })} placeholder="auto" /></div>
            </div>
            <div>
              <label style={lbl}>Tipos de box donde entra</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tipos.map(t => {
                  const on = edit.tipos.includes(t.nombre)
                  return <button key={t.nombre} type="button" onClick={() => setEdit({ ...edit, tipos: on ? edit.tipos.filter(x => x !== t.nombre) : [...edit.tipos, t.nombre] })}
                    style={{ ...b(on ? 'dark' : undefined), padding: '5px 10px', fontSize: 11 }}>{t.nombre}</button>
                })}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Grupo A = protagonista · B = intermedio · C = base. La familia evita que entren dos del mismo producto (por ej. dos aceites); si la dejás vacía se deduce del nombre.</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <button onClick={() => setEdit(null)} style={b()}>Cancelar</button>
              <button onClick={guardarEdit} style={b('gold')}>Guardar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// GUARDADOS
// ══════════════════════════════════════════════════════════════════
function Guardados({ armados, setArmados, avisar }: { armados: Armado[]; setArmados: React.Dispatch<React.SetStateAction<Armado[]>>; avisar: (t: string) => void }) {
  const [abierto, setAbierto] = useState<number | null>(null)

  async function borrar(a: Armado) {
    if (!confirm(`¿Eliminar "${a.nombre}"?`)) return
    const { error } = await (supabase as any).from('boxes_armados').delete().eq('id', a.id)
    if (error) { avisar('Error: ' + error.message); return }
    setArmados(prev => prev.filter(x => x.id !== a.id))
  }

  async function toggleVenta(a: Armado) {
    const v = a.en_venta === false
    const { error } = await (supabase as any).from('boxes_armados').update({ en_venta: v }).eq('id', a.id)
    if (error) { avisar('Error: ' + error.message); return }
    setArmados(prev => prev.map(x => x.id === a.id ? { ...x, en_venta: v } : x))
    avisar(v ? 'El box ya aparece en Venta.' : 'Box pausado: no aparece en Venta.')
  }

  function copiar(a: Armado) {
    const txt = `${a.nombre} — ${whole(a.precio)}\n` + a.items.map(i => `• ${i.nombre} ${i.marca || ''} ${i.presentacion || ''}`.replace(/\s+/g, ' ').trim()).join('\n')
    navigator.clipboard?.writeText(txt).then(() => avisar('Lista copiada para WhatsApp.'))
  }

  if (!armados.length) return <div style={{ ...card, color: 'var(--muted)', textAlign: 'center', padding: 32 }}>Todavía no guardaste boxes. Armá uno y tocá “Guardar box”.</div>

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {armados.map(a => {
        const margen = a.margen === null ? null : Number(a.margen)
        return (
          <div key={a.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => setAbierto(abierto === a.id ? null : a.id)} style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'Georgia,serif', padding: 0 }}>
                <div style={{ fontSize: 15, color: 'var(--text)' }}>{a.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.tipo} · {a.items.length} productos · {new Date(a.created_at).toLocaleDateString('es-AR')}</div>
              </button>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
                <span><span style={{ color: 'var(--muted)', fontSize: 11 }}>Venta </span>{whole(Number(a.precio))}</span>
                <span><span style={{ color: 'var(--muted)', fontSize: 11 }}>Mercadería </span>{whole(Number(a.costo_mercaderia))}</span>
                {a.valor_super ? <span title="Lo que pagaría en el súper"><span style={{ color: 'var(--muted)', fontSize: 11 }}>Súper </span>{whole(Number(a.valor_super))} <span style={{ fontSize: 11, color: Number(a.valor_super) >= Number(a.precio) ? '#1a7a40' : '#a32e27' }}>({Number(a.valor_super) >= Number(a.precio) ? 'ahorra ' : '+'}{pct(Math.abs(Number(a.valor_super) - Number(a.precio)) / Number(a.valor_super))})</span></span> : null}
                <span style={{ color: margen !== null && margen < .3 ? '#a32e27' : '#1a7a40' }}>{margen === null ? '—' : pct(margen)}</span>
                <button onClick={() => toggleVenta(a)} title="Mostrar u ocultar en la pantalla de Venta" style={{ ...b(a.en_venta === false ? undefined : 'green'), padding: '4px 9px', fontSize: 11 }}>{a.en_venta === false ? 'Pausado' : '✓ En venta'}</button>
                <button onClick={() => copiar(a)} style={{ ...b(), padding: '4px 9px', fontSize: 11 }}>Copiar</button>
                <button onClick={() => borrar(a)} style={{ ...b('red'), padding: '4px 9px', fontSize: 11 }}>Eliminar</button>
              </div>
            </div>
            {abierto === a.id && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--borderl)', paddingTop: 10 }}>
                {a.items.map((i, k) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, padding: '4px 0' }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Tag g={i.grupo} />{i.nombre} <span style={{ color: 'var(--muted)', fontSize: 11 }}>{i.marca} · {i.presentacion}</span></span>
                    <span>{money(Number(i.costo))}</span>
                  </div>
                ))}
                {a.notas && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>📝 {a.notas}</div>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// AJUSTES
// ══════════════════════════════════════════════════════════════════
function Ajustes({ tamanos, setTamanos, packaging, setPackaging, comision, setComision, avisar }: {
  tamanos: BoxTamano[]; setTamanos: React.Dispatch<React.SetStateAction<BoxTamano[]>>
  packaging: number; setPackaging: (n: number) => void; comision: number; setComision: (n: number) => void; avisar: (t: string) => void
}) {
  const [pk, setPk] = useState(String(packaging))
  const [cm, setCm] = useState(String(comision))
  const [rows, setRows] = useState(tamanos.map(t => ({ ...t, gruposTxt: t.grupos.join(' ') })))
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const p = Number(pk), c = Number(cm)
    if (!Number.isFinite(p) || p < 0 || !Number.isFinite(c) || c < 0 || c > 100) { avisar('Revisá packaging y comisión.'); return }
    const parsed = rows.map(r => ({ tamano: r.tamano, precio: Number(r.precio), objetivo: Number(r.objetivo), grupos: r.gruposTxt.toUpperCase().split(/[\s,]+/).filter(Boolean) as Grupo[] }))
    if (parsed.some(r => !r.grupos.length || r.grupos.some(g => !['A', 'B', 'C'].includes(g)) || !(r.precio > 0) || !(r.objetivo >= 0))) { avisar('Cada tamaño necesita precio, objetivo y grupos A/B/C.'); return }
    setGuardando(true)
    const db = supabase as any
    const r1 = await db.from('box_ajustes').upsert({ id: 1, packaging: p, comision_pct: c })
    const r2 = await db.from('box_tamanos').upsert(parsed)
    setGuardando(false)
    if (r1.error || r2.error) { avisar('Error al guardar: ' + (r1.error || r2.error).message); return }
    setPackaging(p); setComision(c); setTamanos(parsed.sort((a, z) => a.tamano - z.tamano))
    avisar('Ajustes guardados.')
  }

  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 820 }}>
      <div style={card}>
        <div style={eyebrow}>Costos variables por box</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
          <div><label style={lbl}>Packaging por box ($)</label><input type="number" min={0} step="0.01" value={pk} onChange={e => setPk(e.target.value)} /></div>
          <div><label style={lbl}>Comisión de pago (%)</label><input type="number" min={0} max={100} step="0.01" value={cm} onChange={e => setCm(e.target.value)} /></div>
        </div>
      </div>
      <div style={card}>
        <div style={eyebrow}>Tamaños de box</div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Grupos = receta del box, separados por espacio (ej: <code>A B B C C</code>). El objetivo es el tope de costo de mercadería que usa el armado al azar.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
            <thead><tr>{['Box', 'Precio venta', 'Objetivo mercadería', 'Grupos'].map(h => <th key={h} style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', padding: 8, borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.tamano}>
                  <td style={{ padding: 8 }}>Box {r.tamano}</td>
                  <td style={{ padding: 8 }}><input type="number" value={r.precio} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, precio: e.target.value as any } : x))} /></td>
                  <td style={{ padding: 8 }}><input type="number" value={r.objetivo} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, objetivo: e.target.value as any } : x))} /></td>
                  <td style={{ padding: 8 }}><input value={r.gruposTxt} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, gruposTxt: e.target.value } : x))} style={{ fontFamily: 'monospace' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div><button onClick={guardar} disabled={guardando} style={{ ...b('gold'), padding: '10px 22px' }}>{guardando ? 'Guardando…' : 'Guardar ajustes'}</button></div>
    </div>
  )
}
