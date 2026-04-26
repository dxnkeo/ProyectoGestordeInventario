// Tipos para Location
export interface Location {
  id: string;
  name: string;
  type: string;
  capacity?: number;
  createdAt: string;
}

export interface CreateLocationDto {
  name: string;
  type: string;
  capacity?: number;
}

export type LocationType = "bodega" | "tienda" | "almacen" | "deposito" | "otro";
