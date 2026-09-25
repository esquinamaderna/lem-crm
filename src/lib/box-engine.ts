// Motor del armador de boxes (portado de Maderna_Armador_Navidad.html)
// Regla central: una sola variante por "familia" de producto (aceite, arroz, pan dulce…)
// sin importar marca, presentación o grupo A/B/C.

export type Grupo = 'A' | 'B' | 'C' | 'Especial'

export interface BoxProducto {
  id: string
  nombre: string
  marca: string | null
  presentacion: string | null
  costo: number | null
  grupo: Grupo
  familia: string | null
  tipos: string[]
  estado: string | null
  precio_tipo: string | null
  precio_nota: string | null
  precio_fecha: string | null
  precio_fuente: string | null
  // Precio de referencia en supermercado tradicional (góndola)
  precio_super?: number | null
  super_nombre?: string | null
  super_url?: string | null
  super_fecha?: string | null
  super_tipo?: string | null
  activo: boolean
  // Presente cuando el ítem es un producto del CRM (tabla productos)
  lem?: { producto_id: number; cantidad: number; unidad: string; precio_venta: number }
}

// Producto del CRM (tabla productos) disponible para sumar a un box
export interface LemProducto {
  id: number; nombre: string; categoria: string; costo: number | null; precio_venta: number
  unidad_venta: string | null; stock_kg: number | null
}

export function lemToBox(p: LemProducto, cantidad: number, grupo: Grupo, tipo: string): BoxProducto {
  const unidad = p.unidad_venta || 'kg'
  return {
    id: 'L' + p.id, nombre: p.nombre, marca: p.categoria, presentacion: `${cantidad.toLocaleString('es-AR')} ${unidad}`,
    costo: Math.round((Number(p.costo) || 0) * cantidad * 100) / 100, grupo, familia: 'lem:' + p.id, tipos: [tipo],
    estado: 'Producto LEM', precio_tipo: 'manual', precio_nota: null, precio_fecha: null, precio_fuente: null, activo: true,
    lem: { producto_id: p.id, cantidad, unidad, precio_venta: Number(p.precio_venta) || 0 },
    precio_super: Math.round((Number(p.precio_venta) || 0) * cantidad), super_tipo: 'pv-lem', super_nombre: 'Precio de venta LEM',
  }
}

export interface BoxTamano { tamano: number; precio: number; grupos: Grupo[]; objetivo: number }
export interface BoxTipo { nombre: string; familia: string; descripcion: string | null; orden: number }
export interface BoxOcasion { id: string; nombre: string; fecha: string | null; regla: string | null; fuente: string | null; orden: number }

export const NAVIDENA = 'Navideña'
export const OCASIONES_NAVIDAD = ['navidad', 'nochebuena']

export const cents = (x: number) => Math.round(x * 100)
const normalize = (s: string) =>
  String(s).toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ')

export function key(p: BoxProducto): string {
  if (p.familia) return normalize(p.familia)
  const name = normalize(p.nombre)
  for (const prefix of ['arroz', 'aceite', 'fideos', 'harina', 'galletitas', 'cafe', 'leche', 'sal', 'arvejas', 'detergente', 'esponja', 'lavandina'])
    if (name === prefix || name.startsWith(prefix + ' ')) return prefix
  if (/^pure (de )?tomate$/.test(name)) return 'pure de tomate'
  if (name === 'jabon en polvo' || name.startsWith('jabon ropa ')) return 'jabon para ropa'
  return name
}

export const priced = (p: BoxProducto) => p.activo !== false && typeof p.costo === 'number' && Number.isFinite(p.costo) && p.costo >= 0

export function pool(products: BoxProducto[], type: string, group: Grupo, used: BoxProducto[] = []) {
  const seen = new Set(used.map(key))
  return products.filter(p => p.tipos.includes(type) && p.grupo === group && priced(p) && !seen.has(key(p)))
}

type Sol = { cost: number; items: BoxProducto[] }

