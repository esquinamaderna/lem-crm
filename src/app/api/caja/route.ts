import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const sb = createServerClient()
  const { searchParams } = new URL(req.url)
  const fecha = searchParams.get('fecha')

  let q = sb.from('caja').select('*').order('created_at', { ascending: false })
  if (fecha) q = q.eq('fecha', fecha)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const sb = createServerClient()
  const body = await req.json()
  const { data, error } = await sb.from('caja').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
