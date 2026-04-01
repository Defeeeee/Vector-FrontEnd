"use server";

import { apiFetch } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function logFlight(formData: FormData) {
  const aircraft_id = formData.get("aircraft_id") as string;
  const date = formData.get("date") as string;
  const rawRoute = formData.get("route") as string;
  const landings = parseInt(formData.get("landings") as string, 10);
  const duration = parseFloat(formData.get("duration") as string);
  const takeoff_time = formData.get("takeoff") as string;
  const landing_time = formData.get("landing") as string;

  let route = rawRoute.trim();
  if (route.includes('-')) {
    route = route.replace(/\s+/g, '');
  }

  const takeoff_dt = new Date(`${date}T${takeoff_time}:00Z`).toISOString().split('.')[0] + 'Z';
  const landing_dt = new Date(`${date}T${landing_time}:00Z`).toISOString().split('.')[0] + 'Z';

  const response = await apiFetch("/flights", {
    method: "POST",
    body: JSON.stringify({
      aircraft_id,
      date,
      route,
      landings: Number(landings),
      duration: Number(duration),
      takeoff: takeoff_dt,
      landing: landing_dt,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to log flight");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  redirect("/dashboard/history");
}

export async function updateFlight(formData: FormData) {
  const id = formData.get("id") as string;
  const aircraft_id = formData.get("aircraft_id") as string;
  const date = formData.get("date") as string;
  const rawRoute = formData.get("route") as string;
  const landings = parseInt(formData.get("landings") as string, 10);
  const duration = parseFloat(formData.get("duration") as string);
  const takeoff_time = formData.get("takeoff") as string;
  const landing_time = formData.get("landing") as string;

  if (!id) return { error: "ID de vuelo no encontrado" };

  if (!takeoff_time || !landing_time) {
    return { error: "Las horas de despegue y aterrizaje son obligatorias" };
  }

  let route = rawRoute.trim();
  if (route.includes('-')) {
    route = route.replace(/\s+/g, '');
  }

  // Robust combination of Date + Time into ISO string
  try {
    // Format: YYYY-MM-DDTHH:MM:SSZ (No milliseconds for Pydantic stability)
    const takeoff_dt = new Date(`${date}T${takeoff_time}:00Z`).toISOString().split('.')[0] + 'Z';
    const landing_dt = new Date(`${date}T${landing_time}:00Z`).toISOString().split('.')[0] + 'Z';

    const payload = {
      aircraft_id: String(aircraft_id),
      date: String(date),
      route: String(route),
      landings: Number(landings),
      duration: Number(duration),
      takeoff: takeoff_dt,
      landing: landing_dt,
    };

    console.log("Sending PATCH to backend:", JSON.stringify(payload, null, 2));

    const response = await apiFetch(`/flights/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Validation error from backend:", JSON.stringify(error, null, 2));
      return { error: error.detail || "Error de validación: Verifique los datos" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/history");
    return { success: true };
  } catch (e) {
    console.error("Error creating ISO dates:", e);
    return { error: "Formato de hora inválido" };
  }
}

export async function deleteFlight(id: string) {
  try {
    const response = await apiFetch(`/flights/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { error: error.detail || "Error al eliminar el vuelo" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/history");
    return { success: true };
  } catch (e) {
    return { error: "Error de conexión con el servidor" };
  }
}

export async function addAircraft(formData: FormData) {
  const registration = formData.get("registration") as string;
  const icao = formData.get("icao") as string;
  const type = formData.get("type") as string;

  const response = await apiFetch("/aircraft", {
    method: "POST",
    body: JSON.stringify({ registration, icao, type }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to add aircraft");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function updateAircraft(formData: FormData) {
  const id = formData.get("id") as string;
  const registration = formData.get("registration") as string;
  const icao = formData.get("icao") as string;
  const type = formData.get("type") as string;

  if (!id) return { error: "ID de aeronave no encontrado" };

  try {
    const response = await apiFetch(`/aircraft/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ registration, icao, type }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { error: error.detail || "Error al actualizar aeronave" };
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (e) {
    return { error: "Error de conexión con el servidor" };
  }
}

export async function deleteAircraft(id: string) {
  try {
    const response = await apiFetch(`/aircraft/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { error: error.detail || "No se puede eliminar: la aeronave podría tener vuelos asociados" };
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (e) {
    return { error: "Error de conexión con el servidor" };
  }
}

export async function toggleFlightSession(formData: FormData) {
  const aircraft_id = formData.get("aircraft_id") as string;
  const route = formData.get("route") as string;
  const landings = parseInt(formData.get("landings") as string, 10) || 0;

  const body = aircraft_id ? JSON.stringify({ aircraft_id, route, landings }) : undefined;

  const response = await apiFetch("/flight-helper/session", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to toggle session");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
}
