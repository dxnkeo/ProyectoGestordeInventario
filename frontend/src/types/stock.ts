export interface StockItem {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  reserved: number;
  stockDisponible: number;
  product: {
    id: string;
    name: string;
    sku: string;
    minStock?: number;
  };
  location: {
    id: string;
    name: string;
    type: string;
  };
}
