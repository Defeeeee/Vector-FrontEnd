/**
 * La ruta del planificador: una lista de puntos, no un par origen-destino.
 *
 * ## Por qué un tipo propio y no `splitRoute`
 *
 * `src/lib/route.ts:splitRoute` devuelve **exactamente dos elementos**, tiene doce
 * archivos que la consumen y un test que fija ese comportamiento. No se toca. Ese
 * contrato es correcto para lo que hace: el campo `route` de un vuelo ya cargado
 * describe de dónde salió y dónde terminó, y todas las agregaciones de la app —el
 * mapa, el resumen, las estadísticas— cuentan sobre esa base.
 *
 * Un plan de navegación es otra cosa: SADM → Chivilcoy → Junín es **un** vuelo con
 * **tres** puntos, y el del medio no es ni origen ni destino. Meterlo a la fuerza en un
 * par obligaría a cambiar `splitRoute` y con ella los doce consumidores, para modelar
 * algo que sólo existe en una pantalla.
 *
 * Así que este tipo vive acá, y en el borde —cuando el plan se convierte en un vuelo
 * cargado— `aCampoRoute` lo traduce al formato de siempre.
 */

/**
 * Tope de puntos. No es una limitación técnica: es que una planilla de más de doce
 * tramos no se lee en pantalla ni entra en una hoja, y la URL —donde vive el estado—
 * se vuelve impracticable de compartir.
 */
export const MAX_PUNTOS = 12;

/**
 * Los puntos de una ruta a partir de texto libre.
 *
 * Acepta los mismos separadores que `splitRoute` —espacios y guiones— más la coma,
 * porque quien tipea una ruta larga la separa con comas. **No deduplica**: SADM SAAJ
 * SADM es una ida y vuelta perfectamente normal, y colapsarla borraría el tramo de
 * regreso.
 *
 * No valida nada. De la forma de cada token se ocupa `clasificarToken` en `lib/puntos.ts`
 * y de si existe, el directorio; acá sólo se parte texto.
 *
 * ## Por qué la barra no es separador, y por qué eso decide la sintaxis
 *
 * Un punto de ruta ya no es sólo un aeródromo: puede ser `BAR/045/25` —25 NM en el
 * radial 045 de Bariloche— o una coordenada propia. **La barra separa adentro de un
 * punto; el espacio, la coma y el guión separan entre puntos.** De ahí sale que las
 * coordenadas se escriban `S34.68/W58.64` y no `-34.68,-58.64`: con esta gramática, la
 * coma partiría el punto en dos y el menos también.
 */
export function parsearRuta(texto: string): string[] {
  return (texto ?? "")
    .split(/[\s,\-]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, MAX_PUNTOS);
}

/**
 * La ruta como cabe en una URL: `SADM-SAAJ-SAZN`.
 *
 * El estado del planificador vive en la URL y no en la base, así que un plan se
 * comparte mandando el link y se imprime desde el navegador. El guión es el separador
 * porque no necesita escaparse.
 */
export function rutaAUrl(codigos: string[]): string {
  return codigos.filter(Boolean).slice(0, MAX_PUNTOS).join("-");
}

/**
 * El campo `route` de un vuelo, a partir de un plan.
 *
 * **Primero y último, con el formato de siempre.** Lo que se pierde son los puntos
 * intermedios, y conviene decirlo en vez de disimularlo: un SADM → Chivilcoy → Junín
 * queda guardado como `"SADM SAAJ"`, igual que si hubiera ido derecho. Es el precio de
 * no tocar `splitRoute`, y es el correcto: la bitácora responde "de dónde a dónde
 * volaste", que sigue siendo cierto.
 *
 * Cuando el primero y el último coinciden —una ida y vuelta— devuelve **un solo
 * código**, que es como `route.ts` representa un vuelo que sale y vuelve al mismo
 * campo. Repetirlo haría que las agregaciones contaran ese aeródromo dos veces.
 */
export function aCampoRoute(codigos: string[]): string {
  const limpios = codigos.filter(Boolean).map((c) => c.trim().toUpperCase()).filter(Boolean);
  if (limpios.length === 0) return "";

  const primero = limpios[0];
  const ultimo = limpios[limpios.length - 1];
  return primero === ultimo ? primero : `${primero} ${ultimo}`;
}

/**
 * De qué clase es un punto del plan.
 *
 * No es decoración: **decide qué se le puede pedir.** A un aeródromo se le pide METAR,
 * NOTAM y pista en uso; a una coordenada en el medio del campo, nada de eso. Ver
 * `puntosConBriefing`.
 */
export type ClasePunto = "aerodromo" | "radioayuda" | "fix" | "coordenada" | "radial";

