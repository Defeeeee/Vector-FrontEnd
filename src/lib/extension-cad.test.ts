import { describe, expect, it } from "vitest";
import { compararVersion, estadoExtension, VERSION_EXTENSION } from "./extension-cad";

describe("compararVersion", () => {
  it("número por número", () => {
    expect(compararVersion("1.10.0", "1.9.2")).toBe(1);
    expect(compararVersion("1.1", "1.1.0")).toBe(0);
    expect(compararVersion("1.0.1", "1.1.0")).toBe(-1);
  });
});

describe("estadoExtension", () => {
  it("sin extensión, sin puente, vieja y al día", () => {
    expect(estadoExtension(null, "1.2.0")).toBe("falta");
    expect(estadoExtension("1.0.1", "1.2.0")).toBe("sin-puente");
    expect(estadoExtension("1.1.0", "1.2.0")).toBe("vieja");
    expect(estadoExtension("1.2.0", "1.2.0")).toBe("al-dia");
  });
  it("la que se baja hoy tiene puente", () => {
    expect(estadoExtension(VERSION_EXTENSION)).toBe("al-dia");
  });
});
