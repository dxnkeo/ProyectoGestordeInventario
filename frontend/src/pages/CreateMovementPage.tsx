import { MovementForm } from "../components/MovementForm";

export const CreateMovementPage = () => {
  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>Registrar Movimiento de Stock</h1>
      <MovementForm />
    </div>
  );
};
