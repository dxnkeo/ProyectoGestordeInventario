import { Routes, Route } from "react-router-dom";
import { StockPage } from "../pages/StockPage";
import { MovementsHistoryPage } from "../pages/MovementsHistoryPage";
import { CreateLocationPage } from "../pages/CreateLocationPage";
import { CreateMovementPage } from "../pages/CreateMovementPage";
import { ReservationsPage } from "../pages/ReservationsPage";
import { StockUbicationPage } from "../pages/StockUbicationPage";
import { DispachPage } from "../pages/DispatchPage";
import { TransferPage } from "../pages/TransferPage";
import { AlertsPage } from "../pages/AlertsPage";
import { SyncPage } from "../pages/SyncPage";
import { PickingPage } from "../pages/PickingPage";

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<StockPage />} />
      <Route path="/Stock" element={<StockPage />} />
      <Route path="/HistorialMovimientos" element={<MovementsHistoryPage />} />
      <Route path="/RegistrarUbicaciones" element={<CreateLocationPage />} />
      <Route path="/RegistrarMovimientos" element={<CreateMovementPage />} />
      <Route path="/Reservas" element={<ReservationsPage />} />
      <Route path="/StockUbicaciones" element={<StockUbicationPage />} />
      <Route path="/Despacho" element={<DispachPage />} />
      <Route path="/Transferir" element={<TransferPage />} />
      <Route path="/Alertas" element={<AlertsPage />} />
      <Route path="/Sincronizacion" element={<SyncPage />} />
      <Route path="/Picking" element={<PickingPage />} />
    </Routes>
  );
};
