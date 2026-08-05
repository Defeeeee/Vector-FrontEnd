"use server";

import { apiFetch } from "@/lib/api";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const id = formData.get("id") as string;
  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const license_type = formData.get("license_type") as string;
  const whatsapp_phone = formData.get("whatsapp_phone") as string;

  if (!id) {
    throw new Error("ID de perfil no encontrado");
  }

  // The medical lives in the `documents` table (see src/actions/document.ts).
  // `profiles.cma_expiry` was the old home and is being dropped — nothing here
  // writes it, and re-adding it would recreate the split source of truth.
  const response = await apiFetch(`/profiles/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      first_name,
      last_name,
      license_type,
      whatsapp_phone: whatsapp_phone || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Error al actualizar el perfil");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function regenerateApiKey() {
  const response = await apiFetch("/profiles/apikey/regenerate", {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Error al regenerar el token");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}
