"use server";

import { revalidatePath } from "next/cache";
import { marcarEnElCad } from "@/actions/cad";
import { apiFetch } from "@/lib/api";
import { vuelosParaElCad } from "@/lib/cad-servidor";
import {
  corteCad,
  estaEnVector,
  faltaAutoridad,
  faltaSimulador,
  fechaCortaCad,
  filaCad,
  mismoVueloOtroDia,
  payloadCad,
  simuladorValido,
  vueloDesdeCad,
  yaEstaEnElCad,
  type AutoridadCad,
  type FilaCad,
  type FilaTraida,
  type ItemCad,
  type MemoriaAutoridades,
  type MotivoOmitido,
  type VueloEnElCad,
} from "@/lib/cad";
import { esErrorDeRedirect } from "@/lib/redirect-error";

/**
 * "Pasar al CAD desde Vector" (2.33.0): lo mismo que hace el panel del marcador
 * (`src/cad/puente.ts`), pero el CAD lo lee y lo escribe el backend con la cuenta de ANAC que
 * guardó el piloto (`/cad/*`, `services/cad_anac.py`, migración 036). La contraseña va del
 * formulario al backend y no vuelve nunca: estas acciones sólo ven si hay conexión.
 *
 * La lógica de cada vuelo es la de `lib/cad.ts` (`filaCad`, `payloadCad`), la misma del marcador.
 */

const FRESCO: RequestInit = { next: { revalidate: 0 } };

async function detalleDeError(r: Response, porDefecto: string): Promise<string> {
  const d = (await r.json().catch(() => ({}))) as { detail?: unknown };
  return typeof d.detail === "string" && d.detail ? d.detail : porDefecto;
}

export interface EstadoConexionCad {
  disponible: boolean;
  conectado: boolean;
  usuario: string | null;
  estado: "ok" | "rechazada" | null;
  error: string | null;
}

/** `null` si no se pudo leer (invariante 2). */
export async function estadoConexionCad(): Promise<EstadoConexionCad | null> {
  try {
    const r = await apiFetch("/cad/conexion", FRESCO);
    if (!r.ok) return null;
    return (await r.json()) as EstadoConexionCad;
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return null;
  }
}

export async function conectarCad(usuario: string, clave: string): Promise<{ ok: boolean; error?: string }> {
  const u = String(usuario ?? "").trim();
  const c = String(clave ?? "");
  if (!u || !c) return { ok: false, error: "Escribí tu usuario y tu contraseña de ANAC." };
  try {
    const r = await apiFetch("/cad/conexion", { method: "POST", body: JSON.stringify({ usuario: u.slice(0, 120), clave: c.slice(0, 200) }) });
    if (!r.ok) {
      const porDefecto = r.status === 503 ? "ANAC no contesta. Probá en un rato." : "No pudimos conectar tu cuenta de ANAC.";
      return { ok: false, error: await detalleDeError(r, porDefecto) };
    }
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { ok: false, error: "No pudimos hablar con Vector. Probá de nuevo." };
  }
  revalidatePath("/dashboard/history/cad");
  return { ok: true };
}

export async function desconectarCad(): Promise<{ ok: boolean }> {
  try {
    const r = await apiFetch("/cad/conexion", { method: "DELETE" });
    if (!r.ok) return { ok: false };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { ok: false };
  }
  revalidatePath("/dashboard/history/cad");
  return { ok: true };
}

/* -------------------------------------------------------------- leer --- */

type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; reconectar?: boolean };

async function delCad<T>(ruta: string): Promise<Resultado<T>> {
  const r = await apiFetch(`/cad/${ruta}`, FRESCO);
  if (r.ok) return { ok: true, datos: (await r.json()) as T };
  return { ok: false, error: await detalleDeError(r, "El CAD no contestó. Probá en un rato."), reconectar: r.status === 409 };
}

interface Listas {
  finalidades: ItemCad[];
  autoridades: ItemCad[];
  lugares: ItemCad[];
  simuladores: ItemCad[];
}

export interface PanelCad {
  filas: FilaCad[];
  autoridades: ItemCad[];
  simuladores: ItemCad[];
  /** Cuántos vuelos del CAD no están en Vector (para la pestaña "Traer a Vector"). */
  sinTraer: number;
}

/**
 * Lo que muestra el panel: cada vuelo de Vector contra lo que tiene el CAD. Se arma en el
 * server para no mandarle al teléfono la lista de 14.000 aeródromos del CAD.
 */
