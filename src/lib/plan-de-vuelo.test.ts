import { describe, expect, it } from "vitest";
import {
  armarPlan,
  asuntoDelMail,
  autonomiaHhmm,
  casilla18,
  coordenadaOaci,
  duracionHhmm,
  identificacionAeronave,
  indicadorDeLugar,
  mensajeFpl,
  nivelCrucero,
  rutaItem15,
  salidaUtc,
  textoAts,
  velocidadCrucero,
  type DatosPlanDeVuelo,
} from "./plan-de-vuelo";

describe("formatos de las casillas (AIP ENR 1.10, Apéndice 1)", () => {
  it("casilla 7: la matrícula sin guiones", () => {
    expect(identificacionAeronave("LV-ABC")).toBe("LVABC");
    expect(identificacionAeronave(" lv-gve ")).toBe("LVGVE");
    expect(identificacionAeronave("N2567GA-X")).toBe("N2567GA");
  });

  it("casilla 15: velocidad con N y cuatro cifras, nivel en centenares de pies o VFR", () => {
    expect(velocidadCrucero(95)).toBe("N0095");
    expect(velocidadCrucero(109.6)).toBe("N0110");
    expect(nivelCrucero(4500)).toBe("A045");
    expect(nivelCrucero(10_000)).toBe("A100");
    expect(nivelCrucero(null)).toBe("VFR");
    expect(nivelCrucero(0)).toBe("VFR");
  });

  it("coordenadas en grados y minutos, once caracteres, con el redondeo que sube de grado", () => {
    expect(coordenadaOaci(46.3333, -78.0833)).toBe("4620N07805W");
    expect(coordenadaOaci(-34.6833, -58.6333)).toBe("3441S05838W");
    // 59,7 minutos no se escriben "60": son el grado siguiente.
    expect(coordenadaOaci(-34.9995, -58.9995)).toBe("3500S05900W");
    expect(coordenadaOaci(-5.5, -8.25)).toBe("0530S00815W");
  });

  it("duraciones con cuatro cifras, y la autonomía redondeada para abajo", () => {
    expect(duracionHhmm(105)).toBe("0145");
    expect(duracionHhmm(44.6)).toBe("0045");
    expect(autonomiaHhmm(100, 24)).toBe("0410"); // 4 h 10 min exactos
    expect(autonomiaHhmm(100, 23)).toBe("0420"); // 4 h 20,8 min → 4 h 20
    expect(autonomiaHhmm(0, 24)).toBeNull();
    expect(autonomiaHhmm(80, 0)).toBeNull();
  });

  it("la hora en UTC, y DOF/ con la fecha UTC aunque en Argentina siga siendo ayer", () => {
    expect(salidaUtc("2026-10-10", "10:30")).toEqual({ hora: "1330", dof: "261010" });
    expect(salidaUtc("2026-10-10", "22:15")).toEqual({ hora: "0115", dof: "261011" });
    expect(salidaUtc("2026-12-31", "21:00")).toEqual({ hora: "0000", dof: "270101" });
    expect(salidaUtc("2026-10-10", "")).toBeNull();
    expect(salidaUtc("10/10/2026", "10:30")).toBeNull();
    expect(salidaUtc("2026-10-10", "25:00")).toBeNull();
  });

  it("el texto libre queda en mayúsculas, sin acentos ni símbolos que rompan el mensaje", () => {
    expect(textoAts("Aeroclub Cañuelas (instrucción) - vuelo/2")).toBe("AEROCLUB CANUELAS INSTRUCCION VUELO 2");
  });
});

describe("aeródromos con y sin indicador OACI (casillas 13, 16 y 18)", () => {
  it("con cuatro letras va en la casilla", () => {
    expect(indicadorDeLugar({ codigo: "sadf", nombre: "San Fernando" })).toEqual({ casilla: "SADF" });
  });

  it("con designador ANAC va ZZZZ, y el nombre y el lugar a la casilla 18", () => {
    expect(indicadorDeLugar({ codigo: "CNL", nombre: "Cañuelas", lat: -35.0, lon: -58.75 })).toEqual({
      casilla: "ZZZZ",
      otrosDatos: "CANUELAS 3500S05845W",
    });
  });
});

