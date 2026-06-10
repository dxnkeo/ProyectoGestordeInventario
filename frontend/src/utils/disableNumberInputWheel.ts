/** Evita que la rueda del mouse cambie valores en inputs type="number". */
export function setupDisableNumberInputWheel(): void {
  document.addEventListener(
    "wheel",
    (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === "number") {
        event.preventDefault();
      }
    },
    { passive: false, capture: true }
  );
}
