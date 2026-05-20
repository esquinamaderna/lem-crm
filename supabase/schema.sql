-- ============================================================
-- LA ESQUINA DE MADERNA — Supabase Schema
-- Ejecutar en orden en el SQL Editor de Supabase
-- ============================================================

-- 1. PRODUCTOS
create table if not exists productos (
  id            bigint primary key generated always as identity,
  nombre        text not null,
  categoria     text not null,
  precio_venta  numeric not null,
  costo         numeric not null,
  fc_pct        numeric generated always as (costo / precio_venta) stored,
  margen        numeric generated always as (precio_venta - costo) stored,
  stock_kg      numeric not null default 0,
  vida_util_dias int not null default 90,
  instrucciones text,
  receta        jsonb,
  activo        boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2. VENTAS
create table if not exists ventas (
  id            bigint primary key generated always as identity,
  numero_ticket text not null unique,
  fecha         date not null default current_date,
  hora          time not null default current_time,
  cliente       text default 'Mostrador',
  medio_pago    text not null default 'Efectivo',
  total         numeric not null,
  estado        text not null default 'cobrada'
                check (estado in ('pendiente','cobrada','anulada')),
  notas         text,
  created_at    timestamptz default now()
);

-- 3. ITEMS DE VENTA
create table if not exists venta_items (
  id            bigint primary key generated always as identity,
  venta_id      bigint references ventas(id) on delete cascade,
  producto_id   bigint references productos(id),
  producto_nombre text not null,
  cantidad_kg   numeric not null,
  precio_unit   numeric not null,
  subtotal      numeric generated always as (cantidad_kg * precio_unit) stored
);

-- 4. PEDIDOS (ciclo completo)
create table if not exists pedidos (
  id            bigint primary key generated always as identity,
  numero        text not null unique,
  fecha         date not null default current_date,
  hora          time not null default current_time,
  cliente       text not null,
  telefono      text,
  canal         text default 'Mostrador'
                check (canal in ('Mostrador','WhatsApp','Instagram','Tienda Nube','Teléfono')),
  estado        text not null default 'recibido'
                check (estado in ('recibido','preparando','listo','entregado','cobrado','cancelado')),
  medio_pago    text,
  total         numeric,
  cobrado       boolean default false,
  notas         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 5. ITEMS DE PEDIDO
create table if not exists pedido_items (
  id            bigint primary key generated always as identity,
  pedido_id     bigint references pedidos(id) on delete cascade,
  producto_id   bigint references productos(id),
  producto_nombre text not null,
  cantidad_kg   numeric not null,
  precio_unit   numeric not null,
  subtotal      numeric generated always as (cantidad_kg * precio_unit) stored
);

-- 6. COMANDAS
create table if not exists comandas (
  id            bigint primary key generated always as identity,
  numero        text not null unique,
  pedido_id     bigint references pedidos(id),
  venta_id      bigint references ventas(id),
  tipo          text default 'venta' check (tipo in ('venta','produccion')),
  contenido     jsonb not null,
  impresa       boolean default false,
  created_at    timestamptz default now()
);

-- 7. ORDENES DE PRODUCCION
create table if not exists ordenes_produccion (
  id            bigint primary key generated always as identity,
  numero_lote   text not null unique,
  producto_id   bigint references productos(id),
  producto_nombre text not null,
  cantidad_kg   numeric not null,
  fecha_produccion date not null default current_date,
  fecha_vencimiento date not null,
  estado        text not null default 'pendiente'
                check (estado in ('pendiente','en_progreso','completado','cancelado')),
  responsable   text,
  notas         text,
  etiquetas_generadas int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 8. CAJA
create table if not exists caja (
  id            bigint primary key generated always as identity,
  fecha         date not null default current_date,
  hora          time not null default current_time,
  tipo          text not null check (tipo in ('ingreso','egreso')),
  concepto      text not null,
  monto         numeric not null,
  venta_id      bigint references ventas(id),
  pedido_id     bigint references pedidos(id),
  created_at    timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (opcional — desactivar para uso interno)
-- ============================================================
alter table productos enable row level security;
alter table ventas enable row level security;
alter table venta_items enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;
alter table comandas enable row level security;
alter table ordenes_produccion enable row level security;
alter table caja enable row level security;

-- Políticas abiertas para anon key (uso interno sin auth)
create policy "allow all productos"        on productos        for all using (true) with check (true);
create policy "allow all ventas"           on ventas           for all using (true) with check (true);
create policy "allow all venta_items"      on venta_items      for all using (true) with check (true);
create policy "allow all pedidos"          on pedidos          for all using (true) with check (true);
create policy "allow all pedido_items"     on pedido_items     for all using (true) with check (true);
create policy "allow all comandas"         on comandas         for all using (true) with check (true);
create policy "allow all ordenes"          on ordenes_produccion for all using (true) with check (true);
create policy "allow all caja"             on caja             for all using (true) with check (true);

-- ============================================================
-- DATOS INICIALES — 21 productos del catálogo LEM
-- ============================================================
insert into productos (nombre, categoria, precio_venta, costo, stock_kg, vida_util_dias, instrucciones, receta) values
('Milanesa de Pollo s/provenzal','VACUNO',11802,5311,8.5,90,'Horno 200°C × 15 min o sartén vuelta y vuelta.','["Filetear pechuga 8-10mm","Baño: huevo+mostaza+sal+pimienta","Empanado: pan rallado + crunch","Presionar, envasar al vacío","Congelar plano a -18°C"]'),
('Milanesa de Pollo c/provenzal','VACUNO',13691,6161,6.0,90,'Horno 200°C × 15 min. Provenzal integrado al pan.','["Integrar provenzal al pan rallado","Baño: huevo+mostaza","Empanado doble con provenzal","Envasar al vacío, etiquetar","Congelar plano a -18°C"]'),
('Milanesa de Nalga UG','VACUNO',30000,19795,4.0,90,'Horno 200°C × 20 min. Producto premium Unión Ganadera.','["Seleccionar nalga UG color rojo intenso","Filetear siguiendo fibra muscular","Baño húmedo 5 min: huevo+leche+mostaza+ajo","Empanado doble (x2 baño y x2 pan)","Reposo 10 min en frío antes de envasar"]'),
('Milanesa de Peceto','VACUNO',25691,11561,3.5,90,'Horno 190°C × 15 min. Textura fina y compacta.','["Verificar espesor 6-8mm","Baño: huevo+leche+mostaza+ajo+sal","Pan rallado solo (sin crunch)","Envasar al vacío","Congelar plano -18°C"]'),
('Milanesa de Carré de Cerdo','CERDO',16500,9900,5.0,90,'Horno 190°C × 18 min. Crocante es el objetivo.','["Filetear perpendicular a la fibra 8-10mm","Tiernizar suavemente con mazo 2-3 veces","Baño: huevo+leche+mostaza+ajo","Pan rallado + crunch mezclados","Envasar al vacío, congelar plano"]'),
('Ribs Kansas BBQ','CERDO',14851,6683,7.0,90,'Horno 180°C × 45 min tapado + 15 min destapado. Airfryer 160°C × 30 min.','["Preparar rub seco (receta propietaria)","Cubrir ribs completamente, masajear","Reposo mínimo 2hs en frío (ideal overnight)","Porcionar 3-4 costillas ~400-500g","Envasar al vacío + bolsita rub extra"]'),
('Pechuguitas de Pollo','POLLO',14144,6365,5.5,90,'Horno 190°C × 20 min o airfryer 180°C × 15 min.','["Seleccionar pechuga sin hematomas","Retirar filete interno","Limpiar grasa y nervios","Porcionar 200-300g por pieza","Envasar individual, congelar plano"]'),
('Medallones de Pollo × 12','POLLO',16989,7645,4.0,90,'Sartén con aceite 4 min cada lado. Airfryer 180°C × 10 min.','["Picar pechuga hasta textura gruesa","Mezclar con huevo, mostaza, leche, fécula","Porcionar ~40g c/u con aro de cocina","Empanado: húmedo + pan rallado+crunch","Verificar 12 u, envasar en una capa"]'),
('Medallones de Pollo × 6','POLLO',9500,4275,3.0,90,'Sartén 4 min cada lado. Airfryer 180°C × 10 min.','["Mitad exacta de la receta × 12","Misma técnica, 6 medallones ~40g","Peso pack objetivo 240-250g neto","Envasar juntos","Congelar plano -18°C"]'),
('Nuggets Crocantes','POLLO',20624,9281,6.0,90,'Airfryer 180°C × 12 min / Horno 200°C × 15 min. NO microondas.','["Verificar temperatura llegada ≤-15°C","Evaluar nuggets: sin apelmazamiento","Fraccionar 500g o 1kg, máx 10 min fuera del frío","Envasar al vacío","Recongelar inmediatamente"]'),
('Caritas de Papa','PAPAS',16724,7526,9.0,365,'Horno 220°C × 15 min / Airfryer 200°C × 10 min.','["Verificar llegada ≤-15°C","Revisar piezas no rotas","Fraccionar 500g o 1kg","Envasar al vacío","Recongelar inmediato"]'),
('Bastones de Papa','PAPAS',9811,4415,12.0,365,'Horno 220°C × 15 min / Freidora 180°C × 5 min.','["Verificar temperatura llegada","Fraccionar en ≤15 min","Envasar al vacío","Recongelar inmediatamente","Respetar fecha original del proveedor"]'),
('Papas Noisette','PAPAS',16402,7381,8.0,365,'Horno 220°C × 12 min. No mezclar lotes.','["Verificar temperatura llegada","Fraccionar 500g o 1kg","No mezclar lotes de diferentes fechas","Envasar al vacío","Recongelar -18°C"]'),
('Aceitunas Verdes Jumbalay','JUMBALAY',20000,12600,15.0,180,'Conservar refrigerado una vez abierto.','["Producto de reventa","Verificar fecha de vencimiento","Almacenar en frío"]'),
('Pickles Mix Jumbalay','JUMBALAY',18000,11400,12.0,180,'Conservar refrigerado.','["Producto de reventa","Verificar fecha de vencimiento"]'),
('Mermelada Artesanal Jumbalay','JUMBALAY',12000,7250,20.0,180,'Sin refrigeración hasta abrir.','["Producto de reventa"]'),
('Mostaza Artesanal Jumbalay','JUMBALAY',11500,6750,18.0,180,'Sin refrigeración hasta abrir.','["Producto de reventa"]'),
('Pasta Untable / Paté Jumbalay','JUMBALAY',15000,9167,10.0,180,'Conservar refrigerado.','["Producto de reventa"]'),
('Chutney Agridulce Jumbalay','JUMBALAY',14000,8000,14.0,180,'Sin refrigeración hasta abrir.','["Producto de reventa"]'),
('Picada Mundialera 2/3 pax','PACKS',38000,12800,2.0,3,'Solo por pedido anticipado 48hs. Ribs al horno, embutidos a la parrilla.','["Producir ribs 48hs antes","Preparar quesos al vacío","Armar zona fría y zona ambiente","Incluir tarjeta con instrucciones","Etiquetar pack completo"]'),
('Picada Mundialera 4/6 pax','PACKS',65000,31800,1.0,3,'Solo por pedido anticipado 48hs. Pack premium con frasquito de aceite LEM.','["Producir ribs + panceta 48hs antes","Laminar salamín fino 150g","Preparar frasquito aceite oliva con etiqueta LEM","Armar caja grande (zona fría / zona ambiente)","Incluir tarjeta A5 premium con maridaje"]');

-- ── Agregar campo visible en catálogo público ──
ALTER TABLE productos ADD COLUMN IF NOT EXISTS visible_catalogo boolean NOT NULL DEFAULT false;
