# Coordinación Técnica — Grupo 5 (Inventario) ↔ Grupo 3 (Pedidos)

> **Estado:** Integración implementada — lista para pruebas end-to-end  
> Preparado por: Grupo 5 — Sistema de Gestión de Inventario Distribuido  
> Base URL nuestra API: `http://localhost:3000/api/v1`  
> Swagger interactivo: `http://localhost:3000/api-docs`

---

## Resumen rápido — ¿Quién hace qué?

| Responsabilidad | Grupo 5 (Inventario) | Grupo 3 (Pedidos) |
|-----------------|---------------------|-------------------|
| Catálogo de productos (SKU, stock, ubicación) | ✅ Dueño | Consume |
| Creación de pedidos de clientes | — | ✅ Dueño |
| Reserva de stock | ✅ Expone API | Consume API |
| Confirmación de pago | Recibe evento | ✅ Emite evento |
| Liberación de stock (cancelación) | ✅ Expone API | Consume API |
| Selección de bodega/tienda óptima | ✅ Automática | No requerida |
| Consulta de disponibilidad en tiempo real | ✅ Expone API | Consume API |

**Flujo acordado:**
```
Cliente hace pedido (Grupo 3)
   → Grupo 3 consulta stock por SKU (opcional)
   → Grupo 3 reserva stock vía POST /external/reservations
   → Grupo 5 elige ubicación óptima y bloquea stock (TTL 30 min)
   → Cliente paga (Grupo 4)
   → Grupo 3 notifica pago → POST /external/payment-confirmed
   → Grupo 5 descuenta stock físico (ACTIVE → SOLD)
   → Si pago falla o timeout → POST /external/release-reservation
```

---

## Acuerdos cerrados con Grupo 3

| Tema | Decisión |
|------|----------|
| **Formato `orderId`** | UUID v4 (`String`), ej. `550e8400-e29b-41d4-a716-446655440000` |
| **Ubicación de reserva** | Grupo 5 elige automáticamente (prioridad + stock disponible). `locationId` es **opcional** |
| **TTL de reserva** | **30 minutos** por defecto. Job automático libera reservas vencidas (`EXPIRED`) |
| **SKUs de prueba** | `PROD-001`, `PROD-002`, `TEST-123`, `OFERTA-500` (normalizados en mayúsculas) |
| **Autenticación** | Header `X-Api-Key` en todos los endpoints `/external/*` |
| **Ruta de reserva** | `POST /api/v1/external/reservations` — **no existe** `/stock/reserve` |

---

## Autenticación

Todos los endpoints bajo `/api/v1/external/*` requieren:

```http
X-Api-Key: {EXTERNAL_API_KEY}
```

| Código | Significado |
|--------|-------------|
| `401` | API Key ausente o incorrecta |
| `503` | `EXTERNAL_API_KEY` no configurada en el servidor de Grupo 5 |

> Grupo 5 comparte la clave por **canal seguro** (DM, WhatsApp privado, gestor de contraseñas). No incluirla en el repositorio.

---

## Endpoints para Grupo 3 (contrato principal)

### 1 — Consultar stock por SKU

```http
GET /api/v1/external/stock/{sku}
X-Api-Key: {CLAVE_COMPARTIDA}
```

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Stock para SKU \"PROD-001\": 2 ubicación(es).",
  "data": [
    {
      "sku": "PROD-001",
      "locationId": "uuid-bodega-central",
      "locationName": "Bodega Central",
      "locationType": "bodega",
      "quantity": 100,
      "reserved": 2,
      "stockDisponible": 98,
      "minStock": 5,
      "dispatchWindow": { "start": "8:00", "end": "18:00" }
    }
  ]
}
```

**Consulta por SKU + ubicación específica:**
```http
GET /api/v1/external/stock/{sku}/locations/{locationId}
X-Api-Key: {CLAVE_COMPARTIDA}
```

---

### 2 — Crear reserva de stock ⭐

```http
POST /api/v1/external/reservations
Content-Type: application/json
X-Api-Key: {CLAVE_COMPARTIDA}

