import { describe, expect, it } from "vitest";
import type { Aircraft, Flight, Logbook } from "@/types";
import type { Requisito } from "./pca-progress";
import {
  costoPorHora,
  horasQueFaltan,
  loQueFrena,
  mesesRestantes,
  requisitosPCA,
  ritmoMensual,
} from "./pca-progress";

/**
 * Los seis números de 61.620 no tenían un solo test: vivían adentro del `.tsx` y el
 * proyecto no puede testear componentes (`environment: "node"`). Esto los cubre por
 * primera vez, además de lo nuevo.
 */

const HOY = "2026-08-14";

const vuelo = (over: Partial<Flight> = {}): Flight =>
  ({
    id: Math.random().toString(36).slice(2),
    user_id: "u",
    date: "2026-08-01",
    route: "SADM SADM",
    landings: 1,
    duration: 1,
    takeoff: "",
    landing: "",
    purpose: "VP",
    ...over,
  }) as Flight;

const libro = (over: Partial<Logbook> = {}): Logbook =>
  ({
    id: "l1", user_id: "u", name: "Mi libro", is_default: true, created_at: "",
    opening_landings: 0,
    opening_pic_day_loc: 0, opening_pic_day_tra: 0,
    opening_pic_night_loc: 0, opening_pic_night_tra: 0,
    opening_sic_day_loc: 0, opening_sic_day_tra: 0,
    opening_sic_night_loc: 0, opening_sic_night_tra: 0,
    opening_imc_pil: 0, opening_imc_cop: 0, opening_capota: 0,
    ...over,
  }) as Logbook;

const buscar = (flights: Flight[], clave: string, logbooks: Logbook[] = []) =>
  requisitosPCA(flights, logbooks).find((r) => r.clave === clave)!;

describe("requisitosPCA", () => {
  it("suma las horas de vuelo al total", () => {
    expect(buscar([vuelo({ duration: 2 }), vuelo({ duration: 1.5 })], "total").actual).toBe(3.5);
  });

  it("PIC suma las cuatro columnas de PIC", () => {
    const f = vuelo({ pic_day_loc: 1, pic_day_tra: 2, pic_night_loc: 0.5, pic_night_tra: 0.5 });
    expect(buscar([f], "pic").actual).toBe(4);
  });

  it("travesía sólo cuenta las columnas de travesía", () => {
    const f = vuelo({ pic_day_loc: 5, pic_day_tra: 2, pic_night_tra: 1 });
    expect(buscar([f], "picTravesia").actual).toBe(3);
  });

  /**
   * El simulado cuenta hasta 5 h y el tope va sobre el acumulado, no vuelo por
   * vuelo. Aplicándolo por vuelo, diez sesiones de 1 h darían 10 en vez de 5.
   */
  it("el instrumento simulado tope a 5 sobre el acumulado", () => {
    const diez = Array.from({ length: 10 }, () => vuelo({ sim_pil_en_inst: 1 }));
    expect(buscar(diez, "instrumentos").actual).toBe(5);
  });

  it("el instrumento real no tiene tope y se suma al simulado", () => {
    const f = [vuelo({ imc_pil: 3, capota: 2 }), ...Array.from({ length: 8 }, () => vuelo({ sim_pil_en_inst: 1 }))];
    expect(buscar(f, "instrumentos").actual).toBe(10);
  });

  it("las horas de apertura entran en el total y en PIC", () => {
    const libros = [libro({ opening_pic_day_loc: 500 })];
    expect(buscar([], "total", libros).actual).toBe(500);
    expect(buscar([], "pic", libros).actual).toBe(500);
  });

  /**
   * Los aterrizajes de apertura vienen sin desglose día/noche. Suponerlos nocturnos
   * infla un requisito, que es el error que manda a alguien al examen corto.
   */
  it("los aterrizajes de apertura NO cuentan como nocturnos", () => {
    expect(buscar([], "aterrizajesNocturnos", [libro({ opening_landings: 300 })]).actual).toBe(0);
  });
});

