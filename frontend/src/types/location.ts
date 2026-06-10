export interface Location {
  id: string;
  name: string;
  type: string;
  capacity?: number;
  priority: number;
  createdAt: string;
  stocks?: { 
    quantity: number; 
    productId: string; 
    product?: { id: string; name: string; sku: string }; 
  }[];
}

export interface CreateLocationDto {
  name: string;
  type: string;
  capacity?: number;
  priority?: number;
}

export type LocationType = "bodega" | "tienda" | "almacen" | "deposito" | "otro";
