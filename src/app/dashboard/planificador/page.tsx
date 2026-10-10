import { apiFetch } from "@/lib/api";
import type { Aircraft, Profile } from "@/types";
import { oficinasAro } from "@/lib/oficinas-aro-disco";
import { DESFASE_ARGENTINA_HORAS } from "@/lib/plan-de-vuelo";
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
    // Los simuladores quedan afuera: esta pantalla calcula rumbos, combustible y hora
    // estimada de llegada, y ninguna de las tres significa algo para un equipo que no
    // se mueve. Ofrecerlo en el selector sería ofrecer una respuesta sin pregunta.
    const flota = (await res.json()) as Aircraft[];
    return flota.filter((a) => !a.is_simulator);
  } catch {
    return [];
  }
}

/**
 * El nombre del piloto, para la casilla 19 del plan de vuelo. Si no se puede leer queda
 * vacío y el piloto lo escribe: no es motivo para romper la pantalla.
 */
async function getNombrePiloto(): Promise<string> {
  const res = await apiFetch("/profiles");
  if (!res.ok) return "";
  try {
    const perfiles = (await res.json()) as Profile[];
    const p = perfiles[0];
    return p ? [p.first_name, p.last_name].filter(Boolean).join(" ").trim() : "";
  } catch {
    return "";
  }
}

const unParametro = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

export default async function PlanificadorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [aeronaves, params, nombrePiloto] = await Promise.all([getAeronaves(), searchParams, getNombrePiloto()]);

  const rutaInicial = parsearRuta(unParametro(params.ruta));
  const aeronaveInicial = unParametro(params.av);

  return (
    <PlanificadorClient
      aeronaves={aeronaves}
      rutaInicial={rutaInicial}
      aeronaveInicial={aeronaves.some((a) => a.id === aeronaveInicial) ? aeronaveInicial : ""}
      oficinas={oficinasAro()}
      nombrePiloto={nombrePiloto}
      hoy={new Date(Date.now() + DESFASE_ARGENTINA_HORAS * 3_600_000).toISOString().slice(0, 10)}
    />
  );
}