{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "sku": "PROD-001",
  "quantity": 2
}
```

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `orderId` | ✅ | UUID v4 del pedido en Grupo 3 |
| `sku` | ✅ | SKU en mayúsculas (se normaliza automáticamente) |
| `quantity` | ✅ | Entero ≥ 1 |
| `locationId` | ❌ | Opcional. Si no se envía, Grupo 5 elige la ubicación óptima |
| `expiresAt` | ❌ | Opcional. Default: **now + 30 minutos** |

**Respuesta 201:**
```json
{
  "success": true,
  "message": "Reserva creada exitosamente.",
  "data": {
    "reservation": {
      "reservationId": 1,
      "orderId": "550e8400-e29b-41d4-a716-446655440000",
      "sku": "PROD-001",
      "locationId": "uuid-bodega-central",
      "quantity": 2,
      "status": "ACTIVE",
      "expiresAt": "2026-06-23T15:30:00.000Z",
      "location": {
        "id": "uuid-bodega-central",
        "name": "Bodega Central",
        "type": "bodega"
      }
    },
    "quantity": 100,
    "reserved": 2,
    "stockDisponible": 98
  }
}
```

> **Importante:** Guardar `reservationId` — necesario para confirmar pago o liberar la reserva.

**Errores posibles:**
```
400 → SKU no encontrado, stock insuficiente, fuera de horario de despacho
401 → API Key inválida
404 → SKU inexistente
503 → API Key no configurada en servidor
```

---

### 3 — Liberar reserva (pago fallido / cancelación)

```http
POST /api/v1/external/release-reservation
Content-Type: application/json
X-Api-Key: {CLAVE_COMPARTIDA}

{
  "reservationId": 1
}
```

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Reserva cancelada y liberada. Stock disponible actualizado.",
  "data": {
    "reservation": {
      "reservationId": 1,
      "status": "RELEASED"
    },
    "quantity": 100,
    "reserved": 0,
    "stockDisponible": 100,
    "alreadyReleased": false
  }
}
```

> Si la reserva ya expiró por TTL (30 min), el estado será `EXPIRED` y no podrá liberarse manualmente — el stock ya fue restaurado automáticamente.

---

### 4 — Notificar "Pedido Pagado"

```http
POST /api/v1/external/payment-confirmed
Content-Type: application/json
X-Api-Key: {CLAVE_COMPARTIDA}

{
  "reservationId": 1,
  "orderId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `reservationId` | ✅ | ID devuelto al crear la reserva |
| `orderId` | ❌ | UUID del pedido — opcional, para transicionar orden interna a despacho |

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Evento 'Pedido Pagado' procesado exitosamente.",
  "data": {
    "deliveryResult": {
      "reservation": { "reservationId": 1, "status": "SOLD" },
      "movement": { "id": "uuid-mov", "type": "OUT", "quantity": 2 }
    },
    "orderTransition": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "READY_FOR_DISPATCH"
    }
  }
}
```

> Descuenta stock físico (ACTIVE → SOLD) y registra movimiento OUT.

---

### 5 — Listar reservas (opcional, debugging)

```http
GET /api/v1/external/reservations?status=ACTIVE
X-Api-Key: {CLAVE_COMPARTIDA}
```

---

## Flujo completo — copiar y pegar

```bash
# PASO 1 (opcional): Consultar disponibilidad antes del checkout
curl -X GET "http://localhost:3000/api/v1/external/stock/PROD-001" \
  -H "X-Api-Key: {CLAVE_COMPARTIDA}"

# PASO 2: Crear reserva (sin locationId — nosotros elegimos ubicación)
curl -X POST "http://localhost:3000/api/v1/external/reservations" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: {CLAVE_COMPARTIDA}" \
  -d '{
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "sku": "PROD-001",
    "quantity": 2
  }'
# → Guardar "reservationId" de data.reservation.reservationId

# PASO 3a: Pago exitoso → confirmar
curl -X POST "http://localhost:3000/api/v1/external/payment-confirmed" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: {CLAVE_COMPARTIDA}" \
  -d '{
    "reservationId": 1,
    "orderId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# PASO 3b: Pago fallido → liberar reserva
curl -X POST "http://localhost:3000/api/v1/external/release-reservation" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: {CLAVE_COMPARTIDA}" \
  -d '{ "reservationId": 1 }'
```

---

## Catálogo de productos de prueba

SKUs acordados con Grupo 3 (seed incluido en el entorno de desarrollo):

| SKU | Nombre | Stock Bodega Central | Stock Tienda Norte | minStock |
|-----|--------|---------------------|-------------------|----------|
| `PROD-001` | Producto Demo 001 | 100 uds | 25 uds | 5 |
| `PROD-002` | Producto Demo 002 | 100 uds | 25 uds | 5 |
| `TEST-123` | Producto Test | 100 uds | 25 uds | 3 |
| `OFERTA-500` | Producto Oferta 500 | 100 uds | 25 uds | 10 |

