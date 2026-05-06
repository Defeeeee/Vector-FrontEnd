"use client";

import { useTransition, useState } from "react";
import { Plus, ChevronRight } from "lucide-react";
import { addAircraft } from "@/actions/flight";
import { LoadingButton } from "@/components/LoadingButton";

export default function AircraftForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addAircraft(formData);
        // On success, the form will be revalidated by the server action
      } catch (e: any) {
        setError(e.message || "Error al registrar la aeronave");
      }
    });
  }

  return (
    <div className="bg-white dark:bg-white/[0.02] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none hover:shadow-lg dark:hover:bg-white/[0.04] transition-all space-y-6 md:space-y-8">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
          <Plus className="w-4 h-4 text-white dark:text-zinc-900" />
        </div>
        <h4 className="text-xs md:text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Agregar Nueva Aeronave</h4>
      </div>
      
      <form action={handleSubmit} className="space-y-6">
        {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 text-red-600 dark:text-red-500 text-xs font-bold uppercase tracking-wider">
                {error}
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 group">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ml-1 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">Matrícula</label>
            <input 
              name="registration" 
              placeholder="ej. LV-ABC" 
              required 
              className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-blue-500/20 focus:border-zinc-900 dark:focus:border-blue-500/50 transition-all font-bold uppercase placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
            />
          </div>
          <div className="space-y-2 group">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ml-1 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">Marca y Modelo</label>
            <input 
              name="type" 
              placeholder="ej. Cessna 150" 
              required 
              className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-blue-500/20 focus:border-zinc-900 dark:focus:border-blue-500/50 transition-all font-bold placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
            />
          </div>
          <div className="space-y-2 group">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ml-1 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">Tipo ICAO</label>
            <input 
              name="icao" 
              placeholder="ej. C150" 
              required 
              className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-blue-500/20 focus:border-zinc-900 dark:focus:border-blue-500/50 transition-all font-bold uppercase placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
            />
          </div>
          <div className="space-y-2 group">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ml-1 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">Categoría (ANAC)</label>
            <div className="relative">
              <select 
                name="type_acft"
                className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-blue-500/20 focus:border-zinc-900 dark:focus:border-blue-500/50 transition-all font-bold appearance-none cursor-pointer"
              >
                <option value="MONT-T" className="dark:bg-zinc-900">MONT-T (Monomotor Terrestre)</option>
                <option value="MULT-T" className="dark:bg-zinc-900">MULT-T (Multimotor Terrestre)</option>
                <option value="MONT-H" className="dark:bg-zinc-900">MONT-H (Monomotor Hidroavión)</option>
                <option value="MULT-H" className="dark:bg-zinc-900">MULT-H (Multimotor Hidroavión)</option>
              </select>
              <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 dark:text-zinc-400 rotate-90 pointer-events-none" />
            </div>
          </div>
        </div>
        
        <LoadingButton 
          isLoading={isPending}
          type="submit" 
          className="w-full md:w-auto bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold text-[10px] uppercase tracking-[0.2em] py-5 px-10 rounded-2xl transition-all shadow-cal-highlight dark:shadow-xl"
        >
          Registrar Aeronave
        </LoadingButton>
      </form>
    </div>
  );
}
