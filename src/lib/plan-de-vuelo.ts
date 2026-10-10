import { clasificarToken } from "./puntos";

/**
 * El plan de vuelo OACI, casilla por casilla, a partir de lo que ya calculó el planificador.
 *
 * **Fuentes** (resumidas en `docs/normativa/plan-de-vuelo-eana.md`):
 * - AIP Argentina **ENR 1.10**, Apéndice 1: el formulario modelo OACI y las instrucciones
 *   para completarlo (AIRAC AMDT 2/2024 y 2/2025). Cada regla de abajo cita su casilla.
 * - **AIC A 19/2026**: se presenta por mail, firmado, en PDF, a la oficina ARO/AIS.
 *
 * Lo que **no** hace este archivo es decidir por el piloto lo que sólo él sabe: el equipo
 * de la casilla 10, el equipo de supervivencia, cuántos van a bordo. Eso entra tal cual
 * lo marca en la pantalla, y lo único que se le agrega es el formato.
 *
 * Puro y sin fechas del reloj: la hora la elige el piloto y entra como texto.
 */

/**
 * La hora oficial argentina es UTC−3 todo el año: no hay horario de verano desde 2009.
 * Si eso cambia, éste es el único lugar que hay que tocar.
 */
export const DESFASE_ARGENTINA_HORAS = -3;

/* -------------------------------------------------------------------------- */
/* Formatos                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Texto apto para un mensaje ATS: mayúsculas, sin acentos, y sólo letras, números y
 * espacios. ENR 1.10, casilla 18: "Los guiones o barras oblicuas sólo deben usarse como se
 * estipula"; y un paréntesis cerraría el mensaje FPL antes de tiempo.
 */
export function textoAts(texto: string): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Texto de la información suplementaria (casilla 19: A/, N/, C/ y quien presenta).
 * **No viaja en el mensaje FPL**, así que no tiene sus restricciones: un teléfono se
 * escribe `+5491168862612` y no `5491168862612`. Mayúsculas y sin acentos, como el resto.
 */
export function textoFormulario(texto: string): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 +.,:/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Casilla 7: la matrícula "sin exceder de 7 caracteres alfanuméricos y sin guiones o
 * símbolos" (p. ej., LVGVE). `LV-ABC` → `LVABC`.
 */
