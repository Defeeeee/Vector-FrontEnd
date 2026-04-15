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
      <div className={`bg-white border transition-all duration-500 overflow-hidden ${isOpen || isEditing ? 'rounded-[2.5rem] border-zinc-200 shadow-cal' : 'rounded-none border-transparent border-b-zinc-200 hover:bg-zinc-50'}`}>
        {!isEditing ? (
          <>
            <div 
              onClick={() => setIsOpen(!isOpen)}
              className="px-8 py-8 flex flex-col md:flex-row md:items-center justify-between cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center space-y-6 md:space-y-0 md:space-x-12">
                <div className="flex items-center space-x-6">
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">DEP</span>
                    <span className="text-3xl font-space-grotesk font-bold text-zinc-900 tracking-tighter">{origin}</span>
                  </div>
                  <div className="w-8 h-px bg-zinc-200" />
                  <div className="flex flex-col leading-none text-right md:text-left">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">ARR</span>
                    <span className="text-3xl font-space-grotesk font-bold text-zinc-900 tracking-tighter">{dest}</span>
                  </div>
                </div>
                <div className="hidden md:block h-12 w-px bg-zinc-200" />
                <div className="flex flex-col space-y-1">
                  <p className="text-zinc-900 font-bold text-sm tracking-tight uppercase">
                    {aircraft?.registration} <span className="mx-2 text-zinc-300">•</span> {aircraft?.type}
                  </p>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {new Date(flight.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                  </span>
                </div>
              </div>

              <div className="mt-8 md:mt-0 flex items-center justify-between md:space-x-10">
                <div className="flex flex-col items-end leading-none">
                  <span className="text-4xl font-space-grotesk font-bold text-zinc-900 tracking-tighter">{flight.duration.toFixed(1)}<span className="text-sm text-zinc-400 ml-1">H</span></span>
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-1">Block Time</span>
                </div>
                <div className="flex items-center space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-3 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 rounded-full transition-all"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={handleDelete} className="p-3 hover:bg-red-50 text-zinc-500 hover:text-red-500 rounded-full transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                  <div className="px-10 pb-10 pt-4 space-y-8 border-t border-zinc-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                      <DetailItem label="Takeoff" value={new Date(flight.takeoff).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} />
                      <DetailItem label="Landing" value={new Date(flight.landing).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} />
                      <DetailItem label="Landings" value={`${flight.landings} Cycles`} />
                      <DetailItem label="Type ICAO" value={aircraft?.icao || "---"} />
                    </div>
                    
                    {logs.length > 0 && (
                      <div className="space-y-4">
                        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.4em]">Log Breakdown</p>
                        <div className="flex flex-wrap gap-3">
                          {logs.map((log, i) => (
                            <div key={i} className="flex items-center space-x-2 bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-200 shadow-sm">
                              <span className="text-zinc-500">{log.icon}</span>
                              <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-tight">{log.label}:</span>
                              <span className="text-[10px] font-bold text-blue-600">{log.value?.toFixed(1)}H</span>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 space-y-10 bg-zinc-50">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold font-space-grotesk text-zinc-900 uppercase tracking-tighter">Edit Entry</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 bg-white border border-zinc-200 rounded-full hover:bg-zinc-100 transition-colors shadow-sm"><X className="w-4 h-4 text-zinc-500" /></button>
            </div>

            <form action={handleUpdate} className="space-y-10">
              <input type="hidden" name="id" value={flight.id} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <EditField label="Aircraft">
                  <select name="aircraft_id" defaultValue={flight.aircraft_id} className="w-full bg-transparent border-b border-zinc-300 py-2 text-zinc-900 outline-none focus:border-zinc-900 transition-all font-bold">
                    {allAircraft.map(ac => <option key={ac.id} value={ac.id}>{ac.registration} ({ac.type})</option>)}
                  </select>
                </EditField>
                <EditField label="Route"><input name="route" defaultValue={flight.route} className="w-full bg-transparent border-b border-zinc-300 py-2 text-zinc-900 outline-none uppercase font-bold focus:border-zinc-900 transition-colors" /></EditField>
                <EditField label="Date"><input name="date" type="date" defaultValue={flight.date} className="w-full bg-transparent border-b border-zinc-300 py-2 text-zinc-900 outline-none font-bold focus:border-zinc-900 transition-colors" /></EditField>
                <EditField label="Landings"><input name="landings" type="number" defaultValue={flight.landings} className="w-full bg-transparent border-b border-zinc-300 py-2 text-zinc-900 outline-none font-bold focus:border-zinc-900 transition-colors" /></EditField>
                <EditField label="Takeoff (UTC)"><input name="takeoff" type="time" value={takeoffTime} onChange={(e) => setTakeoffTime(e.target.value)} className="w-full bg-transparent border-b border-zinc-300 py-2 text-zinc-900 outline-none font-bold focus:border-zinc-900 transition-colors" /></EditField>
                <EditField label="Landing (UTC)"><input name="landing" type="time" value={landingTime} onChange={(e) => setLandingTime(e.target.value)} className="w-full bg-transparent border-b border-zinc-300 py-2 text-zinc-900 outline-none font-bold focus:border-zinc-900 transition-colors" /></EditField>
                <EditField label="Duration"><input name="duration" step="0.1" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-transparent border-b border-zinc-300 py-2 text-zinc-900 outline-none font-bold focus:border-zinc-900 transition-colors" /></EditField>
              </div>

              <div className="space-y-6 pt-4 border-t border-zinc-200">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Log Breakdown</p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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

              <div className="flex items-center justify-end space-x-6">
                <button type="button" onClick={() => setIsEditing(false)} className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors">Cancelar</button>
                <button disabled={isPending} type="submit" className="bg-zinc-900 text-white font-bold text-[10px] uppercase tracking-[0.2em] px-12 py-5 rounded-full shadow-cal-highlight flex items-center space-x-2 hover:opacity-90 transition-opacity">{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}<span>Confirmar Cambios</span></button>
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
      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">{label}</p>
      <p className="text-xl font-space-grotesk font-bold text-zinc-900 tracking-tight">{value}</p>
    </div>
  );
}

function EditField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2 group">
      <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 group-focus-within:text-zinc-900 transition-colors">{label}</label>
      {children}
    </div>
  );
}

function MiniEdit({ name, label, val }: { name: string, label: string, val: any }) {
  return (
    <div className="space-y-1">
      <label className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter block">{label}</label>
      <input type="number" step="0.1" name={name} defaultValue={val || ""} className="w-full bg-white border border-zinc-200 rounded-xl px-2 py-2 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-400 transition-colors shadow-sm" />
    </div>
  );
}
