import { API_BASE } from "../config/apiConfig";

export type EventStatus = "PENDING" | "SENT" | "FAILED" | "DEAD";

export interface OutboundEvent {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: EventStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  createdAt: string;
  sentAt?: string | null;
}

export const getOutboundEvents = async (status?: EventStatus): Promise<OutboundEvent[]> => {
  const qs = status ? `?status=${status}` : "";
  const res = await fetch(`${API_BASE}/events/outbox${qs}`);
  if (!res.ok) throw new Error("Error al obtener eventos outbox.");
  return (await res.json()).data;
};

export const retryOutboundEvent = async (id: string): Promise<OutboundEvent> => {
  const res = await fetch(`${API_BASE}/events/outbox/${id}/retry`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al reintentar evento.");
  }
  return (await res.json()).data;
};
