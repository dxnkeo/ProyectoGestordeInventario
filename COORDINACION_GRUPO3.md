# Coordinación Técnica — Grupo 5 (Inventario) ↔ Grupo 3 (Pedidos)

> Documento para alinear la integración entre ambos sistemas en el próximo sprint.  
> Preparado por: Grupo 5 — Sistema de Gestión de Inventario Distribuido  
> Base URL nuestra API: `http://localhost:3000/api/v1`  
> Swagger interactivo: `http://localhost:3000/api-docs`

---

## Resumen rápido — ¿Quién hace qué?

| Responsabilidad | Grupo 5 (Inventario) | Grupo 3 (Pedidos) |
|-----------------|---------------------|-------------------|
| Catálogo de productos (SKU, stock, ubicación) | ✅ Dueño | Consume |
| Creación de pedidos de clientes | Consume eventos | ✅ Dueño |
| Reserva de stock | ✅ Expone API | Consume API |
| Confirmación de pago | Recibe evento | ✅ Emite evento |
| Liberación de stock (cancelación) | ✅ Expone API | Consume API |
| Consulta de disponibilidad en tiempo real | ✅ Expone API | Consume API |

**Flujo simplificado:**
```
Cliente hace pedido (Grupo 3)
   → Grupo 3 consulta disponibilidad de stock (llama a Grupo 5)
   → Grupo 3 reserva el stock (llama a Grupo 5)
   → Cliente paga (Grupo 4)
   → Grupo 3 notifica pago confirmado (llama a Grupo 5)
   → Grupo 5 descuenta stock físico y libera la orden para despacho
```

---

## Lo que Grupo 5 ya tiene listo (pueden usar hoy)

### Endpoint 1 — Consultar stock disponible por producto

```http
GET /api/v1/stock/suggest-source/{productId}?quantity=N

Respuesta 200:
[
  {
    "location": {
      "id": "uuid-bodega-central",
      "name": "Bodega Central",
      "type": "bodega",
      "priority": 1
    },
    "quantity": 50,
    "reserved": 2,
    "stockDisponible": 48,
    "rank": 1
  },
  {
    "location": {
      "id": "uuid-tienda-norte",
      "name": "Tienda Norte",
      "type": "tienda",
      "priority": 3
    },
    "quantity": 10,
    "reserved": 0,
    "stockDisponible": 10,
    "rank": 2
  }
]
```

> Devuelve las ubicaciones con stock suficiente, ordenadas por prioridad.  
> La primera de la lista es la ubicación óptima para reservar.

---

### Endpoint 2 — Consultar todo el stock (vista general)

```http
GET /api/v1/stock

Respuesta 200:
[
  {
    "id": "...",
    "productId": "uuid-producto",
    "locationId": "uuid-ubicacion",
    "quantity": 50,
    "reserved": 2,
    "stockDisponible": 48,
    "product": { "id": "...", "name": "Laptop Dell Inspiron 15", "sku": "DELL-INS-15-001" },
    "location": { "id": "...", "name": "Bodega Central", "type": "bodega" }
  }
]
```

---

### Endpoint 3 — Listar todos los productos disponibles

```http
GET /api/v1/products

Respuesta 200:
[
  {
    "id": "uuid-producto",
    "name": "Laptop Dell Inspiron 15",
    "sku": "DELL-INS-15-001",
    "minStock": 5,
    "createdAt": "2026-06-01T00:00:00Z"
  }
]
```

> Usar el `sku` como identificador compartido entre ambos sistemas.

---

### Endpoint 4 — Crear reserva de stock

```http
POST /api/v1/reservations
Content-Type: application/json

{
  "orderId": 1001,           ← ID del pedido en sistema de Grupo 3
  "sku": "DELL-INS-15-001", ← SKU del producto (identificador compartido)
  "locationId": "uuid-bodega-central",  ← Obtenido del endpoint suggest-source
  "quantity": 2,
  "expiresAt": "2026-06-11T23:59:59Z"  ← Opcional: fecha de expiración
}

Respuesta 201:
{
  "success": true,
  "message": "Reserva creada exitosamente.",
  "data": {
    "reservationId": 1,    ← GUARDAR ESTE ID (necesario para confirmar o cancelar)
    "sku": "DELL-INS-15-001",
    "quantity": 2,
    "status": "ACTIVE",
    "stockDisponible": 46
  }
}
```

> **Importante:** Guardar el `reservationId` devuelto — se necesita para cancelar o confirmar.

