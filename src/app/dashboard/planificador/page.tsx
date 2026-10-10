import { apiFetch } from "@/lib/api";
import type { Aircraft, Profile } from "@/types";
import { oficinasAro } from "@/lib/oficinas-aro-disco";
import { DESFASE_ARGENTINA_HORAS } from "@/lib/plan-de-vuelo";
import { esAlumno } from "@/lib/licencias";
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
 * Del perfil, para el plan de vuelo: "Comandante de la aeronave" con nombre, licencia y
 * número —como lo presentó Federico el 10/10/2026: `FEDERICO DIAZ NEMETH PPA 48225513`—
 * y el celular para las observaciones. Un alumno no tiene licencia: va sólo el nombre.
 * Si el perfil no se puede leer, quedan vacíos y el piloto los escribe.
 */
async function getPiloto(): Promise<{ comandante: string; telefono: string }> {
  const vacio = { comandante: "", telefono: "" };
  const res = await apiFetch("/profiles");
  if (!res.ok) return vacio;
  try {
    const p = ((await res.json()) as Profile[])[0];
    if (!p) return vacio;
    const licencia = p.license_type && !esAlumno(p.license_type) ? p.license_type : "";
    const comandante = [p.first_name, p.last_name, licencia, licencia ? (p.licencia_numero ?? "") : ""]
      .filter(Boolean)
      .join(" ")
      .trim();
    return { comandante, telefono: p.whatsapp_phone ?? "" };
  } catch {
    return vacio;
  }
}

const unParametro = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

export default async function PlanificadorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [aeronaves, params, piloto] = await Promise.all([getAeronaves(), searchParams, getPiloto()]);

  const rutaInicial = parsearRuta(unParametro(params.ruta));
  const aeronaveInicial = unParametro(params.av);

  return (
    <PlanificadorClient
      aeronaves={aeronaves}
      rutaInicial={rutaInicial}
      aeronaveInicial={aeronaves.some((a) => a.id === aeronaveInicial) ? aeronaveInicial : ""}
      oficinas={oficinasAro()}
      piloto={piloto}
      hoy={new Date(Date.now() + DESFASE_ARGENTINA_HORAS * 3_600_000).toISOString().slice(0, 10)}
    />
  );
}
