import { describe, expect, it } from "vitest";
import { splitRoute } from "./route";
import {
  DISPERSION_TOLERABLE,
  MAX_PUNTOS,
  aCampoRoute,
  dispersionDeVariacion,
  MAX_PUNTOS_EXPANDIDOS,
  esAerovia,
  expandirAerovias,
  parsearRuta,
  puntosCalculables,
  puntosConBriefing,
  rutaAUrl,
  variacionDelPlan,
  type PuntoRuta,
} from "./ruta-planificada";

const punto = (over: Partial<PuntoRuta> = {}): PuntoRuta => ({
  codigo: "SADM",
  label: "Morón",
  lat: -34.6792,
  lon: -58.6436,
  variacionW: 10,
  resuelto: true,
  ...over,
});

describe("parsearRuta", () => {
  it("acepta espacios, guiones y comas", () => {
    expect(parsearRuta("SADM SAAJ SAZN")).toEqual(["SADM", "SAAJ", "SAZN"]);
    expect(parsearRuta("SADM-SAAJ-SAZN")).toEqual(["SADM", "SAAJ", "SAZN"]);
    expect(parsearRuta("sadm, saaj , sazn")).toEqual(["SADM", "SAAJ", "SAZN"]);
  });

  it("no deduplica: la ida y vuelta es un vuelo normal", () => {
    // Colapsar SADM SAAJ SADM borraría el tramo de regreso, que es la mitad del plan.
    expect(parsearRuta("SADM SAAJ SADM")).toEqual(["SADM", "SAAJ", "SADM"]);
  });

  it("acepta designadores ANAC de tres letras igual que ICAO", () => {
    // GEZ existe sólo en MADHEL y es como el piloto lo nombra. Acá no se valida nada:
    // sólo se parte texto, y el directorio decide después.
    expect(parsearRuta("MOR GEZ")).toEqual(["MOR", "GEZ"]);
  });

  it("corta en el tope de puntos", () => {
    const muchos = Array.from({ length: MAX_PUNTOS + 5 }, (_, i) => `AA${i}`).join(" ");
    expect(parsearRuta(muchos)).toHaveLength(MAX_PUNTOS);
  });

  it("aguanta vacío y basura sin romperse", () => {
    expect(parsearRuta("")).toEqual([]);
    expect(parsearRuta("   ")).toEqual([]);
    expect(parsearRuta("---")).toEqual([]);
  });
});

describe("parsearRuta con los puntos que no son aeródromo", () => {
  it("la barra no parte un punto", () => {
    /*
      **El test que fija la gramática.** La barra separa adentro de un punto y los
      espacios, comas y guiones separan entre puntos. Si algún día alguien suma la barra
      a los separadores, `BAR/045/25` se convierte en tres puntos de ruta llamados BAR,
      045 y 25 — y los dos últimos ni siquiera van a resolver.
    */
    expect(parsearRuta("SADM BAR/045/25 SAZN")).toEqual(["SADM", "BAR/045/25", "SAZN"]);
    expect(parsearRuta("SADM S34.68/W58.64")).toEqual(["SADM", "S34.68/W58.64"]);
  });

  it("con guiones de separador también, que es como vuelve de la URL", () => {
    expect(parsearRuta("SADM-BAR/045/25-SAZN")).toEqual(["SADM", "BAR/045/25", "SAZN"]);
  });

  it("la vuelta por la URL cierra con los tres tipos de punto", () => {
    // Un link compartido tiene que abrir el mismo plan. Con coordenadas y radiales
    // adentro esto deja de ser obvio: los dos formatos tienen caracteres que en otra
    // gramática serían separadores.
    const codigos = ["SADM", "S34.68/W58.64", "BAR/045/25", "SAZN"];
    expect(parsearRuta(rutaAUrl(codigos))).toEqual(codigos);
  });
});

