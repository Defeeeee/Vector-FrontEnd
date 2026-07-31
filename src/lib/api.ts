import { getSessionToken } from "@/actions/auth";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.flightlog.fdiaznem.com.ar";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = await getSessionToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Briefly cache GETs so switching between dashboard tabs a few seconds apart
  // reuses the same response instead of re-hitting the backend on every nav.
  // Mutations (anything with an explicit method) are never cached. Server
  // actions already call revalidatePath after writes, which busts this
  // immediately, so it doesn't cause stale data after logging/editing.
  const isMutation = !!options.method && options.method.toUpperCase() !== "GET";
  const defaultCache = isMutation ? {} : { next: { revalidate: 20 } };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...defaultCache,
    ...options,
    headers,
  });

  if (response.status === 401) {
    console.log(`apiFetch: 401 Unauthorized for ${endpoint}.`);
    // We don't redirect here anymore because it causes "Cookies can only be modified" error
    // when called during Server Component rendering.
    // The proxy or the component should handle authentication state.
  }

  return response;
}
