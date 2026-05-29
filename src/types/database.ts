export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      productos: {
        Row: Producto
        Insert: Omit<Producto, 'id' | 'fc_pct' | 'margen' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Producto, 'id' | 'fc_pct' | 'margen'>>
      }
      ventas: {
        Row: Venta
        Insert: Omit<Venta, 'id' | 'created_at'>
        Update: Partial<Omit<Venta, 'id'>>
      }
      venta_items: {
        Row: VentaItem
        Insert: Omit<VentaItem, 'id' | 'subtotal'>
        Update: Partial<Omit<VentaItem, 'id'>>
      }
      pedidos: {
        Row: Pedido
        Insert: Omit<Pedido, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Pedido, 'id'>>
      }
      pedido_items: {
        Row: PedidoItem
        Insert: Omit<PedidoItem, 'id' | 'subtotal'>
        Update: Partial<Omit<PedidoItem, 'id'>>
      }
      ordenes_produccion: {
        Row: OrdenProduccion
        Insert: Omit<OrdenProduccion, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<OrdenProduccion, 'id'>>
      }
      caja: {
        Row: MovimientoCaja
        Insert: Omit<MovimientoCaja, 'id' | 'created_at'>
        Update: Partial<Omit<MovimientoCaja, 'id'>>
      }
      comandas: {
        Row: Comanda
        Insert: Omit<Comanda, 'id' | 'created_at'>
        Update: Partial<Omit<Comanda, 'id'>>
      }
    }
  }
}

export interface Producto {
  id: number
  nombre: string
  categoria: 'VACUNO' | 'CERDO' | 'POLLO' | 'PAPAS' | 'JUMBALAY' | 'PACKS'
  precio_venta: number
  costo: number
  fc_pct?: number
  margen?: number
  stock_kg: number
  vida_util_dias: number
  instrucciones?: string
  receta?: string[] | string
  activo: boolean
  visible_catalogo: boolean
  unidad_venta?: 'kg' | 'u' | 'L'
  tipo_producto?: 'elaborado' | 'reventa'
  unidad_venta: 'kg' | 'u' | 'L'
  created_at?: string
  updated_at?: string
}

export interface Venta {
  id: number
  numero_ticket: string
  fecha: string
  hora: string
  cliente: string
  medio_pago: string
  total: number
  estado: 'cobrada' | 'pendiente' | 'anulada'
  notas?: string
  created_at?: string
}

export interface VentaItem {
  id: number
  venta_id: number
  producto_id?: number
  producto_nombre: string
  cantidad_kg: number
  precio_unit: number
  subtotal?: number
}

export interface Pedido {
  id: number
  numero: string
  fecha: string
  hora: string
  cliente: string
  telefono?: string
  canal: 'Mostrador' | 'WhatsApp' | 'Instagram' | 'Tienda Nube' | 'Teléfono'
  estado: 'recibido' | 'preparando' | 'listo' | 'entregado' | 'cobrado' | 'cancelado'
  medio_pago?: string
  total?: number
  cobrado: boolean
  notas?: string
  created_at?: string
  updated_at?: string
}

export interface PedidoItem {
  id: number
  pedido_id: number
  producto_id?: number
  producto_nombre: string
  cantidad_kg: number
  precio_unit: number
  subtotal?: number
}

export interface OrdenProduccion {
  id: number
  numero_lote: string
  producto_id?: number
  producto_nombre: string
  cantidad_kg: number
  fecha_produccion: string
  fecha_vencimiento: string
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'cancelado'
  responsable?: string
  notas?: string
  etiquetas_generadas: number
  created_at?: string
  updated_at?: string
}

export interface MovimientoCaja {
  id: number
  fecha: string
  hora: string
  tipo: 'ingreso' | 'egreso'
  concepto: string
  monto: number
  venta_id?: number
  pedido_id?: number
  created_at?: string
}

export interface Comanda {
  id: number
  numero: string
  pedido_id?: number
  venta_id?: number
  tipo: 'venta' | 'produccion'
  contenido: Json
  impresa: boolean
  created_at?: string
}

// Tipos de UI (con items embebidos)
export interface VentaConItems extends Venta {
  items: VentaItem[]
}

export interface PedidoConItems extends Pedido {
  items: PedidoItem[]
}

export interface CartItem {
  id: number
  nombre: string
  pv: number
  qty: number
}
