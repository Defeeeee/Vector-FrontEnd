"use client";

import { Flight } from "@/types";
import { Award, CheckCircle2, Circle, Clock, Compass, Navigation, Moon, Target } from "lucide-react";
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
    {
      label: "Experiencia Total",
      current: totalHours,
      target: 200,
      subTarget: 150,
      unit: "hs",
      icon: <Clock className="w-4 h-4" />
    },
    {
      label: "Piloto al Mando (PIC)",
      current: picHours,
      target: 100,
      subTarget: 70,
      unit: "hs",
      icon: <Target className="w-4 h-4" />
    },
    {
      label: "PIC Travesía",
      current: picTravesia,
      target: 20,
      unit: "hs",
      icon: <Compass className="w-4 h-4" />
    },
    {
      label: "Instrucción Instrumentos",
      current: instrumentHours,
      target: 10,
      unit: "hs",
      icon: <Navigation className="w-4 h-4" />
    },
    {
      label: "Vuelo Nocturno (PIC)",
      current: nightHours,
      target: 5,
      unit: "hs",
      icon: <Moon className="w-4 h-4" />
    },
    {
      label: "Aterrizajes Nocturnos",
      current: nightLandings,
      target: 5,
      unit: "atrr",
      icon: <Award className="w-4 h-4" />
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h3 className="text-xl md:text-2xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tighter uppercase transition-colors">Tracker PCA</h3>
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">Requisitos Comerciales (61.620)</p>
        </div>
        <div className="px-3 md:px-4 py-1.5 md:py-2 bg-zinc-900 dark:bg-white rounded-full shadow-cal-highlight flex items-center space-x-2 transition-colors">
          <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
          <p className="text-[8px] font-bold text-white dark:text-zinc-900 uppercase tracking-widest">En Progreso</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {requirements.map((req, i) => {
          const progress = Math.min((req.current / req.target) * 100, 100);
          const isComplete = req.current >= req.target;
          const isSubComplete = req.subTarget ? req.current >= req.subTarget : false;

          return (
            <div key={i} className="p-6 md:p-8 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2rem] md:rounded-[2.5rem] space-y-6 shadow-cal dark:shadow-none hover:shadow-lg dark:hover:bg-[#1a1a1a] transition-all group">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-2xl transition-colors ${isComplete ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-500' : 'bg-zinc-50 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>
                  {req.icon}
                </div>
                {isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-zinc-200 dark:text-zinc-800" />
                )}
              </div>

              <div className="space-y-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{req.label}</p>
                  <p className="text-3xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tighter">
                    {req.current.toFixed(1)} <span className="text-sm font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-normal">{req.unit}</span>
                  </p>
                </div>
                
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={`h-full rounded-full ${isComplete ? 'bg-green-500' : isSubComplete ? 'bg-amber-500' : 'bg-zinc-900 dark:bg-white'}`}
                  />
                </div>

                <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest">
                  <span className={isComplete ? 'text-green-600' : 'text-zinc-500'}>
                    Meta: {req.target}{req.unit}
                  </span>
                  {req.subTarget && (
                    <span className={isSubComplete ? 'text-amber-600' : 'text-zinc-400'}>
                      Reducido: {req.subTarget}{req.unit}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
