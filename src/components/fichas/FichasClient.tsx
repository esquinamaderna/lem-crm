'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fmtN, today, fechaES, dateAddISO } from '@/lib/utils'
import type { Producto } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'
import { useRouter } from 'next/navigation'

// Recetas: ingredientes por 1 kg de PRODUCTO TERMINADO
// La "proteína" es el ingrediente principal — desde ahí se calcula todo
const RECETAS: Record<string, {
  proteina: string          // nombre del ingrediente principal
  proteinaPorKgProducto: number  // kg de proteína por kg de producto terminado
  merma: number             // factor de merma (ej: 0.05 = 5%)
  rendimiento: string       // descripción del rendimiento esperado
  ingredientes: { nombre: string; qty: number; unidad: string; precio: number }[]
  pasos: string[]
}> = {
  'Milanesa de Pollo s/provenzal': {
    proteina: 'Pechuga de pollo',
    proteinaPorKgProducto: 0.9,
    merma: 0.01,
    rendimiento: '85–88% sobre peso bruto pechuga',
    ingredientes: [
      { nombre: 'Pechuga de pollo', qty: 0.9, unidad: 'kg', precio: 6700 },
      { nombre: 'Pan rallado', qty: 0.2, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado crunch', qty: 0.1, unidad: 'kg', precio: 4180 },
      { nombre: 'Mostaza', qty: 0.1, unidad: 'kg', precio: 2815 },
      { nombre: 'Sal fina', qty: 0.01, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.005, unidad: 'kg', precio: 78600 },
      { nombre: 'Rollo vacío gofrado', qty: 1, unidad: 'u', precio: 81 },
    ],
    pasos: ['Mise en place: descongelar pechuga, preparar recipientes con baño de huevo+mostaza+sal+pimienta y pan rallado+crunch', 'Fileteo: cortes parejos de 8–10 mm. Descartar bordes irregulares', 'Empanado: (1) mostaza+huevo → (2) pan rallado+crunch. Presionar suavemente. NO humedecer en exceso', 'Control de calidad: grosor uniforme del rebozado, sin huecos ni exceso de pan', 'Envasado: film gofrado, sellar al vacío. Etiquetar: producto, fecha, vencimiento (90 días congelado), lote', 'Congelado: plano a −18°C, no apilar hasta congelación completa (~4 hs)'],
  },
  'Milanesa de Pollo c/provenzal': {
    proteina: 'Pechuga de pollo',
    proteinaPorKgProducto: 0.9,
    merma: 0.01,
    rendimiento: '85–88% sobre peso bruto pechuga',
    ingredientes: [
      { nombre: 'Pechuga de pollo', qty: 0.9, unidad: 'kg', precio: 6700 },
      { nombre: 'Pan rallado', qty: 0.2, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado crunch', qty: 0.1, unidad: 'kg', precio: 4180 },
      { nombre: 'Mostaza', qty: 0.1, unidad: 'kg', precio: 2815 },
      { nombre: 'Condimento provenzal', qty: 0.01, unidad: 'kg', precio: 17700 },
      { nombre: 'Sal fina', qty: 0.01, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.005, unidad: 'kg', precio: 78600 },
      { nombre: 'Rollo vacío gofrado', qty: 1, unidad: 'u', precio: 81 },
    ],
    pasos: ['Mise en place: igual que sin provenzal. Agregar condimento provenzal al pan rallado (mezclar bien antes)', 'Fileteo: cortes de 8–10 mm. Mantener uniformidad', 'Empanado: (1) huevo+mostaza → (2) mezcla pan+provenzal. El provenzal debe quedar distribuido uniformemente', 'Control: verificar cobertura aromática pareja. Color del rebozado levemente más oscuro', 'Envasado y congelado: mismo protocolo que versión sin provenzal. Etiquetar diferenciando'],
  },
  'Milanesa de Nalga UG': {
    proteina: 'Nalga cruda (Unión Ganadera)',
    proteinaPorKgProducto: 0.85,
    merma: 0.05,
    rendimiento: 'Stock máximo recomendado: 15 kg por ciclo',
    ingredientes: [
      { nombre: 'Nalga cruda (Unión Ganadera)', qty: 0.85, unidad: 'kg', precio: 20000 },
      { nombre: 'Pan rallado', qty: 0.2765, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado crunch', qty: 0.068, unidad: 'kg', precio: 4180 },
      { nombre: 'Huevos frescos', qty: 3.6, unidad: 'u', precio: 197 },
      { nombre: 'Leche', qty: 0.05, unidad: 'lts', precio: 1739 },
      { nombre: 'Sal fina', qty: 0.005, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.001, unidad: 'kg', precio: 78600 },
      { nombre: 'Ajo en polvo', qty: 0.002, unidad: 'kg', precio: 20800 },
      { nombre: 'Condimento provenzal', qty: 0.005, unidad: 'kg', precio: 17700 },
      { nombre: 'Rollo vacío gofrado', qty: 1, unidad: 'u', precio: 81 },
    ],
    pasos: ['Selección: nalga UG, color rojo intenso, sin manchas grises. Conservar en frío hasta fileteo', 'Fileteo: 8–10 mm siguiendo la fibra muscular. Piezas grandes y uniformes — este corte es el diferenciador premium', 'Baño húmedo: huevo batido + leche + mostaza + sal + pimienta + ajo. Sumergir filetes 5 min', 'Empanado doble: (1) baño → (2) pan. Repetir: (3) baño → (4) pan. El doble empanado es característica premium', 'Reposo pre-congelado: 10 min en frío antes de envasar — asienta el rebozado', 'Envasado: individual en rollo gofrado. Etiquetar: "Nalga Unión Ganadera", fecha, lote, vencimiento 90 días', 'Congelado: plano a −18°C. No superponer hasta congelación total'],
  },
  'Milanesa de Peceto': {
    proteina: 'Peceto (fileteado)',
    proteinaPorKgProducto: 0.85,
    merma: 0.05,
    rendimiento: '82–85% sobre peceto crudo',
    ingredientes: [
      { nombre: 'Peceto (fileteado)', qty: 0.85, unidad: 'kg', precio: 11699 },
      { nombre: 'Pan rallado', qty: 0.15, unidad: 'kg', precio: 1696 },
      { nombre: 'Huevos frescos', qty: 2, unidad: 'u', precio: 197 },
      { nombre: 'Mostaza', qty: 0.01, unidad: 'kg', precio: 2815 },
      { nombre: 'Leche', qty: 0.05, unidad: 'lts', precio: 1739 },
      { nombre: 'Sal fina', qty: 0.005, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.001, unidad: 'kg', precio: 78600 },
      { nombre: 'Ajo en polvo', qty: 0.002, unidad: 'kg', precio: 20800 },
      { nombre: 'Rollo vacío gofrado', qty: 1, unidad: 'u', precio: 81 },
    ],
    pasos: ['Mise en place: verificar espesor 6–8 mm. Si viene muy grueso, golpear suavemente con mazo sobre film', 'Baño húmedo: huevo + leche + mostaza + sal + pimienta + ajo. Sumergir 3–5 min', 'Empanado: pan rallado solo (sin crunch — mantiene textura fina del peceto). Presionar suavemente', 'Envasado: rollo gofrado al vacío. Etiquetar: "Milanesa de Peceto", fecha, lote, vencimiento 90 días', 'Congelado: plano a −18°C'],
  },
  'Ribs Kansas BBQ': {
    proteina: 'Ribs de cerdo',
    proteinaPorKgProducto: 1.0,
    merma: 0.05,
    rendimiento: 'Porciones de 3–4 costillas, ~400–500 g/pack',
    ingredientes: [
      { nombre: 'Ribs de cerdo', qty: 1, unidad: 'kg', precio: 5300 },
      { nombre: 'Pimentón ahumado', qty: 0.02, unidad: 'kg', precio: 24360 },
      { nombre: 'Pimienta de cayena', qty: 0.007, unidad: 'kg', precio: 17900 },
      { nombre: 'Mostaza en polvo', qty: 0.005, unidad: 'kg', precio: 13470 },
      { nombre: 'Clavo de olor', qty: 0.001, unidad: 'kg', precio: 66040 },
      { nombre: 'Canela', qty: 0.002, unidad: 'kg', precio: 1099 },
      { nombre: 'Azúcar', qty: 0.01, unidad: 'kg', precio: 1099 },
      { nombre: 'Sal fina', qty: 0.01, unidad: 'kg', precio: 2650 },
      { nombre: 'Ajo en polvo', qty: 0.005, unidad: 'kg', precio: 20800 },
      { nombre: 'Cebolla en polvo', qty: 0.005, unidad: 'kg', precio: 8900 },
      { nombre: 'Rollo vacío gofrado', qty: 1, unidad: 'u', precio: 81 },
    ],
    pasos: ['Preparación del rub: mezclar pimentón ahumado + cayena + mostaza en polvo + clavo molido + canela + azúcar + sal + ajo + cebolla. RECETA PROPIETARIA — mantener confidencialidad', 'Aplicación del rub: cubrir ribs completamente, masajear cada costilla. Cubrir ambas caras y bordes', 'Reposo con rub: mínimo 2 hs en frío (ideal 12 hs overnight). CRÍTICO — no omitir', 'MEJORA: retirar membrana (pleura) del lado del hueso antes del rub — la carne se desprende limpiamente', 'Porcionado: 3–4 costillas, ~400–500 g por paquete', 'Envasado premium: rollo gofrado al vacío. INCLUIR bolsita kraft con rub extra dentro del pack', 'Instrucciones en etiqueta: Horno 180°C × 45 min tapado + 15 min descubierto. O airfryer 160°C × 30 min'],
  },
  'Medallones de Pollo × 12': {
    proteina: 'Pechuga de pollo',
    proteinaPorKgProducto: 0.5,
    merma: 0.01,
    rendimiento: 'Peso objetivo del pack: 480–500 g (12 u × ~40 g)',
    ingredientes: [
      { nombre: 'Pechuga de pollo', qty: 0.5, unidad: 'kg', precio: 6700 },
      { nombre: 'Pan rallado', qty: 0.0375, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado crunch', qty: 0.0125, unidad: 'kg', precio: 4180 },
      { nombre: 'Mostaza', qty: 0.05, unidad: 'kg', precio: 2815 },
      { nombre: 'Huevos frescos', qty: 2, unidad: 'u', precio: 197 },
      { nombre: 'Leche', qty: 0.08, unidad: 'lts', precio: 1739 },
      { nombre: 'Fécula de maíz', qty: 0.02, unidad: 'kg', precio: 2209 },
      { nombre: 'Sal fina', qty: 0.005, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.0025, unidad: 'kg', precio: 78600 },
      { nombre: 'Rollo vacío gofrado', qty: 1, unidad: 'u', precio: 81 },
    ],
    pasos: ['Mise en place: pechuga, huevos batidos con mostaza+leche+condimentos, pan rallado+crunch en bandeja, fécula lista', 'Picado y formado: picar pechuga a textura de carne picada gruesa. Mezclar con huevo+mostaza+sal+pimienta+leche. No sobre-trabajar', 'Porcionar: ~40 g c/u. Moldear en medallón redondo 7–8 cm diámetro × 1.5 cm espesor con aro de cocina', 'Empanado: (1) mezcla húmeda → (2) pan rallado+crunch. Presionar suavemente. El medallón debe mantener la forma', 'Control de calidad: 12 medallones con peso y tamaño similares. Descarte de piezas irregulares', 'Envasado: en una sola capa si el pack lo permite. Sellar al vacío. Etiquetar: "Medallones × 12", peso neto, fecha, lote', 'Congelado: plano a −18°C. No apilar hasta congelación completa'],
  },
  'Medallones de Pollo × 6': {
    proteina: 'Pechuga de pollo',
    proteinaPorKgProducto: 0.5,
    merma: 0.01,
    rendimiento: 'Peso pack objetivo: 240–250 g netos',
    ingredientes: [
      { nombre: 'Pechuga de pollo', qty: 0.25, unidad: 'kg', precio: 6700 },
      { nombre: 'Pan rallado', qty: 0.0188, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado crunch', qty: 0.0063, unidad: 'kg', precio: 4180 },
      { nombre: 'Mostaza', qty: 0.025, unidad: 'kg', precio: 2815 },
      { nombre: 'Huevos frescos', qty: 1, unidad: 'u', precio: 197 },
      { nombre: 'Leche', qty: 0.04, unidad: 'lts', precio: 1739 },
      { nombre: 'Fécula de maíz', qty: 0.01, unidad: 'kg', precio: 2209 },
      { nombre: 'Sal fina', qty: 0.0025, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.0013, unidad: 'kg', precio: 78600 },
      { nombre: 'Rollo vacío gofrado', qty: 1, unidad: 'u', precio: 81 },
    ],
    pasos: ['Misma técnica que Medallones × 12 — producir en el mismo batch y separar al envasar', 'Moldear 6 medallones de ~40 g c/u', 'Envasar los 6 juntos. Etiquetar: "Medallones × 6", peso neto, fecha, lote, vencimiento'],
  },
  'Pechuguitas de Pollo': {
    proteina: 'Pechuga de pollo',
    proteinaPorKgProducto: 1.0,
    merma: 0.05,
    rendimiento: 'Porciones de 200–300 g por pieza',
    ingredientes: [
      { nombre: 'Pechuga de pollo', qty: 1, unidad: 'kg', precio: 6700 },
      { nombre: 'Rollo vacío gofrado', qty: 1, unidad: 'u', precio: 81 },
    ],
    pasos: ['Selección: pechugas enteras sin hematomas, cortes ni grasa excesiva visible', 'Limpieza: retirar filete interno (usar en medallones o milas). Limpiar grasa y nervios', 'Porcionado: dejar entera si pesa 200–300 g, cortar si supera 350 g. Objetivo: porciones de presentación pareja', 'Envasado individual o de a 2 en rollo gofrado. El vacío es clave para mantener la presentación', 'Congelado: plano a −18°C. Vida útil: 90 días'],
  },
  'Milanesa de Carré de Cerdo': {
    proteina: 'Carré de cerdo',
    proteinaPorKgProducto: 0.9,
    merma: 0.05,
    rendimiento: '85% sobre carré crudo. Pack objetivo: 450–500 g',
    ingredientes: [
      { nombre: 'Carré de cerdo', qty: 0.9, unidad: 'kg', precio: 11000 },
      { nombre: 'Pan rallado', qty: 0.2, unidad: 'kg', precio: 1696 },
      { nombre: 'Pan rallado crunch', qty: 0.08, unidad: 'kg', precio: 4180 },
      { nombre: 'Huevos frescos', qty: 2, unidad: 'u', precio: 197 },
      { nombre: 'Mostaza', qty: 0.05, unidad: 'kg', precio: 2815 },
      { nombre: 'Leche', qty: 0.05, unidad: 'lts', precio: 1739 },
      { nombre: 'Sal fina', qty: 0.008, unidad: 'kg', precio: 2650 },
      { nombre: 'Pimienta negra molida', qty: 0.003, unidad: 'kg', precio: 78600 },
      { nombre: 'Ajo en polvo', qty: 0.003, unidad: 'kg', precio: 20800 },
      { nombre: 'Rollo vacío gofrado', qty: 1, unidad: 'u', precio: 81 },
    ],
    pasos: ['Selección: carré magro, color rosado pálido uniforme, sin exceso de grasa periférica', 'Fileteo: perpendicular a la fibra, medallones de 8–10 mm. Los extremos van a recortes o medallones de cerdo', 'Tiernizado: golpear con mazo 2–3 veces suavemente. No excederse. Objetivo: 6–7 mm espesor final', 'Baño húmedo: huevo + leche + mostaza + sal + pimienta + ajo. Sumergir 5 min', 'Empanado: pan rallado + crunch. Presionar bien. El carré es magro — el rebozado es la única capa de grasa', 'Envasado al vacío. Etiquetar: "Mila de Carré de Cerdo", peso, fecha, lote, vencimiento 90 días'],
  },
}

const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }
const b = (v?: 'gold'): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 6, border: `1px solid ${v === 'gold' ? 'var(--gold)' : 'var(--border)'}`, background: v === 'gold' ? 'var(--gold)' : 'var(--card)', color: v === 'gold' ? '#0f0f0f' : 'var(--text)', cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif' })

export function FichasClient() {
  const [prods, setProds] = useState<Producto[]>([])
  const [sel, setSel] = useState<number | ''>('')
  const [kgProteina, setKgProteina] = useState('5') // KG DE PROTEÍNA CRUDA (punto de partida)
  const [pfCant, setPfCant] = useState('5')
  const [pfFecha, setPfFecha] = useState(today())
  const [pfLote, setPfLote] = useState('')
  const [pfResp, setPfResp] = useState('')
  const [pfNotas, setPfNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.from('productos').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setProds(data && data.length ? data : PRODUCTOS_DEFAULT.map((p, i) => ({ ...p, id: i + 1 })) as Producto[]))
    supabase.from('ordenes_produccion').select('*', { count: 'exact', head: true })
      .then(({ count }) => setPfLote('L' + String((count ?? 0) + 1).padStart(3, '0')))
  }, [])

  const prod = prods.find(p => p.id === sel)
  const receta = prod ? RECETAS[prod.nombre] : null

  // ── CALCULADORA INVERTIDA ────────────────────────────────────────
  // Punto de partida: kg de proteína cruda disponible
  // kg proteína / proteinaPorKgProducto = kg de producto terminado
  const kgProt = parseFloat(kgProteina) || 0
  const kgProducto = receta && kgProt > 0
    ? parseFloat((kgProt / receta.proteinaPorKgProducto).toFixed(3))
    : 0
  // Factor de escala: cuántas veces la receta base (que está por 1 kg producto terminado)
  const factor = kgProducto

  const venceISO = prod && pfFecha ? dateAddISO(pfFecha, prod.vida_util_dias) : ''

  // Costo total calculado a partir de la proteína disponible
  const costoTotal = receta && factor > 0
    ? receta.ingredientes.reduce((s, ing) => {
        const cantReal = ing.unidad === 'u'
          ? Math.ceil(ing.qty * factor)
          : ing.qty * factor
        return s + cantReal * ing.precio
      }, 0) * (1 + receta.merma)
    : 0

  async function crearOrden() {
    if (!prod) return
    setSaving(true)
    try {
      const cant = parseFloat(pfCant)
      const { data } = await supabase.from('ordenes_produccion').insert({
        numero_lote: pfLote, producto_id: prod.id, producto_nombre: prod.nombre,
        cantidad_kg: cant, fecha_produccion: pfFecha,
        fecha_vencimiento: dateAddISO(pfFecha, prod.vida_util_dias),
        estado: 'pendiente', responsable: pfResp, notas: pfNotas, etiquetas_generadas: 0,
      }).select().single()
      await supabase.from('productos').update({ stock_kg: Math.max(0, prod.stock_kg - cant) }).eq('id', prod.id)
      if (data) router.push('/etiquetas?orden=' + data.id)
    } catch (e) { console.error(e); alert('Error al crear la orden') }
    setSaving(false)
  }

  return (
    <div className='fichas-grid'>

      {/* ── Panel izquierdo: Ficha + Calculadora ── */}
      <div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Fichas Técnicas</div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <select value={sel} onChange={e => setSel(e.target.value ? parseInt(e.target.value) : '')} style={{ width: '100%' }}>
            <option value="">— Seleccionar producto —</option>
            {prods.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>

        {prod && receta && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
            {/* Header del producto */}
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>{prod.nombre}</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, marginBottom: 10 }}>
              <span>PV: <span style={{ color: 'var(--gold)' }}>{fmt(prod.precio_venta)}/kg</span></span>
              <span>Vida útil: {prod.vida_util_dias} días</span>
            </div>
            {prod.instrucciones && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{prod.instrucciones}</div>}

            {/* ── CALCULADORA INVERTIDA ── */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--gold-d)', borderRadius: 6, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>Calculadora de producción</div>

              {/* Input: proteína cruda */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Tengo</span>
                <input
                  type="number"
                  value={kgProteina}
                  onChange={e => setKgProteina(e.target.value)}
                  min="0.1" step="0.5"
                  style={{ width: 80, fontSize: 13, padding: '4px 8px', fontWeight: 'bold' }}
                />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>kg de <strong style={{ color: 'var(--text)' }}>{receta.proteina}</strong></span>
              </div>

              {/* Output: producto terminado estimado */}
              {kgProt > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: 'var(--gold-bg)', border: '1px solid var(--gold-d)', borderRadius: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>→ Produce aprox.</span>
                  <span style={{ fontSize: 18, color: 'var(--gold)', fontWeight: 'bold' }}>{fmtN(kgProducto, 2)} kg</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>de producto terminado</span>
                </div>
              )}

              {/* Tabla de ingredientes */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: 10, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Ingrediente</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px', fontSize: 10, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Cantidad necesaria</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px', fontSize: 10, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {receta.ingredientes.map((ing, i) => {
                    const cantReal = ing.unidad === 'u'
                      ? Math.ceil(ing.qty * factor)
                      : parseFloat((ing.qty * factor).toFixed(3))
                    const costoIng = ing.precio * cantReal
                    const esProteina = ing.nombre === receta.proteina
                    return (
                      <tr key={i} style={{ background: esProteina ? 'rgba(201,162,39,.05)' : 'transparent' }}>
                        <td style={{ padding: '5px 6px', borderBottom: '1px solid var(--borderl)', fontWeight: esProteina ? 'bold' : 'normal' }}>
                          {esProteina && <span style={{ color: 'var(--gold)', marginRight: 4 }}>★</span>}
                          {ing.nombre}
                        </td>
                        <td style={{ padding: '5px 6px', borderBottom: '1px solid var(--borderl)', textAlign: 'right', color: esProteina ? 'var(--gold)' : 'var(--text)', fontWeight: esProteina ? 'bold' : 'normal' }}>
                          {ing.unidad === 'u'
                            ? `${cantReal} u`
                            : `${fmtN(cantReal as number, 3)} ${ing.unidad}`}
                        </td>
                        <td style={{ padding: '5px 6px', borderBottom: '1px solid var(--borderl)', textAlign: 'right', color: 'var(--muted)' }}>
                          {fmt(costoIng)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ padding: '6px 6px 2px', fontSize: 11, color: 'var(--muted)' }}>+ Merma {(receta.merma * 100).toFixed(0)}%</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ padding: '4px 6px', fontSize: 13 }}>Costo total estimado</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', color: 'var(--gold)', fontSize: 15, fontWeight: 'bold' }}>{fmt(costoTotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} style={{ padding: '4px 6px', fontSize: 11, color: 'var(--dim)' }}>{receta.rendimiento}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pasos de elaboración */}
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Elaboración</div>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {receta.pasos.map((paso, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, fontSize: 12, lineHeight: 1.5 }}>
                  <span style={{ minWidth: 20, height: 20, borderRadius: '50%', background: 'var(--gold-bg)', border: '1px solid var(--gold-d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--gold)', flexShrink: 0 }}>{i + 1}</span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* ── Panel derecho: Formulario producción ── */}
      <div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Iniciar Orden de Producción</div>
        {!prod ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 40, color: 'var(--dim)', fontSize: 12, textAlign: 'center' }}>
            Seleccioná un producto para iniciar una orden
          </div>
        ) : (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--gold-bg)', border: '1px solid var(--gold-d)', borderRadius: 6, fontSize: 12 }}>
              <strong style={{ color: 'var(--gold)' }}>{prod.nombre}</strong><br />
              <span style={{ color: 'var(--muted)' }}>Stock actual: {fmtN(prod.stock_kg)} kg · Vida útil: {prod.vida_util_dias} días</span>
              {receta && kgProt > 0 && (
                <div style={{ marginTop: 6, color: 'var(--text)' }}>
                  Calculado desde proteína: <strong style={{ color: 'var(--gold)' }}>{fmtN(kgProducto, 2)} kg</strong> de producto
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={lbl}>Cantidad a producir (kg)</label>
                <input
                  type="number"
                  value={pfCant}
                  onChange={e => setPfCant(e.target.value)}
                  min="0.1" step="0.1"
                  placeholder={receta && kgProt > 0 ? fmtN(kgProducto, 2) : '0'}
                />
                {receta && kgProt > 0 && (
                  <button
                    onClick={() => setPfCant(fmtN(kgProducto, 2))}
                    style={{ marginTop: 4, fontSize: 10, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    ↑ Usar {fmtN(kgProducto, 2)} kg de la calculadora
                  </button>
                )}
              </div>
              <div><label style={lbl}>Fecha de producción</label><input type="date" value={pfFecha} onChange={e => setPfFecha(e.target.value)} /></div>
              <div><label style={lbl}>Número de lote</label><input value={pfLote} onChange={e => setPfLote(e.target.value)} /></div>
              <div><label style={lbl}>Responsable</label><input value={pfResp} onChange={e => setPfResp(e.target.value)} placeholder="Nombre" /></div>
            </div>

            <div style={{ marginBottom: 10 }}><label style={lbl}>Notas</label><textarea value={pfNotas} onChange={e => setPfNotas(e.target.value)} rows={2} /></div>

            {pfCant && venceISO && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                Costo estimado: <span style={{ color: 'var(--gold)' }}>{fmt(costoTotal)}</span>
                {' '}· Vence: <strong>{fechaES(venceISO)}</strong>
              </div>
            )}

            <button onClick={crearOrden} disabled={saving} style={{ ...b('gold'), width: '100%', padding: '8px', fontSize: 13, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Creando...' : 'Crear orden + ir a etiquetas →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