describe("la ruta, casilla 15 c)", () => {
  it("sin puntos intermedios es DCT", () => {
    expect(rutaItem15([])).toBe("DCT");
  });

  it("DCT entre puntos con designador", () => {
    expect(
      rutaItem15([
        { tipo: "radioayuda", codigo: "SNO" },
        { tipo: "fix", codigo: "dorvo" },
      ])
    ).toBe("DCT SNO DCT DORVO");
  });

  it("sin DCT entre dos puntos geográficos (coordenadas o radial y distancia)", () => {
    expect(
      rutaItem15([
        { tipo: "coordenada", codigo: "S34.5/W58.9", lat: -34.5, lon: -58.9 },
        { tipo: "radial", codigo: "BAR/045/25" },
        { tipo: "radioayuda", codigo: "BAR" },
      ])
    ).toBe("DCT 3430S05854W BAR045025 DCT BAR");
  });

  it("una aerovía va entre su punto de entrada y el de salida, sin DCT alrededor", () => {
    expect(
      rutaItem15([
        { tipo: "fix", codigo: "BCA" },
        { tipo: "aerovia", designador: "W67" },
        { tipo: "fix", codigo: "OSA" },
        { tipo: "radioayuda", codigo: "SRA" },
      ])
    ).toBe("DCT BCA W67 OSA DCT SRA");
  });

  it("un aeródromo intermedio va en coordenadas", () => {
    expect(rutaItem15([{ tipo: "aerodromo", codigo: "SAAJ", lat: -34.5458, lon: -60.9306 }])).toBe("DCT 3433S06056W");
  });

  it("un punto que no se puede escribir frena la ruta en vez de saltearlo", () => {
    expect(rutaItem15([{ tipo: "coordenada", codigo: "S34/W58" }])).toBeNull();
    expect(rutaItem15([{ tipo: "radial", codigo: "BAR/045/1200" }])).toBeNull();
  });
});

describe("casilla 18", () => {
  it("cero si no hay nada, y los indicadores en el orden de la ENR 1.10", () => {
    expect(casilla18({})).toBe("0");
    expect(casilla18({ RMK: "INSTRUCCION", DOF: "261010", DEP: "CANUELAS 3500S05845W", OPR: "AEROCLUB" })).toBe(
      "DEP/CANUELAS 3500S05845W DOF/261010 OPR/AEROCLUB RMK/INSTRUCCION"
    );
  });
});

const BASE: DatosPlanDeVuelo = {
  matricula: "LV-ABC",
  reglas: "V",
  tipoVuelo: "G",
  tipoAeronave: "C152",
  descripcionAeronave: "Cessna 152",
  estela: "L",
  equipo: "V",
  vigilancia: "C",
  salida: { codigo: "SADF", nombre: "San Fernando", lat: -34.4532, lon: -58.5896 },
  destino: { codigo: "CNL", nombre: "Cañuelas", lat: -35.0, lon: -58.75 },
  alternativas: [{ codigo: "SADM", nombre: "Morón" }],
  fechaLocal: "2026-10-10",
  horaLocal: "10:30",
  tasKt: 95,
  altitudFt: 2500,
  ruta: [],
  minutosTotales: 22,
  litros: 90,
  consumoLh: 24,
  operador: "",
  observaciones: "Vuelo de instrucción",
  personas: "2",
  radio: { uhf: false, vhf: true, elt: true },
  supervivencia: { lleva: false, polar: false, desierto: false, maritimo: false, selva: false },
  chalecos: { lleva: false, luz: false, fluoresceina: false, uhf: false, vhf: false },
  botes: { lleva: false, numero: "", capacidad: "", cubierta: false, color: "" },
  colorMarcas: "Blanco con franjas azules",
  observacionesSupervivencia: "",
  piloto: "Lucía Ferrari",
  presentadoPor: "",
};

describe("el plan entero", () => {
  it("arma todas las casillas sin faltas", () => {
    const { plan, faltas } = armarPlan(BASE);
    expect(faltas).toEqual([]);
    expect(mensajeFpl(plan)).toBe(
      "(FPL-LVABC-VG-C152/L-V/C-SADF1330-N0095A025 DCT-ZZZZ0022 SADM-DEST/CANUELAS 3500S05845W DOF/261010 RMK/VUELO DE INSTRUCCION)"
    );
    expect(plan.c19).toMatchObject({ autonomia: "0345", personas: "2", piloto: "LUCIA FERRARI", observaciones: null });
    expect(plan.presentadoPor).toBe("LUCIA FERRARI");
    expect(asuntoDelMail(plan, BASE.fechaLocal)).toBe("FPL LVABC SADF 1330Z 10/10/2026");
  });

  it("sin designador OACI de tipo va ZZZZ y TYP/", () => {
    const { plan } = armarPlan({ ...BASE, tipoAeronave: "", descripcionAeronave: "Aero Boero 115" });
    expect(plan.c9tipo).toBe("ZZZZ");
    expect(plan.c18).toContain("TYP/AERO BOERO 115");
  });

  it("dice qué falta en vez de inventarlo", () => {
    const { faltas } = armarPlan({
      ...BASE,
      matricula: "",
      equipo: "",
      horaLocal: "",
      litros: 0,
      personas: "",
      piloto: "",
    });
    expect(faltas.map((f) => f.casilla)).toEqual(["7", "10", "13", "19", "19", "19"]);
  });

  it("TBN cuando todavía no se sabe cuántos van", () => {
    expect(armarPlan({ ...BASE, personas: "tbn" }).plan.c19.personas).toBe("TBN");
  });

  it("lo que no se lleva, se tacha aunque haya quedado marcado adentro", () => {
    const { plan } = armarPlan({
      ...BASE,
      supervivencia: { lleva: false, polar: true, desierto: true, maritimo: false, selva: false },
    });
    expect(plan.c19.supervivencia).toEqual({ s: false, p: false, d: false, m: false, j: false });
  });
});
