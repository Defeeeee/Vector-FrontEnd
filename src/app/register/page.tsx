"use client";

import { motion } from "framer-motion";
import { Lock, Mail, User, ArrowRight, Loader2, Compass, ChevronLeft } from "lucide-react";
import { register } from "@/actions/auth";
import { useState, useTransition } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await register(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setIsSuccess(true);
      }
    });
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-md mx-auto px-6 py-12 relative z-10 text-center space-y-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-2xl"
        >
          <Mail className="w-10 h-10" />
        </motion.div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Verifica tu Email</h1>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.2em] leading-relaxed">
            Hemos enviado un enlace de confirmación a tu correo electrónico. Por favor, verifícalo para activar tu cuenta Vector.
          </p>
        </div>

        <Link href="/" className="bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] py-5 px-12 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-md mx-auto px-6 py-12 relative z-10">
      <div className="w-full flex items-center justify-between mb-12">
        <Link href="/" className="p-3 hover:bg-white/5 rounded-full transition-colors group">
          <ChevronLeft className="w-5 h-5 text-zinc-500 group-hover:text-white" />
        </Link>
        <Compass className="w-6 h-6 text-white/20" />
        <div className="w-10" />
      </div>

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center space-y-2 mb-12"
      >
        <h1 className="text-4xl font-black tracking-tighter uppercase tracking-[0.1em]">Nueva Cuenta</h1>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Únete a la red Vector</p>
      </motion.div>

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
            <div className="grid grid-cols-2 gap-3">
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                <input 
                  name="first_name"
                  type="text" 
                  placeholder="NOMBRE" 
                  required
                  className="w-full bg-white/[0.03] border border-white/[0.05] rounded-2xl py-5 pl-14 pr-6 outline-none focus:bg-white/[0.05] focus:border-white/20 transition-all text-xs font-bold tracking-wide placeholder:text-zinc-600 uppercase"
                />
              </div>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                <input 
                  name="last_name"
                  type="text" 
                  placeholder="APELLIDO" 
                  required
                  className="w-full bg-white/[0.03] border border-white/[0.05] rounded-2xl py-5 pl-14 pr-6 outline-none focus:bg-white/[0.05] focus:border-white/20 transition-all text-xs font-bold tracking-wide placeholder:text-zinc-600 uppercase"
                />
              </div>
            </div>

            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
              <input 
                name="email"
                type="email" 
                placeholder="EMAIL" 
                required
                className="w-full bg-white/[0.03] border border-white/[0.05] rounded-2xl py-5 pl-14 pr-6 outline-none focus:bg-white/[0.05] focus:border-white/20 transition-all text-xs font-bold tracking-wide placeholder:text-zinc-600 uppercase"
              />
            </div>
            
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
              <input 
                name="password"
                type="password" 
                placeholder="CONTRASEÑA" 
                required
                className="w-full bg-white/[0.03] border border-white/[0.05] rounded-2xl py-5 pl-14 pr-6 outline-none focus:bg-white/[0.05] focus:border-white/20 transition-all text-xs font-bold tracking-wide placeholder:text-zinc-600 uppercase"
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
              <span>Crear Cuenta</span>
            )}
          </motion.button>
        </form>

        <div className="flex flex-col items-center pt-4">
          <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest">
            <span className="text-zinc-600">¿Ya tienes cuenta?</span>
            <Link href="/" className="text-white hover:text-zinc-300 transition-colors border-b border-white/20 pb-0.5">
              Ingresa
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