describe("loQueFrena", () => {
  /**
   * El caso que motiva todo esto: casi todas las horas hechas y trabado por un
   * requisito chico. El medidor grande dice 97% y lo que decide qué volar es otro.
   */
  it("elige el que está más lejos en fracción, no en valor absoluto", () => {
    const reqs = [
      { clave: "total", label: "Total", actual: 195, objetivo: 200, unidad: "hs", esHoras: true },
      { clave: "tra", label: "Travesía", actual: 2, objetivo: 20, unidad: "hs", esHoras: true },
    ];
    const freno = loQueFrena(reqs)!;
    // A "total" le faltan 5 h y a travesía 18: en absoluto travesía pide más, pero
    // lo que importa es que está al 10% contra el 97,5%.
    expect(freno.clave).toBe("tra");
    expect(freno.faltan).toBe(18);
  });

  it("compara unidades distintas sin mezclarlas", () => {
    const reqs = [
      { clave: "noct", label: "Nocturno", actual: 4, objetivo: 5, unidad: "hs", esHoras: true },
      { clave: "atrr", label: "Aterrizajes", actual: 1, objetivo: 5, unidad: "atrr", esHoras: false },
    ];
    expect(loQueFrena(reqs)!.clave).toBe("atrr");
  });

  it("con todo cumplido no hay freno", () => {
    const reqs = [{ clave: "a", label: "A", actual: 10, objetivo: 10, unidad: "hs", esHoras: true }];
    expect(loQueFrena(reqs)).toBe(null);
  });

  /** `subObjetivo` es informativo: usarlo diría que alguien terminó cuando le falta. */
  it("el subobjetivo no cuenta como cumplido", () => {
    const reqs = [
      { clave: "pic", label: "PIC", actual: 75, objetivo: 100, subObjetivo: 70, unidad: "hs", esHoras: true },
    ];
    expect(loQueFrena(reqs)!.clave).toBe("pic");
  });

  it("empatados en cero, gana el que pide más", () => {
    const reqs = [
      { clave: "chico", label: "Chico", actual: 0, objetivo: 5, unidad: "hs", esHoras: true },
      { clave: "grande", label: "Grande", actual: 0, objetivo: 20, unidad: "hs", esHoras: true },
    ];
    expect(loQueFrena(reqs)!.clave).toBe("grande");
  });
});

describe("ritmoMensual", () => {
  it("promedia sobre la ventana, no sobre los vuelos", () => {
    // 6 h de travesía en la ventana de 3 meses → 2 h por mes.
    const flights = [
      vuelo({ date: "2026-07-01", pic_day_tra: 3 }),
      vuelo({ date: "2026-08-01", pic_day_tra: 3 }),
    ];
    expect(ritmoMensual(flights, "picTravesia", HOY)).toBe(2);
  });

  it("ignora lo que quedó fuera de la ventana", () => {
    const flights = [vuelo({ date: "2020-01-01", pic_day_tra: 90 })];
    expect(ritmoMensual(flights, "picTravesia", HOY)).toBe(0);
  });

  /**
   * El ritmo se mide sobre el requisito, no sobre las horas totales: alguien que
   * vuela mucho dando vueltas al aeródromo avanza cero en travesía, y proyectar con
   * el ritmo general daría una fecha optimista sobre justo lo que lo tiene trabado.
   */
  it("volar sin travesía deja el ritmo de travesía en cero", () => {
    const flights = [vuelo({ date: "2026-08-01", duration: 20, pic_day_loc: 20 })];
    expect(ritmoMensual(flights, "total", HOY)).toBeCloseTo(6.67, 1);
    expect(ritmoMensual(flights, "picTravesia", HOY)).toBe(0);
  });
});

describe("mesesRestantes", () => {
  it("divide lo que falta por el ritmo", () => {
    expect(mesesRestantes(6, 2)).toBe(3);
  });

  /**
   * `null` y no infinito: sin ritmo no hay nada de dónde proyectar, y contestar
   * "nunca" sería afirmar algo que no sabemos. El piloto puede tener una travesía
   * reservada para el sábado.
   */
  it("sin ritmo no proyecta", () => {
    expect(mesesRestantes(6, 0)).toBe(null);
  });
});

describe("horasQueFaltan", () => {
  /**
   * Es un piso, no una suma. Un mismo vuelo avanza varios requisitos —una travesía
   * nocturna como PIC suma a total, PIC, travesía y nocturno—, así que sumar las
   * brechas asustaría con un número que nadie va a pagar.
   */
  it("es la brecha más grande, no la suma de las brechas", () => {
    const reqs = [
      { clave: "total", label: "Total", actual: 150, objetivo: 200, unidad: "hs", esHoras: true },
      { clave: "tra", label: "Travesía", actual: 10, objetivo: 20, unidad: "hs", esHoras: true },
      { clave: "noct", label: "Nocturno", actual: 0, objetivo: 5, unidad: "hs", esHoras: true },
    ];
    expect(horasQueFaltan(reqs)).toBe(50);
  });

  it("los aterrizajes no entran: no se miden en horas", () => {
    const reqs = [
      { clave: "total", label: "Total", actual: 199, objetivo: 200, unidad: "hs", esHoras: true },
      { clave: "atrr", label: "Aterrizajes", actual: 0, objetivo: 5, unidad: "atrr", esHoras: false },
    ];
    expect(horasQueFaltan(reqs)).toBe(1);
  });

  it("con todo cumplido no falta nada", () => {
    const reqs = [{ clave: "a", label: "A", actual: 210, objetivo: 200, unidad: "hs", esHoras: true }];
    expect(horasQueFaltan(reqs)).toBe(0);
  });
});

