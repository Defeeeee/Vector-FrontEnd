"use client";

import { Profile } from "@/types";
import { updateProfile } from "@/actions/profile";
import { upsertCmaDocument } from "@/actions/document";
import { Shield, Calendar, CreditCard, ArrowRight, Loader2, Compass } from "lucide-react";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingOverlayProps {
  profile: Profile | null;
}

export default function OnboardingOverlay({ profile }: OnboardingOverlayProps) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(true);

  // Only the licence placeholder gates onboarding now. The old check also fired
  // on the `2100-12-31` CMA sentinel, but the medical is a `documents` row
  // rather than a profile column, so that sentinel no longer tracks whether the
  // pilot has actually filled anything in.
  const needsOnboarding = profile?.license_type === "-";

  if (!needsOnboarding || !isOpen) return null;

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        // Two writes because they land in two places: the licence on the
        // profile, the medical as the pilot's first document.
        await updateProfile(formData);
        const result = await upsertCmaDocument(formData.get("cma_expiry") as string);
        if (result?.error) {
          alert(result.error);
          return;
        }
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
        <div className="absolute inset-0 bg-zinc-900/40 dark:bg-black/70 backdrop-blur-md" />

        {/* Content */}
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="relative w-full max-w-xl bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 rounded-[3rem] p-10 shadow-cal dark:shadow-none space-y-10"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <Compass className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <h2 className="text-4xl font-display font-bold tracking-tight text-zinc-900 dark:text-white">Bienvenido a Vector</h2>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm leading-relaxed max-w-sm">
              Para comenzar a operar, necesitamos configurar los datos de tu licencia y certificado médico.
            </p>
          </div>

          <form action={handleSubmit} className="space-y-8">
            <input type="hidden" name="id" value={profile?.id || ""} />
            <input type="hidden" name="first_name" value={profile?.first_name || ""} />
            <input type="hidden" name="last_name" value={profile?.last_name || ""} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Licencia inicial</label>
                <div className="relative group">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                  <input
                    name="license_type"
                    required
                    defaultValue="PPA"
                    placeholder="PPA, PCA, TLA..."
                    className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-zinc-900 dark:focus:border-white/50 transition-all text-zinc-900 dark:text-white font-semibold uppercase placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Vencimiento CMA</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                  <input
                    name="cma_expiry"
                    type="date"
                    required
                    defaultValue="2027-12-31"
                    className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-zinc-900 dark:focus:border-white/50 transition-all text-zinc-900 dark:text-white font-semibold [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isPending}
              type="submit"
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm py-6 rounded-2xl shadow-cal-highlight dark:shadow-none transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Finalizar configuración</span>
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
