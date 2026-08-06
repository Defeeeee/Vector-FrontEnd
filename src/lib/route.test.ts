import { describe, expect, it } from "vitest";
import { splitRoute } from "./route";

/**
 * Los tres formatos existen todos en la base, guardados en distintas épocas y
 * por distintas puertas. Ninguno se puede dejar de leer.
 */
describe("splitRoute", () => {
  it("lee el formato que escribe el formulario hoy", () => {
    expect(splitRoute("SADF SADM")).toEqual(["SADF", "SADM"]);
  });

  it("lee el formato viejo con guion", () => {
    expect(splitRoute("SADF-SADM")).toEqual(["SADF", "SADM"]);
    expect(splitRoute("SADF - SADM")).toEqual(["SADF", "SADM"]);
  });

  it("normaliza a mayúsculas", () => {
    expect(splitRoute("sadf sadm")).toEqual(["SADF", "SADM"]);
  });

  /**
   * El caso que separa esta función de la del formulario: un circuito local
   * trae un solo código y el destino queda vacío **a propósito**. Repetirlo
   * haría que las agregaciones contaran ese aeródromo dos veces y que un vuelo
   * local figurara como travesía consigo mismo.
   */
  it("no inventa un destino en un circuito local", () => {
    expect(splitRoute("SADF")).toEqual(["SADF", ""]);
    expect(splitRoute("SADF", "???")).toEqual(["SADF", "???"]);
  });

  it("devuelve el fallback pedido cuando no hay ruta", () => {
    expect(splitRoute("")).toEqual(["", ""]);
    expect(splitRoute(undefined)).toEqual(["", ""]);
    expect(splitRoute("   ", "???")).toEqual(["???", "???"]);
  });

  it("aguanta separadores repetidos y espacios de más", () => {
    expect(splitRoute("  SADF   SADM  ")).toEqual(["SADF", "SADM"]);
    expect(splitRoute("SADF--SADM")).toEqual(["SADF", "SADM"]);
  });

  it("ignora un tercer código en vez de romperse", () => {
    expect(splitRoute("SADF SADM SAEZ")).toEqual(["SADF", "SADM"]);
  });
});
