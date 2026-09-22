import { describe, it, expect } from "vitest";
import { calcularDimensiones } from "./imagen-cliente";

describe("calcularDimensiones", () => {
  it("no hace nada si es más chica que el máximo", () => {
    expect(calcularDimensiones(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("achica imágenes anchas respetando el aspect ratio", () => {
    expect(calcularDimensiones(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
  });

  it("achica imágenes altas respetando el aspect ratio", () => {
    expect(calcularDimensiones(1000, 2000, 1600)).toEqual({ width: 800, height: 1600 });
  });

  it("redondea dimensiones a enteros", () => {
    expect(calcularDimensiones(3000, 2000, 1600)).toEqual({ width: 1600, height: 1067 });
  });
});
