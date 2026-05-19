-- Fix categorías incorrectas: milanesas de pollo van en POLLO, no en VACUNO
UPDATE productos SET categoria = 'POLLO' WHERE nombre LIKE '%Pollo%' AND categoria = 'VACUNO';
-- Verificar resultado
SELECT nombre, categoria FROM productos ORDER BY categoria, nombre;
