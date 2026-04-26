import { LocationForm } from "../components/LocationForm";

export const CreateLocationPage = () => {
  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>Registrar Nueva Ubicación</h1>
      <LocationForm />
    </div>
  );
};
