"use server";

import { apiFetch } from "@/lib/api";
import { MAX_OFFSET_DAYS } from "@/lib/expiry-rules";
import { PilotDocument } from "@/types";
import { revalidatePath } from "next/cache";

function parseAlertDays(raw: FormDataEntryValue | null): number[] {
  const value = (raw as string) || "";
  const parsed = value
    .split(",")
    .map((part) => parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  // Descending so the sweep's "tightest bucket already crossed" logic reads
  // naturally, and deduplicated so a stray "30,30" can't fire twice.
  return parsed.length > 0 ? Array.from(new Set(parsed)).sort((a, b) => b - a) : [60, 30, 7];
}

/**
 * Los tres campos que deciden cuándo vence, a partir del modo que eligió el form.
 *
 * Van juntos y no sueltos porque son incoherentes por separado: el CHECK de la
 * migración 011 rechaza una regla derivada sin offset y un offset sobre una regla
 * fija. Armarlos en un solo lugar es lo que garantiza que el trío siempre cierre.
 *
 * Con `ultimo_vuelo` **no se manda `expiry_date`**: esa columna pasa a tener un solo
 * escritor, que es el recálculo del backend. Mandarla desde acá sería abrir un
 * segundo escritor sobre el dato que después bloquea el semáforo.
 */
function parseVencimiento(formData: FormData) {
  const modo = (formData.get("expiry_mode") as string) || "fecha";

  if (modo === "ultimo_vuelo") {
    const dias = parseInt(((formData.get("expiry_offset_days") as string) || "").trim(), 10);
    if (!Number.isFinite(dias) || dias < 1 || dias > MAX_OFFSET_DAYS) {
      return { error: `Los días tienen que ser un número entre 1 y ${MAX_OFFSET_DAYS}` } as const;
    }
    return {
      payload: { expiry_rule: "ultimo_vuelo", expiry_offset_days: dias, expiry_date: null },
    } as const;
  }

  // "" es lo que manda un <input type="date"> vacío o deshabilitado. Va como null:
  // el documento no vence. Ver `documentStatus`.
  return {
    payload: {
      expiry_rule: "fijo",
      expiry_offset_days: null,
      expiry_date: ((formData.get("expiry_date") as string) || "").trim() || null,
    },
  } as const;
}

function revalidateDocuments() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function createDocument(formData: FormData) {
  const vencimiento = parseVencimiento(formData);
  if ("error" in vencimiento) return { error: vencimiento.error };

  const payload = {
    kind: (formData.get("kind") as string) || "otro",
    blocking: (formData.get("blocking") as string) || "nada",
    name: (formData.get("name") as string)?.trim(),
    ...vencimiento.payload,
    issued_date: (formData.get("issued_date") as string) || null,
    notes: ((formData.get("notes") as string) || "").trim() || null,
    alert_days: parseAlertDays(formData.get("alert_days")),
  };

  if (!payload.name) {
    return { error: "El nombre es obligatorio" };
  }

  const response = await apiFetch("/documents", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return { error: error.detail || "No se pudo crear el documento" };
  }

  revalidateDocuments();
  return { success: true };
}

export async function updateDocument(documentId: string, formData: FormData) {
  const vencimiento = parseVencimiento(formData);
  if ("error" in vencimiento) return { error: vencimiento.error };

  const payload = {
    kind: (formData.get("kind") as string) || "otro",
    blocking: (formData.get("blocking") as string) || "nada",
    name: (formData.get("name") as string)?.trim(),
    ...vencimiento.payload,
    issued_date: (formData.get("issued_date") as string) || null,
    notes: ((formData.get("notes") as string) || "").trim() || null,
    alert_days: parseAlertDays(formData.get("alert_days")),
  };

  if (!payload.name) {
    return { error: "El nombre es obligatorio" };
  }

  const response = await apiFetch(`/documents/${documentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return { error: error.detail || "No se pudo actualizar el documento" };
  }

  revalidateDocuments();
  return { success: true };
}

export async function deleteDocument(documentId: string) {
  const response = await apiFetch(`/documents/${documentId}`, { method: "DELETE" });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return { error: error.detail || "No se pudo borrar el documento" };
  }

  revalidateDocuments();
  return { success: true };
}

/**
 * Sets the CMA expiry, creating the document the first time.
 *
 * Used by the onboarding overlay, which asks for the medical before the pilot
 * has ever seen the documents section. An upsert rather than a plain create so
 * re-running onboarding can't leave two CMA rows behind.
 */
export async function upsertCmaDocument(expiryDate: string) {
  if (!expiryDate) return { error: "Falta la fecha de vencimiento del CMA" };

  const listResponse = await apiFetch("/documents");
  const existing: PilotDocument[] = listResponse.ok ? await listResponse.json() : [];
  const cma = existing.find((doc) => doc.kind === "cma");

  const payload = {
    kind: "cma",
    name: "Certificado Médico Aeronáutico",
    expiry_date: expiryDate,
    // Explícito aunque sea el default: si el documento ya existía con una regla
    // derivada, el PATCH parcial la dejaría puesta y el próximo vuelo pisaría la
    // fecha que el piloto acaba de escribir acá.
    expiry_rule: "fijo",
    expiry_offset_days: null,
    alert_days: [60, 30, 7],
  };

  const response = cma
    ? await apiFetch(`/documents/${cma.id}`, { method: "PATCH", body: JSON.stringify(payload) })
    : await apiFetch("/documents", { method: "POST", body: JSON.stringify(payload) });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return { error: error.detail || "No se pudo guardar el CMA" };
  }

  revalidateDocuments();
  return { success: true };
}
