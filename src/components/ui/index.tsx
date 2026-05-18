'use client'

import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

// ── Card ──────────────────────────────────────────────────────────
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(className)}
      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
      {children}
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────
export function Metric({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 20, color: color || 'var(--gold)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────
type BtnVariant = 'default' | 'gold' | 'red' | 'green' | 'blue'
interface BtnProps {
  children: ReactNode
  onClick?: () => void
  variant?: BtnVariant
  size?: 'sm' | 'xs' | 'md'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}

const BG: Record<BtnVariant, string> = {
  default: 'var(--card)',
  gold: 'var(--gold)',
  red: 'rgba(217,95,95,.12)',
  green: 'rgba(76,175,125,.12)',
  blue: 'rgba(91,155,213,.12)',
}
const COL: Record<BtnVariant, string> = {
  default: 'var(--text)',
  gold: '#0f0f0f',
  red: '#d95f5f',
  green: '#4caf7d',
  blue: '#5b9bd5',
}
const BOR: Record<BtnVariant, string> = {
  default: 'var(--border)',
  gold: 'var(--gold)',
  red: 'rgba(217,95,95,.25)',
  green: 'rgba(76,175,125,.25)',
  blue: 'rgba(91,155,213,.25)',
}
const PAD: Record<string, string> = { md: '6px 12px', sm: '4px 9px', xs: '2px 7px' }
const FS: Record<string, number> = { md: 12, sm: 11, xs: 10 }

export function Btn({ children, onClick, variant = 'default', size = 'md', disabled, type = 'button', className }: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        padding: PAD[size],
        borderRadius: 6,
        border: `1px solid ${BOR[variant]}`,
        background: BG[variant],
        color: COL[variant],
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: FS[size],
        fontFamily: 'Georgia, serif',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────────────────
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={className}
      style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, letterSpacing: '.3px' }}
    >
      {children}
    </span>
  )
}

// ── Modal ─────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean
}) {
  if (!open) return null
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', zIndex: 200, alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--gold-d)', borderRadius: 12, padding: 22, width: '100%', maxWidth: wide ? 860 : 640, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>{title}</div>
        {children}
      </div>
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────
export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', padding: '7px 10px', borderBottom: '1px solid var(--border)' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={className} style={{ padding: '8px 10px', borderBottom: '1px solid var(--borderl)', verticalAlign: 'middle' }}>
      {children}
    </td>
  )
}

// ── Section header ────────────────────────────────────────────────
export function SecHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)' }}>{title}</div>
      {children && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{children}</div>}
    </div>
  )
}

// ── Separator ─────────────────────────────────────────────────────
export function Sep() {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />
}

// ── Label ─────────────────────────────────────────────────────────
export function Label({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>{children}</label>
}
