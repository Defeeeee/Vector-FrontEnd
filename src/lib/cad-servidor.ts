import { apiFetch } from "@/lib/api";
import { getAirport } from "@/lib/airports";
import { borradorCad, matriculaCad, type BorradorCad, type LugarParaCad, type VueloConocido } from "@/lib/cad";
import { esAlumno } from "@/lib/licencias";
import type { Aircraft, Flight, Profile } from "@/types";

/**
 * Los vuelos que faltan pasar al CAD, armados en el server (`lib/cad.ts`). Los lee la
 * ventanita que habla con el CAD (`/cad/conector`) y la pantalla "Pasar al CAD".
 *
 * Sin cache: con los 20 s de `apiFetch`, un vuelo recién marcado volvería a aparecer.
 */
const FRESCO: RequestInit = { next: { revalidate: 0 } };

/** Un código de la ruta, con los que puede tener en el CAD: el OACI y el designador ANAC. */
function lugarParaCad(codigo: string): LugarParaCad {
  const c = codigo.trim().toUpperCase();
  const a = c ? getAirport(c) : null;
  const candidatos = [c, a?.icao, a?.local].filter((x): x is string => !!x).map((x) => x.toUpperCase());
  return { codigo: c, candidatos: [...new Set(candidatos)], nombre: a?.name ?? null };
}

export interface VuelosParaElCad {
  alumno: boolean;
  /** Los que faltan, del más nuevo al más viejo. */
  borradores: BorradorCad[];
  /** Cuántos ya están marcados como pasados. */
  pasados: number;
  /** Todos los vuelos de Vector, reducidos: para no traer del CAD uno que ya está. */
  conocidos: VueloConocido[];
  /** Las matrículas del Hangar (sin simuladores): un vuelo del CAD sólo se trae si su avión está. */
  matriculas: string[];
}

/** `null` si no se pudo leer (invariante 2: no es lo mismo que "no hay"). */
export async function vuelosParaElCad(): Promise<VuelosParaElCad | null> {
  try {
    const [vr, ar, pr] = await Promise.all([apiFetch("/flights", FRESCO), apiFetch("/aircraft", FRESCO), apiFetch("/profiles", FRESCO)]);
    if (!vr.ok || !ar.ok) return null;
    const vuelos = (await vr.json()) as (Flight & { cad_vuelo_id?: number | null })[];
    const aviones = (await ar.json()) as Aircraft[];
    const perfiles = pr.ok ? ((await pr.json()) as Profile[]) : [];
    const porId = new Map(aviones.map((a) => [a.id, a]));
    const faltan = vuelos
      .filter((f) => !f.cad_vuelo_id)
      .sort((a, b) => (b.takeoff || b.date || "").localeCompare(a.takeoff || a.date || ""));
    return {
      alumno: esAlumno(perfiles[0]?.license_type),
      borradores: faltan.map((f) => borradorCad(f, (f.aircraft_id && porId.get(f.aircraft_id)) || null, lugarParaCad)),
      pasados: vuelos.length - faltan.length,
      conocidos: vuelos.map((f) => ({
        cadId: f.cad_vuelo_id ?? null,
        salida: (f.takeoff ?? "").slice(0, 16),
        matricula: matriculaCad((f.aircraft_id && porId.get(f.aircraft_id)?.registration) || ""),
      })),
      matriculas: aviones.filter((a) => !a.is_simulator).map((a) => matriculaCad(a.registration)),
    };
  } catch {
    return null;
  }
}
