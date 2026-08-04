"use client";

import { Flight, Aircraft } from "@/types";
import { updateFlight, deleteFlight } from "@/actions/flight";
import { ArrowRight, Edit2, Trash2, X, Check, Loader2, User, Users, Cloud, Monitor } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { calculateFlightDuration } from "@/lib/utils";

const PURPOSE_OPTIONS = [
  { value: "ACR", label: "ACR – Acrobacia" },
  { value: "ADAP", label: "ADAP – Adaptación" },
  { value: "AER", label: "AER – Aeroaplicación" },
  { value: "CI", label: "CI – Combate contra Incendios" },
  { value: "ENT", label: "ENT – Entrenamiento" },
  { value: "EXA", label: "EXA – Examen" },
  { value: "FOR", label: "FOR – Formación" },
  { value: "FOT", label: "FOT – Fotografía" },
  { value: "I", label: "I – Instructor (Impartición Instrucción)" },
  { value: "INST", label: "INST – Instrucción (Recepción Instrucción)" },
  { value: "IP", label: "IP – Inspector (Inspección de Pilotos o Alumnos)" },
  { value: "LA", label: "LA – Línea Aérea (RAAC 121)" },
  { value: "LP", label: "LP – Lanzamiento Paracaidistas" },
  { value: "N", label: "N – Transporte Aéreo no Regular (RAAC 135)" },
  { value: "PA", label: "PA – Prueba de Aeronaves" },
  { value: "READ", label: "READ – Readaptación" },
  { value: "RP", label: "RP – Remolque Planeadores" },
  { value: "SAN", label: "SAN – Sanitario" },
  { value: "TA", label: "TA – Trabajo Aéreo" },
  { value: "TAXI", label: "TAXI – Taxi Aéreo" },
  { value: "VO", label: "VO – Vuelo Oficial" },
  { value: "VP", label: "VP – Vuelo Privado" }
];

interface FlightCardProps {
  flight: Flight;
  aircraft: Aircraft | undefined;
  allAircraft: Aircraft[];
}

function splitRoute(route: string): [string, string] {
  if (route.includes('-')) {
    const [origin, dest] = route.split('-');
    return [origin?.trim().replace(/\s+/g, '') || "???", dest?.trim().replace(/\s+/g, '') || "???"];
  }
  const parts = route.trim().split(/\s+/);
  return [parts[0] || "???", parts[1] || "???"];
}

