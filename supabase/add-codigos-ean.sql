-- ══════════════════════════════════════════════════════════
-- Códigos EAN-13 para productos La Esquina de Maderna
-- Prefijo interno: 7790001 (reemplazar por prefijo GS1 real)
-- Estructura: 779 (AR) + 0001 (empresa) + 00000 (producto) + dígito verificador
-- ══════════════════════════════════════════════════════════

-- 1. Agregar campos de codificación a productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS codigo_ean   text;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS rnpa         text;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS rne          text;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS cod_interno  text;

-- 2. Índice único en EAN (cuando esté completo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_ean ON productos(codigo_ean) WHERE codigo_ean IS NOT NULL;

-- 3. Cargar códigos EAN por nombre de producto
UPDATE productos SET codigo_ean = '7790001000019', cod_interno = 'LEM-001' WHERE nombre ILIKE '%Milanesa de Pollo s/provenzal%';
UPDATE productos SET codigo_ean = '7790001000026', cod_interno = 'LEM-002' WHERE nombre ILIKE '%Milanesa de Pollo c/provenzal%';
UPDATE productos SET codigo_ean = '7790001000033', cod_interno = 'LEM-003' WHERE nombre ILIKE '%Milanesa de Nalga%';
UPDATE productos SET codigo_ean = '7790001000040', cod_interno = 'LEM-004' WHERE nombre ILIKE '%Milanesa de Peceto%';
UPDATE productos SET codigo_ean = '7790001000057', cod_interno = 'LEM-005' WHERE nombre ILIKE '%Milanesa de Carré%';
UPDATE productos SET codigo_ean = '7790001000064', cod_interno = 'LEM-006' WHERE nombre ILIKE '%Medallones de Pollo x4%';
UPDATE productos SET codigo_ean = '7790001000071', cod_interno = 'LEM-007' WHERE nombre ILIKE '%Medallones de Pollo x12%';
UPDATE productos SET codigo_ean = '7790001000088', cod_interno = 'LEM-008' WHERE nombre ILIKE '%Pechuguitas%';
UPDATE productos SET codigo_ean = '7790001000095', cod_interno = 'LEM-009' WHERE nombre ILIKE '%Ribs Kansas%';
UPDATE productos SET codigo_ean = '7790001000101', cod_interno = 'LEM-010' WHERE nombre ILIKE '%Bastones de Papa%';
UPDATE productos SET codigo_ean = '7790001000118', cod_interno = 'LEM-011' WHERE nombre ILIKE '%Caritas de Papa%';
UPDATE productos SET codigo_ean = '7790001000125', cod_interno = 'LEM-012' WHERE nombre ILIKE '%Noisette%';
UPDATE productos SET codigo_ean = '7790001000132', cod_interno = 'LEM-013' WHERE nombre ILIKE '%Nuggets%';
UPDATE productos SET codigo_ean = '7790001000200', cod_interno = 'CSR-020' WHERE nombre ILIKE '%Ribs CSR%';
UPDATE productos SET codigo_ean = '7790001000217', cod_interno = 'CSR-021' WHERE nombre ILIKE '%Colorado CSR%';
UPDATE productos SET codigo_ean = '7790001000224', cod_interno = 'CSR-022' WHERE nombre ILIKE '%Solomillo CSR%';
UPDATE productos SET codigo_ean = '7790001000231', cod_interno = 'CSR-023' WHERE nombre ILIKE '%Carré CSR%';
UPDATE productos SET codigo_ean = '7790001000248', cod_interno = 'CSR-024' WHERE nombre ILIKE '%Pecho CSR%';
UPDATE productos SET codigo_ean = '7790001000255', cod_interno = 'CSR-025' WHERE nombre ILIKE '%Bondiola CSR%';
UPDATE productos SET codigo_ean = '7790001000262', cod_interno = 'CSR-026' WHERE nombre ILIKE '%Churrasco CSR%';
UPDATE productos SET codigo_ean = '7790001000279', cod_interno = 'CSR-027' WHERE nombre ILIKE '%Matambrito CSR%';
UPDATE productos SET codigo_ean = '7790001000309', cod_interno = 'CSR-030' WHERE nombre ILIKE '%Chorizo CSR%';
UPDATE productos SET codigo_ean = '7790001000316', cod_interno = 'CSR-031' WHERE nombre ILIKE '%Morcilla CSR%';
UPDATE productos SET codigo_ean = '7790001000323', cod_interno = 'CSR-032' WHERE nombre ILIKE '%Salchicha CSR%';
UPDATE productos SET codigo_ean = '7790001000330', cod_interno = 'CSR-033' WHERE nombre ILIKE '%Jamón Fresco CSR%';
UPDATE productos SET codigo_ean = '7790001000347', cod_interno = 'CSR-034' WHERE nombre ILIKE '%Salada CSR%';
UPDATE productos SET codigo_ean = '7790001000354', cod_interno = 'CSR-035' WHERE nombre ILIKE '%Ahumada CSR%';

-- Los Jumbalay ya tienen su propio EAN de la lista del proveedor
-- Se pueden cargar manualmente desde Productos → Editar

-- 4. Verificar
SELECT cod_interno, codigo_ean, nombre, categoria
FROM productos
WHERE codigo_ean IS NOT NULL
ORDER BY cod_interno;