Productos legacy (también disponibles):

| SKU | Nombre | Stock Bodega Central | Stock Tienda Norte | minStock |
|-----|--------|---------------------|-------------------|----------|
| `DELL-INS-15-001` | Laptop Dell Inspiron 15 | 50 uds | 10 uds | 5 |
| `LOG-MOUSE-WL-002` | Mouse Inalámbrico Logitech | 150 uds | 3 uds ⚠️ | 10 |

> Consultar ubicaciones: `GET /api/v1/locations`  
> Regenerar datos de prueba: `cd backend && npm run db:seed`

---

## Comportamiento de reservas (TTL)

| Evento | Estado resultante | Stock disponible |
|--------|-------------------|------------------|
| Reserva creada | `ACTIVE` | Disminuye (bloqueado) |
| Pago confirmado | `SOLD` | Stock físico descontado |
| Liberación manual | `RELEASED` | Restaurado |
| TTL vencido (30 min) | `EXPIRED` | Restaurado automáticamente (job cada 60 s) |

Variables de entorno en Grupo 5:

```env
EXTERNAL_API_KEY=clave-compartida-con-grupo-3
RESERVATION_TTL_MINUTES=30
RESERVATION_EXPIRY_INTERVAL_MS=60000
```

---

## Endpoints internos (referencia — no requieren API Key)

Disponibles para desarrollo y panel admin. **Grupo 3 debe usar los endpoints `/external/*`.**

| Método | Ruta | Notas |
|--------|------|-------|
| `GET` | `/stock` | Todo el inventario |
| `GET` | `/stock/suggest-source/{productId}?quantity=N` | Por UUID de producto (no SKU) |
| `GET` | `/products` | Catálogo completo |
| `POST` | `/reservations` | Mismo contrato que `/external/reservations`, sin API Key |
| `POST` | `/release-reservation` | Mismo contrato, sin API Key |

---

## Lo que debe implementar Grupo 3

| Tarea | Descripción |
|-------|-------------|
| Guardar `reservationId` | Al crear reserva, persistir el ID devuelto por Grupo 5 |
| Enviar `X-Api-Key` | En todas las llamadas a `/external/*` |
| Confirmar pago | `POST /external/payment-confirmed` cuando Grupo 4 confirme |
| Rollback en pago fallido | `POST /external/release-reservation` si el pago no se completa |
| Manejar expiración | Si pasan 30 min sin pago, la reserva expira sola — no requiere acción extra |

---

## Información para compartir con Grupo 3

| Dato | Valor |
|------|-------|
| Base URL API (dev) | `http://localhost:3000/api/v1` |
| Swagger | `http://localhost:3000/api-docs` |
| `EXTERNAL_API_KEY` | Compartir por canal seguro |
| SKUs de prueba | `PROD-001`, `PROD-002`, `TEST-123`, `OFERTA-500` |
| TTL reserva | 30 minutos |
| Ruta reserva | `POST /api/v1/external/reservations` |

---

## Checklist de validación conjunta

- [ ] Grupo 3 recibe `EXTERNAL_API_KEY` y configura el header
- [ ] `GET /external/stock/PROD-001` devuelve stock en ≥ 1 ubicación
- [ ] `POST /external/reservations` crea reserva sin enviar `locationId`
- [ ] `reservationId` y `expiresAt` (+30 min) presentes en respuesta
- [ ] `POST /external/payment-confirmed` descuenta stock (status `SOLD`)
- [ ] `POST /external/release-reservation` restaura stock (status `RELEASED`)
- [ ] Reserva no pagada expira a los 30 min (status `EXPIRED`, stock liberado)
- [ ] Flujo end-to-end con UUID real de pedido de Grupo 3

---

## Pendientes futuros (fuera de scope actual)

| Item | Responsable | Notas |
|------|-------------|-------|
| Webhook "stock agotado" hacia Grupo 3 | Grupo 5 | Cuando stock baja de `minStock` |
| URL de producción / staging | Ambos | Definir antes del deploy |
| Catálogo real de producción | Ambos | Reemplazar SKUs de prueba |

---

*Última actualización: 2026-06-23 — Integración Grupo 3 implementada*
