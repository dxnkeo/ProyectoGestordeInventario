# 🗺️ Flujo del Proyecto — Guía de Trabajo Completa

> Sistema de Gestión de Inventario Distribuido  
> Backend: Node.js · Express · TypeScript · Prisma · PostgreSQL  
> Frontend: React · TypeScript · Vite · TanStack Query

---

## 1. Arquitectura General

```
┌──────────────────────────────────────────────────────────────┐
│                        DESARROLLADOR                         │
│                                                              │
│  git commit  →  Husky pre-commit hook  →  lint-staged       │
│                       ↓ (si pasa)                            │
│  git push    →  GitHub Actions CI/CD                         │
└──────────────────────────────────────────────────────────────┘
                           ↓ (en producción)
┌──────────────────────────────────────────────────────────────┐
│                     DOCKER COMPOSE                           │
│                                                              │
│  postgres (5432)  ←  backend (3000)  ←  frontend (80)       │
└──────────────────────────────────────────────────────────────┘
```

### Stack por capa

```
Browser / Usuario
      │
Frontend :80 (Nginx prod) / :5173 (Vite dev)
  React 19 + TypeScript
  React Router DOM (SPA)
  TanStack Query (caché + fetch declarativo)
  ErrorBoundary + ToastContext
      │
      │  HTTP / fetch
      │
Backend :3000
  Express + TypeScript
  Helmet (security headers)
  express-rate-limit (200 req / 15 min)
  Winston (logger)
  Zod (validación de env al arranque)
  express-validator (validación de body/params)
      │
Prisma ORM
      │
PostgreSQL 16 :5432
```

---

## 2. Flujo de un Commit (Pre-commit Hook)

Cada `git commit` dispara automáticamente la siguiente cadena:

```
git commit -m "..."
       │
       ▼
 Husky (.husky/pre-commit)
   npx lint-staged --config .lintstagedrc.json
       │
       ├── backend/src/**/*.ts   →  npm run lint --prefix backend
       │                              (ESLint @typescript-eslint)
       │
       └── frontend/src/**/*.{ts,tsx}  →  pnpm --dir frontend lint
                                           (ESLint + react-refresh + react-hooks)
       │
       ▼  Si alguno falla → commit BLOQUEADO
       ▼  Si todos pasan  → commit creado
```

### Cómo hacer un commit correctamente

```bash
# 1. Asegúrate de estar en la rama correcta
git checkout develop          # o la rama feature que corresponda

# 2. Agrega los archivos que deseas commitear
git add backend/src/services/mi-servicio.ts
git add frontend/src/pages/MiPagina.tsx
# (o git add . para todo)

# 3. Haz el commit — lint-staged corre automáticamente
git commit -m "feat(scrum-XX): descripción del cambio"

# Si el hook falla verás:
#   ✖ backend/src/**/*.ts — FAILED
#   ✖ npm run lint --prefix backend exited with code 1
# → Corrige los errores ESLint y vuelve a intentarlo

# 4. Sube la rama
git push origin develop
```

### Convención de mensajes de commit

```
tipo(alcance): descripción breve en español o inglés

Tipos:
  feat      → nueva funcionalidad
  fix       → corrección de bug
  refactor  → mejora de código sin cambiar comportamiento
  test      → tests nuevos o actualizados
  docs      → solo documentación
  chore     → tareas de mantenimiento (deps, config)
  ci        → cambios en pipeline CI/CD

Ejemplos:
  feat(scrum-69): agregar campo priority a Location y endpoint suggest-source
  fix(docker): hacer prepare script tolerante cuando husky no está instalado
  test(picking): cubrir getBatchPickList con edge cases de órdenes inválidas
  docs: actualizar README y PENDIENTES con HdU del sprint
```

---

## 3. Pipeline CI/CD (GitHub Actions)

El archivo `.github/workflows/ci.yml` se ejecuta en cada **push** o **PR** a `main` o `develop`.

