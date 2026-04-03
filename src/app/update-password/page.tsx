"use client";

import { motion } from "framer-motion";
import { Lock, ArrowRight, Loader2, Compass, CheckCircle, AlertCircle } from "lucide-react";
import { updatePassword, setSession } from "@/actions/auth";
import { useState, useEffect, useTransition, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function UpdatePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function initializeSession() {
      // Parse hash fragment (#access_token=...)
      const hash = window.location.hash;
      const urlParams = new URLSearchParams(window.location.search);
      let token = urlParams.get("token") || urlParams.get("access_token");

      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        token = token || params.get("access_token");
      }
      
      if (token) {
        try {
          await setSession(token, undefined, 3600);
          setIsSessionReady(true);
          console.log("Session established from token");
        } catch (e) {
          setError("Error al establecer la sesión de recuperación.");
        }
      } else {
        setError("Token de recuperación no encontrado. Por favor, solicita un nuevo correo.");
      }
    }

    initializeSession();
  }, []);

  async function handleSubmit(formData: FormData) {
    const password = formData.get("password");
    const confirm = formData.get("confirm_password");

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (!isSessionReady) {
      setError("La sesión aún no está lista. Por favor espera un segundo.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updatePassword(formData);
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
          className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl"
        >
          <CheckCircle className="w-10 h-10" />
        </motion.div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Éxito</h1>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.2em] leading-relaxed">
            Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión.
          </p>
        </div>

        <Link href="/" className="bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] py-5 px-12 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95">
          Ir al Login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-md mx-auto px-6 py-12 relative z-10">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center space-y-2 mb-12"
      >
        <Compass className="w-12 h-12 text-white/20 mx-auto mb-6" />
        <h1 className="text-4xl font-black tracking-tighter uppercase tracking-[0.1em]">Nueva Clave</h1>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Restablecer acceso de piloto</p>
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
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-500 text-xs font-bold text-center uppercase tracking-wider flex items-center justify-center space-x-2"
            >
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </motion.div>
          )}

          {!error && !isSessionReady && (
             <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest text-center animate-pulse mb-4">
               Validando sesión de seguridad...
             </div>
          )}

          <div className="space-y-3">
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
              <input 
                name="password"
                type="password" 
                placeholder="NUEVA CONTRASEÑA" 
                required
                className="w-full bg-white/[0.03] border border-white/[0.05] rounded-2xl py-5 pl-14 pr-6 outline-none focus:bg-white/[0.05] focus:border-white/20 transition-all text-xs font-bold tracking-wide placeholder:text-zinc-600 uppercase"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
              <input 
                name="confirm_password"
                type="password" 
                placeholder="CONFIRMAR CONTRASEÑA" 
                required
                className="w-full bg-white/[0.03] border border-white/[0.05] rounded-2xl py-5 pl-14 pr-6 outline-none focus:bg-white/[0.05] focus:border-white/20 transition-all text-xs font-bold tracking-wide placeholder:text-zinc-600 uppercase"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={isPending || (!isSessionReady && !error)}
            className="w-full bg-white text-black font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl transition-all disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <span>Actualizar Credenciales</span>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/20" />
      </div>
    }>
      <UpdatePasswordForm />
    </Suspense>
  );
}
