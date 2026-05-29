'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today, fechaES, dateAddISO, round500 } from '@/lib/utils'
import type { Producto } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'
import { useRouter } from 'next/navigation'

// ── Redondeo al múltiplo de 500 más cercano ──
// ── Recetas con costos base por ingrediente ──
interface Ing { nombre: string; qty: number; unidad: 'kg' | 'lts' | 'u'; precio: number }
interface Receta {
  proteina: string
  proteinaPorKgProducto: number
  merma: number
  costoBase: number
  rendimiento: string
  ingredientes: Ing[]
  pasos: string[]
}

const RECETAS_BASE: Record<string, Receta> = {
  'Milanesa de Pollo s/provenzal': {
    proteina: 'Pechuga de pollo', proteinaPorKgProducto: 0.5, merma: 0.05, costoBase: 5310.56,
    rendimiento: 'Costo planilla $5.311/kg · Merma 5%',
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
    pasos: ['Mise en place: baño huevo+mostaza+sal+pimienta y pan rallado+crunch', 'Filetear: cortes parejos 8–10 mm', 'Empanado: (1) baño húmedo → (2) mezcla pan+crunch. Presionar', 'Envasar al vacío. Etiquetar con fecha y lote', 'Congelar plano −18°C (~4 hs sin apilar)'],
  },
  'Milanesa de Pollo c/provenzal': {
    proteina: 'Pechuga de pollo', proteinaPorKgProducto: 0.5, merma: 0.05, costoBase: 6160.98,
    rendimiento: 'Costo planilla $6.161/kg · Merma 5%',
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
    pasos: ['Mezclar perejil + ajo en polvo al pan rallado antes de comenzar', 'Filetear 8–10 mm', 'Empanado: (1) baño → (2) mezcla pan+provenzal', 'Envasar diferenciando de versión sin provenzal'],
  },
  'Milanesa de Nalga UG': {
    proteina: 'Nalga (fileteada)', proteinaPorKgProducto: 0.5, merma: 0.05, costoBase: 14543.90,
    rendimiento: 'Costo planilla $14.544/kg · Merma 5%',
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
    pasos: ['Nalga UG color rojo intenso. Filetear 8–10 mm siguiendo fibra', 'Baño húmedo 5 min. Empanado doble (×2 baño, ×2 pan)', 'Reposo 10 min en frío antes de envasar', 'Envasar individual. Congelar plano −18°C'],
  },
  'Milanesa de Peceto': {
    proteina: 'Peceto (fileteado)', proteinaPorKgProducto: 0.85, merma: 0.05, costoBase: 11560.70,
    rendimiento: 'Costo planilla $11.561/kg · Merma 5%',
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
    pasos: ['Espesor 6–8 mm, golpear suavemente si viene grueso', 'Baño: huevo+leche+mostaza+sal+pimienta+ajo 3–5 min', 'Pan rallado solo (sin crunch). Congelar plano −18°C'],
  },
  'Milanesa de Carré de Cerdo': {
    proteina: 'Carré de cerdo', proteinaPorKgProducto: 0.9, merma: 0.05, costoBase: 9900,
    rendimiento: '85% sobre carré crudo · Pack 450–500 g',
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
    pasos: ['Filetear perpendicular 8–10 mm. Tiernizar 2–3 golpes suaves', 'Baño: huevo+leche+mostaza+sal+pimienta+ajo 5 min', 'Pan rallado + crunch. Envasar al vacío. Congelar plano −18°C'],
  },
  'Ribs Kansas BBQ': {
    proteina: 'Ribs de cerdo', proteinaPorKgProducto: 1.0, merma: 0.05, costoBase: 6682.55,
    rendimiento: 'Costo planilla $6.683/kg · Porciones 3–4 costillas ~400–500 g',
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
    pasos: ['Rub: pimentón+cayena+mostaza+clavo+canela+azúcar+sal+ajo+cebolla. RECETA PROPIETARIA', 'Cubrir y masajear. Reposo mínimo 2 hs (ideal 12 hs)', 'Retirar membrana del lado del hueso', 'Porcionar 3–4 costillas. Incluir bolsita rub extra', 'Horno 180°C × 45 min tapado + 15 min. O airfryer 160°C × 30 min'],
  },
  'Pechuguitas de Pollo': {
    proteina: 'Pechuga de pollo', proteinaPorKgProducto: 1.0, merma: 0.05, costoBase: 9955.31,
    rendimiento: 'Costo planilla $9.955/kg · Porciones 200–300 g',
    ingredientes: [
      { nombre: 'Pechuga de pollo', qty: 1.0, unidad: 'kg', precio: 9400 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Selección sin hematomas. Retirar filete interno y grasa', 'Porcionar: entera si 200–300 g, cortar si >350 g', 'Envasar individual al vacío. Congelar plano −18°C'],
  },
  'Medallones de Pollo × 12': {
    proteina: 'Recortes de pechuga', proteinaPorKgProducto: 0.9, merma: 0.01, costoBase: 7645.18,
    rendimiento: 'Costo planilla $7.645/pack · 480–500 g (12 u × ~40 g)',
    ingredientes: [
      { nombre: 'Recortes de pechuga', qty: 0.9, unidad: 'kg', precio: 6700 },
      { nombre: 'Pan rallado', qty: 0.2, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado Crunch', qty: 0.1, unidad: 'kg', precio: 4180 },
      { nombre: 'Mostaza', qty: 0.1, unidad: 'kg', precio: 2815.33 },
      { nombre: 'Sal fina', qty: 0.01, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.005, unidad: 'kg', precio: 78600 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Picar pechuga textura gruesa. Mezclar mostaza+sal+pimienta', 'Porcionar ~40 g con aro. Empanado húmedo + pan+crunch', '12 medallones uniformes. Envasar en una capa. Congelar plano −18°C'],
  },
  'Medallones de Pollo × 6': {
    proteina: 'Recortes de pechuga', proteinaPorKgProducto: 0.55, merma: 0.01, costoBase: 4274.94,
    rendimiento: 'Costo planilla $4.275/pack · 240–250 g netos',
    ingredientes: [
      { nombre: 'Recortes de pechuga', qty: 0.55, unidad: 'kg', precio: 6700 },
      { nombre: 'Pan rallado', qty: 0.0375, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado Crunch', qty: 0.0125, unidad: 'kg', precio: 4180 },
      { nombre: 'Mostaza', qty: 0.05, unidad: 'kg', precio: 2815.33 },
      { nombre: 'Sal fina', qty: 0.005, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.0025, unidad: 'kg', precio: 78600 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Misma técnica que ×12 — producir en el mismo batch y separar al envasar', '6 medallones de ~40 g. Etiquetar: "Medallones × 6"'],
  },
  'Caritas de Papa': {
    proteina: 'Caritas congeladas', proteinaPorKgProducto: 1.0, merma: 0, costoBase: 7525.69,
    rendimiento: 'Costo $7.526/kg · Reventa fraccionada',
    ingredientes: [
      { nombre: 'Caritas congeladas', qty: 1.0, unidad: 'kg', precio: 7444.44 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Verificar llegada ≤ −15°C. Fraccionar en ≤15 min. Recongelar −18°C'],
  },
  'Bastones de Papa': {
    proteina: 'Papas bastón congeladas', proteinaPorKgProducto: 1.0, merma: 0, costoBase: 4414.58,
    rendimiento: 'Costo $4.415/kg · Reventa fraccionada',
    ingredientes: [
      { nombre: 'Papas bastón congeladas', qty: 1.0, unidad: 'kg', precio: 4333.33 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Verificar ≤ −15°C. Fraccionar en ≤15 min. Respetar fecha proveedor. Recongelar'],
  },
  'Papas Noisette': {
    proteina: 'Papas Noisette congeladas', proteinaPorKgProducto: 1.0, merma: 0, costoBase: 7381.25,
    rendimiento: 'Costo $7.381/kg · Reventa fraccionada',
    ingredientes: [
      { nombre: 'Papas Noisette congeladas', qty: 1.0, unidad: 'kg', precio: 7300 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Verificar ≤ −15°C. No mezclar lotes. Fraccionar en ≤15 min. Recongelar'],
  },
  'Nuggets Crocantes': {
    proteina: 'Nuggets crocantes (Sadia)', proteinaPorKgProducto: 1.0, merma: 0, costoBase: 9281.25,
    rendimiento: 'Costo $9.281/kg · Reventa fraccionada',
    ingredientes: [
      { nombre: 'Nuggets crocantes (Sadia)', qty: 1.0, unidad: 'kg', precio: 9200 },
      { nombre: 'Film / envase unitario', qty: 1, unidad: 'u', precio: 81.25 },
    ],
    pasos: ['Verificar ≤ −15°C. Evaluar sin apelmazamiento. Fraccionar ≤10 min. Recongelar. NO microondas'],
  },
}

// ── Calcular costo de receta con precios actualizados ──
function calcularCosto(receta: Receta, preciosActuales: Record<string, number>): number {
  const raw = receta.ingredientes.reduce((s, ing) => {
    const precio = preciosActuales[ing.nombre] ?? ing.precio
    return s + ing.qty * precio
  }, 0)
  return raw * (1 + receta.merma)
}

// ── Obtener todos los ingredientes únicos del sistema ──
function getIngredientesUnicos(): Record<string, number> {
  const mapa: Record<string, number> = {}
  Object.values(RECETAS_BASE).forEach(r => {
    r.ingredientes.forEach(ing => {
      if (!mapa[ing.nombre]) mapa[ing.nombre] = ing.precio
    })
  })
  return mapa
}

const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }
const b = (v?: 'gold' | 'blue' | 'red'): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 6,
  border: `1px solid ${v === 'gold' ? 'var(--gold)' : v === 'blue' ? 'rgba(30,100,180,.3)' : v === 'red' ? 'rgba(190,50,50,.3)' : 'var(--border)'}`,
  background: v === 'gold' ? 'var(--gold)' : v === 'blue' ? 'rgba(30,100,180,.08)' : v === 'red' ? 'rgba(190,50,50,.08)' : 'var(--card)',
  color: v === 'gold' ? '#fff' : v === 'blue' ? '#1050a0' : v === 'red' ? '#aa2020' : 'var(--text)',
  cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif',
})

type TabType = 'ficha' | 'precios'

interface ImpactoProducto {
  nombre: string
  id: number
  costoActual: number
  costoNuevo: number
  pvActual: number
  pvNuevo: number
  pvNuevoRedondeado: number
  fc: number
}

export function FichasClient() {
  const [prods, setProds] = useState<Producto[]>([])
  const [sel, setSel] = useState<number | ''>('')
  const [kgProteina, setKgProteina] = useState('5')
  const [tab, setTab] = useState<TabType>('ficha')

  // Edición producto
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

  // Precios ingredientes
  const [preciosActuales, setPreciosActuales] = useState<Record<string, number>>(getIngredientesUnicos)
  const [preciosEditados, setPreciosEditados] = useState<Record<string, number>>({})
  const [impacto, setImpacto] = useState<ImpactoProducto[]>([])
  const [showImpacto, setShowImpacto] = useState(false)
  const [applyingPrecios, setApplyingPrecios] = useState(false)
  const [searchIng, setSearchIng] = useState('')

  const router = useRouter()

  useEffect(() => {
    supabase.from('productos').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => {
      const todos = data && data.length ? data : PRODUCTOS_DEFAULT.map((p, i) => ({ ...p, id: i + 1 })) as Produto[]
      // Mostrar solo elaborados (con receta): excluir JUMBALAY, CORTES, EMBUTIDOS
      // excepto los que tengan tipo_producto='elaborado' explícito
      const conReceta = todos.filter((p: any) =>
        p.tipo_producto === 'elaborado' ||
        (!['JUMBALAY','CORTES','EMBUTIDOS'].includes(p.categoria) && p.tipo_producto !== 'reventa')
      )
      setProds(conReceta as Producto[])
    })
    supabase.from('ordenes_produccion').select('*', { count: 'exact', head: true })
      .then(({ count }) => setPfLote('L' + String((count ?? 0) + 1).padStart(3, '0')))
  }, [])

  const prod = prods.find(p => p.id === sel)
  const receta = prod ? RECETAS_BASE[prod.nombre] : null

  const kgProt = parseFloat(kgProteina) || 0
  const kgProducto = receta && kgProt > 0 ? parseFloat((kgProt / receta.proteinaPorKgProducto).toFixed(3)) : 0
  const factor = kgProducto
  const costoCalculado = receta && factor > 0 ? calcularCosto(receta, { ...preciosActuales, ...preciosEditados }) * factor : 0
  const venceISO = prod && pfFecha ? dateAddISO(pfFecha, prod.vida_util_dias) : ''

  // ── Calcular impacto de cambios de precio ──
  function calcularImpacto() {
    const preciosMergeados = { ...preciosActuales, ...preciosEditados }
    const resultado: ImpactoProducto[] = []

    Object.entries(RECETAS_BASE).forEach(([nombreReceta, receta]) => {
      const producto = prods.find(p => p.nombre === nombreReceta)
      if (!producto) return

      // Ver si algún ingrediente editado aparece en esta receta
      const afectado = receta.ingredientes.some(ing => ing.nombre in preciosEditados)
      if (!afectado) return

      const costoActual = calcularCosto(receta, preciosActuales)
      const costoNuevo = calcularCosto(receta, preciosMergeados)
      const fc = producto.costo / producto.precio_venta // mantener el FC%
      const pvNuevo = costoNuevo / fc
      const pvNuevoRedondeado = round500(pvNuevo)

      resultado.push({
        nombre: nombreReceta,
        id: producto.id,
        costoActual,
        costoNuevo,
        pvActual: producto.precio_venta,
        pvNuevo,
        pvNuevoRedondeado,
        fc,
      })
    })

    setImpacto(resultado)
    setShowImpacto(true)
  }

  // ── Aplicar cambios de precio en Supabase ──
  async function aplicarCambios() {
    setApplyingPrecios(true)
    try {
      // Actualizar precios de ingredientes en memoria
      const nuevosPreciosActuales = { ...preciosActuales, ...preciosEditados }
      setPreciosActuales(nuevosPreciosActuales)

      // Actualizar cada producto afectado en Supabase
      for (const item of impacto) {
        await supabase.from('productos').update({
          costo: item.costoNuevo,
          precio_venta: item.pvNuevoRedondeado,
        }).eq('id', item.id)
      }

      // Actualizar estado local
      setProds(prev => prev.map(p => {
        const item = impacto.find(i => i.id === p.id)
        if (item) return { ...p, costo: item.costoNuevo, precio_venta: item.pvNuevoRedondeado }
        return p
      }))

      setPreciosEditados({})
      setShowImpacto(false)
      alert(`✓ Precios actualizados: ${impacto.length} producto${impacto.length !== 1 ? 's' : ''} actualizado${impacto.length !== 1 ? 's' : ''}`)
    } catch (e) { console.error(e); alert('Error al aplicar cambios') }
    setApplyingPrecios(false)
  }

  // Edición producto
  function abrirEdicion() {
    if (!prod) return
    setEpv(String(prod.precio_venta)); setEcosto(String(prod.costo))
    setEstock(String(prod.stock_kg)); setEvida(String(prod.vida_util_dias))
    setEinst(prod.instrucciones || ''); setEditMode(true)
  }
  async function guardarEdicion() {
    if (!prod) return
    setSaving(true)
    const updates = { precio_venta: parseFloat(epv), costo: parseFloat(ecosto), stock_kg: parseFloat(estock), vida_util_dias: parseInt(evida), instrucciones: einst }
    await supabase.from('productos').update(updates).eq('id', prod.id)
    setProds(prev => prev.map(p => p.id === prod.id ? { ...p, ...updates } : p))
    setEditMode(false); setSaving(false)
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
    } catch (e) { console.error(e) }
    setSavingOrden(false)
  }

  const ingredientesLista = Object.entries(preciosActuales)
    .filter(([nombre]) => !searchIng || nombre.toLowerCase().includes(searchIng.toLowerCase()))
    .sort((a, b) => a[0].localeCompare(b[0]))

  const tieneEdiciones = Object.keys(preciosEditados).length > 0

  return (
    <div>
      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['ficha', '📋 Fichas técnicas'], ['precios', '💰 Actualizar precios de ingredientes']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t as TabType)} style={{
            padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif',
            border: tab === t ? '1px solid var(--gold)' : '1px solid var(--border)',
            background: tab === t ? 'var(--gold-bg)' : 'var(--card)',
            color: tab === t ? 'var(--gold)' : 'var(--muted)',
          }}>{label}</button>
        ))}
      </div>

      {/* ══════════════════════════════ TAB: FICHAS ══════════════════════════════ */}
      {tab === 'ficha' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
            📋 Las fichas técnicas corresponden a <strong>productos de elaboración propia</strong>. Los productos de reventa (Jumbalay, CSR, cortes) solo requieren ajuste de stock desde la solapa Productos.
          </div>
        <div className="fichas-grid">
          {/* Panel izquierdo */}
          <div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: 'var(--shadow)' }}>
              <select value={sel} onChange={e => { setSel(e.target.value ? parseInt(e.target.value) : ''); setEditMode(false) }} style={{ width: '100%' }}>
                <option value="">— Seleccionar producto —</option>
                {prods.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            {prod && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>{prod.nombre}</div>
                  <button onClick={editMode ? guardarEdicion : abrirEdicion} disabled={saving}
                    style={{ ...b(editMode ? 'gold' : undefined), padding: '4px 10px', fontSize: 11 }}>
                    {saving ? 'Guardando...' : editMode ? '✓ Guardar' : '✏ Editar'}
                  </button>
                </div>

                {!editMode ? (
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, marginBottom: 10 }}>
                    <span>PV: <strong style={{ color: 'var(--gold)' }}>{fmt(prod.precio_venta)}/kg</strong></span>
                    <span>Costo: <strong>{fmt(prod.costo)}/kg</strong></span>
                    <span>FC: <strong>{(prod.costo / prod.precio_venta * 100).toFixed(0)}%</strong></span>
                    <span>Margen: <strong>{fmt(prod.precio_venta - prod.costo)}/kg</strong></span>
                    <span>Stock: <strong style={{ color: prod.stock_kg < 2 ? '#aa2020' : prod.stock_kg < 5 ? '#a85010' : '#1a7a40' }}>{fmtN(prod.stock_kg)} {(prod as any).unidad_venta === 'u' ? 'u' : 'kg'}</strong></span>
                    <span>Vida: <strong>{prod.vida_util_dias} días</strong></span>
                  </div>
                ) : (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8, marginBottom: 8 }}>
                      <div><label style={lbl}>PV ($/kg)</label><input type="number" value={epv} onChange={e => setEpv(e.target.value)} /></div>
                      <div><label style={lbl}>Costo ($/kg)</label><input type="number" value={ecosto} onChange={e => setEcosto(e.target.value)} /></div>
                      <div><label style={lbl}>Stock (kg)</label><input type="number" value={estock} onChange={e => setEstock(e.target.value)} /></div>
                      <div><label style={lbl}>Vida útil (días)</label><input type="number" value={evida} onChange={e => setEvida(e.target.value)} /></div>
                    </div>
                    <div><label style={lbl}>Instrucciones cocción</label><textarea value={einst} onChange={e => setEinst(e.target.value)} rows={2} /></div>
                    <button onClick={() => setEditMode(false)} style={{ ...b(), marginTop: 8, fontSize: 11, padding: '4px 10px' }}>Cancelar</button>
                  </div>
                )}

                {prod.instrucciones && !editMode && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, padding: '8px 10px', background: 'var(--bg)', borderRadius: 6, borderLeft: '3px solid var(--gold)' }}>{prod.instrucciones}</div>
                )}

                {/* Calculadora */}
                {receta && (
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Calculadora de producción</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Tengo</span>
                      <input type="number" value={kgProteina} onChange={e => setKgProteina(e.target.value)} min="0.1" step="0.5" style={{ width: 80, fontSize: 14, fontWeight: 'bold' }} />
                      <span style={{ fontSize: 13 }}>kg de <strong>{receta.proteina}</strong></span>
                    </div>
                    {kgProt > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', background: 'var(--gold-bg)', border: '1px solid var(--gold-d)', borderRadius: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>→ Produce aprox.</span>
                        <span style={{ fontSize: 22, color: 'var(--gold)', fontWeight: 'bold' }}>{fmtN(kgProducto, 2)} kg</span>
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>terminado</span>
                      </div>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead><tr>
                          {['Ingrediente', 'Cantidad', 'Precio/u', 'Costo'].map(h => (
                            <th key={h} style={{ textAlign: h === 'Costo' || h === 'Precio/u' ? 'right' : 'left', padding: '5px 6px', fontSize: 10, color: 'var(--muted)', borderBottom: '1px solid var(--border)', letterSpacing: 1, textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {receta.ingredientes.map((ing, i) => {
                            const precioUso = preciosActuales[ing.nombre] ?? ing.precio
                            const cantReal = factor > 0 ? (ing.unidad === 'u' ? Math.ceil(ing.qty * factor) : ing.qty * factor) : ing.qty
                            const costoIng = precioUso * (typeof cantReal === 'number' ? cantReal : 0)
                            const esProteina = ing.nombre === receta.proteina
                            return (
                              <tr key={i} style={{ background: esProteina ? 'rgba(154,122,26,.06)' : 'transparent' }}>
                                <td style={{ padding: '5px 6px', borderBottom: '1px solid var(--borderl)', fontWeight: esProteina ? 'bold' : 'normal' }}>
                                  {esProteina && <span style={{ color: 'var(--gold)', marginRight: 4 }}>★</span>}{ing.nombre}
                                </td>
                                <td style={{ padding: '5px 6px', borderBottom: '1px solid var(--borderl)', color: esProteina ? 'var(--gold)' : 'var(--text)', fontWeight: esProteina ? 'bold' : 'normal' }}>
                                  {ing.unidad === 'u' ? `${Math.ceil(ing.qty * Math.max(factor, 1))} u` : `${fmtN(ing.qty * Math.max(factor, 1), 3)} ${ing.unidad}`}
                                </td>
                                <td style={{ padding: '5px 6px', borderBottom: '1px solid var(--borderl)', textAlign: 'right', color: 'var(--muted)', fontSize: 11 }}>{fmt(precioUso)}</td>
                                <td style={{ padding: '5px 6px', borderBottom: '1px solid var(--borderl)', textAlign: 'right', fontSize: 11 }}>{factor > 0 ? fmt(costoIng) : '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          {receta.merma > 0 && <tr><td colSpan={3} style={{ padding: '5px 6px', fontSize: 11, color: 'var(--dim)' }}>+ Merma {(receta.merma * 100).toFixed(0)}%</td><td></td></tr>}
                          <tr>
                            <td colSpan={3} style={{ padding: '6px 6px 2px', fontSize: 13, fontWeight: 'bold' }}>Costo total estimado</td>
                            <td style={{ padding: '6px 6px 2px', textAlign: 'right', color: 'var(--gold)', fontSize: 15, fontWeight: 'bold' }}>{factor > 0 ? fmt(costoCalculado) : fmt(receta.costoBase)}</td>
                          </tr>
                          <tr><td colSpan={4} style={{ padding: '3px 6px', fontSize: 11, color: 'var(--dim)' }}>{receta.rendimiento}</td></tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pasos */}
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

          {/* Panel derecho: Orden */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Iniciar Orden de Producción</div>
            {!prod ? (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 40, color: 'var(--dim)', fontSize: 13, textAlign: 'center', boxShadow: 'var(--shadow)' }}>
                Seleccioná un producto
              </div>
            ) : (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>
                <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--gold-bg)', border: '1px solid var(--gold-d)', borderRadius: 8, fontSize: 13 }}>
                  <strong style={{ color: 'var(--gold)' }}>{prod.nombre}</strong><br />
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>Stock: {fmtN(prod.stock_kg)} {(prod as any).unidad_venta === 'u' ? 'u' : 'kg'} · Vida útil: {prod.vida_util_dias} días</span>
                  {kgProt > 0 && receta && <div style={{ marginTop: 6, fontSize: 12 }}>Desde calculadora: <strong style={{ color: 'var(--gold)' }}>{fmtN(kgProducto, 2)} kg</strong></div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={lbl}>Cantidad a producir (kg)</label>
                    <input type="number" value={pfCant} onChange={e => setPfCant(e.target.value)} min="0.1" step="0.1" />
                    {receta && kgProt > 0 && (
                      <button onClick={() => setPfCant(fmtN(kgProducto, 2))} style={{ marginTop: 4, fontSize: 10, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        ↑ Usar {fmtN(kgProducto, 2)} kg
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
                    Costo estimado: <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{fmt(receta ? receta.costoBase * parseFloat(pfCant) : 0)}</span>{'  ·  '}Vence: <strong>{fechaES(venceISO)}</strong>
                  </div>
                )}
                <button onClick={crearOrden} disabled={savingOrden} style={{ ...b('gold'), width: '100%', padding: '10px', fontSize: 14, opacity: savingOrden ? 0.6 : 1 }}>
                  {savingOrden ? 'Creando...' : 'Crear orden + ir a etiquetas →'}
                </button>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* ══════════════════════════════ TAB: PRECIOS ══════════════════════════════ */}
      {tab === 'precios' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>Precios de ingredientes</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Editá el precio de cualquier ingrediente. El sistema recalcula automáticamente el costo y el PV de todos los productos afectados, redondeando a $500.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {tieneEdiciones && (
                <>
                  <button onClick={() => setPreciosEditados({})} style={b()}>Descartar cambios</button>
                  <button onClick={calcularImpacto} style={b('blue')}>Ver impacto ({Object.keys(preciosEditados).length} ingrediente{Object.keys(preciosEditados).length !== 1 ? 's' : ''})</button>
                </>
              )}
            </div>
          </div>

          {/* Buscador */}
          <div style={{ marginBottom: 14 }}>
            <input value={searchIng} onChange={e => setSearchIng(e.target.value)} placeholder="Buscar ingrediente..." style={{ maxWidth: 300 }} />
          </div>

          {/* Tabla de ingredientes */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)', marginBottom: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Ingrediente', 'Precio actual', 'Precio nuevo', 'Δ Variación', 'Productos afectados'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, color: 'var(--muted)', borderBottom: '1px solid var(--border)', letterSpacing: 1, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ingredientesLista.map(([nombre, precioActual]) => {
                    const precioNuevo = preciosEditados[nombre]
                    const variacion = precioNuevo ? ((precioNuevo - precioActual) / precioActual * 100) : 0
                    const productosAfectados = Object.entries(RECETAS_BASE)
                      .filter(([, r]) => r.ingredientes.some(ing => ing.nombre === nombre))
                      .map(([n]) => n.split(' ').slice(0, 3).join(' '))
                    return (
                      <tr key={nombre}>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', fontWeight: nombre in preciosEditados ? 'bold' : 'normal' }}>
                          {nombre in preciosEditados && <span style={{ color: 'var(--gold)', marginRight: 6 }}>●</span>}
                          {nombre}
                        </td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--muted)' }}>{fmt(precioActual)}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', width: 140 }}>
                          <input
                            type="number"
                            value={precioNuevo ?? ''}
                            placeholder={String(Math.round(precioActual))}
                            onChange={e => {
                              const val = parseFloat(e.target.value)
                              if (isNaN(val) || val <= 0) {
                                const { [nombre]: _, ...rest } = preciosEditados
                                setPreciosEditados(rest)
                              } else {
                                setPreciosEditados(prev => ({ ...prev, [nombre]: val }))
                              }
                            }}
                            style={{ fontSize: 13, padding: '5px 8px', width: '100%', borderColor: precioNuevo ? 'var(--gold-d)' : 'var(--border)' }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', fontSize: 12 }}>
                          {precioNuevo ? (
                            <span style={{ color: variacion > 0 ? '#aa2020' : '#1a7a40', fontWeight: 'bold' }}>
                              {variacion > 0 ? '↑' : '↓'} {Math.abs(variacion).toFixed(1)}%
                            </span>
                          ) : <span style={{ color: 'var(--dim)' }}>—</span>}
                        </td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', fontSize: 11, color: 'var(--muted)' }}>
                          {productosAfectados.slice(0, 3).join(' · ')}{productosAfectados.length > 3 ? ` +${productosAfectados.length - 3}` : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel de impacto */}
          {showImpacto && impacto.length > 0 && (
            <div style={{ background: 'var(--card)', border: '2px solid var(--gold-d)', borderRadius: 8, padding: 16, boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--gold)' }}>Impacto en precios de venta</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Los precios de venta se calculan manteniendo el FC% actual. Redondeados siempre hacia arriba al múltiplo de $500 siguiente (ej: $14.851 → $15.000, $25.691 → $26.000).
                  </div>
                </div>
                <button onClick={() => setShowImpacto(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>

              <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Producto', 'FC%', 'Costo anterior', 'Costo nuevo', 'PV anterior', 'PV calculado', 'PV nuevo (×$500)'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, color: 'var(--muted)', borderBottom: '1px solid var(--border)', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {impacto.map(item => (
                      <tr key={item.id}>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', fontWeight: 'bold' }}>{item.nombre}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--muted)' }}>{(item.fc * 100).toFixed(0)}%</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--muted)', textDecoration: 'line-through' }}>{fmt(item.costoActual)}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: item.costoNuevo > item.costoActual ? '#aa2020' : '#1a7a40', fontWeight: 'bold' }}>
                          {fmt(item.costoNuevo)}
                          <span style={{ fontSize: 10, marginLeft: 4 }}>
                            ({item.costoNuevo > item.costoActual ? '+' : ''}{((item.costoNuevo - item.costoActual) / item.costoActual * 100).toFixed(1)}%)
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--muted)', textDecoration: 'line-through' }}>{fmt(item.pvActual)}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--muted)', fontSize: 11 }}>{fmt(item.pvNuevo)}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--gold)', fontWeight: 'bold', fontSize: 15 }}>
                          {fmt(item.pvNuevoRedondeado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowImpacto(false)} style={b()}>Revisar cambios</button>
                <button onClick={aplicarCambios} disabled={applyingPrecios} style={{ ...b('gold'), padding: '10px 20px', fontSize: 13, opacity: applyingPrecios ? 0.6 : 1 }}>
                  {applyingPrecios ? 'Aplicando...' : `✓ Confirmar y actualizar ${impacto.length} producto${impacto.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {showImpacto && impacto.length === 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Los ingredientes editados no afectan a ningún producto con receta en el sistema.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
