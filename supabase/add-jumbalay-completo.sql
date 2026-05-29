-- ══════════════════════════════════════════════════════════
-- Productos JUMBALAY completos — precio lista + IVA 21% → ceil $500
-- Frascos <1500g = por unidad (stock en u, precio por u)
-- Frascos 1500g+ = por kg (stock en kg, precio por kg)
-- ══════════════════════════════════════════════════════════

-- Primero corregir categorías existentes
UPDATE productos SET categoria = 'EMBUTIDOS' WHERE nombre = 'Colorado CSR';
UPDATE productos SET categoria = 'CORTES'    WHERE nombre = 'Ribs Kansas BBQ';

-- ── ACEITUNAS línea estándar (360g x u) ──
INSERT INTO productos (nombre, categoria, precio_venta, costo, stock_kg, vida_util_dias, activo) VALUES
('Aceitunas Verdes c/Carozo JBL 360g',         'JUMBALAY', 500,  384,  0, 730, true),
('Aceitunas Verdes Descarozadas JBL 360g',      'JUMBALAY', 500,  483,  0, 730, true),
('Aceitunas Verdes Fileteadas JBL 360g',        'JUMBALAY', 500,  356,  0, 730, true),
('Aceitunas Verdes Rellenas Morron JBL 360g',   'JUMBALAY', 500,  549,  0, 730, true),
('Aceitunas Negras c/Carozo JBL 360g',          'JUMBALAY', 500,  477,  0, 730, true),
('Aceitunas Negras Fileteadas JBL 360g',        'JUMBALAY', 500,  376,  0, 730, true),

-- ── ACEITUNAS PREMIUM (360g x u) ──
('Aceitunas Verdes c/Carozo Premium JBL 360g',  'JUMBALAY', 500,  494,  0, 730, true),
('Aceitunas Verdes Descarozadas Premium JBL 360g','JUMBALAY',500, 516,  0, 730, true),
('Aceitunas Verdes Desc. Magna JBL 360g',       'JUMBALAY', 1000, 690, 0, 730, true),
('Aceitunas Verdes Rellenas Premium JBL 360g',  'JUMBALAY', 500,  582,  0, 730, true),
('Aceitunas Verdes Rellenas Aceite Premium JBL','JUMBALAY', 1000, 655,  0, 730, true),
('Aceitunas Negras c/Carozo Premium JBL 360g',  'JUMBALAY', 1000, 642,  0, 730, true),
('Aceitunas Negras Descarozadas Premium JBL 360g','JUMBALAY',500, 488,  0, 730, true),
('Aceitunas Negras Condimentadas Premium JBL',  'JUMBALAY', 1000, 642,  0, 730, true),
('Aceitunas Negras Tipo Griegas Premium JBL',   'JUMBALAY', 1000, 709,  0, 730, true),

-- ── ACEITUNAS PREMIUM grandes (por kg) ──
('Aceitunas Verdes c/Carozo Premium JBL 1500g', 'JUMBALAY', 5000, 4031, 0, 730, true),
('Aceitunas Verdes Descarozadas Premium JBL 1500g','JUMBALAY',4500,3917, 0, 730, true),
('Aceitunas Verdes Desc. Magna JBL 1500g',      'JUMBALAY', 7000, 5480, 0, 730, true),
('Aceitunas Verdes Rellenas Premium JBL 1500g', 'JUMBALAY', 5000, 4164, 0, 730, true),
('Aceitunas Negras c/Carozo Premium JBL 1500g', 'JUMBALAY', 7500, 5783, 0, 730, true),
('Aceitunas Negras Descarozadas Premium JBL 1500g','JUMBALAY',6000,4811, 0, 730, true),
('Aceitunas Negras Condimentadas Premium JBL 1500g','JUMBALAY',8000,6516, 0, 730, true),
('Aceitunas Negras Tipo Griegas Premium JBL 1500g','JUMBALAY',8000,6397, 0, 730, true),

-- ── CONSERVAS Y ENCURTIDOS (frascos pequeños x u) ──
('Ajíes en Vinagre JBL 330g',                  'JUMBALAY', 500,  387,  0, 730, true),
('Alcaparras JBL 100g',                         'JUMBALAY', 500,  605,  0, 730, true),
('Berenjenas Condimentadas JBL 360g',           'JUMBALAY', 500,  554,  0, 730, true),
('Cebollas Caramelizadas JBL 330g',             'JUMBALAY', 1000, 747,  0, 730, true),
('Cebollitas en Vinagre JBL 360g',              'JUMBALAY', 500,  364,  0, 730, true),
('Choclitos Baby Agridulces JBL 360g',          'JUMBALAY', 1000, 747,  0, 730, true),
('Corazón de Alcauciles JBL 350g',              'JUMBALAY', 1000, 931,  0, 730, true),
('Espárragos Verdes JBL 330g',                  'JUMBALAY', 1000, 784,  0, 730, true),
('Pepinitos en Vinagre JBL 360g',               'JUMBALAY', 500,  273,  0, 730, true),
('Pepinos Agridulces JBL 360g',                 'JUMBALAY', 500,  451,  0, 730, true),
('Pepinos Agridulces en Rodajas JBL 330g',      'JUMBALAY', 500,  481,  0, 730, true),
('Pickles en Vinagre JBL 360g',                 'JUMBALAY', 500,  241,  0, 730, true),
('Pimientos Agridulces JBL 300g',               'JUMBALAY', 1000, 747,  0, 730, true),
('Pimientos Morrones Enteros JBL 360g',         'JUMBALAY', 500,  595,  0, 730, true),
('Zanahorias Encurtidas Agridulces JBL 360g',   'JUMBALAY', 1000, 747,  0, 730, true),

