-- Agregar campo unidad_venta a productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS unidad_venta text NOT NULL DEFAULT 'kg' 
  CHECK (unidad_venta IN ('kg', 'u', 'L'));

-- Actualizar productos Jumbalay frascos pequeños → por unidad
UPDATE productos SET unidad_venta = 'u' WHERE categoria = 'JUMBALAY' AND (
  nombre LIKE '%360g%' OR nombre LIKE '%330g%' OR nombre LIKE '%350g%' OR 
  nombre LIKE '%300g%' OR nombre LIKE '%200g%' OR nombre LIKE '%250g%' OR
  nombre LIKE '%450g%' OR nombre LIKE '%440g%' OR nombre LIKE '%190g%' OR
  nombre LIKE '%170g%' OR nombre LIKE '%100g%' OR nombre LIKE '%1L%' OR
  nombre LIKE '%500g%' OR nombre LIKE '%750g%' OR nombre LIKE '%800g%' OR
  nombre = 'Box Experiencia JUMBALAY' OR nombre = 'Box Selección JUMBALAY' OR
  nombre = 'Aceite de Oliva 250 ml'
);

-- Aceite de Oliva también por unidad
UPDATE productos SET unidad_venta = 'u' WHERE nombre ILIKE '%Aceite de Oliva%';

-- CSR embutidos y cortes → por kg (ya están bien)
-- Jumbalay 1500g y 3000g → por kg (ya están bien por default)

-- Verificar
SELECT nombre, categoria, unidad_venta, precio_venta 
FROM productos 
WHERE activo = true 
ORDER BY categoria, unidad_venta, nombre;
