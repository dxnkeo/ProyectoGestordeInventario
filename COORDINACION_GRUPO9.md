# Coordinación integración Inventario (Grupo 5) → Analítica (Grupo 9)

> **Fase 0 — Alineación de contrato**  
> Documento para enviar al equipo Analítica antes de implementar la emisión de eventos.

---

Hola equipo,

Somos el **Grupo 5 (Inventario)**. Revisamos su documento *"Módulo de Inventario — Resumen de Estado y Necesidades"* y queremos alinear algunos puntos **antes de empezar a implementar** lo que nos piden.

Nuestro sistema ya cubre stock, movimientos, alertas y reservas. Lo que nos falta de nuestro lado es **emitir los eventos con datos reales** hacia su `POST /events`. Para hacerlo bien y no rehacer trabajo, necesitamos confirmar lo siguiente:

---

## 1. Conexión técnica

- ¿Cuál es la **URL base** de su API de eventos? (ej. `https://.../events`)
- ¿Requieren **autenticación**? Si sí: ¿header, API key, otro?
- ¿Hay un **entorno de pruebas/staging** donde podamos enviar eventos sin afectar producción?
- ¿Cuál es el **timeout** recomendado y qué hacen si un evento falla? (¿reintentos, cola, o solo log?)

---

## 2. Formato de eventos

Confirmamos que usaremos esta estructura general:

```json
{
  "source": "inventory",
  "event_type": "<tipo>",
  "project_id": "proyecto-09",
  "created_at": "2026-06-10T10:00:00Z",
  "payload": {}
}
```

Necesitamos que nos confirmen o compartan un **esquema por cada `event_type`** que ya aceptan:

| `event_type` |
|---|
| `stock_received` |
| `stock_reserved` |
| `stock_dispatched` |
| `stock_adjusted` |
| `stock_transfer_initiated` |
| `stock_out_error` |
| `critical_threshold_reached` |

En concreto:

- ¿Qué campos son **obligatorios** vs opcionales en cada `payload`?
- ¿Aceptan **campos adicionales** sin romper la validación? (ej. `product_name`, `category`, `unit_price`)
- ¿Los IDs deben ser exactamente `sku_id` y `location_id` como en su ejemplo, o aceptan otros nombres?

---

## 3. Precio unitario (`total_stock_value`)

Para desbloquear `total_stock_value`, podemos entregar `unit_price` de dos formas:

| Opción | Descripción |
|--------|-------------|
| **A** | Incluirlo en los eventos de stock (recomendado por ustedes) |
| **B** | Exponer un catálogo/endpoint con precios y que ustedes lo consulten |

¿Cuál prefieren? Si es la opción A, ¿en qué eventos debe ir `unit_price`? (¿solo entradas, o también reservas/despachos?)

---

## 4. Ciclo de vida de reservas (`reserved_stock`)

Hoy manejamos reservas con estados: `ACTIVE` → `RELEASED` (cancelación) o `SOLD` (pedido completado).

Para que `reserved_stock` deje de ser placeholder, necesitamos saber:

- ¿Con el evento `stock_reserved` basta para **sumar** reservas activas?
- ¿Cómo debemos notificar que una reserva **deja de estar activa**?
  - ¿Existe ya un tipo como `stock_released` / `reservation_cancelled`?
  - ¿O deben agregar uno nuevo en su receptor?
- Al pasar a `SOLD` (despacho), ¿cuentan eso como fin de reserva + `stock_dispatched`, o solo uno de los dos?

**Flujo de ejemplo que queremos validar:**

1. Crear reserva → `stock_reserved` (+5 unidades)
2. Cancelar pedido → ¿qué evento enviamos? (-5 reservadas)
3. Completar pedido → ¿`stock_dispatched` y/o otro evento?

---

## 5. Metadatos de ubicación (`critical_threshold_reached`)

Para enriquecer ubicaciones en su dashboard, podemos incluir en el evento:

- `location_name`
- `location_type`
- `city`

¿Esos nombres de campo les sirven? ¿Necesitan también `address` u otro dato?

¿Prefieren recibir esto **solo en `critical_threshold_reached`**, o también en un catálogo de ubicaciones (`GET /locations/catalog`)?

---

## 6. Catálogo de productos

Para dejar de ver `product_name = sku_id` y `category = "Sin categoría"`, podemos entregar:

| Opción | Descripción |
|--------|-------------|
| **A** | Catálogo vía endpoint nuestro: `sku_id`, `product_name`, `category`, `unit`, `unit_price` |
| **B** | Esos campos en cada evento de stock |
| **C** | Ambos |

¿Cuál les resulta más práctico para su arquitectura actual?

---

## 7. Alcance y prioridades

Según su documento, el orden de prioridad sería:

1. `unit_price` → desbloquea `total_stock_value`
2. Ciclo de reservas → desbloquea `reserved_stock`
3. Metadatos de ubicación en alertas críticas
4. Catálogo de productos

¿Siguen siendo estas las prioridades? ¿Hay alguna fecha límite o demo donde necesiten tener algo funcionando antes?

---

## 8. Validación conjunta

Cuando tengamos el primer entorno conectado, proponemos validar juntos:

- [ ] `GET /inventory/kpis` → `total_stock_value` ≠ 0
- [ ] `GET /inventory/snapshot` → `reserved_stock` correcto tras crear/cancelar reserva
- [ ] `GET /products/thresholds` → nombres y categorías reales
- [ ] `GET /locations/catalog` → `city` y `location_type` poblados

¿Les parece bien una sesión corta de prueba cuando tengamos el emisor de eventos listo?

---

Quedamos atentos a sus respuestas. Con esto cerrado podemos empezar implementación sin ambigüedades.

Saludos,  
**Equipo Inventario — Grupo 5**
