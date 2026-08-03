"use client";

import { Flight } from "@/types";
import { Award, CheckCircle2, Clock, Compass, Navigation, Moon, Target } from "lucide-react";
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
    <section className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h3 className="text-xl md:text-2xl font-bold font-display text-zinc-900 dark:text-white tracking-tight transition-colors">Tracker PCA</h3>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Reg. 61.620</p>
        </div>
        <div className="px-3 md:px-4 py-1.5 md:py-2 bg-zinc-900 dark:bg-white rounded-full shadow-cal-highlight flex items-center space-x-2 transition-colors">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <p className="text-xs font-semibold text-white dark:text-zinc-900">En progreso</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-3xl md:rounded-[2.5rem] shadow-cal dark:shadow-none overflow-hidden flex flex-col lg:flex-row transition-all">
        
        {/* Main Gauge / Total Experience */}
        <div className="lg:w-2/5 p-8 md:p-10 bg-zinc-50 dark:bg-black/20 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative w-32 h-32 md:w-48 md:h-48 flex items-center justify-center">
             <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-200 dark:text-white/5" />
                <motion.circle
                  cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                  strokeDasharray={`${totalProgress * 2.83} 283`}
                  className="text-aviation-blue-dark dark:text-aviation-cyan"
                  initial={{ strokeDasharray: "0 283" }}
                  animate={{ strokeDasharray: `${totalProgress * 2.83} 283` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                />
             </svg>
             <div className="absolute flex flex-col items-center justify-center space-y-0.5 md:space-y-1">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-zinc-400 dark:text-zinc-500 mb-0.5 md:mb-1" />
                <span className="text-2xl md:text-4xl font-display font-bold text-zinc-900 dark:text-white tracking-tighter leading-none">{totalHours.toFixed(1)}</span>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">/ 200 hs</span>
             </div>
          </div>
          <div className="space-y-1">
             <h4 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Experiencia total</h4>
             <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">Progreso hacia la meta <br className="hidden md:block"/> (reducido: 150 hs)</p>
          </div>
        </div>

        {/* Requirements — license stamps instead of progress bars: each requirement is an official stamp waiting to be earned */}
        <div className="flex-1 p-6 md:p-10 grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 place-items-center">
          {requirements.map((req, i) => {
            const isComplete = req.current >= req.target;
            const isSubComplete = req.subTarget ? req.current >= req.subTarget : false;
            const rotation = i % 3 === 0 ? -4 : i % 3 === 1 ? 3 : -2;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, rotate: isComplete ? rotation : 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex flex-col items-center text-center gap-2.5"
              >
                <div
                  className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isComplete
                      ? "border-green-500 text-green-600 dark:text-green-500"
                      : isSubComplete
                        ? "border-amber-500 border-dashed text-amber-600 dark:text-amber-500"
                        : "border-zinc-300 dark:border-white/15 border-dashed text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {req.icon}
                  {isComplete && (
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full bg-green-500 text-white flex items-center justify-center border-2 border-white dark:border-[#111111]">
                      <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white leading-tight">{req.label}</p>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {req.current.toFixed(1)} / {req.target} {req.unit}
                  </p>
                </div>
                {isComplete && (
                  <span
                    className="text-[7px] font-black uppercase tracking-widest text-green-600 dark:text-green-500 border-2 border-green-500/50 rounded px-1.5 py-0.5"
                    style={{ transform: `rotate(${-rotation}deg)` }}
                  >
                    Cumplido
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
