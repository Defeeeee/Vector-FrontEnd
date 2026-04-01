"use client";

import { Flight, Aircraft } from "@/types";
import { updateFlight, deleteFlight } from "@/actions/flight";
import { Plane, Clock, ChevronDown, ChevronUp, LandPlot, Edit2, Trash2, X, Check, Loader2, Calendar, User, Users, Cloud, Monitor } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { calculateFlightDuration } from "@/lib/utils";

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

  // Filter logs that are > 0
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

  return (
    <div className={`group transition-all duration-700 ${isOpen || isEditing ? 'py-4' : 'py-0'}`}>
      <div className={`bg-white/[0.01] border transition-all duration-500 overflow-hidden ${isOpen || isEditing ? 'rounded-[3rem] border-white/10 bg-white/[0.03] shadow-2xl' : 'rounded-none border-transparent border-b-white/[0.03] hover:bg-white/[0.02]'}`}>
        {!isEditing ? (
          <>
            <div 
              onClick={() => setIsOpen(!isOpen)}
              className="px-8 py-8 flex flex-col md:flex-row md:items-center justify-between cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center space-y-6 md:space-y-0 md:space-x-12">
                <div className="flex items-center space-x-6">
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">DEP</span>
                    <span className="text-3xl font-black text-white tracking-tighter">{origin}</span>
                  </div>
                  <div className="w-8 h-px bg-white/10" />
                  <div className="flex flex-col leading-none text-right md:text-left">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">ARR</span>
                    <span className="text-3xl font-black text-white tracking-tighter">{dest}</span>
                  </div>
                </div>
                <div className="hidden md:block h-12 w-px bg-white/5" />
                <div className="flex flex-col space-y-1">
                  <p className="text-white font-black text-sm tracking-tight uppercase">
                    {aircraft?.registration} <span className="mx-2 text-zinc-700">•</span> {aircraft?.type}
                  </p>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {new Date(flight.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                  </span>
                </div>
              </div>

              <div className="mt-8 md:mt-0 flex items-center justify-between md:space-x-10">
                <div className="flex flex-col items-end leading-none">
                  <span className="text-4xl font-black text-white tracking-tighter">{flight.duration.toFixed(1)}<span className="text-sm text-zinc-600 ml-1">H</span></span>
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mt-1">Block Time</span>
                </div>
                <div className="flex items-center space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-3 hover:bg-white text-zinc-500 hover:text-black rounded-full transition-all"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={handleDelete} className="p-3 hover:bg-white text-zinc-500 hover:text-black rounded-full transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                  <div className="px-10 pb-10 pt-4 space-y-8 border-t border-white/[0.03]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                      <DetailItem label="Takeoff" value={new Date(flight.takeoff).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} />
                      <DetailItem label="Landing" value={new Date(flight.landing).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} />
                      <DetailItem label="Landings" value={`${flight.landings} Cycles`} />
                      <DetailItem label="Type ICAO" value={aircraft?.icao || "---"} />
                    </div>
                    
                    {logs.length > 0 && (
                      <div className="space-y-4">
                        <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.4em]">Log Breakdown</p>
                        <div className="flex flex-wrap gap-3">
                          {logs.map((log, i) => (
                            <div key={i} className="flex items-center space-x-2 bg-white/[0.03] px-4 py-2 rounded-xl border border-white/[0.05]">
                              {log.icon}
                              <span className="text-[10px] font-black text-white uppercase tracking-tight">{log.label}:</span>
                              <span className="text-[10px] font-black text-blue-500">{log.value?.toFixed(1)}H</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 space-y-10">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Edit Entry</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X className="w-5 h-5 text-white" /></button>
            </div>

            <form action={handleUpdate} className="space-y-10">
              <input type="hidden" name="id" value={flight.id} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <EditField label="Aircraft">
                  <select name="aircraft_id" defaultValue={flight.aircraft_id} className="w-full bg-transparent border-b border-white/10 py-2 text-white outline-none focus:border-white transition-all font-bold">
                    {allAircraft.map(ac => <option key={ac.id} value={ac.id} className="bg-black text-white">{ac.registration} ({ac.type})</option>)}
                  </select>
                </EditField>
                <EditField label="Route"><input name="route" defaultValue={flight.route} className="w-full bg-transparent border-b border-white/10 py-2 text-white outline-none uppercase font-bold" /></EditField>
                <EditField label="Date"><input name="date" type="date" defaultValue={flight.date} className="w-full bg-transparent border-b border-white/10 py-2 text-white outline-none font-bold [color-scheme:dark]" /></EditField>
                <EditField label="Landings"><input name="landings" type="number" defaultValue={flight.landings} className="w-full bg-transparent border-b border-white/10 py-2 text-white outline-none font-bold" /></EditField>
                <EditField label="Takeoff (UTC)"><input name="takeoff" type="time" value={takeoffTime} onChange={(e) => setTakeoffTime(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-white outline-none font-bold [color-scheme:dark]" /></EditField>
                <EditField label="Landing (UTC)"><input name="landing" type="time" value={landingTime} onChange={(e) => setLandingTime(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-white outline-none font-bold [color-scheme:dark]" /></EditField>
                <EditField label="Duration"><input name="duration" step="0.1" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-white outline-none font-bold" /></EditField>
              </div>

              <div className="space-y-6 pt-4 border-t border-white/5">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Log Breakdown</p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <MiniEdit name="pic_day_loc" label="PIC Dia Loc" val={flight.pic_day_loc} />
                  <MiniEdit name="pic_day_tra" label="PIC Dia Trav" val={flight.pic_day_tra} />
                  <MiniEdit name="pic_night_loc" label="PIC Noc Loc" val={flight.pic_night_loc} />
                  <MiniEdit name="pic_night_tra" label="PIC Noc Trav" val={flight.pic_night_tra} />
                  <MiniEdit name="sic_day_loc" label="SIC Dia Loc" val={flight.sic_day_loc} />
                  <MiniEdit name="sic_day_tra" label="SIC Dia Trav" val={flight.sic_day_tra} />
                  <MiniEdit name="imc_pil" label="IMC Piloto" val={flight.imc_pil} />
                  <MiniEdit name="capota" label="Capota" val={flight.capota} />
                  <MiniEdit name="sim_instructor" label="Sim Inst" val={flight.sim_instructor} />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-6">
                <button type="button" onClick={() => setIsEditing(false)} className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white">Cancelar</button>
                <button disabled={isPending} type="submit" className="bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] px-12 py-5 rounded-full shadow-2xl flex items-center space-x-2">{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}<span>Confirmar Cambios</span></button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">{label}</p>
      <p className="text-xl font-black text-white tracking-tight">{value}</p>
    </div>
  );
}

function EditField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2 group">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 group-focus-within:text-white transition-colors">{label}</label>
      {children}
    </div>
  );
}

function MiniEdit({ name, label, val }: { name: string, label: string, val: any }) {
  return (
    <div className="space-y-1">
      <label className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter block">{label}</label>
      <input type="number" step="0.1" name={name} defaultValue={val || ""} className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-2 py-2 text-xs font-bold text-white outline-none focus:border-white/20" />
    </div>
  );
}