```
┌─────────────────────────────────────────────────────────────┐
│  TRIGGER: push / PR → main o develop                        │
└────────────────┬────────────────────────────────────────────┘
                 │
       ┌─────────┴──────────┐
       ▼                    ▼
  Job: backend         Job: frontend
  (ubuntu-latest)      (ubuntu-latest)
       │                    │
  npm ci               pnpm install --frozen-lockfile
  npm run lint         pnpm lint
  npm run test:coverage   pnpm test:coverage
  upload artifact      upload artifact
  (backend/coverage/)  (frontend/coverage/)
       │                    │
       └─────────┬──────────┘
                 ▼
          Job: docker
     (depende de backend + frontend)
          │
     docker build ./backend  (target: production)
     docker build ./frontend (target: production)
```

### Qué verifica cada job

| Job | Comando | Qué valida |
|-----|---------|-----------|
| `backend` | `npm run lint` | ESLint sin errores (no-any, no-console, etc.) |
| `backend` | `npm run test:coverage` | 97 tests · 100% cobertura en todos los servicios |
| `frontend` | `pnpm lint` | ESLint (react-refresh, react-hooks, verbatimModuleSyntax) |
| `frontend` | `pnpm test:coverage` | 38 tests · cobertura de servicios |
| `docker` | `docker build` | Compilación TypeScript + imagen Docker sin errores |

> El job `docker` **solo corre si backend y frontend pasan**. Si un PR rompe los tests, el docker build no corre.

---

## 4. Desarrollo Local — Paso a Paso

### Opción A: Docker (recomendado para pruebas del sistema completo)

```bash
# Arrancar todo el stack
docker compose up --build

# URLs:
#   Frontend:  http://localhost
#   Backend:   http://localhost:3000/api/v1
#   Swagger:   http://localhost:3000/api-docs
#   DB:        localhost:5432  (user: postgres, pass: postgres, db: GestorInventario)

# Ver logs en tiempo real
docker compose logs -f backend
docker compose logs -f frontend

# Detener
docker compose down
```

### Opción B: Desarrollo local (hot-reload)

```bash
# Terminal 1 — Base de datos (si no tienes PostgreSQL local)
docker compose up postgres

# Terminal 2 — Backend
cd backend
npm install
cp .env.example .env      # configura DATABASE_URL
npm run db:migrate        # aplica todas las migraciones
npm run db:seed           # carga datos iniciales de prueba
npm run dev               # http://localhost:3000 (hot-reload con ts-node-dev)

# Terminal 3 — Frontend
cd frontend
pnpm install
pnpm dev                  # http://localhost:5173 (hot-reload Vite)
```

### Variables de entorno del backend (`.env`)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/GestorInventario"
PORT=3000
NODE_ENV=development
APP_TIMEZONE=America/Santiago

# Opcional — necesario para SCRUM-31 (Pedido Pagado)
EXTERNAL_API_KEY=mi-clave-secreta-aqui
```

---

## 5. Mapa Completo de Rutas

### Frontend (páginas)

| Ruta | Página | HdU | Descripción |
|------|--------|-----|-------------|
| `/` · `/Stock` | `StockPage` | — | Resumen de stock disponible por producto |
| `/HistorialMovimientos` | `MovementsHistoryPage` | — | Historial IN/OUT/TRANSFER con filtros |
| `/RegistrarMovimientos` | `CreateMovementPage` | — | Registrar entrada o salida manual |
| `/Transferir` | `TransferPage` | SCRUM-23 | Transferir stock entre ubicaciones |
| `/Alertas` | `AlertsPage` | SCRUM-26/27 | Alertas críticas + órdenes de reposición |
| `/RegistrarUbicaciones` | `CreateLocationPage` | SCRUM-69 | CRUD de ubicaciones (con campo priority) |
| `/StockUbicaciones` | `StockUbicationPage` | SCRUM-69 | Stock por bodega/tienda + badge P1–P10 |
| `/Reservas` | `ReservationsPage` | SCRUM-20/33 | Gestión de reservas activas |
| `/Despacho` | `DispatchPage` | — | Integración con rutas logísticas |
| `/Sincronizacion` | `SyncPage` | SCRUM-68 | Balance y sincronización entre almacenes |
| `/Picking` | `PickingPage` | SCRUM-70 | Lista de picking por lotes |

### Backend (endpoints principales)

```
GET    /api/v1/stock                                → todo el stock
GET    /api/v1/stock/:locationId                    → stock de una ubicación
GET    /api/v1/stock/suggest-source/:productId      → sugerencia de fuente por prioridad (SCRUM-69)
         ?quantity=N