export default function FlightCard({ flight, aircraft, allAircraft }: FlightCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [origin, dest] = splitRoute(flight.route);

  const [takeoffTime, setTakeoffTime] = useState(new Date(flight.takeoff).toISOString().substring(11, 16));
  const [landingTime, setLandingTime] = useState(new Date(flight.landing).toISOString().substring(11, 16));
  const [duration, setDuration] = useState(flight.duration.toString());

  useEffect(() => {
    if (isEditing && takeoffTime && landingTime) {
      const calculated = calculateFlightDuration(takeoffTime, landingTime);
      setDuration(calculated.toFixed(1));
    }
  }, [takeoffTime, landingTime, isEditing]);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm("¿Estás seguro de eliminar este registro?")) {
      startTransition(async () => {
        const result = await deleteFlight(flight.id);
        if (result?.error) alert(result.error);
      });
    }
  }

  async function handleUpdate(formData: FormData) {
    startTransition(async () => {
      const result = await updateFlight(formData);
      if (result?.error) {
        alert(result.error);
      } else {
        setIsEditing(false);
      }
    });
  }

  const logs = [
    { label: "PIC Día Loc", value: flight.pic_day_loc, icon: <User className="w-3 h-3" /> },
    { label: "PIC Día Trav", value: flight.pic_day_tra, icon: <User className="w-3 h-3" /> },
    { label: "PIC Noc Loc", value: flight.pic_night_loc, icon: <User className="w-3 h-3" /> },
    { label: "PIC Noc Trav", value: flight.pic_night_tra, icon: <User className="w-3 h-3" /> },
    { label: "SIC Día Loc", value: flight.sic_day_loc, icon: <Users className="w-3 h-3" /> },
    { label: "SIC Día Trav", value: flight.sic_day_tra, icon: <Users className="w-3 h-3" /> },
    { label: "SIC Noc Loc", value: flight.sic_night_loc, icon: <Users className="w-3 h-3" /> },
    { label: "SIC Noc Trav", value: flight.sic_night_tra, icon: <Users className="w-3 h-3" /> },
    { label: "IMC Piloto", value: flight.imc_pil, icon: <Cloud className="w-3 h-3" /> },
    { label: "IMC Copiloto", value: flight.imc_cop, icon: <Cloud className="w-3 h-3" /> },
    { label: "Capota", value: flight.capota, icon: <Monitor className="w-3 h-3" /> },
    { label: "Sim. Inst.", value: flight.sim_instructor, icon: <Monitor className="w-3 h-3" /> },
    { label: "Sim. Piloto", value: flight.sim_pil_en_inst, icon: <Monitor className="w-3 h-3" /> },
  ].filter(log => log.value && log.value > 0);

  if (isEditing) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-10 space-y-8 md:space-y-10 bg-zinc-50 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between">
          <h3 className="text-xl md:text-2xl font-bold font-display text-zinc-900 dark:text-white tracking-tight">Editar registro</h3>
          <button onClick={() => setIsEditing(false)} className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-sm"><X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" /></button>
        </div>

        <form action={handleUpdate} className="space-y-8 md:space-y-10">
          <input type="hidden" name="id" value={flight.id} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 md:gap-y-8">
             <EditField label="Aircraft">
              <select name="aircraft_id" defaultValue={flight.aircraft_id} className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 py-2 text-sm md:text-base text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white transition-all font-bold">
                {allAircraft.map(ac => <option key={ac.id} value={ac.id} className="dark:bg-zinc-900">{ac.registration} ({ac.type})</option>)}
              </select>
            </EditField>
            <EditField label="Finalidad">
              <select name="purpose" defaultValue={flight.purpose || "VP"} className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 py-2 text-sm md:text-base text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white transition-all font-bold">
                {PURPOSE_OPTIONS.map(opt => <option key={opt.value} value={opt.value} className="dark:bg-zinc-900">{opt.label}</option>)}
              </select>
            </EditField>
            <EditField label="Route"><input name="route" defaultValue={flight.route} className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 py-2 text-sm md:text-base text-zinc-900 dark:text-white outline-none uppercase font-bold focus:border-zinc-900 dark:focus:border-white transition-colors" /></EditField>
            <EditField label="Date"><input name="date" type="date" defaultValue={flight.date} className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 py-2 text-sm md:text-base text-zinc-900 dark:text-white outline-none font-bold focus:border-zinc-900 dark:focus:border-white transition-colors [color-scheme:light] dark:[color-scheme:dark]" /></EditField>
            <EditField label="Landings"><input name="landings" type="number" defaultValue={flight.landings} className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 py-2 text-sm md:text-base text-zinc-900 dark:text-white outline-none font-bold focus:border-zinc-900 dark:focus:border-white transition-colors" /></EditField>
            <EditField label="Takeoff (UTC)"><input name="takeoff" type="time" value={takeoffTime} onChange={(e) => setTakeoffTime(e.target.value)} className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 py-2 text-sm md:text-base text-zinc-900 dark:text-white outline-none font-bold focus:border-zinc-900 dark:focus:border-white transition-colors [color-scheme:light] dark:[color-scheme:dark]" /></EditField>
            <EditField label="Landing (UTC)"><input name="landing" type="time" value={landingTime} onChange={(e) => setLandingTime(e.target.value)} className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 py-2 text-sm md:text-base text-zinc-900 dark:text-white outline-none font-bold focus:border-zinc-900 dark:focus:border-white transition-colors [color-scheme:light] dark:[color-scheme:dark]" /></EditField>
            <EditField label="Duration"><input name="duration" step="0.1" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 py-2 text-sm md:text-base text-zinc-900 dark:text-white outline-none font-bold focus:border-zinc-900 dark:focus:border-white transition-colors" /></EditField>
          </div>

          <div className="space-y-4 md:space-y-6 pt-4 border-t border-zinc-200 dark:border-white/10">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Desglose</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              <MiniEdit name="pic_day_loc" label="PIC Dia Loc" val={flight.pic_day_loc} />
              <MiniEdit name="pic_day_tra" label="PIC Dia Trav" val={flight.pic_day_tra} />
              <MiniEdit name="pic_night_loc" label="PIC Noc Loc" val={flight.pic_night_loc} />
              <MiniEdit name="pic_night_tra" label="PIC Noc Trav" val={flight.pic_night_tra} />
              <MiniEdit name="sic_day_loc" label="SIC Dia Loc" val={flight.sic_day_loc} />
              <MiniEdit name="sic_day_tra" label="SIC Dia Trav" val={flight.sic_day_tra} />
              <MiniEdit name="sic_night_loc" label="SIC Noc Loc" val={flight.sic_night_loc} />
              <MiniEdit name="sic_night_tra" label="SIC Noc Trav" val={flight.sic_night_tra} />
              <MiniEdit name="imc_pil" label="IMC Piloto" val={flight.imc_pil} />
              <MiniEdit name="imc_cop" label="IMC Copiloto" val={flight.imc_cop} />
              <MiniEdit name="capota" label="Capota" val={flight.capota} />
              <MiniEdit name="sim_instructor" label="Sim Inst" val={flight.sim_instructor} />
              <MiniEdit name="sim_pil_en_inst" label="Sim Piloto" val={flight.sim_pil_en_inst} />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-end gap-4 md:gap-6 pt-4">
            <button type="button" onClick={() => setIsEditing(false)} className="w-full md:w-auto text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">Cancelar</button>
            <button disabled={isPending} type="submit" className="w-full md:w-auto bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm px-10 md:px-12 py-4 md:py-5 rounded-full shadow-cal-highlight dark:shadow-none flex items-center justify-center space-x-2 hover:opacity-90 transition-opacity">{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}<span>Confirmar cambios</span></button>
          </div>
        </form>
      </motion.div>
    );
  }

  return (
    <div className="group">
      {/* Ledger row */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="grid grid-cols-[52px_1fr_auto] md:grid-cols-[80px_130px_1fr_100px_72px] items-center gap-3 md:gap-4 px-4 md:px-6 py-3.5 md:py-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors"
      >
        {/* Date */}
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 data leading-tight">
          {new Date(flight.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
        </div>

        {/* Route (desktop column) */}
        <div className="hidden md:flex items-center gap-1.5 data font-bold text-zinc-900 dark:text-white text-sm">
          <span>{origin}</span>
          <ArrowRight className="w-3 h-3 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
          <span>{dest}</span>
        </div>

        {/* Aircraft / purpose (+ route on mobile) */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 md:hidden data font-bold text-zinc-900 dark:text-white text-sm mb-0.5">
            <span>{origin}</span>
            <ArrowRight className="w-3 h-3 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
            <span>{dest}</span>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm text-zinc-500 dark:text-zinc-400 truncate">
            <span className="data font-semibold text-zinc-700 dark:text-zinc-300 uppercase">{aircraft?.registration}</span>
            <span className="hidden sm:inline truncate">{aircraft?.type}</span>
            {flight.purpose && (
              <span className="text-[10px] font-bold bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                {flight.purpose}
              </span>
            )}
          </div>
        </div>

        {/* Duration */}
        <div className="text-right font-bold text-base md:text-lg text-zinc-900 dark:text-white data">
          {flight.duration.toFixed(1)}<span className="text-xs font-medium text-zinc-400 dark:text-zinc-600 ml-0.5">h</span>
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={handleDelete} className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 rounded-full transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
            <div className="px-4 md:px-6 pb-6 pt-1 space-y-5 bg-zinc-50/60 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2 md:hidden pb-1">
                <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><Edit2 className="w-3 h-3" /> Editar</button>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <button onClick={handleDelete} className="text-xs font-semibold text-red-500 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Eliminar</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                <DetailItem label="Takeoff" value={new Date(flight.takeoff).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} />
                <DetailItem label="Landing" value={new Date(flight.landing).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} />
                <DetailItem label="Landings" value={`${flight.landings} ciclos`} />
                <DetailItem label="Type ICAO" value={aircraft?.icao || "---"} />
              </div>

              {logs.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Desglose</p>
                  <div className="flex flex-wrap gap-2">
                    {logs.map((log, i) => (
                      <div key={i} className="flex items-center space-x-2 bg-white dark:bg-white/[0.05] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 shadow-sm">
                        <span className="text-zinc-500 dark:text-zinc-400">{log.icon}</span>
                        <span className="text-xs font-semibold text-zinc-900 dark:text-white">{log.label}:</span>
                        <span className="eyebrow">{log.value?.toFixed(1)}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-lg font-display font-bold text-zinc-900 dark:text-white tracking-tight">{value}</p>
    </div>
  );
}

function EditField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2 group">
      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">{label}</label>
      {children}
    </div>
  );
}

function MiniEdit({ name, label, val }: { name: string, label: string, val: any }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">{label}</label>
      <input type="number" step="0.1" name={name} defaultValue={val || ""} className="w-full bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-2 text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-white/30 transition-colors shadow-sm" />
    </div>
  );
}
