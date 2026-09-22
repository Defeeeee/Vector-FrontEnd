"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import { esErrorDeRedirect } from "@/lib/redirect-error";
import { normalizarHandle, rutaPerfil } from "@/lib/handle";
import { mensajeDeErrorApi } from "@/lib/social";
import type { PerfilPublico, PilotoResumen, RelacionSocial, Visibilidad } from "@/types";

/**
 * La red social, del lado de la app. Cada acción revalida lo que cambia:
 *
 * - el layout del dashboard, porque el punto rojo de las solicitudes vive ahí y
 *   `revalidatePath("/dashboard", "layout")` alcanza a todas sus pantallas;
 * - el perfil público de los pilotos involucrados, `/u/<handle>`.
 *
 * `apiFetch` cachea los GET 20 s: una pantalla que falte acá mostraría el estado viejo
 * de un seguimiento que el piloto acaba de cambiar.
 */

type Resultado<T> = ({ ok: true } & T) | { ok: false; error: string };

function revalidarRed(...handles: (string | null | undefined)[]) {
  revalidatePath("/dashboard", "layout");
  for (const h of handles) if (h) revalidatePath(rutaPerfil(h));
}

async function cuerpo(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

async function enviar<T>(
  ruta: string,
  metodo: "POST" | "PUT" | "DELETE",
  porDefecto: string,
  body?: unknown
): Promise<Resultado<{ datos: T }>> {
  try {
    const res = await apiFetch(ruta, {
      method: metodo,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const datos = await cuerpo(res);
    if (!res.ok) return { ok: false, error: mensajeDeErrorApi(datos, porDefecto) };
    return { ok: true, datos: datos as T };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { ok: false, error: porDefecto };
  }
}

// ---------------------------------------------------------------------------
// El @ propio
// ---------------------------------------------------------------------------

export interface DatosPerfilPublico {
  handle: string;
  nombre_visible: string;
  licencia?: string | null;
  bio?: string | null;
  visibilidad: Visibilidad;
}

export async function guardarPerfilPublico(
  datos: DatosPerfilPublico,
  handleAnterior?: string | null
): Promise<Resultado<{ perfil: PerfilPublico }>> {
  const r = await enviar<PerfilPublico>("/perfil-publico", "PUT", "No se pudo guardar tu perfil.", {
    ...datos,
    handle: normalizarHandle(datos.handle),
  });
  if (!r.ok) return r;
  // El handle viejo también: si cambió, su página tiene que dejar de mostrarlo.
  revalidarRed(r.datos.handle, handleAnterior);
  revalidatePath("/dashboard/settings");
  return { ok: true, perfil: r.datos };
}

export async function salirDeLaRed(handleActual: string): Promise<Resultado<object>> {
  const r = await enviar("/perfil-publico", "DELETE", "No se pudo borrar tu perfil.");
  if (!r.ok) return r;
  revalidarRed(handleActual);
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

/**
 * Si un @ está libre, para avisar mientras se tipea. `true` también si es el propio:
 * guardarlo sin cambios no es un conflicto.
 */
export async function handleDisponible(handle: string, propio?: string | null): Promise<boolean | null> {
  const h = normalizarHandle(handle);
  if (propio && normalizarHandle(propio) === h) return true;
  try {
    const res = await apiFetch(`/publico/pilotos/${encodeURIComponent(h)}`, { cache: "no-store" }, { anonimo: true });
    if (res.status === 404) return true;
    if (res.ok) return false;
    return null; // No se pudo preguntar: el backend decide al guardar.
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Buscar y seguir
// ---------------------------------------------------------------------------

export async function buscarPilotos(q: string): Promise<PilotoResumen[]> {
  const texto = q.trim();
  if (texto.length < 2) return [];
  try {
    const res = await apiFetch(`/pilotos?q=${encodeURIComponent(texto)}`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as PilotoResumen[]) : [];
  } catch {
    return [];
  }
}

export async function seguirPiloto(handle: string): Promise<Resultado<{ relacion: RelacionSocial }>> {
  const h = normalizarHandle(handle);
  const r = await enviar<{ relacion: RelacionSocial }>(
    `/pilotos/${encodeURIComponent(h)}/seguir`,
    "POST",
    "No se pudo seguir a este piloto."
  );
  if (!r.ok) return r;
  revalidarRed(h);
  return { ok: true, relacion: r.datos.relacion };
}

export async function dejarDeSeguirPiloto(handle: string): Promise<Resultado<{ relacion: RelacionSocial }>> {
  const h = normalizarHandle(handle);
  const r = await enviar<{ relacion: RelacionSocial }>(
    `/pilotos/${encodeURIComponent(h)}/seguir`,
    "DELETE",
    "No se pudo dejar de seguir a este piloto."
  );
  if (!r.ok) return r;
  revalidarRed(h);
  return { ok: true, relacion: r.datos.relacion };
}

// ---------------------------------------------------------------------------
// Solicitudes y seguidores
// ---------------------------------------------------------------------------

export async function aceptarSolicitud(handle: string, miHandle?: string | null): Promise<Resultado<object>> {
  const h = normalizarHandle(handle);
  const r = await enviar(`/social/solicitudes/${encodeURIComponent(h)}/aceptar`, "POST", "No se pudo aceptar la solicitud.");
  if (!r.ok) return r;
  revalidarRed(h, miHandle);
  return { ok: true };
}

export async function rechazarSolicitud(handle: string, miHandle?: string | null): Promise<Resultado<object>> {
  const h = normalizarHandle(handle);
  const r = await enviar(`/social/solicitudes/${encodeURIComponent(h)}`, "DELETE", "No se pudo rechazar la solicitud.");
  if (!r.ok) return r;
  revalidarRed(h, miHandle);
  return { ok: true };
}

export async function sacarSeguidor(handle: string, miHandle?: string | null): Promise<Resultado<object>> {
  const h = normalizarHandle(handle);
  const r = await enviar(`/social/seguidores/${encodeURIComponent(h)}`, "DELETE", "No se pudo sacar a este seguidor.");
  if (!r.ok) return r;
  revalidarRed(h, miHandle);
  return { ok: true };
}
