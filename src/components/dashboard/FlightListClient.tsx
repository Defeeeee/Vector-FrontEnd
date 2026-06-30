"use client";

import { useState } from "react";
import { Flight, Aircraft } from "@/types";
import { Search, Plane, Plus } from "lucide-react";
import Link from "next/link";
import FlightCard from "@/components/dashboard/FlightCard";
import { AnimatePresence, motion } from "framer-motion";

interface FlightListClientProps {
  flights: Flight[];
  aircraft: Aircraft[];
}

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

  return (
    <div className="space-y-6 md:space-y-8 w-full">
      {/* Search/Filter */}
      <div className="relative group max-w-md mx-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
        <input 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="BUSCAR VUELO, RUTA O MATRÍCULA..." 
          className="w-full bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-2xl py-4 md:py-5 pl-14 pr-6 outline-none focus:border-zinc-400 dark:focus:border-white/30 transition-all text-[9px] md:text-[10px] font-bold tracking-widest text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm"
        />
      </div>

      <div className="space-y-2 md:space-y-1 relative">
        <AnimatePresence mode="popLayout">
          {filteredFlights.length > 0 ? (
            filteredFlights.map(flight => (
              <motion.div
                key={flight.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <FlightCard 
                  flight={flight} 
                  aircraft={flight.aircraft_id ? aircraftMap.get(flight.aircraft_id) : undefined}
                  allAircraft={aircraft}
                />
              </motion.div>
            ))
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-10 md:p-20 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 border-dashed rounded-[2rem] md:rounded-[3rem] text-center space-y-6 shadow-sm dark:shadow-none"
            >
              <div className="w-16 h-16 bg-zinc-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto border border-zinc-100 dark:border-white/10">
                <Plane className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white uppercase tracking-tighter">Sin registros</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">No se encontraron vuelos que coincidan con tu búsqueda</p>
              </div>
              {searchQuery === "" && (
                <Link href="/dashboard/log-flight" className="inline-flex items-center space-x-3 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-white/20 pb-1 text-[10px] font-bold uppercase tracking-widest hover:border-zinc-900 dark:hover:border-white transition-colors">
                  <span>Registrar Ahora</span>
                  <Plus className="w-3 h-3" />
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
