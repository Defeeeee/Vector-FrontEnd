import { apiFetch } from "@/lib/api";
import { Aircraft } from "@/types";
import NewFlightModal from "@/components/dashboard/NewFlightModal";
import { redirect } from "next/navigation";
import { parsePrefill } from "@/lib/prefill";

/**
 * Intercepted "Nuevo Vuelo".
 *
 * Renders whenever the pilot reaches /dashboard/log-flight from inside the app,
 * so the "+" opens a dialog over whatever they were looking at instead of
 * replacing it. A refresh or a shared link falls through to the real page at
 * ../log-flight, which stays exactly as it was.
 *
 * The live-session panel and the PDF import shortcut deliberately don't come
 * along: they belong to the "I'm setting up to fly" flow, not to "log the
 * flight I just did", and the full page still has both.
 */

interface PageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}

export default async function InterceptedLogFlight({ searchParams }: PageProps) {
  const resolvedParams = searchParams
    ? searchParams instanceof Promise
      ? await searchParams
      : searchParams
    : {};

  // Mismo parser que la página completa, a propósito: ver `src/lib/prefill.ts`.
  const { initialData, plannedId } = parsePrefill(resolvedParams);

  const [res, lbRes] = await Promise.all([apiFetch("/aircraft"), apiFetch("/logbooks")]);
  if (res.status === 401) {
    redirect("/api/auth/logout?redirect=/?expired=true");
  }
  const aircraft: Aircraft[] = res.ok ? await res.json() : [];
  const logbooks = lbRes.ok ? await lbRes.json() : [];

  return <NewFlightModal aircraft={aircraft} logbooks={logbooks} initialData={initialData} plannedId={plannedId} />;
}
