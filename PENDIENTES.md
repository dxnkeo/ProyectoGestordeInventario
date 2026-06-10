# 📋 Pendientes del Proyecto — Gap Analysis

> Última actualización: 2026-06-09
> Estado general: **producción-ready** — SCRUM-69/68/70/31/71 implementados · arquitectura por capas · tests 100% · CI/CD · Docker.

---

## 🏛️ Arquitectura actual

```
HTTP Request
    │
Express Router  ←  helmet (headers) + rate-limit (200 req/15 min)
    │
Controller      ←  valida entrada · llama service · formatea respuesta · sin any
    │
Service         ←  lógica de negocio · NotFoundError / ConflictError / ValidationError
    │
Prisma ORM      ←  transacciones atómicas · PostgreSQL
    │
PostgreSQL 16
```

**Frontend:**
```
React 19 + Vite
    │
React Query (TanStack) ← caché + deduplicación + loading/error declarativo
    │
Services (fetch)       ← abstractores de la API REST
    │
ErrorBoundary          ← captura errores de render en toda la app
```

---

## 🔄 Flujo de rutas del sistema

```
Frontend (:5173 dev / :80 prod)
    ├── /                      →  StockPage
    ├── /Stock                 →  StockPage
    ├── /HistorialMovimientos  →  MovementsHistoryPage
    ├── /RegistrarMovimientos  →  POST /api/v1/movements
    ├── /Transferir            →  POST /api/v1/movements/transfer        (SCRUM-23)
    ├── /Alertas               →  GET  /api/v1/alerts                    (SCRUM-26/27)
    │                              POST /api/v1/replenishment/replenishment
    │                              PATCH /api/v1/replenishment/replenishment/:id/status
    │                              GET/POST /api/v1/replenishment/suppliers
    ├── /RegistrarUbicaciones  →  POST /api/v1/locations                 (campo priority SCRUM-69)
    ├── /Reservas              →  GET/POST /api/v1/reservations
    ├── /StockUbicaciones      →  GET /api/v1/stock/:locationId          (badge priority SCRUM-69)
    ├── /Despacho              →  rutas logísticas (Proyecto 2)
    ├── /Sincronizacion        →  GET  /api/v1/sync/balance              (SCRUM-68)
    │                              POST /api/v1/sync/transfer
    └── /Picking               →  GET  /api/v1/picking?orderIds=...      (SCRUM-70)

Backend (:3000)
    ├── /api/v1/locations, /products, /stock, /movements, /movements/transfer
    ├── /api/v1/stock/suggest-source/:productId?quantity=N               (SCRUM-69)
    ├── /api/v1/alerts, /replenishment/*
    ├── /api/v1/sync/balance, /sync/transfer                             (SCRUM-68)
    ├── /api/v1/picking?orderIds=id1,id2,...                             (SCRUM-70)
    ├── /api/v1/reservations, /release-reservation, /external/*
    ├── /api/v1/external/payment-confirmed  [X-Api-Key]                  (SCRUM-31)
    ├── /api/v1/orders, /routes, /logistics
    └── /api-docs (Swagger UI)
```

---

## ✅ Mejoras implementadas — Sprint 3 + Refactoring

### Nuevas funcionalidades (Sprint 3)
| HdU | Implementación |
|-----|----------------|
| **SCRUM-23** | Transferencia atómica: `POST /api/v1/movements/transfer` + `TransferPage` |
| **SCRUM-26** | Alertas automáticas de stock crítico (`StockAlert`) en OUT/TRANSFER |
| **SCRUM-27** | Panel de reposición: alertas, órdenes de compra, proveedores |
| **SCRUM-69** | Prioridad de ubicaciones: campo `priority` (1–10) en `Location` + `GET /stock/suggest-source/:productId` + badge en `StockUbicationPage` |
| **SCRUM-68** | Sincronización entre almacenes: `sync.service.ts` detecta EXCESS/DEFICIT, `SyncPage` con ejecución de transferencias sugeridas |
| **SCRUM-70** | Picking por lotes: `picking.service.ts` agrupa ítems multi-orden por ubicación (priority ASC), `PickingPage` interactiva |
| **SCRUM-31** | Evento "Pedido Pagado": `POST /external/payment-confirmed` autenticado con `X-Api-Key`, confirma reserva + transiciona orden a `READY_FOR_DISPATCH` |

