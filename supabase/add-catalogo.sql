-- Ejecutar en Supabase SQL Editor
ALTER TABLE productos ADD COLUMN IF NOT EXISTS visible_catalogo boolean NOT NULL DEFAULT false;