/** Un punto del plan, ya resuelto contra el directorio. */
export interface PuntoRuta {
  /** El token tal como se tipeó: ICAO, designador ANAC, ident, coordenada o radial. */
  codigo: string;
  /** Nombre corto para mostrar. Vacío si el código no resolvió. */
  label: string;
  lat?: number;
  lon?: number;
  /**
   * Variación magnética del aeródromo, oeste positiva. Ver `navegacion.ts`.
   *
   * **Sólo los aeródromos la tienen.** Un punto por coordenada o por radial no la trae:
   * sale del WMM, que acá corre en el build y no en producción, y usar la de la estación
   * en su lugar sería peor que nada —es de 2007 y es la de alineación, no la del
   * terreno—. El plan usa una sola variación, la de salida, así que no falta.
   */
  variacionW?: number;
  /** `false` cuando el código no existe en el directorio. */
  resuelto: boolean;
  /** Qué clase de punto es. `undefined` mientras no resolvió. */
  clase?: ClasePunto;
  /** Elevación en pies. Alimenta la densidad de altitud del briefing. */
  elevacionFt?: number;
  /** Pistas con rumbo verdadero, para el viento cruzado. Vacío en la mayoría. */
  pistas?: { le: string; he: string; rumboT: number; largoFt?: number; superficie?: string; fuente?: "medida" | "estimada" }[];
  /** Qué sintonizar, en los puntos que nacen de una radioayuda. */
  estacion?: { ident: string; tipo: string; nombre: string; frecuencia: string | null };
  /** Las aerovías del punto significativo: `W67-SID BCA`. Sólo en los `fix`. */
  rutas?: string;
  /** De cuándo es el dato del AIP. Se muestra: el AIP se enmienda cada 28 días. */
  vigencia?: { documento: string; edicion: string; vigenteDesde: string; url: string };
}

/**
 * Los puntos a los que tiene sentido pedirles briefing.
 *
 * **Sólo los aeródromos**, y esto no es cosmético: `veredictoDeRuta` cuenta cuántas
 * estaciones contestaron para decidir si puede opinar. Un punto por coordenada nunca va
 * a tener METAR, así que mandarlo al briefing lo contaría como una estación caída y
 * degradaría el veredicto de una ruta que está perfecta. Cuando no se sabe hay que
 * decirlo; inventar un "no sabemos" tampoco vale.
 *
 * Una radioayuda tampoco: `SDE` la estación no emite METAR, lo emite `SDE` el
 * aeródromo — y son objetos distintos aunque compartan las letras.
 */
export function puntosConBriefing(puntos: PuntoRuta[]): PuntoRuta[] {
  return puntos.filter((p) => p.clase === "aerodromo" && p.codigo.trim());
}

/**
 * Los puntos que sirven para calcular: los que tienen posición.
 *
 * Un plan con un código mal tipeado en el medio **no se calcula salteándolo**. Saltear
 * uniría los dos vecinos con una recta que el piloto no va a volar, y el total saldría
 * más corto que la realidad con pinta de válido. Devuelve `null` y la pantalla señala
 * cuál falta.
 */
export function puntosCalculables(puntos: PuntoRuta[]): { lat: number; lon: number }[] | null {
  const conPosicion = puntos.filter((p) => p.lat !== undefined && p.lon !== undefined);
  if (conPosicion.length !== puntos.length) return null;
  if (conPosicion.length < 2) return null;
  return conPosicion.map((p) => ({ lat: p.lat!, lon: p.lon! }));
}

/**
 * La variación magnética que se usa para todo el plan.
 *
 * **Una sola para todos los tramos, y es la de salida.** Es lo que hace una planilla en
 * papel, y es defendible mientras los tramos no crucen medio país: la variación cambia
 * despacio con la posición. Lo que **no** es defendible es usarla en una travesía larga
 * sin decirlo — de SADM a Bariloche hay quince grados de diferencia entre las puntas—,
 * así que la pantalla ofrece editarla y avisa cuando los extremos difieren mucho.
 *
 * `null` cuando el aeródromo de salida no la tiene. **No cero**: cero es un valor
 * perfectamente válido en Argentina —la línea agónica cruza la Patagonia— y
 * confundirlos haría que un dato faltante se viera como un aeródromo sobre la agónica.
 */
export function variacionDelPlan(puntos: PuntoRuta[]): number | null {
  return puntos[0]?.variacionW ?? null;
}

/**
 * Cuánto difiere la variación entre las puntas del plan, o `null` si no se puede saber.
 *
 * Sirve para una sola cosa: decidir si hay que avisarle al piloto que una variación
 * única no alcanza para esta ruta.
 */
export function dispersionDeVariacion(puntos: PuntoRuta[]): number | null {
  const valores = puntos.map((p) => p.variacionW).filter((v): v is number => v !== undefined);
  if (valores.length < 2) return null;
  return Math.max(...valores) - Math.min(...valores);
}

/** A partir de acá una variación única deja de ser inocente. Tres grados de rumbo. */
export const DISPERSION_TOLERABLE = 3;
