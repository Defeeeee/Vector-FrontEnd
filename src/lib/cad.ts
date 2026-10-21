/**
 * Los vuelos de Vector, en el formato del CAD de ANAC (Casillero Aeronáutico Digital,
 * "Registro horas vuelo", Res. ANAC 470/2025).
 *
 * ## Cómo llegan al CAD
 *
 * No hay API pública: el CAD sólo acepta vuelos dentro de la sesión del piloto en su
 * navegador. Vector los pasa con un marcador que el piloto toca en la pestaña del CAD
 * (`src/cad/puente.ts`). Ese script le pide los vuelos a una ventanita de Vector
 * (`/cad/conector`) y los crea con la misma API que usa la página. La contraseña de ANAC
 * nunca pasa por Vector. Ver la bitácora del 2026-10-21.
 *
 * ## Qué hay acá
 *
 * Todo lo que no depende de las listas del CAD se arma en el server de Vector
 * (`borradorCad`); lo que sí depende (los IDs de finalidad, aeródromo y autoridad) se
 * resuelve en el CAD (`resolverFinalidad`, `resolverLugar`, `payloadCad`). Lo que se manda
 * es el mismo objeto que arma el formulario "Registrar vuelo" del CAD
 * (`vuelotripulante.create.component.js`, `crear()`), leído el 2026-10-20.
 *
 * **La regla que el CAD valida:** horas de día más horas de noche tiene que ser igual a la
 * diferencia entre la salida y la llegada, con la tabla centesimal de ANAC
 * (`createDecimalFromTime`). Un vuelo que no cumple no se manda: se marca para revisar.
 *
 * Puro.
 */

/* -------------------------------------------------------------------------- */
/* Los IDs del CAD (fijos en su código)                                        */
/* -------------------------------------------------------------------------- */

export const TIPO_VUELO_CAD = { local: 1, travesia: 2 } as const;
export const CARGO_CAD = { piloto: 1, copiloto: 2 } as const;
export const DISCRIMINACION_CAD = {
  instructor: 1,
  multimotor: 2,
  instrumentoReal: 6,
  capota: 7,
} as const;

/** Un ítem de las listas del CAD (`Get…ListItem`). */
export interface ItemCad {
  key: string;
  value: string;
  valueSearch?: string | null;
}

