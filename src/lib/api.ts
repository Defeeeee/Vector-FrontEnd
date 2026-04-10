import { getSessionToken } from "@/actions/auth";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = await getSessionToken();
  
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    console.log(`apiFetch: 401 Unauthorized for ${endpoint}.`);
    // We don't redirect here anymore because it causes "Cookies can only be modified" error
    // when called during Server Component rendering.
    // The middleware or the component should handle authentication state.
  }

  return response;
}
