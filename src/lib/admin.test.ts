import { describe, expect, it } from "vitest";
import { diaCorto, haceCuanto, mesCorto, momento, numero, porcentaje } from "./admin";

describe("fechas del panel, en hora argentina", () => {
  it("un alta a las 00:05 UTC del 24 es del 23 a las 21:05", () => {
    expect(momento("2026-09-24T00:05:39.682937+00:00")).toBe("23/09 21:05");
  });

  it("sin fecha no inventa una", () => {
    expect(momento(null)).toBeNull();
    expect(momento("no es una fecha")).toBeNull();
  });

  it("días y meses cortos", () => {
    expect(diaCorto("2026-09-03")).toBe("03/09");
    expect(mesCorto("2026-09")).toBe("sep 26");
    expect(mesCorto("2025-12")).toBe("dic 25");
  });
});

describe("haceCuanto", () => {
  const ahora = "2026-09-24T00:20:00+00:00";
  it("escala de minutos a días", () => {
    expect(haceCuanto("2026-09-24T00:19:30+00:00", ahora)).toBe("recién");
    expect(haceCuanto("2026-09-23T23:55:00+00:00", ahora)).toBe("hace 25 min");
    expect(haceCuanto("2026-09-23T21:00:00+00:00", ahora)).toBe("hace 3 h");
    expect(haceCuanto("2026-09-22T20:00:00+00:00", ahora)).toBe("hace 1 día");
    expect(haceCuanto("2026-09-10T20:00:00+00:00", ahora)).toBe("hace 13 días");
  });

  it("quien nunca volvió a entrar", () => {
    expect(haceCuanto(null, ahora)).toBe("nunca");
  });
});

describe("números", () => {
  it("porcentaje con coma, y un guion si no hay total", () => {
    expect(porcentaje(2, 3)).toBe("66,7 %");
    expect(porcentaje(1, 2)).toBe("50 %");
    expect(porcentaje(0, 0)).toBe("—");
  });

  it("miles con punto y decimales con coma", () => {
    expect(numero(1252)).toBe("1.252");
    expect(numero(150.14, 1)).toBe("150,1");
    expect(numero(9)).toBe("9");
  });
});
