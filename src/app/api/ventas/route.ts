import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const sb = createServerClient()
  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const estado = searchParams.get('estado')

  let q = sb.from('ventas').select('*, venta_items(*)').order('created_at', { ascending: false })
  if (desde) q = q.gte('fecha', desde)
  if (hasta) q = q.lte('fecha', hasta)
  if (estado) q = q.eq('estado', estado)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const sb = createServerClient()
  const { venta, items, movimientoCaja } = await req.json()

  // 1. Insertar venta
  const { data: ventaData, error: ventaErr } = await sb.from('ventas').insert(venta).select().single()
  if (ventaErr) return NextResponse.json({ error: ventaErr.message }, { status: 500 })

  // 2. Items con venta_id real
  const itemsConId = items.map((i: Record<string, unknown>) => ({ ...i, venta_id: ventaData.id }))
  const { error: itemsErr } = await sb.from('venta_items').insert(itemsConId)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  // 3. Comanda
  await sb.from('comandas').insert({
    numero: 'C' + venta.numero_ticket,
    venta_id: ventaData.id,
    tipo: 'venta',
    contenido: { cliente: venta.cliente, items, total: venta.total, pago: venta.medio_pago },
    impresa: false,
  })

  // 4. Caja
  if (movimientoCaja) {
    await sb.from('caja').insert({ ...movimientoCaja, venta_id: ventaData.id })
  }

  // 5. Descontar stock (best-effort)
  for (const item of items) {
    if (item.producto_id) {
      const { data: prod } = await sb.from('productos').select('stock_kg').eq('id', item.producto_id).single()
      if (prod) {
        const newStock = Math.max(0, prod.stock_kg - item.cantidad_kg)
        await sb.from('productos').update({ stock_kg: newStock }).eq('id', item.producto_id)
      }
    }
  }

  return NextResponse.json({ venta: ventaData }, { status: 201 })
}
