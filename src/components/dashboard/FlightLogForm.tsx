"use client";

import { useState, useEffect } from "react";
import { Aircraft } from "@/types";
import { logFlight } from "@/actions/flight";
import { Plane, Route, MapPin, Clock, Calendar, ArrowRight, Loader2, Compass } from "lucide-react";
import { calculateFlightDuration } from "@/lib/utils";
import { motion } from "framer-motion";

interface FlightLogFormProps {
  aircraft: Aircraft[];
}

export default function FlightLogForm({ aircraft }: FlightLogFormProps) {
  const [takeoff, setTakeoff] = useState("");
  const [landing, setLanding] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (takeoff && landing) {
      const calculated = calculateFlightDuration(takeoff, landing);
      setDuration(calculated.toFixed(1));
    }
  }, [takeoff, landing]);

  return (
    <form action={logFlight} className="space-y-12">
      
      {/* Aircraft Selection */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3 px-2">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">01. Aeronave</p>
        </div>
        <div className="relative group">
          <select 
            name="aircraft_id" 
            required
            className="w-full bg-white/[0.02] border border-white/5 rounded-[2rem] px-8 py-6 text-xl font-black text-white outline-none focus:border-white/20 transition-all appearance-none uppercase tracking-tighter"
          >
            <option value="" disabled selected>Seleccionar Matrícula</option>
            {aircraft.map(ac => (
              <option key={ac.id} value={ac.id} className="bg-black text-white">
                {ac.registration} — {ac.type}
              </option>
            ))}
          </select>
          <Compass className="absolute right-8 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 pointer-events-none" />
        </div>
      </section>

      {/* Flight Data */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3 px-2">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">02. Datos de Vuelo</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Ruta (ICAO)" icon={<Route className="w-4 h-4" />}>
            <input 
              name="route" 
              placeholder="SAEZ SACO" 
              required
              className="w-full bg-transparent py-2 text-xl font-black text-white outline-none uppercase tracking-tighter"
            />
          </FormField>

          <FormField label="Fecha" icon={<Calendar className="w-4 h-4" />}>
            <input 
              type="date" 
              name="date" 
              required
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full bg-transparent py-2 text-xl font-black text-white outline-none [color-scheme:dark]"
            />
          </FormField>

          <FormField label="Despegue (UTC)" icon={<Clock className="w-4 h-4 text-emerald-500" />}>
            <input 
              type="time" 
              name="takeoff" 
              required
              value={takeoff}
              onChange={(e) => setTakeoff(e.target.value)}
              className="w-full bg-transparent py-2 text-xl font-black text-white outline-none [color-scheme:dark]"
            />
          </FormField>

          <FormField label="Aterrizaje (UTC)" icon={<Clock className="w-4 h-4 text-red-500" />}>
            <input 
              type="time" 
              name="landing" 
              required
              value={landing}
              onChange={(e) => setLanding(e.target.value)}
              className="w-full bg-transparent py-2 text-xl font-black text-white outline-none [color-scheme:dark]"
            />
          </FormField>

          <FormField label="Duración Estimada" icon={<Clock className="w-4 h-4 text-zinc-500" />}>
            <input 
              type="number" 
              step="0.1"
              name="duration" 
              placeholder="0.0"
              required
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-transparent py-2 text-xl font-black text-white outline-none"
            />
          </FormField>

          <FormField label="Aterrizajes" icon={<MapPin className="w-4 h-4 text-zinc-500" />}>
            <input 
              type="number" 
              name="landings" 
              min="1"
              defaultValue="1"
              required
              className="w-full bg-transparent py-2 text-xl font-black text-white outline-none"
            />
          </FormField>
        </div>
      </section>

      <div className="pt-8">
        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit" 
          className="w-full bg-white text-black font-black text-xs uppercase tracking-[0.3em] py-8 rounded-[2rem] shadow-2xl flex items-center justify-center space-x-4 transition-all"
        >
          <span>Confirmar Registro de Vuelo</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </form>
  );
}

function FormField({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] space-y-4 group focus-within:border-white/20 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
        <div className="text-zinc-800 group-focus-within:text-zinc-400 transition-colors">{icon}</div>
      </div>
      {children}
    </div>
  );
}
