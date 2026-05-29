-- ══════════════════════════════════════════════════════════
-- Productos Cabañas Santa Rita — CORTES y EMBUTIDOS
-- Precio costo + 40% markup → ceil $500
-- ══════════════════════════════════════════════════════════

-- Agregar categorías nuevas al check si existe
-- (si da error de constraint, ignorar — ya están)

-- EMBUTIDOS
INSERT INTO productos (nombre, categoria, precio_venta, costo, stock_kg, vida_util_dias, activo, instrucciones) VALUES
('Chorizo CSR',       'EMBUTIDOS', 8500,  5940,  0, 7,  true, 'Asar a la parrilla o plancha. Pinchar antes de cocinar.'),
('Morcilla CSR',      'EMBUTIDOS', 5500,  3795,  0, 5,  true, 'Asar a la parrilla suave. No pinchar.'),
('Salchicha CSR',     'EMBUTIDOS', 12000, 8454,  0, 7,  true, 'Hervir 10 min o asar a la parrilla.'),
('Jamón Fresco CSR',  'EMBUTIDOS', 8000,  5500,  0, 10, true, 'Cortar fino. Ideal frío o a la plancha.'),
('Salada CSR',        'EMBUTIDOS', 14000, 9950,  0, 10, true, 'Ahumada y curada. Servir fría o a la parrilla.'),
('Ahumada CSR',       'EMBUTIDOS', 15000, 10400, 0, 10, true, 'Lista para consumir. Calentar a la parrilla opcional.');

-- CORTES
INSERT INTO productos (nombre, categoria, precio_venta, costo, stock_kg, vida_util_dias, activo, instrucciones) VALUES
('Ribs CSR',          'CORTES', 8500,  5990,  0, 7,  true, 'Horno 180°C × 45 min tapado + 15 min destapado. O parrilla indirecta.'),
('Colorado CSR',      'CORTES', 14000, 9702,  0, 7,  true, 'Parrilla a fuego medio. Punto jugoso a 60°C interno.'),
('Solomillo CSR',     'CORTES', 15500, 10725, 0, 7,  true, 'Corte noble. Vuelta y vuelta en plancha bien caliente. No pasar de punto.'),
('Carré CSR',         'CORTES', 10000, 6875,  0, 7,  true, 'Parrilla o horno. Ideal con chimichurri.'),
('Pecho CSR',         'CORTES', 10000, 6875,  0, 7,  true, 'Cocción lenta 3-4 hs a baja temperatura. Ideal ahumado.'),
('Bondiola CSR',      'CORTES', 11500, 8000,  0, 7,  true, 'Cerdo. Parrilla lenta o horno 160°C × 2 hs.'),
('Churrasco CSR',     'CORTES', 15500, 10725, 0, 7,  true, 'Vuelta y vuelta. Corte fino, cocción rápida.'),
('Matambrito CSR',    'CORTES', 18000, 12705, 0, 7,  true, 'Parrilla lenta. Rellenar opcional. Punto jugoso.');

-- Verificar
SELECT nombre, categoria, precio_venta, costo, 
       ROUND(costo::numeric / precio_venta::numeric * 100, 1) AS fc_pct
FROM productos 
WHERE categoria IN ('CORTES', 'EMBUTIDOS')
ORDER BY categoria, nombre;
