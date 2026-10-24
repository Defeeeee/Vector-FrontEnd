import { describe, expect, it } from "vitest";
import { aerodromoCercano, colorPorAltura, hhmmArgentina, hhmmUtc, puedeHaberDetectados } from "./recorrido";

describe("el recorrido ADS-B", () => {
  it("el despegue se redondea para abajo y el aterrizaje para arriba", () => {
    expect(hhmmUtc("2026-10-24T19:27:01+00:00", "abajo")).toBe("19:27");
    expect(hhmmUtc("2026-10-24T20:16:24+00:00", "arriba")).toBe("20:17");
    expect(hhmmUtc("2026-10-24T20:16:00+00:00", "arriba")).toBe("20:16");
    expect(hhmmUtc("basura")).toBe("");
  });

  it("la hora argentina es UTC−3", () => {
    expect(hhmmArgentina("2026-10-24T19:27:01+00:00")).toBe("16:27");
    expect(hhmmArgentina("2026-10-24T01:10:00+00:00")).toBe("22:10");
  });

  it("el aeródromo de una punta: el más cercano a menos de 4 km", () => {
    const lista = [
      { icao: "SADF", lat: -34.4532, lon: -58.5896 },
      { icao: "SADM", lat: -34.6763, lon: -58.6428 },
      { icao: "SIN", lat: null, lon: null },
    ];
    expect(aerodromoCercano([-34.45418, -58.59048], lista)).toBe("SADF");
    expect(aerodromoCercano([-34.5, -58.96], lista)).toBeNull();
  });

  it("el color va de ámbar abajo a casi blanco arriba", () => {
    expect(colorPorAltura(0, 1100)).toBe("rgb(245,158,11)");
    expect(colorPorAltura(1100, 1100)).toBe("rgb(224,242,254)");
    expect(colorPorAltura(null, 1100)).toBe("rgb(245,158,11)");
    expect(colorPorAltura(1100, 1100, "claro")).toBe("rgb(67,56,202)");
  });

  it("sólo se pregunta por fechas desde que graba y de los últimos 30 días", () => {
    expect(puedeHaberDetectados("2026-10-24", "2026-10-24")).toBe(true);
    expect(puedeHaberDetectados("2026-10-20", "2026-10-24")).toBe(false);
    expect(puedeHaberDetectados("2026-10-25", "2026-10-24")).toBe(false);
    expect(puedeHaberDetectados("2026-12-01", "2027-01-15")).toBe(false);
    expect(puedeHaberDetectados("24/10", "2026-10-24")).toBe(false);
  });
});