-- ── CONSERVAS grandes (por kg) ──
('Berenjenas Condimentadas JBL 1500g',          'JUMBALAY', 6000, 5052, 0, 730, true),
('Cebollas Caramelizadas JBL 1500g',            'JUMBALAY', 9500, 8830, 0, 730, true),
('Cebollitas en Vinagre JBL 1500g',             'JUMBALAY', 4000, 3504, 0, 730, true),
('Corazón de Alcauciles JBL 1500g',             'JUMBALAY', 10000,9914, 0, 730, true),
('Pepinitos en Vinagre JBL 1500g',              'JUMBALAY', 3000, 2893, 0, 730, true),
('Pickles en Vinagre JBL 1500g',                'JUMBALAY', 3000, 2531, 0, 730, true),

-- ── LÍNEA TERRA Gourmet (200g x u) ──
('Tomates Secos Mediterráneos JBL 200g',        'JUMBALAY', 1000, 707,  0, 730, true),
('Tomates Secos Patagónicos JBL 200g',          'JUMBALAY', 1000, 707,  0, 730, true),
('Pasta Aceitunas Negras JBL 200g',             'JUMBALAY', 500,  560,  0, 730, true),
('Pasta Aceitunas Verdes JBL 200g',             'JUMBALAY', 500,  519,  0, 730, true),

-- ── LÍNEA VITANOVA ──
('Ajo Picado en Aceite Girasol JBL 170g',       'JUMBALAY', 500,  557,  0, 730, true),
('Ajo Picado en Aceite Oliva JBL 170g',         'JUMBALAY', 1000, 619,  0, 730, true),

-- ── ALMÍBARES (x u) ──
('Higos en Almíbar JBL 450g',                   'JUMBALAY', 500,  552,  0, 730, true),
('Zapallos en Almíbar JBL 360g',                'JUMBALAY', 500,  552,  0, 730, true),
('Mamón en Almíbar JBL 440g',                   'JUMBALAY', 500,  552,  0, 730, true),

-- ── MERMELADAS ARTESANALES (450g x u) ──
('Mermelada Arándanos JBL 450g',                'JUMBALAY', 500,  553,  0, 730, true),
('Dulce de Cayote JBL 450g',                    'JUMBALAY', 500,  552,  0, 730, true),
('Mermelada Durazno JBL 450g',                  'JUMBALAY', 500,  541,  0, 730, true),
('Mermelada Frutilla JBL 450g',                 'JUMBALAY', 1000, 506,  0, 730, true),
('Mermelada Frutos del Bosque JBL 450g',        'JUMBALAY', 500,  568,  0, 730, true),
('Mermelada Higo JBL 450g',                     'JUMBALAY', 500,  532,  0, 730, true),
('Mermelada Limón Miel Jengibre JBL 450g',      'JUMBALAY', 500,  453,  0, 730, true),
('Mermelada Manzana y Zapallo JBL 450g',        'JUMBALAY', 1000, 506,  0, 730, true),
('Mermelada Naranja JBL 450g',                  'JUMBALAY', 500,  438,  0, 730, true),
('Mermelada Tomate JBL 450g',                   'JUMBALAY', 500,  438,  0, 730, true),
('Mermelada Multifruta JBL 450g',               'JUMBALAY', 500,  568,  0, 730, true),

-- ── MERMELADAS LIGHT (450g x u) ──
('Mermelada Arándanos Light JBL 450g',          'JUMBALAY', 500,  408,  0, 730, true),
('Mermelada Durazno Light JBL 450g',            'JUMBALAY', 500,  466,  0, 730, true),
('Mermelada Frutilla y Arándanos Light JBL',    'JUMBALAY', 500,  427,  0, 730, true),
('Mermelada Frutos del Bosque Light JBL',       'JUMBALAY', 500,  444,  0, 730, true),
('Mermelada Mango y Maracuyá Light JBL',        'JUMBALAY', 500,  467,  0, 730, true),
('Mermelada Mora Light JBL 450g',               'JUMBALAY', 500,  444,  0, 730, true),

-- ── LÍNEA NATURALIS (190g x u) ──
('Untable Durazno y Damasco JBL 190g',          'JUMBALAY', 1500, 1035, 0, 730, true),
('Untable Frutos del Bosque JBL 190g',          'JUMBALAY', 1500, 1035, 0, 730, true),
('Untable Mango y Maracuyá JBL 190g',           'JUMBALAY', 1500, 1035, 0, 730, true),

-- ── MIEL ──
('Miel Natural de Abejas JBL 250g',             'JUMBALAY', 500,  359,  0, 730, true),
('Miel Natural de Abejas JBL 500g',             'JUMBALAY', 500,  585,  0, 730, true),

-- ── TOMATE TRITURADO ──
('Tomate Triturado JBL 1L',                     'JUMBALAY', 500,  309,  0, 730, true),

-- ── BOX PREMIUM ──
('Box Experiencia JUMBALAY',                    'JUMBALAY', 108000, 88449, 0, 730, true),
('Box Selección JUMBALAY',                      'JUMBALAY', 94000,  77139, 0, 730, true);

-- ── Verificar resultado ──
SELECT categoria, COUNT(*) as cant, MIN(precio_venta) as pv_min, MAX(precio_venta) as pv_max
FROM productos
WHERE activo = true
GROUP BY categoria
ORDER BY categoria;
