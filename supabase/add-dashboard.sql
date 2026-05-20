-- ══════════════════════════════════════════════════════════
-- DASHBOARD FINANCIERO — La Esquina de Maderna
-- ══════════════════════════════════════════════════════════

-- 1. Costos fijos mensuales (se cargan una vez por mes)
CREATE TABLE IF NOT EXISTS costos_fijos_mensuales (
  id            bigint primary key generated always as identity,
  periodo       text not null,           -- 'YYYY-MM' ej: '2026-05'
  concepto      text not null,
  categoria     text not null default 'fijo'
                check (categoria in ('fijo', 'variable', 'operativo')),
  monto         numeric not null,
  notas         text,
  created_at    timestamptz default now()
);

-- Índice para búsqueda por período
CREATE INDEX IF NOT EXISTS idx_costos_periodo ON costos_fijos_mensuales(periodo);

-- RLS abierto para uso interno
ALTER TABLE costos_fijos_mensuales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all costos" ON costos_fijos_mensuales FOR ALL USING (true) WITH CHECK (true);

-- 2. Precios de ingredientes históricos (para rastrear variaciones)
CREATE TABLE IF NOT EXISTS ingredientes_precios (
  id            bigint primary key generated always as identity,
  nombre        text not null,
  precio        numeric not null,
  fecha         date not null default current_date,
  notas         text,
  created_at    timestamptz default now()
);

ALTER TABLE ingredientes_precios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all ingredientes" ON ingredientes_precios FOR ALL USING (true) WITH CHECK (true);

-- 3. Datos iniciales — Mayo 2026
INSERT INTO costos_fijos_mensuales (periodo, concepto, categoria, monto) VALUES
('2026-05', 'Alquiler',                    'fijo',      350000),
('2026-05', 'Sueldos producción (2 pers)', 'fijo',      800000),
('2026-05', 'Servicios (luz, gas, agua)',  'fijo',       85200),
('2026-05', 'Internet + Bot WhatsApp',     'fijo',       36300),
('2026-05', 'Envío y embalajes',           'variable',   30000),
('2026-05', 'Otros gastos operativos',     'operativo',  30000),
('2026-05', 'Monotributo Cat. A',          'fijo',       30268);

-- 4. Precios iniciales de ingredientes
INSERT INTO ingredientes_precios (nombre, precio, fecha) VALUES
('Pechuga de pollo',           6700,   '2026-05-01'),
('Recortes de pechuga',        6700,   '2026-05-01'),
('Nalga (fileteada)',          24000,   '2026-05-01'),
('Peceto (fileteado)',         11699,   '2026-05-01'),
('Carré de cerdo',            11000,   '2026-05-01'),
('Ribs de cerdo',              5300,   '2026-05-01'),
('Pan rallado',                1696,   '2026-05-01'),
('Pan rallado Crunch',         4180,   '2026-05-01'),
('Huevos frescos',             196.67, '2026-05-01'),
('Leche',                      1739,   '2026-05-01'),
('Mostaza',                    2815,   '2026-05-01'),
('Sal fina',                   2650,   '2026-05-01'),
('Pimienta negra molida',     78600,   '2026-05-01'),
('Ajo en polvo',              20800,   '2026-05-01'),
('Harina 0000',                870,    '2026-05-01'),
('Caritas congeladas',         7444,   '2026-05-01'),
('Papas bastón congeladas',    4333,   '2026-05-01'),
('Papas Noisette congeladas',  7300,   '2026-05-01'),
('Nuggets crocantes (Sadia)',  9200,   '2026-05-01'),
('Film / envase unitario',     81.25,  '2026-05-01');

