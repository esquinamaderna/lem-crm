-- Ejecutar cada bloque por separado (un RUN por vez)

-- PASO 1: Si existe columna 'unidad' del intento anterior, renombrarla
-- (correr solo si existe, ignorar el error si no existe)
ALTER TABLE productos RENAME COLUMN unidad TO unidad_venta;

-- PASO 2: Si no existía 'unidad', crear 'unidad_venta' directamente
ALTER TABLE productos ADD COLUMN IF NOT EXISTS unidad_venta text NOT NULL DEFAULT 'kg';

-- PASO 3: Setear 'u' a todos los Jumbalay frascos pequeños
UPDATE productos SET unidad_venta = 'u'
WHERE categoria = 'JUMBALAY'
  AND nombre NOT LIKE '%1500g%'
  AND nombre NOT LIKE '%1400g%'
  AND nombre NOT LIKE '%3000g%'
  AND nombre NOT LIKE '%3700g%'
  AND nombre NOT LIKE '%3800g%'
  AND nombre NOT LIKE '%4000g%';

-- PASO 4: Verificar
SELECT nombre, unidad_venta FROM productos
WHERE categoria = 'JUMBALAY'
ORDER BY unidad_venta, nombre;
