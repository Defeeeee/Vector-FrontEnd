import { describe, expect, it } from "vitest";
import { distanceNm, legDistanceNm } from "./distance";

/**
 * Los aeródromos y sus coordenadas salen de `madhel.tsv`. Los valores esperados
 * se contrastaron contra distancias publicadas: sirven para detectar que alguien
 * rompió la fórmula, no para navegar.
 */
describe("distanceNm", () => {
  const SADF = { lat: -34.4545, lon: -58.5909 }; // San Fernando
  const SAEZ = { lat: -34.8222, lon: -58.5358 }; // Ezeiza
  const SAZS = { lat: -41.1512, lon: -71.1575 }; // Bariloche

  it("mide un salto corto del área metropolitana", () => {
    // ~41 km en línea recta
    expect(distanceNm(SADF.lat, SADF.lon, SAEZ.lat, SAEZ.lon)).toBeGreaterThan(15);
    expect(distanceNm(SADF.lat, SADF.lon, SAEZ.lat, SAEZ.lon)).toBeLessThan(30);
  });

  it("mide una travesía larga", () => {
    const d = distanceNm(SADF.lat, SADF.lon, SAZS.lat, SAZS.lon);
    expect(d).toBeGreaterThan(700);
    expect(d).toBeLessThan(900);
  });

  it("da cero entre un punto y sí mismo", () => {
    expect(distanceNm(SADF.lat, SADF.lon, SADF.lat, SADF.lon)).toBe(0);
  });

  it("es simétrica", () => {
    expect(distanceNm(SADF.lat, SADF.lon, SAZS.lat, SAZS.lon)).toBe(
      distanceNm(SAZS.lat, SAZS.lon, SADF.lat, SADF.lon)
    );
  });
});

describe("legDistanceNm", () => {
  const conCoords = { lat: -34.4545, lon: -58.5909 };

  it("mide cuando los dos extremos tienen posición", () => {
    expect(legDistanceNm(conCoords, { lat: -34.8222, lon: -58.5358 })).toBeGreaterThan(0);
  });

  /**
   * Null y no cero: un cero se confundiría con un circuito local, que es
   * justamente la distinción que esto viene a informar.
   */
  it("devuelve null cuando falta una coordenada, no cero", () => {
    expect(legDistanceNm(conCoords, { lat: undefined, lon: undefined })).toBeNull();
    expect(legDistanceNm(conCoords, {})).toBeNull();
    expect(legDistanceNm(null, conCoords)).toBeNull();
    expect(legDistanceNm(conCoords, null)).toBeNull();
  });
});