GET    /api/v1/locations                            → todas las ubicaciones (orden priority ASC)
POST   /api/v1/locations                            → crear ubicación (acepta priority)
GET    /api/v1/locations/:id
PATCH  /api/v1/locations/:id                        → actualizar (acepta priority)
DELETE /api/v1/locations/:id

GET    /api/v1/products
POST   /api/v1/products

GET    /api/v1/movements                            → historial
POST   /api/v1/movements                            → IN / OUT
POST   /api/v1/movements/transfer                   → transferencia atómica (SCRUM-23)

GET    /api/v1/alerts                               → alertas de stock crítico
PATCH  /api/v1/alerts/:id/resolve                   → resolver alerta

GET    /api/v1/replenishment/replenishment           → órdenes de reposición
POST   /api/v1/replenishment/replenishment           → crear orden
PATCH  /api/v1/replenishment/replenishment/:id/status → actualizar estado
GET    /api/v1/replenishment/suppliers
POST   /api/v1/replenishment/suppliers

GET    /api/v1/reservations
POST   /api/v1/reservations                         → crear reserva
POST   /api/v1/reservations/release-reservation     → liberar (SCRUM-20)
PATCH  /api/v1/external/reservations/:id/confirm-delivery → confirmar entrega (SCRUM-33)

GET    /api/v1/sync/balance                         → análisis de desequilibrio (SCRUM-68)
POST   /api/v1/sync/transfer                        → transferencia de balanceo (SCRUM-68)

GET    /api/v1/picking?orderIds=id1,id2,...         → lista de picking (SCRUM-70)

POST   /api/v1/external/payment-confirmed           → pedido pagado [X-Api-Key] (SCRUM-31)

GET    /api/v1/orders
PATCH  /api/v1/orders/:id/status

GET    /api-docs                                    → Swagger UI interactivo
```

---

## 6. Flujos de Prueba Clave

### Flujo 1: Crear y gestionar stock básico

```bash
# 1. Crear un producto
POST /api/v1/products
{ "name": "Notebook 15\"", "sku": "NB-001" }

# 2. Crear una ubicación con prioridad
POST /api/v1/locations
{ "name": "Bodega Central", "type": "bodega", "priority": 1, "capacity": 500 }

# 3. Registrar entrada de stock
POST /api/v1/movements
{ "productId": "...", "locationId": "...", "type": "IN", "quantity": 100 }

# 4. Ver stock disponible
GET /api/v1/stock
```

### Flujo 2: Transferencia entre ubicaciones (SCRUM-23)

```bash
# Prerrequisito: 2 ubicaciones con stock en origen

# Consultar sugerencia de fuente (SCRUM-69)
GET /api/v1/stock/suggest-source/{productId}?quantity=20

# Ejecutar transferencia
POST /api/v1/movements/transfer
{
  "productId": "...",
  "sourceLocationId": "...",
  "destinationLocationId": "...",
  "quantity": 20,
  "note": "Rebalanceo manual"
}

# → Se generan 2 movimientos TRANSFER (OUT origen, IN destino)
# → Si el stock origen baja de minStock → se crea StockAlert
```

### Flujo 3: Alerta de stock crítico + Reposición (SCRUM-26/27)

```bash
# 1. Registrar salidas hasta bajar minStock (product.minStock default: 10)
POST /api/v1/movements
{ ..., "type": "OUT", "quantity": 95 }
# → Respuesta incluye "alert": "⚠️ STOCK CRÍTICO..."

# 2. Ver alertas generadas
GET /api/v1/alerts

# 3. Crear orden de reposición
POST /api/v1/replenishment/replenishment
{ "alertId": "...", "supplierId": "...", "quantity": 50, "estimatedArrival": "2026-07-01" }

# 4. Marcar como RECEIVED (cuando llega la mercancía)
PATCH /api/v1/replenishment/replenishment/{id}/status
{ "status": "RECEIVED" }
# → Incrementa stock automáticamente + resuelve la alerta
```

### Flujo 4: Sincronización entre almacenes (SCRUM-68)

```bash
# 1. Analizar balance actual
GET /api/v1/sync/balance
# Respuesta: productos con ubicaciones en EXCESS / DEFICIT / OK
# Incluye "suggestedTransfers" con las transferencias recomendadas

