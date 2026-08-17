import { nightLandingsOf } from "@/lib/landings";
import type { Aircraft, Flight, Logbook } from "@/types";

/**
 * El progreso hacia la PCA, convertido de informe en respuesta.
 *
 * `PCATracker` ya mostraba seis diales —total, PIC, travesía, instrumentos,
 * nocturno, aterrizajes nocturnos— y ahí terminaba. El problema de seis diales es
 * que **el que frena rota**: se puede tener 195 horas totales, con el medidor grande
 * en 97%, y estar trabado por 2 horas de travesía como PIC. El dial chiquito es el
 * que decide qué vuelo conviene hacer, y encontrarlo era trabajo del piloto.
 *
 * Esto contesta las tres preguntas que se hace de verdad: **qué me frena**, **cuándo
 * llego** y **cuánto sale**.
 *
 * Vive acá y no en el componente por dos motivos. Uno, que el proyecto no tiene
 * harness de tests de componentes (`environment: "node"`, sólo `.test.ts`), así que
 * lo que quede adentro del `.tsx` no se puede testear — y estos seis números no
 * tenían ni un test. Dos, que la aritmética de una licencia merece estar en un lugar
 * donde se la pueda leer sin JSX alrededor.
 *
 * Los mínimos son los de **RAAC 61.620** y estaban ya en el componente; esto los
 * mueve, no los reinterpreta.
 */

/** Cuántos meses de historia definen "el ritmo al que venís volando". */
export const MESES_DE_RITMO = 3;

export interface Requisito {
  clave: string;
  label: string;
  /** Lo acumulado, incluidas las horas de apertura donde corresponde. */
  actual: number;
  objetivo: number;
  /** Meta reducida, informativa. No entra en el cálculo de qué frena. */
  subObjetivo?: number;
  unidad: string;
  /** Si se mide en horas, se le puede poner precio. Los aterrizajes no. */
  esHoras: boolean;
}

/**
 * De dónde sale cada número, por vuelo.
 *
 * Separado de los totales para que el mismo extractor sirva dos veces: una sobre
 * toda la bitácora —el acumulado— y otra sobre los últimos meses —el ritmo—. Sin
 * esto, el ritmo habría que calcularlo aparte y las dos cuentas podrían separarse.
 */
const EXTRACTORES: Record<string, (f: Flight) => number> = {
  total: (f) => f.duration || 0,
  pic: (f) =>
    (f.pic_day_loc || 0) + (f.pic_day_tra || 0) + (f.pic_night_loc || 0) + (f.pic_night_tra || 0),
  picTravesia: (f) => (f.pic_day_tra || 0) + (f.pic_night_tra || 0),
  // El simulado cuenta hasta 5 h, y el tope se aplica sobre el acumulado, no vuelo
  // por vuelo: por eso `instrumentos` se arma abajo y no acá.
  instrumentoReal: (f) => (f.imc_pil || 0) + (f.capota || 0),
  instrumentoSimulado: (f) => f.sim_pil_en_inst || 0,
  nocturno: (f) => (f.pic_night_loc || 0) + (f.pic_night_tra || 0),
  aterrizajesNocturnos: (f) => nightLandingsOf(f),
};

const sumar = (flights: Flight[], clave: string): number =>
  flights.reduce((acc, f) => acc + EXTRACTORES[clave](f), 0);

/** Las horas de apertura de todas las bitácoras, por columna. */
const apertura = (logbooks: Logbook[], pick: (l: Logbook) => number | undefined): number =>
  logbooks.reduce((acc, l) => acc + (Number(pick(l)) || 0), 0);

/**
 * Los seis requisitos de 61.620, con lo acumulado hasta hoy.
 *
 * Las horas de apertura entran acá y **no** en el ritmo: son horas sin fecha, así que
 * atribuirlas a un mes cualquiera inventaría una velocidad que el piloto no tuvo.
 */