Errores posibles:
```
400 → SKU no encontrado, o ubicación sin stock suficiente
400 → Fuera de horario de despacho de esa ubicación (8:00–18:00)
409 → Capacidad diaria de despacho excedida
```

---

### Endpoint 5 — Cancelar reserva (pedido rechazado o pago fallido)

```http
POST /api/v1/reservations/release-reservation
Content-Type: application/json

{
  "reservationId": 1
}

Respuesta 200:
{
  "success": true,
  "message": "Reserva cancelada y liberada. Stock disponible actualizado.",
  "data": {
    "reservationId": 1,
    "status": "RELEASED",
    "stockDisponible": 48
  }
}
```

---

### Endpoint 6 — Notificar "Pedido Pagado" ⭐ Principal integración

```http
POST /api/v1/external/payment-confirmed
Content-Type: application/json
X-Api-Key: {CLAVE_COMPARTIDA}   ← Necesitan pedírnosla

{
  "reservationId": 1,          ← El reservationId que guardaron al crear la reserva
  "orderId": "uuid-del-pedido"  ← Opcional: el ID de la orden en el sistema de Grupo 3
}

Respuesta 200:
{
  "success": true,
  "message": "Evento 'Pedido Pagado' procesado exitosamente.",
  "data": {
    "deliveryResult": {
      "reservation": { "reservationId": 1, "status": "SOLD" },
      "movement": { "id": "uuid-mov", "type": "OUT", "quantity": 2 }
    },
    "orderTransition": {
      "id": "uuid-del-pedido",
      "status": "READY_FOR_DISPATCH"
    }
  }
}
```

> Esto descuenta el stock físico (ACTIVE → SOLD) y mueve la orden a READY_FOR_DISPATCH.

Errores posibles:
```
401 → X-Api-Key ausente o incorrecta
503 → API Key no configurada en el servidor de Grupo 5
404 → reservationId no encontrado
```

---

## Preguntas que debemos responder juntos

### ❓ Pregunta 1: ¿Cuál es el formato del `orderId`?

**Problema actual:** En nuestra base de datos, `Reservation.orderId` está definido como `Int` (número entero). Sin embargo, si el `orderId` de Grupo 3 es un UUID o un string, esto rompería la integración.

**Opciones:**
- **Opción A:** Grupo 3 usa IDs numéricos para sus pedidos (ej: `1001`, `1002`). → No cambiamos nada.
- **Opción B:** Grupo 3 usa UUIDs. → Nosotros migramos `Reservation.orderId` de `Int` a `String`.

**→ Necesitamos que Grupo 3 nos confirme qué tipo de ID usan sus pedidos.**

---

### ❓ Pregunta 2: ¿Quién elige la ubicación de la reserva?

**Problema:** Cuando Grupo 3 crea una reserva, necesita indicar el `locationId`. Hay dos formas de manejar esto:

- **Opción A (actual):** Grupo 3 llama primero a `GET /stock/suggest-source/:productId?quantity=N`, obtiene el `locationId` óptimo, y lo incluye al crear la reserva. Más control para Grupo 3.
- **Opción B:** Grupo 3 solo manda `{ sku, quantity, orderId }` y nosotros elegimos la ubicación automáticamente. Más simple para Grupo 3, pero requiere que implementemos esa lógica en el próximo sprint.

**→ ¿Qué prefiere Grupo 3?**

---

### ❓ Pregunta 3: ¿Con qué frecuencia consultan disponibilidad?

¿Grupo 3 consultaría stock en tiempo real para cada pedido (una llamada por pedido), o necesitan una copia del catálogo en su sistema para búsquedas rápidas?

Esto afecta si necesitamos implementar un mecanismo de sincronización periódica o si el endpoint en tiempo real es suficiente.

---

### ❓ Pregunta 4: ¿Cómo manejar rollback si la reserva falla a mitad del proceso?

Si Grupo 3 reserva stock pero el pago con Grupo 4 falla, deben llamar a `POST /reservations/release-reservation` para liberar el stock. ¿Esto lo manejan automáticamente con un retry o necesitan un webhook de nuestra parte?

---

### ❓ Pregunta 5: Tiempo de expiración de reservas

Actualmente las reservas no expiran automáticamente (campo `expiresAt` existe pero no hay job automático). Si un pedido queda en limbo (pago nunca confirmado ni rechazado), el stock queda bloqueado indefinidamente.