# 2. Ejecutar una transferencia sugerida
POST /api/v1/sync/transfer
{
  "productId": "...",
  "sourceLocationId": "...",     ← ubicación con EXCESS
  "destinationLocationId": "...", ← ubicación con DEFICIT
  "quantity": 15
}

# En el Frontend: ir a /Sincronizacion → expandir el producto → "Ejecutar"
```

### Flujo 5: Picking por lotes (SCRUM-70)

```bash
# Prerrequisito: tener órdenes en estado READY_FOR_DISPATCH

# 1. Obtener lista de picking
GET /api/v1/picking?orderIds=uuid1,uuid2,uuid3

# Respuesta agrupada por ubicación (priority ASC):
# [
#   { location: { name: "Bodega Central", priority: 1 },
#     items: [{ productName: "Notebook", totalQuantity: 30, orders: [...] }] }
# ]

# En el Frontend: ir a /Picking → seleccionar órdenes → "Generar lista"
```

### Flujo 6: Pedido Pagado desde sistema externo (SCRUM-31)

```bash
# Requiere EXTERNAL_API_KEY configurada en el .env del backend

POST /api/v1/external/payment-confirmed
Headers:
  X-Api-Key: mi-clave-secreta-aqui
  Content-Type: application/json

Body:
{
  "reservationId": 42,
  "orderId": "uuid-de-la-orden"   ← opcional
}

# → Confirma la reserva (ACTIVE → SOLD)
# → Registra movimiento OUT
# → Si orderId presente: transiciona orden a READY_FOR_DISPATCH

# Error 401 si X-Api-Key es incorrecta
# Error 503 si EXTERNAL_API_KEY no está configurada
```

---

## 7. Testing

### Ejecutar tests

```bash
# Backend — 97 tests, 100% cobertura
cd backend
npm run test               # rápido (sin cobertura)
npm run test:coverage      # con reporte de cobertura (genera backend/coverage/)

# Ejecutar un solo test file
npx jest --testPathPatterns="sync.service" --no-coverage

# Frontend — 38 tests
cd frontend
pnpm test                  # modo watch (interactivo)
pnpm test:coverage         # con reporte (genera frontend/coverage/)

# Ejecutar un solo test
npx vitest run src/__tests__/syncService.test.ts
```

### Estructura de tests

```
backend/src/__tests__/
├── __mocks__/
│   └── prismaClient.ts          ← mock de Prisma (mockDeep)
└── services/
    ├── alert.service.test.ts
    ├── location.service.test.ts  ← SCRUM-69
    ├── movement.service.test.ts
    ├── payment.service.test.ts   ← SCRUM-31
    ├── picking.service.test.ts   ← SCRUM-70
    ├── replenishment.service.test.ts
    └── sync.service.test.ts      ← SCRUM-68

frontend/src/__tests__/
├── alertService.test.ts
├── movementService.test.ts
├── pickingService.test.ts        ← SCRUM-70
├── replenishmentService.test.ts
└── syncService.test.ts           ← SCRUM-68
```

---

## 8. Comandos Útiles de Base de Datos

```bash
# Aplicar migraciones pendientes
cd backend
npm run db:migrate

# Regenerar cliente Prisma (después de editar schema.prisma)
npm run db:generate

# Recargar datos de prueba
npm run db:seed

# Reset completo (elimina y recrea todo)
npm run db:reset

# Abrir Prisma Studio (explorador visual de BD)
npm run db:studio
# → http://localhost:5555

# Ver migraciones aplicadas
npx prisma migrate status
```

---

## 9. Diagrama de Flujo de Datos — Transferencia Atómica

```
POST /api/v1/movements/transfer
        │
        ▼
  validateRequest (express-validator)
        │
        ▼
  movement.controller.ts
        │
        ▼
  movement.service.ts :: createTransfer()
        │
        ├─ Buscar producto por productId
        ├─ Buscar origen y destino (AppError 404 si no existen)
        ├─ calcular stockDisponible = quantity - reservasActivas
        ├─ Verificar quantity ≤ stockDisponible (AppError 422 si no)
        ├─ Verificar capacidad destino (AppError 422 si no)
        │
        └─ prisma.$transaction([
              stock.update(origen: -quantity)
              stock.upsert(destino: +quantity)
              movement.create(OUT, origen)
              movement.create(IN, destino)  ← type TRANSFER
              // si stock origen ≤ minStock → stockAlert.create
           ])
        │
        ▼
  Respuesta: { movement, updatedStock, alert? }
