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
    { label: "Piloto al Mando (PIC)", current: picHours, target: 100, subTarget: 70, unit: "hs", icon: <Target className="w-4 h-4" /> },
    { label: "PIC Travesía", current: picTravesia, target: 20, unit: "hs", icon: <Compass className="w-4 h-4" /> },
    { label: "Instrucción Instrumentos", current: instrumentHours, target: 10, unit: "hs", icon: <Navigation className="w-4 h-4" /> },
    { label: "Vuelo Nocturno (PIC)", current: nightHours, target: 5, unit: "hs", icon: <Moon className="w-4 h-4" /> },
    { label: "Aterrizajes Nocturnos", current: nightLandings, target: 5, unit: "atrr", icon: <Award className="w-4 h-4" /> }
  ];

  const totalProgress = Math.min((totalHours / 200) * 100, 100);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tighter">Tracker PCA</h3>
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">Requisitos Comerciales (61.620)</p>
        </div>
        <div className="px-4 py-2 bg-zinc-900 dark:bg-white rounded-full shadow-cal-highlight flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <p className="text-[8px] font-bold text-white dark:text-zinc-900 uppercase tracking-widest">En Progreso</p>
        </div>
      </div>

      <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] shadow-cal dark:shadow-none overflow-hidden flex flex-col lg:flex-row">
        
        {/* Main Gauge / Total Experience */}
        <div className="lg:w-2/5 p-10 bg-zinc-50 dark:bg-black/20 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative w-48 h-48 flex items-center justify-center">
             <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-200 dark:text-white/5" />
                <motion.circle 
                  cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                  strokeDasharray={`${totalProgress * 2.83} 283`}
                  className="text-zinc-900 dark:text-white"
                  initial={{ strokeDasharray: "0 283" }}
                  animate={{ strokeDasharray: `${totalProgress * 2.83} 283` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                />
             </svg>
             <div className="absolute flex flex-col items-center justify-center space-y-1">
                <Clock className="w-5 h-5 text-zinc-400 dark:text-zinc-500 mb-1" />
                <span className="text-4xl font-space-grotesk font-bold text-zinc-900 dark:text-white tracking-tighter leading-none">{totalHours.toFixed(1)}</span>
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">/ 200 HS</span>
             </div>
          </div>
          <div className="space-y-1">
             <h4 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Experiencia Total</h4>
             <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] leading-relaxed">Progreso hacia la meta <br/> (Reducido: 150hs)</p>
          </div>
        </div>

        {/* Detailed Requirements List */}
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center space-y-6">
          {requirements.map((req, i) => {
            const progress = Math.min((req.current / req.target) * 100, 100);
            const isComplete = req.current >= req.target;
            const isSubComplete = req.subTarget ? req.current >= req.subTarget : false;

            return (
              <div key={i} className="flex items-center gap-6 group">
                <div className={`p-3 rounded-xl transition-colors ${isComplete ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-500' : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>
                  {req.icon}
                </div>
                
                <div className="flex-1 flex flex-col space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">{req.label}</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        {req.current.toFixed(1)} <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">{req.unit}</span>
                      </p>
                      {isComplete && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </div>
                  </div>
                  
                  <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className={`h-full rounded-full ${isComplete ? 'bg-green-500' : isSubComplete ? 'bg-amber-500' : 'bg-zinc-900 dark:bg-white'}`}
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
