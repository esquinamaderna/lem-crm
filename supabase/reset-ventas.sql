-- ── Reset ventas y pedidos para arranque limpio ──
-- ATENCIÓN: esto elimina TODOS los datos de ventas, pedidos, caja y comandas
-- Ejecutar solo una vez antes del arranque real del negocio

TRUNCATE TABLE venta_items        CASCADE;
TRUNCATE TABLE ventas             CASCADE;
TRUNCATE TABLE pedido_items       CASCADE;
TRUNCATE TABLE pedidos            CASCADE;
TRUNCATE TABLE comandas           CASCADE;
TRUNCATE TABLE caja               CASCADE;
TRUNCATE TABLE ordenes_produccion CASCADE;

-- Verificar que quedó todo en cero
SELECT 'ventas'             AS tabla, COUNT(*) AS registros FROM ventas
UNION ALL
SELECT 'pedidos',                      COUNT(*) FROM pedidos
UNION ALL
SELECT 'caja',                         COUNT(*) FROM caja
UNION ALL
SELECT 'ordenes_produccion',           COUNT(*) FROM ordenes_produccion
UNION ALL
SELECT 'comandas',                     COUNT(*) FROM comandas;
