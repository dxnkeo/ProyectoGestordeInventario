import { Routes, Route } from "react-router-dom";
import { CreateLocationPage } from "../pages/CreateLocationPage";
import { CreateMovementPage } from "../pages/CreateMovementPage";
 
export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<h1 style={{ textAlign: "center" }}>Proyecto Inventario</h1>} />
      <Route path="/RegistrarUbicaciones" element={<CreateLocationPage />} />
      <Route path="/RegistrarMovimientos" element={<CreateMovementPage />} />
    </Routes>
  );
};
