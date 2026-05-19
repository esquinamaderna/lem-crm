import { Topbar } from '@/components/ui/Topbar'
import type { ReactNode } from 'react'

export default function CRMLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Topbar />
      <main style={{ padding: 'clamp(10px, 3vw, 20px)' }}>
        {children}
      </main>
      <div id="print-area" />
    </>
  )
}