export async function prepararPanelCad(memoria: MemoriaAutoridades | null): Promise<Resultado<PanelCad>> {
  try {
    const [vector, listas, vuelos] = await Promise.all([vuelosParaElCad(), delCad<Listas>("listas"), delCad<{ datos: VueloEnElCad[] }>("vuelos")]);
    if (!vector) return { ok: false, error: "No pudimos leer tus vuelos de Vector. Probá de nuevo." };
    if (!listas.ok) return listas;
    if (!vuelos.ok) return vuelos;
    const enElCad = vuelos.datos.datos;
    const l = listas.datos;
    const ctx = { enElCad, finalidades: l.finalidades, lugares: l.lugares, autoridades: l.autoridades, corte: corteCad(enElCad), memoria };
    const filas: FilaCad[] = [
      ...vector.borradores.map((b) => filaCad(b, ctx)),
      ...vector.omitidos.map(({ motivo, ...b }) => ({ ...filaCad(b, ctx), omitido: motivo as MotivoOmitido, elegido: false })),
    ];
    return {
      ok: true,
      datos: {
        filas,
        autoridades: l.autoridades,
        simuladores: [...l.simuladores].sort((a, b) => a.value.localeCompare(b.value)),
        sinTraer: enElCad.filter((v) => !estaEnVector(v, vector.conocidos)).length,
      },
    };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { ok: false, error: "No pudimos leer el CAD. Probá en un rato." };
  }
}

/** El modelo que el CAD le asocia a un simulador: el formulario del CAD ofrece sólo ése. */
export async function modeloDeSimulador(simId: number): Promise<{ modeloId: number | null; modelo: string | null }> {
  try {
    if (!Number.isInteger(simId) || simId <= 0) return { modeloId: null, modelo: null };
    const r = await delCad<{ datos: ItemCad[] }>(`modelos?simId=${simId}`);
    const m = r.ok ? r.datos.datos[0] : undefined;
    return m ? { modeloId: Number(m.key) || null, modelo: m.value || null } : { modeloId: null, modelo: null };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { modeloId: null, modelo: null };
  }
}

/* ------------------------------------------------------------- cargar --- */

const ID_CAD = /^[A-Z0-9]{0,10}$/;

/**
 * Carga **un** vuelo en el CAD (el panel los manda de a uno, para mostrar el avance). El
 * borrador se arma de nuevo con lo que hay en Vector; de lo que llega del navegador sólo se
 * usan los IDs del CAD ya resueltos, la autoridad y el simulador, revisados.
 *
 * Si el CAD lo acepta, se anota en Vector con su id y la autoridad que se usó.
 */
export async function cargarEnCad(item: {
  vectorId: string;
  ids: { finalidadID: string; origenID: string; destinoID: string };
  autoridad: AutoridadCad;
  simulador?: unknown;
}): Promise<{ ok: boolean; mensaje: string; cadId?: number }> {
  try {
    const ids = item?.ids;
    if (
      !/^[0-9a-f-]{36}$/i.test(String(item?.vectorId)) ||
      !ids ||
      !/^\d{1,6}$/.test(String(ids.finalidadID)) ||
      !ID_CAD.test(String(ids.origenID).toUpperCase()) ||
      !ID_CAD.test(String(ids.destinoID).toUpperCase())
    )
      return { ok: false, mensaje: "El vuelo no tiene la forma esperada." };
    const autoridad = { id: String(item.autoridad?.id ?? ""), nombre: String(item.autoridad?.nombre ?? "").trim().toUpperCase().slice(0, 120) };
    if (faltaAutoridad(autoridad) || !/^\d{1,4}$/.test(autoridad.id)) return { ok: false, mensaje: "Falta la autoridad certificante o su nombre." };

    const vector = await vuelosParaElCad();
    const b = vector?.borradores.find((x) => x.vectorId === item.vectorId);
    if (!b) return { ok: false, mensaje: "Ese vuelo ya no está por pasar: recargá la pantalla." };
    if (b.problema) return { ok: false, mensaje: b.problema };
    const simulador = item.simulador === undefined ? null : simuladorValido(item.simulador);
    if (faltaSimulador(b, simulador)) return { ok: false, mensaje: "Elegí cuál es tu simulador en el CAD y su clase." };

    const payload = payloadCad(b, { ...ids, autoridadID: autoridad.id, autoridadNombre: autoridad.nombre }, simulador);
    const r = await apiFetch("/cad/vuelos", { method: "POST", body: JSON.stringify(payload) });
    if (!r.ok) return { ok: false, mensaje: await detalleDeError(r, "El CAD no contestó: fijate en el CAD si quedó antes de mandarlo de nuevo.") };
    const res = (await r.json()) as { ok: boolean; mensaje: string };
    if (!res.ok) return res;

    // El id sale de la lista del CAD: el mismo criterio que para los que ya estaban.
    const lista = await delCad<{ datos: VueloEnElCad[] }>("vuelos");
    const cadId = lista.ok ? yaEstaEnElCad(b, lista.datos.datos) : null;
    if (cadId) await marcarEnElCad([{ vectorId: b.vectorId, cadId, autoridad }]);
    return { ok: true, mensaje: cadId ? "Cargado en el CAD" : "Cargado en el CAD (no pudimos anotarlo en Vector todavía)", cadId: cadId ?? undefined };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { ok: false, mensaje: "No se pudo mandar: fijate en el CAD si quedó antes de probar de nuevo." };
  }
}

