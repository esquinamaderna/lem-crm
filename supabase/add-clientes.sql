-- ══════════════════════════════════════════════════════════
-- Tabla de clientes frecuentes
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS clientes (
  id          bigint primary key generated always as identity,
  nombre      text not null,
  telefono    text,
  direccion   text,
  notas       text,
  activo      boolean not null default true,
  created_at  timestamptz default now()
);

-- Agregar cliente_id a pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cliente_id bigint references clientes(id);

-- RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);

-- Verificar
SELECT 'clientes ok' as status;
