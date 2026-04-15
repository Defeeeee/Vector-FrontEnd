"use client";

import { Flight } from "@/types";
import { Award, CheckCircle2, Circle, Clock, Compass, Navigation, Moon, Target } from "lucide-react";
import { motion } from "framer-motion";

interface PCATrackerProps {
  flights: Flight[];
}

export default function PCATracker({ flights }: PCATrackerProps) {
  // Stats calculation
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
    <section className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Requisitos PCA (61.620)</p>
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Tracker de Licencia Comercial</h3>
        </div>
        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">En Progreso</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {requirements.map((req, i) => {
          const progress = Math.min((req.current / req.target) * 100, 100);
          const isComplete = req.current >= req.target;
          const isSubComplete = req.subTarget ? req.current >= req.subTarget : false;

          return (
            <div key={i} className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] space-y-6 hover:bg-white/[0.04] transition-colors group">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-white/[0.05] rounded-2xl text-zinc-400 group-hover:text-white transition-colors">
                  {req.icon}
                </div>
                {isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-zinc-800" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{req.label}</p>
                  <p className="text-sm font-black text-white italic">
                    {req.current.toFixed(1)} <span className="text-[10px] text-zinc-600 not-italic uppercase">{req.unit}</span>
                  </p>
                </div>
                
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : isSubComplete ? 'bg-amber-500' : 'bg-white'}`}
                  />
                </div>

                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                  <span className={isComplete ? 'text-emerald-500' : 'text-zinc-600'}>
                    Meta: {req.target}{req.unit}
                  </span>
                  {req.subTarget && (
                    <span className={isSubComplete ? 'text-amber-500' : 'text-zinc-700'}>
                      Reducido: {req.subTarget}{req.unit}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
