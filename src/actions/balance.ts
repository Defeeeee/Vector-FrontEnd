"use server";

import { apiFetch } from "@/lib/api";
import { revalidatePath } from "next/cache";

export async function toggleTrackingMode(profileId: string, mode: 'packs' | 'balance') {
  if (!profileId) {
    throw new Error("ID de perfil no encontrado");
  }

  const response = await apiFetch(`/profiles/${profileId}`, {
    method: "PATCH",
    body: JSON.stringify({
      tracking_mode: mode
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Error al cambiar el modo de seguimiento");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/balance");
  revalidatePath("/dashboard/settings");
}

export async function depositBalance(amount: number, description?: string) {
  if (amount === 0) {
    throw new Error("El monto no puede ser cero");
  }

  const response = await apiFetch("/transactions/deposit", {
    method: "POST",
    body: JSON.stringify({
      amount,
      type: "deposit",
      description: description || "Carga de saldo"
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Error al realizar la carga de saldo");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/balance");
}

export async function updateAircraftCost(aircraftId: string, costPerHour: number) {
  if (!aircraftId) {
    throw new Error("ID de aeronave no encontrado");
  }

  const response = await apiFetch(`/aircraft/${aircraftId}`, {
    method: "PATCH",
    body: JSON.stringify({
      cost_per_hour: costPerHour
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Error al actualizar la tarifa de la aeronave");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/balance");
  revalidatePath("/dashboard/settings");
}
