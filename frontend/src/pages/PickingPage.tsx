import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBatchPickList, getReadyForDispatchOrders, type BatchPickList } from "../services/pickingService";

export const PickingPage = () => {
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [generateTrigger, setGenerateTrigger] = useState<string[] | null>(null);

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["orders-ready-dispatch"],
    queryFn: getReadyForDispatchOrders,
  });

  const {
    data: pickList,
    isLoading: loadingPick,
    error: pickError,
  } = useQuery<BatchPickList>({
    queryKey: ["pick-list", generateTrigger],
    queryFn: () => getBatchPickList(generateTrigger!),
    enabled: generateTrigger !== null && generateTrigger.length > 0,
  });

  const toggleOrder = (id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerate = () => {
    setGenerateTrigger(Array.from(selectedOrderIds));
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 16px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "24px", color: "#1a237e" }}>Picking por Lotes</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#777" }}>
          Selecciona las órdenes listas para despacho y genera la lista de picking consolidada
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", alignItems: "start" }}>
        {/* Panel izquierdo: selección de órdenes */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", background: "#fff", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", background: "#f9fafb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#374151" }}>
              Órdenes listas ({orders.length})
            </h2>
            {orders.length > 0 && (
              <button
                onClick={() => setSelectedOrderIds(new Set(orders.map((o) => o.id)))}
                style={{ fontSize: "12px", color: "#0ea5e9", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                Seleccionar todas
              </button>
            )}
          </div>

          <div style={{ padding: "8px 0", maxHeight: "400px", overflowY: "auto" }}>
            {loadingOrders && (
              <p style={{ textAlign: "center", color: "#9ca3af", padding: "20px", fontSize: "13px" }}>Cargando órdenes...</p>
            )}
            {!loadingOrders && orders.length === 0 && (
              <p style={{ textAlign: "center", color: "#9ca3af", padding: "20px", fontSize: "13px" }}>
                No hay órdenes listas para despacho.
              </p>
            )}
            {orders.map((order) => {
              const selected = selectedOrderIds.has(order.id);
              return (
                <label
                  key={order.id}
                  htmlFor={`order-${order.id}`}
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", cursor: "pointer", background: selected ? "#eff6ff" : "transparent", borderBottom: "1px solid #f3f4f6" }}
                >
                  <input
                    id={`order-${order.id}`}
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleOrder(order.id)}
                    style={{ width: "15px", height: "15px", cursor: "pointer" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1f2937" }}>{order.customerName}</div>
                    <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                      {order.items.length} ítem(s) · {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6" }}>
            <button
              onClick={handleGenerate}
              disabled={selectedOrderIds.size === 0 || loadingPick}
              style={{
                width: "100%", padding: "10px", fontWeight: 700, fontSize: "13px",
                background: selectedOrderIds.size === 0 ? "#e5e7eb" : "#1976d2",
                color: selectedOrderIds.size === 0 ? "#9ca3af" : "#fff",
                border: "none", borderRadius: "7px",
                cursor: selectedOrderIds.size === 0 ? "not-allowed" : "pointer",
              }}
              aria-label="Generar lista de picking"
            >
              {loadingPick ? "Generando..." : `Generar lista (${selectedOrderIds.size} sel.)`}
            </button>
          </div>
        </div>

        {/* Panel derecho: lista de picking */}
        <div>
          {!pickList && !loadingPick && !pickError && (
            <div style={{ textAlign: "center", padding: "60px", background: "#f9fafb", borderRadius: "12px", border: "1px dashed #d1d5db" }}>
              <div style={{ fontSize: "2.5rem" }}>📋</div>
              <p style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: "12px" }}>
                Selecciona órdenes y haz clic en "Generar lista"
              </p>
            </div>
          )}

          {pickError && (
            <div role="alert" style={{ padding: "12px 16px", background: "#fff0f0", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "8px" }}>
              {(pickError as Error).message}
            </div>
          )}

          {pickList && (
            <>
              {/* Summary */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
                {[
                  { label: "Órdenes válidas", value: pickList.validOrders },
                  { label: "Ubicaciones",     value: pickList.groups.length },
                  { label: "Unidades totales", value: pickList.totalUnits },
                ].map((s) => (
                  <div key={s.label} style={{ padding: "14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "#1976d2" }}>{s.value}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {pickList.skippedOrders.length > 0 && (
                <div style={{ padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "12px", color: "#92400e", marginBottom: "12px" }}>
                  Órdenes omitidas (no están en READY_FOR_DISPATCH): {pickList.skippedOrders.join(", ")}
                </div>
              )}

              {/* Picking groups */}
              {pickList.groups.map((group) => (
                <div key={group.location.id} style={{ marginBottom: "12px", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden", background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f1f5f9", borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "18px" }}>📦</span>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>{group.location.name}</span>
                        <span style={{ marginLeft: "8px", fontSize: "11px", color: "#64748b" }}>{group.location.type} · P{group.location.priority}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: "12px", color: "#0ea5e9", fontWeight: 700, background: "#e0f2fe", padding: "3px 10px", borderRadius: "20px" }}>
                      {group.totalUnits} uds
                    </span>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={{ textAlign: "left", padding: "8px 16px", color: "#374151", fontWeight: 600 }}>Producto</th>
                        <th style={{ textAlign: "left", padding: "8px 16px", color: "#374151", fontWeight: 600 }}>SKU</th>
                        <th style={{ textAlign: "right", padding: "8px 16px", color: "#374151", fontWeight: 600 }}>Total</th>
                        <th style={{ textAlign: "left", padding: "8px 16px", color: "#374151", fontWeight: 600 }}>Por orden</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => (
                        <tr key={item.productId} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "10px 16px", color: "#111827", fontWeight: 500 }}>{item.productName}</td>
                          <td style={{ padding: "10px 16px", color: "#6b7280" }}>{item.sku}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: "#0ea5e9" }}>{item.totalQuantity}</td>
                          <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: "11px" }}>
                            {item.orders.map((o) => `#${o.orderId.slice(-6)}(${o.quantity})`).join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
