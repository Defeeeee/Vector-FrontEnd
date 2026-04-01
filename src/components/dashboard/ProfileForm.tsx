"use client";

import { Profile } from "@/types";
import { updateProfile } from "@/actions/profile";
import { User, Shield, Calendar, CreditCard, Save, Loader2, Compass } from "lucide-react";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";

interface ProfileFormProps {
  profile: Profile | null;
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSuccess(false);
    startTransition(async () => {
      try {
        await updateProfile(formData);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (e) {
        console.error(e);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-12">
      <input type="hidden" name="id" defaultValue={profile?.id || ""} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
        <EditField label="Nombre">
          <input name="first_name" defaultValue={profile?.first_name || ""} placeholder="Nombre del piloto" required className="w-full bg-transparent border-b border-white/10 py-3 text-xl font-black text-white outline-none focus:border-white transition-all uppercase tracking-tighter" />
        </EditField>

        <EditField label="Apellido">
          <input name="last_name" defaultValue={profile?.last_name || ""} placeholder="Apellido del piloto" required className="w-full bg-transparent border-b border-white/10 py-3 text-xl font-black text-white outline-none focus:border-white transition-all uppercase tracking-tighter" />
        </EditField>

        <EditField label="Licencia (ANAC)">
          <input name="license_type" defaultValue={profile?.license_type || ""} placeholder="PPA, PCA, TLA..." className="w-full bg-transparent border-b border-white/10 py-3 text-xl font-black text-white outline-none focus:border-white transition-all uppercase tracking-tighter" />
        </EditField>

        <EditField label="Vencimiento CMA">
          <input name="cma_expiry" type="date" defaultValue={profile?.cma_expiry || ""} className="w-full bg-transparent border-b border-white/10 py-3 text-xl font-black text-white outline-none focus:border-white transition-all [color-scheme:dark]" />
        </EditField>
      </div>

      <div className="flex items-center justify-between pt-8 border-t border-white/[0.03]">
        <div className="flex items-center space-x-2">
          {success && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center space-x-2 text-emerald-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizado</span>
            </motion.div>
          )}
        </div>
        
        <button 
          disabled={isPending}
          type="submit" 
          className="bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] py-5 px-12 rounded-full shadow-2xl transition-all active:scale-[0.95] flex items-center space-x-3 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Guardar Perfil</span>
        </button>
      </div>
    </form>
  );
}

function EditField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-3 group">
      <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 group-focus-within:text-white transition-colors">{label}</label>
      {children}
    </div>
  );
}
