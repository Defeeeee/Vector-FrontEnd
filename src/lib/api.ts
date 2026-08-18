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

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      /*
        Un backend que acepta la conexión y no contesta cuelga el render hasta que
        la plataforma lo mate. "No explotar" con treinta segundos de pantalla en
        blanco sigue siendo explotar, sólo que despacio. El timeout cae en el mismo
        `catch` de abajo y produce el mismo 503.
      */
      signal: AbortSignal.timeout(8000),
      ...defaultCache,
      ...options,
      headers,
    });
  } catch (error) {
    /*
      Sin red, `fetch` tira `TypeError: fetch failed` y esa excepción sube al render
      del server component. Como `dashboard/layout.tsx` también llama acá sin
      protección, **una falla de red reventaba el layout y con él las trece páginas
      del dashboard**: pantalla en blanco con "Application error".

      Devolver un `Response` sintético en vez de propagar es lo que evita eso, y la
      forma importa: los doce llamadores ya hacen `if (!response.ok)` y
      `if (response.status === 401)`. Un 503 fluye por ese camino **sin tocar un solo
      call site**, y en `dashboard/page.tsx` cae solo en el patrón `unavailable` que
      ya distingue "no hay datos" de "no pudimos preguntar".

      El cuerpo va en JSON —y no vacío— para que un llamador descuidado que haga
      `.json()` sin mirar el status reciba un objeto y no una excepción nueva.
    */
    console.error(`apiFetch: sin respuesta de ${endpoint}:`, error);
    return new Response(
      JSON.stringify({ detail: "No se pudo contactar al servidor", offline: true }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  if (response.status === 401) {
    console.log(`apiFetch: 401 Unauthorized for ${endpoint}.`);
    // We don't redirect here anymore because it causes "Cookies can only be modified" error
    // when called during Server Component rendering.
    // The proxy or the component should handle authentication state.
  }

  return response;
}
