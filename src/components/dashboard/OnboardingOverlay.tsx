"use client";

import { Profile } from "@/types";
import { updateProfile } from "@/actions/profile";
import { Shield, Calendar, CreditCard, ArrowRight, Loader2, Compass } from "lucide-react";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingOverlayProps {
  profile: Profile | null;
}

export default function OnboardingOverlay({ profile }: OnboardingOverlayProps) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(true);

  // New detection logic based on SQL defaults:
  // license_type = '-' AND cma_expiry = '2100-12-31'
  const needsOnboarding = profile?.license_type === "-" || profile?.cma_expiry === "2100-12-31";

  if (!needsOnboarding || !isOpen) return null;

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateProfile(formData);
        setIsOpen(false);
      } catch (e) {
        alert("Error al guardar los datos de inicio.");
      }
    });
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />

        {/* Content */}
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="relative w-full max-w-xl bg-black border border-white/10 rounded-[3rem] p-10 shadow-2xl space-y-10"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)] mb-4">
              <Compass className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter">Bienvenido a Vector</h2>
            <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.2em] leading-relaxed max-w-sm">
              Para comenzar a operar, necesitamos configurar los datos de tu licencia y certificado médico.
            </p>
          </div>

          <form action={handleSubmit} className="space-y-8">
            <input type="hidden" name="id" value={profile?.id || ""} />
            <input type="hidden" name="first_name" value={profile?.first_name || ""} />
            <input type="hidden" name="last_name" value={profile?.last_name || ""} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Licencia Inicial</label>
                <div className="relative group">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                  <input 
                    name="license_type"
                    required
                    defaultValue="PPA"
                    placeholder="PPA, PCA, TLA..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-white/20 transition-all text-white font-bold uppercase tracking-widest placeholder:text-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Vencimiento CMA</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                  <input 
                    name="cma_expiry"
                    type="date"
                    required
                    defaultValue="2027-12-31"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-white/20 transition-all text-white font-bold [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isPending}
              type="submit"
              className="w-full bg-white text-black font-black text-xs uppercase tracking-[0.3em] py-6 rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Finalizar Configuración</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
