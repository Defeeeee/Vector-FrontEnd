import { describe, expect, it } from "vitest";
import { allAerovias, puntosDeAerovia } from "./aerovias";
import { expandirAerovias, esAerovia } from "./ruta-planificada";
import { getFix } from "./fixes";
import { getRadioayuda } from "./radioayudas";

/**
 * Contra el archivo de verdad, por el mismo motivo que `fixes.test.ts` y
 * `radioayudas.test.ts`: lo que puede romperse no es la lógica —que se testea aparte con
 * tablas inventadas— sino el dato. Y acá el dato malo es peor que en los otros dos: una
 * aerovía a la que le falta un punto **no falla**, expande una travesía más corta que la
 * real y con pinta de válida.
 */

describe("el catálogo de aerovías", () => {
  const todas = allAerovias();

  it("publica 220 de las 258 que nombra el AIP", () => {
    /*
      Las otras 38 no pasaron la validación cruzada de `build-aerovias.mjs` y **es a
      propósito que no resuelvan**. Este número baja si ANAC publica mejor o si el parser
      mejora; que suba sin que nadie toque el generador sería la señal de que se relajó la
      validación.
    */
    expect(todas.length).toBe(220);
  });

  it("W67 pasa por donde dice el AIP", () => {
    expect(puntosDeAerovia("W67")).toEqual(["BCA", "AKNOS", "OGLER", "OSA"]);
  });

  it("el designador se normaliza y el que no existe da null", () => {
    expect(puntosDeAerovia("w67")).toEqual(["BCA", "AKNOS", "OGLER", "OSA"]);
    expect(puntosDeAerovia("  w67 ")).not.toBeNull();
    expect(puntosDeAerovia("ZZ999")).toBeNull();
    expect(puntosDeAerovia("")).toBeNull();
  });

  it("todas tienen al menos dos puntos", () => {
    // Con uno no hay tramo que expandir y no habría forma de entrar y salir.
    for (const a of todas) expect(a.puntos.length, a.designador).toBeGreaterThanOrEqual(2);
  });

  it("**todos los puntos de todas las aerovías resuelven**", () => {
    /*
      El test que hace publicable a la feature. Un punto que no resuelve rompe la planilla
      entera —`puntosCalculables` devuelve `null` y el plan no se calcula—, así que una
      aerovía con un punto fantasma convierte una ruta válida en una pantalla que dice "no
      reconocemos X" sin que el piloto haya escrito X.

      Se comprueba contra los catálogos reales, que es lo mismo que hace el generador: si
      alguna vez se regeneran los fixes sin regenerar las aerovías, esto lo agarra.
    */
    for (const a of todas) {
      for (const p of a.puntos) {
        const resuelve = getFix(p) !== null || getRadioayuda(p) !== null;
        expect(resuelve, `${a.designador} → ${p}`).toBe(true);
      }
    }
  });

  it("ningún designador se confunde con un punto", () => {
    // `esAerovia` decide por la forma —letra y dígitos—, y ningún fix ni ident la tiene.
    for (const a of todas) {
      expect(esAerovia(a.designador), a.designador).toBe(true);
      expect(getFix(a.designador), a.designador).toBeNull();
      expect(getRadioayuda(a.designador), a.designador).toBeNull();
    }
  });

  it("no repite un punto dos veces seguidas", () => {
    /*
      El AIP repite el punto de corte cuando la tabla sigue en la página siguiente, y el
      generador lo colapsa. Sin eso, la planilla tendría un tramo de cero millas en el
      medio: distancia 0, rumbo indefinido y tiempo cero.
    */
    for (const a of todas) {
      for (let i = 1; i < a.puntos.length; i++) {
        expect(a.puntos[i], `${a.designador} repite ${a.puntos[i]}`).not.toBe(a.puntos[i - 1]);
      }
    }
  });
});

describe("expandir contra el catálogo real", () => {
  it("una aerovía de verdad se expande de punta a punta", () => {
    const r = expandirAerovias(["BCA", "W67", "OSA"], puntosDeAerovia);
    expect(r.error).toBeNull();
    expect(r.puntos).toEqual(["BCA", "AKNOS", "OGLER", "OSA"]);
    expect(r.expandidas[0]).toEqual({ aerovia: "W67", desde: "BCA", hasta: "OSA", intermedios: 2 });
  });

  it("y al revés también", () => {
    expect(expandirAerovias(["OSA", "W67", "BCA"], puntosDeAerovia).puntos).toEqual([
      "OSA",
      "OGLER",
      "AKNOS",
      "BCA",
    ]);
  });

  it("todos los puntos de la ruta expandida se pueden ubicar", () => {
    /*
      La propiedad que le importa al planificador: si un punto no tiene posición,
      `puntosCalculables` anula el plan entero. Se prueba de punta a punta sobre las 220.
    */
    for (const a of allAerovias()) {
      const r = expandirAerovias([a.puntos[0], a.designador, a.puntos[a.puntos.length - 1]], puntosDeAerovia);
      if (r.error) continue; // las de más de 30 puntos, que la pantalla rechaza aparte
      for (const p of r.puntos) {
        expect(getFix(p) ?? getRadioayuda(p), `${a.designador} → ${p}`).not.toBeNull();
      }
    }
  });
});
