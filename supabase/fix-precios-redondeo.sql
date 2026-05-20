-- ── Fix precios de venta: redondeo siempre hacia arriba a múltiplo de $500 ──
-- Ejecutar en Supabase SQL Editor

UPDATE productos SET precio_venta = 10000 WHERE nombre ILIKE '%Bastones%';
UPDATE productos SET precio_venta = 26000 WHERE nombre ILIKE '%Peceto%';
UPDATE productos SET precio_venta = 17000 WHERE nombre ILIKE '%Medallones%' AND nombre ILIKE '%12%';
UPDATE productos SET precio_venta = 21000 WHERE nombre ILIKE '%Nuggets%';
UPDATE productos SET precio_venta = 16500 WHERE nombre ILIKE '%Noisette%';
UPDATE productos SET precio_venta = 15000 WHERE nombre ILIKE '%Ribs%';
UPDATE productos SET precio_venta = 17000 WHERE nombre ILIKE '%Caritas%';

-- Verificar resultado
SELECT nombre, precio_venta, costo, 
       ROUND(costo::numeric / precio_venta::numeric * 100, 1) AS fc_pct
FROM productos 
WHERE activo = true 
ORDER BY nombre;
