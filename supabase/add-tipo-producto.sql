-- ══════════════════════════════════════════════════════════
-- Agregar y poblar campo tipo_producto
-- ══════════════════════════════════════════════════════════

-- 1. Agregar columna
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tipo_producto text NOT NULL DEFAULT 'elaborado';

-- 2. Todo Jumbalay, Cortes y Embutidos = reventa
UPDATE productos SET tipo_producto = 'reventa'
WHERE categoria IN ('JUMBALAY', 'CORTES', 'EMBUTIDOS');

-- 3. Productos con receta propia = elaborado
UPDATE productos SET tipo_producto = 'elaborado'
WHERE nombre ILIKE '%Milanesa%'
   OR nombre ILIKE '%Medallones%'
   OR nombre ILIKE '%Pechuguita%'
   OR nombre ILIKE '%Ribs Kansas%'
   OR nombre ILIKE '%Nuggets%'
   OR nombre ILIKE '%Bastones%'
   OR nombre ILIKE '%Caritas%'
   OR nombre ILIKE '%Noisette%';

-- 4. Verificar
SELECT tipo_producto, categoria, COUNT(*) as cant
FROM productos
WHERE activo = true
GROUP BY tipo_producto, categoria
ORDER BY tipo_producto, categoria;
