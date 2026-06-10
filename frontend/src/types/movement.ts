export type MovementType = "IN" | "OUT" | "TRANSFER" | "RETURN";

export interface Movement {
  id: string;
  productId: string;
  locationId: string;
  type: MovementType;
  quantity: number;
  note?: string;
  reservationId?: number | null;
  createdAt: string;
  // Campos enriquecidos presentes en GET /movements
  product?: { id: string; name: string; sku: string };
  location?: { id: string; name: string; type: string };
}

export interface CreateMovementDto {
  productId: string;
  locationId: string;
  type: MovementType;
  quantity: number;
  note?: string;
}
