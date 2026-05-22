-- ══════════════════════════════════════════════════════════
-- COMBOS — La Esquina de Maderna
-- ══════════════════════════════════════════════════════════

-- 1. Tabla de combos
CREATE TABLE IF NOT EXISTS combos (
  id            bigint primary key generated always as identity,
  nombre        text not null,
  descripcion   text,
  precio        numeric not null,
  descuento_pct numeric not null default 0,
  activo        boolean not null default true,
  color         text default '#7f77dd',
  created_at    timestamptz default now()
);

-- 2. Componentes de cada combo
CREATE TABLE IF NOT EXISTS combo_items (
  id          bigint primary key generated always as identity,
  combo_id    bigint references combos(id) on delete cascade,
  producto_id bigint not null,
  producto_nombre text not null,
  cantidad_kg numeric not null
);

-- RLS abierto para uso interno
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all combos" ON combos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all combo_items" ON combo_items FOR ALL USING (true) WITH CHECK (true);

-- 3. Datos iniciales — combos de ejemplo
INSERT INTO combos (nombre, descripcion, precio, descuento_pct, color) VALUES
('Porción Milanesa Pollo + Papas', 'Milanesa de pollo s/provenzal 250g + Bastones de papa 100g', 4000, 12, '#3266ad'),
('Porción Milanesa Pollo + Noisette', 'Milanesa de pollo s/provenzal 250g + Papas Noisette 100g', 4000, 12, '#3266ad'),
('Picada Mundialera 2/3 pax', 'Surtido de productos Jumbalay para 2 a 3 personas', 38000, 0, '#d85a30'),
('Picada Mundialera 4/6 pax', 'Surtido de productos Jumbalay para 4 a 6 personas', 65000, 0, '#d85a30');

