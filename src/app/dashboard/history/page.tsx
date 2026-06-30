import { apiFetch } from "@/lib/api";
import { Flight, Aircraft, Profile } from "@/types";
import { Plus, Search, Plane } from "lucide-react";
import Link from "next/link";
import FlightCard from "@/components/dashboard/FlightCard";
import ExportFlightsButton from "@/components/dashboard/ExportFlightsButton";
import ExportPdfButton from "@/components/dashboard/ExportPdfButton";
import FlightListClient from "@/components/dashboard/FlightListClient";

import { redirect } from "next/navigation";

async function getHistoryData() {
  const response = await apiFetch("/dashboard");

  if (response.status === 401) {
    console.log("HistoryPage: 401 Unauthorized. Redirecting to logout...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }

  if (!response.ok) {
    return { flights: [], aircraft: [], profile: null };
  }

  const data = await response.json();
  return {
    flights: (data.flights || []) as Flight[],
    aircraft: (data.aircraft || []) as Aircraft[],
    profile: (data.profile || null) as Profile | null
  };
}

export default async function HistoryPage() {
  const { flights, aircraft, profile } = await getHistoryData();
  const aircraftMap = new Map(aircraft.map(a => [a.id, a]));

  const sortedFlights = [...flights].sort(
    (a, b) => new Date(b.takeoff).getTime() - new Date(a.takeoff).getTime()
  );

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 px-2 pt-4 md:pt-8">
        <div className="space-y-2 md:space-y-4">
          <div className="h-px w-8 md:w-12 bg-zinc-200 dark:bg-white/20" />
          <h2 className="text-5xl md:text-6xl font-space-grotesk font-bold tracking-tighter text-zinc-900 dark:text-white leading-none">Bitácora</h2>
          <div className="flex items-center space-x-2 md:space-x-3 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
            <span>{sortedFlights.length} Vuelos Registrados</span>
            <span className="text-zinc-300 dark:text-zinc-600 hidden sm:inline">•</span>
            <span className="hidden sm:inline">Historial Completo</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* <ExportPdfButton flights={sortedFlights} aircraft={aircraft} profile={profile} /> */}
          <ExportFlightsButton flights={sortedFlights} aircraft={aircraft} />
          
          <Link href="/dashboard/log-flight" className="flex-1 md:flex-none bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-[10px] uppercase tracking-[0.2em] px-8 md:px-10 py-4 md:py-5 rounded-xl shadow-cal-highlight dark:shadow-none transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 flex items-center justify-center space-x-3">
            <span>Nuevo Registro</span>
            <Plus className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Search/Filter Mockup (Visual only) */}
      <FlightListClient flights={sortedFlights} aircraft={aircraft} />
    </div>
  );
}
