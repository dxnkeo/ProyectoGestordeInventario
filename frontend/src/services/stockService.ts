import type { StockItem } from "../types/stock";

const API_BASE = "http://localhost:3000/api/v1";

export const getAllStock = async (): Promise<StockItem[]> => {
  const response = await fetch(`${API_BASE}/stock`);

  if (!response.ok) {
    throw new Error("Error al obtener el stock");
  }

  const data = await response.json();
  return data.data;
};

export const getStockByLocation = async (
  locationId: string
): Promise<{ location: { id: string; name: string; type: string }; stocks: StockItem[] }> => {
  const response = await fetch(`${API_BASE}/stock/${locationId}`);

  if (!response.ok) {
    throw new Error("Error al obtener el stock de la ubicación");
  }

  const data = await response.json();
  return data.data;
};
