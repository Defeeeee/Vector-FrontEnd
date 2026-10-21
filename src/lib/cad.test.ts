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
  FINALIDAD_CAD,
  yaEstaEnElCad,
  codigoDeLugarCad,
  estaEnVector,
  propositoDesdeCad,
  vueloDesdeCad,
  validarTraido,
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
  // Copiadas de `GetLugarAterrizajeListItem?tipoLugar=AER` del CAD real (2026-10-21).
  const aerodromos = [
    { key: "FDO", value: "SADF -  FDO -  FDO (SAN FERNANDO)" },
    { key: "MOR", value: "SADM -  MOR (MORON)" },
    { key: "LJN", value: " LJN (LUJAN)" },
    { key: "LJNM", value: " LJNM (NOVO MESTO)" },
    { key: "SAEZ", value: " SAEZ (EZEIZA)" },
    { key: "EZE", value: "SAEZ -  EZE -  EZE (EZEIZA/MINISTRO PISTARINI)" },
    { key: "BAR", value: "SAZS -  BRC -  BAR (SAN CARLOS DE BARILOCHE)" },
    { key: "2013", value: " 2013 (VILLA JOSEFINA)" },
  ];

  it("la finalidad, por nombre, sin importar las tildes", () => {
    expect(resolverFinalidad("INSTRUCCIÓN", finalidades)).toBe("68");
    expect(resolverFinalidad("INSTRUCCION", finalidades)).toBe("68");
    expect(resolverFinalidad("ACROBACIA", finalidades)).toBeNull();
  });

  it("el aeródromo, sólo por código exacto: OACI o designador ANAC", () => {
    expect(resolverLugar(lugar("SADF"), aerodromos)).toBe("FDO");
    expect(resolverLugar(lugar("SADM"), aerodromos)).toBe("MOR");
    expect(resolverLugar(lugar("SRDL"), aerodromos)).toBe("LJN");
    expect(resolverLugar(lugar("SAZS"), aerodromos)).toBe("BAR");
    expect(resolverLugar(lugar("SADL"), aerodromos)).toBeNull();
    // Ni el código del medio (IATA) ni un prefijo.
    expect(resolverLugar(lugar("BRC"), aerodromos)).toBeNull();
    expect(resolverLugar(lugar("SAD"), aerodromos)).toBeNull();
  });

  it("si la lista repite un aeródromo, gana la entrada completa", () => {
    expect(resolverLugar(lugar("SAEZ"), aerodromos)).toBe("EZE");
    expect(resolverLugar(lugar("SAEZ"), [...aerodromos].reverse())).toBe("EZE");
  });

  it("cada finalidad de Vector existe, con ese nombre, en la lista del CAD", () => {
    // `GetFinalidadListItem?tcp=false` del CAD real (2026-10-21).
    const delCad = [
      "ACROBACIA", "ADAPTACIÓN", "AEROPLICADOR", "COMBATE CONTRA INCENDIOS DE BOSQUES Y CAMPOS", "ENTRENAMIENTO", "EXAMEN",
      "VUELO EN FORMACIÓN", "FOTOGRAFÍA", "INSTRUCTOR", "INSTRUCCIÓN", "INSPECTOR", "LANZAMIENTO DE PARACAIDISTAS", "VUELO NO REGULAR",
      "PRUEBA DE AERONAVES", "READAPTACIÓN", "REMOLQUE DE PLANEADOR", "SANITARIO", "TRABAJO AÉREO", "VUELO OFICIAL", "VUELO PRIVADO",
      "LINEA AEREA", "INSPECTOR (TCP)", "TRIPULANTE DE CABINA DE PASAJEROS EN INSTRUCCION",
    ].map((value, i) => ({ key: String(i), value }));
    for (const nombre of Object.values(FINALIDAD_CAD)) expect(resolverFinalidad(nombre, delCad), nombre).not.toBeNull();
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



describe("del CAD a Vector", () => {
  const listas = {
    finalidades: [
      { key: "71", value: "VUELO PRIVADO" },
      { key: "68", value: "INSTRUCCIÓN" },
      { key: "99", value: "BAUTISMO" },
    ],
    lugares: [
      { key: "10", value: "SADF -  FDO -  FDO (SAN FERNANDO)" },
      { key: "11", value: "SAZS -  BRC -  BAR (SAN CARLOS DE BARILOCHE)" },
      { key: "12", value: " LJN (LUJAN)" },
    ],
  };
  const crear = {
    vueloTripulanteID: 900123,
    tipoVueloID: "2",
    cargoID: "1",
    fechaHoraSalida: "2026-09-25T13:45:00",
    fechaHoraLlegada: "2026-09-25T16:03:00",
    horasDia: 2.3,
    horasNoche: 0,
    aterrizajes: 2,
    finalidadID: "71",
    origenID: "10",
    destinoID: "11",
    matriculaAvion: "LV-ABC",
    Discriminaciones: [
      { tipoDiscriminacionID: 7, horas: "0.5" },
      { tipoDiscriminacionID: 6, horas: "0,3" },
    ],
  };

  it("arma el desglose del libro: piloto, travesía, día, capota e instrumentos", () => {
    const f = vueloDesdeCad(crear, listas, ["LVABC"]);
    expect(f.problema).toBeNull();
    expect(f.ruta).toBe("SADF → SAZS");
    expect(f.fecha).toBe("25/09/2026");
    expect(f.vuelo).toMatchObject({
      cadId: 900123,
      date: "2026-09-25",
      takeoff: "2026-09-25T13:45:00Z",
      landing: "2026-09-25T16:03:00Z",
      origen: "SADF",
      destino: "SAZS",
      landings: 2,
      duration: 2.3,
      purpose: "VP",
      pic_day_tra: 2.3,
      pic_day_loc: 0,
      sic_day_tra: 0,
      capota: 0.5,
      imc_pil: 0.3,
      imc_cop: 0,
    });
  });

  it("copiloto, local y de noche; con los nombres de la lista en vez de los IDs", () => {
    const f = vueloDesdeCad(
      {
        vueloTripulanteID: 5,
        tipoVueloID: 1,
        cargoID: 2,
        fechaSalida: "2026-07-01T22:00:00",
        fechaLlegada: "2026-07-01T23:00:00",
        horasDia: 0,
        horasNoche: 1,
        aterrizajes: 6,
        finalidadDesc: "Instrucción",
        origenDesc: " LJN (LUJAN)",
        matricula: "LV-XYZ",
        Discriminaciones: [{ tipoDiscriminacionID: 6, horas: "0.4" }],
      },
      listas,
      ["LV-XYZ"]
    );
    expect(f.problema).toBeNull();
    expect(f.ruta).toBe("LJN (local)");
    expect(f.vuelo).toMatchObject({ origen: "LJN", destino: "LJN", purpose: "INST", sic_night_loc: 1, pic_night_loc: 0, imc_cop: 0.4, imc_pil: 0 });
  });

  it("no adivina: lo que no cierra queda para revisar", () => {
    const con = (cambio: Record<string, unknown>, matriculas = ["LV-ABC"]) => vueloDesdeCad({ ...crear, ...cambio }, listas, matriculas).problema;
    expect(con({ tipoVueloID: 3 })).toMatch(/simulador/);
    expect(con({ tipoVueloID: undefined })).toMatch(/local o travesía/);
    expect(con({ cargoID: 7 })).toMatch(/piloto o copiloto/);
    expect(con({ fechaHoraSalida: "ayer" })).toMatch(/salida o la llegada/);
    expect(con({ horasDia: 2.0 })).toMatch(/no dan/);
    expect(con({}, ["LV-OTR"])).toMatch(/LV-ABC no está en tu Hangar/);
    expect(con({ finalidadID: "99" })).toMatch(/BAUTISMO/);
    expect(con({ origenID: "404", destinoID: "404" })).toMatch(/aeródromo/);
    expect(con({ vueloTripulanteID: undefined })).toMatch(/número/);
    expect(vueloDesdeCad({ ...crear, tipoVueloID: 3 }, listas, ["LV-ABC"]).vuelo).toBeNull();
  });

  it("una salida con zona se pasa a UTC", () => {
    const f = vueloDesdeCad({ ...crear, fechaHoraSalida: "2026-09-25T10:45:00-03:00", fechaHoraLlegada: "2026-09-25T13:03:00-03:00" }, listas, ["LV-ABC"]);
    expect(f.vuelo?.takeoff).toBe("2026-09-25T13:45:00Z");
  });

  it("de Vector al CAD y de vuelta da el mismo vuelo", () => {
    const v: VueloVector = {
      id: "v1",
      date: "2026-09-25",
      route: "SADF SAZS",
      landings: 2,
      duration: 2.3,
      takeoff: "2026-09-25T13:45:00Z",
      landing: "2026-09-25T16:03:00Z",
      purpose: "VP",
      pic_day_tra: 2.3,
      capota: 0.5,
    };
    const b = borradorCad(v, { registration: "LVABC", type_acft: "MONT-T" }, (c) => ({ codigo: c, candidatos: [c], nombre: null }));
    const p = payloadCad(b, { finalidadID: "71", origenID: "10", destinoID: "11", autoridadID: "1", autoridadNombre: "X" });
    const f = vueloDesdeCad({ ...p, vueloTripulanteID: 1 }, listas, ["LV-ABC"]);
    expect(f.vuelo).toMatchObject({ date: v.date, takeoff: v.takeoff, landing: v.landing, duration: 2.3, pic_day_tra: 2.3, capota: 0.5, purpose: "VP", landings: 2 });
  });

  it("sabe si un vuelo del CAD ya está en Vector", () => {
    const conocidos = [
      { cadId: 77, salida: "2026-01-01T10:00", matricula: "LV-AAA" },
      { cadId: null, salida: "2026-09-25T13:45", matricula: "LVABC" },
    ];
    expect(estaEnVector({ vueloTripulanteID: 77, fechaSalida: "2020-01-01T00:00:00", matricula: "X" }, conocidos)).toBe(true);
    expect(estaEnVector({ vueloTripulanteID: 1, fechaSalida: "2026-09-25T13:45:00", matricula: "LV-ABC" }, conocidos)).toBe(true);
    expect(estaEnVector({ vueloTripulanteID: 1, fechaSalida: "2026-09-25T13:46:00", matricula: "LV-ABC" }, conocidos)).toBe(false);
  });

  it("los nombres de lugares y finalidades", () => {
    expect(codigoDeLugarCad("SADF -  FDO -  FDO (SAN FERNANDO)")).toBe("SADF");
    expect(codigoDeLugarCad(" LJN (LUJAN)")).toBe("LJN");
    expect(codigoDeLugarCad(undefined)).toBe("");
    expect(propositoDesdeCad("Instrucción")).toBe("INST");
    expect(propositoDesdeCad("ENTRENAMIENTO")).toBe("ENT");
    expect(propositoDesdeCad("")).toBeNull();
  });

  it("el server revisa de nuevo lo que llega del CAD", () => {
    const bueno = vueloDesdeCad(crear, listas, ["LV-ABC"]).vuelo!;
    expect(validarTraido(bueno)).toEqual(bueno);
    expect(validarTraido({ ...bueno, extra: "x" })).toEqual(bueno);
    expect(validarTraido({ ...bueno, pic_day_tra: 2.2 })).toBeNull();
    expect(validarTraido({ ...bueno, duration: 2.2, pic_day_tra: 2.2 })).toBeNull();
    expect(validarTraido({ ...bueno, cadId: -1 })).toBeNull();
    expect(validarTraido({ ...bueno, purpose: "XX" })).toBeNull();
    expect(validarTraido({ ...bueno, origen: "<script>" })).toBeNull();
    expect(validarTraido({ ...bueno, date: "2026-09-24" })).toBeNull();
    expect(validarTraido({ ...bueno, capota: "0.5" })).toBeNull();
    expect(validarTraido(null)).toBeNull();
  });
});
