import type { Product } from "./product";
import type { Location } from "./location";

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

export type ReplenishmentStatus = "PROPOSED" | "PENDING" | "ORDERED" | "RECEIVED" | "CANCELLED";

export interface ReplenishmentOrder {
  id: string;
  productId: string;
  locationId: string;
  supplierId: string;
  quantity: number;
  status: ReplenishmentStatus;
  createdAt: string;
  updatedAt: string;

  product?: Product;
  location?: Location;
  supplier?: Supplier;
}

export interface CreateReplenishmentDto {
  productId: string;
  locationId: string;
  supplierId: string;
  quantity: number;
}

export interface ReplenishmentSuggestion {
  alertId: string;
  productId: string;
  sku: string;
  productName: string;
  locationId: string;
  locationName: string;
  currentStock: number;
  minStock: number;
  stockDisponible: number;
  suggestedQuantity: number;
  suggestedSupplierId: string | null;
  suggestedSupplierName: string | null;
  reason: string;
}

export interface DemandSimulation {
  sku: string;
  productName: string;
  locationName: string;
  stockDisponible: number;
  avgDailyDemand: number;
  projectedDemandHorizon: number;
  daysUntilStockout: number | null;
  stockoutDate: string | null;
  recommendedOrderQty: number;
  scenario: string;
  horizonDays: number;
}
