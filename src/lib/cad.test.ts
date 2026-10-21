import { describe, expect, it } from "vitest";
import {
  autoridadSugerida,
  borradorCad,
  faltaAutoridad,
  recordarAutoridades,
  claseCad,
  horasCentesimalesCad,
  matriculaCad,
  payloadCad,
  resolverFinalidad,
  resolverLugar,
  yaEstaEnElCad,
  type LugarParaCad,
  type VueloVector,
} from "./cad";
import { calculateFlightDuration } from "./utils";

// Un lugar con su designador ANAC: Luján es SRDL en la ruta y LJN en el CAD.
const LOCALES: Record<string, string> = { SRDL: "LJN" };
const lugar = (codigo: string): LugarParaCad => ({ codigo, candidatos: [codigo, LOCALES[codigo]].filter(Boolean) as string[], nombre: null });
const ECHO = { registration: "LVS100", type_acft: "MONT-T", potencia_hp: 100 };

// Dos vuelos reales del CAD de Federico (leídos el 2026-10-20), como los tiene Vector.
const LUJAN_MORON: VueloVector = {
  id: "v1",
  date: "2026-10-17",
  route: "SRDL SADM",
  landings: 1,
  duration: 1.0,
  takeoff: "2026-10-17T18:00:00Z",
  landing: "2026-10-17T19:00:00Z",
  purpose: "ENT",
  pic_day_tra: 1.0,
};
const LOCAL_CAPOTA: VueloVector = {
  id: "v2",
  date: "2026-09-27",
  route: "SADF SADF",
  landings: 1,
  duration: 1.0,
  takeoff: "2026-09-27T11:45:00Z",
  landing: "2026-09-27T12:45:00Z",
  purpose: "INST",
  pic_day_loc: 1.0,
  capota: 0.7,
};

describe("las horas, como las cuenta el CAD", () => {
  it("es la misma tabla que la de Vector, minuto por minuto", () => {
    for (let m = 0; m <= 59; m++) {
      const salida = "2026-10-17T18:00:00Z";
      const llegada = new Date(Date.parse(salida) + (60 + m) * 60_000).toISOString();
      expect(horasCentesimalesCad(salida, llegada)).toBe(calculateFlightDuration("18:00", `19:${String(m).padStart(2, "0")}`));
    }
  });

  it("cruza la medianoche y varios días", () => {
    expect(horasCentesimalesCad("2026-10-17T23:30:00Z", "2026-10-18T00:45:00Z")).toBe(1.3);
    expect(horasCentesimalesCad("2026-10-17T10:00:00Z", "2026-10-18T11:00:00Z")).toBe(25);
  });

  it("una llegada que no es posterior, no", () => {
    expect(horasCentesimalesCad("2026-10-17T19:00:00Z", "2026-10-17T18:00:00Z")).toBeNull();
  });
});

