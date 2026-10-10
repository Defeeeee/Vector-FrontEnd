/**
 * Las oficinas ARO/AIS de EANA donde se presenta el plan de vuelo.
 *
 * Salen del **Anexo ALFA de la AIC A 19/2026** (17/06/2026, cancela la A 08/2025): 49
 * oficinas con su correo y sus teléfonos. El texto de la AIC está commiteado en
 * `src/data/aic-oficinas-aro.txt` y `oficinas-aro.test.ts` contrasta la tabla contra él
 * en los dos sentidos, como el AIP (invariante 12).
 *
 * **A dónde se manda** (AIC A 19/2026, punto 2): "a la oficina ARO/AIS del aeródromo de
 * salida o a la más cercana que se encuentre brindando servicio". Para un alumno que
 * sale de un aeródromo sin oficina —la mayoría de los aeroclubes— eso es la más cercana,
 * y `oficinaParaSalida` la propone. **Propone, no decide:** "la más cercana que esté
 * brindando servicio" depende del horario de cada oficina, que la AIC no publica. Por
 * eso la pantalla deja elegir otra y muestra el teléfono.
 *
 * Puro: recibe el texto del TSV. Quien lee el disco es la página del planificador.
 */
import { distanciaNmPrecisa } from "./distance";

export interface OficinaAro {
  /** El aeródromo donde está la oficina. */
  oaci: string;
  /** Dirección AFTN/AMHS. La AIC la publica; para el mail no hace falta. */
  aftn: string;
  correo: string;
  /** Tal como los publica la AIC, con internos y celulares. */
  telefonos: string;
  fir: string;
}

export interface OficinaUbicada extends OficinaAro {
  /** El nombre corto del aeródromo, para el selector: "San Fernando". */
  nombre: string;
  lat?: number;
  lon?: number;
}

export function parsearOficinas(tsv: string): OficinaAro[] {
  return tsv
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const [oaci, aftn, correo, telefonos, fir] = l.split("\t");
      return { oaci, aftn, correo, telefonos, fir };
    });
}

/**
 * El primer número de la lista, listo para un link `tel:`.
 *
 * La AIC los escribe de varias formas —`(+54 11) 45800261`, `(54 341) 4513202`,
 * `(+54 011) 44802444`, `(+54 9 351) 2921338`— y el teléfono los necesita todos como
 * `+54…`. El cero de larga distancia sobra después del 54. Un número que no tenga la
 * forma esperada devuelve `null`: mejor sin botón que un botón que llama a otro lado.
 */
export function primerTelefono(telefonos: string): { mostrar: string; marcar: string } | null {
  const m = /\(\+?54\s+((?:9\s+)?)0?(\d{2,4})\)\s*(\d{6,8})/.exec(telefonos);
  if (!m) return null;
  const nueve = m[1].trim();
  const marcar = `+54${nueve}${m[2]}${m[3]}`;
  return { mostrar: m[0].replace(/\s+/g, " "), marcar };
}

/**
 * La oficina que corresponde a una salida: la del aeródromo si tiene, si no la más
 * cercana. `null` si el aeródromo no tiene oficina y no hay coordenadas para medir.
 */
export function oficinaParaSalida(
  salida: { codigo: string; lat?: number; lon?: number },
  oficinas: OficinaUbicada[]
): { oficina: OficinaUbicada; propia: boolean; distanciaNm?: number } | null {
  const propia = oficinas.find((o) => o.oaci === salida.codigo.trim().toUpperCase());
  if (propia) return { oficina: propia, propia: true };
  if (salida.lat === undefined || salida.lon === undefined) return null;

  let mejor: { oficina: OficinaUbicada; distanciaNm: number } | null = null;
  for (const o of oficinas) {
    if (o.lat === undefined || o.lon === undefined) continue;
    const d = distanciaNmPrecisa(salida.lat, salida.lon, o.lat, o.lon);
    if (!mejor || d < mejor.distanciaNm) mejor = { oficina: o, distanciaNm: d };
  }
  return mejor ? { ...mejor, propia: false } : null;
}
