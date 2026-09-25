-- ══════════════════════════════════════════════════════════
-- BOXES — Armador de boxes de almacén · La Esquina de Maderna
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS box_productos (
  id            text primary key,
  nombre        text not null,
  marca         text,
  presentacion  text,
  costo         numeric,
  grupo         text not null check (grupo in ('A','B','C','Especial')),
  familia       text,
  tipos         text[] not null default '{}',
  estado        text,
  precio_tipo   text default 'manual',
  precio_nota   text,
  precio_fecha  text,
  precio_fuente text,
  activo        boolean not null default true,
  updated_at    timestamptz default now()
);

CREATE TABLE IF NOT EXISTS box_tipos (
  nombre      text primary key,
  familia     text not null,
  descripcion text,
  orden       int not null default 0
);

CREATE TABLE IF NOT EXISTS box_ocasiones (
  id     text primary key,
  nombre text not null,
  fecha  text,
  regla  text,
  fuente text,
  orden  int not null default 0
);

CREATE TABLE IF NOT EXISTS box_tamanos (
  tamano   int primary key,
  precio   numeric not null,
  grupos   text[] not null,
  objetivo numeric not null
);

CREATE TABLE IF NOT EXISTS box_ajustes (
  id           int primary key default 1 check (id = 1),
  packaging    numeric not null default 500,
  comision_pct numeric not null default 4
);

CREATE TABLE IF NOT EXISTS boxes_armados (
  id               bigint primary key generated always as identity,
  nombre           text not null,
  tipo             text not null,
  ocasion          text,
  tamano           int not null,
  precio           numeric not null,
  items            jsonb not null,
  costo_mercaderia numeric not null,
  packaging        numeric not null,
  comision         numeric not null,
  margen           numeric,
  notas            text,
  created_at       timestamptz default now()
);

ALTER TABLE box_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_tipos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_ocasiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_tamanos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_ajustes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE boxes_armados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow all box_productos" ON box_productos;
DROP POLICY IF EXISTS "allow all box_tipos" ON box_tipos;
DROP POLICY IF EXISTS "allow all box_ocasiones" ON box_ocasiones;
DROP POLICY IF EXISTS "allow all box_tamanos" ON box_tamanos;
DROP POLICY IF EXISTS "allow all box_ajustes" ON box_ajustes;
DROP POLICY IF EXISTS "allow all boxes_armados" ON boxes_armados;
CREATE POLICY "allow all box_productos" ON box_productos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all box_tipos"     ON box_tipos     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all box_ocasiones" ON box_ocasiones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all box_tamanos"   ON box_tamanos   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all box_ajustes"   ON box_ajustes   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all boxes_armados" ON boxes_armados FOR ALL USING (true) WITH CHECK (true);

-- ── Datos iniciales (Maderna_Armador · 25/09/2026) ──

INSERT INTO box_ajustes (id, packaging, comision_pct) VALUES (1, 500, 4.0) ON CONFLICT (id) DO NOTHING;

INSERT INTO box_tamanos (tamano, precio, grupos, objetivo) VALUES
(10,10000,ARRAY['A','C','C']::text[],4999.91),
(15,15000,ARRAY['A','B','B','C','C']::text[],8999.71),
(20,20000,ARRAY['A','A','B','B','C','C','C']::text[],12999.62),
(25,25000,ARRAY['A','A','B','B','B','C','C','C','C']::text[],15999.52)
ON CONFLICT (tamano) DO NOTHING;

