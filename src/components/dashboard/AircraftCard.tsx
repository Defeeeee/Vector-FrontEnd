"use client";

import { Aircraft } from "@/types";
import { updateAircraft, deleteAircraft } from "@/actions/flight";
import { Plane, Edit2, Trash2, X, Check, Loader2, ChevronRight } from "lucide-react";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";

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

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="col-span-full bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-[2rem] p-6 md:p-8 space-y-8"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold font-display text-zinc-900 dark:text-white tracking-tight">Editar aeronave</h3>
          <button onClick={() => setIsEditing(false)} className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-sm">
            <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        <form action={handleUpdate} className="space-y-8">
          <input type="hidden" name="id" value={aircraft.id} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm px-12 py-5 rounded-full shadow-cal-highlight dark:shadow-none transition-all active:scale-[0.95] flex items-center space-x-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Guardar cambios</span>
            </button>
          </div>
        </form>
      </motion.div>
    );
  }

  return (
    <div className="relative bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl p-5 hover:border-zinc-300 dark:hover:border-white/20 hover:shadow-md dark:hover:bg-white/[0.04] transition-all group flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 duration-500">
          <Plane className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 rounded-full transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="min-w-0">
        <p className="font-bold font-display text-xl text-zinc-900 dark:text-white tracking-tight uppercase truncate">{aircraft.registration}</p>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium truncate mt-0.5">
          {aircraft.type}
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">/</span>
          {aircraft.icao}
          {aircraft.type_acft && (
            <>
              <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">/</span>
              {aircraft.type_acft}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function EditField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2 group">
      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">{label}</label>
      {children}
    </div>
  );
}
