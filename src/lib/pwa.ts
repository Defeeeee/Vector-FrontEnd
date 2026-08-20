/**
 * Lo que la PWA decide, separado de dónde lo ejecuta.
 *
 * El service worker no se puede testear en este repo —`vitest` corre en
 * `environment: "node"` y no hay ni jsdom—, así que **todo lo que sea criterio vive
 * acá y lo que queda del otro lado es plomería**. Es la misma jugada que parió
 * `briefing.ts`: la lógica con consecuencia salió del `.tsx` donde no se podía
 * testear, y por eso se pudo arreglar.
 */

/**
 * La versión construida, que es la que versiona el cache.
 *
 * Sale de `package.json` vía `next.config.js`, así que no hay un número escrito a
 * mano que pueda quedar viejo. En el service worker esta constante queda **horneada
 * en el bundle** por esbuild: cada build produce un `sw.js` distinto, que es
 * justamente lo que hace que el navegador note que hay versión nueva.
 */
export const VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";

/**
 * El cache del shell: assets con hash en la URL, íconos, la página de respaldo.
 *
 * **Lleva la versión en el nombre y se tira entero en cada deploy.** Puede: es todo
 * contenido inmutable que se vuelve a bajar solo, y dejarlo acumular significaría
 * guardar los chunks de todas las versiones que pasaron por el teléfono.
 */
export const CACHE_SHELL = `vector-shell-${VERSION}`;

/**
 * Los caches que **no** llevan versión, y por qué eso no es un descuido.
 *
 * Si el nombre llevara la versión, cada deploy los renombraría — y renombrar es
 * tirar. O sea que **cada deploy le borraría al piloto la bitácora que tiene para
 * ver sin señal**, que es exactamente lo que este plan viene a darle. Un deploy no
 * puede tener ese efecto.
 *
 * Se migran por `ESQUEMA`, que sube sólo cuando cambia la *forma* de lo guardado.
 */
export const CACHE_PAGINAS = "vector-paginas";
export const CACHE_DATOS = "vector-datos";
export const CACHE_METEO = "vector-meteo";

/**
 * La forma de lo guardado en los caches sin versión.
 *
 * Subir este número es la única manera de descartarlos a propósito. Se sube cuando
 * un cambio hace que lo guardado ya no se pueda interpretar —por ejemplo si cambia
 * el header con el que se estampa la fecha de captura—, **no** cuando cambia el
 * contenido de la app.
 */
export const ESQUEMA = 1;

/** Los caches con datos del piloto. Se borran al cerrar sesión; los otros no. */
export const CACHES_PERSONALES = [CACHE_PAGINAS, CACHE_METEO];

/** Todo lo que este service worker puede llegar a crear. */
export const CACHES_SIN_VERSION = [CACHE_PAGINAS, CACHE_DATOS, CACHE_METEO];

/** Prefijo de los caches versionados, para reconocer los viejos. */
export const PREFIJO_SHELL = "vector-shell-";

/** Los mensajes que la página le manda al service worker. */
export const MENSAJES = {
  /** Desregistrarse y borrar todo. La vía de escape de `?sw=reset`. */
  autodestruir: "vector:autodestruir",
  /** Activar la versión que está esperando, porque el piloto aceptó. */
  activarAhora: "vector:activar-ahora",
  /** Borrar los caches con datos personales. Ver el borrado al cerrar sesión. */
  olvidarDatosPersonales: "vector:olvidar-datos-personales",
} as const;

/**
 * Cuáles de los caches que existen hay que borrar al activar una versión nueva.
 *
 * ## La regla, y el error que evita
 *
 * Se borra **sólo** el shell de otras versiones. Nada más.
 *
 * La tentación al escribir un `activate` es la de siempre —"borrá todo lo que no sea
 * el cache actual"—, y acá esa línea sería destructiva: se llevaría puestos
 * `vector-paginas`, `vector-datos` y `vector-meteo` en **cada deploy**. El piloto
 * que despliega un martes y vuela el sábado se encontraría sin nada guardado, sin
 * ninguna señal de por qué. Un deploy tiene que ser invisible para lo que ya está
 * en el teléfono.
 *
 * Tampoco se toca lo que no lleve nuestro prefijo: el origen es nuestro hoy, pero
 * borrar caches ajenos por las dudas es la clase de barrido que después nadie
 * entiende.
 */
export function cachesABorrar(existentes: string[], shellActual = CACHE_SHELL): string[] {
  return existentes.filter((n) => n.startsWith(PREFIJO_SHELL) && n !== shellActual);
}

/**
 * Si una URL puede guardarse en el cache de páginas.
 *
 * Deja afuera lo que es de escritura o de sesión: el alta y la importación de
 * vuelos, los ajustes, la auditoría, y las pantallas de sesión. Una foto vieja de un
 * formulario de alta no sirve para nada y una del login confunde.
 *
 * `/dashboard/audit` queda afuera por un motivo más fuerte que "no sirve": el
 * resultado de la auditoría es un veredicto sobre la libreta del piloto, y un
 * veredicto guardado es un veredicto que puede haber dejado de ser cierto.
 */
const PAGINAS_CACHEABLES = [
  "/dashboard",
  "/dashboard/history",
  "/dashboard/summary",
  "/dashboard/balance",
  "/dashboard/calendario",
  "/dashboard/planificador",
  "/dashboard/airports",
  "/dashboard/tools",
  "/dashboard/novedades",
];

export function paginaCacheable(pathname: string): boolean {
  // La raíz se normaliza a cadena vacía, que tampoco está en la lista: no hace falta
  // tratarla aparte, y una condición de más sin test es una condición que miente.
  return PAGINAS_CACHEABLES.includes(pathname.replace(/\/+$/, ""));
}
