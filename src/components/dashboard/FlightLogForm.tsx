"use client";

import { useState, useEffect } from "react";
import { Aircraft } from "@/types";
import { logFlight } from "@/actions/flight";
import { Route, MapPin, Clock, Calendar, ArrowRight, Loader2, Compass, User, Users, Cloud, AlertCircle, Monitor } from "lucide-react";
import { calculateFlightDuration, isLocalFlight } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FlightLogFormProps {
  aircraft: Aircraft[];
  initialData?: {
    aircraft_id?: string;
    route?: string;
    takeoff?: string;
    landing?: string;
    date?: string;
    landings?: number;
    duration?: string;
  };
  onSuccess?: () => void;
}

export default function FlightLogForm({ aircraft, initialData, onSuccess }: FlightLogFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [takeoff, setTakeoff] = useState(initialData?.takeoff || "");
  const [landing, setLanding] = useState(initialData?.landing || "");
  const [route, setRoute] = useState(initialData?.route || "");
  const [duration, setDuration] = useState(initialData?.duration || "");
  
  // New: Calculate duration from initialData if present but duration is empty
  useEffect(() => {
    if (initialData?.takeoff && initialData?.landing && !initialData?.duration) {
      const calculated = calculateFlightDuration(initialData.takeoff, initialData.landing);
      setDuration(calculated.toFixed(1));
    }
  }, [initialData]);

  const [landings, setLandings] = useState(initialData?.landings?.toString() || "1");
  const [aircraftId, setAircraftId] = useState(initialData?.aircraft_id || "");
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  // Individual log states for validation and auto-copy
  const [picDayLoc, setPicDayLoc] = useState("");
  const [picDayTra, setPicDayTra] = useState("");
  
  // New: Pre-calculate auto-copy if initialData is provided
  useEffect(() => {
    if (duration && route) {
      const local = isLocalFlight(route);
      if (local) {
        setPicDayLoc(duration);
        setPicDayTra("");
      } else {
        setPicDayLoc("");
        setPicDayTra(duration);
      }
    }
  }, [duration, route, initialData]); // Include initialData in deps to trigger once on load if duration/route set

  const [picNightLoc, setPicNightLoc] = useState("");
  const [picNightTra, setPicNightTra] = useState("");
  const [sicDayLoc, setSicDayLoc] = useState("");
  const [sicDayTra, setSicDayTra] = useState("");
  const [sicNightLoc, setSicNightLoc] = useState("");
  const [sicNightTra, setSicNightTra] = useState("");
  
  // Conditions & Training states
  const [imcPil, setImcPil] = useState("");
  const [imcCop, setImcCop] = useState("");
  const [capota, setCapota] = useState("");
  const [simInst, setSimInst] = useState("");
  const [simPil, setSimPil] = useState("");

  // Calculate total duration from times
  useEffect(() => {
    if (takeoff && landing) {
      const calculated = calculateFlightDuration(takeoff, landing);
      // Only set duration if it is empty or we just changed times manually
      setDuration(calculated.toFixed(1));
    }
  }, [takeoff, landing]);

  // Auto-copy logic
  useEffect(() => {
    if (duration && route) {
      const local = isLocalFlight(route);
      if (local) {
        setPicDayLoc(duration);
        setPicDayTra("");
      } else {
        setPicDayLoc("");
        setPicDayTra(duration);
      }
    }
  }, [duration, route]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsPending(true);
    
    // Validation: sum of PIC + SIC
    const total = parseFloat(duration) || 0;
    const sumLogs = [
      picDayLoc, picDayTra, picNightLoc, picNightTra,
      sicDayLoc, sicDayTra, sicNightLoc, sicNightTra
    ].reduce((acc, val) => acc + (parseFloat(val) || 0), 0);

    if (sumLogs > total + 0.01) {
      setError(`La suma de los tiempos PIC/SIC (${sumLogs.toFixed(1)}h) no puede superar el tiempo total (${total.toFixed(1)}h)`);
      setIsPending(false);
      return;
    }

    try {
      await logFlight(formData);
      if (onSuccess) onSuccess();
    } catch (e: any) {
      setError(e.message || "Error al registrar el vuelo");
      setIsPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-12 pb-20">
      
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-6 flex items-center space-x-4 text-red-500"
          >
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm font-bold uppercase tracking-widest leading-relaxed">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 01. Aircraft Selection */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3 px-2">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">01. Aeronave</p>
        </div>
        <div className="relative group">
          <select 
            name="aircraft_id" 
            required
            value={aircraftId}
            onChange={(e) => setAircraftId(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/5 rounded-[2rem] px-8 py-6 text-xl font-black text-white outline-none focus:border-white/20 transition-all appearance-none uppercase tracking-tighter"
          >
            <option value="" disabled>Seleccionar Matrícula</option>
            {aircraft.map(ac => (
              <option key={ac.id} value={ac.id} className="bg-black text-white">
                {ac.registration} — {ac.type}
              </option>
            ))}
          </select>
          <Compass className="absolute right-8 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 pointer-events-none" />
        </div>
      </section>

      {/* 02. Basic Flight Data */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3 px-2">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">02. Datos Básicos</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Ruta (ICAO)" icon={<Route className="w-4 h-4" />}>
            <input name="route" placeholder="SAEZ SACO" required value={route} onChange={(e) => setRoute(e.target.value)} className="w-full bg-transparent py-2 text-xl font-black text-white outline-none uppercase tracking-tighter" />
          </FormField>

          <FormField label="Fecha" icon={<Calendar className="w-4 h-4" />}>
            <input type="date" name="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent py-2 text-xl font-black text-white outline-none [color-scheme:dark]" />
          </FormField>

          <FormField label="Despegue (UTC)" icon={<Clock className="w-4 h-4 text-emerald-500" />}>
            <input type="time" name="takeoff" required value={takeoff} onChange={(e) => setTakeoff(e.target.value)} className="w-full bg-transparent py-2 text-xl font-black text-white outline-none [color-scheme:dark]" />
          </FormField>

          <FormField label="Aterrizaje (UTC)" icon={<Clock className="w-4 h-4 text-red-500" />}>
            <input type="time" name="landing" required value={landing} onChange={(e) => setLanding(e.target.value)} className="w-full bg-transparent py-2 text-xl font-black text-white outline-none [color-scheme:dark]" />
          </FormField>

          <FormField label="Tiempo de Bloque" icon={<Clock className="w-4 h-4 text-zinc-500" />}>
            <input type="number" step="0.1" name="duration" placeholder="0.0" required value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-transparent py-2 text-xl font-black text-white outline-none" />
          </FormField>

          <FormField label="Aterrizajes" icon={<MapPin className="w-4 h-4 text-zinc-500" />}>
            <input type="number" name="landings" min="1" value={landings} onChange={(e) => setLandings(e.target.value)} required className="w-full bg-transparent py-2 text-xl font-black text-white outline-none" />
          </FormField>
        </div>
      </section>

      {/* 03. Pilot in Command (PIC) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3 px-2 text-blue-500">
          <User className="w-4 h-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">03. Piloto al Mando (PIC)</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniFormField label="Día Local" name="pic_day_loc" value={picDayLoc} onChange={setPicDayLoc} />
          <MiniFormField label="Día Travesía" name="pic_day_tra" value={picDayTra} onChange={setPicDayTra} />
          <MiniFormField label="Noc. Local" name="pic_night_loc" value={picNightLoc} onChange={setPicNightLoc} />
          <MiniFormField label="Noc. Travesía" name="pic_night_tra" value={picNightTra} onChange={setPicNightTra} />
        </div>
      </section>

      {/* 04. Co-Pilot (SIC) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3 px-2 text-zinc-500">
          <Users className="w-4 h-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">04. Copiloto (SIC)</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniFormField label="Día Local" name="sic_day_loc" value={sicDayLoc} onChange={setSicDayLoc} />
          <MiniFormField label="Día Travesía" name="sic_day_tra" value={sicDayTra} onChange={setSicDayTra} />
          <MiniFormField label="Noc. Local" name="sic_night_loc" value={sicNightLoc} onChange={setSicNightLoc} />
          <MiniFormField label="Noc. Travesía" name="sic_night_tra" value={sicNightTra} onChange={setSicNightTra} />
        </div>
      </section>

      {/* 05. Conditions & Training */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3 px-2 text-purple-500">
          <Cloud className="w-4 h-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">05. Condiciones y Entrenamiento</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MiniFormField label="IMC Piloto" name="imc_pil" value={imcPil} onChange={setImcPil} />
          <MiniFormField label="IMC Copiloto" name="imc_cop" value={imcCop} onChange={setImcCop} />
          <MiniFormField label="Capota" name="capota" value={capota} onChange={setCapota} />
          <MiniFormField label="Sim. Inst." name="sim_instructor" value={simInst} onChange={setSimInst} />
          <MiniFormField label="Sim. Piloto" name="sim_pil_en_inst" value={simPil} onChange={setSimPil} />
        </div>
      </section>

      <div className="pt-8">
        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          disabled={isPending}
          type="submit" 
          className="w-full bg-white text-black font-black text-xs uppercase tracking-[0.3em] py-8 rounded-[2rem] shadow-2xl flex items-center justify-center space-x-4 transition-all disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Confirmar Registro de Vuelo</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
}

function FormField({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-4 group focus-within:border-white/20 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
        <div className="text-zinc-800 group-focus-within:text-zinc-400 transition-colors">{icon}</div>
      </div>
      {children}
    </div>
  );
}

function MiniFormField({ label, name, value, onChange }: { label: string, name: string, value: string, onChange: (val: string) => void }) {
  return (
    <div className="p-5 bg-white/[0.01] border border-white/5 rounded-3xl space-y-2 group focus-within:border-white/10 transition-all text-center">
      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block">{label}</span>
      <input 
        type="number" 
        step="0.1" 
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.0"
        className="w-full bg-transparent text-center text-lg font-black text-white outline-none placeholder:text-zinc-800" 
      />
    </div>
  );
}
