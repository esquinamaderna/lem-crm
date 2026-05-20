'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today, fechaES, dateAddISO } from '@/lib/utils'
import type { Producto } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'
import { useRouter } from 'next/navigation'

// ──────────────────────────────────────────────────────────────────
// RECETAS STANDARD — extraídas de RECETAS_STANDARD.xlsx
// Cada receta está definida por 1 kg de PRODUCTO TERMINADO.
// La calculadora parte de los kg de PROTEÍNA disponible.
// ──────────────────────────────────────────────────────────────────
interface Ingrediente { nombre: string; qty: number; unidad: 'kg' | 'lts' | 'u'; precio: number }
interface Receta {
  proteina: string           // ingrediente principal (punto de partida)
  proteinaPorKgProducto: number   // kg proteína por 1 kg producto terminado
  merma: number              // factor ej: 0.05 = 5%
  costoBase: number          // costo por kg terminado según planilla
  rendimiento: string
  ingredientes: Ingrediente[]
  pasos: string[]
}

const RECETAS: Record<string, Receta> = {
  'Milanesa de Pollo s/provenzal': {
    proteina: 'Pechuga de pollo', proteinaPorKgProducto: 0.5, merma: 0.05, costoBase: 5310.56,
    rendimiento: 'Costo planilla: $5.311/kg terminado · Merma 5%',
    ingredientes: [
      { nombre: 'Pechuga de pollo', qty: 0.5, unidad: 'kg', precio: 6700 },
      { nombre: 'Pan rallado', qty: 0.2765, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado Crunch', qty: 0.068, unidad: 'kg', precio: 4180 },
      { nombre: 'Huevos frescos', qty: 2.8, unidad: 'u', precio: 196.67 },
      { nombre: 'Sal fina', qty: 0.002, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.001, unidad: 'kg', precio: 78600 },
      { nombre: 'Mostaza', qty: 0.023, unidad: 'kg', precio: 2815.33 },
      { nombre: 'Leche', qty: 0.08, unidad: 'lts', precio: 1739 },
      { nombre: 'Harina 0000', qty: 0.04, unidad: 'kg', precio: 870 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Mise en place: descongelar pechuga, preparar baño huevo+mostaza+sal+pimienta y pan rallado+crunch', 'Filetear: cortes parejos 8–10 mm, descartar bordes irregulares', 'Empanado: (1) baño húmedo → (2) mezcla pan+crunch. Presionar. NO humedecer en exceso', 'Control: grosor uniforme del rebozado, sin huecos ni exceso de pan', 'Envasar al vacío en rollo gofrado. Etiquetar: producto, fecha, vencimiento, lote', 'Congelar plano a −18°C. No apilar hasta congelación completa (~4 hs)'],
  },
  'Milanesa de Pollo c/provenzal': {
    proteina: 'Pechuga de pollo', proteinaPorKgProducto: 0.5, merma: 0.05, costoBase: 6160.98,
    rendimiento: 'Costo planilla: $6.161/kg terminado · Merma 5%',
    ingredientes: [
      { nombre: 'Pechuga de pollo', qty: 0.5, unidad: 'kg', precio: 6700 },
      { nombre: 'Pan rallado', qty: 0.2765, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado Crunch', qty: 0.068, unidad: 'kg', precio: 4180 },
      { nombre: 'Huevos frescos', qty: 2.8, unidad: 'u', precio: 196.67 },
      { nombre: 'Sal fina', qty: 0.002, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.001, unidad: 'kg', precio: 78600 },
      { nombre: 'Ajo en polvo', qty: 0.002, unidad: 'kg', precio: 20800 },
      { nombre: 'Perejil seco picado', qty: 0.004, unidad: 'kg', precio: 192000 },
      { nombre: 'Mostaza', qty: 0.023, unidad: 'kg', precio: 2815.33 },
      { nombre: 'Leche', qty: 0.08, unidad: 'lts', precio: 1739 },
      { nombre: 'Harina 0000', qty: 0.04, unidad: 'kg', precio: 870 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Mise en place: igual que sin provenzal. Mezclar perejil + ajo en polvo al pan rallado antes de comenzar', 'Filetear: 8–10 mm. Mantener uniformidad', 'Empanado: (1) baño húmedo → (2) mezcla pan+provenzal. Verificar cobertura aromática pareja', 'Control: color del rebozado levemente más oscuro, aroma a provenzal uniforme', 'Envasar al vacío. Etiquetar diferenciando de versión sin provenzal'],
  },
  'Milanesa de Nalga UG': {
    proteina: 'Nalga (fileteada)', proteinaPorKgProducto: 0.5, merma: 0.05, costoBase: 14543.90,
    rendimiento: 'Costo planilla: $14.544/kg terminado · Merma 5%',
    ingredientes: [
      { nombre: 'Nalga (fileteada)', qty: 0.5, unidad: 'kg', precio: 24000 },
      { nombre: 'Pan rallado', qty: 0.2765, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado Crunch', qty: 0.068, unidad: 'kg', precio: 4180 },
      { nombre: 'Huevos frescos', qty: 3.6, unidad: 'u', precio: 196.67 },
      { nombre: 'Sal fina', qty: 0.005, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.001, unidad: 'kg', precio: 78600 },
      { nombre: 'Ajo en polvo', qty: 0.002, unidad: 'kg', precio: 20800 },
      { nombre: 'Leche', qty: 0.05, unidad: 'lts', precio: 1739 },
      { nombre: 'Condimento provenzal', qty: 0.005, unidad: 'kg', precio: 17700 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Selección: nalga UG, color rojo intenso, sin manchas grises. Conservar en frío hasta fileteo', 'Filetear: 8–10 mm siguiendo fibra muscular. Piezas grandes y uniformes — diferenciador premium', 'Baño húmedo: huevo + leche + sal + pimienta + ajo. Sumergir 5 min', 'Empanado doble: (1) baño → (2) pan. Repetir: (3) baño → (4) pan', 'Reposo 10 min en frío antes de envasar — asienta el rebozado', 'Envasar individual en rollo gofrado. Etiquetar: "Nalga Unión Ganadera". Congelar plano −18°C'],
  },
  'Milanesa de Peceto': {
    proteina: 'Peceto (fileteado)', proteinaPorKgProducto: 0.85, merma: 0.05, costoBase: 11560.70,
    rendimiento: 'Costo planilla: $11.561/kg terminado · Merma 5%',
    ingredientes: [
      { nombre: 'Peceto (fileteado)', qty: 0.85, unidad: 'kg', precio: 11699 },
      { nombre: 'Pan rallado', qty: 0.15, unidad: 'kg', precio: 1696 },
      { nombre: 'Huevos frescos', qty: 2, unidad: 'u', precio: 196.67 },
      { nombre: 'Sal fina', qty: 0.005, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.001, unidad: 'kg', precio: 78600 },
      { nombre: 'Ajo en polvo', qty: 0.002, unidad: 'kg', precio: 20800 },
      { nombre: 'Mostaza', qty: 0.01, unidad: 'kg', precio: 2815.33 },
      { nombre: 'Leche', qty: 0.05, unidad: 'lts', precio: 1739 },
      { nombre: 'Condimento provenzal', qty: 0.005, unidad: 'kg', precio: 17700 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Verificar espesor 6–8 mm. Si viene grueso, golpear suavemente con mazo sobre film', 'Baño húmedo: huevo + leche + mostaza + sal + pimienta + ajo. Sumergir 3–5 min', 'Empanado: pan rallado solo (sin crunch — mantiene textura fina del peceto)', 'Envasar al vacío. Etiquetar: "Milanesa de Peceto", fecha, lote. Congelar plano −18°C'],
  },
  'Milanesa de Carré de Cerdo': {
    proteina: 'Carré de cerdo', proteinaPorKgProducto: 0.9, merma: 0.05, costoBase: 9900,
    rendimiento: '85% sobre carré crudo · Pack objetivo 450–500 g',
    ingredientes: [
      { nombre: 'Carré de cerdo', qty: 0.9, unidad: 'kg', precio: 11000 },
      { nombre: 'Pan rallado', qty: 0.2, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado Crunch', qty: 0.08, unidad: 'kg', precio: 4180 },
      { nombre: 'Huevos frescos', qty: 2, unidad: 'u', precio: 196.67 },
      { nombre: 'Mostaza', qty: 0.05, unidad: 'kg', precio: 2815.33 },
      { nombre: 'Leche', qty: 0.05, unidad: 'lts', precio: 1739 },
      { nombre: 'Sal fina', qty: 0.008, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.003, unidad: 'kg', precio: 78600 },
      { nombre: 'Ajo en polvo', qty: 0.003, unidad: 'kg', precio: 20800 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Selección: carré magro, color rosado pálido uniforme', 'Filetear perpendicular a la fibra 8–10 mm. Tiernizar 2–3 golpes suaves con mazo', 'Baño húmedo: huevo + leche + mostaza + sal + pimienta + ajo. 5 min', 'Empanado: pan rallado + crunch. Presionar bien', 'Envasar al vacío. Congelar plano −18°C'],
  },
  'Ribs Kansas BBQ': {
    proteina: 'Ribs de cerdo', proteinaPorKgProducto: 1.0, merma: 0.05, costoBase: 6682.55,
    rendimiento: 'Costo planilla: $6.683/kg · Porciones 3–4 costillas ~400–500 g/pack',
    ingredientes: [
      { nombre: 'Ribs de cerdo', qty: 1.0, unidad: 'kg', precio: 5300 },
      { nombre: 'Pimentón ahumado', qty: 0.02, unidad: 'kg', precio: 24360 },
      { nombre: 'Pimienta de cayena', qty: 0.007, unidad: 'kg', precio: 17900 },
      { nombre: 'Mostaza en polvo', qty: 0.005, unidad: 'kg', precio: 13470 },
      { nombre: 'Clavo de olor', qty: 0.001, unidad: 'kg', precio: 66040 },
      { nombre: 'Canela', qty: 0.002, unidad: 'kg', precio: 1099 },
      { nombre: 'Azúcar', qty: 0.01, unidad: 'kg', precio: 6000 },
      { nombre: 'Sal fina', qty: 0.01, unidad: 'kg', precio: 2650 },
      { nombre: 'Ajo en polvo', qty: 0.005, unidad: 'kg', precio: 20800 },
      { nombre: 'Cebolla en polvo', qty: 0.005, unidad: 'kg', precio: 8900 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Preparar rub: mezclar pimentón + cayena + mostaza en polvo + clavo + canela + azúcar + sal + ajo + cebolla. RECETA PROPIETARIA', 'Aplicar rub: cubrir ribs completamente, masajear ambas caras y bordes', 'Reposo con rub: mínimo 2 hs en frío (ideal 12 hs overnight). CRÍTICO', 'Retirar membrana del lado del hueso antes del rub', 'Porcionar: 3–4 costillas, ~400–500 g. Incluir bolsita kraft con rub extra', 'Instrucciones: Horno 180°C × 45 min tapado + 15 min destapado. O airfryer 160°C × 30 min'],
  },
  'Pechuguitas de Pollo': {
    proteina: 'Pechuga de pollo', proteinaPorKgProducto: 1.0, merma: 0.05, costoBase: 9955.31,
    rendimiento: 'Costo planilla: $9.955/kg · Porciones 200–300 g/pieza',
    ingredientes: [
      { nombre: 'Pechuga de pollo', qty: 1.0, unidad: 'kg', precio: 9400 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Selección: pechugas enteras sin hematomas ni grasa excesiva', 'Limpieza: retirar filete interno. Limpiar grasa y nervios', 'Porcionar: dejar entera si pesa 200–300 g, cortar si supera 350 g', 'Envasar individual al vacío. Congelar plano −18°C. Vida útil: 90 días'],
  },
  'Medallones de Pollo × 12': {
    proteina: 'Recortes de pechuga', proteinaPorKgProducto: 0.9, merma: 0.01, costoBase: 7645.18,
    rendimiento: 'Costo planilla: $7.645/pack · Peso pack 480–500 g (12 u × ~40 g)',
    ingredientes: [
      { nombre: 'Recortes de pechuga', qty: 0.9, unidad: 'kg', precio: 6700 },
      { nombre: 'Pan rallado', qty: 0.2, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado Crunch', qty: 0.1, unidad: 'kg', precio: 4180 },
      { nombre: 'Mostaza', qty: 0.1, unidad: 'kg', precio: 2815.33 },
      { nombre: 'Sal fina', qty: 0.01, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.005, unidad: 'kg', precio: 78600 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Picar pechuga a textura de carne picada gruesa. Mezclar con mostaza + sal + pimienta', 'Porcionar ~40 g c/u. Moldear medallón 7–8 cm diámetro × 1.5 cm con aro', 'Empanado: (1) mostaza húmeda → (2) pan rallado+crunch. Presionar suavemente', 'Control: 12 medallones de peso y tamaño similares. Descartar piezas irregulares', 'Envasar en una sola capa al vacío. Etiquetar: "Medallones × 12", peso neto, fecha, lote', 'Congelar plano −18°C. No apilar hasta congelación completa'],
  },
  'Medallones de Pollo × 6': {
    proteina: 'Recortes de pechuga', proteinaPorKgProducto: 0.55, merma: 0.01, costoBase: 4274.94,
    rendimiento: 'Costo planilla: $4.275/pack · Peso pack 240–250 g netos',
    ingredientes: [
      { nombre: 'Recortes de pechuga', qty: 0.55, unidad: 'kg', precio: 6700 },
      { nombre: 'Pan rallado', qty: 0.0375, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado Crunch', qty: 0.0125, unidad: 'kg', precio: 4180 },
      { nombre: 'Mostaza', qty: 0.05, unidad: 'kg', precio: 2815.33 },
      { nombre: 'Sal fina', qty: 0.005, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.0025, unidad: 'kg', precio: 78600 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Misma técnica que Medallones × 12 — producir en el mismo batch y separar al envasar', 'Moldear 6 medallones de ~40 g c/u', 'Envasar los 6 juntos. Etiquetar: "Medallones × 6", peso neto, fecha, lote'],
  },
  'Caritas de Papa': {
    proteina: 'Caritas congeladas', proteinaPorKgProducto: 1.0, merma: 0, costoBase: 7525.69,
    rendimiento: 'Costo planilla: $7.526/kg · Producto de reventa fraccionado',
    ingredientes: [
      { nombre: 'Caritas congeladas', qty: 1.0, unidad: 'kg', precio: 7444.44 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Verificar temperatura de llegada ≤ −15°C', 'Fraccionar en porciones de 500 g o 1 kg en ≤15 min fuera del frío', 'Envasar al vacío. Recongelar inmediatamente a −18°C'],
  },
  'Bastones de Papa': {
    proteina: 'Papas bastón congeladas', proteinaPorKgProducto: 1.0, merma: 0, costoBase: 4414.58,
    rendimiento: 'Costo planilla: $4.415/kg · Producto de reventa fraccionado',
    ingredientes: [
      { nombre: 'Papas bastón congeladas', qty: 1.0, unidad: 'kg', precio: 4333.33 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Verificar temperatura de llegada ≤ −15°C', 'Fraccionar en ≤15 min fuera del frío', 'Envasar al vacío. Recongelar. Respetar fecha original del proveedor'],
  },
  'Papas Noisette': {
    proteina: 'Papas Noisette congeladas', proteinaPorKgProducto: 1.0, merma: 0, costoBase: 7381.25,
    rendimiento: 'Costo planilla: $7.381/kg · Producto de reventa fraccionado',
    ingredientes: [
      { nombre: 'Papas Noisette congeladas', qty: 1.0, unidad: 'kg', precio: 7300 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Verificar temperatura de llegada ≤ −15°C', 'Fraccionar en ≤15 min. No mezclar lotes de diferentes fechas', 'Envasar al vacío. Recongelar a −18°C'],
  },
  'Nuggets Crocantes': {
    proteina: 'Nuggets crocantes (Sadia)', proteinaPorKgProducto: 1.0, merma: 0, costoBase: 9281.25,
    rendimiento: 'Costo planilla: $9.281/kg · Producto de reventa fraccionado',
    ingredientes: [
      { nombre: 'Nuggets crocantes (Sadia)', qty: 1.0, unidad: 'kg', precio: 9200 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Verificar temperatura de llegada ≤ −15°C', 'Evaluar: sin apelmazamiento ni rotura', 'Fraccionar 500 g o 1 kg. Máx 10 min fuera del frío', 'Envasar al vacío. Recongelar inmediatamente. NO microondas'],
  },
}

const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }
const b = (v?: 'gold' | 'blue'): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 6,
  border: `1px solid ${v === 'gold' ? 'var(--gold)' : v === 'blue' ? 'rgba(30,100,180,.3)' : 'var(--border)'}`,
  background: v === 'gold' ? 'var(--gold)' : v === 'blue' ? 'rgba(30,100,180,.08)' : 'var(--card)',
  color: v === 'gold' ? '#fff' : v === 'blue' ? '#1050a0' : 'var(--text)',
  cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif',
})

export function FichasClient() {
  const [prods, setProds] = useState<Producto[]>([])
  const [sel, setSel] = useState<number | ''>('')
  const [kgProteina, setKgProteina] = useState('5')
  const [editMode, setEditMode] = useState(false)
  const [epv, setEpv] = useState(''); const [ecosto, setEcosto] = useState('')
  const [estock, setEstock] = useState(''); const [evida, setEvida] = useState('')
  const [einst, setEinst] = useState('')
  const [saving, setSaving] = useState(false)
  // Producción
  const [pfCant, setPfCant] = useState('5'); const [pfFecha, setPfFecha] = useState(today())
  const [pfLote, setPfLote] = useState(''); const [pfResp, setPfResp] = useState('')
  const [pfNotas, setPfNotas] = useState('')
  const [savingOrden, setSavingOrden] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.from('productos').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setProds(data && data.length ? data : PRODUCTOS_DEFAULT.map((p, i) => ({ ...p, id: i + 1 })) as Producto[]))
    supabase.from('ordenes_produccion').select('*', { count: 'exact', head: true })
      .then(({ count }) => setPfLote('L' + String((count ?? 0) + 1).padStart(3, '0')))
  }, [])

  const prod = prods.find(p => p.id === sel)
  const receta = prod ? RECETAS[prod.nombre] : null

  // ── Calculadora invertida: desde kg proteína → kg producto terminado ──
  const kgProt = parseFloat(kgProteina) || 0
  const kgProducto = receta && kgProt > 0 ? parseFloat((kgProt / receta.proteinaPorKgProducto).toFixed(3)) : 0
  const factor = kgProducto // escala sobre la receta base (1 kg producto)

  const costoCalculado = receta && factor > 0
    ? receta.ingredientes.reduce((s, ing) => {
        const cantReal = ing.unidad === 'u' ? Math.ceil(ing.qty * factor) : ing.qty * factor
        return s + cantReal * ing.precio
      }, 0) * (1 + receta.merma)
    : 0

  const venceISO = prod && pfFecha ? dateAddISO(pfFecha, prod.vida_util_dias) : ''

  // Abrir modo edición
  function abrirEdicion() {
    if (!prod) return
    setEpv(String(prod.precio_venta))
    setEcosto(String(prod.costo))
    setEstock(String(prod.stock_kg))
    setEvida(String(prod.vida_util_dias))
    setEinst(prod.instrucciones || '')
    setEditMode(true)
  }

  async function guardarEdicion() {
    if (!prod) return
    setSaving(true)
    const updates = {
      precio_venta: parseFloat(epv),
      costo: parseFloat(ecosto),
      stock_kg: parseFloat(estock),
      vida_util_dias: parseInt(evida),
      instrucciones: einst,
    }
    await supabase.from('productos').update(updates).eq('id', prod.id)
    setProds(prev => prev.map(p => p.id === prod.id ? { ...p, ...updates } : p))
    setEditMode(false)
    setSaving(false)
  }

  async function crearOrden() {
    if (!prod) return
    setSavingOrden(true)
    try {
      const cant = parseFloat(pfCant)
      const { data } = await supabase.from('ordenes_produccion').insert({
        numero_lote: pfLote, producto_id: prod.id, producto_nombre: prod.nombre,
        cantidad_kg: cant, fecha_produccion: pfFecha,
        fecha_vencimiento: dateAddISO(pfFecha, prod.vida_util_dias),
        estado: 'pendiente', responsable: pfResp, notas: pfNotas, etiquetas_generadas: 0,
      }).select().single()
      if (data) router.push('/etiquetas?orden=' + data.id)
    } catch (e) { console.error(e); alert('Error al crear la orden') }
    setSavingOrden(false)
  }

  return (
    <div className="fichas-grid">

      {/* ── Panel izquierdo: Selector + Ficha + Calculadora ── */}
      <div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Fichas Técnicas</div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: 'var(--shadow)' }}>
          <select value={sel} onChange={e => { setSel(e.target.value ? parseInt(e.target.value) : ''); setEditMode(false) }} style={{ width: '100%' }}>
            <option value="">— Seleccionar producto —</option>
            {prods.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>

        {prod && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>

            {/* Header producto + botón editar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>{prod.nombre}</div>
              <button onClick={editMode ? guardarEdicion : abrirEdicion} disabled={saving}
                style={{ ...b(editMode ? 'gold' : undefined), padding: '4px 10px', fontSize: 11 }}>
                {saving ? 'Guardando...' : editMode ? '✓ Guardar cambios' : '✏ Editar producto'}
              </button>
            </div>

            {/* Modo visualización */}
            {!editMode ? (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, marginBottom: 12 }}>
                <span>PV: <strong style={{ color: 'var(--gold)' }}>{fmt(prod.precio_venta)}/kg</strong></span>
                <span>Costo: <strong>{fmt(prod.costo)}/kg</strong></span>
                <span>FC: <strong>{(prod.costo / prod.precio_venta * 100).toFixed(0)}%</strong></span>
                <span>Margen: <strong>{fmt(prod.precio_venta - prod.costo)}/kg</strong></span>
                <span>Stock: <strong style={{ color: prod.stock_kg < 2 ? '#aa2020' : prod.stock_kg < 5 ? '#a85010' : '#1a7a40' }}>{fmtN(prod.stock_kg)} kg</strong></span>
                <span>Vida útil: <strong>{prod.vida_util_dias} días</strong></span>
              </div>
            ) : (
              /* Modo edición */
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 10 }}>
                  <div><label style={lbl}>PV ($/kg)</label><input type="number" value={epv} onChange={e => setEpv(e.target.value)} /></div>
                  <div><label style={lbl}>Costo ($/kg)</label><input type="number" value={ecosto} onChange={e => setEcosto(e.target.value)} /></div>
                  <div><label style={lbl}>Stock (kg)</label><input type="number" value={estock} onChange={e => setEstock(e.target.value)} /></div>
                  <div><label style={lbl}>Vida útil (días)</label><input type="number" value={evida} onChange={e => setEvida(e.target.value)} /></div>
                </div>
                <div><label style={lbl}>Instrucciones de cocción</label><textarea value={einst} onChange={e => setEinst(e.target.value)} rows={2} /></div>
                <button onClick={() => setEditMode(false)} style={{ ...b(), marginTop: 8, fontSize: 11, padding: '4px 10px' }}>Cancelar</button>
              </div>
            )}

            {prod.instrucciones && !editMode && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, padding: '8px 10px', background: 'var(--bg)', borderRadius: 6, borderLeft: '3px solid var(--gold)' }}>{prod.instrucciones}</div>
            )}

            {/* ── Calculadora invertida ── */}
            {receta && (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Calculadora de producción</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Tengo</span>
                  <input type="number" value={kgProteina} onChange={e => setKgProteina(e.target.value)} min="0.1" step="0.5"
                    style={{ width: 80, fontSize: 14, padding: '5px 8px', fontWeight: 'bold' }} />
                  <span style={{ fontSize: 13 }}>kg de <strong>{receta.proteina}</strong></span>
                </div>

                {kgProt > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', background: 'var(--gold-bg)', border: '1px solid var(--gold-d)', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>→ Produce aprox.</span>
                    <span style={{ fontSize: 22, color: 'var(--gold)', fontWeight: 'bold' }}>{fmtN(kgProducto, 2)} kg</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>de producto terminado</span>
                  </div>
                )}

                {/* Tabla ingredientes */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Ingrediente', 'Necesitás', 'Costo'].map(h => (
                          <th key={h} style={{ textAlign: h === 'Costo' ? 'right' : 'left', padding: '5px 6px', fontSize: 10, color: 'var(--muted)', borderBottom: '1px solid var(--border)', letterSpacing: 1, textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {receta.ingredientes.map((ing, i) => {
                        const cantReal = ing.unidad === 'u' ? Math.ceil(ing.qty * factor) : parseFloat((ing.qty * factor).toFixed(3))
                        const costoIng = ing.precio * (typeof cantReal === 'number' ? cantReal : 0)
                        const esProteina = ing.nombre === receta.proteina
                        return (
                          <tr key={i} style={{ background: esProteina ? 'rgba(154,122,26,.06)' : 'transparent' }}>
                            <td style={{ padding: '5px 6px', borderBottom: '1px solid var(--borderl)', fontWeight: esProteina ? 'bold' : 'normal' }}>
                              {esProteina && <span style={{ color: 'var(--gold)', marginRight: 4 }}>★</span>}
                              {ing.nombre}
                            </td>
                            <td style={{ padding: '5px 6px', borderBottom: '1px solid var(--borderl)', color: esProteina ? 'var(--gold)' : 'var(--text)', fontWeight: esProteina ? 'bold' : 'normal' }}>
                              {factor > 0
                                ? ing.unidad === 'u' ? `${Math.ceil(ing.qty * factor)} u` : `${fmtN(ing.qty * factor, 3)} ${ing.unidad}`
                                : `${ing.qty} ${ing.unidad}`}
                            </td>
                            <td style={{ padding: '5px 6px', borderBottom: '1px solid var(--borderl)', textAlign: 'right', color: 'var(--muted)', fontSize: 11 }}>
                              {factor > 0 ? fmt(costoIng) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      {receta.merma > 0 && (
                        <tr><td colSpan={2} style={{ padding: '5px 6px', fontSize: 11, color: 'var(--dim)' }}>+ Merma {(receta.merma * 100).toFixed(0)}%</td><td></td></tr>
                      )}
                      <tr>
                        <td colSpan={2} style={{ padding: '6px 6px 2px', fontSize: 13, fontWeight: 'bold' }}>Costo total estimado</td>
                        <td style={{ padding: '6px 6px 2px', textAlign: 'right', color: 'var(--gold)', fontSize: 15, fontWeight: 'bold' }}>
                          {factor > 0 ? fmt(costoCalculado) : fmt(receta.costoBase)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} style={{ padding: '3px 6px', fontSize: 11, color: 'var(--dim)' }}>{receta.rendimiento}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Pasos de elaboración */}
            {receta && (
              <>
                <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Elaboración</div>
                <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {receta.pasos.map((paso, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12, lineHeight: 1.6 }}>
                      <span style={{ minWidth: 22, height: 22, borderRadius: '50%', background: 'var(--gold-bg)', border: '1px solid var(--gold-d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--gold)', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span>{paso}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Panel derecho: Iniciar orden ── */}
      <div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Iniciar Orden de Producción</div>
        {!prod ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 40, color: 'var(--dim)', fontSize: 13, textAlign: 'center', boxShadow: 'var(--shadow)' }}>
            Seleccioná un producto para iniciar una orden
          </div>
        ) : (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--gold-bg)', border: '1px solid var(--gold-d)', borderRadius: 8, fontSize: 13 }}>
              <strong style={{ color: 'var(--gold)' }}>{prod.nombre}</strong><br />
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>Stock actual: {fmtN(prod.stock_kg)} kg · Vida útil: {prod.vida_util_dias} días</span>
              {kgProt > 0 && receta && (
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  Desde calculadora: <strong style={{ color: 'var(--gold)' }}>{fmtN(kgProducto, 2)} kg</strong> de producto estimado
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={lbl}>Cantidad a producir (kg)</label>
                <input type="number" value={pfCant} onChange={e => setPfCant(e.target.value)} min="0.1" step="0.1" />
                {receta && kgProt > 0 && (
                  <button onClick={() => setPfCant(fmtN(kgProducto, 2))} style={{ marginTop: 4, fontSize: 10, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                    ↑ Usar {fmtN(kgProducto, 2)} kg de la calculadora
                  </button>
                )}
              </div>
              <div><label style={lbl}>Fecha de producción</label><input type="date" value={pfFecha} onChange={e => setPfFecha(e.target.value)} /></div>
              <div><label style={lbl}>Número de lote</label><input value={pfLote} onChange={e => setPfLote(e.target.value)} /></div>
              <div><label style={lbl}>Responsable</label><input value={pfResp} onChange={e => setPfResp(e.target.value)} placeholder="Nombre" /></div>
            </div>

            <div style={{ marginBottom: 12 }}><label style={lbl}>Notas</label><textarea value={pfNotas} onChange={e => setPfNotas(e.target.value)} rows={2} /></div>

            {pfCant && venceISO && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6 }}>
                Costo estimado: <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{fmt(receta ? receta.costoBase * parseFloat(pfCant) : 0)}</span>
                {'  ·  '}Vence: <strong>{fechaES(venceISO)}</strong>
              </div>
            )}

            <button onClick={crearOrden} disabled={savingOrden} style={{ ...b('gold'), width: '100%', padding: '10px', fontSize: 14, opacity: savingOrden ? 0.6 : 1 }}>
              {savingOrden ? 'Creando...' : 'Crear orden + ir a etiquetas →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
