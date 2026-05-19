'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV_TRANSACCIONES = [
  { href: '/pos',     label: 'Venta' },
  { href: '/pedidos', label: 'Pedidos' },
  { href: '/ventas',  label: 'Historial' },
  { href: '/caja',    label: 'Caja' },
]
const NAV_OPERACIONES = [
  { href: '/productos',  label: 'Productos' },
  { href: '/fichas',     label: 'Fichas' },
  { href: '/produccion', label: 'Producción' },
  { href: '/etiquetas',  label: 'Etiquetas' },
]
const ALL_NAV = [...NAV_TRANSACCIONES, ...NAV_OPERACIONES]

const navStyle = (active: boolean): React.CSSProperties => ({
  padding: '5px 10px',
  background: active ? 'rgba(201,162,39,.08)' : 'none',
  border: active ? '1px solid #8a6d15' : '1px solid transparent',
  color: active ? '#c9a227' : '#7a776f',
  borderRadius: 4,
  fontSize: 11,
  letterSpacing: 1,
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  whiteSpace: 'nowrap' as const,
  fontFamily: 'Georgia, serif',
  display: 'block',
})

export function Topbar() {
  const path = usePathname()
  const [clock, setClock] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock(d.toLocaleString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  // Cerrar menú al navegar
  useEffect(() => { setMenuOpen(false) }, [path])

  return (
    <>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', height: 50, background: '#171717', borderBottom: '1px solid #8a6d15', position: 'sticky', top: 0, zIndex: 100 }}>
        {/* Logo */}
        <div className="topbar-logo" style={{ fontSize: 12, letterSpacing: 2, color: '#c9a227', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span className="topbar-logo-full">La Esquina de Maderna</span><span className="topbar-logo-short" style={{ display: 'none' }}>LEM</span> <small style={{ color: '#7a776f', fontSize: 10, marginLeft: 4, letterSpacing: 1 }}>CRM</small>
        </div>

        {/* Desktop nav */}
        <nav className="hide-mobile topbar-nav" style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflowX: 'auto', minWidth: 0 }}>
          {NAV_TRANSACCIONES.map(({ href, label }) => (
            <Link key={href} href={href} style={navStyle(path === href || path.startsWith(href + '/'))}>
              {label}
            </Link>
          ))}
          <span className="topbar-sep" style={{ color: '#2e2e2e', padding: '0 6px', fontSize: 16, flexShrink: 0 }}>·</span>
          {NAV_OPERACIONES.map(({ href, label }) => (
            <Link key={href} href={href} style={navStyle(path === href || path.startsWith(href + '/'))}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Spacer desktop */}
        <div style={{ flex: 1 }} className="hide-mobile" />

        {/* Clock desktop */}
        <div style={{ fontSize: 11, color: '#7a776f', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }} className="hide-mobile">
          {clock}
        </div>

        {/* Mobile: current section label */}
        <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#c9a227', textTransform: 'uppercase', letterSpacing: 1 }} className="show-mobile">
          {ALL_NAV.find(n => path === n.href || path.startsWith(n.href + '/'))?.label || 'CRM'}
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="show-mobile"
          style={{ background: 'none', border: '1px solid #2e2e2e', color: '#7a776f', borderRadius: 6, width: 36, height: 36, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={{ position: 'fixed', top: 50, left: 0, right: 0, background: '#171717', borderBottom: '1px solid #8a6d15', zIndex: 99, padding: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#7a776f', marginBottom: 8 }}>Transacciones</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
            {NAV_TRANSACCIONES.map(({ href, label }) => (
              <Link key={href} href={href} style={{ ...navStyle(path === href), textAlign: 'center', padding: '10px 8px', borderRadius: 8, border: '1px solid #2e2e2e' }}>
                {label}
              </Link>
            ))}
          </div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#7a776f', marginBottom: 8 }}>Operaciones</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {NAV_OPERACIONES.map(({ href, label }) => (
              <Link key={href} href={href} style={{ ...navStyle(path === href), textAlign: 'center', padding: '10px 8px', borderRadius: 8, border: '1px solid #2e2e2e' }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .hide-mobile { display: flex !important; }
        .show-mobile { display: none !important; }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        /* Nav compacto en pantallas medianas */
        @media (max-width: 1200px) and (min-width: 769px) {
          .topbar-nav a {
            padding: 4px 7px !important;
            font-size: 10px !important;
            letter-spacing: 0.5px !important;
          }
          .topbar-sep { padding: 0 3px !important; }
          .topbar-logo-full { display: none !important; }
          .topbar-logo-short { display: inline !important; }
        }
        @media (min-width: 769px) {
          .topbar-nav {
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .topbar-nav::-webkit-scrollbar { display: none; }
        }
      `}</style>
    </>
  )
}
