export type MovementType = "IN" | "OUT";

export interface Movement {
  id: string;
  productId: string;
  locationId: string;
  type: MovementType;
  quantity: number;
  note?: string;
  createdAt: string;
}

export interface CreateMovementDto {
  productId: string;
  locationId: string;
  type: MovementType;
  quantity: number;
  note?: string;
}
