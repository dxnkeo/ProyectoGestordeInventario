import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReconciliationReport,
  exportReconciliationCsv,
  createPhysicalCount,
  regularizeDifference,
  type ReconciliationRow,
} from "../services/reconciliationService";
import { getAllLocations } from "../services/locationService";
import { useToast } from "../hooks/useToast";

const currentPeriod = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const estadoColor = (estado: ReconciliationRow["estado"]) => {
  switch (estado) {
    case "OK": return { bg: "#d1fae5", color: "#065f46" };
    case "SOBRANTE": return { bg: "#dbeafe", color: "#1e40af" };
    case "FALTANTE": return { bg: "#fee2e2", color: "#991b1b" };
    default: return { bg: "#f3f4f6", color: "#374151" };
  }
};

export const ReconciliationPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(currentPeriod());
  const [sku, setSku] = useState("");
  const [locationId, setLocationId] = useState("");
  const [countedQty, setCountedQty] = useState(0);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["reconciliation", period],
    queryFn: () => getReconciliationReport(period),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getAllLocations,
  });

  const countMutation = useMutation({
    mutationFn: createPhysicalCount,
    onSuccess: () => {
      showToast("Conteo físico registrado.", "success");
      setSku("");
      setCountedQty(0);
      queryClient.invalidateQueries({ queryKey: ["reconciliation", period] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const regularizeMutation = useMutation({
    mutationFn: regularizeDifference,
    onSuccess: (data) => {
      showToast(data.adjusted ? "Diferencia regularizada con movimiento de ajuste." : data.message, "success");
      queryClient.invalidateQueries({ queryKey: ["reconciliation", period] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const handleCountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !locationId) {
      showToast("SKU y ubicación son requeridos.", "warning");
      return;
    }
    countMutation.mutate({ sku, locationId, countedQty, period });
  };

  return (
    <div className="page" style={{ padding: "20px" }}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
          📋 Conciliación de Inventario
        </h1>
        <p style={{ color: "#666", fontSize: "0.9rem" }}>
          Compara stock lógico (sistema) vs conteo físico para auditorías mensuales
        </p>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
        <label>
          Periodo:{" "}
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="form-input"
            style={{ width: "160px" }}
          />
        </label>
        <button type="button" className="btn btn-secondary" onClick={() => exportReconciliationCsv(period)}>
          ⬇ Exportar CSV
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", alignItems: "start" }}>
        <div className="card">
          <h2 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "12px" }}>Registrar conteo físico</h2>
          <form onSubmit={handleCountSubmit}>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input className="form-input" value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder="PROD-001" required />
            </div>
            <div className="form-group">
              <label className="form-label">Ubicación</label>
              <select className="form-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
                <option value="">Seleccionar...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cantidad contada</label>
              <input type="number" min={0} className="form-input" value={countedQty} onChange={(e) => setCountedQty(parseInt(e.target.value, 10) || 0)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={countMutation.isPending} style={{ width: "100%" }}>
              Guardar conteo
            </button>
          </form>
        </div>

        <div className="card" style={{ overflowX: "auto", padding: 0 }}>
          {isLoading ? (
            <p style={{ padding: "24px", color: "#888" }}>Cargando reporte...</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px", textAlign: "left" }}>SKU</th>
                  <th style={{ padding: "12px" }}>Ubicación</th>
                  <th style={{ padding: "12px" }}>Lógico</th>
                  <th style={{ padding: "12px" }}>Físico</th>
                  <th style={{ padding: "12px" }}>Diff</th>
                  <th style={{ padding: "12px" }}>Estado</th>
                  <th style={{ padding: "12px" }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const c = estadoColor(r.estado);
                  return (
                    <tr key={`${r.productId}-${r.locationId}`} style={{ borderBottom: "1px solid #edf2f7" }}>
                      <td style={{ padding: "12px" }}><strong>{r.sku}</strong></td>
                      <td style={{ padding: "12px" }}>{r.locationName}</td>
                      <td style={{ padding: "12px", textAlign: "center" }}>{r.stockLogico}</td>
                      <td style={{ padding: "12px", textAlign: "center" }}>{r.stockFisico ?? "—"}</td>
                      <td style={{ padding: "12px", textAlign: "center" }}>{r.diferencia ?? "—"}</td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: "bold", background: c.bg, color: c.color }}>
                          {r.estado}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        {(r.estado === "SOBRANTE" || r.estado === "FALTANTE") && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                            disabled={regularizeMutation.isPending}
                            onClick={() => regularizeMutation.mutate({ productId: r.productId, locationId: r.locationId, period })}
                          >
                            Regularizar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
