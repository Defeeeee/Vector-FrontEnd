"use client";

import { FlightPack } from "@/types";
import { Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface FlightPackWidgetProps {
  packs: FlightPack[];
}

export default function FlightPackWidget({ packs }: FlightPackWidgetProps) {
  if (!packs || packs.length === 0) return null;

  const activePacks = packs.filter(p => p.is_active && p.remaining_hours > 0);
  if (activePacks.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tighter">Packs de Horas</h3>
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">Paquetes Activos</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activePacks.map((pack) => {
          const percentage = Math.max(0, Math.min(100, (pack.remaining_hours / pack.total_hours) * 100));
          const isLow = percentage < 20;

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 shadow-cal hover:shadow-lg dark:hover:bg-white/[0.04] transition-all rounded-[2.5rem] p-8 space-y-6 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLow ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg'}`}>
                    {isLow ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">Paquete de Vuelo</p>
                    <h3 className="font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tighter text-xl leading-none">{pack.name}</h3>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-end justify-between">
                  <div className="flex flex-col space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">Disponible</p>
                    <p className="text-4xl font-space-grotesk font-bold text-zinc-900 dark:text-white tracking-tighter leading-none">
                      {pack.remaining_hours.toFixed(1)}
                      <span className="text-sm font-bold text-zinc-400 dark:text-zinc-500 ml-1 uppercase tracking-normal">/ {pack.total_hours}H</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold tracking-tighter ${isLow ? 'text-red-600 dark:text-red-500' : 'text-zinc-900 dark:text-white'}`}>
                      {Math.round(percentage)}%
                    </p>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${isLow ? 'bg-red-600 dark:bg-red-500' : 'bg-zinc-900 dark:bg-white'}`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
