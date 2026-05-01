import type { Product } from "../types/product";

const API_BASE = "http://localhost:3000/api/v1";

export const getAllProducts = async (): Promise<Product[]> => {
  const response = await fetch(`${API_BASE}/products`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Error al obtener productos");
  }

  const data = await response.json();
  return data.data;
};
