import { describe, expect, it } from "vitest";
import { estadoHitos } from "./hitos";

describe("estadoHitos", () => {
  it("una cuenta nueva va hacia las 50 horas", () => {
    expect(estadoHitos(0)).toEqual({ alcanzados: [], proximo: 50, faltan: 50, avance: 0 });
  });

  it("mide el avance desde el hito anterior, no desde cero", () => {
    const e = estadoHitos(125);
    expect(e.alcanzados).toEqual([50, 100]);
    expect(e.proximo).toBe(150);
    expect(e.faltan).toBe(25);
    expect(e.avance).toBeCloseTo(0.5);
  });

  it("justo en un hito, ese cuenta como alcanzado", () => {
    expect(estadoHitos(200).alcanzados).toContain(200);
    expect(estadoHitos(200).proximo).toBe(250);
  });

  it("redondea lo que falta a un decimal", () => {
    expect(estadoHitos(32.04).faltan).toBe(18);
  });

  it("pasadas las mil horas no hay próximo", () => {
    expect(estadoHitos(1200)).toMatchObject({ proximo: null, faltan: null, avance: 1 });
  });

  it("un valor raro cuenta como cero", () => {
    expect(estadoHitos(Number.NaN).proximo).toBe(50);
    expect(estadoHitos(-5).alcanzados).toEqual([]);
  });
});
