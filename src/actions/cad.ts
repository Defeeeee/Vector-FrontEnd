"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import { esErrorDeRedirect } from "@/lib/redirect-error";

/**
 * Anota en Vector los vuelos que quedaron en el CAD de ANAC, con su id de allá (migración
 * 029). La llama la ventanita `/cad/conector` cuando el script del CAD le avisa qué creó o
 * qué ya estaba. Es una marca del libro: no toca el cobro.
 *
 * Sólo se aceptan ids con la forma de un vuelo de Vector y de un vuelo del CAD, y un tope
 * por pedido: lo que llega viene de otra pestaña.
 */
export async function marcarEnElCad(items: { vectorId: string; cadId: number }[]) {
  const validos = (Array.isArray(items) ? items : [])
    .filter((i) => /^[0-9a-f-]{36}$/i.test(String(i?.vectorId)) && Number.isInteger(i?.cadId) && i.cadId > 0)
    .slice(0, 300);
  let marcados = 0;
  try {
    for (const i of validos) {
      const r = await apiFetch(`/flights/${i.vectorId}`, { method: "PATCH", body: JSON.stringify({ cad_vuelo_id: i.cadId }) });
      if (r.ok) marcados++;
    }
  } catch (e) {
    if (esErrorDeRedirect(e)) throw e;
  }
  if (marcados > 0) {
    revalidatePath("/dashboard/history");
    revalidatePath("/dashboard/history/cad");
  }
  return { marcados };
}
