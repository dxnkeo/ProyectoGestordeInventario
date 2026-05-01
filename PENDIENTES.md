# 📋 Pendientes del Proyecto — Gap Analysis

> Última actualización: 2026-04-30
> Estado general del proyecto: etapa temprana de desarrollo.

---

## ✅ Lo que ya está implementado

- CRUD completo de ubicaciones (`POST`, `GET`, `GET /:id`, `PUT /:id`, `DELETE /:id`)
- CRUD de productos (crear y listar)
- Registro de movimientos de entrada (`IN`) y salida (`OUT`)
- Validación de stock negativo (bloqueo en salidas)
- Alerta global de stock crítico (consola + respuesta JSON)
- Transacciones atómicas con rollback en movimientos
- Stock asociado por ubicación y producto
- Frontend básico con páginas para crear ubicaciones y movimientos

---

## ❌ Pendientes por Requerimiento

---

### 1. 📍 Catálogo de Ubicaciones

**Progreso estimado: ~40%**

#### Backend

- [ ] Agregar campo `schedule` (horarios de operación) al modelo `Location` en el schema de Prisma → nueva migración
- [ ] Agregar campo `transportRestrictions` (restricciones de transporte: peso máximo, temperatura, tipo de vehículo, etc.) al modelo `Location` → nueva migración
- [ ] Ampliar los tipos de ubicación aceptados: incluir `"centro_distribucion"` y `"punto_atencion"` además de los existentes
- [ ] Crear modelo `Reservation` en el schema para manejar stock reservado vs. stock disponible real por ubicación → nueva migración
- [ ] Implementar servicio y endpoints para crear, consultar y cancelar reservas (`/api/v1/reservations`)
- [ ] Exponer en el endpoint de stock el campo `stockDisponible = quantity - reservado`

#### Frontend

- [ ] Agregar campos `schedule` y `transportRestrictions` al formulario "Registrar Nueva Ubicación"
- [ ] Crear página de detalle de ubicación con su stock y reservas activas
- [ ] Crear página/sección para gestionar reservas

---

### 2. 🔄 Movimientos y Transacciones

**Progreso estimado: ~55%**

#### Backend — Schema (Prisma)

- [ ] Agregar tipos al enum `MovementType`: `TRANSFER` y `RETURN`
- [ ] Agregar campo `destinationLocationId String?` al modelo `Movement` (para transferencias)
- [ ] Agregar campo `relatedMovementId String?` al modelo `Movement` (para devoluciones, referenciando el movimiento de salida original)
- [ ] Ejecutar nueva migración de Prisma

#### Backend — Lógica de Negocio

- [ ] Implementar **transferencias entre ubicaciones** (`TRANSFER`):
  - Descontar stock de la ubicación origen
  - Sumar stock en la ubicación destino
  - Ambas operaciones dentro de una única transacción atómica
  - Validar que origen y destino sean distintos
  - Validar stock suficiente en origen
- [ ] Implementar **devoluciones** (`RETURN`):
  - Validar que el movimiento de salida original exista
  - No permitir devolver más unidades de las que se retiraron originalmente
  - Actualizar stock al registrar la devolución

#### Frontend

- [ ] Crear página para listar el historial completo de movimientos (con filtros por tipo, producto, ubicación y fecha)
- [ ] Agregar opción de tipo `TRANSFER` en el formulario de movimientos, con campo de ubicación destino
- [ ] Agregar opción de tipo `RETURN` en el formulario, con referencia al movimiento original

---

### 3. 🔔 Reposiciones y Alertas

**Progreso estimado: ~15%**

#### Backend — Schema (Prisma)

- [ ] Agregar campo `minStock Int?` al modelo `Product` (umbral mínimo por SKU)
- [ ] Crear modelo `Supplier` (proveedor): `id`, `name`, `email`, `phone`, `createdAt`
- [ ] Asociar proveedores a productos (tabla `ProductSupplier` o campo `supplierId` en `Product`)
- [ ] Crear modelo `ReplenishmentOrder` (pedido de reposición): `id`, `productId`, `supplierId`, `quantity`, `status` (`PENDING`, `SENT`, `RECEIVED`), `triggeredAt`, `updatedAt`
- [ ] Ejecutar nueva migración de Prisma

