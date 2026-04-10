"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Loader2, Compass } from "lucide-react";
import { login, getGoogleLoginUrl, setSession } from "@/actions/auth";
import { useState, useTransition, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      setExpired(true);
    }
  }, [searchParams]);

  useEffect(() => {
    async function checkUrlForToken() {
      try {
        const hash = window.location.hash;
        const query = new URLSearchParams(window.location.search);
        
        let accessToken = query.get("access_token");
        let refreshToken = query.get("refresh_token");

        if (!accessToken && hash) {
          const params = new URLSearchParams(hash.substring(1));
          accessToken = params.get("access_token");
          refreshToken = params.get("refresh_token");
        }

        if (accessToken) {
          setIsGooglePending(true);
          console.log("Found token on home page, setting session...");
          localStorage.setItem("session_token", accessToken);
          await setSession(accessToken, refreshToken || undefined);
          router.push("/dashboard");
        } else if (query.get("error")) {
          setError(query.get("error_description") || "Authentication failed");
        }
      } catch (err) {
        console.error("Token check error:", err);
      }
    }
    
    checkUrlForToken();
  }, [router]);

  async function handleGoogleLogin() {
    setIsGooglePending(true);
    setError(null);
    try {
      const result = await getGoogleLoginUrl();
      if (result.error) {
        setError(result.error);
        setIsGooglePending(false);
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError("Error al iniciar sesión con Google");
      setIsGooglePending(false);
    }
  }

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
      {/* Session Expired Alert */}
      <AnimatePresence>
        {expired && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 max-w-sm w-full text-center space-y-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Sesión Expirada</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">Tu sesión ha terminado por seguridad. Por favor, vuelve a ingresar.</p>
              </div>
              <button 
                onClick={() => {
                  setExpired(false);
                  router.replace("/");
                }}
                className="w-full bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            disabled={isPending || isGooglePending}
            className="w-full bg-white text-black font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl transition-all disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <span>Iniciar Sesión</span>
            )}
          </motion.button>
        </form>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-[8px] font-bold uppercase tracking-widest">
            <span className="bg-[#0a0a0a] px-4 text-zinc-600">O continuar con</span>
          </div>
        </div>

        <motion.button
          onClick={handleGoogleLogin}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          disabled={isPending || isGooglePending}
          className="w-full bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-[0.2em] py-5 rounded-2xl transition-all hover:bg-white/10 disabled:opacity-50 flex items-center justify-center space-x-3"
        >
          {isGooglePending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Google</span>
            </>
          )}
        </motion.button>

        <div className="flex flex-col items-center space-y-6 pt-4">
          <Link href="/recover" className="text-[10px] font-black text-zinc-500 hover:text-white transition-colors uppercase tracking-widest">
            ¿Olvidaste tu contraseña?
          </Link>
          
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

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white uppercase tracking-widest font-black">Loading Vector...</div>}>
      <LoginContent />
    </Suspense>
  );
}
