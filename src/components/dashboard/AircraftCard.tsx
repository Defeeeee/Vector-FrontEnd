"use client";

import { Aircraft } from "@/types";
import { updateAircraft, deleteAircraft } from "@/actions/flight";
import { Plane, Edit2, Trash2, X, Check, Loader2, ChevronRight } from "lucide-react";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AircraftCardProps {
  aircraft: Aircraft;
}

export default function AircraftCard({ aircraft }: AircraftCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleUpdate(formData: FormData) {
    startTransition(async () => {
      const result = await updateAircraft(formData);
      if (result?.error) {
        alert(result.error);
      } else {
        setIsEditing(false);
      }
    });
  }

  async function handleDelete() {
    if (confirm("¿Estás seguro de eliminar esta aeronave?")) {
      startTransition(async () => {
        const result = await deleteAircraft(aircraft.id);
        if (result?.error) {
          alert(result.error);
        }
      });
    }
  }

  return (
    <div className={`transition-all duration-500 ${isEditing ? 'py-4' : 'py-0'}`}>
      <div className={`bg-white dark:bg-white/[0.02] border transition-all duration-500 overflow-hidden ${isEditing ? 'rounded-[2.5rem] border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-transparent shadow-cal dark:shadow-none p-10' : 'rounded-none border-transparent border-b-zinc-200 dark:border-b-white/10 hover:bg-zinc-50 dark:hover:bg-white/[0.04] p-8'}`}>
        {!isEditing ? (
          <div className="flex items-center justify-between group">
            <div className="flex items-center space-x-8">
              <div className="w-14 h-14 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 duration-500">
                <Plane className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <p className="font-bold font-space-grotesk text-3xl text-zinc-900 dark:text-white tracking-tighter uppercase">{aircraft.registration}</p>
                <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-[0.3em]">
                  {aircraft.type} 
                  <span className="mx-2 text-zinc-300 dark:text-zinc-700">/</span> 
                  {aircraft.icao}
                  {aircraft.type_acft && (
                    <>
                      <span className="mx-2 text-zinc-300 dark:text-zinc-700">/</span>
                      {aircraft.type_acft}
                    </>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 md:space-x-2 md:opacity-0 md:group-hover:opacity-100 transition-all transform md:translate-x-4 md:group-hover:translate-x-0">
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 md:p-3 bg-zinc-100 dark:bg-white/10 md:bg-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDelete}
                className="p-2 md:p-3 bg-zinc-100 dark:bg-white/10 md:bg-transparent text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 rounded-full transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold font-space-grotesk text-zinc-900 dark:text-white uppercase tracking-tighter">Edit Aircraft</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-sm">
                <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              </button>
            </div>

            <form action={handleUpdate} className="space-y-10">
              <input type="hidden" name="id" value={aircraft.id} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EditField label="Registration">
                  <input name="registration" defaultValue={aircraft.registration} required className="w-full bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all uppercase" />
                </EditField>
                
                <EditField label="ICAO Type">
                  <input name="icao" defaultValue={aircraft.icao} required className="w-full bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all uppercase" />
                </EditField>

                <EditField label="Make & Model">
                  <input name="type" defaultValue={aircraft.type} required className="w-full bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all uppercase" />
                </EditField>

                <EditField label="Category (ANAC)">
                  <div className="relative">
                    <select 
                      name="type_acft" 
                      defaultValue={aircraft.type_acft}
                      className="w-full bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 transition-all uppercase appearance-none"
                    >
                      <option value="MONT-T" className="dark:bg-zinc-900">MONT-T (Monomotor Terrestre)</option>
                      <option value="MULT-T" className="dark:bg-zinc-900">MULT-T (Multimotor Terrestre)</option>
                      <option value="MONT-H" className="dark:bg-zinc-900">MONT-H (Monomotor Hidroavión)</option>
                      <option value="MULT-H" className="dark:bg-zinc-900">MULT-H (Multimotor Hidroavión)</option>
                    </select>
                    <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 dark:text-zinc-400 rotate-90 pointer-events-none" />
                  </div>
                </EditField>
              </div>

              <div className="flex items-center justify-end space-x-6">
                <button 
                  disabled={isPending}
                  type="submit"
                  className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-[10px] uppercase tracking-[0.2em] px-12 py-5 rounded-full shadow-cal-highlight dark:shadow-none transition-all active:scale-[0.95] flex items-center space-x-2"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function EditField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2 group">
      <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">{label}</label>
      {children}
    </div>
  );
}
