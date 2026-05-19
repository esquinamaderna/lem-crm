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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = await req.json() as any
  const { id, ...rest } = body
  const { data, error } = await sb
    .from('productos')
    .update({ nombre: rest.nombre, precio_venta: rest.precio_venta, costo: rest.costo, stock_kg: rest.stock_kg, vida_util_dias: rest.vida_util_dias, instrucciones: rest.instrucciones, activo: rest.activo, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
