-- Verificar columnas de pedido_items
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pedido_items'
ORDER BY ordinal_position;

-- Ver algunos registros para confirmar que tienen datos
SELECT * FROM pedido_items LIMIT 5;
