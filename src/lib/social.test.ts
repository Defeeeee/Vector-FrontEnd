import { describe, expect, it } from "vitest";
import { iniciales, mensajeDeErrorApi } from "./social";

describe("mensajeDeErrorApi", () => {
  it("usa el detail de un error propio del backend", () => {
    expect(mensajeDeErrorApi({ detail: "Ese @ ya lo tiene otro piloto.", extra: null }, "x")).toBe(
      "Ese @ ya lo tiene otro piloto."
    );
  });

  it("en un 400 de validación saca el motivo de extra, sin el prefijo de Pydantic", () => {
    const cuerpo = {
      detail: "Validation failed for PUT /api/perfil-publico",
      extra: [{ message: "Value error, El @ tiene que tener al menos 3 caracteres.", key: "handle", source: "body" }],
    };
    expect(mensajeDeErrorApi(cuerpo, "x")).toBe("El @ tiene que tener al menos 3 caracteres.");
  });

  it("no muestra el detail genérico de validación si no hay motivo", () => {
    expect(mensajeDeErrorApi({ detail: "Validation failed for PUT /api/x", extra: [] }, "No se pudo guardar.")).toBe(
      "No se pudo guardar."
    );
  });

  it("cae al texto por defecto con cualquier otra cosa", () => {
    expect(mensajeDeErrorApi(null, "No se pudo.")).toBe("No se pudo.");
    expect(mensajeDeErrorApi("texto", "No se pudo.")).toBe("No se pudo.");
    expect(mensajeDeErrorApi({}, "No se pudo.")).toBe("No se pudo.");
  });
});

describe("iniciales", () => {
  it("toma la primera y la última palabra", () => {
    expect(iniciales("Federico Díaz Nemeth")).toBe("FN");
    expect(iniciales("lucía")).toBe("L");
    expect(iniciales("   ")).toBe("?");
  });
});
