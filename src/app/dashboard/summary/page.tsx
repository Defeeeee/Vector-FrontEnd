import { apiFetch } from "@/lib/api";
import { Flight, Aircraft } from "@/types";
import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import SummaryClient from "@/components/dashboard/SummaryClient";
import { getAirport } from "@/lib/airports";
import { splitRoute } from "@/lib/summary";

async function getSummaryData() {
  const response = await apiFetch("/dashboard");

  if (response.status === 401) {
    console.log("SummaryPage: 401 Unauthorized. Redirecting to logout...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }

  if (!response.ok) {
    return { flights: [] as Flight[], aircraft: [] as Aircraft[] };
  }

  const data = await response.json();
  return {
    flights: (data.flights || []) as Flight[],
    aircraft: (data.aircraft || []) as Aircraft[],
  };
}

export default async function SummaryPage() {
  const { flights, aircraft } = await getSummaryData();

  // Resolved here rather than in the client: `getAirport` reads the in-memory
  // TSV index, which is server-only. Only the codes this pilot actually flew
  // get sent, so the payload stays a handful of strings instead of 755 KB.
  const airportNames: Record<string, string> = {};
  for (const f of flights) {
    for (const icao of splitRoute(f.route)) {
      if (!icao || icao === "???" || airportNames[icao]) continue;
      const hit = getAirport(icao);
      if (hit) airportNames[icao] = hit.name;
    }
  }

  // "Today" is decided on the server and passed down, so the period cutoffs do
  // not shift between a UTC server and a UTC-3 browser. Same rule as the
  // heatmap and the documents card.
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8 md:space-y-12 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        eyebrow="Tu carrera como piloto, narrada por los datos"
        title="Resumen de horas"
      />
      <SummaryClient
        flights={flights}
        aircraft={aircraft}
        todayIso={todayIso}
        airportNames={airportNames}
      />
    </div>
  );
}
