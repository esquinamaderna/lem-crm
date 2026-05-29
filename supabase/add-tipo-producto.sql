-- ══════════════════════════════════════════════════════════
-- Campo tipo_producto: 'elaborado' o 'reventa'
-- Impacta en el cálculo de reposición del Dashboard
-- ══════════════════════════════════════════════════════════

ALTER TABLE productos ADD COLUMN IF NOT EXISTS tipo_producto text NOT NULL DEFAULT 'elaborado'
  CHECK (tipo_producto IN ('elaborado', 'reventa'));

-- Productos de elaboración propia (tienen receta)
UPDATE productos SET tipo_producto = 'elaborado'
WHERE nombre ILIKE '%Milanesa%'
   OR nombre ILIKE '%Medallón%' OR nombre ILIKE '%Medallones%'
   OR nombre ILIKE '%Pechuguita%'
   OR nombre ILIKE '%Ribs Kansas%'
   OR nombre ILIKE '%Nuggets%'
   OR nombre ILIKE '%Bastones%'
   OR nombre ILIKE '%Caritas%'
   OR nombre ILIKE '%Noisette%';

-- Todo lo demás = reventa
UPDATE productos SET tipo_producto = 'reventa'
WHERE tipo_producto != 'elaborado';

-- Verificar
SELECT tipo_producto, COUNT(*) as cant,
       ROUND(AVG(costo::numeric / NULLIF(precio_venta,0) * 100), 1) AS fc_prom
FROM productos
WHERE activo = true
GROUP BY tipo_producto;
