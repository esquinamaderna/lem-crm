'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV = [
  { href: '/pos',        label: 'Venta' },
  { href: '/pedidos',    label: 'Pedidos' },
  { href: '/productos',  label: 'Productos' },
  { href: '/fichas',     label: 'Fichas' },
  { href: '/produccion', label: 'Producción' },
  { href: '/etiquetas',  label: 'Etiquetas' },
  { href: '/ventas',     label: 'Comandas' },
  { href: '/caja',       label: 'Caja' },
]

export function Topbar() {
  const path = usePathname()
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleString('es-AR', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 20px',
        height: 50,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--gold-d)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ fontSize: 13, letterSpacing: 2, color: 'var(--gold)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        La Esquina de Maderna{' '}
        <small style={{ color: 'var(--muted)', fontSize: 10, marginLeft: 6, letterSpacing: 1 }}>CRM</small>
      </div>

      <nav style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto' }}>
        {NAV.map(({ href, label }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                padding: '5px 12px',
                background: active ? 'var(--gold-bg)' : 'none',
                border: active ? '1px solid var(--gold-d)' : '1px solid transparent',
                color: active ? 'var(--gold)' : 'var(--muted)',
                borderRadius: 4,
                fontSize: 11,
                letterSpacing: 1,
                textTransform: 'uppercase',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {clock}
      </div>
    </header>
  )
}
