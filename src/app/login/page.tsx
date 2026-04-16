"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Loader2, Compass, ChevronLeft } from "lucide-react";
import { login, getGoogleLoginUrl, setSession } from "@/actions/auth";
import { useState, useTransition, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    <div className="flex min-h-screen w-full bg-zinc-50 dark:bg-black relative overflow-hidden transition-colors duration-300">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full border border-zinc-200 dark:border-white/5 opacity-[0.4] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full border border-zinc-200 dark:border-white/5 opacity-[0.4] -ml-32 -mb-32 pointer-events-none" />

      {/* Minimal Top Bar */}
      <div className="absolute top-6 left-0 w-full px-6 flex justify-between items-center z-20">
        <Link href="/" className="p-3 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-full shadow-sm hover:bg-zinc-50 dark:hover:bg-white/5 transition-all group">
            <ChevronLeft className="w-5 h-5 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white" />
        </Link>
        <div className="w-40 scale-90 origin-right"><ThemeToggle /></div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto px-4 md:px-6 py-12 md:py-20 relative z-10">
        {/* Session Expired Alert */}
        <AnimatePresence>
            {expired && (
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-900/40 backdrop-blur-sm"
            >
                <motion.div 
                className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] p-10 max-w-sm w-full text-center space-y-8 shadow-2xl"
                >
                <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight font-space-grotesk uppercase">Sesión Expirada</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-relaxed font-bold">Tu sesión ha terminado por seguridad. Por favor, vuelve a ingresar.</p>
                </div>
                <button 
                    onClick={() => {
                    setExpired(false);
                    router.replace("/login");
                    }}
                    className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-lg transition-all active:scale-95 hover:opacity-90"
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
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center space-y-4 mb-8 md:mb-10 text-center"
        >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-lg">
                <Compass className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-zinc-900 dark:text-white font-space-grotesk uppercase">Bienvenido</h1>
                <p className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-[0.2em]">Accede a tu logbook</p>
            </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-full p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none bg-white dark:bg-[#111111] space-y-8 md:space-y-10 transition-all hover:shadow-lg dark:hover:bg-[#151515]"
        >
            <form action={handleSubmit} className="space-y-4 md:space-y-6">
                {error && (
                    <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-4 text-red-600 dark:text-red-500 text-xs font-bold text-center uppercase tracking-wider shadow-sm"
                    >
                    {error}
                    </motion.div>
                )}

                <div className="space-y-4">
                    <div className="space-y-2 text-left group">
                        <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                            <input 
                                name="email"
                                type="email" 
                                placeholder="name@airline.com" 
                                required
                                className="w-full bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white/50 transition-all text-sm font-bold tracking-wide placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2 text-left group">
                        <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                            <input 
                                name="password"
                                type="password" 
                                placeholder="••••••••" 
                                required
                                className="w-full bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white/50 transition-all text-sm font-bold tracking-wide placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isPending || isGooglePending}
                    className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-cal-highlight dark:shadow-none transition-all disabled:opacity-50 mt-2"
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
                    <div className="w-full border-t border-zinc-200 dark:border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-[8px] font-bold uppercase tracking-[0.3em]">
                    <span className="bg-white dark:bg-[#111111] px-4 text-zinc-400 dark:text-zinc-500 transition-colors">O continuar con</span>
                </div>
            </div>

            <motion.button
                onClick={handleGoogleLogin}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isPending || isGooglePending}
                className="w-full bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white font-bold text-xs uppercase tracking-[0.2em] py-5 rounded-2xl transition-all hover:bg-zinc-50 dark:hover:bg-white/[0.04] disabled:opacity-50 flex items-center justify-center space-x-3 shadow-sm dark:shadow-none"
            >
                {isGooglePending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Google</span>
                    </>
                )}
            </motion.button>

            <div className="flex flex-col items-center space-y-6 pt-6 border-t border-zinc-200 dark:border-white/10 transition-colors">
                <Link href="/recover" className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-widest">
                    ¿Olvidaste tu contraseña?
                </Link>
                
                <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-zinc-500 dark:text-zinc-400">¿Nuevo en Vector?</span>
                    <Link href="/register" className="text-zinc-900 dark:text-white hover:opacity-70 transition-opacity border-b border-zinc-200 dark:border-white/20 pb-0.5">
                        Crear Cuenta
                    </Link>
                </div>
            </div>
        </motion.div>

        {/* Version Tag */}
        <div className="mt-12 text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.5em]">
            Vector Aviation v2.0.1
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-zinc-900 dark:text-white font-space-grotesk font-bold uppercase tracking-widest animate-pulse bg-zinc-50 dark:bg-black">Cargando Vector...</div>}>
      <LoginContent />
    </Suspense>
  );
}