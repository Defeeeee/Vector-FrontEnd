import { apiFetch } from "@/lib/api";
import { Flight, Aircraft } from "@/types";
import { Plus, Search, Plane } from "lucide-react";
import Link from "next/link";
import FlightCard from "@/components/dashboard/FlightCard";

async function getHistoryData() {
  const [flightsRes, aircraftRes] = await Promise.all([
    apiFetch("/flights"),
    apiFetch("/aircraft")
  ]);

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2">
        <div className="space-y-4">
          <div className="h-px w-12 bg-white/20" />
          <h2 className="text-6xl font-black tracking-tighter text-white leading-none">Bitácora</h2>
          <div className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
            <span>{sortedFlights.length} Vuelos Registrados</span>
            <span className="text-zinc-800">•</span>
            <span>Historial Completo</span>
          </div>
        </div>
        
        <Link href="/dashboard/log-flight" className="bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] px-10 py-5 rounded-full shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center space-x-3">
          <span>Nuevo Registro</span>
          <Plus className="w-4 h-4" />
        </Link>
      </div>

      {/* Search/Filter Mockup (Visual only) */}
      <div className="relative group max-w-md mx-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-white transition-colors" />
        <input 
          placeholder="BUSCAR VUELO, RUTA O MATRÍCULA..." 
          className="w-full bg-white/[0.02] border border-white/[0.05] rounded-2xl py-5 pl-14 pr-6 outline-none focus:border-white/10 transition-all text-[10px] font-black tracking-widest text-white placeholder:text-zinc-700"
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
          <div className="p-20 bg-white/[0.01] border border-white/[0.03] border-dashed rounded-[3rem] text-center space-y-6">
            <div className="w-16 h-16 bg-white/[0.02] rounded-full flex items-center justify-center mx-auto">
              <Plane className="w-6 h-6 text-zinc-700" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Sin registros</h3>
              <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Inicia tu carrera registrando tu primer vuelo</p>
            </div>
            <Link href="/dashboard/log-flight" className="inline-flex items-center space-x-3 text-white border-b border-white/20 pb-1 text-[10px] font-black uppercase tracking-widest hover:text-zinc-300 transition-colors">
              <span>Registrar Ahora</span>
              <Plus className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