describe("costoPorHora", () => {
  const avion = (id: string, cost?: number): Aircraft =>
    ({ id, user_id: "u", registration: id, icao: "C172", type: "Cessna", cost_per_hour: cost }) as Aircraft;

  /** Ponderado por horas: un bimotor caro volado una vez no es lo que se paga. */
  it("pondera por horas voladas, no por cantidad de aeronaves", () => {
    const flota = [avion("barato", 100), avion("caro", 1000)];
    const flights = [
      vuelo({ date: "2026-08-01", aircraft_id: "barato", duration: 9 }),
      vuelo({ date: "2026-08-01", aircraft_id: "caro", duration: 1 }),
    ];
    // (9×100 + 1×1000) / 10 = 190. Un promedio simple habría dado 550.
    expect(costoPorHora(flights, flota, HOY)).toBe(190);
  });

  /** Sin precio cargado no hay estimación: un cero se leería como "gratis". */
  it("sin precios devuelve null", () => {
    const flights = [vuelo({ aircraft_id: "a", duration: 5 })];
    expect(costoPorHora(flights, [avion("a")], HOY)).toBe(null);
  });

  it("un trimestre sin volar cae a toda la bitácora en vez de callarse", () => {
    const flights = [vuelo({ date: "2023-01-01", aircraft_id: "a", duration: 10 })];
    expect(costoPorHora(flights, [avion("a", 500)], HOY)).toBe(500);
  });

  it("ignora las aeronaves sin precio al ponderar", () => {
    const flota = [avion("con", 200), avion("sin")];
    const flights = [
      vuelo({ date: "2026-08-01", aircraft_id: "con", duration: 2 }),
      vuelo({ date: "2026-08-01", aircraft_id: "sin", duration: 50 }),
    ];
    expect(costoPorHora(flights, flota, HOY)).toBe(200);
  });
});

describe("las sesiones de simulador no son experiencia de vuelo", () => {
  /*
    El caso real del piloto: anota el simulador en el libro como cualquier vuelo
    —fecha, horarios, LV-ASG tipo C172— y la hora va a la columna de instrucción
    terrestre. Lo que no puede pasar es que esa hora cuente para las 200 h de 61.620.
  */
  const SIMU: Aircraft = {
    id: "sim-1", user_id: "u", registration: "LV-ASG", icao: "C172", type: "C172",
    is_simulator: true,
  };
  const AVION: Aircraft = {
    id: "av-1", user_id: "u", registration: "LV-XYZ", icao: "C152", type: "C152",
  };
  const de = (r: Requisito[], clave: string) => r.find((x) => x.clave === clave)!.actual;

  it("**una hora de simulador no suma a la experiencia total**", () => {
    const sesion = vuelo({ aircraft_id: SIMU.id, duration: 1, sim_pil_en_inst: 1 });
    const r = requisitosPCA([sesion], [], [SIMU, AVION]);
    expect(de(r, "total")).toBe(0);
    // Pero sí cuenta donde corresponde.
    expect(de(r, "instrumentos")).toBe(1);
  });

  it("la misma fila en un avión de verdad sí suma", () => {
    const v = vuelo({ aircraft_id: AVION.id, duration: 1, sim_pil_en_inst: 1 });
    const r = requisitosPCA([v], [], [SIMU, AVION]);
    expect(de(r, "total")).toBe(1);
    expect(de(r, "instrumentos")).toBe(1);
  });

  it("**se excluye todo, no sólo la duración**", () => {
    /*
      Una fila de simulador con PIC cargado —por un dedo, o importada de una planilla
      vieja— sumaría horas de PIC que nadie voló, y PIC es el segundo requisito más
      grande. En una sesión de simulador lo único que existe es la columna de
      instrucción terrestre; el resto es un error de carga, no un dato.
    */
    const sucia = vuelo({
      aircraft_id: SIMU.id, duration: 2, pic_day_loc: 2, pic_night_tra: 1,
      sim_pil_en_inst: 1, landings: 3,
    });
    const r = requisitosPCA([sucia], [], [SIMU]);
    expect(de(r, "total")).toBe(0);
    expect(de(r, "pic")).toBe(0);
    expect(de(r, "picTravesia")).toBe(0);
    expect(de(r, "nocturno")).toBe(0);
    expect(de(r, "aterrizajesNocturnos")).toBe(0);
  });

  it("sin la lista de aeronaves nada se marca, y el resultado es el de siempre", () => {
    // La ausencia del dato no se interpreta: es la misma disciplina que `unavailable`.
    const sesion = vuelo({ aircraft_id: SIMU.id, duration: 1, sim_pil_en_inst: 1 });
    expect(de(requisitosPCA([sesion]), "total")).toBe(1);
  });

  it("el tope de 5 h sigue valiendo, y suma las dos procedencias", () => {
    /*
      La columna de instrucción terrestre se puede llenar en una sesión de simulador
      —el caso normal— y también en un vuelo real con tiempo de instrumentos en tierra.
      Las dos cuentan, contra el mismo tope acumulado.
    */
    const sesiones = Array.from({ length: 4 }, () =>
      vuelo({ aircraft_id: SIMU.id, duration: 1, sim_pil_en_inst: 1 })
    );
    const enVuelo = vuelo({ aircraft_id: AVION.id, duration: 1, sim_pil_en_inst: 3 });
    const r = requisitosPCA([...sesiones, enVuelo], [], [SIMU, AVION]);
    expect(de(r, "instrumentos")).toBe(5);
    expect(de(r, "total")).toBe(1);
  });
});
