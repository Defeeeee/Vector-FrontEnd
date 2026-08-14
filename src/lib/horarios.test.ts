/**
 * Este módulo decide si una hora que ve un piloto es la misma que la que se
 * guarda en su libro. Invertir la conversión mueve **todos** los vuelos tres
 * horas y rompe la detección de superposiciones de la auditoría sin tirar un solo
 * error — el comentario de `FlightLogForm` avisa exactamente de eso.
 *
 * Lo otro que se testea acá es la vuelta al día: un vuelo que sale 23:00 local es
 * 02:00 UTC, y eso tiene que dar 02:00 y no 26:00 ni -1:00.
 */

import { describe, expect, it } from "vitest";
import { UTC_OFFSET_ARG, aLocal, aUtc, correrReloj, esHora, soloHoraYMinuto } from "./horarios";

describe("esHora", () => {
  it("acepta horas de reloj y rechaza el resto", () => {
    expect(esHora("00:00")).toBe(true);
    expect(esHora("23:59")).toBe(true);
    expect(esHora("24:00")).toBe(false);
    expect(esHora("23:60")).toBe(false);
    expect(esHora("9:00")).toBe(false);
    expect(esHora("")).toBe(false);
    expect(esHora("hola")).toBe(false);
  });
});

describe("aLocal y aUtc", () => {
  /** El sentido de la conversión. Si esto se da vuelta, se da vuelta toda la app. */
  it("UTC va tres horas atrás para mostrarse, y al revés para guardarse", () => {
    expect(aLocal("12:00")).toBe("09:00");
    expect(aUtc("09:00")).toBe("12:00");
    expect(UTC_OFFSET_ARG).toBe(-3);
  });

  it("una hora sobrevive la ida y la vuelta", () => {
    for (const h of ["00:00", "05:30", "12:45", "23:59"]) {
      expect(aUtc(aLocal(h))).toBe(h);
    }
  });

  /**
   * El caso que rompe una resta ingenua: 23:00 local son las 02:00 UTC del día
   * siguiente, y 01:00 UTC son las 22:00 local del día anterior.
   */
  it("da la vuelta al día en las dos direcciones", () => {
    expect(aUtc("23:00")).toBe("02:00");
    expect(aLocal("01:00")).toBe("22:00");
    expect(aLocal("00:00")).toBe("21:00");
  });

  it("deja intacto lo que no es una hora, para no romper un campo a medio tipear", () => {
    expect(aLocal("1")).toBe("1");
    expect(aUtc("")).toBe("");
  });
});

describe("correrReloj", () => {
  it("acepta corrimientos de más de un día sin desbordar", () => {
    expect(correrReloj("10:00", 25)).toBe("11:00");
    expect(correrReloj("10:00", -25)).toBe("09:00");
  });
});

describe("soloHoraYMinuto", () => {
  /**
   * Postgres devuelve "14:00:00" para una columna `time`. Un `<input type="time">`
   * con segundos lo descarta **sin decir nada**: el campo queda vacío y parece que
   * el dato nunca se guardó.
   */
  it("recorta los segundos que manda Postgres", () => {
    expect(soloHoraYMinuto("14:00:00")).toBe("14:00");
    expect(soloHoraYMinuto("09:30")).toBe("09:30");
  });

  it("el vacío y el null dan cadena vacía", () => {
    expect(soloHoraYMinuto(null)).toBe("");
    expect(soloHoraYMinuto(undefined)).toBe("");
    expect(soloHoraYMinuto("")).toBe("");
    expect(soloHoraYMinuto("basura")).toBe("");
  });
});
