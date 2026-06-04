import type { CreateMovementDto, Movement } from "../types/movement";

const API_BASE = "http://localhost:3000/api/v1";

export const createMovement = async (dto: CreateMovementDto): Promise<Movement> => {
  const response = await fetch(`${API_BASE}/movements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al registrar el movimiento");
  }

  const data = await response.json();
  return data.data;
};

export const getAllMovements = async (): Promise<Movement[]> => {
  const response = await fetch(`${API_BASE}/movements`);

  if (!response.ok) {
    throw new Error("Error al obtener el historial de movimientos");
  }

  const data = await response.json();
  return data.data;
};