export function requisitosPCA(flights: Flight[], logbooks: Logbook[] = []): Requisito[] {
  const aperturaPic =
    apertura(logbooks, (l) => l.opening_pic_day_loc) + apertura(logbooks, (l) => l.opening_pic_day_tra) +
    apertura(logbooks, (l) => l.opening_pic_night_loc) + apertura(logbooks, (l) => l.opening_pic_night_tra);
  const aperturaSic =
    apertura(logbooks, (l) => l.opening_sic_day_loc) + apertura(logbooks, (l) => l.opening_sic_day_tra) +
    apertura(logbooks, (l) => l.opening_sic_night_loc) + apertura(logbooks, (l) => l.opening_sic_night_tra);

  const instrumentos =
    sumar(flights, "instrumentoReal") +
    apertura(logbooks, (l) => l.opening_imc_pil) + apertura(logbooks, (l) => l.opening_capota) +
    Math.min(sumar(flights, "instrumentoSimulado"), 5);

  return [
    {
      clave: "total", label: "Experiencia total", unidad: "hs", esHoras: true,
      actual: sumar(flights, "total") + aperturaPic + aperturaSic,
      objetivo: 200,
    },
    {
      clave: "pic", label: "PIC", unidad: "hs", esHoras: true,
      actual: sumar(flights, "pic") + aperturaPic,
      objetivo: 100, subObjetivo: 70,
    },
    {
      clave: "picTravesia", label: "PIC Travesía", unidad: "hs", esHoras: true,
      actual: sumar(flights, "picTravesia")
        + apertura(logbooks, (l) => l.opening_pic_day_tra)
        + apertura(logbooks, (l) => l.opening_pic_night_tra),
      objetivo: 20,
    },
    {
      clave: "instrumentos", label: "Instrumentos", unidad: "hs", esHoras: true,
      actual: instrumentos, objetivo: 10,
    },
    {
      clave: "nocturno", label: "PIC Nocturno", unidad: "hs", esHoras: true,
      actual: sumar(flights, "nocturno")
        + apertura(logbooks, (l) => l.opening_pic_night_loc)
        + apertura(logbooks, (l) => l.opening_pic_night_tra),
      objetivo: 5,
    },
    {
      // Los aterrizajes de apertura **no** se suman: vienen sin desglose día/noche y
      // suponerlos nocturnos infla un requisito, que es el error que manda a alguien
      // al examen corto. Ver `lib/landings.ts`.
      clave: "aterrizajesNocturnos", label: "Aterrizajes Noct.", unidad: "atrr", esHoras: false,
      actual: sumar(flights, "aterrizajesNocturnos"), objetivo: 5,
    },
  ];
}

export interface Freno extends Requisito {
  /** Cuánto falta para cumplirlo. Siempre > 0. */
  faltan: number;
}

/**
 * El requisito que está más lejos de cumplirse, o `null` si están todos.
 *
 * **Se compara en fracción y no en valor absoluto**, que es la única forma de que la
 * pregunta tenga sentido: 3 horas de travesía sobre 20 y 3 aterrizajes nocturnos
 * sobre 5 no son comparables como números sueltos. El que está al 10% de su meta
 * frena más que el que está al 80%, aunque en unidades absolutas le falte menos.
 *
 * `subObjetivo` no participa: es una meta informativa, y usarla acá diría que alguien
 * terminó cuando le falta.
 */
export function loQueFrena(requisitos: Requisito[]): Freno | null {
  const pendientes = requisitos
    .filter((r) => r.actual < r.objetivo)
    .map((r) => ({ ...r, faltan: r.objetivo - r.actual }));

  if (pendientes.length === 0) return null;

  return pendientes.sort((a, b) => {
    const fa = a.actual / a.objetivo;
    const fb = b.actual / b.objetivo;
    if (fa !== fb) return fa - fb;
    // Empate —típicamente dos en cero—: gana el que pide más, que es el que va a
    // tardar más en cerrarse.
    return b.faltan - a.faltan;
  })[0];
}