/* -------------------------------------------------------------- traer --- */

/**
 * Los vuelos del CAD que no están en Vector, leídos de a uno (`Get`) y traducidos al libro
 * (`vueloDesdeCad`). Crearlos es `traerDelCad`, la misma acción del marcador.
 */
export async function leerParaTraer(): Promise<Resultado<FilaTraida[]>> {
  try {
    const [vector, listas, vuelos] = await Promise.all([vuelosParaElCad(), delCad<Listas>("listas"), delCad<{ datos: VueloEnElCad[] }>("vuelos")]);
    if (!vector) return { ok: false, error: "No pudimos leer tus vuelos de Vector. Probá de nuevo." };
    if (!listas.ok) return listas;
    if (!vuelos.ok) return vuelos;
    const faltan = vuelos.datos.datos.filter((v) => !estaEnVector(v, vector.conocidos)).slice(0, 300);
    const filas: FilaTraida[] = new Array(faltan.length);
    let siguiente = 0;
    // De a cuatro: el CAD es del Estado y no hace falta apurarlo más.
    await Promise.all(
      Array.from({ length: Math.min(4, faltan.length) }, async () => {
        while (siguiente < faltan.length) {
          const k = siguiente++;
          const v = faltan[k];
          const d = await delCad<Record<string, unknown>>(`vuelos/${Number(v.vueloTripulanteID)}`);
          let t = vueloDesdeCad({ ...(v as unknown as Record<string, unknown>), ...(d.ok ? d.datos : {}) }, listas.datos, vector.matriculas);
          const otro = t.vuelo ? mismoVueloOtroDia(t.vuelo.takeoff, t.vuelo.matricula, vector.conocidos) : null;
          if (otro)
            t = {
              ...t,
              vuelo: null,
              problema: `En Vector figura el ${fechaCortaCad(otro)}, a la misma hora y en el mismo avión: ¿cuál es la fecha correcta? Corregí la que esté mal para no duplicarlo.`,
            };
          filas[k] = t;
        }
      })
    );
    return { ok: true, datos: filas };
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { ok: false, error: "No pudimos leer el CAD. Probá en un rato." };
  }
}

/**
 * "Cargarlo también en tu CAD", al registrar un vuelo (sólo se ofrece con la cuenta de ANAC
 * conectada). Todo se arma en el server, con la autoridad que se cargó en el formulario; lo
 * que no se pueda mandar vuelve como mensaje y el vuelo queda para "Pasar al CAD".
 */
export async function pasarVueloAlCad(vectorId: string): Promise<{ ok: boolean; mensaje: string }> {
  try {
    if (!/^[\w-]{1,64}$/.test(String(vectorId))) return { ok: false, mensaje: "El vuelo no tiene la forma esperada." };
    const [vector, listas, vuelos] = await Promise.all([vuelosParaElCad(), delCad<Listas>("listas"), delCad<{ datos: VueloEnElCad[] }>("vuelos")]);
    if (!listas.ok) return { ok: false, mensaje: listas.error };
    if (!vuelos.ok) return { ok: false, mensaje: vuelos.error };
    const b = vector?.borradores.find((x) => x.vectorId === vectorId);
    if (!b) return { ok: false, mensaje: "No encontramos el vuelo recién cargado. Pasalo desde Pasar al CAD." };
    const l = listas.datos;
    const f = filaCad(b, { enElCad: vuelos.datos.datos, finalidades: l.finalidades, lugares: l.lugares, autoridades: l.autoridades, corte: null, memoria: null });
    if (f.enElCad) {
      await marcarEnElCad([{ vectorId, cadId: f.enElCad }]);
      return { ok: true, mensaje: "Ya estaba en tu CAD: quedó anotado." };
    }
    if (f.problema || !f.ids) return { ok: false, mensaje: f.problema ?? "No se pudo armar para el CAD." };
    if (faltaSimulador(b)) return { ok: false, mensaje: "Elegí cuál es tu simulador en el CAD, desde Pasar al CAD." };
    if (!b.autoridad || faltaAutoridad(b.autoridad)) return { ok: false, mensaje: "Falta la autoridad certificante o su nombre." };
    return await cargarEnCad({ vectorId, ids: f.ids, autoridad: b.autoridad });
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
    return { ok: false, mensaje: "No pudimos hablar con el CAD. Pasalo desde Pasar al CAD." };
  }
}