### Mejoras de calidad de software
| Área | Implementación |
|------|----------------|
| **Arquitectura** | `alert.service.ts` + `replenishment.service.ts` extraídos de controllers |
| **Error hierarchy** | `NotFoundError`, `ValidationError`, `ConflictError`, `BusinessRuleError` |
| **Tipado estricto** | Eliminados todos los `any` en controllers y services |
| **Logger** | Winston: JSON en producción, coloreado en desarrollo, silencioso en tests |
| **Env validation** | Zod valida `DATABASE_URL` + vars al arranque desde `server.ts` |
| **Seguridad** | Helmet (security headers) + express-rate-limit (200 req / 15 min) |
| **ESLint backend** | Flat config con `@typescript-eslint`, reglas `no-explicit-any` y `no-console` |
| **TanStack Query** | `AlertsPage` y `TransferPage` migradas a `useQuery` / `useMutation` |
| **ErrorBoundary** | Captura errores de render en toda la app con UI de recuperación |
| **Accesibilidad** | `aria-label`, `aria-required`, `aria-busy`, `role`, `htmlFor` en formularios clave |
| **Tests** | 97 tests backend (100% cob.) + 38 frontend (100% cob.) — 135 tests totales |
| **Docker** | Dockerfile multi-stage backend + frontend (Nginx), `docker-compose.yml` completo |
| **CI/CD** | GitHub Actions: lint + tests + docker build en cada PR a main/develop |
| **Husky** | Pre-commit hook que corre `lint-staged` antes de cada commit |

---

## 📐 Decisiones de diseño vigentes

### Jerarquía de errores
```
Error
 └── AppError (isOperational: true)
      ├── NotFoundError   (404) — recurso no encontrado
      ├── ValidationError (400) — datos de entrada inválidos
      ├── ConflictError   (409) — estado final, duplicado
      └── BusinessRuleError (422) — regla de negocio violada
```

### Service Layer
- Controllers: reciben request → validan entrada (tipos) → llaman service → responden.
- Services: contienen toda la lógica de negocio y acceso a Prisma.
- No hay lógica de negocio en controllers.

### React Query
- `staleTime: 30s` — los datos se consideran frescos por 30 segundos.
- Mutaciones invalidan sus queries relacionadas con `invalidateQueries`.
- Errores de fetch se manejan con `onError` en cada mutación.

### Prioridad de ubicaciones (SCRUM-69)
Campo `priority` en `Location` (1=máxima, 10=mínima, default 5). Se valida al crear/actualizar (clamp 1–10). `suggestSourceLocation` ordena por `priority ASC` y luego por `stockDisponible DESC` para empate. Se muestra como badge P1–P10 en `StockUbicationPage`.

### Sincronización de almacenes (SCRUM-68)
`getStockBalance` clasifica cada ubicación de un producto como `EXCESS` (stock > promedio × 1.5), `DEFICIT` (stock ≤ minStock) u `OK`. Calcula transferencias sugeridas de EXCESS → DEFICIT según stock disponible (físico − reservado). `executeSuggestedTransfer` delega en `createTransfer` con nota automática.

### Picking por lotes (SCRUM-70)
`getBatchPickList(orderIds)` sólo procesa órdenes en `READY_FOR_DISPATCH`. Agrupa ítems por `locationId` y luego por `productId`, sumando cantidades del mismo producto en la misma ubicación. Ordena ubicaciones por `priority ASC` para optimizar el recorrido físico.

### Evento Pedido Pagado (SCRUM-31)
`POST /external/payment-confirmed` requiere header `X-Api-Key` igual a `process.env.EXTERNAL_API_KEY`. Si la variable no está configurada, responde 503. Llama a `confirmDelivery(reservationId)` y opcionalmente a `transitionOrder(orderId, 'READY_FOR_DISPATCH')`.

### Transferencias atómicas (SCRUM-23)
Una sola transacción Prisma: valida stock disponible (físico − reservado) → verifica capacidad destino → descuenta origen → suma destino → registra 2 movimientos TRANSFER → crea/resuelve alertas.

### Alertas automáticas (SCRUM-26)
Se crean al detectar `stock ≤ product.minStock` en OUT o TRANSFER. Se auto-resuelven cuando un IN supera el umbral. Sin duplicados: si ya hay alerta PENDING, no se crea otra.

### Reposición → RECEIVED (SCRUM-27)
Transacción atómica: incrementa stock → registra movimiento IN → actualiza orden → resuelve alertas PENDING si `stock > minStock`.

---

## ⚠️ Pendientes (no relacionados con API Design)

### Frontend
- [ ] Campos `dispatchStart` / `dispatchEnd` en `LocationForm`
- [ ] Migrar `StockPage`, `MovementsHistoryPage`, `ReservationsPage` a React Query
- [ ] Página detalle de ubicación

### Backend
- [ ] Campo `transportRestrictions` en Location (migración + endpoint)
- [ ] `SCRUM-59` — Trazabilidad de liberaciones: `ReservationLog` o `MovementType.RELEASE`
- [ ] Notificaciones por email (`nodemailer`) al generar alerta crítica

### Integraciones externas
- [ ] Migrar reservas a `POST /api/v1/external/reservations`
- [ ] `GET /api/v1/external/stock/:sku`
- [ ] TTL automático de reservas (`node-cron` → `EXPIRED` + liberación)
- [x] API Key para endpoint de pago externo (`EXTERNAL_API_KEY` + `validateApiKey`) — **SCRUM-31**

