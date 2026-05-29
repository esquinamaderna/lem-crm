-- ══════════════════════════════════════════════════════════
-- Setear tipo_producto correctamente
-- Ejecutar cada uno por separado con RUN
-- ══════════════════════════════════════════════════════════

-- 1. Agregar columna si no existe
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tipo_producto text NOT NULL DEFAULT 'elaborado';

-- 2. Reventa: Jumbalay, Cortes, Embutidos
UPDATE productos SET tipo_producto = 'reventa'
WHERE categoria IN ('JUMBALAY', 'CORTES', 'EMBUTIDOS');

-- 3. Reventa: papas, caritas, nuggets (fraccionado sin proceso)
UPDATE productos SET tipo_producto = 'reventa'
WHERE nombre ILIKE '%Bastones%'
   OR nombre ILIKE '%Caritas%'
   OR nombre ILIKE '%Noisette%'
   OR nombre ILIKE '%Nuggets%';

-- 4. Elaborado: los que sí tienen receta
UPDATE productos SET tipo_producto = 'elaborado'
WHERE nombre ILIKE '%Milanesa%'
   OR nombre ILIKE '%Medallones%'
   OR nombre ILIKE '%Pechuguita%'
   OR nombre ILIKE '%Ribs Kansas%';

-- 5. Verificar resultado
SELECT tipo_producto, categoria, COUNT(*) as cant
FROM productos
WHERE activo = true
GROUP BY tipo_producto, categoria
ORDER BY tipo_producto, categoria;
