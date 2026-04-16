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

  const [picDayLoc, setPicDayLoc] = useState("");
  const [picDayTra, setPicDayTra] = useState("");
  
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
  }, [duration, route, initialData]);

  const [picNightLoc, setPicNightLoc] = useState("");
  const [picNightTra, setPicNightTra] = useState("");
  const [sicDayLoc, setSicDayLoc] = useState("");
  const [sicDayTra, setSicDayTra] = useState("");
  const [sicNightLoc, setSicNightLoc] = useState("");
  const [sicNightTra, setSicNightTra] = useState("");
  
  const [imcPil, setImcPil] = useState("");
  const [imcCop, setImcCop] = useState("");
  const [capota, setCapota] = useState("");
  const [simInst, setSimInst] = useState("");
  const [simPil, setSimPil] = useState("");

  useEffect(() => {
    if (takeoff && landing) {
      const calculated = calculateFlightDuration(takeoff, landing);
      setDuration(calculated.toFixed(1));
    }
  }, [takeoff, landing]);

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
    <form action={handleSubmit} className="w-full pb-20">
      
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-[2rem] p-6 flex items-center space-x-4 text-red-600 dark:text-red-500 shadow-sm overflow-hidden"
          >
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm font-bold uppercase tracking-widest leading-relaxed">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-3xl md:rounded-[2.5rem] shadow-cal dark:shadow-none overflow-hidden flex flex-col">
        
        {/* Header Title */}
        <div className="p-6 md:p-8 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 flex items-center justify-between">
            <div className="space-y-1">
                <h3 className="text-lg md:text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tighter uppercase">Nueva Entrada</h3>
                <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">Bitácora Electrónica</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-[#111111] rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm border border-zinc-200 dark:border-white/10 transition-colors">
                <Compass className="w-5 h-5 md:w-6 md:h-6 text-zinc-900 dark:text-white" />
            </div>
        </div>

        <div className="p-6 md:p-8 space-y-8 md:space-y-10">
            {/* 01. General & Basic Data Bento */}
            <div className="space-y-4">
                <div className="flex items-center space-x-3 px-2">
                    <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">01. Información General</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    
                    {/* Aircraft Selection */}
                    <div className="md:col-span-2 relative group">
                        <select 
                            name="aircraft_id" 
                            required
                            value={aircraftId}
                            onChange={(e) => setAircraftId(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-xl md:rounded-[1.5rem] px-5 md:px-6 py-4 md:py-5 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all appearance-none uppercase tracking-widest shadow-sm cursor-pointer"
                        >
                            <option value="" disabled>Seleccionar Aeronave...</option>
                            {aircraft.map(ac => (
                            <option key={ac.id} value={ac.id} className="dark:bg-zinc-900">
                                {ac.registration} — {ac.type}
                            </option>
                            ))}
                        </select>
                        <Compass className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                    </div>

                    <div className="relative group">
                        <Route className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                        <input name="route" placeholder="Ruta (SAEZ SACO)" required value={route} onChange={(e) => setRoute(e.target.value)} className="w-full bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-xl md:rounded-[1.5rem] py-4 pl-11 md:pl-12 pr-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all uppercase tracking-widest placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm" />
                    </div>

                    <div className="relative group">
                        <Calendar className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                        <input type="date" name="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-xl md:rounded-[1.5rem] py-4 pl-11 md:pl-12 pr-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all [color-scheme:light] dark:[color-scheme:dark] shadow-sm" />
                    </div>

                    <div className="relative group">
                        <Clock className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                        <input type="time" name="takeoff" placeholder="Despegue" required value={takeoff} onChange={(e) => setTakeoff(e.target.value)} className="w-full bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-xl md:rounded-[1.5rem] py-4 pl-11 md:pl-12 pr-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all [color-scheme:light] dark:[color-scheme:dark] shadow-sm" />
                    </div>

                    <div className="relative group">
                        <Clock className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                        <input type="time" name="landing" placeholder="Aterrizaje" required value={landing} onChange={(e) => setLanding(e.target.value)} className="w-full bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-xl md:rounded-[1.5rem] py-4 pl-11 md:pl-12 pr-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all [color-scheme:light] dark:[color-scheme:dark] shadow-sm" />
                    </div>

                    <div className="relative group">
                        <Clock className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                        <input type="number" step="0.1" name="duration" placeholder="Tiempo (H)" required value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-xl md:rounded-[1.5rem] py-4 pl-11 md:pl-12 pr-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm" />
                    </div>

                    <div className="relative group">
                        <MapPin className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                        <input type="number" name="landings" min="1" placeholder="Aterrizajes" value={landings} onChange={(e) => setLandings(e.target.value)} required className="w-full bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-xl md:rounded-[1.5rem] py-4 pl-11 md:pl-12 pr-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm" />
                    </div>
                </div>
            </div>

            {/* 02. Breakdown Tiempos */}
            <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-white/10">
                <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">02. Desglose de Tiempos</p>
                    <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <MiniFormField label="PIC Día Loc" name="pic_day_loc" value={picDayLoc} onChange={setPicDayLoc} />
                    <MiniFormField label="PIC Día Tra" name="pic_day_tra" value={picDayTra} onChange={setPicDayTra} />
                    <MiniFormField label="PIC Noc Loc" name="pic_night_loc" value={picNightLoc} onChange={setPicNightLoc} />
                    <MiniFormField label="PIC Noc Tra" name="pic_night_tra" value={picNightTra} onChange={setPicNightTra} />
                    <MiniFormField label="SIC Día Loc" name="sic_day_loc" value={sicDayLoc} onChange={setSicDayLoc} />
                    <MiniFormField label="SIC Día Tra" name="sic_day_tra" value={sicDayTra} onChange={setSicDayTra} />
                    <MiniFormField label="SIC Noc Loc" name="sic_night_loc" value={sicNightLoc} onChange={setSicNightLoc} />
                    <MiniFormField label="SIC Noc Tra" name="sic_night_tra" value={sicNightTra} onChange={setSicNightTra} />
                </div>
            </div>

            {/* 03. Conditions */}
            <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-white/10">
                <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">03. Condiciones y SIM</p>
                    <Cloud className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                    <MiniFormField label="IMC Piloto" name="imc_pil" value={imcPil} onChange={setImcPil} />
                    <MiniFormField label="IMC Copiloto" name="imc_cop" value={imcCop} onChange={setImcCop} />
                    <MiniFormField label="Capota" name="capota" value={capota} onChange={setCapota} />
                    <MiniFormField label="Sim. Inst." name="sim_instructor" value={simInst} onChange={setSimInst} />
                    <MiniFormField label="Sim. Piloto" name="sim_pil_en_inst" value={simPil} onChange={setSimPil} />
                </div>
            </div>
        </div>

        {/* Footer Button */}
        <div className="p-6 md:p-8 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5">
            <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={isPending}
            type="submit" 
            className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs uppercase tracking-[0.3em] py-5 md:py-6 rounded-xl md:rounded-[1.5rem] shadow-cal-highlight dark:shadow-none flex items-center justify-center space-x-3 transition-all disabled:opacity-50"
            >
            {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <>
                <span>Registrar Vuelo</span>
                <ArrowRight className="w-4 h-4" />
                </>
            )}
            </motion.button>
        </div>

      </div>
    </form>
  );
}

function MiniFormField({ label, name, value, onChange }: { label: string, name: string, value: string, onChange: (val: string) => void }) {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-xl md:rounded-2xl space-y-1.5 md:space-y-2 group focus-within:ring-2 focus-within:ring-zinc-900/20 dark:focus-within:ring-white/20 transition-all text-center shadow-sm">
      <span className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block truncate">{label}</span>
      <input 
        type="number" 
        step="0.1" 
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.0"
        className="w-full bg-transparent py-1 px-2 text-center text-sm font-bold text-zinc-900 dark:text-white outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-600" 
      />
    </div>
  );
}