/** Un vuelo ya cargado en el CAD, como lo devuelve `GetPagedList`. */
export interface VueloEnElCad {
  vueloTripulanteID: number;
  /** "2026-10-17T18:00:00": la salida en UTC, sin zona. */
  fechaSalida: string;
  matricula: string | null;
  origenDesc?: string | null;
  destinoDesc?: string | null;
  estadoDesc?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Lo que arma Vector                                                          */
/* -------------------------------------------------------------------------- */

/** Un aeródromo, con los códigos con que lo puede tener el CAD (OACI o designador ANAC). */
export interface LugarParaCad {
  codigo: string;
  candidatos: string[];
  nombre: string | null;
}

export interface BorradorCad {
  vectorId: string;
  /** Para mostrar en el panel: "17/10/2026", "SADF → SADM", "LV-S114", "1.0 h". */
  fecha: string;
  ruta: string;
  matricula: string;
  horas: number;
  tipoVueloID: number;
  cargoID: number;
  /** ISO en UTC, como lo arma el CAD: `fecha + 'T' + hora + ':00Z'`. */
  fechaHoraSalida: string;
  fechaHoraLlegada: string;
  aterrizajes: number;
  clase: string;
  potencia: number | null;
  horasDia: number;
  horasNoche: number;
  origen: LugarParaCad;
  destino: LugarParaCad;
  /** La finalidad como la nombra el CAD ("ENTRENAMIENTO"); el ID se busca allá. */
  finalidad: string;
  discriminaciones: { tipoDiscriminacionID: number; horas: string }[];
  /** Por qué no se puede mandar, o `null`. */
  problema: string | null;
}

/** Lo que Vector sabe del vuelo (`Flight`) que hace falta acá. */
export interface VueloVector {
  id: string;
  date: string;
  route: string;
  landings: number;
  duration: number;
  takeoff?: string | null;
  landing?: string | null;
  purpose?: string | null;
  pic_day_loc?: number | null;
  pic_day_tra?: number | null;
  pic_night_loc?: number | null;
  pic_night_tra?: number | null;
  sic_day_loc?: number | null;
  sic_day_tra?: number | null;
  sic_night_loc?: number | null;
  sic_night_tra?: number | null;
  imc_pil?: number | null;
  imc_cop?: number | null;
  capota?: number | null;
}

export interface AvionVector {
  registration: string;
  type_acft?: string | null;
  potencia_hp?: number | null;
  is_simulator?: boolean | null;
}

/**
 * La finalidad de Vector (las siglas del libro, `FlightLogForm`) con el nombre que le da
 * el CAD en `GetFinalidadListItem`. El ID se busca por nombre en cada carga: así, si ANAC
 * renumera la lista, no se manda una finalidad equivocada.
 */
export const FINALIDAD_CAD: Record<string, string> = {
  ACR: "ACROBACIA",
  ADAP: "ADAPTACIÓN",
  AER: "AEROPLICADOR",
  CI: "COMBATE CONTRA INCENDIOS DE BOSQUES Y CAMPOS",
  ENT: "ENTRENAMIENTO",
  EXA: "EXAMEN",
  FOR: "VUELO EN FORMACIÓN",
  FOT: "FOTOGRAFÍA",
  I: "INSTRUCTOR",
  INST: "INSTRUCCIÓN",
  IP: "INSPECTOR",
  LP: "LANZAMIENTO DE PARACAIDISTAS",
  VP: "VUELO PRIVADO",
  READ: "READAPTACIÓN",
  RP: "REMOLQUE DE PLANEADORES",
  SAN: "SANITARIO",
  TA: "TRABAJO AÉREO",
  TAXI: "TAXI AÉREO",
  VO: "VUELO OFICIAL",
  PA: "PRUEBA DE AERONAVES",
};

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const unDecimal = (v: number) => Math.round(v * 10) / 10;

/**
 * Las horas entre la salida y la llegada, con la tabla de ANAC, igual que el CAD
 * (`createDecimalFromTime`): días y horas enteros, y los minutos sueltos en décimas.
 */
export function horasCentesimalesCad(salidaIso: string, llegadaIso: string): number | null {
  const a = Date.parse(salidaIso);
  const b = Date.parse(llegadaIso);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  let diff = b - a;
  const dias = Math.floor(diff / 86_400_000);
  diff -= dias * 86_400_000;
  let horas = Math.floor(diff / 3_600_000);
  diff -= horas * 3_600_000;
  const minutos = Math.floor(diff / 60_000);
  let decimal = 0;
  if (minutos >= 3 && minutos <= 8) decimal = 0.1;
  if (minutos >= 9 && minutos <= 14) decimal = 0.2;
  if (minutos >= 15 && minutos <= 20) decimal = 0.3;
  if (minutos >= 21 && minutos <= 26) decimal = 0.4;
  if (minutos >= 27 && minutos <= 33) decimal = 0.5;
  if (minutos >= 34 && minutos <= 39) decimal = 0.6;
  if (minutos >= 40 && minutos <= 45) decimal = 0.7;
  if (minutos >= 46 && minutos <= 51) decimal = 0.8;
  if (minutos >= 52 && minutos <= 57) decimal = 0.9;
  if (minutos >= 58) horas++;
  return unDecimal(dias * 24 + horas + decimal);
}

/** "LVS114" → "LV-S114", como la escribe el registro de ANAC. */
export function matriculaCad(matricula: string): string {
  const m = matricula.trim().toUpperCase().replace(/\s+/g, "");
  if (/^LV-/.test(m) || !/^LV[A-Z0-9]/.test(m)) return m;
  return `LV-${m.slice(2)}`;
}

/** La clase del avión como la pide el CAD: los acuáticos de Vector (MONT-H) son MON-A. */
export function claseCad(tipo: string | null | undefined): string | null {
  const t = (tipo ?? "").trim().toUpperCase();
  if (t === "MONT-T" || t === "MULT-T") return t;
  if (t === "MONT-H" || t === "MON-A") return "MON-A";
  if (t === "MULT-H" || t === "MULT-A") return "MULT-A";
  return null;
}

/** "2026-10-17T18:00:00.000Z": el ISO al minuto, como `new Date(fecha+'T'+hora+':00Z')`. */
function isoAlMinuto(v: string | null | undefined): string | null {
  const ms = Date.parse(v ?? "");
  if (!Number.isFinite(ms)) return null;
  return new Date(Math.floor(ms / 60_000) * 60_000).toISOString();
}

/**
 * El vuelo de Vector armado para el CAD, con todo lo que no depende de sus listas. Si algo
 * impide mandarlo, va en `problema` y el panel lo muestra para cargarlo a mano.
 *
 * `lugar` traduce un código de la ruta a sus candidatos (OACI y designador ANAC), con el
 * directorio de aeródromos del server.
 */
export function borradorCad(
  f: VueloVector,
  avion: AvionVector | null,
  lugar: (codigo: string) => LugarParaCad
): BorradorCad {
  const partes = (f.route ?? "").trim().toUpperCase().split(/\s+/).filter(Boolean);
  const origen = lugar(partes[0] ?? "");
  const destino = lugar(partes[partes.length - 1] ?? partes[0] ?? "");

  const pic = n(f.pic_day_loc) + n(f.pic_day_tra) + n(f.pic_night_loc) + n(f.pic_night_tra);
  const sic = n(f.sic_day_loc) + n(f.sic_day_tra) + n(f.sic_night_loc) + n(f.sic_night_tra);
  const copiloto = sic > 0 && pic === 0;
  const horasDia = unDecimal(copiloto ? n(f.sic_day_loc) + n(f.sic_day_tra) : n(f.pic_day_loc) + n(f.pic_day_tra));
  const horasNoche = unDecimal(copiloto ? n(f.sic_night_loc) + n(f.sic_night_tra) : n(f.pic_night_loc) + n(f.pic_night_tra));
  const travesia =
    n(f.pic_day_tra) + n(f.pic_night_tra) + n(f.sic_day_tra) + n(f.sic_night_tra) > 0 || origen.codigo !== destino.codigo;

  const salida = isoAlMinuto(f.takeoff);
  const llegada = isoAlMinuto(f.landing);
  const horas = salida && llegada ? horasCentesimalesCad(salida, llegada) : null;
  const clase = claseCad(avion?.type_acft);
  const proposito = (f.purpose ?? "").trim().toUpperCase();
  const finalidad = FINALIDAD_CAD[proposito] ?? "";

  const discriminaciones: BorradorCad["discriminaciones"] = [];
  const total = (horas ?? 0).toFixed(1);
  if (proposito === "I") discriminaciones.push({ tipoDiscriminacionID: DISCRIMINACION_CAD.instructor, horas: total });
  if (clase?.startsWith("MULT")) discriminaciones.push({ tipoDiscriminacionID: DISCRIMINACION_CAD.multimotor, horas: total });
  const imc = copiloto ? n(f.imc_cop) : n(f.imc_pil);
  if (imc > 0) discriminaciones.push({ tipoDiscriminacionID: DISCRIMINACION_CAD.instrumentoReal, horas: unDecimal(imc).toFixed(1) });
  if (n(f.capota) > 0) discriminaciones.push({ tipoDiscriminacionID: DISCRIMINACION_CAD.capota, horas: unDecimal(n(f.capota)).toFixed(1) });

  let problema: string | null = null;
  if (avion?.is_simulator) problema = "Es una sesión de simulador: en el CAD va con los datos del simulador, cargala a mano.";
  else if (pic > 0 && sic > 0) problema = "Tiene horas de piloto y de copiloto: el CAD las pide por separado.";
  else if (!salida || !llegada) problema = "Le falta la hora de salida o de llegada.";
  else if (horas === null) problema = "La llegada no es posterior a la salida.";
  else if (unDecimal(horasDia + horasNoche) !== horas)
    problema = `Las horas de día y de noche (${unDecimal(horasDia + horasNoche).toFixed(1)}) no dan lo que va de la salida a la llegada (${horas.toFixed(1)}).`;
  else if (!avion?.registration) problema = "No tiene avión.";
  else if (!clase) problema = "Al avión le falta la clase (MONT-T, MULT-T…) en el Hangar.";
  else if (!finalidad) problema = `La finalidad "${f.purpose ?? ""}" no tiene par en el CAD.`;
  else if (!origen.codigo) problema = "No tiene ruta.";

  const [y, m, d] = (f.date ?? "").slice(0, 10).split("-");
  return {
    vectorId: f.id,
    fecha: d && m && y ? `${d}/${m}/${y}` : f.date,
    ruta: origen.codigo === destino.codigo ? `${origen.codigo} (local)` : `${origen.codigo} → ${destino.codigo}`,
    matricula: avion?.registration ? matriculaCad(avion.registration) : "",
    horas: horas ?? n(f.duration),
    tipoVueloID: travesia ? TIPO_VUELO_CAD.travesia : TIPO_VUELO_CAD.local,
    cargoID: copiloto ? CARGO_CAD.copiloto : CARGO_CAD.piloto,
    fechaHoraSalida: salida ?? "",
    fechaHoraLlegada: llegada ?? "",
    aterrizajes: Math.max(0, Math.round(n(f.landings))),
    clase: clase ?? "",
    potencia: avion?.potencia_hp ? Number(avion.potencia_hp) : null,
    horasDia,
    horasNoche,
    origen,
    destino,
    finalidad,
    discriminaciones,
    problema,
  };
}

/* -------------------------------------------------------------------------- */
/* Lo que se resuelve en el CAD                                                */
/* -------------------------------------------------------------------------- */

/** Sin tildes y en mayúsculas, para comparar nombres de las listas del CAD. */
export function normalizarCad(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}

/** El ID de la finalidad, buscada por nombre. `null` si el CAD no la tiene. */
export function resolverFinalidad(nombre: string, lista: ItemCad[]): string | null {
  const buscado = normalizarCad(nombre);
  if (!buscado) return null;
  return lista.find((i) => normalizarCad(i.value) === buscado)?.key ?? null;
}

/**
 * El ID del aeródromo en la lista del CAD (`GetLugarAterrizajeListItem`), cuyo texto es
 * " SADF (SAN FERNANDO)": el código va antes del paréntesis. Se prueba cada candidato
 * (OACI, designador ANAC) y sólo se acepta una coincidencia exacta de código: elegir otro
 * aeródromo por el nombre sería declarar un vuelo que no se hizo.
 */
export function resolverLugar(lugar: LugarParaCad, lista: ItemCad[]): string | null {
  const codigos = new Set(lugar.candidatos.map((c) => c.trim().toUpperCase()).filter(Boolean));
  for (const item of lista) {
    const codigo = (item.value ?? "").trim().split(/\s*\(/)[0].trim().toUpperCase();
    if (codigos.has(codigo)) return item.key;
  }
  return null;
}

/**
 * Si el vuelo ya está en el CAD: misma salida al minuto y misma matrícula. Devuelve su id.
 * El CAD guarda la salida en UTC sin zona ("2026-10-17T18:00:00").
 */
export function yaEstaEnElCad(b: Pick<BorradorCad, "fechaHoraSalida" | "matricula">, enElCad: VueloEnElCad[]): number | null {
  const salida = b.fechaHoraSalida.slice(0, 16);
  if (!salida) return null;
  const matricula = matriculaCad(b.matricula);
  const igual = enElCad.find((v) => (v.fechaSalida ?? "").slice(0, 16) === salida && matriculaCad(v.matricula ?? "") === matricula);
  return igual ? igual.vueloTripulanteID : null;
}

/** Lo que manda "Crear" del CAD, con los IDs ya resueltos. */
export function payloadCad(
  b: BorradorCad,
  ids: { finalidadID: string; origenID: string; destinoID: string; autoridadID: string; autoridadNombre: string }
) {
  return {
    Discriminaciones: b.discriminaciones,
    discriminaciones: [],
    tipoVueloID: String(b.tipoVueloID),
    fechaHoraSalida: b.fechaHoraSalida,
    fechaHoraLlegada: b.fechaHoraLlegada,
    aterrizajes: b.aterrizajes,
    autoridadCertificanteID: ids.autoridadID,
    observaciones: ids.autoridadNombre,
    finalidadID: ids.finalidadID,
    potencia: b.potencia ?? "",
    clase: b.clase,
    horasDia: b.horasDia,
    horasNoche: b.horasNoche,
    cargoID: String(b.cargoID),
    origenID: ids.origenID,
    destinoID: ids.destinoID,
    origenPersonalizado: "",
    destinoPersonalizado: "",
    matriculaAvion: b.matricula,
  };
}
