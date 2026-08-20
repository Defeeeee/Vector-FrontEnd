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
import {
  UTC_OFFSET_ARG,
  aLocal,
  aUtc,
  correrReloj,
  esHora,
  soloHoraYMinuto,
  problemaDeHoras,
  avisoDeHorarios,
} from "./horarios";

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

describe("problemaDeHoras", () => {
  it("dos horas bien no son problema", () => {
    expect(problemaDeHoras("14:30", "16:00")).toBeNull();
  });

  it("vacías tampoco: son opcionales en un plan", () => {
    expect(problemaDeHoras("", "")).toBeNull();
    expect(problemaDeHoras("14:30", "")).toBeNull();
  });

  it("**una hora a medio completar se explica, no se rechaza en genérico**", () => {
    /*
      Es el caso real: un `<input type="time">` con el AM/PM sin elegir deja el `value` en
      cadena vacía **aunque la hora y los minutos se vean puestos**, y el navegador bloquea
      el envío con su mensaje genérico. El piloto ve un horario escrito y un cartel que le
      dice que es inválido, sin decirle qué le falta.

      Acá el estado roto llega como un valor que no es `HH:MM`, y el mensaje dice cuál de
      los dos campos es.
    */
    expect(problemaDeHoras("14", "16:00")).toContain("despegue");
    expect(problemaDeHoras("14:30", "16")).toContain("aterrizaje");
    expect(problemaDeHoras("25:00", "")).toContain("despegue");
  });

  it("no exige que el aterrizaje sea posterior", () => {
    /*
      Un vuelo que sale 23:30 y aterriza 00:40 cruza la medianoche y es normal. Rechazarlo
      obligaría a cargar el plan mal a propósito — y son horas tentativas, no el registro.
    */
    expect(problemaDeHoras("23:30", "00:40")).toBeNull();
  });

  it("los segundos no son basura: hay navegadores que se los agregan solos", () => {
    /*
      Un `<input type="time">` puede devolver `"12:30:00"`. Es una hora perfectamente
      buena escrita con un campo de más, y rechazarla trabaría el alta sin motivo.
    */
    expect(problemaDeHoras("12:30:00", "15:30:00")).toBeNull();
  });
});

describe("avisoDeHorarios", () => {
  const bien = (valor: string) => ({ valor, entradaInvalida: false });
  const vacio = bien("");
  /** Vacío y con el navegador diciendo que hay algo escrito: la hora se perdería. */
  const aMedias = { valor: "", entradaInvalida: true };

  it("dos horas completas no avisan nada", () => {
    expect(avisoDeHorarios(bien("12:30"), bien("15:30"))).toBeNull();
  });

  it("dos campos en blanco tampoco: las horas son opcionales en un plan", () => {
    expect(avisoDeHorarios(vacio, vacio)).toBeNull();
    expect(avisoDeHorarios(bien("12:30"), vacio)).toBeNull();
  });

  it("**si hay valor se confía en el valor, aunque el navegador diga `badInput`**", () => {
    /*
      El bug reportado en producción, exacto: un piloto vio el cartel con `12:30` y `15:30`
      puestos, en un picker que ni siquiera muestra AM/PM, y **no pudo programar el vuelo**.
      La versión anterior cortaba el envío con `badInput` a secas.

      La especificación dice que `badInput` implica valor vacío. Este test fija que no le
      creemos: mientras haya algo utilizable en el campo, no hay nada que avisar.
    */
    const raro = { valor: "15:30", entradaInvalida: true };
    expect(avisoDeHorarios({ valor: "12:30", entradaInvalida: true }, raro)).toBeNull();
    expect(avisoDeHorarios(bien("12:30"), raro)).toBeNull();
  });

  it("un campo a medias se nombra, para saber cuál volver a poner", () => {
    expect(avisoDeHorarios(aMedias, bien("15:30"))).toContain("despegue");
    expect(avisoDeHorarios(bien("12:30"), aMedias)).toContain("aterrizaje");
  });

  it("los dos a medias dan un mensaje solo, no dos", () => {
    const msg = avisoDeHorarios(aMedias, aMedias);
    expect(msg).toBe(
      "Los dos horarios quedaron a medio completar y no se guardaron. Editá el vuelo para agregarlos."
    );
    expect(msg).not.toContain("despegue");
  });

  it("**el aviso dice que no se guardó, no que revise antes de mandar**", () => {
    /*
      No es cosmética: el plan ya está guardado cuando esto aparece. Un mensaje en
      imperativo previo —"revisá y volvé a intentar"— describiría algo que no pasó y
      mandaría al piloto a reenviar un formulario que ya no existe.
    */
    expect(avisoDeHorarios(aMedias, bien("15:30"))).toContain("no se guardó");
  });
});
