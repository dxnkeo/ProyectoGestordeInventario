import { API_BASE } from "../config/apiConfig";

export type ReconciliationStatus = "OK" | "SOBRANTE" | "FALTANTE" | "SIN_CONTEO";

export interface ReconciliationRow {
  productId: string;
  sku: string;
  productName: string;
  locationId: string;
  locationName: string;
  period: string;
  stockLogico: number;
  reservado: number;
  stockDisponible: number;
  stockFisico: number | null;
  diferencia: number | null;
  estado: ReconciliationStatus;
}

export const getReconciliationReport = async (period: string): Promise<ReconciliationRow[]> => {
  const res = await fetch(`${API_BASE}/reports/reconciliation?period=${encodeURIComponent(period)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al obtener reporte de conciliación.");
  }
  const data = await res.json();
  return data.data;
};

export const exportReconciliationCsv = (period: string): void => {
  window.open(`${API_BASE}/reports/reconciliation/export?period=${encodeURIComponent(period)}`, "_blank");
};

export const createPhysicalCount = async (dto: {
  sku: string;
  locationId: string;
  countedQty: number;
  period: string;
  countedBy?: string;
  note?: string;
}) => {
  const res = await fetch(`${API_BASE}/reports/physical-counts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al registrar conteo físico.");
  }
  return (await res.json()).data;
};

export const regularizeDifference = async (dto: {
  productId: string;
  locationId: string;
  period: string;
}) => {
  const res = await fetch(`${API_BASE}/reports/reconciliation/regularize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al regularizar diferencia.");
  }
  return (await res.json()).data;
};