function solve(products: BoxProducto[], type: string, groups: Grupo[], used: BoxProducto[] = []): Sol {
  // La navideña siempre lleva un pan dulce: se reserva primero.
  if (type === NAVIDENA && !used.some(p => key(p) === 'pan dulce')) {
    const at = groups.indexOf('A')
    if (at < 0) return { cost: Infinity, items: [] }
    const rest = groups.slice(); rest.splice(at, 1)
    let best: Sol = { cost: Infinity, items: [] }
    for (const p of pool(products, type, 'A', used).filter(p => key(p) === 'pan dulce')) {
      const tail = solve(products, type, rest, [...used, p]), cost = cents(p.costo!) + tail.cost
      if (cost < best.cost) best = { cost, items: [p, ...tail.items] }
    }
    return best
  }
  const G = ['A', 'B', 'C'] as const
  const target = G.map(g => groups.filter(x => x === g).length)
  const taken = new Set(used.map(key))
  const families = new Map<string, Partial<Record<Grupo, BoxProducto>>>()
  for (const p of products) {
    if (!p.tipos.includes(type) || !(G as readonly string[]).includes(p.grupo) || !priced(p) || taken.has(key(p))) continue
    const v = families.get(key(p)) || {}
    if (!v[p.grupo] || p.costo! < v[p.grupo]!.costo!) v[p.grupo] = p
    families.set(key(p), v)
  }
  type St = { cost: number; items: BoxProducto[]; counts: number[] }
  let dp = new Map<string, St>([['0,0,0', { cost: 0, items: [], counts: [0, 0, 0] }]])
  for (const variants of Array.from(families.values())) {
    const next = new Map(dp)
    for (const st of Array.from(dp.values())) for (let g = 0; g < 3; g++) {
      const p = variants[G[g]]
      if (!p || st.counts[g] >= target[g]) continue
      const counts = st.counts.slice(); counts[g]++
      const id = counts.join(','), cost = st.cost + cents(p.costo!)
      if (!next.has(id) || cost < next.get(id)!.cost) next.set(id, { cost, items: [...st.items, p], counts })
    }
    dp = next
  }
  return dp.get(target.join(',')) || { cost: Infinity, items: [] }
}

export const minimum = (products: BoxProducto[], type: string, groups: Grupo[], used: BoxProducto[] = []) =>
  solve(products, type, groups, used).cost

export function slotAllowed(type: string, p: BoxProducto, i: number) {
  return type !== NAVIDENA || (i === 0 ? key(p) === 'pan dulce' : key(p) !== 'pan dulce')
}

export type GenResult =
  | { ok: false; items: [] }
  | { ok: true; items: BoxProducto[]; cost: number; minimum: number; over: boolean }

export function generate(products: BoxProducto[], type: string, rule: BoxTamano, budget: number, rng = Math.random): GenResult {
  const groups = rule.grupos, best = solve(products, type, groups), min = best.cost
  if (!Number.isFinite(min)) return { ok: false, items: [] }
  if (min > cents(budget)) {
    const remaining = best.items.slice()
    const items = groups.map(g => remaining.splice(remaining.findIndex(p => p.grupo === g), 1)[0])
    return { ok: true, items, cost: min / 100, minimum: min / 100, over: true }
  }
  const selected: BoxProducto[] = []
  let spent = 0
  for (let i = 0; i < groups.length; i++) {
    const possible = pool(products, type, groups[i], selected)
      .filter(p => slotAllowed(type, p, i))
      .filter(p => spent + cents(p.costo!) + minimum(products, type, groups.slice(i + 1), [...selected, p]) <= cents(budget))
    if (!possible.length) return { ok: false, items: [] }
    const p = possible[Math.min(possible.length - 1, Math.floor(rng() * possible.length))]
    selected.push(p); spent += cents(p.costo!)
  }
  return { ok: true, items: selected, cost: spent / 100, minimum: min / 100, over: false }
}

export function metrics(items: (BoxProducto | null)[], rule: BoxTamano, packaging: number, commissionPct: number) {
  const cost = items.filter(Boolean).reduce((s, p) => s + cents(p!.costo || 0), 0) / 100
  const fee = Math.round(rule.precio * commissionPct) / 100
  const total = Math.round((cost + packaging + fee) * 100) / 100
  return {
    cost, fee, total,
    profit: rule.precio - total,
    margin: (rule.precio - total) / rule.precio,
    complete: items.length === rule.grupos.length && items.every(Boolean),
  }
}

// Valor de referencia del box en supermercado vs. precio del box
export function valorSuper(items: (BoxProducto | null)[], precioBox: number) {
  const list = items.filter(Boolean) as BoxProducto[]
  const con = list.filter(p => typeof p.precio_super === 'number' && p.precio_super > 0)
  const total = con.reduce((s, p) => s + Number(p.precio_super), 0)
  const ahorro = total - precioBox
  return { total, faltan: list.length - con.length, ahorro, ahorroPct: total > 0 ? ahorro / total : 0 }
}
