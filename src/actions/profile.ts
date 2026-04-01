"use server";

import { apiFetch } from "@/lib/api";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const id = formData.get("id") as string;
  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const license_type = formData.get("license_type") as string;
  const cma_expiry = formData.get("cma_expiry") as string;

  if (!id) {
    throw new Error("ID de perfil no encontrado");
  }

  const response = await apiFetch(`/profiles/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      first_name,
      last_name,
      license_type,
      cma_expiry: cma_expiry || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Error al actualizar el perfil");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}
