import { Topbar } from '@/components/ui/Topbar'
import type { ReactNode } from 'react'

export default function CRMLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Topbar />
      <main style={{ padding: '16px 20px', minHeight: 'calc(100vh - 50px)' }}>
        {children}
      </main>
      <div id="print-area" />
    </>
  )
}
