"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import { esErrorDeRedirect } from "@/lib/redirect-error";
import { duplicar, leerFormulario, normalizar, revisar, type FormularioPlan, type PerfilAvionPlan } from "@/lib/formulario-plan";
import { emailDeLaSesion, firmaGuardada, leerPlan, pilotoParaPlan } from "@/lib/plan-de-vuelo-servidor";
import { armarMailPlan, type ModoEnvio } from "@/lib/plan-de-vuelo-mail";
import { nombreDelArchivo } from "@/lib/plan-de-vuelo";
import { oficinasAro } from "@/lib/oficinas-aro-disco";
import { oficinaParaSalida } from "@/lib/oficinas-aro";
import { enviarMail } from "@/lib/mailer";
import fs from "node:fs";
import path from "node:path";
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

/** Si el envío a la oficina ARO/AIS está prendido (`PLAN_DE_VUELO_ENVIO_ARO=1` en el `.env`). */
function envioAroActivo(): boolean {
  return process.env.PLAN_DE_VUELO_ENVIO_ARO === "1";
}

/**
 * Manda el plan por mail con el PDF firmado: de prueba al piloto, o a la oficina ARO/AIS
 * con copia al piloto (`lib/plan-de-vuelo-mail.ts`).
 *
 * **El envío a la oficina se prende con `PLAN_DE_VUELO_ENVIO_ARO=1`**: hasta que Federico
 * lo pruebe con su mail y lo apruebe (2026-10-19), sólo sale la prueba.
 *
 * Todo se rearma en el server con lo guardado —el plan, la firma, la oficina—, no con lo
 * que mande el navegador: el mail sólo puede ir al piloto o a una oficina de la AIC.
 */
export async function enviarPlan(id: string, modo: ModoEnvio) {
  try {
    if (modo === "aro" && !envioAroActivo()) return { error: "El envío a la oficina todavía no está activado." };

    // Primero el backend: si lee el plan, el token es auténtico y su mail también.
    const guardado = await leerPlan(id);
    if (!guardado) return { error: "No se encontró el plan." };
    if ((guardado.envios?.length ?? 0) >= 20) return { error: "Este plan ya se mandó 20 veces." };
    const email = await emailDeLaSesion();
    if (!email) return { error: "No pudimos leer el mail de tu cuenta. Volvé a entrar y probá de nuevo." };

    const f = leerFormulario(guardado.formulario);
    const r = revisar(f, new Date().toISOString());
    if (!r.completo) return { error: "Al plan le faltan casillas: completalo antes de mandarlo." };
    if (modo === "aro" && r.avisos.some((a) => a.campo === "fechaHora")) {
      return { error: "La salida ya pasó: revisá la fecha y la hora antes de mandarlo a la oficina." };
    }
    const [firma, piloto] = await Promise.all([firmaGuardada(), pilotoParaPlan()]);
    if (!firma) return { error: "Falta tu firma: la AIC pide el plan firmado." };

    const oficinas = oficinasAro();
    const oficina =
      oficinas.find((o) => o.oaci === f.oficina) ?? (f.salida ? oficinaParaSalida(f.salida, oficinas)?.oficina : null) ?? null;
    if (modo === "aro" && !oficina) return { error: "Elegí la oficina ARO/AIS." };

    const { pdfPlanDeVuelo } = await import("@/lib/plan-de-vuelo-pdf");
    const fondo = fs.readFileSync(path.join(process.cwd(), "src", "lib", "plan-de-vuelo-eana.jpg"));
    const firmaPng = Buffer.from(firma.split(",")[1] ?? "", "base64");
    const pdf = await pdfPlanDeVuelo(r.plan, { fondoJpg: new Uint8Array(fondo), firmaPng: new Uint8Array(firmaPng) });

    const mail = armarMailPlan({
      plan: r.plan,
      nombres: { salida: f.salida?.nombre ?? "", destino: f.destino?.nombre ?? "" },
      piloto: email,
      oficina: oficina ? { correo: oficina.correo, nombre: oficina.nombre, oaci: oficina.oaci } : null,
      modo,
    });
    const enviado = await enviarMail({
      para: mail.para,
      cc: mail.cc,
      responderA: mail.responderA,
      asunto: mail.asunto,
      texto: mail.texto,
      html: mail.html,
      adjuntos: [{ nombre: nombreDelArchivo(r.plan), base64: Buffer.from(pdf).toString("base64") }],
      nombreRemitente: piloto.nombre ? `${piloto.nombre} vía Vector` : undefined,
    });
    if (!enviado.enviado) return { error: `No se pudo mandar el mail: ${enviado.motivo ?? "error desconocido"}` };

    // Si no se puede anotar, el mail igual salió: se dice, pero no es un error.
    const anotado = await apiFetch(`/planes-de-vuelo/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ envio: { modo, a: mail.para, resend_id: enviado.id ?? null } }),
    });
    revalidatePath(LISTA);
    return { ok: true as const, a: mail.para, cc: mail.cc, anotado: anotado.ok };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { error: "Error de conexión con el servidor." };
  }
}
