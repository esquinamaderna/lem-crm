import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'La Esquina de Maderna — CRM',
  description: 'Sistema de gestión interno — La Esquina de Maderna',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