### API Design (coordinación con otros grupos)
- [ ] Paginación en endpoints de listas (movements, orders, stock)
- [ ] Versionado formal de API (estrategia de deprecación v1 → v2)
- [ ] Idempotency keys para evitar doble submit
- [ ] HATEOAS mínimo en respuestas

---

## 🧪 Tests

### Backend — 97 tests, 100% cobertura

```bash
cd backend
npm run test             # rápido, sin cobertura
npm run test:coverage    # con reporte de cobertura
```

| Archivo | Tests | Stmts | Branch | Funcs | Lines |
|---------|-------|-------|--------|-------|-------|
| `movement.service.ts` | 22 | 100% | 100% | 100% | 100% |
| `alert.service.ts` | 4 | 100% | 100% | 100% | 100% |
| `replenishment.service.ts` | 11 | 100% | 100% | 100% | 100% |
| `location.service.ts` | 12 | 100% | 100% | 100% | 100% |
| `sync.service.ts` | 6 | 100% | 100% | 100% | 100% |
| `picking.service.ts` | 8 | 100% | 100% | 100% | 100% |
| `reservation.service.ts::processPaymentConfirmed` | 4 | 100% | 100% | 100% | 100% |
| `alert.controller.ts` | 5 | 100% | 100% | 100% | 100% |
| `replenishment.controller.ts` | 19 | 100% | 100% | 100% | 100% |
| `errors.ts` | 5 | 100% | 100% | 100% | 100% |

**Estrategia de mocking:**
- Prisma mockeado con `mockDeep<PrismaClient>()` vía `moduleNameMapper` en Jest
- Controllers testeados mockeando sus services (`jest.mock('../../services/...')`)
- `$transaction` mockeado para ejecutar callbacks sin DB real
- `Date` controlada con `jest.useFakeTimers()` para validar horarios de despacho
- Dependencias inter-service mockeadas con `jest.mock` + `jest.spyOn`

### Frontend — 38 tests, 100% cobertura

```bash
cd frontend
pnpm test              # rápido
pnpm test:coverage     # con reporte
```

| Archivo | Tests |
|---------|-------|
| `alertService.ts` | 5 |
| `replenishmentService.ts` | 11 |
| `movementService.ts` | 8 |
| `syncService.ts` | 8 |
| `pickingService.ts` | 6 |

**Estrategia:** `fetch` global mockeado con `vi.spyOn` para simular respuestas ok y error de cada endpoint.

---

## 🐳 Docker

```bash
# Levantar todo el stack (postgres + backend + frontend)
docker compose up --build

# Solo base de datos (para desarrollo local del backend)
docker compose up postgres

# Ver logs
docker compose logs -f backend
```

Servicios:
- `postgres` — PostgreSQL 16 con healthcheck
- `backend` — Node.js 22 multi-stage, arranque tras healthcheck de postgres
- `frontend` — Nginx con SPA fallback + caché de assets

---

## 🔀 CI/CD

GitHub Actions ejecuta en cada push/PR a `main` o `develop`:
1. **Backend**: `npm run lint` + `npm run test:coverage`
2. **Frontend**: `pnpm lint` + `pnpm test:coverage`
3. **Docker**: build de imágenes de producción (verifica que compilan)

Artefactos de cobertura se guardan automáticamente en cada run.

---

## 🧰 Cómo probar localmente

```bash
# Con Docker (modo producción)
docker compose up --build
# → http://localhost (frontend) + http://localhost:3000 (API)

# Modo desarrollo
cd backend && npm run dev    # http://localhost:3000
cd frontend && pnpm dev      # http://localhost:5173
```

### Flujos clave
1. **Transferencia** (SCRUM-23): `/Transferir` → producto + origen + destino → confirmar
2. **Alerta** (SCRUM-26): Registrar OUT hasta bajar bajo `minStock` → ver alerta en `/Alertas`
3. **Reposición** (SCRUM-27): Desde alerta → "Reponer Stock" → proveedor + cantidad → "✓ Recibido" → stock sube + alerta resuelta
4. **Reservas** (SCRUM-20/33): `/Reservas` → Liberar (ACTIVE→RELEASED) o Confirmar entrega (ACTIVE→SOLD)
5. **Prioridad de ubicaciones** (SCRUM-69): Crear ubicación con prioridad 1–10 → ver P1/P2 badge en `/StockUbicaciones` → `GET /api/v1/stock/suggest-source/:productId` devuelve lista ranqueada
6. **Sincronización** (SCRUM-68): `/Sincronizacion` → ver tarjetas EXCESS/DEFICIT/OK por producto → "Ejecutar" transferencia de balanceo
7. **Picking** (SCRUM-70): `/Picking` → seleccionar órdenes READY_FOR_DISPATCH → "Generar lista" → recorrido eficiente agrupado por ubicación
8. **Pedido Pagado** (SCRUM-31): `POST /external/payment-confirmed` con `X-Api-Key: <clave>` + `{ reservationId, orderId }` → confirma reserva + transiciona orden
