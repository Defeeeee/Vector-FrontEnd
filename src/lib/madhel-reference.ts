import { getAirport } from "./airports";

/**
 * Puente entre los códigos que escribe un piloto y lo que espera la API de
 * MADHEL, que se indexa por el designador ANAC de tres letras.
 *
 * Server-only: `getAirport` lee del disco.
 *
 * Esto reemplaza a una tabla `ICAO_TO_ANAC` escrita a mano que estaba duplicada
 * en tres rutas y **mal en seis de sus cuarenta y cinco entradas**. Contrastadas
 * contra `madhel.tsv`:
 *
 *   SAWE -> USU   pero SAWE es Río Grande (GRA), no Ushuaia
 *   SAZY -> ECA   pero SAZY es San Martín de los Andes (CHP), no El Calafate
 *   SAWD -> MAD   pero SAWD es Puerto Deseado (ADO), no Puerto Madryn
 *   SACO -> FMA   pero Córdoba es CBA; FMA es Formosa
 *   SAWC -> CAL   pero El Calafate es ECA
 *   SADP/SADL     invertidos entre sí
 *
 * El resto se cubría con un heurístico de "sacale la primera letra al ICAO",
 * que acierta de casualidad: SADM daría ADM cuando Morón es MOR.
 *
 * El directorio ya tiene los 711 designadores que publica ANAC, así que la tabla
 * no hacía falta y no podía hacer otra cosa que envejecer mal.
 */
export function anacIndicator(code: string): string {
  const clean = (code ?? "").trim().toUpperCase();
  const airport = getAirport(clean);
  if (airport?.local) return airport.local;

  // Un modelo a veces devuelve un designador con una S adelante (SMGI por MGI).
  if (clean.length === 4 && clean.startsWith("S")) {
    const stripped = getAirport(clean.slice(1));
    if (stripped?.local) return stripped.local;
  }

  // Desconocido: se manda tal cual y que conteste MADHEL.
  return clean;
}

/**
 * Datos operativos de aeródromos controlados que MADHEL no publica en el mismo
 * lugar que el resto.
 *
 * Escritos a mano, y eso es un riesgo que conviene tener presente: son pistas,
 * frecuencias y teléfonos que un piloto puede llegar a usar y que nadie
 * revalida contra el AIP. Estaban duplicados en tres archivos y SADP/SADL
 * estaban intercambiados en dos de ellos — el piloto que preguntaba por El
 * Palomar recibía la torre de La Plata. Acá viven una sola vez.
 */
