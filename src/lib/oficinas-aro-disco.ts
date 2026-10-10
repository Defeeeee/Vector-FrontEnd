import fs from "node:fs";
import path from "node:path";
import { getAirport } from "./airports";
import { parsearOficinas, type OficinaUbicada } from "./oficinas-aro";

/**
 * Las oficinas de la AIC A 19/2026 con las coordenadas de su aeródromo, del directorio.
 * Server-only: lee el disco. La lista es chica (49) y se lee una sola vez.
 */
let cache: OficinaUbicada[] | null = null;

export function oficinasAro(): OficinaUbicada[] {
  if (cache) return cache;
  const tsv = fs.readFileSync(path.join(process.cwd(), "src", "data", "oficinas-aro.tsv"), "utf8");
  cache = parsearOficinas(tsv).map((o) => {
    const ad = getAirport(o.oaci);
    return { ...o, nombre: ad?.label ?? o.oaci, lat: ad?.lat, lon: ad?.lon };
  });
  return cache;
}
