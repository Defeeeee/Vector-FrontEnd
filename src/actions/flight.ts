"use server";

import { apiFetch } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function getNumber(val: any): number | null {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

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

  // Server-side validation
  const total = Number(duration);
  const sumLogs = [
    formData.get("pic_day_loc"), formData.get("pic_day_tra"), formData.get("pic_night_loc"), formData.get("pic_night_tra"),
    formData.get("sic_day_loc"), formData.get("sic_day_tra"), formData.get("sic_night_loc"), formData.get("sic_night_tra")
  ].reduce((acc, val) => acc + (parseFloat(val as string) || 0), 0);

  if (sumLogs > total + 0.01) {
    throw new Error(`La suma de tiempos PIC/SIC (${sumLogs.toFixed(1)}h) no puede superar el total (${total.toFixed(1)}h)`);
  }

  const payload = {
    aircraft_id,
    date,
    route,
    landings: Number(landings),
    duration: Number(duration),
    takeoff: takeoff_dt,
    landing: landing_dt,
    pic_day_loc: getNumber(formData.get("pic_day_loc")),
    pic_day_tra: getNumber(formData.get("pic_day_tra")),
    pic_night_loc: getNumber(formData.get("pic_night_loc")),
    pic_night_tra: getNumber(formData.get("pic_night_tra")),
    sic_day_loc: getNumber(formData.get("sic_day_loc")),
    sic_day_tra: getNumber(formData.get("sic_day_tra")),
    sic_night_loc: getNumber(formData.get("sic_night_loc")),
    sic_night_tra: getNumber(formData.get("sic_night_tra")),
    "IMC Pil": getNumber(formData.get("imc_pil")),
    "IMC Cop": getNumber(formData.get("imc_cop")),
    "Capota": getNumber(formData.get("capota")),
    "Sim Instructor": getNumber(formData.get("sim_instructor")),
    "Sim Pil en Inst": getNumber(formData.get("sim_pil_en_inst")),
  };

  const response = await apiFetch("/flights", {
    method: "POST",
    body: JSON.stringify(payload),
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
  const takeoff_time = formData.get("takeoff_time") as string;
  const landing_time = formData.get("landing_time") as string;

  if (!id) return { error: "ID de vuelo no encontrado" };

  if (!takeoff_time || !landing_time) {
    return { error: "Las horas de despegue y aterrizaje son obligatorias" };
  }

  let route = rawRoute.trim();
  if (route.includes('-')) {
    route = route.replace(/\s+/g, '');
  }

  const takeoff_dt = new Date(`${date}T${takeoff_time}:00Z`).toISOString().split('.')[0] + 'Z';
  const landing_dt = new Date(`${date}T${landing_time}:00Z`).toISOString().split('.')[0] + 'Z';

  // Server-side validation
  const total = Number(duration);
  const sumLogs = [
    formData.get("pic_day_loc"), formData.get("pic_day_tra"), formData.get("pic_night_loc"), formData.get("pic_night_tra"),
    formData.get("sic_day_loc"), formData.get("sic_day_tra"), formData.get("sic_night_loc"), formData.get("sic_night_tra")
  ].reduce((acc, val) => acc + (parseFloat(val as string) || 0), 0);

  if (sumLogs > total + 0.01) {
    return { error: `La suma de tiempos PIC/SIC (${sumLogs.toFixed(1)}h) no puede superar el total (${total.toFixed(1)}h)` };
  }

  const payload = {
    aircraft_id: String(aircraft_id),
    date: String(date),
    route: String(route),
    landings: Number(landings),
    duration: Number(duration),
    takeoff: takeoff_dt,
    landing: landing_dt,
    pic_day_loc: getNumber(formData.get("pic_day_loc")),
    pic_day_tra: getNumber(formData.get("pic_day_tra")),
    pic_night_loc: getNumber(formData.get("pic_night_loc")),
    pic_night_tra: getNumber(formData.get("pic_night_tra")),
    sic_day_loc: getNumber(formData.get("sic_day_loc")),
    sic_day_tra: getNumber(formData.get("sic_day_tra")),
    sic_night_loc: getNumber(formData.get("sic_night_loc")),
    sic_night_tra: getNumber(formData.get("sic_night_tra")),
    "IMC Pil": getNumber(formData.get("imc_pil")),
    "IMC Cop": getNumber(formData.get("imc_cop")),
    "Capota": getNumber(formData.get("capota")),
    "Sim Instructor": getNumber(formData.get("sim_instructor")),
    "Sim Pil en Inst": getNumber(formData.get("sim_pil_en_inst")),
  };

  try {
    const response = await apiFetch(`/flights/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { error: error.detail || "Error de validación en el servidor" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/history");
    return { success: true };
  } catch (e) {
    return { error: "Error de conexión con el servidor" };
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
  const type_acft = formData.get("aircraft_type_wip") as string;

  const response = await apiFetch("/aircraft", {
    method: "POST",
    body: JSON.stringify({ registration, icao, type, type_acft }),
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
  const type_acft = formData.get("type_acft") as string;

  if (!id) return { error: "ID de aeronave no encontrado" };

  try {
    const response = await apiFetch(`/aircraft/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ registration, icao, type, type_acft }),
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

  const data = await response.json();
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  return data;
}