#### Backend — Lógica de Negocio

- [ ] Reemplazar el umbral global (`criticalStockThreshold`) por la lectura del campo `minStock` de cada producto
- [ ] Al detectar stock ≤ `minStock`, generar automáticamente un `ReplenishmentOrder` en estado `PENDING`
- [ ] Implementar servicio de notificaciones:
  - Envío de email al equipo de compras (usando `nodemailer` u otro)
  - O integración con webhook (ej. Slack, Teams, Discord)
- [ ] Endpoints para gestionar pedidos de reposición (`/api/v1/replenishments`): listar, ver detalle, actualizar estado
- [ ] Endpoint para listar todos los productos actualmente bajo su umbral mínimo (`GET /api/v1/stock/alerts`)

#### Frontend

- [ ] Agregar campo `minStock` al formulario de creación/edición de productos
- [ ] Crear página **"Panel de Alertas"**: listado de todos los productos con stock por debajo de su umbral, con acceso directo al pedido de reposición
- [ ] Crear página **"Pedidos de Reposición"**: historial de pedidos generados, con posibilidad de cambiar el estado (`PENDING → SENT → RECEIVED`)
- [ ] Crear página/sección de **Proveedores**: CRUD de `Supplier`
- [ ] Mostrar badge o indicador visual en el menú cuando existan alertas activas

---

### 4. 🔌 Integraciones y APIs para Consumidores (Proyectos Externos)

**Progreso estimado: ~5%** (Solo endpoints básicos de stock existentes)

#### Backend — Endpoints Específicos
- [ ] **Consulta de Stock en Tiempo Real (Proyecto 3)**:
  - [ ] Endpoint optimizado `GET /api/v1/external/stock/:sku`: Retorna stock disponible (total - reservado).
  - [ ] Soporte para filtrado por ubicación opcional via query params.
- [ ] **Sistema de Reservas Externas (Proyecto 3)**:
  - [ ] Endpoint `POST /api/v1/external/reservations`: Bloqueo temporal de stock para pedidos entrantes.
  - [ ] Implementar TTL (Time-To-Live): las reservas expiran automáticamente si no se confirman.
  - [ ] Lógica de validación: impedir reservas superiores al stock disponible.
- [ ] **Confirmación de Liberaciones (Proyecto 2 — Logística)**:
  - [ ] Endpoint `PATCH /api/v1/external/reservations/:id/release`: Convierte reserva en movimiento `OUT` (confirmación logística).
  - [ ] Endpoint `DELETE /api/v1/external/reservations/:id`: Cancelar reserva y liberar stock.

#### Seguridad y Control
- [ ] Implementar **API Keys** o **JWT** específicos para identificar qué proyecto realiza la petición.
- [ ] Rate limiting para proteger la API de ráfagas de peticiones externas.

---

## 🗃️ Resumen de Cambios al Schema de Prisma Requeridos

| Cambio | Tipo |
|--------|------|
| `Location.schedule` | Campo nuevo |
| `Location.transportRestrictions` | Campo nuevo |
| `Reservation` | Modelo nuevo |
| `Movement.destinationLocationId` | Campo nuevo |
| `Movement.relatedMovementId` | Campo nuevo |
| `MovementType.TRANSFER` y `RETURN` | Valores nuevos al enum |
| `Product.minStock` | Campo nuevo |
| `Supplier` | Modelo nuevo |
| `ProductSupplier` | Modelo nuevo (relación) |
| `ReplenishmentOrder` | Modelo nuevo |

> ⚠️ Cada cambio al schema requiere ejecutar `npx prisma migrate dev` para aplicar la migración a la base de datos.

---

## 📦 Dependencias Externas a Instalar (estimado)

| Librería | Para qué |
|----------|----------|
| `nodemailer` + `@types/nodemailer` | Notificaciones por email al equipo de compras |
| `node-cron` *(opcional)* | Disparadores periódicos para revisar umbrales de stock |