```

---

## 10. Troubleshooting Frecuente

| Problema | Causa | Solución |
|----------|-------|----------|
| `git commit` bloqueado | ESLint encuentra errores | Ejecutar `npm run lint:fix` (backend) o `pnpm lint:fix` (frontend) y corregir lo que no se auto-fix |
| `husky: not found` en Docker | `husky` es devDependency | Ya corregido: `"prepare": "husky \|\| true"` en package.json |
| `Property 'errors' does not exist` | Zod v4 usa `.issues` en lugar de `.errors` | Ya corregido en `env.ts` |
| `Cannot find name 'global'` | Tests en `tsconfig.app.json` | Ya corregido: `"exclude": ["src/__tests__"]` |
| Backend no conecta a DB | `DATABASE_URL` incorrecta | Verificar `.env` → `postgresql://user:pass@host:5432/dbname` |
| `401 Unauthorized` en `/external/payment-confirmed` | Header `X-Api-Key` faltante o incorrecto | Agregar `X-Api-Key: <valor de EXTERNAL_API_KEY en .env>` |
| `503 Service Unavailable` en `/external/payment-confirmed` | `EXTERNAL_API_KEY` no configurada | Agregar `EXTERNAL_API_KEY=...` en `.env` |
| Tests de cobertura fallan | Nuevo servicio sin tests | Agregar al `collectCoverageFrom` en `jest.config.js` y crear el `.test.ts` |

---

## 11. Estructura de Archivos Relevantes

```
ProyectoAgilEscalado/
├── .github/workflows/ci.yml        ← Pipeline CI/CD
├── .husky/pre-commit               ← Hook: lint-staged antes de cada commit
├── .lintstagedrc.json              ← Qué lint corre por extensión de archivo
├── docker-compose.yml              ← Stack completo (postgres + backend + frontend)
├── README.md                       ← Inicio rápido y stack tecnológico
├── PENDIENTES.md                   ← Gap analysis, decisiones de diseño
├── FLUJO_PROYECTO.md               ← Este archivo
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           ← Modelos de datos (Location.priority aquí)
│   │   └── migrations/             ← Historial de migraciones SQL
│   ├── src/
│   │   ├── app.ts                  ← Express app + registro de rutas
│   │   ├── server.ts               ← Arranque + validateEnv()
│   │   ├── config/
│   │   │   ├── env.ts              ← Zod schema para variables de entorno
│   │   │   └── config.ts           ← Constantes (criticalStockThreshold, etc.)
│   │   ├── controllers/            ← HTTP handlers (sin lógica de negocio)
│   │   ├── services/               ← Lógica de negocio + acceso a Prisma
│   │   ├── routes/                 ← Definición de rutas Express
│   │   ├── middlewares/
│   │   │   ├── validateRequest.ts  ← Procesa errores de express-validator
│   │   │   └── validateApiKey.ts   ← Autenticación por header X-Api-Key (SCRUM-31)
│   │   └── utils/
│   │       ├── types.ts            ← DTOs compartidos
│   │       ├── errors.ts           ← Jerarquía de errores
│   │       ├── AppError.ts         ← Clase base de error operacional
│   │       └── response.ts         ← Helper sendSuccess()
│   ├── jest.config.js              ← Configuración Jest + cobertura
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.tsx                 ← NavBar + BrowserRouter + ToastProvider
    │   ├── routes/index.tsx        ← Declaración de todas las rutas SPA
    │   ├── pages/                  ← Componentes de página (uno por ruta)
    │   ├── services/               ← Wrappers de fetch para cada recurso de API
    │   ├── components/             ← Componentes reutilizables (LocationForm, etc.)
    │   ├── context/ToastContext.tsx ← Notificaciones globales
    │   ├── hooks/useToast.ts       ← Hook para acceder al toast
    │   └── types/                  ← Interfaces TypeScript del dominio
    └── vite.config.ts              ← Vite + Vitest config
```
