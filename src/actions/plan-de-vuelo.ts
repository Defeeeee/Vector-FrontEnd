"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import { esErrorDeRedirect } from "@/lib/redirect-error";
import { duplicar, leerFormulario, normalizar, revisar, type FormularioPlan, type PerfilAvionPlan } from "@/lib/formulario-plan";
import { leerPlan } from "@/lib/plan-de-vuelo-servidor";
import type { Demora } from "@/lib/demora-plan";

/**
 * Los planes de vuelo guardados (`/planes-de-vuelo` del backend, migración 024).
 *
 * **Qué se revalida:** la lista (`/dashboard/plan-de-vuelo`). El editor es dueño de su
 * estado y guarda solo mientras el piloto escribe; revalidarlo en cada guardado volvería
 * a dibujar el formulario debajo de los dedos. Misma excepción que las publicaciones
 * (invariante 8, `actions/social.ts`).
 *
 * Todo devuelve `{ error }` en vez de tirar, salvo lo que termina en un `redirect`.
 */

const LISTA = "/dashboard/plan-de-vuelo";

async function detalle(res: Response, porDefecto: string): Promise<string> {
  const err = await res.json().catch(() => ({}));
  return typeof err?.detail === "string" ? err.detail : porDefecto;
}

/** Crea un plan y abre el editor. */
export async function crearPlan(formulario: FormularioPlan): Promise<{ error: string } | never> {
  let id: string | null = null;
  try {
    // Sin fecha, la de hoy en UTC (la DOF/ va en UTC), como FPL.AR. Se resuelve acá, en el server.
    const hoy = new Date().toISOString().slice(0, 10);
    const f = normalizar(formulario.dofUtc ? formulario : { ...formulario, dofUtc: hoy });
    const res = await apiFetch("/planes-de-vuelo", {
      method: "POST",
      body: JSON.stringify({ formulario: f, aircraft_id: f.aircraftId, completo: revisar(f).completo }),
    });
    if (!res.ok) return { error: await detalle(res, "No se pudo crear el plan de vuelo.") };
    id = ((await res.json()) as { id: string }).id;
    revalidatePath(LISTA);
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { error: "Error de conexión con el servidor." };
  }
  redirect(`${LISTA}/${id}`);
}

/**
 * El mismo vuelo otro día: copia el plan sin fecha, hora ni demoras, y abre el editor.
 * Es lo que más usa Federico en FPL.AR: casi todos sus planes son repetidos.
 */
export async function duplicarPlan(id: string): Promise<{ error: string } | never> {
  const plan = await leerPlan(id);
  if (!plan) return { error: "No se encontró el plan para duplicar." };
  return crearPlan(duplicar(leerFormulario(plan.formulario)));
}

/** El guardado del editor, mientras se escribe. */
export async function guardarPlan(id: string, formulario: FormularioPlan) {
  try {
    const f = normalizar(formulario);
    const res = await apiFetch(`/planes-de-vuelo/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ formulario: f, aircraft_id: f.aircraftId, completo: revisar(f).completo }),
    });
    if (!res.ok) return { error: await detalle(res, "No se pudo guardar el plan.") };
    revalidatePath(LISTA);
    return { ok: true as const };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { error: "Sin conexión: el plan no se guardó." };
  }
}

/** Anota que se bajó o compartió el PDF. */
export async function marcarDescargado(id: string) {
  try {
    const res = await apiFetch(`/planes-de-vuelo/${id}`, { method: "PATCH", body: JSON.stringify({ descargado: true }) });
    if (!res.ok) return { error: await detalle(res, "No se pudo anotar la descarga.") };
    revalidatePath(LISTA);
    return { ok: true as const };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { error: "Error de conexión con el servidor." };
  }
}

/** Las demoras avisadas (DLA): hasta tres por vuelo (AIP ENR 1.10, 7.3). */
export async function guardarDemoras(id: string, demoras: Demora[]) {
  try {
    const res = await apiFetch(`/planes-de-vuelo/${id}`, { method: "PATCH", body: JSON.stringify({ demoras }) });
    if (!res.ok) return { error: await detalle(res, "No se pudo guardar la demora.") };
    revalidatePath(LISTA);
    return { ok: true as const };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { error: "Error de conexión con el servidor." };
  }
}

export async function borrarPlan(id: string) {
  try {
    const res = await apiFetch(`/planes-de-vuelo/${id}`, { method: "DELETE" });
    if (!res.ok) return { error: await detalle(res, "No se pudo borrar el plan.") };
    revalidatePath(LISTA);
    return { ok: true as const };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { error: "Error de conexión con el servidor." };
  }
}

/** La firma del piloto, para los PDF que vienen. */
export async function guardarFirma(png: string) {
  try {
    const res = await apiFetch("/planes-de-vuelo/firma", { method: "PUT", body: JSON.stringify({ png }) });
    if (!res.ok) return { error: await detalle(res, "No se pudo guardar la firma.") };
    return { ok: true as const };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { error: "Error de conexión con el servidor." };
  }
}

export async function borrarFirma() {
  try {
    await apiFetch("/planes-de-vuelo/firma", { method: "DELETE" });
    return { ok: true as const };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { error: "Error de conexión con el servidor." };
  }
}

/**
 * Lo fijo del avión para el plan (`aircraft.plan_vuelo`). Lo usan el Hangar y el botón
 * "Guardar en el avión" del editor. Revalida donde se lee la lista de aviones.
 */
export async function guardarPerfilAvion(aircraftId: string, perfil: PerfilAvionPlan) {
  try {
    const res = await apiFetch(`/aircraft/${aircraftId}`, { method: "PATCH", body: JSON.stringify({ plan_vuelo: perfil }) });
    if (!res.ok) return { error: await detalle(res, "No se pudo guardar el perfil del avión.") };
    revalidatePath("/dashboard/settings");
    revalidatePath(LISTA);
    revalidatePath("/dashboard/planificador");
    return { ok: true as const };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { error: "Error de conexión con el servidor." };
  }
}
