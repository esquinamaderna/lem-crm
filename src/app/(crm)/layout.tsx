import { Topbar } from '@/components/ui/Topbar'
import { AuthGate } from '@/components/auth/AuthGate'
import type { ReactNode } from 'react'

export default function CRMLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <Topbar />
      <main style={{ padding: 'clamp(10px, 3vw, 20px)', maxWidth: '100vw', overflowX: 'hidden' }}>
        {children}
      </main>
      <div id="print-area" />
    </AuthGate>
  )
}
