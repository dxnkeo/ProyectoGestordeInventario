# Coordinación Técnica — Grupo 5 (Inventario) ↔ Grupo 11 (Incidentes)

Este documento detalla la estructura interna de los payloads utilizados en el dominio de **Inventario** (Grupo 5) para la normalización de payloads entre dominios solicitada por el **Equipo 11 (Incidentes)**.

Se dividen en dos categorías:
1. **Eventos Salientes (Cola Outbox)**: Mensajes publicados de forma asíncrona hacia otros dominios (ej. Analítica).
2. **API Externa (Integración Directa)**: Peticiones HTTP recibidas en nuestra API desde el módulo de Pedidos (Grupo 3) y otros clientes.

---

## 1. Payloads de Eventos Salientes (Cola Outbox)
Todos los eventos salientes comparten un sobre general de transporte (**Envelope**) y colocan su información específica dentro de la propiedad `payload`.

### Sobre General (Envelope)
*   **Campos y tipos de datos**:
    *   `source` (String): `"inventory"`. **[Obligatorio]**
    *   `event_type` (String): El tipo específico del evento. **[Obligatorio]**
    *   `project_id` (String): ID del proyecto receptor (`"proyecto-09"`). **[Obligatorio]**
    *   `created_at` (String - ISO 8601): Timestamp de la creación del evento. **[Obligatorio]**
    *   `payload` (Object): Objeto con los datos específicos (ver a continuación). **[Obligatorio]**

---

### A. Movimientos de Stock (`stock_received`, `stock_dispatched`, `stock_adjusted`, `stock_transfer_initiated`)
*   **Campos y tipos de datos**:
    *   `sku_id` (String): Código único del producto (ej: SKU-PROD-001). **[Obligatorio]**
    *   `location_id` (String - UUID): Bodega/tienda afectada. **[Obligatorio]**
    *   `quantity` (Number): Cantidad de unidades afectadas. **[Obligatorio]**
    *   `unit_price` (Number): Precio unitario/costo del producto. **[Opcional]**
    *   `product_name` (String): Nombre del producto. **[Opcional]**
    *   `category` (String): Categoría del producto. **[Opcional]**
    *   `unit` (String): Unidad de medida (ej: `"unidad"`, `"kg"`). **[Opcional]**
    *   `location_name` (String): Nombre de la bodega/tienda. **[Opcional]**
    *   `location_type` (String): Tipo de ubicación (ej: `"bodega"`, `"tienda"`). **[Opcional]**
    *   `movement_id` (String - UUID): ID interno de la transacción. **[Opcional]**
    *   `order_id` (String - UUID): ID del pedido externo. **[Opcional]**

*   **Ejemplo de JSON:**
```json
{
  "source": "inventory",
  "event_type": "stock_received",
  "project_id": "proyecto-09",
  "created_at": "2026-06-30T22:30:00.000Z",
  "payload": {
    "sku_id": "PROD-001",
    "location_id": "b1b0b555-d41d-4e9e-88ef-222a7f5a4400",
    "quantity": 100,
    "unit_price": 12500.0,
    "product_name": "Tornillo M8",
    "category": "Ferretería",
    "unit": "unidad",
    "location_name": "Bodega Central",
    "location_type": "bodega",
    "movement_id": "m111a222-3333-4444-5555-666666777777"
  }
}
```

---

### B. Reserva de Stock (`stock_reserved`)
*   **Campos y tipos de datos**:
    *   `sku_id` (String): Código único del producto. **[Obligatorio]**
    *   `location_id` (String - UUID): Ubicación donde se bloqueó stock. **[Obligatorio]**
    *   `quantity` (Number): Cantidad reservada. **[Obligatorio]**
    *   `order_id` (String - UUID): ID del pedido originario de la reserva. **[Obligatorio]**
    *   `reservation_id` (Number): ID secuencial de la reserva en base de datos. **[Obligatorio]**

*   **Ejemplo de JSON:**
```json
{
  "source": "inventory",
  "event_type": "stock_reserved",
  "project_id": "proyecto-09",
  "created_at": "2026-06-30T22:31:00.000Z",
  "payload": {
    "sku_id": "PROD-001",
    "location_id": "b1b0b555-d41d-4e9e-88ef-222a7f5a4400",
    "quantity": 2,
    "order_id": "550e8400-e29b-41d4-a716-446655440000",
    "reservation_id": 42
  }
}
```