const CONTROLLED_FALLBACKS: Record<string, {
  rwy: string[];
  radio: string[];
  localization: string;
  fuel: string;
  telephone: string[];
}> = {
  SADF: {
    rwy: ["05/23 1800x30 M - Asfalto/Hormigón - Capacidad de soporte: 25t/1 38t/2 70t/4."],
    radio: ["TWR (Torre San Fernando): 118.45 MHz", "GND (Superficie): 121.90 MHz", "COOP (Frec. Común): 123.50 MHz"],
    localization: "3 KM al SO de la ciudad de San Fernando (Pcia. de Buenos Aires)",
    fuel: "AVGAS 100LL, JET A-1",
    telephone: ["(011) 4714-6002 (Torre)", "(011) 4714-6003 (ANAC)"]
  },
  SABE: {
    rwy: ["13/31 2700x45 M - Hormigón - Capacidad de soporte: PCN 60/R/A/W/T."],
    radio: ["TWR (Torre Aeroparque): 119.90 MHz / 120.40 MHz", "GND (Superficie): 121.70 MHz", "ATIS: 127.60 MHz"],
    localization: "En la Ciudad Autónoma de Buenos Aires (Costanera Norte)",
    fuel: "JET A-1",
    telephone: ["(011) 5480-6111 (ANAC)", "(011) 4514-1515 (EANA)"]
  },
  SAEZ: {
    rwy: ["11/29 3300x60 M - Asfalto", "17/35 3105x45 M - Hormigón."],
    radio: ["TWR (Torre Ezeiza): 118.15 MHz / 118.85 MHz", "GND (Superficie): 121.90 MHz", "ATIS: 127.80 MHz", "APP (Control Baires): 124.90 MHz"],
    localization: "2 KM al SW de la ciudad de Ezeiza (Pcia. de Buenos Aires)",
    fuel: "JET A-1, AVGAS 100LL",
    telephone: ["(011) 5480-2555 (Torre)", "(011) 5480-2666 (AIS/ARO)"]
  },
  SADP: {
    rwy: ["16/34 2110x48 M - Hormigón."],
    radio: ["TWR (Torre Palomar): 120.60 MHz", "GND (Superficie): 121.90 MHz"],
    localization: "En El Palomar (Pcia. de Buenos Aires), partido de Morón",
    fuel: "JET A-1",
    telephone: ["(011) 4751-0011 (Fuerza Aérea)"]
  },
  SADL: {
    rwy: ["02/20 1435x50 M - Tierra", "14/32 1435x30 M - Asfalto (Uso restringido)."],
    radio: ["TWR (Torre La Plata): 118.90 MHz", "COOP (Frec. Común): 123.50 MHz"],
    localization: "7 KM al SE de la ciudad de La Plata (Pcia. de Buenos Aires)",
    fuel: "AVGAS 100LL",
    telephone: ["(0221) 486-1554 (Jefatura de Aeródromo)"]
  },
  SAZM: {
    rwy: ["13/31 2200x45 M - Hormigón", "03/21 700x30 M - Tierra."],
    radio: ["TWR (Torre Mar del Plata): 118.30 MHz", "ATIS: 127.70 MHz"],
    localization: "7 KM al N de la ciudad de Mar del Plata (Pcia. de Buenos Aires)",
    fuel: "JET A-1, AVGAS 100LL",
    telephone: ["(0223) 478-5800 (Torre)"]
  },
  SAZS: {
    rwy: ["11/29 2200x45 M - Hormigón."],
    radio: ["TWR (Torre Bariloche): 118.00 MHz", "ATIS: 127.90 MHz", "APP (Aproximación): 120.10 MHz"],
    localization: "13 KM al E de la ciudad de San Carlos de Bariloche (Pcia. de Río Negro)",
    fuel: "JET A-1, AVGAS 100LL",
    telephone: ["(0294) 440-5016 (AIS/ARO)"]
  },
  SACO: {
    rwy: ["01/19 3200x45 M - Hormigón", "05/23 2280x45 M - Asfalto."],
    radio: ["TWR (Torre Córdoba): 118.50 MHz / 118.95 MHz", "GND: 121.90 MHz", "ATIS: 127.60 MHz", "APP (Córdoba Radar): 119.10 MHz"],
    localization: "9 KM al N de la ciudad de Córdoba (Pcia. de Córdoba)",
    fuel: "JET A-1, AVGAS 100LL",
    telephone: ["(0351) 475-0214 (AIS/ARO)"]
  },
  SAAR: {
    rwy: ["02/20 3000x45 M - Hormigón."],
    radio: ["TWR (Torre Rosario): 118.20 MHz", "GND: 121.75 MHz", "ATIS: 127.90 MHz"],
    localization: "11 KM al W de la ciudad de Rosario (Pcia. de Santa Fe)",
    fuel: "JET A-1, AVGAS 100LL",
    telephone: ["(0341) 451-6300 (Jefatura de Aeródromo)"]
  }
};
/** Acepta ICAO o designador ANAC: GEZ y SRDR devuelven lo mismo. */
export function controlledFallback(code: string) {
  const clean = (code ?? "").trim().toUpperCase();
  return CONTROLLED_FALLBACKS[getAirport(clean)?.icao ?? clean];
}

/**
 * Normaliza la ruta que escribe un piloto —o que devuelve un modelo— a los
 * códigos canónicos del directorio.
 *
 * "gez - srdr", "GEZ SRDR" y "General Rodríguez" no pueden terminar como tres
 * aeródromos distintos en la bitácora. El formulario web ya canonicaliza; sin
 * esto el copiloto entra por la ventana y parte en dos el historial de un campo.
 *
 * Lo que no resuelve se deja tal cual, en mayúsculas: es preferible guardar un
 * código raro a inventar uno.
 */
export function canonicalRoute(raw: string): string {
  const original = (raw ?? "").trim();
  const tokens = original.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);

  // Sólo se toca lo que tiene forma de código. Un split ciego sobre
  // "General Rodríguez" parte la Í y devuelve "GENERAL RODR GUEZ" — peor que
  // no haber hecho nada. Si no parece una ruta de códigos, se deja como vino.
  const looksLikeCodes =
    tokens.length > 0 && tokens.length <= 2 && tokens.every((t) => t.length >= 3 && t.length <= 4);
  if (!looksLikeCodes) return original;

  // Se normaliza también el separador: el formulario web siempre guarda
  // "ORIGEN DESTINO" con un espacio, y "SADF-SADM" convivía como una tercera
  // forma de escribir la misma ruta. Los códigos que no resuelven se dejan tal
  // cual — es preferible guardar uno raro a inventar uno.
  return tokens.map((code) => getAirport(code)?.icao ?? code).join(" ");
}
