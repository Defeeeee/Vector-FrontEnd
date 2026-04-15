"use client";

import { useState, useTransition } from "react";
import { Aircraft } from "@/types";
import { toggleFlightSession } from "@/actions/flight";
import { Compass, Play, Square, Loader2, Plane } from "lucide-react";
import { motion } from "framer-motion";
import FlightLogModal from "./FlightLogModal";

interface LiveSessionControllerProps {
  aircraft: Aircraft[];
  activeSession: any;
}

export default function LiveSessionController({ aircraft, activeSession }: LiveSessionControllerProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedAircraft, setSelectedAircraft] = useState(activeSession?.session?.aircraft_id || "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  async function handleToggle() {
    const isStopping = activeSession?.active;
    const formData = new FormData();
    if (!isStopping) {
      if (!selectedAircraft) {
        alert("Por favor, selecciona una aeronave para iniciar.");
        return;
      }
      formData.append("aircraft_id", selectedAircraft);
    }

    startTransition(async () => {
      try {
        const result = await toggleFlightSession(formData);
        
        if (isStopping && result) {
          const session = result.session || result;
          // Use ISO strings for reliable HH:mm formatting in UTC
          const takeoffTime = new Date(session.start_time).toISOString().split('T')[1].substring(0, 5);
          const landingTime = new Date(session.end_time || new Date()).toISOString().split('T')[1].substring(0, 5);
          const date = new Date(session.start_time).toISOString().split('T')[0];

          setModalData({
            aircraft_id: session.aircraft_id,
            route: session.route || "",
            takeoff: takeoffTime,
            landing: landingTime,
            date: date,
            landings: session.landings || 1,
            duration: session.flight_time ? session.flight_time.replace("hs", "") : undefined,
          });
          setIsModalOpen(true);
        }
      } catch (e) {
        alert("Error al gestionar la sesión de vuelo.");
      }
    });
  }

  return (
    <>
      <div className="p-10 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none hover:shadow-lg dark:hover:bg-white/[0.04] transition-all rounded-[2.5rem] space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">Modo Operativo</p>
            <h3 className="text-2xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tighter uppercase">Vuelo en Vivo</h3>
          </div>
          <div className={`w-3 h-3 rounded-full ${activeSession?.active ? 'bg-green-500 animate-pulse' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
        </div>

        {!activeSession?.active ? (
          <div className="space-y-6">
            <div className="relative group">
              <select 
                value={selectedAircraft}
                onChange={(e) => setSelectedAircraft(e.target.value)}
                className="w-full bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-white/20 transition-all appearance-none uppercase shadow-sm cursor-pointer"
              >
                <option value="" disabled>Seleccionar Aeronave...</option>
                {aircraft.map(ac => (
                  <option key={ac.id} value={ac.id} className="dark:bg-zinc-900">
                    {ac.registration} — {ac.type}
                  </option>
                ))}
              </select>
              <Plane className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
            </div>

            <button 
              disabled={isPending}
              onClick={handleToggle}
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl shadow-cal-highlight dark:shadow-none flex items-center justify-center space-x-3 transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>Iniciar Cronómetro</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-zinc-50 dark:bg-white/[0.03] rounded-2xl border border-zinc-200 dark:border-white/10 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <p className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Aeronave Activa</p>
                <p className="text-lg font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tighter uppercase">
                  {aircraft.find(a => a.id === activeSession.session.aircraft_id)?.registration || "Unknown"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Inicio (UTC)</p>
                <p className="text-lg font-bold font-space-grotesk text-green-600 dark:text-green-500 tracking-tighter">
                  {new Date(activeSession.session.start_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                </p>
              </div>
            </div>

            <button 
              disabled={isPending}
              onClick={handleToggle}
              className="w-full bg-red-600 text-white font-bold text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl shadow-lg flex items-center justify-center space-x-3 transition-all hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 fill-current" />}
              <span>Finalizar y Registrar</span>
            </button>
          </div>
        )}
      </div>

      <FlightLogModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        aircraft={aircraft}
        initialData={modalData}
      />
    </>
  );
}
