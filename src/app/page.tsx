"use client";

import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight, Loader2, Compass } from "lucide-react";
import { login } from "@/actions/auth";
import { useState, useTransition } from "react";
import Link from "next/link";

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-md mx-auto px-6 py-12 relative z-10">
      {/* Branding */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center space-y-6 mb-12"
      >
        <div className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)]">
          <Compass className="w-8 h-8" strokeWidth={1.5} />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic italic-none tracking-[0.1em]">Vector</h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Logbook Digital</p>
        </div>
      </motion.div>

      {/* Login Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-8"
      >
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-500 text-xs font-bold text-center uppercase tracking-wider"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-3">
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
              <input 
                name="email"
                type="email" 
                placeholder="EMAIL" 
                required
                className="w-full bg-white/[0.03] border border-white/[0.05] rounded-2xl py-5 pl-14 pr-6 outline-none focus:bg-white/[0.05] focus:border-white/20 transition-all text-sm font-bold tracking-wide placeholder:text-zinc-600 uppercase"
              />
            </div>
            
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
              <input 
                name="password"
                type="password" 
                placeholder="CONTRASEÑA" 
                required
                className="w-full bg-white/[0.03] border border-white/[0.05] rounded-2xl py-5 pl-14 pr-6 outline-none focus:bg-white/[0.05] focus:border-white/20 transition-all text-sm font-bold tracking-wide placeholder:text-zinc-600 uppercase"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={isPending}
            className="w-full bg-white text-black font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl transition-all disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <span>Iniciar Sesión</span>
            )}
          </motion.button>
        </form>

        <div className="flex flex-col items-center space-y-6 pt-4">
          <button className="text-[10px] font-black text-zinc-500 hover:text-white transition-colors uppercase tracking-widest">
            ¿Olvidaste tu contraseña?
          </button>
          
          <div className="h-px w-12 bg-white/10" />
          
          <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest">
            <span className="text-zinc-600">¿Nuevo piloto?</span>
            <Link href="/register" className="text-white hover:text-zinc-300 transition-colors border-b border-white/20 pb-0.5">
              Crear Cuenta
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Version Tag */}
      <div className="absolute bottom-8 text-[10px] font-bold text-zinc-800 uppercase tracking-[0.5em]">
        Vector v1.0.0
      </div>
    </div>
  );
}
