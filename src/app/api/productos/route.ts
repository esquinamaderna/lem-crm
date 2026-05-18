import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const sb = createServerClient()
  const body = await req.json()
  const { data, error } = await sb.from('productos').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const sb = createServerClient()
  const { id, ...rest } = await req.json()
  const { data, error } = await sb.from('productos').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
