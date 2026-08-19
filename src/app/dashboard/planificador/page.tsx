import { apiFetch } from "@/lib/api";
import type { Aircraft } from "@/types";
import PlanificadorClient from "@/components/dashboard/PlanificadorClient";
import { parsearRuta } from "@/lib/ruta-planificada";
import type { SearchParams } from "@/lib/prefill";

/**
 * El planificador de navegación.
 *
 * El servidor sólo trae las aeronaves —para la performance— y lee el estado inicial de
 * la URL. Todo lo demás es cliente: el cálculo corre con cada tecla y no tiene por qué
 * pasar por el servidor.
 *
 * **Se llega acá con la ruta ya cargada** desde un vuelo programado del calendario, con
 * `?ruta=SADM-SAAJ&av=<id>`, que es el mismo patrón de `prefill` que usa Nuevo Vuelo.
 */

async function getAeronaves(): Promise<Aircraft[]> {
  const res = await apiFetch("/aircraft");
  // Sin aeronaves se planifica igual tipeando la performance a mano, así que un fallo
  // acá no justifica romper la pantalla: es un autocompletado, no el dato central.
  if (!res.ok) return [];
  try {
    return (await res.json()) as Aircraft[];
  } catch {
    return [];
  }
}

const unParametro = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

export default async function PlanificadorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [aeronaves, params] = await Promise.all([getAeronaves(), searchParams]);

  const rutaInicial = parsearRuta(unParametro(params.ruta));
  const aeronaveInicial = unParametro(params.av);

  return (
    <PlanificadorClient
      aeronaves={aeronaves}
      rutaInicial={rutaInicial}
      aeronaveInicial={aeronaves.some((a) => a.id === aeronaveInicial) ? aeronaveInicial : ""}
    />
  );
}