/**
 * Cuánto de este requisito viene sumando por mes.
 *
 * Se mide sobre **ese** requisito y no sobre las horas totales, porque son cosas
 * distintas: alguien que vuela 8 horas por mes dando vueltas al aeródromo avanza
 * cero en travesía. Proyectar con el ritmo general daría una fecha optimista sobre
 * justo el requisito que lo tiene trabado.
 */
export function ritmoMensual(
  flights: Flight[],
  clave: string,
  hoyIso: string,
  meses = MESES_DE_RITMO
): number {
  const extractor = EXTRACTORES[clave];
  if (!extractor) return 0;

  const desde = restarMeses(hoyIso, meses);
  const recientes = flights.filter((f) => f.date && f.date >= desde && f.date <= hoyIso);
  return sumar(recientes, clave) / meses;
}

/**
 * En cuántos meses se cierra el requisito al ritmo actual, o `null` si no se puede
 * decir.
 *
 * `null` cuando el ritmo es cero, y es importante que sea `null` y no infinito: sin
 * haber volado nada de eso en los últimos meses **no hay ritmo del que proyectar**, y
 * una app que ahí contesta "nunca" está afirmando algo que no sabe. El piloto puede
 * tener un vuelo de travesía reservado para el sábado.
 */
export function mesesRestantes(faltan: number, ritmo: number): number | null {
  if (ritmo <= 0) return null;
  return faltan / ritmo;
}

/**
 * Piso de lo que falta volar, en horas.
 *
 * **Es un piso y no una estimación**, y la diferencia importa. Un mismo vuelo puede
 * avanzar varios requisitos a la vez —una travesía nocturna como PIC suma a total,
 * PIC, travesía y nocturno—, así que lo mínimo que se puede volar es la brecha más
 * grande de todas, no la suma de las brechas. Decir la suma sería asustar con un
 * número que nadie va a pagar.
 */
export function horasQueFaltan(requisitos: Requisito[]): number {
  return Math.max(0, ...requisitos.filter((r) => r.esHoras).map((r) => r.objetivo - r.actual));
}

/**
 * Cuánto cuesta la hora para este piloto, promediada por lo que efectivamente voló.
 *
 * Ponderada por horas y no un promedio simple de la flota: quien tiene cargado un
 * bimotor caro que voló una vez no paga ese precio todos los meses. Devuelve `null`
 * si ninguna de las aeronaves que voló tiene precio cargado — **sin dato no hay
 * estimación**, y un cero se leería como "gratis".
 */
export function costoPorHora(
  flights: Flight[],
  aircraft: Aircraft[],
  hoyIso: string,
  meses = MESES_DE_RITMO
): number | null {
  const precios = new Map(
    aircraft.filter((a) => a.cost_per_hour && a.cost_per_hour > 0).map((a) => [a.id, a.cost_per_hour!])
  );
  if (precios.size === 0) return null;

  const desde = restarMeses(hoyIso, meses);
  // Con los últimos meses alcanza si voló algo con precio; si no, toda la bitácora,
  // que es mejor que no decir nada por haber estado un trimestre sin volar.
  const recientes = flights.filter((f) => f.date >= desde && f.aircraft_id && precios.has(f.aircraft_id));
  const base = recientes.length > 0
    ? recientes
    : flights.filter((f) => f.aircraft_id && precios.has(f.aircraft_id));

  let horas = 0;
  let pesos = 0;
  for (const f of base) {
    const precio = precios.get(f.aircraft_id!)!;
    horas += f.duration || 0;
    pesos += (f.duration || 0) * precio;
  }

  return horas > 0 ? pesos / horas : null;
}

/** "YYYY-MM-DD" menos N meses, saturando al último día del mes. Todo en UTC. */
function restarMeses(iso: string, meses: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const total = y * 12 + (m - 1) - meses;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const ultimoDelMes = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(d, ultimoDelMes))).toISOString().slice(0, 10);
}
