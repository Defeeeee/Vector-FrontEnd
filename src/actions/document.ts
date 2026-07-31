"use server";

import { apiFetch } from "@/lib/api";
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

function revalidateDocuments() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function createDocument(formData: FormData) {
  const payload = {
    kind: (formData.get("kind") as string) || "otro",
    name: (formData.get("name") as string)?.trim(),
    expiry_date: formData.get("expiry_date") as string,
    issued_date: (formData.get("issued_date") as string) || null,
    notes: ((formData.get("notes") as string) || "").trim() || null,
    alert_days: parseAlertDays(formData.get("alert_days")),
  };

  if (!payload.name || !payload.expiry_date) {
    return { error: "Nombre y fecha de vencimiento son obligatorios" };
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
  const payload = {
    kind: (formData.get("kind") as string) || "otro",
    name: (formData.get("name") as string)?.trim(),
    expiry_date: formData.get("expiry_date") as string,
    issued_date: (formData.get("issued_date") as string) || null,
    notes: ((formData.get("notes") as string) || "").trim() || null,
    alert_days: parseAlertDays(formData.get("alert_days")),
  };

  if (!payload.name || !payload.expiry_date) {
    return { error: "Nombre y fecha de vencimiento son obligatorios" };
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
