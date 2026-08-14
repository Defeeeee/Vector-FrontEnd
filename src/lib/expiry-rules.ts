import { sumarDias } from "@/lib/planned-flights";
import type { ExpiryRule, PilotDocument } from "@/types";

/**
 * Vencimientos que se mueven solos.
 *
 * El CMA y la licencia vencen el día que dice el papel. La otra mitad de lo que
 * condiciona a un piloto de escuela no tiene fecha, tiene una **regla**: "si pasás
 * 60 días sin volar necesitás un vuelo de adaptación", "la autorización del
 * instructor caduca a los 90 días del último vuelo". Escrita a mano, una fecha así
 * está mal desde el día siguiente.
 *
 * **La cuenta la hace el backend y la guarda en `expiry_date`.** Ver
 * `migrations/011_documents_expiry_rule.sql` y `src/services/derived_expiries.py`:
 * el barrido de avisos corre de noche sobre todos los pilotos filtrando por esa
 * columna, así que derivarla en cada lectura obligaría a ese barrido a traerse los
 * vuelos de cada uno.
 *
 * Lo de acá es el otro lado: **explicarle la regla al piloto**. Sin esto ve una
 * fecha que se le mueve sola y no sabe por qué. Y `vencimientoDerivado` repite la
 * aritmética del backend a propósito, para que el formulario pueda mostrar la fecha
 * resultante antes de guardar.
 */

export type { ExpiryRule };

/** Espejo del CHECK de la migración 011. Un vencimiento a 300 años no es un vencimiento. */
export const MAX_OFFSET_DAYS = 3650;

/** Lo que ofrece el formulario. "No vence" no es una regla: es `expiry_date` en null. */
export type ModoVencimiento = "fecha" | "ultimo_vuelo" | "no_vence";

/**
 * En qué modo está un documento ya guardado.
 *
 * `expiry_rule` puede faltar: un backend sin la migración 011, o una fila leída de
 * una caché vieja. Ausente significa `'fijo'`, que es lo que eran todas las filas
 * antes de esa migración.
 */
export function modoDe(doc: PilotDocument | undefined): ModoVencimiento {
  if (!doc) return "fecha";
  if (doc.expiry_rule === "ultimo_vuelo") return "ultimo_vuelo";
  return doc.expiry_date ? "fecha" : "no_vence";
}

/**
 * La fecha que resulta de la regla, o `null` si todavía no hay de dónde sacarla.
 *
 * Sin vuelos no hay ancla, y `null` significa "no vence" desde la migración 007:
 * ni vencido ni avisos. Es lo correcto y no un caso degradado — una cuenta que
 * arranca con el último vuelo, sin ningún vuelo, no arrancó.
 */
export function vencimientoDerivado(
  ultimoVueloIso: string | null | undefined,
  offsetDays: number | null | undefined
): string | null {
  if (!ultimoVueloIso || !offsetDays || offsetDays <= 0) return null;
  return sumarDias(ultimoVueloIso.slice(0, 10), offsetDays);
}

/**
 * La regla en una línea, para poner debajo de la fecha.
 *
 * Devuelve `null` cuando no hay nada que explicar: un vencimiento fijo es la fecha
 * y nada más, y agregarle una leyenda es ruido en la lista de todos los pilotos que
 * no usan reglas.
 */
export function descripcionRegla(doc: PilotDocument): string | null {
  if (doc.expiry_rule !== "ultimo_vuelo" || !doc.expiry_offset_days) return null;
  const dias = doc.expiry_offset_days;
  return `${dias} ${dias === 1 ? "día" : "días"} después de tu último vuelo`;
}

/**
 * Qué decirle al piloto sobre una regla derivada, dado lo que sabemos hoy.
 *
 * Los tres casos son distintos y el del medio es el que importa: **volar corre la
 * fecha hacia adelante**. Es al revés que todo el resto de los vencimientos de
 * Vector, donde lo único que ayuda es un trámite, y si no se dice el piloto lee la
 * cuenta regresiva como una amenaza en vez de como lo que es.
 */
export function ayudaRegla(offsetDays: number, ultimoVueloIso: string | null): string {
  if (!ultimoVueloIso) {
    return "Todavía no tenés vuelos cargados, así que la cuenta no empezó. " +
      "En cuanto cargues uno, el vencimiento aparece solo.";
  }
  const vence = vencimientoDerivado(ultimoVueloIso, offsetDays);
  return `Tu último vuelo es del ${ultimoVueloIso}, así que hoy vence el ${vence}. ` +
    "Cada vuelo que cargues lo corre hacia adelante.";
}
