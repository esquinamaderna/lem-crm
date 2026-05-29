-- ══════════════════════════════════════════════════════════
-- Agregar campo unidad_venta a productos
-- 'kg' = por peso (default), 'u' = por unidad, 'L' = por litro
-- ══════════════════════════════════════════════════════════

-- Si ya existe 'unidad' del paso anterior, renombrar
ALTER TABLE productos RENAME COLUMN IF EXISTS unidad TO unidad_venta;

-- Si no existe, crear
ALTER TABLE productos ADD COLUMN IF NOT EXISTS unidad_venta text NOT NULL DEFAULT 'kg';

-- Todos los Jumbalay frascos pequeños = por unidad
UPDATE productos SET unidad_venta = 'u'
WHERE categoria = 'JUMBALAY'
  AND nombre NOT LIKE '%1500g%'
  AND nombre NOT LIKE '%1400g%'
  AND nombre NOT LIKE '%3000g%'
  AND nombre NOT LIKE '%3700g%'
  AND nombre NOT LIKE '%3800g%'
  AND nombre NOT LIKE '%4000g%';

-- Verificar
SELECT nombre, categoria, unidad_venta
FROM productos
WHERE categoria = 'JUMBALAY'
ORDER BY unidad_venta, nombre;
