import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStockBalance,
  executeSyncTransfer,
  type ProductBalance,
  type BalanceStatus,
  type SuggestedTransfer,
} from "../services/syncService";
import { useToast } from "../hooks/useToast";

const STATUS_CONFIG: Record<BalanceStatus, { label: string; color: string; bg: string; dot: string }> = {
  EXCESS:  { label: "Exceso",   color: "#92400e", bg: "#fffbeb", dot: "#f59e0b" },
  DEFICIT: { label: "Déficit",  color: "#991b1b", bg: "#fff1f2", dot: "#f43f5e" },
  OK:      { label: "OK",       color: "#15803d", bg: "#f0fdf4", dot: "#22c55e" },
};

export const SyncPage = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const { data: balance = [], isLoading, error, refetch } = useQuery<ProductBalance[]>({
    queryKey: ["sync-balance"],
    queryFn: getStockBalance,
  });

  const transferMutation = useMutation({
    mutationFn: executeSyncTransfer,
    onSuccess: () => {
      showToast("Transferencia de sincronización ejecutada exitosamente.", "success");
      queryClient.invalidateQueries({ queryKey: ["sync-balance"] });
    },
    onError: (err: Error) => {
      showToast(err.message || "Error al ejecutar la transferencia.", "error");
    },
  });

  const handleTransfer = (productId: string, t: SuggestedTransfer) => {
    transferMutation.mutate({
      productId,
      sourceLocationId: t.fromLocationId,
      destinationLocationId: t.toLocationId,
      quantity: t.quantity,
    });
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 16px 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", color: "#1a237e" }}>
            Sincronización entre Almacenes
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#777" }}>
            Detecta desequilibrios de stock y ejecuta transferencias de balanceo
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          style={{ padding: "8px 20px", backgroundColor: isLoading ? "#ccc" : "#1976d2", color: "white", border: "none", borderRadius: "6px", cursor: isLoading ? "not-allowed" : "pointer", fontWeight: 500 }}
        >
          Actualizar análisis
        </button>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" style={{ padding: "12px 16px", background: "#fff0f0", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "16px" }}>
          {(error as Error).message}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "60px", color: "#888" }}>
          Analizando balance de stock...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && balance.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", background: "#f9fafb", borderRadius: "12px", border: "1px dashed #d1d5db" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>✅</div>
          <h3 style={{ color: "#374151", margin: "0 0 8px" }}>Stock balanceado</h3>
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>No se detectaron desequilibrios entre almacenes.</p>
        </div>
      )}

      {/* Product cards */}
      {balance.map((prod) => {
        const isExpanded = expandedProduct === prod.productId;
        const deficitCount = prod.locations.filter((l) => l.status === "DEFICIT").length;
        const excessCount  = prod.locations.filter((l) => l.status === "EXCESS").length;

        return (
          <div key={prod.productId} style={{ marginBottom: "16px", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden", background: "#fff" }}>
            {/* Product header */}
            <button
              onClick={() => setExpandedProduct(isExpanded ? null : prod.productId)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              aria-expanded={isExpanded}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "#111827" }}>{prod.productName}</span>
                  <span style={{ fontSize: "12px", color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: "20px" }}>SKU: {prod.sku}</span>
                  {deficitCount > 0 && (
                    <span style={{ fontSize: "12px", color: "#991b1b", background: "#fff1f2", padding: "2px 8px", borderRadius: "20px", fontWeight: 600 }}>
                      {deficitCount} déficit
                    </span>
                  )}
                  {excessCount > 0 && (
                    <span style={{ fontSize: "12px", color: "#92400e", background: "#fffbeb", padding: "2px 8px", borderRadius: "20px", fontWeight: 600 }}>
                      {excessCount} exceso
                    </span>
                  )}
                </div>
                <div style={{ marginTop: "4px", fontSize: "12px", color: "#9ca3af" }}>
                  Stock total: {prod.totalStock} uds · Promedio por ubicación: {prod.averagePerLocation} uds · Min: {prod.minStock} uds
                </div>
              </div>
              <span style={{ color: "#9ca3af", fontSize: "18px" }}>{isExpanded ? "▲" : "▼"}</span>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div style={{ padding: "0 20px 20px" }}>
                {/* Locations grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px", marginBottom: "16px" }}>
                  {prod.locations.map((loc) => {
                    const cfg = STATUS_CONFIG[loc.status];
                    return (
                      <div key={loc.locationId} style={{ padding: "12px", background: cfg.bg, border: `1px solid ${cfg.dot}30`, borderRadius: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontWeight: 600, fontSize: "13px", color: "#111827" }}>{loc.locationName}</span>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: cfg.color, background: "#fff", padding: "2px 8px", borderRadius: "20px" }}>
                            {cfg.label}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.6" }}>
                          <div>Físico: <b>{loc.quantity}</b> · Reservado: <b>{loc.reserved}</b></div>
                          <div>Disponible: <b>{loc.stockDisponible}</b></div>
                          <div>Promedio: <b>{loc.average}</b> · P<b>{loc.priority}</b></div>
                          {loc.suggestedTransferQty > 0 && (
                            <div style={{ marginTop: "4px", color: cfg.color, fontWeight: 600 }}>
                              {loc.status === "EXCESS" ? `Excedente: ${loc.suggestedTransferQty} uds` : `Faltan: ${loc.suggestedTransferQty} uds`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Suggested transfers */}
                {prod.suggestedTransfers.length > 0 && (
                  <div>
                    <h4 style={{ margin: "0 0 10px", fontSize: "13px", color: "#374151", fontWeight: 700 }}>
                      Transferencias sugeridas
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {prod.suggestedTransfers.map((t, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", flexWrap: "wrap" }}>
                          <div style={{ flex: 1, fontSize: "13px", color: "#374151" }}>
                            <span style={{ fontWeight: 600 }}>{t.fromLocationName}</span>
                            <span style={{ color: "#94a3b8", margin: "0 8px" }}>→</span>
                            <span style={{ fontWeight: 600 }}>{t.toLocationName}</span>
                            <span style={{ color: "#64748b", marginLeft: "8px" }}>({t.quantity} uds)</span>
                          </div>
                          <button
                            onClick={() => handleTransfer(prod.productId, t)}
                            disabled={transferMutation.isPending}
                            style={{ padding: "6px 16px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: "6px", cursor: transferMutation.isPending ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}
                            aria-busy={transferMutation.isPending}
                          >
                            {transferMutation.isPending ? "Ejecutando..." : "Ejecutar"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {prod.suggestedTransfers.length === 0 && (
                  <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>
                    No hay transferencias sugeridas (sin ubicaciones con stock disponible para redistribuir).
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
