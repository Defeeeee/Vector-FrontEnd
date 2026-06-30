"use client";

import { Profile } from "@/types";
import { updateProfile, regenerateApiKey } from "@/actions/profile";
import { User, Shield, Calendar, CreditCard, Save, Loader2, Compass } from "lucide-react";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";

interface ProfileFormProps {
  profile: Profile | null;
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  async function handleRegenerateKey() {
    if (!confirm("¿Estás seguro de que querés regenerar tu token de acceso? El token anterior dejará de funcionar inmediatamente.")) {
      return;
    }
    setIsRegenerating(true);
    try {
      await regenerateApiKey();
    } catch (e) {
      alert("Error al regenerar el token");
    } finally {
      setIsRegenerating(false);
    }
  }

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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EditField label="Nombre">
          <input name="first_name" defaultValue={profile?.first_name || ""} placeholder="Nombre del piloto" required className="w-full bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white/50 transition-all uppercase tracking-tighter placeholder:text-zinc-400 dark:placeholder:text-zinc-600" />
        </EditField>

        <EditField label="Apellido">
          <input name="last_name" defaultValue={profile?.last_name || ""} placeholder="Apellido del piloto" required className="w-full bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white/50 transition-all uppercase tracking-tighter placeholder:text-zinc-400 dark:placeholder:text-zinc-600" />
        </EditField>

        <EditField label="Licencia (ANAC)">
          <input name="license_type" defaultValue={profile?.license_type || ""} placeholder="PPA, PCA, TLA..." className="w-full bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white/50 transition-all uppercase tracking-tighter placeholder:text-zinc-400 dark:placeholder:text-zinc-600" />
        </EditField>

        <EditField label="Vencimiento CMA">
          <input name="cma_expiry" type="date" defaultValue={profile?.cma_expiry || ""} className="w-full bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white/50 transition-all [color-scheme:light] dark:[color-scheme:dark]" />
        </EditField>

        <div className="md:col-span-2 p-6 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-[1.5rem] space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Token de Acceso API (iOS Shortcuts)</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-[9px] uppercase tracking-wider mt-0.5 leading-relaxed">Usa este token único para automatizar el inicio y fin de tus vuelos mediante un Shortcut de iOS.</p>
            </div>
            <Shield className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              readOnly 
              type="text" 
              value={profile?.api_key || "No disponible. Guarda tu perfil primero."} 
              className="flex-1 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300 outline-none select-all shadow-sm" 
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (profile?.api_key) {
                    navigator.clipboard.writeText(profile.api_key);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-[9px] uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all active:scale-[0.95] flex-shrink-0"
              >
                {copied ? "¡Copiado!" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={handleRegenerateKey}
                disabled={isRegenerating}
                className="bg-transparent hover:bg-zinc-100 dark:hover:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 font-bold text-[9px] uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all disabled:opacity-50 flex-shrink-0"
              >
                {isRegenerating ? "Generando..." : "Regenerar"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-8 border-t border-zinc-200 dark:border-white/10 gap-6">
        <div className="flex items-center space-x-2">
          {success && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center space-x-2 text-green-600">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] dark:text-green-500">Sincronizado</span>
            </motion.div>
          )}
        </div>
        
        <button 
          disabled={isPending}
          type="submit" 
          className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-[10px] uppercase tracking-[0.3em] py-5 px-12 rounded-full shadow-cal-highlight dark:shadow-none transition-all active:scale-[0.95] flex items-center space-x-3 disabled:opacity-50"
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
      <label className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-500 dark:text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">{label}</label>
      {children}
    </div>
  );
}
