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
  const [whatsapp, setWhatsapp] = useState('11 XXXX-XXXX')
  const [direccion, setDireccion] = useState('Maderna, Tigre')
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
  function generarFolletoHTML(prods: Produto[]) {
    const items = prods.map(p => {
      const icon = CAT_ICON[p.categoria] || CAT_ICON['PACKS']
      const unidad = (p as any).unidad_venta === 'u' ? 'por u.' : 'por kg'
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid ${C.arena};background:${C.blanco};">
          <div style="width:36px;height:36px;flex-shrink:0">${icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:12px;font-weight:700;color:${C.negro};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nombre}</div>
            <div style="font-family:'Open Sans',Arial,sans-serif;font-size:10px;color:${C.arena};text-transform:uppercase;letter-spacing:.5px">${p.categoria} · ${unidad}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:14px;font-weight:700;color:${C.rojo}">${fmt(p.precio_venta)}</div>
          </div>
        </div>`
    }).join('')

    return `
      <div style="width:148mm;min-height:210mm;background:${C.crema};font-family:'Open Sans',Arial,sans-serif;display:flex;flex-direction:column;box-sizing:border-box;page-break-after:always;">
        
        <!-- Header -->
        <div style="background:${C.negro};padding:14px 16px;display:flex;align-items:center;gap:12px">
          <div style="width:48px;height:36px;flex-shrink:0">${LOGO_SVG}</div>
          <div>
            <div style="font-family:'Open Sans',Arial,sans-serif;font-size:9px;letter-spacing:3px;color:${C.arena};text-transform:uppercase">La Esquina de</div>
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:700;color:${C.blanco};line-height:1">MADERNA</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:11px;color:${C.crema};font-style:italic">${subtitulo}</div>
          </div>
        </div>

        <!-- Título lista -->
        <div style="background:${C.rojo};padding:8px 16px;text-align:center">
          <div style="font-family:'Playfair Display',Georgia,serif;font-size:14px;font-weight:700;color:${C.blanco};letter-spacing:2px">${titulo}</div>
        </div>

        <!-- Productos -->
        <div style="flex:1;padding:0;overflow:hidden">
          ${items}
        </div>

        <!-- Footer -->
        <div style="background:${C.negro};padding:10px 16px;display:flex;align-items:center;justify-content:space-between;margin-top:auto">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="color:${C.rojo};font-size:14px">📍</span>
            <span style="font-family:'Open Sans',Arial,sans-serif;font-size:10px;color:${C.crema}">${direccion}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="color:${C.rojo};font-size:14px">💬</span>
            <span style="font-family:'Open Sans',Arial,sans-serif;font-size:10px;color:${C.crema}">${whatsapp}</span>
          </div>
        </div>
      </div>`
  }

  function imprimir() {
    if (!prodsSel.length) { alert('Seleccioná al menos un producto'); return }

    // Dividir en dos grupos para dos folletos por hoja A4
    const mitad = Math.ceil(prodsSel.length / 2)
    const grupo1 = prodsSel.slice(0, mitad)
    const grupo2 = prodsSel.slice(mitad)

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Folleto La Esquina de Maderna</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; }
    @page { size: A4; margin: 8mm; }
    @media print {
      .no-print { display: none !important; }
      .folleto-wrapper { 
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8mm;
        width: 100%;
      }
    }
    .folleto-wrapper {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8mm;
      padding: 8mm;
    }
  </style>
</head>
<body>
  <div class="folleto-wrapper">
    ${generarFolletoHTML(grupo1)}
    ${grupo2.length > 0 ? generarFolletoHTML(grupo2) : generarFolletoHTML(grupo1)}
  </div>
  <script>window.onload = () => { window.print() }<\/script>
</body>
</html>`

    const ventana = window.open('', '_blank', 'width=900,height=700')
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
            <div style={{ background:C.negro, padding:'10px 12px', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:36, height:27 }} dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
              <div>
                <div style={{ fontFamily:'Open Sans,sans-serif', fontSize:7, letterSpacing:2, color:C.arena, textTransform:'uppercase' }}>La Esquina de</div>
                <div style={{ fontFamily:'Georgia,serif', fontSize:14, fontWeight:'bold', color:C.blanco, lineHeight:1 }}>MADERNA</div>
              </div>
              <div style={{ marginLeft:'auto', textAlign:'right' }}>
                <div style={{ fontFamily:'Georgia,serif', fontSize:8, color:C.crema, fontStyle:'italic' }}>{subtitulo}</div>
              </div>
            </div>

            {/* Título preview */}
            <div style={{ background:C.rojo, padding:'5px 12px', textAlign:'center' }}>
              <div style={{ fontFamily:'Georgia,serif', fontSize:10, fontWeight:'bold', color:C.blanco, letterSpacing:2 }}>{titulo}</div>
            </div>

            {/* Items preview */}
            <div style={{ maxHeight:340, overflowY:'auto' }}>
              {prodsSel.length === 0
                ? <div style={{ textAlign:'center', color:'var(--dim)', padding:30, fontSize:12 }}>Seleccioná productos de la lista</div>
                : prodsSel.map(p => {
                    const icon = CAT_ICON[p.categoria] || CAT_ICON['PACKS']
                    return (
                      <div key={p.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', borderBottom:`1px solid ${C.arena}` }}>
                        <div style={{ width:24, height:24, flexShrink:0 }} dangerouslySetInnerHTML={{ __html: icon }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:'Georgia,serif', fontSize:10, fontWeight:'bold', color:C.negro, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.nombre}</div>
                          <div style={{ fontSize:8, color:C.arena, textTransform:'uppercase', letterSpacing:.5 }}>{p.categoria}</div>
                        </div>
                        <div style={{ fontFamily:'Georgia,serif', fontSize:11, fontWeight:'bold', color:C.rojo, flexShrink:0 }}>{fmt(p.precio_venta)}</div>
                      </div>
                    )
                  })
              }
            </div>

            {/* Footer preview */}
            <div style={{ background:C.negro, padding:'7px 12px', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:9, color:C.crema }}>📍 {direccion}</span>
              <span style={{ fontSize:9, color:C.crema }}>💬 {whatsapp}</span>
            </div>
          </div>

          <div style={{ marginTop:10, fontSize:11, color:'var(--muted)', textAlign:'center' }}>
            El folleto se imprime 2 veces por hoja A4.<br/>
            Si seleccionás muchos productos se dividen en partes iguales.
          </div>
        </div>
      </div>
    </div>
  )
}
