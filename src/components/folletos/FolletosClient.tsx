'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

// ── Paleta La Esquina de Maderna ──
const C = {
  rojo:    '#B8392B',
  negro:   '#2C3333',
  oliva:   '#5C6B3A',
  arena:   '#C8B49A',
  crema:   '#F0EBE1',
  blanco:  '#FFFFFF',
}

// ── Iconos SVG por categoría ──
const CAT_ICON: Record<string, string> = {
  VACUNO:    `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="20" cy="22" rx="13" ry="9" fill="${C.rojo}" opacity=".15"/><path d="M10 18c0-5.5 4.5-10 10-10s10 4.5 10 10c0 3-1.5 5.5-4 7H14c-2.5-1.5-4-4-4-7z" fill="${C.rojo}"/><circle cx="15" cy="16" r="2" fill="${C.blanco}"/><circle cx="25" cy="16" r="2" fill="${C.blanco}"/><path d="M14 8c-1-3-3-4-4-4M26 8c1-3 3-4 4-4" stroke="${C.rojo}" stroke-width="2" stroke-linecap="round"/></svg>`,
  CERDO:     `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="20" cy="23" rx="12" ry="9" fill="${C.arena}" opacity=".3"/><ellipse cx="20" cy="21" rx="11" ry="8" fill="${C.rojo}" opacity=".8"/><circle cx="16" cy="19" r="2" fill="${C.blanco}"/><circle cx="24" cy="19" r="2" fill="${C.blanco}"/><ellipse cx="20" cy="22" rx="3" ry="2" fill="${C.blanco}" opacity=".6"/><path d="M28 15c2-2 4-1 4 1s-1 3-3 3M12 15c-2-2-4-1-4 1s1 3 3 3" stroke="${C.arena}" stroke-width="1.5"/></svg>`,
  POLLO:     `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 8c-6 0-10 5-10 11 0 4 2 7 5 9h10c3-2 5-5 5-9 0-6-4-11-10-11z" fill="${C.rojo}" opacity=".85"/><path d="M15 8c-1-3 1-5 3-5s3 1 2 3" fill="${C.arena}"/><circle cx="17" cy="14" r="2" fill="${C.blanco}"/><circle cx="23" cy="14" r="2" fill="${C.blanco}"/><path d="M17 20h6" stroke="${C.blanco}" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  PAPAS:     `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="14" width="5" height="18" rx="2.5" fill="${C.arena}"/><rect x="15" y="10" width="5" height="22" rx="2.5" fill="${C.arena}" opacity=".9"/><rect x="22" y="12" width="5" height="20" rx="2.5" fill="${C.arena}"/><rect x="29" y="16" width="4" height="16" rx="2" fill="${C.arena}" opacity=".8"/><rect x="6" y="30" width="28" height="4" rx="2" fill="${C.rojo}" opacity=".3"/></svg>`,
  JUMBALAY:  `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="12" width="20" height="22" rx="4" fill="${C.oliva}" opacity=".2"/><rect x="10" y="12" width="20" height="22" rx="4" stroke="${C.oliva}" stroke-width="2"/><ellipse cx="20" cy="12" rx="7" ry="3" fill="${C.oliva}" opacity=".6"/><path d="M15 20h10M15 25h7" stroke="${C.oliva}" stroke-width="1.5" stroke-linecap="round"/><circle cx="27" cy="25" r="2" fill="${C.rojo}"/></svg>`,
  CORTES:    `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 28L28 8l4 4L12 32l-4-4z" fill="${C.arena}" stroke="${C.rojo}" stroke-width="1.5"/><path d="M28 8l2-2 4 4-2 2" fill="${C.negro}" opacity=".7"/><path d="M10 26l4 4" stroke="${C.rojo}" stroke-width="2" stroke-linecap="round"/></svg>`,
  EMBUTIDOS: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 20c0-5 4-9 10-9s10 4 10 9c0 2-1 4-2 5l-3 5H15l-3-5c-1-1-2-3-2-5z" fill="${C.rojo}" opacity=".8"/><path d="M16 11c0-2 2-4 4-4s4 2 4 4" stroke="${C.rojo}" stroke-width="2"/><line x1="20" y1="17" x2="20" y2="25" stroke="${C.blanco}" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  PACKS:     `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="18" width="24" height="16" rx="2" fill="${C.arena}" opacity=".4"/><rect x="8" y="18" width="24" height="16" rx="2" stroke="${C.rojo}" stroke-width="1.5"/><path d="M14 18v-4a6 6 0 0112 0v4" stroke="${C.rojo}" stroke-width="1.5"/><path d="M16 26h8M20 22v8" stroke="${C.oliva}" stroke-width="1.5" stroke-linecap="round"/></svg>`,
}