describe("puntosConBriefing", () => {
  it("sólo los aeródromos", () => {
    /*
      **No es cosmético.** `veredictoDeRuta` decide si puede opinar contando cuántas
      estaciones contestaron. Una coordenada propia nunca va a tener METAR: mandarla al
      briefing la contaría como estación caída y bajaría el veredicto de una ruta que
      está perfecta. Y una radioayuda tampoco emite METAR — `SDE` la estación y `SDE` el
      aeródromo comparten las letras y nada más.
    */
    const puntos = [
      punto({ codigo: "SADM", clase: "aerodromo" }),
      punto({ codigo: "S34.68/W58.64", clase: "coordenada" }),
      punto({ codigo: "BAR/045/25", clase: "radial" }),
      punto({ codigo: "ITA", clase: "radioayuda" }),
      punto({ codigo: "SAZN", clase: "aerodromo" }),
    ];
    expect(puntosConBriefing(puntos).map((p) => p.codigo)).toEqual(["SADM", "SAZN"]);
  });

  it("un punto sin resolver todavía no tiene clase, y no va", () => {
    expect(puntosConBriefing([punto({ codigo: "XX", clase: undefined })])).toEqual([]);
  });

  it("un código vacío tampoco", () => {
    expect(puntosConBriefing([punto({ codigo: "  ", clase: "aerodromo" })])).toEqual([]);
  });
});

describe("rutaAUrl", () => {
  it("arma un identificador compartible", () => {
    expect(rutaAUrl(["SADM", "SAAJ", "SAZN"])).toBe("SADM-SAAJ-SAZN");
  });

  it("es reversible con parsearRuta", () => {
    // El estado del planificador vive en la URL, así que esta vuelta tiene que cerrar
    // o un link compartido abre otro plan.
    const codigos = ["SADM", "SAAJ", "SADM"];
    expect(parsearRuta(rutaAUrl(codigos))).toEqual(codigos);
  });
});

describe("aCampoRoute", () => {
  it("guarda el primero y el último", () => {
    expect(aCampoRoute(["SADM", "SAAJ"])).toBe("SADM SAAJ");
  });

  it("los puntos del medio se pierden, y es a propósito", () => {
    /*
      El precio de no tocar `splitRoute`, que tiene doce consumidores y un test que le
      fija el contrato de dos elementos. La bitácora contesta "de dónde a dónde
      volaste", y eso sigue siendo cierto.
    */
    expect(aCampoRoute(["SADM", "CHV", "SAAJ"])).toBe("SADM SAAJ");
  });

  it("una ida y vuelta queda como un solo código", () => {
    // Igual que un circuito local en `route.ts`. Repetirlo haría que las agregaciones
    // contaran ese aeródromo dos veces.
    expect(aCampoRoute(["SADM", "SAAJ", "SADM"])).toBe("SADM");
  });

  it("lo que sale de acá lo lee splitRoute sin sorpresas", () => {
    // El contrato del borde, verificado contra la función real y no contra una idea
    // de cómo funciona.
    expect(splitRoute(aCampoRoute(["SADM", "CHV", "SAAJ"]))).toEqual(["SADM", "SAAJ"]);
    expect(splitRoute(aCampoRoute(["SADM", "SAAJ", "SADM"]))).toEqual(["SADM", ""]);
  });

  it("sin puntos no inventa una ruta", () => {
    expect(aCampoRoute([])).toBe("");
    expect(aCampoRoute(["", "  "])).toBe("");
  });
});

describe("puntosCalculables", () => {
  it("devuelve las coordenadas cuando están todas", () => {
    const puntos = [punto(), punto({ codigo: "SAAJ", lat: -34.5459, lon: -60.9305 })];
    expect(puntosCalculables(puntos)).toEqual([
      { lat: -34.6792, lon: -58.6436 },
      { lat: -34.5459, lon: -60.9305 },
    ]);
  });

  it("un punto sin posición anula el cálculo entero, no se saltea", () => {
    /*
      **Saltear sería el error peligroso.** Uniría los dos vecinos con una recta que el
      piloto no va a volar y el total saldría más corto que la realidad, con pinta de
      válido. Null obliga a la pantalla a señalar cuál falta.
    */
    const puntos = [
      punto(),
      punto({ codigo: "ZZZZ", lat: undefined, lon: undefined, resuelto: false }),
      punto({ codigo: "SAAJ", lat: -34.5459, lon: -60.9305 }),
    ];
    expect(puntosCalculables(puntos)).toBeNull();
  });

  it("con menos de dos puntos no hay nada que calcular", () => {
    expect(puntosCalculables([])).toBeNull();
    expect(puntosCalculables([punto()])).toBeNull();
  });
});