**→ ¿Cuánto tiempo debería durar una reserva antes de liberarse automáticamente?** (ej: 30 minutos, 24 horas)

Nosotros implementamos el job automático en el próximo sprint si acordamos el tiempo.

---

## Catálogo de productos disponibles hoy (datos de prueba)

Actualmente tenemos 2 productos de prueba. En el próximo sprint necesitamos definir el catálogo real.

| SKU | Nombre | Stock Bodega Central | Stock Tienda Norte | minStock |
|-----|--------|---------------------|-------------------|----------|
| `DELL-INS-15-001` | Laptop Dell Inspiron 15 | 50 uds | 10 uds | 5 |
| `LOG-MOUSE-WL-002` | Mouse Inalámbrico Logitech | 150 uds | 3 uds ⚠️ | 10 |

**Para el sprint de integración real, necesitamos que Grupo 3 nos envíe:**
- Lista de SKUs reales que van a manejar en sus pedidos
- Nombre del producto (para nuestro catálogo)
- Stock inicial sugerido por ubicación (si lo tienen)

---

## Lo que implementamos en el próximo sprint (propuesta)

### De nuestra parte (Grupo 5)

| Tarea | Descripción | Depende de |
|-------|-------------|-----------|
| Migrar `Reservation.orderId` a `String` | Soporte para UUID de Grupo 3 | Respuesta Pregunta 1 |
| Auto-selección de ubicación en reserva | Eliminar necesidad de `locationId` en el request | Respuesta Pregunta 2 |
| TTL automático de reservas | Job cron que libera reservas expiradas | Acordar tiempo (Pregunta 5) |
| Endpoint `GET /external/stock/:sku` | Consulta de stock por SKU con autenticación | — |
| Endpoint `POST /external/reservations` | Versión autenticada del endpoint de reservas | — |
| Evento "stock agotado" | Webhook o evento cuando stock baja de minStock | Acordar destino |

### Lo que necesitamos que Grupo 3 implemente

| Tarea | Descripción |
|-------|-------------|
| Llamar a `suggest-source` antes de crear reserva | Obtener la ubicación óptima |
| Guardar `reservationId` en su base de datos | Necesario para confirmar o cancelar |
| Llamar a `release-reservation` si pago falla | Rollback automático de stock |
| Llamar a `payment-confirmed` cuando Grupo 4 confirma | Con el `X-Api-Key` que les compartiremos |

---

## Formato exacto de las llamadas para copiar-pegar

### Flujo completo en orden

```bash
# PASO 1: Consultar disponibilidad (antes de crear el pedido)
curl -X GET "http://localhost:3000/api/v1/stock/suggest-source/{productId}?quantity=2"

# PASO 2: Crear reserva con la ubicación sugerida
curl -X POST "http://localhost:3000/api/v1/reservations" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 1001,
    "sku": "DELL-INS-15-001",
    "locationId": "{locationId-del-paso-1}",
    "quantity": 2
  }'
# → Guardar el "reservationId" de la respuesta

# PASO 3a: Si el pago fue exitoso → notificar pago confirmado
curl -X POST "http://localhost:3000/api/v1/external/payment-confirmed" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: {CLAVE_QUE_LES_DAREMOS}" \
  -d '{
    "reservationId": 1,
    "orderId": "uuid-del-pedido-en-grupo3"
  }'

# PASO 3b: Si el pago falló → liberar la reserva
curl -X POST "http://localhost:3000/api/v1/reservations/release-reservation" \
  -H "Content-Type: application/json" \
  -d '{ "reservationId": 1 }'
```

---

## Información que Grupo 5 debe compartir con Grupo 3

| Dato | Valor |
|------|-------|
| Base URL API | `http://localhost:3000/api/v1` (dev) / URL en producción a definir |
| Swagger docs | `http://localhost:3000/api-docs` |
| `EXTERNAL_API_KEY` | Compartir por canal seguro (no en el código) |
| SKUs disponibles | Ver tabla de catálogo arriba |
| IDs de ubicaciones | Consultar `GET /api/v1/locations` |

---

## Agenda de reunión sugerida

1. Confirmar tipo de `orderId` (Int vs String/UUID) — **crítico**
2. Confirmar si Grupo 3 elige ubicación o nosotros la elegimos automáticamente
3. Acordar TTL de reservas
4. Intercambiar `EXTERNAL_API_KEY` de forma segura
5. Definir catálogo de SKUs reales para el sprint de integración
6. Revisar Swagger juntos en `http://localhost:3000/api-docs`