// ── Logo SVG de La Esquina de Maderna ──
const LOGO_SVG = `<svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="5" y="20" width="70" height="35" rx="2" fill="${C.rojo}"/>
  <rect x="10" y="15" width="60" height="8" rx="1" fill="${C.rojo}"/>
  <rect x="15" y="10" width="50" height="7" rx="1" fill="${C.rojo}" opacity=".7"/>
  <rect x="14" y="28" width="12" height="27" rx="1" fill="${C.crema}" opacity=".9"/>
  <rect x="34" y="28" width="12" height="27" rx="1" fill="${C.crema}" opacity=".9"/>
  <rect x="54" y="28" width="12" height="27" rx="1" fill="${C.crema}" opacity=".9"/>
  <rect x="17" y="31" width="6" height="8" rx="1" fill="${C.rojo}" opacity=".6"/>
  <rect x="37" y="31" width="6" height="8" rx="1" fill="${C.rojo}" opacity=".6"/>
  <rect x="57" y="31" width="6" height="8" rx="1" fill="${C.rojo}" opacity=".6"/>
</svg>`

interface Producto {
  id: number
  nombre: string
  categoria: string
  precio_venta: number
  stock_kg: number
  tipo_producto?: string
}

const CATS = ['VACUNO','CERDO','POLLO','PAPAS','JUMBALAY','PACKS','CORTES','EMBUTIDOS']

const b = (v?: 'gold'|'red'|'green'): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif',
  border: v==='gold' ? '1px solid var(--gold)' : v==='red' ? '1px solid rgba(190,50,50,.3)' : '1px solid var(--border)',
  background: v==='gold' ? 'var(--gold)' : v==='red' ? 'rgba(190,50,50,.08)' : 'var(--card)',
  color: v==='gold' ? '#fff' : v==='red' ? '#aa2020' : 'var(--text)',
})