describe("variacionDelPlan", () => {
  it("es la del aeródromo de salida", () => {
    const puntos = [punto({ variacionW: 10 }), punto({ codigo: "SAAJ", variacionW: 8 })];
    expect(variacionDelPlan(puntos)).toBe(10);
  });

  it("devuelve null y no cero cuando la salida no la tiene", () => {
    // **Cero es un valor válido en Argentina**: la línea agónica cruza la Patagonia.
    // Confundirlo con "no sé" haría que un dato faltante se viera como un aeródromo
    // justo sobre la agónica.
    expect(variacionDelPlan([punto({ variacionW: undefined })])).toBeNull();
    expect(variacionDelPlan([])).toBeNull();
  });

  it("cero se devuelve como cero, no como null", () => {
    expect(variacionDelPlan([punto({ variacionW: 0 })])).toBe(0);
  });
});

describe("dispersionDeVariacion", () => {
  it("mide cuánto difieren las puntas", () => {
    const puntos = [punto({ variacionW: 10 }), punto({ variacionW: 8 }), punto({ variacionW: -5 })];
    expect(dispersionDeVariacion(puntos)).toBe(15);
  });

  it("un plan corto queda por debajo del umbral", () => {
    // Morón a Junín: 10 contra 8,2. Una variación única sirve.
    const puntos = [punto({ variacionW: 10 }), punto({ variacionW: 8.2 })];
    expect(dispersionDeVariacion(puntos)!).toBeLessThan(DISPERSION_TOLERABLE);
  });

  it("una travesía larga lo supera y hay que avisar", () => {
    // Morón (10 W) a Bariloche (5,4 E): quince grados entre las puntas. Una variación
    // única acá deja de ser inocente.
    const puntos = [punto({ variacionW: 10 }), punto({ variacionW: -5.4 })];
    expect(dispersionDeVariacion(puntos)!).toBeGreaterThan(DISPERSION_TOLERABLE);
  });

  it("null cuando no hay con qué comparar", () => {
    expect(dispersionDeVariacion([punto()])).toBeNull();
    expect(dispersionDeVariacion([punto({ variacionW: undefined }), punto({ variacionW: undefined })])).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */

/**
 * La tabla de prueba es chica a propósito: la función recibe su catálogo justamente para
 * poder testearla con tres aerovías inventadas en vez de con las 220 reales. Que el
 * catálogo real esté bien lo comprueba `aerovias.test.ts`; que la expansión esté bien, esto.
 */
const AEROVIAS: Record<string, string[]> = {
  // Como la UM424 de verdad, recortada.
  UM424: ["ALBAL", "KOTNI", "BOBAP", "ETALU", "EZE"],
  A305: ["EZE", "DORVO"],
  W67: ["BCA", "AKNOS", "OGLER", "OSA"],
};
const buscar = (a: string) => AEROVIAS[a] ?? null;

describe("esAerovia", () => {
  it("reconoce la forma de un designador de ruta ATS", () => {
    expect(esAerovia("A305")).toBe(true);
    expect(esAerovia("W67")).toBe(true);
    expect(esAerovia("UM424")).toBe(true);
    expect(esAerovia("UL211F")).toBe(true);
  });

  it("y no la confunde con lo demás", () => {
    // Los códigos de aeródromo y los fixes no llevan dígitos; las coordenadas y los
    // radiales llevan barra.
    expect(esAerovia("SADM")).toBe(false);
    expect(esAerovia("DORVO")).toBe(false);
    expect(esAerovia("BAR")).toBe(false);
    expect(esAerovia("BAR/045/25")).toBe(false);
    expect(esAerovia("")).toBe(false);
  });
});

describe("expandirAerovias", () => {
  it("reemplaza la aerovía por los puntos que hay entre la entrada y la salida", () => {
    const r = expandirAerovias(["SADM", "ALBAL", "UM424", "EZE", "SAZS"], buscar);
    expect(r.error).toBeNull();
    expect(r.puntos).toEqual(["SADM", "ALBAL", "KOTNI", "BOBAP", "ETALU", "EZE", "SAZS"]);
    expect(r.expandidas).toEqual([{ aerovia: "UM424", desde: "ALBAL", hasta: "EZE", intermedios: 3 }]);
  });

  it("se puede recorrer al revés", () => {
    /*
      El AIP lista los puntos en un sentido, pero la aerovía se vuela en los dos: la
      dirección sólo decide los niveles de crucero pares o impares, que es asunto de un
      plan IFR y no de esta planilla.
    */
    const r = expandirAerovias(["EZE", "UM424", "ALBAL"], buscar);
    expect(r.puntos).toEqual(["EZE", "ETALU", "BOBAP", "KOTNI", "ALBAL"]);
  });

  it("dos aerovías en la misma ruta", () => {
    const r = expandirAerovias(["ALBAL", "UM424", "EZE", "A305", "DORVO"], buscar);
    expect(r.puntos).toEqual(["ALBAL", "KOTNI", "BOBAP", "ETALU", "EZE", "DORVO"]);
    expect(r.expandidas.map((e) => e.aerovia)).toEqual(["UM424", "A305"]);
  });

  it("una ruta sin aerovías queda igual", () => {
    const r = expandirAerovias(["SADM", "DORVO", "SAZS"], buscar);
    expect(r.puntos).toEqual(["SADM", "DORVO", "SAZS"]);
    expect(r.expandidas).toEqual([]);
  });

  it("normaliza y descarta vacíos", () => {
    expect(expandirAerovias([" sadm ", "", "dorvo"], buscar).puntos).toEqual(["SADM", "DORVO"]);
  });

  it("una aerovía que no publicamos pasa como código y falla más adelante", () => {
    /*
      De las 258 que nombra el AIP publicamos 220: las otras no pasaron la validación
      cruzada. Un `T100` tiene que llegar al resolutor de puntos y decir "no lo
      reconocemos" —que es cierto y accionable— en vez de "aerovía inválida", que
      insinuaría que el problema es la sintaxis.
    */
    const r = expandirAerovias(["SADM", "T100", "SAZS"], buscar);
    expect(r.error).toBeNull();
    expect(r.puntos).toEqual(["SADM", "T100", "SAZS"]);
  });

  it("sin punto de entrada o de salida no expande, y explica cómo se escribe", () => {
    expect(expandirAerovias(["UM424", "EZE"], buscar).error).toContain("necesita un punto antes");
    expect(expandirAerovias(["ALBAL", "UM424"], buscar).error).toContain("necesita un punto antes");
  });

  it("**si el punto no está en la aerovía, no adivina**", () => {
    /*
      La alternativa sería tomar la aerovía entera, o el pedazo más parecido. Las dos
      meten en la planilla un tramo que el piloto no escribió, y con pinta de válido. Un
      error visible es mejor que una ruta que no es la que se pidió.
    */
    const r = expandirAerovias(["SADM", "UM424", "EZE"], buscar);
    expect(r.puntos).toEqual([]);
    expect(r.error).toContain("SADM no está en UM424");
    // Y dice por dónde sí pasa, que es lo que hace falta para corregirlo.
    expect(r.error).toContain("ALBAL");
  });

  it("el que falla puede ser el de salida", () => {
    expect(expandirAerovias(["ALBAL", "UM424", "SAZS"], buscar).error).toContain("SAZS no está en UM424");
  });

  it("entrada y salida contiguas no agregan nada", () => {
    const r = expandirAerovias(["ALBAL", "UM424", "KOTNI"], buscar);
    expect(r.puntos).toEqual(["ALBAL", "KOTNI"]);
    expect(r.expandidas[0].intermedios).toBe(0);
  });

  it("corta cuando la ruta expandida no entra en una planilla", () => {
    const larga: Record<string, string[]> = {
      X1: Array.from({ length: 40 }, (_, i) => `P${String(i).padStart(2, "0")}`),
    };
    const r = expandirAerovias(["P00", "X1", "P39"], (a) => larga[a] ?? null);
    expect(r.puntos).toEqual([]);
    expect(r.error).toContain(String(MAX_PUNTOS_EXPANDIDOS));
  });
});
