import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const sb = createServerClient()
  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')

  let q = sb.from('ordenes_produccion').select('*').order('created_at', { ascending: false })
  if (estado) q = q.eq('estado', estado)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const sb = createServerClient()
  const body = await req.json()
  const { data, error } = await sb.from('ordenes_produccion').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const sb = createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = await req.json() as any
  const { id, ...rest } = body
  const { data, error } = await sb
    .from('ordenes_produccion')
    .update({ estado: rest.estado, responsable: rest.responsable, notas: rest.notas, etiquetas_generadas: rest.etiquetas_generadas, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
