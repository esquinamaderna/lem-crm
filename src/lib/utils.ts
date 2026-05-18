import { clsx, type ClassValue } from 'clsx'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Formato moneda ARS
export function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

// Formato número con decimales
export function fmtN(n: number, d = 1): string {
  return (+n).toLocaleString('es-AR', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
}

// Fecha actual en ISO (Argentina)
export function today(): string {
  return new Date().toISOString().split('T')[0]
}

// Hora actual HH:MM
export function nowTime(): string {
  return new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Fecha legible en español
export function fechaES(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es })
  } catch {
    return dateStr
  }
}

// Sumar días a una fecha ISO y retornar ISO
export function dateAddISO(dateStr: string, days: number): string {
  return addDays(parseISO(dateStr), days).toISOString().split('T')[0]
}

// Sumar días y retornar fecha legible
export function dateAddES(dateStr: string, days: number): string {
  return fechaES(dateAddISO(dateStr, days))
}

// Número de ticket correlativo
export function padNum(n: number, prefix = 'T', length = 4): string {
  return prefix + String(n).padStart(length, '0')
}

// Categoría → clase CSS de color
export const CAT_BADGE: Record<string, string> = {
  VACUNO: 'cat-vacuno',
  CERDO: 'cat-cerdo',
  POLLO: 'cat-pollo',
  PAPAS: 'cat-papas',
  JUMBALAY: 'cat-jumbalay',
  PACKS: 'cat-packs',
}

// Categoría → color hex del punto
export const CAT_COLOR: Record<string, string> = {
  VACUNO: '#c0392b',
  CERDO: '#e07a2b',
  POLLO: '#c9a227',
  PAPAS: '#4caf7d',
  JUMBALAY: '#9b72d4',
  PACKS: '#5b9bd5',
}

// Estado pedido → clase badge
export const ESTADO_PED_CLASS: Record<string, string> = {
  recibido: 'badge-gray',
  preparando: 'badge-blue',
  listo: 'badge-gold',
  entregado: 'badge-purple',
  cobrado: 'badge-green',
  cancelado: 'badge-red',
}

export const ESTADOS_PEDIDO = [
  'recibido',
  'preparando',
  'listo',
  'entregado',
  'cobrado',
] as const

export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number]