export function identificacionAeronave(matricula: string): string {
  return (matricula ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

/** Casilla 15 a): la TAS en nudos, "N seguida de 4 cifras (p. ej., N0485)". */
export function velocidadCrucero(tasKt: number): string {
  return `N${String(Math.round(tasKt)).padStart(4, "0")}`;
}

/**
 * Casilla 15 b): "Altitud en centenares de pies, expresada mediante una A seguida de 3
 * cifras (p. ej., A045)", o "respecto a los vuelos VFR no controlados, las letras VFR".
 */
export function nivelCrucero(altitudFt: number | null): string {
  if (altitudFt === null || !(altitudFt > 0)) return "VFR";
  return `A${String(Math.round(altitudFt / 100)).padStart(3, "0")}`;
}

/**
 * Casilla 15 c) 2), "grados y minutos (11 caracteres)": `4620N07805W`. Se redondea al
 * minuto más cercano; 59,6' sube al grado siguiente en vez de escribir "60".
 */
export function coordenadaOaci(lat: number, lon: number): string {
  const parte = (valor: number, digitosGrado: number, pos: string, neg: string) => {
    const totalMin = Math.round(Math.abs(valor) * 60);
    const grados = Math.floor(totalMin / 60);
    const minutos = totalMin % 60;
    return `${String(grados).padStart(digitosGrado, "0")}${String(minutos).padStart(2, "0")}${valor < 0 ? neg : pos}`;
  };
  return parte(lat, 2, "N", "S") + parte(lon, 3, "E", "W");
}

/** Duraciones "con 4 cifras (horas y minutos)" (ENR 1.10, 2.1): 105 min → `0145`. */
export function duracionHhmm(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}${String(total % 60).padStart(2, "0")}`;
}

/**
 * Casilla 19, E/: la autonomía de combustible. **Se redondea para abajo**: declarar un
 * minuto que no se tiene es la única dirección en la que este redondeo importa.
 */
export function autonomiaHhmm(litros: number, consumoLh: number): string | null {
  if (!(litros > 0) || !(consumoLh > 0)) return null;
  return duracionHhmm(Math.floor((litros / consumoLh) * 60));
}

/**
 * La salida en hora argentina a lo que pide el plan: la hora UTC de la casilla 13 ("las
 * horas con 4 cifras UTC", ENR 1.10, 2.1) y la fecha de DOF/ en la casilla 18.
 *
 * **DOF/ es la fecha UTC, no la local.** Una salida a las 22:00 del 10 de octubre en
 * Argentina es la 01:00 del 11 en UTC, y el plan dice 11.
 */
export function salidaUtc(fechaLocal: string, horaLocal: string): { hora: string; dof: string } | null {
  const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaLocal ?? "");
  const h = /^(\d{1,2}):(\d{2})$/.exec(horaLocal ?? "");
  if (!f || !h || Number(h[1]) > 23 || Number(h[2]) > 59) return null;
  const ms =
    Date.UTC(Number(f[1]), Number(f[2]) - 1, Number(f[3]), Number(h[1]), Number(h[2])) -
    DESFASE_ARGENTINA_HORAS * 3_600_000;
  const d = new Date(ms);
  const dos = (n: number) => String(n).padStart(2, "0");
  return {
    hora: `${dos(d.getUTCHours())}${dos(d.getUTCMinutes())}`,
    dof: `${dos(d.getUTCFullYear() % 100)}${dos(d.getUTCMonth() + 1)}${dos(d.getUTCDate())}`,
  };
}

/* -------------------------------------------------------------------------- */
/* Aeródromos                                                                  */
/* -------------------------------------------------------------------------- */

export interface AerodromoPlan {
  /** El código con el que se cargó: ICAO (`SADF`) o designador ANAC (`CNL`). */
  codigo: string;
  nombre: string;
  lat?: number;
  lon?: number;
}

/**
 * Casillas 13 y 16: el indicador OACI de cuatro letras, "O, si no se ha asignado
 * indicador de lugar, INSÉRTESE ZZZZ e INDÍQUESE en la Casilla 18 el nombre y lugar del
 * aeródromo" (DEP/, DEST/ o ALTN/). El lugar va en coordenadas para "aeródromos que no
 * aparecen en la publicación de información aeronáutica", que es el caso de casi todos
 * los que tienen sólo designador ANAC.
 */
export function indicadorDeLugar(ad: AerodromoPlan): { casilla: string; otrosDatos?: string } {
  const codigo = (ad.codigo ?? "").trim().toUpperCase();
  if (/^[A-Z]{4}$/.test(codigo)) return { casilla: codigo };
  const lugar = ad.lat !== undefined && ad.lon !== undefined ? ` ${coordenadaOaci(ad.lat, ad.lon)}` : "";
  return { casilla: "ZZZZ", otrosDatos: `${textoAts(ad.nombre || codigo)}${lugar}` };
}

/* -------------------------------------------------------------------------- */
/* La ruta (casilla 15 c)                                                      */
/* -------------------------------------------------------------------------- */

/** Un elemento de la ruta entre la salida y el destino, ya resuelto por el planificador. */
export type ElementoRuta =
  | { tipo: "aerovia"; designador: string }
  | { tipo: "aerodromo" | "radioayuda" | "fix" | "coordenada" | "radial"; codigo: string; lat?: number; lon?: number };

type Item15 = { texto: string; aerovia: boolean; geografico: boolean };

/**
 * Un punto como lo pide la casilla 15 c) 2):
 * - radioayuda o punto significativo: su designador (`BAR`, `DORVO`);
 * - coordenada: grados y minutos, `3441S05838W`;
 * - radial y distancia: "la identificación del punto de referencia seguida de la marcación
 *   desde el punto, con 3 cifras, dando los grados magnéticos, seguida de la distancia
 *   desde el punto, con 3 cifras" — `BAR/045/25` → `BAR045025`. El radial del
 *   planificador ya es magnético (`lib/puntos.ts`), que es lo que se pide;
 * - un aeródromo intermedio, con su indicador (`SAAJ`) o su designador ANAC (`ATE`): así
 *   lo escribió Federico en el plan que EANA le aceptó el 10/10/2026, y la AIP reconoce
 *   los "indicadores de lugares nacionales de tres letras" (casillas 13 y 16). Sin
 *   código válido, va en coordenadas.
 */
function puntoItem15(e: Exclude<ElementoRuta, { tipo: "aerovia" }>): Item15 | null {
  if (e.tipo === "radial") {
    const t = clasificarToken(e.codigo);
    if (t?.tipo !== "radial") return null;
    const nm = Math.round(t.distanciaNm);
    if (nm > 999) return null;
    return {
      texto: `${t.estacion}${String(t.radial).padStart(3, "0")}${String(nm).padStart(3, "0")}`,
      aerovia: false,
      geografico: true,
    };
  }
  if (e.tipo === "aerodromo" && /^[A-Z0-9]{3,4}$/.test(e.codigo.trim().toUpperCase())) {
    return { texto: e.codigo.trim().toUpperCase(), aerovia: false, geografico: false };
  }
  if (e.tipo === "coordenada" || e.tipo === "aerodromo") {
    if (e.lat === undefined || e.lon === undefined) return null;
    return { texto: coordenadaOaci(e.lat, e.lon), aerovia: false, geografico: true };
  }
  const codigo = e.codigo.trim().toUpperCase();
  return /^[A-Z0-9]{2,5}$/.test(codigo) ? { texto: codigo, aerovia: false, geografico: false } : null;
}

/**
 * La descripción de la ruta, casilla 15 c).
 *
 * - "INSÉRTESE DCT entre puntos sucesivos, a no ser que ambos puntos estén definidos por
 *   coordenadas geográficas o por marcación y distancia."
 * - Al lado de una aerovía no va DCT: se entra por un punto y se sale por otro
 *   (`BCA W67 OSA`), que es la misma sintaxis que ya acepta el planificador.
 * - La salida y el destino cuentan como puntos, así que un vuelo fuera de aerovías
 *   empieza y termina con DCT: `DCT ATE DCT`, como lo acepta EANA (el ejemplo de
 *   Federico del 10/10/2026). Sin puntos intermedios, la ruta entera es `DCT`.
 *
 * `null` si algún elemento no se puede escribir: mejor frenar que mandar una ruta a la
 * que le falta un punto.
 */
export function rutaItem15(elementos: ElementoRuta[]): string | null {
  const items: Item15[] = [];
  for (const e of elementos) {
    if (e.tipo === "aerovia") {
      const d = e.designador.trim().toUpperCase();
      if (!/^[A-Z0-9]{2,7}$/.test(d)) return null;
      items.push({ texto: d, aerovia: true, geografico: false });
      continue;
    }
    const p = puntoItem15(e);
    if (!p) return null;
    items.push(p);
  }
  if (items.length === 0) return "DCT";

  const partes: string[] = [];
  let anterior: Item15 | null = null;
  for (const it of items) {
    const sinDct =
      it.aerovia ||
      anterior?.aerovia ||
      (anterior !== null && anterior.geografico && it.geografico);
    if (!sinDct) partes.push("DCT");
    partes.push(it.texto);
    anterior = it;
  }
  if (!anterior?.aerovia) partes.push("DCT");
  return partes.join(" ");
}

/* -------------------------------------------------------------------------- */
/* Casilla 18                                                                  */
/* -------------------------------------------------------------------------- */

/** El orden en que la ENR 1.10 enumera los indicadores de la casilla 18. */
const ORDEN_18 = [
  "STS", "PBN", "NAV", "COM", "DAT", "SUR", "DEP", "DEST", "DOF", "REG", "EET", "SEL",
  "TYP", "CODE", "DLE", "OPR", "ORGN", "PER", "ALTN", "RALT", "TALT", "RIF", "RMK",
] as const;
export type Indicador18 = (typeof ORDEN_18)[number];

/**
 * "INSÉRTESE 0 (cero) si no hay otros datos, O, cualquier otra información necesaria en
 * el orden indicado a continuación". Los vacíos no se escriben.
 */
export function casilla18(datos: Partial<Record<Indicador18, string>>): string {
  const partes = ORDEN_18.flatMap((ind) => {
    const v = (datos[ind] ?? "").trim();
    return v ? [`${ind}/${v}`] : [];
  });
  return partes.length ? partes.join(" ") : "0";
}

/* -------------------------------------------------------------------------- */
/* El plan entero                                                              */
/* -------------------------------------------------------------------------- */

export interface DatosPlanDeVuelo {
  matricula: string;
  reglas: "V" | "I" | "Y" | "Z";
  tipoVuelo: "G" | "S" | "N" | "M" | "X";
  /** Designador OACI de tipo (Doc 8643): `C152`, `PA11`. Vacío = ZZZZ y TYP/. */
  tipoAeronave: string;
  /** Para TYP/ cuando no hay designador: la marca y modelo. */
  descripcionAeronave: string;
  estela: "L" | "M" | "H" | "J";
  /** Casilla 10 a), tal cual: `S`, `VG`, `SDFG`… */
  equipo: string;
  /** Casilla 10 b): `N`, `C`, `S`… */
  vigilancia: string;
  salida: AerodromoPlan;
  destino: AerodromoPlan;
  alternativas: AerodromoPlan[];
  /** En hora argentina, como lo carga el piloto. */
  fechaLocal: string;
  horaLocal: string;
  tasKt: number;
  /** `null` = VFR no controlado, se escribe "VFR". */
  altitudFt: number | null;
  ruta: ElementoRuta[];
  /** Duración total prevista, del planificador (con el viento cargado). */
  minutosTotales: number;
  /** Autonomía: combustible a bordo y consumo. */
  litros: number;
  consumoLh: number;
  operador: string;
  observaciones: string;
  /** NAV/ en la casilla 18: la aumentación GNSS, p. ej. `ABAS` (Nota 2 de la casilla 10). */
  nav: string;
  /** PER/: la categoría de performance del PANS-OPS (A si la velocidad de umbral es menor a 91 kt). */
  per: string;
  personas: string;
  radio: { uhf: boolean; vhf: boolean; elt: boolean };
  supervivencia: { lleva: boolean; polar: boolean; desierto: boolean; maritimo: boolean; selva: boolean };
  chalecos: { lleva: boolean; luz: boolean; fluoresceina: boolean; uhf: boolean; vhf: boolean };
  botes: { lleva: boolean; numero: string; capacidad: string; cubierta: boolean; color: string };
  colorMarcas: string;
  observacionesSupervivencia: string;
  piloto: string;
  presentadoPor: string;
}



/** Lo que va en el formulario, ya en el formato de cada casilla. */
export interface PlanOaci {
  c7: string;
  c8reglas: string;
  c8tipo: string;
  c9numero: string;
  c9tipo: string;
  c9estela: string;
  c10a: string;
  c10b: string;
  c13ad: string;
  c13hora: string;
  c15velocidad: string;
  c15nivel: string;
  c15ruta: string;
  c16ad: string;
  c16eet: string;
  c16altn1: string;
  c16altn2: string;
  c18: string;
  /** La fecha de DOF/ (AAMMDD), también para el nombre del archivo. */
  dof: string;
  c19: {
    autonomia: string;
    personas: string;
    /** `true` = disponible; `false` = se tacha. */
    radio: { u: boolean; v: boolean; e: boolean };
    supervivencia: { s: boolean; p: boolean; d: boolean; m: boolean; j: boolean };
    chalecos: { j: boolean; l: boolean; f: boolean; u: boolean; v: boolean };
    botes: { d: boolean; numero: string; capacidad: string; c: boolean; color: string };
    colorMarcas: string;
    /** `null` = sin observaciones: se tacha la N. */
    observaciones: string | null;
    piloto: string;
  };
  presentadoPor: string;
}

export interface FaltaPlan {
  casilla: string;
  mensaje: string;
}

/**
 * Arma el plan y dice qué falta. **Con faltas igual devuelve el plan**, para que la
 * pantalla lo muestre a medio hacer, pero el PDF no se baja hasta que no haya ninguna:
 * la ARO "comprobará que han sido completadas con exactitud, todas las casillas (de la 7
 * hasta la 19 inclusive)" (PROGEN-ARO, 4.1.9).
 */
export function armarPlan(d: DatosPlanDeVuelo): { plan: PlanOaci; faltas: FaltaPlan[] } {
  const faltas: FaltaPlan[] = [];
  const falta = (casilla: string, mensaje: string) => faltas.push({ casilla, mensaje });

  const c7 = identificacionAeronave(d.matricula);
  if (!c7) falta("7", "Falta la matrícula.");

  const tipo = (d.tipoAeronave ?? "").trim().toUpperCase();
  const tipoValido = /^[A-Z0-9]{2,4}$/.test(tipo);
  if (!tipoValido && !textoAts(d.descripcionAeronave)) {
    falta("9", "Falta el tipo de aeronave (designador OACI, p. ej. C152).");
  }

  const equipo = (d.equipo ?? "").trim().toUpperCase();
  if (!equipo) falta("10", "Marcá el equipo de comunicaciones y navegación (N si no llevás).");
  const vigilancia = (d.vigilancia ?? "").trim().toUpperCase();
  if (!vigilancia) falta("10", "Marcá el transponder (N si no tenés).");

  const salida = indicadorDeLugar(d.salida);
  const destino = indicadorDeLugar(d.destino);
  const alternativas = d.alternativas.filter((a) => a.codigo.trim()).slice(0, 2).map(indicadorDeLugar);

  const hora = salidaUtc(d.fechaLocal, d.horaLocal);
  if (!hora) falta("13", "Falta la fecha y la hora de salida (fuera de calzos).");

  if (!(d.tasKt > 0)) falta("15", "Falta la velocidad de crucero.");
  const ruta = rutaItem15(d.ruta);
  if (ruta === null) falta("15", "Hay un punto de la ruta que no se puede escribir en formato OACI.");

  if (!(d.minutosTotales > 0)) falta("16", "Falta la duración total: completá la ruta en el planificador.");

  const autonomia = autonomiaHhmm(d.litros, d.consumoLh);
  if (!autonomia) falta("19", "Cargá el combustible a bordo en el planificador: de ahí sale la autonomía.");

  const p = d.personas.trim().toUpperCase();
  const personas = /^\d{1,3}$/.test(p) && Number(p) > 0 ? String(Number(p)) : p === "TBN" ? "TBN" : "";
  if (!personas) falta("19", "Faltan las personas a bordo (o TBN si todavía no sabés).");

  const piloto = textoFormulario(d.piloto);
  if (!piloto) falta("19", "Falta el nombre del piloto al mando.");

  const altn = alternativas.flatMap((a) => (a.otrosDatos ? [a.otrosDatos] : []));
  const per = (d.per ?? "").trim().toUpperCase();
  const c18 = casilla18({
    NAV: textoAts(d.nav),
    DEP: salida.otrosDatos,
    DEST: destino.otrosDatos,
    DOF: hora?.dof,
    TYP: tipoValido ? undefined : textoAts(d.descripcionAeronave),
    OPR: textoAts(d.operador),
    PER: /^[A-E]$/.test(per) ? per : undefined,
    ALTN: altn.join(" "),
    RMK: textoAts(d.observaciones),
  });

  const plan: PlanOaci = {
    c7,
    c8reglas: d.reglas,
    c8tipo: d.tipoVuelo,
    c9numero: "",
    c9tipo: tipoValido ? tipo : "ZZZZ",
    c9estela: d.estela,
    c10a: equipo,
    c10b: vigilancia,
    c13ad: salida.casilla,
    c13hora: hora?.hora ?? "",
    c15velocidad: d.tasKt > 0 ? velocidadCrucero(d.tasKt) : "",
    c15nivel: nivelCrucero(d.altitudFt),
    c15ruta: ruta ?? "",
    c16ad: destino.casilla,
    c16eet: d.minutosTotales > 0 ? duracionHhmm(d.minutosTotales) : "",
    c16altn1: alternativas[0]?.casilla ?? "",
    c16altn2: alternativas[1]?.casilla ?? "",
    c18,
    dof: hora?.dof ?? "",
    c19: {
      autonomia: autonomia ?? "",
      personas,
      radio: { u: d.radio.uhf, v: d.radio.vhf, e: d.radio.elt },
      supervivencia: {
        s: d.supervivencia.lleva,
        p: d.supervivencia.lleva && d.supervivencia.polar,
        d: d.supervivencia.lleva && d.supervivencia.desierto,
        m: d.supervivencia.lleva && d.supervivencia.maritimo,
        j: d.supervivencia.lleva && d.supervivencia.selva,
      },
      chalecos: {
        j: d.chalecos.lleva,
        l: d.chalecos.lleva && d.chalecos.luz,
        f: d.chalecos.lleva && d.chalecos.fluoresceina,
        u: d.chalecos.lleva && d.chalecos.uhf,
        v: d.chalecos.lleva && d.chalecos.vhf,
      },
      botes: {
        d: d.botes.lleva,
        numero: d.botes.lleva ? d.botes.numero.replace(/\D/g, "").slice(0, 2) : "",
        capacidad: d.botes.lleva ? d.botes.capacidad.replace(/\D/g, "").slice(0, 3) : "",
        c: d.botes.lleva && d.botes.cubierta,
        color: d.botes.lleva ? textoFormulario(d.botes.color) : "",
      },
      colorMarcas: textoFormulario(d.colorMarcas),
      observaciones: textoFormulario(d.observacionesSupervivencia) || null,
      piloto,
    },
    // Vacío si no se escribió: así lo presentó Federico y se lo aceptaron.
    presentadoPor: textoFormulario(d.presentadoPor),
  };

  return { plan, faltas };
}

/**
 * El mensaje FPL en una línea, para copiar o revisar: `(FPL-LVABC-VG -C152/L-…)`.
 * Es lo que la oficina carga en el sistema; la casilla 19 no viaja en el mensaje.
 */
export function mensajeFpl(p: PlanOaci): string {
  const c9 = `${p.c9numero}${p.c9tipo}/${p.c9estela}`;
  const altn = [p.c16altn1, p.c16altn2].filter(Boolean).join(" ");
  return (
    `(FPL-${p.c7}-${p.c8reglas}${p.c8tipo}` +
    `-${c9}-${p.c10a}/${p.c10b}` +
    `-${p.c13ad}${p.c13hora}` +
    `-${p.c15velocidad}${p.c15nivel} ${p.c15ruta}` +
    `-${p.c16ad}${p.c16eet}${altn ? ` ${altn}` : ""}` +
    `-${p.c18})`
  );
}

/**
 * "indicando en el asunto del correo electrónico el Nro. de vuelo/matricula" (AIC A
 * 19/2026). Con la salida y la fecha, para que la oficina lo encuentre si hay dos del
 * mismo avión en el día.
 */
export function asuntoDelMail(p: PlanOaci, fechaLocal: string): string {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaLocal) ? ` ${fechaLocal.split("-").reverse().join("/")}` : "";
  const salida = p.c13hora ? ` ${p.c13ad} ${p.c13hora}Z` : "";
  return `FPL ${p.c7}${salida}${fecha}`;
}

/**
 * El nombre del PDF, como el que Federico presentó el 10/10/2026:
 * `LVS114-SADF1530SADF_101026.pdf` — matrícula, salida y hora UTC, destino, y la fecha
 * de DOF/ como DDMMAA.
 */
export function nombreDelArchivo(p: PlanOaci): string {
  const fecha = /^\d{6}$/.test(p.dof) ? `_${p.dof.slice(4, 6)}${p.dof.slice(2, 4)}${p.dof.slice(0, 2)}` : "";
  return `${p.c7 || "FPL"}-${p.c13ad}${p.c13hora}${p.c16ad}${fecha}.pdf`;
}
