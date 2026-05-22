-- Agregar columnas faltantes en pedido_items
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS descuento_pct   numeric DEFAULT 0;
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS descuento_monto numeric DEFAULT 0;
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS precio_final    numeric;

-- Inicializar precio_final con precio_unit * cantidad_kg para registros existentes
UPDATE pedido_items SET precio_final = precio_unit * cantidad_kg WHERE precio_final IS NULL;

-- Verificar resultado
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'pedido_items' ORDER BY ordinal_position;