describe("el vuelo de Vector, armado para el CAD", () => {
  it("una travesía: tipo 2, piloto, horas de día, Luján con su código ANAC", () => {
    const b = borradorCad(LUJAN_MORON, ECHO, lugar);
    expect(b).toMatchObject({
      problema: null,
      tipoVueloID: 2,
      cargoID: 1,
      fechaHoraSalida: "2026-10-17T18:00:00.000Z",
      fechaHoraLlegada: "2026-10-17T19:00:00.000Z",
      horas: 1,
      horasDia: 1,
      horasNoche: 0,
      aterrizajes: 1,
      clase: "MONT-T",
      potencia: 100,
      matricula: "LV-S100",
      finalidad: "ENTRENAMIENTO",
      ruta: "SRDL → SADM",
      fecha: "17/10/2026",
    });
    expect(b.origen.candidatos).toEqual(["SRDL", "LJN"]);
    expect(b.discriminaciones).toEqual([]);
  });

  it("un local con capota: tipo 1, la capota en la discriminación", () => {
    const b = borradorCad(LOCAL_CAPOTA, ECHO, lugar);
    expect(b).toMatchObject({ problema: null, tipoVueloID: 1, finalidad: "INSTRUCCIÓN", ruta: "SADF (local)" });
    expect(b.discriminaciones).toEqual([{ tipoDiscriminacionID: 7, horas: "0.7" }]);
  });

  it("instructor: la discriminación de instructor con todas las horas; multimotor, igual", () => {
    const b = borradorCad({ ...LOCAL_CAPOTA, purpose: "I", capota: 0 }, { ...ECHO, type_acft: "MULT-T" }, lugar);
    expect(b.discriminaciones).toEqual([
      { tipoDiscriminacionID: 1, horas: "1.0" },
      { tipoDiscriminacionID: 2, horas: "1.0" },
    ]);
  });

  it("copiloto: cargo 2 y sus horas", () => {
    const b = borradorCad({ ...LUJAN_MORON, pic_day_tra: 0, sic_day_tra: 1 }, ECHO, lugar);
    expect(b).toMatchObject({ cargoID: 2, horasDia: 1, problema: null });
  });

  it("lo que el CAD rechazaría, se marca para revisar", () => {
    expect(borradorCad({ ...LUJAN_MORON, pic_day_tra: 0.8 }, ECHO, lugar).problema).toMatch(/no dan lo que va de la salida a la llegada/);
    expect(borradorCad({ ...LUJAN_MORON, takeoff: null }, ECHO, lugar).problema).toMatch(/hora de salida/);
    expect(borradorCad(LUJAN_MORON, { ...ECHO, type_acft: null }, lugar).problema).toMatch(/clase/);
    expect(borradorCad({ ...LUJAN_MORON, purpose: "XYZ" }, ECHO, lugar).problema).toMatch(/finalidad/);
    expect(borradorCad({ ...LUJAN_MORON, sic_day_tra: 1 }, ECHO, lugar).problema).toMatch(/piloto y de copiloto/);
    expect(borradorCad(LUJAN_MORON, { ...ECHO, is_simulator: true }, lugar).problema).toMatch(/simulador/);
  });
});

describe("lo que se resuelve con las listas del CAD", () => {
  const finalidades = [
    { key: "63", value: "ENTRENAMIENTO" },
    { key: "68", value: "INSTRUCCIÓN" },
  ];
  const aerodromos = [
    { key: "101", value: " SADF (SAN FERNANDO)" },
    { key: "102", value: " SADM (MORÓN)" },
    { key: "103", value: " LJN (LUJÁN)" },
    { key: "104", value: " SADFX (OTRO)" },
  ];

  it("la finalidad, por nombre, sin importar las tildes", () => {
    expect(resolverFinalidad("INSTRUCCIÓN", finalidades)).toBe("68");
    expect(resolverFinalidad("INSTRUCCION", finalidades)).toBe("68");
    expect(resolverFinalidad("ACROBACIA", finalidades)).toBeNull();
  });

  it("el aeródromo, sólo por código exacto: OACI o designador ANAC", () => {
    expect(resolverLugar(lugar("SADF"), aerodromos)).toBe("101");
    expect(resolverLugar(lugar("SRDL"), aerodromos)).toBe("103");
    expect(resolverLugar(lugar("SAZS"), aerodromos)).toBeNull();
  });

  it("un vuelo que ya está: misma salida al minuto y misma matrícula", () => {
    const enElCad = [{ vueloTripulanteID: 831538, fechaSalida: "2026-10-17T18:00:00", matricula: "LV-S100" }];
    expect(yaEstaEnElCad({ fechaHoraSalida: "2026-10-17T18:00:00.000Z", matricula: "LVS100" }, enElCad)).toBe(831538);
    expect(yaEstaEnElCad({ fechaHoraSalida: "2026-10-17T18:05:00.000Z", matricula: "LV-S100" }, enElCad)).toBeNull();
    expect(yaEstaEnElCad({ fechaHoraSalida: "2026-10-17T18:00:00.000Z", matricula: "LV-S114" }, enElCad)).toBeNull();
  });

  it("el objeto de 'Crear', como lo arma el formulario del CAD", () => {
    const b = borradorCad(LOCAL_CAPOTA, ECHO, lugar);
    const p = payloadCad(b, { finalidadID: "68", origenID: "101", destinoID: "101", autoridadID: "5", autoridadNombre: "JUAN PEREZ" });
    expect(p).toEqual({
      Discriminaciones: [{ tipoDiscriminacionID: 7, horas: "0.7" }],
      discriminaciones: [],
      tipoVueloID: "1",
      fechaHoraSalida: "2026-09-27T11:45:00.000Z",
      fechaHoraLlegada: "2026-09-27T12:45:00.000Z",
      aterrizajes: 1,
      autoridadCertificanteID: "5",
      observaciones: "JUAN PEREZ",
      finalidadID: "68",
      potencia: 100,
      clase: "MONT-T",
      horasDia: 1,
      horasNoche: 0,
      cargoID: "1",
      origenID: "101",
      destinoID: "101",
      origenPersonalizado: "",
      destinoPersonalizado: "",
      matriculaAvion: "LV-S100",
    });
  });
});

