import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side singleton
export const supabase = createClient<Database>(url, key)

// Server-side (para API routes y Server Components)
export const createServerClient = () =>
  createClient<Database>(url, key, {
    auth: { persistSession: false },
  })