export function FolletosClient() {
  const [productos, setProductos] = useState<Produto[]>([])
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [catFiltro, setCatFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [titulo, setTitulo] = useState('LISTA DE PRECIOS')
  const [subtitulo, setSubtitulo] = useState('VIANDAS CON HISTORIA. SABOR DE BARRIO.')
  const [whatsapp, setWhatsapp] = useState('11.6464.0732')
  const [direccion, setDireccion] = useState('Madero 1802 San Fernando')
  const [mostrarSoloConStock, setMostrarSoloConStock] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('productos').select('*').eq('activo', true).order('categoria').order('nombre')
    setProductos((data || []) as Produto[])
  }

  const filtrados = productos.filter(p => {
    if (mostrarSoloConStock && (p.stock_kg || 0) <= 0) return false
    if (catFiltro && p.categoria !== catFiltro) return false
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  function toggleProd(id: number) {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function selTodos() {
    const ids = filtrados.map(p => p.id)
    setSeleccionados(prev => {
      const todosYa = ids.every(id => prev.includes(id))
      if (todosYa) return prev.filter(id => !ids.includes(id))
      return [...new Set([...prev, ...ids])]
    })
  }

  const prodsSel = productos.filter(p => seleccionados.includes(p.id))

  // ── Generar HTML del folleto A5 ──
  const CAT_DOT: Record<string,string> = {
    VACUNO:'#B8392B', CERDO:'#C8A020', POLLO:'#C8A020', PAPAS:'#5C6B3A',
    JUMBALAY:'#5C6B3A', CORTES:'#B8392B', EMBUTIDOS:'#8B3020', PACKS:'#2C3333'
  }

  const LOGO_REAL = `<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" fill="none">
  <!-- Casa principal -->
  <rect x="55" y="70" width="90" height="75" stroke="#6B3A2A" stroke-width="2.5" fill="#fff"/>
  <!-- Techo triangular -->
  <polygon points="45,70 100,30 155,70" stroke="#6B3A2A" stroke-width="2.5" fill="#fff"/>
  <!-- Chimenea -->
  <rect x="115" y="38" width="10" height="20" stroke="#6B3A2A" stroke-width="2" fill="#fff"/>
  <!-- Puerta central -->
  <rect x="85" y="100" width="30" height="45" stroke="#6B3A2A" stroke-width="2" fill="#fff"/>
  <line x1="100" y1="100" x2="100" y2="145" stroke="#6B3A2A" stroke-width="1.5"/>
  <ellipse cx="109" cy="122" rx="2" ry="2" fill="#6B3A2A"/>
  <!-- Ventana izquierda -->
  <rect x="63" y="85" width="18" height="20" stroke="#6B3A2A" stroke-width="1.8" fill="#fff"/>
  <line x1="72" y1="85" x2="72" y2="105" stroke="#6B3A2A" stroke-width="1"/>
  <line x1="63" y1="95" x2="81" y2="95" stroke="#6B3A2A" stroke-width="1"/>
  <!-- Ventana derecha -->
  <rect x="119" y="85" width="18" height="20" stroke="#6B3A2A" stroke-width="1.8" fill="#fff"/>
  <line x1="128" y1="85" x2="128" y2="105" stroke="#6B3A2A" stroke-width="1"/>
  <line x1="119" y1="95" x2="137" y2="95" stroke="#6B3A2A" stroke-width="1"/>
  <!-- Árbol izquierdo -->
  <line x1="25" y1="145" x2="25" y2="75" stroke="#6B3A2A" stroke-width="2"/>
  <line x1="25" y1="90" x2="12" y2="75" stroke="#6B3A2A" stroke-width="1.5"/>
  <line x1="25" y1="100" x2="10" y2="88" stroke="#6B3A2A" stroke-width="1.5"/>
  <line x1="25" y1="90" x2="38" y2="78" stroke="#6B3A2A" stroke-width="1.5"/>
  <line x1="25" y1="105" x2="40" y2="95" stroke="#6B3A2A" stroke-width="1.5"/>
  <line x1="25" y1="115" x2="15" y2="108" stroke="#6B3A2A" stroke-width="1.5"/>
  <line x1="25" y1="80" x2="20" y2="68" stroke="#6B3A2A" stroke-width="1.5"/>
  <line x1="25" y1="80" x2="30" y2="70" stroke="#6B3A2A" stroke-width="1.5"/>
  <!-- Árbol derecho -->
  <line x1="175" y1="145" x2="175" y2="75" stroke="#6B3A2A" stroke-width="2"/>
  <line x1="175" y1="90" x2="162" y2="75" stroke="#6B3A2A" stroke-width="1.5"/>
  <line x1="175" y1="100" x2="160" y2="88" stroke="#6B3A2A" stroke-width="1.5"/>
  <line x1="175" y1="90" x2="188" y2="78" stroke="#6B3A2A" stroke-width="1.5"/>
  <line x1="175" y1="105" x2="190" y2="95" stroke="#6B3A2A" stroke-width="1.5"/>
  <line x1="175" y1="115" x2="165" y2="108" stroke="#6B3A2A" stroke-width="1.5"/>
  <line x1="175" y1="80" x2="170" y2="68" stroke="#6B3A2A" stroke-width="1.5"/>
  <line x1="175" y1="80" x2="180" y2="70" stroke="#6B3A2A" stroke-width="1.5"/>
  <!-- Línea de suelo -->
  <line x1="5" y1="145" x2="195" y2="145" stroke="#6B3A2A" stroke-width="1.5"/>
</svg>`

  function generarFolletoHTML(prods: Produto[]) {
    const MAX = 12
    const slots = Array.from({ length: MAX }, (_: any, i: number) => prods[i] || null)

    const WS_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="#fff" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.1 1.51 5.833L.057 23.428a.75.75 0 0 0 .915.915l5.595-1.453A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.65-.524-5.153-1.432l-.369-.225-3.822.993.993-3.822-.225-.369A9.959 9.959 0 0 1 2 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>'
    const MAP_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="#fff" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'

    const bloques = slots.map((p: any) => {
      if (!p) return '<div style="border:1px solid #e8e0d0;border-radius:6px;padding:10px;background:#fff;min-height:80px;"></div>'
      const dot = (CAT_DOT as any)[p.categoria] || '#5C6B3A'
      const unidad = p.unidad_venta === 'u' ? 'por u.' : 'por kg'
      return [
        '<div style="border:1px solid #ddd;border-radius:6px;padding:10px 12px;background:#fff;">',
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">',
        '<div style="font-family:Open Sans,Arial,sans-serif;font-size:13px;color:#2C3333;font-weight:700;line-height:1.3;flex:1;padding-right:8px">' + p.nombre + '</div>',
        '<div style="width:10px;height:10px;border-radius:50%;background:' + dot + ';flex-shrink:0;margin-top:3px"></div>',
        '</div>',
        '<div style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#C8A020;margin-bottom:3px">' + fmt(p.precio_venta) + '</div>',
        '<div style="font-family:Open Sans,Arial,sans-serif;font-size:10px;color:#999">' + unidad + '</div>',
        '</div>'
      ].join('')
    }).join('')

    const header = [
      '<div style="padding:10px 16px 8px;text-align:center;border-bottom:3px solid #2C5F2E;">',
      '<div style="width:80px;margin:0 auto 5px">' + LOGO_REAL + '</div>',
      '<div style="font-family:Open Sans,Arial,sans-serif;font-size:12px;color:#6B3A2A;letter-spacing:1px">La Esquina</div>',
      '<div style="font-family:Open Sans,Arial,sans-serif;font-size:12px;color:#6B3A2A">de <strong>Maderna</strong></div>',
      '</div>'
    ].join('')

    const grid = '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:10px;">' + bloques + '</div>'

    const footer = [
      '<div style="background:#2C5F2E;padding:10px 16px;display:flex;align-items:center;gap:24px;">',
      '<div style="display:flex;align-items:center;gap:7px">' + WS_ICON + '<strong style="font-family:Open Sans,Arial,sans-serif;font-size:13px;color:#fff">' + whatsapp + '</strong></div>',
      '<div style="display:flex;align-items:center;gap:7px">' + MAP_ICON + '<strong style="font-family:Open Sans,Arial,sans-serif;font-size:13px;color:#fff">' + direccion + '</strong></div>',
      '</div>'
    ].join('')

    return '<div style="width:148mm;height:210mm;background:#fff;font-family:Open Sans,Arial,sans-serif;display:flex;flex-direction:column;box-sizing:border-box;border:1.5px solid #ccc;border-radius:10px;overflow:hidden;">' + header + grid + footer + '</div>'
  }
  function imprimir() {
    if (!prodsSel.length) { alert('Seleccioná al menos un producto'); return }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Folleto La Esquina de Maderna</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f5f5f5; display: flex; justify-content: center; align-items: flex-start; padding: 10mm; }
    @page { size: A4 landscape; margin: 5mm; }
    @media print {
      body { background: #fff; padding: 0; }
      .folleto-wrapper { gap: 6mm; }
    }
    .folleto-wrapper {
      display: flex;
      gap: 8mm;
      width: 100%;
      max-width: 277mm;
    }
    .folleto-wrapper > div { flex: 1; }
  </style>
</head>
<body>
  <div class="folleto-wrapper">
    ${generarFolletoHTML(prodsSel)}
    ${generarFolletoHTML(prodsSel)}
  </div>
  <script>window.onload = () => setTimeout(() => window.print(), 800)<\/script>
</body>
</html>`

    const ventana = window.open('', '_blank', 'width=1100,height=750')
    if (!ventana) return
    ventana.document.write(html)
    ventana.document.close()
  }

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Open+Sans:wght@400;600&display=swap');
      `}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--muted)', marginBottom:4 }}>Generador de folletos A5</div>
          <div style={{ fontSize:12, color:'var(--dim)' }}>{seleccionados.length} productos seleccionados · 2 folletos por hoja A4</div>
        </div>
        <button onClick={imprimir} style={{ ...b('gold'), padding:'8px 20px', fontSize:13 }}>🖨 Imprimir folletos</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16 }}>

        {/* Panel izquierdo: selección de productos */}
        <div>
          {/* Configuración */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:14, marginBottom:12, boxShadow:'var(--shadow)' }}>
            <div style={{ fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--gold)', marginBottom:10 }}>Datos del folleto</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:3 }}>Título</label>
                <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="LISTA DE PRECIOS" />
              </div>
              <div>
                <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:3 }}>Slogan</label>
                <input value={subtitulo} onChange={e => setSubtitulo(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:3 }}>WhatsApp</label>
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="11 XXXX-XXXX" />
              </div>
              <div>
                <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:3 }}>Dirección</label>
                <input value={direccion} onChange={e => setDireccion(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Filtros y selección */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:14, boxShadow:'var(--shadow)' }}>
            <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar producto..." style={{ flex:1, minWidth:140 }} />
              <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)} style={{ width:140 }}>
                <option value="">Todas las categorías</option>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
              <button onClick={() => setMostrarSoloConStock(v => !v)}
                style={{ ...b(), padding:'5px 10px', fontSize:11, color: mostrarSoloConStock ? 'var(--gold)' : 'var(--muted)', borderColor: mostrarSoloConStock ? 'var(--gold-d)' : 'var(--border)' }}>
                {mostrarSoloConStock ? '✓ Con stock' : '👁 Todos'}
              </button>
              <button onClick={selTodos} style={{ ...b(), padding:'5px 10px', fontSize:11 }}>
                {filtrados.every(p => seleccionados.includes(p.id)) ? 'Deseleccionar' : 'Seleccionar todo'}
              </button>
            </div>

            {/* Lista de productos */}
            <div style={{ maxHeight:480, overflowY:'auto' }}>
              {filtrados.map(p => {
                const sel = seleccionados.includes(p.id)
                const icon = CAT_ICON[p.categoria] || CAT_ICON['PACKS']
                return (
                  <div key={p.id} onClick={() => toggleProd(p.id)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderBottom:'1px solid var(--borderl)', cursor:'pointer', background: sel ? 'var(--gold-bg)' : 'transparent', borderLeft: sel ? '3px solid var(--gold)' : '3px solid transparent' }}>
                    <div style={{ width:30, height:30, flexShrink:0 }} dangerouslySetInnerHTML={{ __html: icon }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:'bold' }}>{p.nombre}</div>
                      <div style={{ fontSize:10, color:'var(--muted)' }}>{p.categoria}</div>
                    </div>
                    <div style={{ fontSize:13, color:'var(--gold)', fontWeight:'bold', flexShrink:0 }}>{fmt(p.precio_venta)}</div>
                    <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${sel ? 'var(--gold)' : 'var(--border)'}`, background: sel ? 'var(--gold)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {sel && <span style={{ color:'#fff', fontSize:11 }}>✓</span>}
                    </div>
                  </div>
                )
              })}
              {filtrados.length === 0 && (
                <div style={{ textAlign:'center', color:'var(--dim)', padding:30, fontSize:13 }}>Sin productos con los filtros aplicados</div>
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho: preview del folleto */}
        <div style={{ position:'sticky', top:80 }}>
          <div style={{ fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--muted)', marginBottom:8 }}>Preview</div>
          <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', boxShadow:'var(--shadow)' }}>

            {/* Header preview */}
            <div style={{ padding:'8px', textAlign:'center', borderBottom:'2px solid #2C5F2E' }}>
              <div style={{ fontSize:10, color:'#2C3333' }}>La Esquina de <strong>Maderna</strong></div>
            </div>

            {/* Items preview — grilla 3x4 */}
            <div style={{ padding:6, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4, minHeight:200 }}>
              {prodsSel.length === 0
                ? <div style={{ gridColumn:'1/-1', textAlign:'center', color:'var(--dim)', padding:20, fontSize:11 }}>Seleccioná productos de la lista</div>
                : Array.from({ length: 12 }, (_, i) => {
                    const p = prodsSel[i]
                    if (!p) return <div key={i} style={{ border:'1px solid #eee', borderRadius:3, minHeight:44 }} />
                    const dot = { VACUNO:'#B8392B', CERDO:'#C8A020', POLLO:'#C8A020', PAPAS:'#5C6B3A', JUMBALAY:'#5C6B3A', CORTES:'#B8392B', EMBUTIDOS:'#8B3020', PACKS:'#2C3333' }[p.categoria] || '#5C6B3A'
                    return (
                      <div key={i} style={{ border:'1px solid #ddd', borderRadius:3, padding:'5px 6px', background:'#fff' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                          <div style={{ fontSize:8, color:'#2C3333', fontWeight:'bold', lineHeight:1.2, flex:1, paddingRight:3, overflow:'hidden' }}>{p.nombre}</div>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:dot, flexShrink:0, marginTop:1 }} />
                        </div>
                        <div style={{ fontFamily:'Georgia,serif', fontSize:10, fontWeight:'bold', color:'#C8A020' }}>{fmt(p.precio_venta)}</div>
                      </div>
                    )
                  })
              }
            </div>

            {/* Footer preview */}
            <div style={{ background:'#2C5F2E', padding:'6px 10px', display:'flex', gap:12 }}>
              <span style={{ fontSize:9, color:'#fff' }}>💬 {whatsapp}</span>
              <span style={{ fontSize:9, color:'#fff' }}>📍 {direccion}</span>
            </div>
          </div>

          <div style={{ marginTop:10, fontSize:11, color:'var(--muted)', textAlign:'center' }}>
            Dos folletos idénticos por hoja A4 apaisada.<br/>
            Máximo 12 productos por folleto (3 × 4 grilla).
          </div>
        </div>
      </div>
    </div>
  )
}
