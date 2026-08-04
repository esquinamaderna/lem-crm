'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) router.replace('/login')
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) router.replace('/login')
    })
    return () => { listener.subscription.unsubscribe() }
  }, [router])

  if (session === undefined) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Verificando acceso…</div>
  }
  if (!session) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Redirigiendo al login…</div>
  }
  return <>{children}</>
}
