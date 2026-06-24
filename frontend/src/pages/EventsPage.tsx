import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOutboundEvents, retryOutboundEvent, type EventStatus } from "../services/eventService";
import { useToast } from "../hooks/useToast";

const STATUS_FILTER: Array<EventStatus | "ALL"> = ["ALL", "PENDING", "FAILED", "DEAD", "SENT"];

export const EventsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<EventStatus | "ALL">("ALL");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["outbox", filter],
    queryFn: () => getOutboundEvents(filter === "ALL" ? undefined : filter),
    refetchInterval: 30_000,
  });

  const retryMutation = useMutation({
    mutationFn: retryOutboundEvent,
    onSuccess: () => {
      showToast("Evento reencolado.", "success");
      queryClient.invalidateQueries({ queryKey: ["outbox"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  return (
    <div className="page" style={{ padding: "20px" }}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
          📡 Cola de Eventos (Outbox)
        </h1>
        <p style={{ color: "#666", fontSize: "0.9rem" }}>
          Sincronización con Analítica (Grupo 9) — reintentos automáticos ante caídas de red
        </p>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {STATUS_FILTER.map((s) => (
          <button
            key={s}
            type="button"
            className="btn btn-secondary"
            style={{
              fontSize: "0.8rem",
              background: filter === s ? "var(--color-teal)" : "#f3f4f6",
              color: filter === s ? "#fff" : "#333",
            }}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflowX: "auto", padding: 0 }}>
        {isLoading ? (
          <p style={{ padding: "24px", color: "#888" }}>Cargando eventos...</p>
        ) : events.length === 0 ? (
          <p style={{ padding: "24px", color: "#666" }}>No hay eventos en la cola.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Tipo</th>
                <th style={{ padding: "12px" }}>Estado</th>
                <th style={{ padding: "12px" }}>Intentos</th>
                <th style={{ padding: "12px" }}>Error</th>
                <th style={{ padding: "12px" }}>Creado</th>
                <th style={{ padding: "12px" }}></th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: "1px solid #edf2f7" }}>
                  <td style={{ padding: "12px", fontFamily: "monospace" }}>{ev.eventType}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>{ev.status}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>{ev.attempts}/{ev.maxAttempts}</td>
                  <td style={{ padding: "12px", color: "#b91c1c", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ev.lastError ?? "—"}
                  </td>
                  <td style={{ padding: "12px" }}>{new Date(ev.createdAt).toLocaleString()}</td>
                  <td style={{ padding: "12px" }}>
                    {(ev.status === "FAILED" || ev.status === "DEAD") && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                        onClick={() => retryMutation.mutate(ev.id)}
                        disabled={retryMutation.isPending}
                      >
                        Reintentar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
