# La Esquina de Maderna — CRM

Sistema de gestión interno: Punto de Venta · Pedidos · Productos · Fichas Técnicas · Producción · Etiquetas · Ventas · Caja.

**Stack:** Next.js 14 · Supabase · TypeScript · Tailwind CSS

---

## 1. Crear el proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → **New project**
2. Nombre: `lem-crm` · Región: South America (São Paulo)
3. Esperar ~2 minutos hasta que el proyecto esté listo
4. Ir a **SQL Editor** → pegar el contenido de `supabase/schema.sql` → **Run**
5. Ir a **Settings → API** y copiar:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Setup local

```bash
# Clonar el repo
git clone https://github.com/laesquinademaderna/lem-crm.git
cd lem-crm

# Instalar dependencias
npm install

# Variables de entorno
cp .env.local.example .env.local
# Editar .env.local con la URL y key de Supabase

# Levantar en desarrollo
npm run dev
# → http://localhost:3000
```

---

## 3. Deploy en Vercel

```bash
# Instalar Vercel CLI (si no lo tenés)
npm i -g vercel

# Desde la carpeta del proyecto
vercel

# Seguir el wizard:
# - Link to existing project? No → crear nuevo
# - Project name: lem-crm
# - Framework: Next.js (auto-detectado)
```

En el dashboard de Vercel → **Settings → Environment Variables** → agregar:
```
NEXT_PUBLIC_SUPABASE_URL     = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
```

Luego hacer un nuevo deploy para que tome las variables:
```bash
vercel --prod
```

---

## 4. Estructura del proyecto

```
lem-crm/
├── supabase/
│   └── schema.sql              ← Ejecutar en Supabase SQL Editor
├── src/
│   ├── app/
│   │   ├── (crm)/              ← Grupo de rutas con Topbar
│   │   │   ├── layout.tsx
│   │   │   ├── pos/page.tsx
│   │   │   ├── pedidos/page.tsx
│   │   │   ├── productos/page.tsx
│   │   │   ├── fichas/page.tsx
│   │   │   ├── produccion/page.tsx
│   │   │   ├── etiquetas/page.tsx
│   │   │   ├── ventas/page.tsx
│   │   │   └── caja/page.tsx
│   │   └── api/                ← API Routes (server-side Supabase)
│   │       ├── productos/route.ts
│   │       ├── ventas/route.ts
│   │       ├── pedidos/route.ts
│   │       ├── ordenes/route.ts
│   │       └── caja/route.ts
│   ├── components/
│   │   ├── ui/                 ← Componentes base (Topbar, Card, Btn, Modal…)
│   │   ├── pos/
│   │   ├── pedidos/
│   │   ├── productos/
│   │   ├── fichas/
│   │   ├── produccion/
│   │   ├── etiquetas/
│   │   ├── ventas/
│   │   └── caja/
│   ├── lib/
│   │   ├── supabase.ts         ← Cliente Supabase (client + server)
│   │   ├── utils.ts            ← Helpers (fmt, fechas, badges…)
│   │   └── productos-default.ts ← Catálogo inicial LEM
│   └── types/
│       └── database.ts         ← Tipos TypeScript de todas las tablas
├── .env.local.example
├── .gitignore
└── README.md
```

---

## 5. Módulos

| Ruta | Función |
|------|---------|
| `/pos` | Punto de venta: grilla de productos, carrito, cobro, ticket, comanda |
| `/pedidos` | Ciclo completo de pedidos: recibido → preparando → listo → entregado → cobrado |
| `/productos` | Catálogo con FC%, stock, ajuste de stock por panel |
| `/fichas` | Fichas técnicas + botón para iniciar orden de producción |
| `/produccion` | Órdenes de producción con estados y acceso a etiquetas |
| `/etiquetas` | Generador de etiquetas con "Consumir antes del" automático, batch |
| `/ventas` | Historial de ventas, filtros, exportación CSV |
| `/caja` | Ingresos/egresos, movimientos del día, resumen semanal |

---

## 6. Flujo de trabajo típico

```
Producción:
Fichas → Iniciar producción → Orden creada → Etiquetas generadas automáticamente

Venta mostrador:
POS → Agregar productos → Cobrar → Ticket impreso + guardado en Supabase

Pedido por canal:
Pedidos → Nuevo pedido → Avanzar estados → Cobrar → Comanda + Ticket
```

---

## 7. Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon pública de Supabase |

> Las variables `NEXT_PUBLIC_*` son visibles en el cliente. Para operaciones más sensibles en el futuro, agregar `SUPABASE_SERVICE_ROLE_KEY` solo en server-side (API routes).

---

## 8. Comandos útiles

```bash
npm run dev      # Desarrollo local
npm run build    # Build de producción
npm run lint     # Linter
vercel --prod    # Deploy a Vercel
```