---

### C. Liberación/Expiración de Reserva (`stock_released`)
*   **Campos y tipos de datos**:
    *   `sku_id` (String): Código del producto. **[Obligatorio]**
    *   `location_id` (String - UUID): Ubicación donde se libera stock. **[Obligatorio]**
    *   `quantity` (Number): Cantidad liberada. **[Obligatorio]**
    *   `reservation_id` (Number): ID de la reserva. **[Obligatorio]**
    *   `reason` (String): Motivo de la liberación. Valores posibles: `"RELEASED"` o `"EXPIRED"`. **[Obligatorio]**

*   **Ejemplo de JSON:**
```json
{
  "source": "inventory",
  "event_type": "stock_released",
  "project_id": "proyecto-09",
  "created_at": "2026-06-30T22:32:00.000Z",
  "payload": {
    "sku_id": "PROD-001",
    "location_id": "b1b0b555-d41d-4e9e-88ef-222a7f5a4400",
    "quantity": 2,
    "reservation_id": 42,
    "reason": "RELEASED"
  }
}
```

---

### D. Alerta de Stock Crítico (`critical_threshold_reached`)
*   **Campos y tipos de datos**:
    *   `sku_id` (String): Código del producto. **[Obligatorio]**
    *   `location_id` (String - UUID): Bodega/tienda afectada. **[Obligatorio]**
    *   `current_stock` (Number): Cantidad física actual disponible. **[Obligatorio]**
    *   `threshold_limite` (Number): Cantidad mínima antes de emitir alerta. **[Obligatorio]**
    *   `alert_id` (String - UUID): ID de la alerta registrada. **[Obligatorio]**
    *   `product_name` (String): Nombre del producto. **[Opcional]**
    *   `location_name` (String): Nombre de la ubicación. **[Opcional]**
    *   `location_type` (String): Tipo de ubicación. **[Opcional]**
    *   `city` (String): Ciudad geográfica de la ubicación. **[Opcional]**

*   **Ejemplo de JSON:**
```json
{
  "source": "inventory",
  "event_type": "critical_threshold_reached",
  "project_id": "proyecto-09",
  "created_at": "2026-06-30T22:33:00.000Z",
  "payload": {
    "sku_id": "PROD-001",
    "location_id": "b1b0b555-d41d-4e9e-88ef-222a7f5a4400",
    "current_stock": 3,
    "threshold_limite": 5,
    "alert_id": "a999b888-c777-d666-e555-f44444433333",
    "product_name": "Tornillo M8",
    "location_name": "Tienda Norte",
    "location_type": "RETAIL_POINT",
    "city": "Santiago"
  }
}
```

---

## 2. Payloads de Entrada API Externa (Integración Directa)
Solicitudes HTTP REST consumidas por otros dominios directamente desde el módulo de Inventario.

### A. Crear Reserva (`POST /api/v1/external/reservations`)
*   **Campos y tipos de datos**:
    *   `orderId` (String - UUID v4): ID de la orden en el dominio emisor. **[Obligatorio]**
    *   `sku` (String): Código único de stock (normalizado a mayúsculas). **[Obligatorio]**
    *   `quantity` (Number): Cantidad de artículos (entero ≥ 1). **[Obligatorio]**
    *   `locationId` (String - UUID): Ubicación específica. **[Opcional]**
    *   `expiresAt` (String - ISO 8601): Expiración. **[Opcional]** *(Default: 30 minutos)*

*   **Ejemplo de JSON:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "sku": "PROD-001",
  "quantity": 2
}
```

---

### B. Liberar Reserva (`POST /api/v1/external/release-reservation`)
*   **Campos y tipos de datos**:
    *   `reservationId` (Number): ID de la reserva a liberar. **[Obligatorio]**

*   **Ejemplo de JSON:**
```json
{
  "reservationId": 42
}
```

---

### C. Notificar Pago Confirmado (`POST /api/v1/external/payment-confirmed`)
*   **Campos y tipos de datos**:
    *   `reservationId` (Number): ID de la reserva pagada. **[Obligatorio]**
    *   `orderId` (String): ID de la orden asociada. **[Opcional]**

*   **Ejemplo de JSON:**
```json
{
  "reservationId": 42,
  "orderId": "550e8400-e29b-41d4-a716-446655440000"
}
```
