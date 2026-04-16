"use client";

import { Flight } from "@/types";
import { Award, CheckCircle2, Circle, Clock, Compass, Navigation, Moon, Target, Activity } from "lucide-react";
import { motion } from "framer-motion";

interface PCATrackerProps {
  flights: Flight[];
}

export default function PCATracker({ flights }: PCATrackerProps) {
  const totalHours = flights.reduce((acc, f) => acc + (f.duration || 0), 0);
  
  const picHours = flights.reduce((acc, f) => {
    return acc + (f.pic_day_loc || 0) + (f.pic_day_tra || 0) + (f.pic_night_loc || 0) + (f.pic_night_tra || 0);
  }, 0);

  const picTravesia = flights.reduce((acc, f) => {
    return acc + (f.pic_day_tra || 0) + (f.pic_night_tra || 0);
  }, 0);

  const realInstrument = flights.reduce((acc, f) => acc + (f.imc_pil || 0) + (f.capota || 0), 0);
  const simInstrumentRaw = flights.reduce((acc, f) => acc + (f.sim_pil_en_inst || 0), 0);
  const instrumentHours = realInstrument + Math.min(simInstrumentRaw, 5);

  const nightHours = flights.reduce((acc, f) => {
    return acc + (f.pic_night_loc || 0) + (f.pic_night_tra || 0);
  }, 0);

  const nightLandings = flights.reduce((acc, f) => {
    if ((f.pic_night_loc || 0) > 0 || (f.pic_night_tra || 0) > 0) {
      return acc + (f.landings || 0);
    }
    return acc;
  }, 0);

  const requirements = [
    { label: "PIC", current: picHours, target: 100, subTarget: 70, unit: "hs", icon: <Target className="w-4 h-4" /> },
    { label: "PIC Travesía", current: picTravesia, target: 20, unit: "hs", icon: <Compass className="w-4 h-4" /> },
    { label: "Instrumentos", current: instrumentHours, target: 10, unit: "hs", icon: <Navigation className="w-4 h-4" /> },
    { label: "PIC Nocturno", current: nightHours, target: 5, unit: "hs", icon: <Moon className="w-4 h-4" /> },
    { label: "Aterrizajes Noct.", current: nightLandings, target: 5, unit: "atrr", icon: <Award className="w-4 h-4" /> }
  ];

  const totalProgress = Math.min((totalHours / 200) * 100, 100);

  return (
    <section className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
        <div className="space-y-1">
          <h3 className="text-3xl md:text-4xl font-space-grotesk font-bold text-zinc-900 dark:text-white tracking-tighter uppercase transition-colors">Análisis PCA</h3>
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.4em]">Progreso de Habilitación Comercial (61.620)</p>
        </div>
        <div className="flex items-center space-x-4">
            <div className="text-right hidden md:block">
                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Estado Actual</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-tighter">En Curso</p>
            </div>
            <div className="w-12 h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl flex items-center justify-center shadow-lg transition-colors">
                <Activity className="w-6 h-6" />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Experience Bento - Spans 2 cols */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-cal dark:shadow-none flex flex-col md:flex-row items-center gap-12 relative overflow-hidden group hover:shadow-lg transition-all">
            <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-50 dark:bg-white/[0.02] rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            
            <div className="relative w-48 h-48 md:w-56 md:h-56 flex-shrink-0">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="12" className="text-zinc-100 dark:text-white/5" />
                    <motion.circle 
                        cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="12"
                        strokeDasharray={`${totalProgress * 2.64} 264`}
                        className="text-zinc-900 dark:text-white"
                        initial={{ strokeDasharray: "0 264" }}
                        animate={{ strokeDasharray: `${totalProgress * 2.64} 264` }}
                        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-5xl md:text-6xl font-space-grotesk font-bold text-zinc-900 dark:text-white tracking-tighter leading-none">{totalHours.toFixed(0)}</span>
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] mt-1">Horas Totales</span>
                </div>
            </div>

            <div className="flex-1 space-y-8 w-full relative z-10 text-center md:text-left">
                <div className="space-y-2">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
                        <h4 className="text-2xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tight">Experiencia</h4>
                        <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{Math.round(totalProgress)}% Completado</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto md:mx-0">Tu progreso acumulado según la Regulación 61.620 para la Licencia de Piloto Comercial.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-zinc-100 dark:border-white/5">
                    <div>
                        <p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Meta General</p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tighter">200.0<span className="text-xs ml-1 text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-normal">hs</span></p>
                    </div>
                    <div>
                        <p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Mín. Reducido</p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tighter">150.0<span className="text-xs ml-1 text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-normal">hs</span></p>
                    </div>
                </div>
            </div>
        </div>

        {/* Requirements Mini-Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-4">
            {requirements.map((req, i) => {
                const progress = Math.min((req.current / req.target) * 100, 100);
                const isComplete = req.current >= req.target;
                
                return (
                    <div key={i} className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start">
                            <div className={`p-2 rounded-xl transition-colors ${isComplete ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-500' : 'bg-zinc-50 dark:bg-white/5 text-zinc-500 dark:text-zinc-400'}`}>
                                {req.icon}
                            </div>
                            {isComplete && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        </div>
                        <div className="mt-4 space-y-2">
                            <div className="flex justify-between items-end leading-none">
                                <p className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest truncate mr-2">{req.label}</p>
                                <p className="text-sm font-bold text-zinc-900 dark:text-white tracking-tighter">{req.current.toFixed(1)}</p>
                            </div>
                            <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className={`h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-zinc-900 dark:bg-white'}`}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </section>
  );
}
