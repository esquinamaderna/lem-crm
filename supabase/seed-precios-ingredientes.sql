-- Precios iniciales de ingredientes — 2026-05-29
-- Ejecutar en Supabase SQL Editor → RUN

INSERT INTO ingredientes_precios (nombre, precio, fecha, notas) VALUES
('Pechuga de pollo', 6700, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Recortes de pechuga', 6700, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Nalga (fileteada)', 24000, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Peceto (fileteado)', 11699, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Carré de cerdo', 11000, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Ribs de cerdo', 5300, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Pan rallado', 1696, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Pan rallado Crunch', 4180, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Huevos frescos', 197, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Leche', 1739, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Mostaza', 2815, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Sal fina', 2650, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Pimienta negra molida', 78600, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Ajo en polvo', 20800, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Perejil seco picado', 192000, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Harina 0000', 870, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Azúcar', 6000, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Pimentón ahumado', 24360, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Pimienta de cayena', 17900, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Mostaza en polvo', 13470, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Clavo de olor', 66040, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Canela', 1099, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Cebolla en polvo', 8900, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Ajo picado en aceite', 5519, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Caritas congeladas', 7444, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Papas bastón congeladas', 4333, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Papas Noisette congeladas', 7300, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Nuggets crocantes (Sadia)', 9200, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Film / envase unitario', 81, '2026-05-29', 'Precio base inicial registrado el 2026-05-29'),
('Condimento provenzal', 17700, '2026-05-29', 'Precio base inicial registrado el 2026-05-29');

-- Verificar
SELECT nombre, precio, fecha FROM ingredientes_precios ORDER BY nombre;
