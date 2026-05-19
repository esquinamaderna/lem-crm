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

const navStyle = (active: boolean): React.CSSProperties => ({
  padding: '5px 12px',
  background: active ? 'rgba(201,162,39,.08)' : 'none',
  border: active ? '1px solid #8a6d15' : '1px solid transparent',
  color: active ? '#c9a227' : '#7a776f',
  borderRadius: 4,
  fontSize: 11,
  letterSpacing: 1,
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  whiteSpace: 'nowrap' as const,
  transition: 'all 0.15s',
  fontFamily: 'Georgia, serif',
})

export function Topbar() {
  const path = usePathname()
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock(d.toLocaleString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 50, background: '#171717', borderBottom: '1px solid #8a6d15', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ fontSize: 13, letterSpacing: 2, color: '#c9a227', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        La Esquina de Maderna <small style={{ color: '#7a776f', fontSize: 10, marginLeft: 6, letterSpacing: 1 }}>CRM</small>
      </div>

      <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflowX: 'auto' }}>
        {NAV_TRANSACCIONES.map(({ href, label }) => (
          <Link key={href} href={href} style={navStyle(path === href || path.startsWith(href + '/'))}>
            {label}
          </Link>
        ))}

        {/* Separador entre grupos */}
        <span style={{ color: '#2e2e2e', padding: '0 8px', fontSize: 16, userSelect: 'none' }}>·</span>

        {NAV_OPERACIONES.map(({ href, label }) => (
          <Link key={href} href={href} style={navStyle(path === href || path.startsWith(href + '/'))}>
            {label}
          </Link>
        ))}
      </nav>

      <div style={{ fontSize: 12, color: '#7a776f', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {clock}
      </div>
    </header>
  )
}
