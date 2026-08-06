/**
 * Distancia por gran círculo entre dos puntos, en millas náuticas.
 *
 * Pura y sin dependencias del servidor a propósito: el formulario la usa en el
 * cliente con las coordenadas que ya trae `AirportRef`, y el resumen la usa en el
 * servidor resolviendo los códigos contra el directorio. Una sola implementación
 * para los dos lados.
 *
 * Estaba escrita dentro de `api/weather/route.ts`, donde servía sólo para elegir
 * la estación METAR más cercana. Se sacó de ahí antes de que fuera la segunda
 * copia — es la misma historia que `splitRoute`, que llegó a cinco.
 */

/** Radio terrestre en millas náuticas. */
const EARTH_RADIUS_NM = 3440.065;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_NM * c);
}

/** Lo mínimo que hace falta para medir: cualquier cosa con coordenadas. */
interface Located {
  lat?: number;
  lon?: number;
}

/**
 * Distancia entre dos aeródromos, o `null` si a alguno le faltan coordenadas.
 *
 * **Null y no cero.** No todos los aeródromos de `madhel.tsv` tienen posición, y
 * un cero se confundiría con un circuito local — que es justamente la distinción
 * que esto viene a informar. Quien la consuma tiene que decidir qué mostrar
 * cuando no se puede medir, en vez de recibir un número inventado.
 */
export function legDistanceNm(origin: Located | null, destination: Located | null): number | null {
  if (
    origin?.lat === undefined || origin?.lon === undefined ||
    destination?.lat === undefined || destination?.lon === undefined
  ) {
    return null;
  }
  return distanceNm(origin.lat, origin.lon, destination.lat, destination.lon);
}
