import { apiFetch } from "@/lib/api";
import { Flight, Aircraft, Profile, Transaction } from "@/types";
import { costosPorVuelo } from "@/lib/costos";
import { Plus, Clock, LandPlot, Plane } from "lucide-react";
import Link from "next/link";
import ExportFlightsButton from "@/components/dashboard/ExportFlightsButton";
import FlightListClient from "@/components/dashboard/FlightListClient";
import PageHeader from "@/components/dashboard/PageHeader";

import { redirect } from "next/navigation";

async function getHistoryData() {
  const response = await apiFetch("/dashboard");

  if (response.status === 401) {
    console.log("HistoryPage: 401 Unauthorized. Redirecting to logout...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }

  if (!response.ok) {
    return { flights: [], aircraft: [], profile: null, transactions: [] as Transaction[] };
  }

  const data = await response.json();
  return {
    flights: (data.flights || []) as Flight[],
    aircraft: (data.aircraft || []) as Aircraft[],
    profile: (data.profile || null) as Profile | null,
    // Ya venían en el payload y se descartaban: son de dónde sale cuánto costó
    // cada vuelo y cada mes del libro. Ver `src/lib/costos.ts`.
    transactions: (data.transactions || []) as Transaction[]
  };
}

export default async function HistoryPage() {
  const { flights, aircraft, profile, transactions } = await getHistoryData();
  const costos = costosPorVuelo(transactions);

  const sortedFlights = [...flights].sort(
    (a, b) => new Date(b.takeoff).getTime() - new Date(a.takeoff).getTime()
  );

  const totalHours = sortedFlights.reduce((acc, f) => acc + f.duration, 0);
  const totalLandings = sortedFlights.reduce((acc, f) => acc + f.landings, 0);

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full">
      <PageHeader
        eyebrow="Historial completo"
        title="Bitácora"
        action={
          <>
            <ExportFlightsButton flights={sortedFlights} aircraft={aircraft} />
            <Link href="/dashboard/log-flight" className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm px-6 py-3.5 rounded-xl shadow-cal-highlight dark:shadow-none transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 flex items-center justify-center gap-2">
              <span>Nuevo registro</span>
              <Plus className="w-4 h-4" />
            </Link>
          </>
        }
      >
        <div className="flex items-center gap-5 pt-1 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5"><Plane className="w-3.5 h-3.5" /> {sortedFlights.length} vuelos</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {totalHours.toFixed(1)} hs</span>
          <span className="flex items-center gap-1.5"><LandPlot className="w-3.5 h-3.5" /> {totalLandings} aterrizajes</span>
        </div>
      </PageHeader>

      <FlightListClient flights={sortedFlights} aircraft={aircraft} costos={costos} />
    </div>
  );
}
