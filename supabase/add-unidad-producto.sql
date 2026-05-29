-- ══════════════════════════════════════════════════════════
-- Agregar campo unidad a productos
-- 'kg' = por peso (default), 'u' = por unidad
-- ══════════════════════════════════════════════════════════

ALTER TABLE productos ADD COLUMN IF NOT EXISTS unidad text NOT NULL DEFAULT 'kg'
  CHECK (unidad IN ('kg', 'u'));

-- Todos los Jumbalay por defecto son 'u' excepto los 1500g y 3000g
UPDATE productos SET unidad = 'u'
WHERE categoria = 'JUMBALAY'
  AND nombre NOT LIKE '%1500g%'
  AND nombre NOT LIKE '%1400g%'
  AND nombre NOT LIKE '%3000g%'
  AND nombre NOT LIKE '%3700g%'
  AND nombre NOT LIKE '%3800g%'
  AND nombre NOT LIKE '%4000g%';

-- Verificar
SELECT unidad, COUNT(*) FROM productos GROUP BY unidad ORDER BY unidad;
SELECT nombre, unidad FROM productos WHERE categoria = 'JUMBALAY' ORDER BY unidad, nombre;
