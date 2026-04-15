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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 mt-12">
      {activePacks.map((pack) => {
        const percentage = Math.max(0, Math.min(100, (pack.remaining_hours / pack.total_hours) * 100));
        const isLow = percentage < 20;

        return (
          <motion.div
            key={pack.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zinc-200 shadow-cal hover:shadow-lg transition-shadow rounded-[2.5rem] p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLow ? 'bg-red-50 text-red-500' : 'bg-zinc-50 text-zinc-900'}`}>
                  {isLow ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold font-space-grotesk text-zinc-900 tracking-tighter text-xl leading-tight">{pack.name}</h3>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Active Flight Pack</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-space-grotesk font-bold text-zinc-900 tracking-tighter">
                    {pack.remaining_hours.toFixed(1)}
                    <span className="text-sm font-bold text-zinc-500 ml-1 uppercase tracking-normal">h</span>
                  </p>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-1">Remaining of {pack.total_hours}h</p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold tracking-tighter ${isLow ? 'text-red-500' : 'text-zinc-900'}`}>
                    {Math.round(percentage)}%
                  </p>
                </div>
              </div>

              <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-zinc-900'}`}
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
