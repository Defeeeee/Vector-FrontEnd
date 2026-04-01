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
      <div className={`bg-white/[0.01] border transition-all duration-500 overflow-hidden ${isEditing ? 'rounded-[3rem] border-white/10 bg-white/[0.03] shadow-2xl p-10' : 'rounded-none border-transparent border-b-white/[0.03] hover:bg-white/[0.02] p-8'}`}>
        {!isEditing ? (
          <div className="flex items-center justify-between group">
            <div className="flex items-center space-x-8">
              <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 duration-500">
                <Plane className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <p className="font-black text-3xl text-white tracking-tighter uppercase">{aircraft.registration}</p>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">{aircraft.type} <span className="mx-2 text-zinc-800">/</span> {aircraft.icao}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
              <button 
                onClick={() => setIsEditing(true)}
                className="p-3 hover:bg-white text-zinc-500 hover:text-black rounded-full transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDelete}
                className="p-3 hover:bg-white text-zinc-500 hover:text-black rounded-full transition-all"
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
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic text-white/40">Edit Aircraft</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form action={handleUpdate} className="space-y-10">
              <input type="hidden" name="id" value={aircraft.id} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <EditField label="Registration">
                  <input name="registration" defaultValue={aircraft.registration} required className="w-full bg-transparent border-b border-white/10 py-2 text-white outline-none focus:border-white transition-all font-bold uppercase" />
                </EditField>
                
                <EditField label="ICAO Type">
                  <input name="icao" defaultValue={aircraft.icao} required className="w-full bg-transparent border-b border-white/10 py-2 text-white outline-none focus:border-white transition-all font-bold uppercase" />
                </EditField>

                <EditField label="Make & Model">
                  <input name="type" defaultValue={aircraft.type} required className="w-full bg-transparent border-b border-white/10 py-2 text-white outline-none focus:border-white transition-all font-bold uppercase" />
                </EditField>
              </div>

              <div className="flex items-center justify-end space-x-6">
                <button 
                  disabled={isPending}
                  type="submit"
                  className="bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] px-12 py-5 rounded-full shadow-2xl transition-all active:scale-[0.95] flex items-center space-x-2"
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
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 group-focus-within:text-white transition-colors">{label}</label>
      {children}
    </div>
  );
}
