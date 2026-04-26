import { BrowserRouter, Link } from "react-router-dom";
import { AppRouter } from "./routes";

function App() {
  return (
    <BrowserRouter>
      <div>
        <nav style={{ padding: "10px", background: "#f0f0f0", marginBottom: "20px" }}>
          <Link to="/" style={{ marginRight: "10px" }}>Inicio</Link>
          <Link to="/RegistrarUbicaciones" style={{ marginRight: "10px" }}>Registrar Ubicaciones</Link>
          <Link to="/RegistrarMovimientos">Registrar Movimientos</Link>
        </nav>
        
        <AppRouter />
      </div>
    </BrowserRouter>
  );
}

export default App;
