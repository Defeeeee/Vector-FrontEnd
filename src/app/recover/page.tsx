"use client";

import { motion } from "framer-motion";
import { Mail, ArrowRight, Loader2, Compass, ChevronLeft } from "lucide-react";
import { recoverPassword } from "@/actions/auth";
import { useState, useTransition } from "react";
import Link from "next/link";

export default function RecoverPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await recoverPassword(formData);
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
          className="w-20 h-20 bg-zinc-900 text-white rounded-full flex items-center justify-center shadow-lg"
        >
          <Mail className="w-10 h-10" />
        </motion.div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-space-grotesk font-bold uppercase tracking-tighter text-zinc-900">Email Enviado</h1>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.2em] leading-relaxed">
            Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
          </p>
        </div>

        <Link href="/" className="bg-white text-zinc-900 border border-zinc-200 font-bold text-[10px] uppercase tracking-[0.3em] py-5 px-12 rounded-full shadow-sm transition-all hover:bg-zinc-50 active:scale-95">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-md mx-auto px-6 py-12 relative z-10">
      <div className="w-full flex items-center justify-between mb-12">
        <Link href="/login" className="p-3 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-full shadow-sm transition-colors group">
          <ChevronLeft className="w-5 h-5 text-zinc-500 group-hover:text-zinc-900" />
        </Link>
      </div>

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center space-y-2 mb-12"
      >
        <div className="w-16 h-16 bg-zinc-900 text-white rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6">
          <Compass className="w-8 h-8" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-space-grotesk font-bold tracking-tighter uppercase tracking-[0.1em] text-zinc-900">Recuperar</h1>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Acceso a la Red Vector</p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-8 bg-white border border-zinc-200 p-8 md:p-10 rounded-[2.5rem] shadow-cal"
      >
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-xs font-bold text-center uppercase tracking-wider"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-2 group">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1 group-focus-within:text-zinc-900 transition-colors">Email</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
              <input 
                name="email"
                type="email" 
                placeholder="name@airline.com" 
                required
                className="w-full bg-transparent border border-zinc-200 rounded-2xl py-5 pl-14 pr-6 outline-none focus:border-zinc-400 transition-all text-xs font-bold tracking-wide placeholder:text-zinc-400 uppercase text-zinc-900"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={isPending}
            className="w-full bg-zinc-900 text-white font-bold text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-cal-highlight transition-all disabled:opacity-50 mt-4"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <span>Enviar Instrucciones</span>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