INSERT INTO box_tipos (nombre, familia, descripcion, orden) VALUES
('Despensa','PARA COMER','Básicos de todos los días',1),
('Rendidor','PARA COMER','Más comidas por cada peso',2),
('Cocina','PARA COMER','Ingredientes para cocinar',3),
('Alacena','PARA COMER','Reposición general',4),
('Desayuno','PARA COMER','Desayuno y merienda',5),
('Kids','PARA COMER','Merienda y favoritos chicos',6),
('Limpieza','PARA LA CASA','Limpieza general',7),
('Lavadero','PARA LA CASA','Cuidado de la ropa',8),
('Baño','PARA LA CASA','Reposición del baño',9),
('Higiene','PARA LA CASA','Cuidado personal',10),
('Mascotas','PARA LA CASA','Básicos perro/gato',11),
('Familiar','PARA RESOLVER','Formatos grandes',12),
('Quincena','PARA RESOLVER','Reposición mixta 15 días',13),
('Express','PARA RESOLVER','Faltantes cotidianos',14),
('Maderna Mix','PARA RESOLVER','Mezcla libre controlada',15),
('Navideña','PARA CELEBRAR','Pan dulce + dulces navideños. Los tamaños grandes suman sidra con alcohol.',16)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO box_ocasiones (id, nombre, fecha, regla, fuente, orden) VALUES
('reyes','Reyes Magos','6 de enero','Fecha fija','https://sde.gob.ar/2025/01/06/6-de-enero-dia-de-los-reyes-magos-2/',1),
('valentin','San Valentín','14 de febrero','Fecha fija','https://www.argentina.gob.ar/node/355082',2),
('pascuas','Pascuas','5 de abril','Fecha móvil · 2026','https://www.argentina.gob.ar/noticias/propuestas-para-recorrer-el-pais-en-semana-santa',3),
('mayo','25 de Mayo','25 de mayo','Fecha patria','https://www.argentina.gob.ar/feriados',4),
('padre','Día del Padre','21 de junio','Tercer domingo de junio','https://www.lanacion.com.ar/sociedad/cuando-es-el-dia-del-padre-2026-en-la-argentina-nid27052026/',5),
('dulzura','Semana de la Dulzura','1 al 7 de julio','Fechas fijas','https://tn.com.ar/sociedad/2026/07/01/semana-de-la-dulzura-por-que-se-celebra-del-1-al-7-de-julio/',6),
('independencia','Día de la Independencia','9 de julio','Fecha patria','https://www.argentina.gob.ar/feriados',7),
('amigo','Día del Amigo','20 de julio','Fecha fija','https://sde.gob.ar/2024/07/20/cada-20-de-julio-se-celebra-el-dia-del-amigo-en-argentina/',8),
('ninez','Día de la Niñez','16 de agosto','Tercer domingo de agosto','https://caij.org.ar/',9),
('maestro','Día del Maestro','11 de septiembre','Fecha fija','https://www.argentina.gob.ar/node/170535',10),
('primavera','Primavera y Estudiante','21 de septiembre','Celebración · fecha fija','https://fadeweb.uncoma.edu.ar/index.php/2026/09/21/21-de-septiembre-dia-de-la-primavera-y-del-estudiante-2/',11),
('madre','Día de la Madre','18 de octubre','Tercer domingo de octubre','https://www4.hcdn.gob.ar/dependencias/dsecretaria/Periodo2022/PDF2022/TP2022/6289-D-2022.pdf',12),
('nochebuena','Nochebuena','24 de diciembre','Fecha fija','https://www.lanacion.com.ar/feriados/2024/el-24-de-diciembre-es-feriado-nid11122024/',13),
('navidad','Navidad','25 de diciembre','Fecha fija','https://www.argentina.gob.ar/feriados',14),
('fin','Fin de año','31 de diciembre','Fecha fija','https://base.com/es-AR/blog/?p=18302',15)
ON CONFLICT (id) DO NOTHING;

