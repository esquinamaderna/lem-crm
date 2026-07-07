'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV_TRANSACCIONES = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/clientes',   label: 'Clientes' },
  { href: '/pos',     label: 'Venta' },
  { href: '/pedidos', label: 'Pedidos' },
  { href: '/ventas',  label: 'Historial' },
  { href: '/caja',    label: 'Caja' },
]
const NAV_OPERACIONES = [
  { href: '/productos',  label: 'Productos' },
  { href: '/combos',     label: 'Combos' },
  { href: '/fichas',     label: 'Fichas' },
  { href: '/produccion', label: 'Producción' },
  { href: '/compras',    label: 'Compras' },
  { href: '/etiquetas',  label: 'Etiquetas' },
  { href: '/folletos',   label: 'Folletos' },
]
const ALL_NAV = [...NAV_TRANSACCIONES, ...NAV_OPERACIONES]

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
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [path])

  const activeLabel = ALL_NAV.find(n => path === n.href || path.startsWith(n.href + '/'))?.label || ''

  return (
    <>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
        height: 52, background: '#1a1814', position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '2px solid #9a7a1a', width: '100%', boxSizing: 'border-box',
      }}>
        {/* Logo */}
        <div style={{ fontSize: 12, letterSpacing: 2, color: '#c9a227', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span className="logo-long">La Esquina de Maderna</span>
          <span className="logo-short">LEM</span>
          <small style={{ color: '#7a776f', fontSize: 9, marginLeft: 6, letterSpacing: 1 }}>CRM</small>
        </div>

        {/* Desktop nav */}
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflow: 'hidden' }}>
          {NAV_TRANSACCIONES.map(({ href, label }) => {
            const active = path === href || path.startsWith(href + '/')
            return (
              <Link key={href} href={href} style={{
                padding: '5px 10px', borderRadius: 4, fontSize: 11, letterSpacing: 0.8,
                textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap',
                fontFamily: 'Georgia, serif', flexShrink: 0,
                background: active ? 'rgba(201,162,39,.15)' : 'none',
                border: active ? '1px solid #9a7a1a' : '1px solid transparent',
                color: active ? '#c9a227' : '#9e9890',
              }}>{label}</Link>
            )
          })}
          <span style={{ color: '#444', padding: '0 4px', fontSize: 14, flexShrink: 0 }}>·</span>
          {NAV_OPERACIONES.map(({ href, label }) => {
            const active = path === href || path.startsWith(href + '/')
            return (
              <Link key={href} href={href} style={{
                padding: '5px 10px', borderRadius: 4, fontSize: 11, letterSpacing: 0.8,
                textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap',
                fontFamily: 'Georgia, serif', flexShrink: 0,
                background: active ? 'rgba(201,162,39,.15)' : 'none',
                border: active ? '1px solid #9a7a1a' : '1px solid transparent',
                color: active ? '#c9a227' : '#9e9890',
              }}>{label}</Link>
            )
          })}
        </nav>

        {/* Clock desktop */}
        <div className="desktop-clock" style={{ fontSize: 11, color: '#7a776f', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {clock}
        </div>

        {/* Mobile: section label */}
        <div className="mobile-label" style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#c9a227', textTransform: 'uppercase', letterSpacing: 1 }}>
          {activeLabel}
        </div>

        {/* Hamburger */}
        <button onClick={() => setMenuOpen(o => !o)} className="hamburger"
          style={{ background: 'none', border: '1px solid #444', color: '#9e9890', borderRadius: 6, width: 36, height: 36, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          {/* Overlay para cerrar al tocar afuera */}
          <div onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, top: 52, zIndex: 98, background: 'rgba(0,0,0,.5)' }} />
          <div style={{ position: 'fixed', top: 52, left: 0, right: 0, background: '#1a1814', borderBottom: '2px solid #9a7a1a', zIndex: 99, padding: '14px 16px', maxHeight: 'calc(100vh - 52px)', overflowY: 'auto' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#6b6560', marginBottom: 8 }}>Transacciones</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
              {NAV_TRANSACCIONES.map(({ href, label }) => {
                const active = path === href
                return (
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                    style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 8, fontSize: 11, fontFamily: 'Georgia,serif', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: 0.5, border: active ? '1px solid #9a7a1a' : '1px solid #333', background: active ? 'rgba(201,162,39,.15)' : 'rgba(255,255,255,.04)', color: active ? '#c9a227' : '#9e9890' }}>
                    {label}
                  </Link>
                )
              })}
            </div>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#6b6560', marginBottom: 8 }}>Operaciones</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
              {NAV_OPERACIONES.map(({ href, label }) => {
                const active = path === href
                return (
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                    style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 8, fontSize: 11, fontFamily: 'Georgia,serif', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: 0.5, border: active ? '1px solid #9a7a1a' : '1px solid #333', background: active ? 'rgba(201,162,39,.15)' : 'rgba(255,255,255,.04)', color: active ? '#c9a227' : '#9e9890' }}>
                    {label}
                  </Link>
                )
              })}
            </div>
            <div style={{ fontSize: 11, color: '#555', textAlign: 'center', paddingTop: 8, borderTop: '1px solid #2a2520' }}>{clock}</div>
          </div>
        </>
      )}

      <style>{`
        .logo-short { display: none; }
        .desktop-nav { display: flex !important; }
        .desktop-clock { display: block !important; }
        .mobile-label { display: none !important; }
        .hamburger { display: none !important; }
        @media (max-width: 1100px) {
          .logo-long { display: none; }
          .logo-short { display: inline; }
        }
        @media (max-width: 1024px) {
          .desktop-nav { display: none !important; }
          .desktop-clock { display: none !important; }
          .mobile-label { display: block !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
