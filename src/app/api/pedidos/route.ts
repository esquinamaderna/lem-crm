import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const sb = createServerClient()
  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')

  let q = sb.from('pedidos').select('*, pedido_items(*)').order('created_at', { ascending: false })
  if (estado) q = q.eq('estado', estado)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const sb = createServerClient()
  const { pedido, items } = await req.json()

  const { data: pedData, error: pedErr } = await sb.from('pedidos').insert(pedido).select().single()
  if (pedErr) return NextResponse.json({ error: pedErr.message }, { status: 500 })

  const itemsConId = items.map((i: Record<string, unknown>) => ({ ...i, pedido_id: pedData.id }))
  await sb.from('pedido_items').insert(itemsConId)

  await sb.from('comandas').insert({
    numero: 'CP' + pedido.numero,
    pedido_id: pedData.id,
    tipo: 'venta',
    contenido: { cliente: pedido.cliente, items, total: pedido.total },
    impresa: false,
  })

  return NextResponse.json({ pedido: pedData }, { status: 201 })
}

export async function PATCH(req: Request) {
  const sb = createServerClient()
  const { id, ...rest } = await req.json()
  const { data, error } = await sb
    .from('pedidos')
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