describe("matrícula y clase", () => {
  it("la matrícula con el guion del registro", () => {
    expect(matriculaCad("LVS114")).toBe("LV-S114");
    expect(matriculaCad("lv-s114")).toBe("LV-S114");
    expect(matriculaCad("N123AB")).toBe("N123AB");
  });

  it("los acuáticos de Vector son MON-A en el CAD", () => {
    expect(claseCad("MONT-H")).toBe("MON-A");
    expect(claseCad("MULT-H")).toBe("MULT-A");
    expect(claseCad("MONT-T")).toBe("MONT-T");
    expect(claseCad(null)).toBeNull();
  });
});

describe("la autoridad certificante, por vuelo", () => {
  it("propone la última usada para la misma finalidad, sin importar las tildes", () => {
    const memoria = recordarAutoridades(null, [
      { finalidad: "INSTRUCCIÓN", autoridad: { id: "2", nombre: "juan perez" } },
      { finalidad: "VUELO PRIVADO", autoridad: { id: "1", nombre: "Lucia Ferrari" } },
    ]);
    expect(autoridadSugerida(memoria, "INSTRUCCION")).toEqual({ id: "2", nombre: "JUAN PEREZ" });
    expect(autoridadSugerida(memoria, "VUELO PRIVADO")).toEqual({ id: "1", nombre: "LUCIA FERRARI" });
  });

  it("sin antecedentes para esa finalidad, vacía: no se inventa quién firma", () => {
    expect(autoridadSugerida({ porFinalidad: {} }, "EXAMEN")).toEqual({ id: "", nombre: "" });
    expect(autoridadSugerida(null, "EXAMEN")).toEqual({ id: "", nombre: "" });
  });

  it("la última carga pisa a la anterior, y una incompleta no se recuerda", () => {
    let m = recordarAutoridades(null, [{ finalidad: "INSTRUCCIÓN", autoridad: { id: "2", nombre: "JUAN PEREZ" } }]);
    m = recordarAutoridades(m, [
      { finalidad: "INSTRUCCIÓN", autoridad: { id: "2", nombre: "ANA GOMEZ" } },
      { finalidad: "EXAMEN", autoridad: { id: "3", nombre: "  " } },
    ]);
    expect(autoridadSugerida(m, "INSTRUCCIÓN").nombre).toBe("ANA GOMEZ");
    expect(autoridadSugerida(m, "EXAMEN")).toEqual({ id: "", nombre: "" });
  });

  it("falta si no hay autoridad o no hay nombre", () => {
    expect(faltaAutoridad({ id: "1", nombre: "X" })).toBe(false);
    expect(faltaAutoridad({ id: "", nombre: "X" })).toBe(true);
    expect(faltaAutoridad({ id: "1", nombre: " " })).toBe(true);
    expect(faltaAutoridad(null)).toBe(true);
  });
});