INSERT INTO box_productos (id, nombre, marca, presentacion, costo, grupo, familia, tipos, estado, precio_tipo, precio_nota, precio_fecha, precio_fuente) VALUES
('R2','Aceite','Cañuelas','Girasol 900 cc',2999.91,'A',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R3','Aceite','Marolio','Mezcla 900 cc',2299.9,'A',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R4','Aceite','Marolio','Girasol 900 cc',2799.9,'A',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R5','Arroz','Cañuelas','Largo fino 1 kg',1399.9,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R6','Arroz','Cañuelas','Largo fino 500 g',799.9,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R7','Arroz','Molto','Largo fino 1 kg',1599.9,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R8','Avena','Cañuelas','Instantánea 400 g',1399.9,'B',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R9','Harina','Cañuelas','000 1 kg',879.9,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R10','Azúcar','Marolio','1 kg',1199.9,'B',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R11','Arvejas','Molto','Tetra 340 g',594.9,'C',null,ARRAY['Despensa','Cocina','Alacena','Quincena','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R12','Puré tomate','Marolio','520 g',629.9,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R13','Mayonesa','Cañuelas','250 g',1099.89,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R14','Mayonesa','Cañuelas','500 g',1999.9,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R15','Galletitas','Lía','Surtido 400 g',1999.9,'B',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R16','Café instantáneo','Arlistán','170 g',6199.9,'Especial',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R17','Duraznos','Marolio','Mitades 820 g',2499.9,'A',null,ARRAY['Despensa','Cocina','Alacena','Quincena','Maderna Mix']::text[],'Verificado','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R18','Yerba mate','Andresito','500 g',1550,'A',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Referencia reciente','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R19','Yerba mate','Playadito','500 g',2500,'A',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Referencia reciente','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R20','Fideos secos','Marolio','500 g',700,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado a validar','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R21','Fideos secos','Lucchetti','500 g',1500,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado a validar','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R22','Polenta','Marolio','500-750 g',900,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado a validar','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R23','Sal fina','Marolio/Celusal','500 g-1 kg',800,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado a validar','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R24','Lentejas','Económica','400-500 g',1000,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado a validar','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R25','Garbanzos','Económica','400-500 g',1000,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado a validar','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R26','Galletitas crackers','Marolio','300 g',900,'C',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado a validar','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R27','Detergente','Cif/Similar','300 ml',1500,'B',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado a validar','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R28','Limpiador pisos','Poett/Similar','900 ml',1500,'B',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado a validar','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R29','Jabón en polvo','Ala/Similar','400 g',1200,'B',null,ARRAY['Lavadero','Limpieza','Quincena','Maderna Mix']::text[],'Estimado a validar','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R30','Papel higiénico','Higienol/Similar','4 rollos',1500,'B',null,ARRAY['Baño','Higiene','Familiar','Quincena','Maderna Mix']::text[],'Estimado a validar','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('R31','Esponja','Virulana/Similar','1 un',650,'C',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado a validar','original','Importe conservado del Excel original; vigencia no verificada.','Sin fecha de cotización',null),
('P001','Aceite girasol','Prados del Sol','900 ml',2450,'A',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/almacen/?page=6'),
('P002','Aceite girasol','Cañuelas','1.5 L',6279,'A',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/almacen/?page=8'),
('P003','Yerba mate','A definir','500 g',2600,'A',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P004','Yerba mate','A definir','1 kg',5000,'A',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P005','Café molido','A definir','250 g',5500,'A',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P006','Café instantáneo','A definir','100/170 g',6200,'A',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P007','Atún','A definir','170 g',2400,'A',null,ARRAY['Despensa','Cocina','Alacena','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P008','Arroz','Primer Precio','1 kg',1259,'A',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/almacen/?page=8'),
('P009','Leche larga vida','A definir','1 L',1800,'B',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P010','Leche en polvo','A definir','400 g',5500,'A',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P011','Cacao en polvo','A definir','360 g',3500,'A',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P012','Cereal desayuno','A definir','300 g',3000,'A',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P013','Té','A definir','25 saquitos',1400,'B',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P014','Mate cocido','A definir','25 saquitos',1300,'B',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P015','Azúcar','A definir','1 kg',1300,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P016','Edulcorante','A definir','200 ml',2200,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P017','Harina 000','A definir','1 kg',1000,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P018','Harina leudante','Morixe','1 kg',1499,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/almacen/?page=6'),
('P019','Polenta','Primer Precio','500 g',669,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/almacen?page=12'),
('P020','Fideos secos','A definir','500 g',1000,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P021','Fideos premium','A definir','500 g',1700,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P022','Puré de tomate','A definir','520 g',900,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P023','Tomate triturado','A definir','500 g',1500,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P024','Lentejas','A definir','500 g',1800,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P025','Garbanzos','A definir','500 g',1800,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P026','Porotos','A definir','500 g',1900,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P027','Arvejas lata','A definir','300 g',900,'B',null,ARRAY['Despensa','Cocina','Alacena','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P028','Choclo lata','Molto','300 g',1499,'B',null,ARRAY['Despensa','Cocina','Alacena','Quincena','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/almacen/?page=6'),
('P029','Caballa','A definir','380 g',3000,'A',null,ARRAY['Despensa','Cocina','Alacena','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P030','Sardinas','A definir','125 g',1900,'B',null,ARRAY['Despensa','Cocina','Alacena','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P031','Caldo cubos','A definir','12 u',1600,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P032','Sal fina','Celusal','500 g',1449,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/almacen/?page=8'),
('P033','Sal gruesa','A definir','1 kg',1100,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P034','Vinagre','Casalta','1 L',1199,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/almacen/?page=6'),
('P035','Mayonesa','A definir','475 g',2200,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P036','Ketchup','A definir','500 g',2200,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P037','Mostaza','A definir','250 g',1200,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P038','Avena','A definir','500 g',1800,'B',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P039','Galletitas agua','A definir','300 g',1200,'C',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P040','Galletitas dulces','A definir','300 g',1700,'B',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P041','Galletitas rellenas','A definir','120 g',1000,'C',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P042','Mermelada','A definir','450 g',2200,'B',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P043','Dulce de leche','A definir','400 g',2200,'B',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P044','Bizcochos','A definir','250 g',1200,'C',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P045','Pochoclo maíz','A definir','400 g',1000,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P046','Gelatina','A definir','8 porc.',1000,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P047','Flan polvo','A definir','8 porc.',1000,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P048','Detergente vajilla','Zorro','500 ml',2139,'B',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/zorro'),
('P049','Lavandina','A definir','1 L',1000,'C',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P050','Lavandina gel','A definir','700 ml',2200,'B',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P051','Limpiador pisos','A definir','900 ml',1800,'A',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P052','Limpiador cremoso','A definir','450 ml',2200,'B',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P053','Desinfectante aerosol','A definir','360 ml',3200,'A',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P054','Alcohol','A definir','500 ml',1700,'B',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P055','Esponja cocina','A definir','2 u',1000,'C',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P056','Paño multiuso','A definir','3 u',1400,'C',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P057','Bolsas residuos','A definir','20 u',1600,'B',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P058','Rollo cocina','A definir','3 u',1900,'B',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P059','Jabón ropa polvo','Zorro','800 g',2415.74,'A',null,ARRAY['Lavadero','Limpieza','Quincena','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/jabon-en-polvo-evolution-quitamanchas-zorro-800-gr/p'),
('P060','Jabón ropa líquido','A definir','800 ml',3000,'A',null,ARRAY['Lavadero','Limpieza','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P061','Suavizante','A definir','900 ml',2000,'B',null,ARRAY['Lavadero','Limpieza','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P062','Jabón blanco','A definir','1 u',900,'C',null,ARRAY['Lavadero','Limpieza','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P063','Quitamanchas','A definir','400 g',4000,'A',null,ARRAY['Lavadero','Limpieza','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P064','Apresto','A definir','500 ml',2200,'B',null,ARRAY['Lavadero','Limpieza','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P065','Broches ropa','A definir','12 u',1400,'C',null,ARRAY['Lavadero','Limpieza','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P066','Papel higiénico','A definir','4 x 30 m',2000,'A',null,ARRAY['Baño','Higiene','Familiar','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P067','Papel higiénico','A definir','8 rollos',4000,'A',null,ARRAY['Baño','Higiene','Familiar','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P068','Jabón tocador','A definir','3 u',2200,'B',null,ARRAY['Baño','Higiene','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P069','Shampoo','A definir','400 ml',3800,'A',null,ARRAY['Baño','Higiene','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P070','Acondicionador','A definir','400 ml',3800,'A',null,ARRAY['Baño','Higiene','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P071','Pasta dental','A definir','90 g',2200,'B',null,ARRAY['Baño','Higiene','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P072','Cepillo dental','A definir','1 u',1800,'B',null,ARRAY['Baño','Higiene','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P073','Desodorante aerosol','A definir','150 ml',3000,'A',null,ARRAY['Baño','Higiene','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P074','Algodón','A definir','100 g',1500,'C',null,ARRAY['Baño','Higiene','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P075','Hisopos','A definir','100 u',1200,'C',null,ARRAY['Baño','Higiene','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P076','Toallitas femeninas','A definir','16 u',3200,'A',null,ARRAY['Baño','Higiene','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P077','Pañuelos descartables','A definir','10 u',500,'C',null,ARRAY['Baño','Higiene','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P078','Alimento perro','Primer Precio','1.5 kg',3819,'A',null,ARRAY['Mascotas','Quincena','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/primer-precio?page=7'),
('P079','Alimento perro','Raza','3 kg',7599.9,'A',null,ARRAY['Mascotas','Quincena','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/alimento-para-perros-carne-primer-precio-10-kg/p'),
('P080','Alimento gato','Raza','1 kg',3282.12,'A',null,ARRAY['Mascotas','Quincena','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista. Variante pollo y leche; precio de lista publicado.','Consulta 25/09/2026','https://www.cordiez.com.ar/mascotas/alimento-para-gatos/alimento-para-gatos'),
('P081','Alimento gato','Raza','3 kg',9384.12,'A',null,ARRAY['Mascotas','Quincena','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/mascotas/alimento-para-gatos/alimento-para-gatos'),
('P082','Piedritas sanitarias','A definir','2 kg',3866,'A',null,ARRAY['Mascotas','Quincena','Maderna Mix']::text[],'Estimado por equivalencia','estimate','Estimación por peso: referencia Michi Feliz 1,8 kg a $3.479; equivalente teórico de 2 kg = $3.866 redondeado. No es un SKU cotizado de 2 kg.','Consulta 25/09/2026','https://www.cordiez.com.ar/piedras-sanitarias-para-gato-michi-feliz-1-8-kg/p'),
('P083','Snacks perro','A definir','100 g',2400,'B',null,ARRAY['Mascotas','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P084','Snacks gato','A definir','100 g',2800,'B',null,ARRAY['Mascotas','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P085','Bolsitas mascotas','A definir','rollo',1200,'C',null,ARRAY['Mascotas','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P086','Salsa lista','A definir','340 g',1400,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P087','Arroz económico','Don Marcos','500 g',759,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/almacen/d?page=3'),
('P088','Fideos sopa','A definir','500 g',1000,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P089','Pan rallado','A definir','500 g',1300,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P090','Maicena','A definir','500 g',2600,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P091','Levadura seca','A definir','10 g',700,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P092','Aceitunas','A definir','200 g',2200,'B',null,ARRAY['Despensa','Cocina','Alacena','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P093','Pickles','A definir','300 g',2400,'B',null,ARRAY['Despensa','Cocina','Alacena','Quincena','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P094','Puré instantáneo','Maggi','125 g',2199,'B',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Referencia minorista publicada','published','Precio minorista publicado utilizado como referencia de compra; sujeto a vigencia, sucursal y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/almacen/?page=6'),
('P095','Sopa instantánea','A definir','sobre',900,'C',null,ARRAY['Despensa','Rendidor','Cocina','Alacena','Familiar','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P096','Café saquitos','A definir','20 u',4200,'B',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P097','Tostadas','A definir','200 g',1800,'B',null,ARRAY['Desayuno','Kids','Alacena','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P098','Servilletas','A definir','100 u',1000,'C',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P099','Film cocina','A definir','30 m',2200,'B',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('P100','Papel aluminio','A definir','10 m',2400,'B',null,ARRAY['Limpieza','Quincena','Express','Maderna Mix']::text[],'Estimado de planificación','estimate','Supuesto de trabajo sin cotización verificable para esta marca/presentación. Reemplazar por costo de compra; no es un precio relevado.','2026-09-25',null),
('N001','Pan dulce sin frutas','Veneziana','400 g',2169,'A','pan dulce',ARRAY['Navideña']::text[],'Referencia minorista publicada','published','Precio minorista publicado de referencia; sujeto a vigencia y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/navidad'),
('N002','Pan dulce con chips','Firenze','350 g',3709,'A','pan dulce',ARRAY['Navideña']::text[],'Referencia minorista publicada','published','Precio minorista publicado de referencia; sujeto a vigencia y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/navidad'),
('N003','Sidra con alcohol','La Farruca','710 ml',2503.66,'A','sidra',ARRAY['Navideña']::text[],'Referencia minorista publicada','published','Precio minorista publicado de referencia; sujeto a vigencia y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/bebidas/espumantes-y-sidras/sidras'),
('N004','Budín con frutas','Pamela','160 g',1419,'B','budin',ARRAY['Navideña']::text[],'Referencia minorista publicada','published','Precio minorista publicado de referencia; sujeto a vigencia y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/navidad'),
('N005','Budín dulce de leche','Pamela','160 g',1419,'B','budin',ARRAY['Navideña']::text[],'Referencia minorista publicada','published','Precio minorista publicado de referencia; sujeto a vigencia y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/navidad'),
('N006','Postre de maní','Mantecol','111 g',3299,'B','postre de mani',ARRAY['Navideña']::text[],'Referencia minorista publicada','published','Precio minorista publicado de referencia; sujeto a vigencia y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/navidad'),
('N007','Postre de maní','Nucrem Georgalos','84 g',1899,'B','postre de mani',ARRAY['Navideña']::text[],'Referencia minorista publicada','published','Precio minorista publicado de referencia; sujeto a vigencia y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/navidad'),
('N008','Maní bañado en chocolate','Maní King','80 g',1959,'B','mani con chocolate',ARRAY['Navideña']::text[],'Referencia minorista publicada','published','Precio minorista publicado de referencia; sujeto a vigencia y stock. No es cotización mayorista.','Consulta 25/09/2026','https://www.cordiez.com.ar/navidad'),
('N009','Turrón de maní','Georgalos','80 g',799.9,'C','turron',ARRAY['Navideña']::text[],'Referencia histórica 2025','historical','Precio final de oferta navideña 2025, sin descontar vouchers ni medios de pago. Oferta vencida; validar antes de comprar.','Oferta 29/12/2025 · consultada 25/09/2026','https://maxiconsumo.com/media/pdf_files/r/e/revista_n_979_29-12-2025_final_6.pdf'),
('N010','Garrapiñada de maní','Georgalos','80 g',799.9,'C','garrapinada',ARRAY['Navideña']::text[],'Referencia histórica 2025','historical','Precio final de oferta navideña 2025, sin descontar vouchers ni medios de pago. Oferta vencida; validar antes de comprar.','Oferta 29/12/2025 · consultada 25/09/2026','https://maxiconsumo.com/media/pdf_files/r/e/revista_n_979_29-12-2025_final_6.pdf'),
('N011','Confites de maní','Georgalos','80 g',999.9,'C','confites',ARRAY['Navideña']::text[],'Referencia histórica 2025','historical','Precio final de oferta navideña 2025, sin descontar vouchers ni medios de pago. Oferta vencida; validar antes de comprar.','Oferta 29/12/2025 · consultada 25/09/2026','https://maxiconsumo.com/media/pdf_files/r/e/revista_n_979_29-12-2025_final_6.pdf'),
('N012','Crocante','Bariloche','100 g',999.9,'C','crocante',ARRAY['Navideña']::text[],'Referencia histórica 2025','historical','Precio final de oferta navideña 2025, sin descontar vouchers ni medios de pago. Oferta vencida; validar antes de comprar.','Oferta 29/12/2025 · consultada 25/09/2026','https://maxiconsumo.com/media/pdf_files/r/e/revista_n_979_29-12-2025_final_6.pdf')
ON CONFLICT (id) DO NOTHING;

-- ── v2: boxes en Venta + fix venta_items ──
ALTER TABLE boxes_armados ADD COLUMN IF NOT EXISTS en_venta boolean NOT NULL DEFAULT true;
ALTER TABLE venta_items ADD COLUMN IF NOT EXISTS descuento_monto numeric DEFAULT 0;
ALTER TABLE venta_items ADD COLUMN IF NOT EXISTS precio_final numeric;
