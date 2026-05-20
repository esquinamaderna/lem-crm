import { clsx, type ClassValue } from 'clsx'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

export function fmtN(n: number, d = 1): string {
  return (+n).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function today(): string {
  return new Date().toISOString().split('T')[0]
}

// HH:MM:SS — formato válido para columnas time de Supabase/PostgreSQL
export function nowTime(): string {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')
}

// Hora para mostrar en UI (HH:MM)
export function nowTimeDisplay(): string {
  const d = new Date()
  return [d.getHours(), d.getMinutes()].map(n => String(n).padStart(2, '0')).join(':')
}

export function fechaES(dateStr: string): string {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es }) } catch { return dateStr }
}

export function dateAdd(dateStr: string, days: number): string {
  return fechaES(dateAddISO(dateStr, days))
}

export function dateAddISO(dateStr: string, days: number): string {
  return addDays(parseISO(dateStr), days).toISOString().split('T')[0]
}

export function dateAddES(dateStr: string, days: number): string {
  return fechaES(dateAddISO(dateStr, days))
}

export function padNum(n: number, prefix = 'T', length = 4): string {
  return prefix + String(n).padStart(length, '0')
}

export const CAT_BADGE: Record<string, string> = {
  VACUNO: 'cat-vacuno', CERDO: 'cat-cerdo', POLLO: 'cat-pollo',
  PAPAS: 'cat-papas', JUMBALAY: 'cat-jumbalay', PACKS: 'cat-packs',
}

export const CAT_COLOR: Record<string, string> = {
  VACUNO: '#b02a1f', CERDO: '#a85010', POLLO: '#9a7a1a',
  PAPAS: '#1a7a40', JUMBALAY: '#6030a0', PACKS: '#1050a0',
}

export const ESTADO_PED_CLASS: Record<string, string> = {
  recibido: 'badge-gray', preparando: 'badge-blue', listo: 'badge-gold',
  entregado: 'badge-purple', cobrado: 'badge-green', cancelado: 'badge-red',
}

export const ESTADOS_PEDIDO = ['recibido', 'preparando', 'listo', 'entregado', 'cobrado'] as const
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number]
