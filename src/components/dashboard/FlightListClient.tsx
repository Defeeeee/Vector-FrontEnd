"use client";

import { useMemo, useState } from "react";
import { Flight, Aircraft } from "@/types";
import { Search, Plane, Plus } from "lucide-react";
import Link from "next/link";
import FlightCard from "@/components/dashboard/FlightCard";
import { AnimatePresence, motion } from "framer-motion";

interface FlightListClientProps {
  flights: Flight[];
  aircraft: Aircraft[];
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function FlightListClient({ flights, aircraft }: FlightListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const aircraftMap = new Map(aircraft.map(a => [a.id, a]));

  const filteredFlights = flights.filter(flight => {
    const searchLower = searchQuery.toLowerCase();
    const ac = flight.aircraft_id ? aircraftMap.get(flight.aircraft_id) : undefined;
    const registration = ac?.registration?.toLowerCase() || "";
    const route = flight.route.toLowerCase();

    return route.includes(searchLower) || registration.includes(searchLower);
  });

  // Group into ledger pages by calendar month
  const monthGroups = useMemo(() => {
    const groups = new Map<string, { label: string; flights: Flight[]; hours: number }>();
    for (const f of filteredFlights) {
      const d = new Date(f.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!groups.has(key)) {
        groups.set(key, { label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, flights: [], hours: 0 });
      }
      const g = groups.get(key)!;
      g.flights.push(f);
      g.hours += f.duration;
    }
    return Array.from(groups.values());
  }, [filteredFlights]);

  return (
    <div className="space-y-6 md:space-y-8 w-full">
      {/* Search/Filter */}
      <div className="relative group max-w-xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar vuelo, ruta o matrícula..."
          className="w-full bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-2xl py-4 md:py-5 pl-14 pr-6 outline-none focus:border-aviation-blue dark:focus:border-aviation-cyan transition-all text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm"
        />
      </div>

      {monthGroups.length > 0 ? (
        <div className="space-y-8">
          <AnimatePresence mode="popLayout">
            {monthGroups.map((group) => (
              <motion.div
                key={group.label}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {/* Ledger page header */}
                <div className="flex items-baseline justify-between px-1">
                  <h3 className="text-lg font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tight capitalize">{group.label}</h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold font-space-grotesk text-aviation-blue-dark dark:text-aviation-cyan">{group.hours.toFixed(1)}</span>
                    <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">hs · {group.flights.length} {group.flights.length === 1 ? "vuelo" : "vuelos"}</span>
                  </div>
                </div>

                {/* Ledger table */}
                <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl md:rounded-[2rem] shadow-sm dark:shadow-none overflow-hidden">
                  {/* Column labels (desktop only) */}
                  <div className="hidden md:grid grid-cols-[80px_130px_1fr_100px_72px] gap-4 px-6 py-2.5 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/60 dark:bg-white/[0.02] text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                    <span>Fecha</span>
                    <span>Ruta</span>
                    <span>Aeronave</span>
                    <span className="text-right">Horas</span>
                    <span />
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-white/5">
                    {group.flights.map(flight => (
                      <FlightCard
                        key={flight.id}
                        flight={flight}
                        aircraft={flight.aircraft_id ? aircraftMap.get(flight.aircraft_id) : undefined}
                        allAircraft={aircraft}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-10 md:p-20 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 border-dashed rounded-[2rem] md:rounded-[3rem] text-center space-y-6 shadow-sm dark:shadow-none"
        >
          <div className="w-16 h-16 bg-zinc-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto border border-zinc-100 dark:border-white/10">
            <Plane className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tight">Sin registros</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">No se encontraron vuelos que coincidan con tu búsqueda</p>
          </div>
          {searchQuery === "" && (
            <Link href="/dashboard/log-flight" className="inline-flex items-center space-x-3 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-white/20 pb-1 text-sm font-semibold hover:border-zinc-900 dark:hover:border-white transition-colors">
              <span>Registrar ahora</span>
              <Plus className="w-3 h-3" />
            </Link>
          )}
        </motion.div>
      )}
    </div>
  );
}
