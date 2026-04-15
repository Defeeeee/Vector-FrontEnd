import { apiFetch } from "@/lib/api";
import { Flight, Aircraft } from "@/types";
import { Plus, Search, Plane } from "lucide-react";
import Link from "next/link";
import FlightCard from "@/components/dashboard/FlightCard";

import { redirect } from "next/navigation";

async function getHistoryData() {
  const [flightsRes, aircraftRes] = await Promise.all([
    apiFetch("/flights"),
    apiFetch("/aircraft")
  ]);

  if (flightsRes.status === 401 || aircraftRes.status === 401) {
    console.log("HistoryPage: 401 Unauthorized. Redirecting to logout...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }

  const flights: Flight[] = flightsRes.ok ? await flightsRes.json() : [];
  const aircraft: Aircraft[] = aircraftRes.ok ? await aircraftRes.json() : [];

  return { flights, aircraft };
}

export default async function HistoryPage() {
  const { flights, aircraft } = await getHistoryData();
  const aircraftMap = new Map(aircraft.map(a => [a.id, a]));

  const sortedFlights = [...flights].sort(
    (a, b) => new Date(b.takeoff).getTime() - new Date(a.takeoff).getTime()
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2 pt-8">
        <div className="space-y-4">
          <div className="h-px w-12 bg-zinc-200 dark:bg-white/20" />
          <h2 className="text-6xl font-space-grotesk font-bold tracking-tighter text-zinc-900 dark:text-white leading-none">Bitácora</h2>
          <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
            <span>{sortedFlights.length} Vuelos Registrados</span>
            <span className="text-zinc-300 dark:text-zinc-600">•</span>
            <span>Historial Completo</span>
          </div>
        </div>
        
        <Link href="/dashboard/log-flight" className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-[10px] uppercase tracking-[0.2em] px-10 py-5 rounded-xl shadow-cal-highlight dark:shadow-none transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 flex items-center space-x-3">
          <span>Nuevo Registro</span>
          <Plus className="w-4 h-4" />
        </Link>
      </div>

      {/* Search/Filter Mockup (Visual only) */}
      <div className="relative group max-w-md mx-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
        <input 
          placeholder="BUSCAR VUELO, RUTA O MATRÍCULA..." 
          className="w-full bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-2xl py-5 pl-14 pr-6 outline-none focus:border-zinc-400 dark:focus:border-white/30 transition-all text-[10px] font-bold tracking-widest text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm"
        />
      </div>

      <div className="space-y-1">
        {sortedFlights.length > 0 ? (
          sortedFlights.map(flight => (
            <FlightCard 
              key={flight.id} 
              flight={flight} 
              aircraft={flight.aircraft_id ? aircraftMap.get(flight.aircraft_id) : undefined}
              allAircraft={aircraft}
            />
          ))
        ) : (
          <div className="p-20 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 border-dashed rounded-[3rem] text-center space-y-6 shadow-sm dark:shadow-none">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto border border-zinc-100 dark:border-white/10">
              <Plane className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white uppercase tracking-tighter">Sin registros</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">Inicia tu carrera registrando tu primer vuelo</p>
            </div>
            <Link href="/dashboard/log-flight" className="inline-flex items-center space-x-3 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-white/20 pb-1 text-[10px] font-bold uppercase tracking-widest hover:border-zinc-900 dark:hover:border-white transition-colors">
              <span>Registrar Ahora</span>
              <Plus className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
