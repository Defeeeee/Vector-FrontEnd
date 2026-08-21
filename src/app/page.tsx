"use client";

import { motion } from "framer-motion";
import {
  Compass,
  Check,
  ArrowRight,
  Gauge,
  Target,
  MessageCircle,
  CloudSun,
  Menu,
  X,
  Plane,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import FeatureMock from "@/components/landing/FeatureMock";
import { useRouter } from "next/navigation";
import OlvidarAlSalir from "@/components/OlvidarAlSalir";

const navLinks = [
  { name: "Características", href: "#features" },
  { name: "Cómo funciona", href: "#workflow" },
];

const features = [
  {
    eyebrow: "Registro",
    title: "Cargá un vuelo antes de que arranque el motor de tu auto.",
    description:
      "Un formulario enfocado, sin campos de más. Aeronave, ruta y horas quedan guardados en segundos, incluso desde la cabecera de pista.",
    icon: Gauge,
  },
  {
    eyebrow: "PCA · Reg. 61.620",
    title: "Mirá tu progreso comercial sin sacar la cuenta a mano.",
    description:
      "Vector cruza cada vuelo contra los requisitos de tu licencia y te muestra, en tiempo real, cuánto te falta para cada casillero.",
    icon: Target,
  },
  {
    eyebrow: "Copiloto IA",
    title: "Registrá vuelos y hacé preguntas por WhatsApp.",
    description:
      "Mandá un audio después de aterrizar y Vector lo transcribe, lo carga y te devuelve un resumen para confirmar. Sin abrir la app.",
    icon: MessageCircle,
  },
  {
    eyebrow: "Meteorología",
    title: "METAR y TAF decodificados, no en código de la OACI.",
    description:
      "Consultá el clima de tu ruta en lenguaje claro, con alertas visuales de las condiciones que realmente afectan tu vuelo.",
    icon: CloudSun,
  },
];

const workflow = [
  { title: "Despegás", detail: "Registrás el vuelo por app, WhatsApp o nota de voz." },
  { title: "Vector decodifica", detail: "Calcula horas día, noche e IFR y actualiza tu progreso PCA." },
  { title: "Controlás el rumbo", detail: "Balances, packs de horas y vencimientos, en un solo panel." },
  { title: "Aterrizás con datos", detail: "Exportá tu bitácora oficial en PDF cuando la necesites." },
];

const highlights = [
  { t: "Día · Noche · IFR", d: "Cálculo automático por vuelo" },
  { t: "App · WhatsApp · Voz", d: "Tres formas de registrar" },
  { t: "Reg. 61.620", d: "Seguimiento PCA integrado" },
  { t: "PDF oficial", d: "Exportación cuando la necesites" },
];

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Detect if we landed here with auth tokens (common on mobile or direct redirects)
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);

    if (hash.includes("access_token") || searchParams.has("access_token") || searchParams.has("code")) {
      console.log("LandingPage: Auth tokens detected, redirecting to callback...");
      router.replace(`/auth/callback${window.location.search}${window.location.hash}`);
    }
  }, [router]);

  return (
    <div className="w-full flex flex-col min-h-screen bg-zinc-50 dark:bg-black overflow-hidden transition-colors duration-300 relative">
      {/* Si estás acá, no hay sesión: se borra del teléfono lo que era del
          piloto. Red de seguridad del borrado — ver `olvidar-datos.ts`. */}
      <OlvidarAlSalir />
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-aviation-blue/5 dark:bg-aviation-blue/[0.06] rounded-full blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "44px 44px" }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-4 md:top-6 w-full z-50 px-4">
        <div className="container-wide flex items-center justify-between h-16 px-4 md:px-6 rounded-2xl bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none transition-colors">
          <Link href="/" className="flex items-center space-x-2.5 text-zinc-900 dark:text-white group">
            <div className="w-9 h-9 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Vector</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <div className="h-4 w-px bg-zinc-200 dark:bg-white/10" />
            <div className="w-40 scale-90 origin-right"><ThemeToggle /></div>
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-900 dark:text-white hover:opacity-70 transition-opacity"
            >
              Ingresar
            </Link>
            <Link
              href="/register"
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-cal-highlight dark:shadow-none flex items-center gap-1.5"
            >
              Empezar
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="lg:hidden p-2 text-zinc-900 dark:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden mt-2 mx-4 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 flex flex-col space-y-4 shadow-cal dark:shadow-none"
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-zinc-900 dark:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <hr className="border-zinc-100 dark:border-white/10" />
            <div className="w-full"><ThemeToggle /></div>
            <Link href="/login" className="text-sm font-medium text-zinc-900 dark:text-white mt-2">
              Ingresar
            </Link>
            <Link
              href="/register"
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-center font-semibold text-sm py-3.5 rounded-xl shadow-lg"
            >
              Empezar
            </Link>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-40 md:pt-48 pb-20 relative z-10 px-4 md:px-0">
        <div className="container-wide grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 text-xs font-semibold text-zinc-500 dark:text-zinc-400 shadow-sm">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-aviation-blue animate-blip" />
              </span>
              Copiloto digital para pilotos exigentes
            </span>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-zinc-900 dark:text-white leading-[1.05] tracking-tight">
              Trazá tu rumbo.
              <br />
              <span className="text-aviation-blue-dark dark:text-aviation-cyan">Vector</span> lleva el registro.
            </h1>

            <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
              La bitácora digital que convierte cada vuelo, cada hora y cada trámite de licencia en datos claros
              — sin hojas de cálculo, sin fricción.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
              <Link
                href="/register"
                className="w-full sm:w-auto bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-4 rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-cal-highlight dark:shadow-none flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                Registrá tu primer vuelo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 px-8 py-4 rounded-2xl font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-white/[0.06] transition-colors flex items-center justify-center text-zinc-900 dark:text-white"
              >
                Ver cómo funciona
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-sm text-zinc-500 dark:text-zinc-400">
              <span>App · WhatsApp · Voz</span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span>Seguimiento PCA Reg. 61.620</span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span>Modo oscuro nativo</span>
            </div>
          </motion.div>

          {/* HUD Panel */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#111111] shadow-cal dark:shadow-none p-8 md:p-10 overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">Plan de vuelo</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-blip" /> En ruta
                </span>
              </div>

              {/* Flight path */}
              <svg viewBox="0 0 400 160" className="w-full h-auto text-zinc-200 dark:text-white/10">
                <path d="M20 130 Q 140 20, 200 80 T 380 40" fill="none" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M20 130 Q 140 20, 200 80 T 380 40"
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="2.5"
                  className="animate-dash-flow"
                />
                <defs>
                  <linearGradient id="routeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
                <circle cx="20" cy="130" r="5" fill="#2563eb" />
                <circle cx="200" cy="80" r="5" fill="#2563eb" />
                <circle cx="380" cy="40" r="6" fill="#38bdf8" />
              </svg>

              <div className="flex items-center justify-between mt-2">
                <div className="text-center">
                  <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-600">SAEZ</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-600">ENRUTA</div>
                </div>
                <div className="flex items-center gap-1.5 text-center">
                  <Plane className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
                  <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-600">SABE</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="p-5 bg-zinc-900 dark:bg-white/[0.04] border border-transparent dark:border-white/10 rounded-2xl">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Total PIC</div>
                  <div className="text-3xl data font-bold text-white tracking-tight mt-1">485.5</div>
                </div>
                <div className="p-5 bg-zinc-50 dark:bg-white/[0.03] border border-zinc-100 dark:border-white/10 rounded-2xl">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Nocturno</div>
                  <div className="text-3xl data font-bold text-zinc-900 dark:text-white tracking-tight mt-1">42.2</div>
                </div>
              </div>
            </div>

            {/* Floating mini card */}
            <motion.div
              className="hidden md:flex absolute -bottom-6 -left-8 items-center gap-3 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-2xl px-5 py-4 shadow-cal dark:shadow-none animate-float-slow"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center">
                <Target className="w-4.5 h-4.5 text-zinc-900 dark:text-white" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">PCA 61.620</div>
                <div className="text-sm font-bold text-zinc-900 dark:text-white">78% completo</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding relative z-10">
        <div className="container-wide">
          <div className="max-w-2xl mb-16 md:mb-20">
            <span className="eyebrow">Características</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-zinc-900 dark:text-white mt-3 tracking-tight leading-tight">
              Herramientas de precisión para tu día a día en el aire.
            </h2>
          </div>

          <div className="space-y-20 md:space-y-28">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              const reversed = i % 2 === 1;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                  className={`grid md:grid-cols-2 gap-10 md:gap-16 items-center ${reversed ? "md:[direction:rtl]" : ""}`}
                >
                  <div className={reversed ? "md:[direction:ltr]" : ""}>
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white/[0.06] flex items-center justify-center mb-6">
                      <Icon className="w-5 h-5 text-white dark:text-white" />
                    </div>
                    <span className="eyebrow">{feature.eyebrow}</span>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-zinc-900 dark:text-white mt-3 mb-4 tracking-tight leading-snug">
                      {feature.title}
                    </h3>
                    <p className="text-base md:text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <div className={reversed ? "md:[direction:ltr]" : ""}>
                    {/* Was a blurred blob behind an outsized copy of the section
                        icon — decoration standing in for the product. Showing the
                        actual screen is what makes the claim above it credible. */}
                    <div className="aspect-[4/3] rounded-[2rem] border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none overflow-hidden">
                      <FeatureMock index={i} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow / Route Timeline */}
      <section id="workflow" className="section-padding relative z-10 border-t border-zinc-200 dark:border-white/10">
        <div className="container-wide">
          <div className="max-w-2xl mb-16 md:mb-20">
            <span className="eyebrow">Cómo funciona</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-zinc-900 dark:text-white mt-3 tracking-tight leading-tight">
              De la cabecera de pista a tu bitácora, en cuatro pasos.
            </h2>
          </div>

          <div className="relative grid md:grid-cols-4 gap-10 md:gap-6">
            <div className="hidden md:block absolute top-6 left-[12.5%] right-[12.5%] h-px border-t-2 border-dashed border-zinc-200 dark:border-white/15" />
            {workflow.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center data font-bold relative z-10 shadow-lg">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-white mt-5 mb-2 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {step.detail}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights band */}
      <section className="relative z-10">
        <div className="container-wide">
          <div className="bg-zinc-900 dark:bg-white/[0.03] dark:border dark:border-white/10 rounded-[2.5rem] py-16 px-8 md:px-16 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-aviation-blue/10 rounded-full blur-[100px]" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
              {highlights.map((s) => (
                <div key={s.t}>
                  <div className="text-xl md:text-2xl font-display font-bold text-white dark:text-white tracking-tight">{s.t}</div>
                  <div className="text-sm text-white/40 dark:text-white/40 mt-1">{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* T3.4 — Dedicated Copilot IA Showcase Section */}
      <section className="section-padding relative z-10 bg-zinc-950 text-white dark:bg-[#0a0a0d] border-y border-zinc-800 dark:border-white/10 overflow-hidden my-16">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-aviation-blue/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="container-wide relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-aviation-cyan">
                <MessageCircle className="w-3.5 h-3.5" />
                Copiloto Conversacional IA
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white tracking-tight leading-tight">
                Dictale a tu copiloto por WhatsApp.
              </h2>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Mandá una nota de voz al bajar del avión. El copiloto entiende lenguaje aeronáutico en español, extrae matrículas, tiempos y aterrizajes, y los asienta en tu bitácora automáticamente.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-aviation-cyan">Voz a Texto</div>
                  <p className="text-xs text-zinc-400 mt-1">Transcripción de audios de cabina en segundos.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-aviation-cyan">Reg. 61.620</div>
                  <p className="text-xs text-zinc-400 mt-1">Consultas en lenguaje natural de tus horas faltantes.</p>
                </div>
              </div>
            </div>

            {/* Interactive WhatsApp Chat Mockup */}
            <div className="rounded-[2.5rem] border border-white/15 bg-zinc-900/90 backdrop-blur-xl p-6 md:p-8 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                    VA
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Vector Copiloto</h4>
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-blip" /> En línea por WhatsApp
                    </p>
                  </div>
                </div>
              </div>

              {/* Pilot message */}
              <div className="flex flex-col items-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-emerald-700/40 border border-emerald-500/30 px-4 py-3 text-xs text-zinc-100 space-y-1">
                  <p className="italic">🎙️ "Aterricé en Morón en el LV-S001. 1.2 hs de vuelo local con 2 aterrizajes."</p>
                  <span className="block text-[9px] text-emerald-300/60 text-right">18:42</span>
                </div>
              </div>

              {/* AI Copilot response */}
              <div className="flex flex-col items-start">
                <div className="max-w-[88%] rounded-2xl rounded-tl-none bg-white/[0.07] border border-white/10 px-4 py-3 text-xs text-zinc-200 space-y-2">
                  <p className="font-semibold text-white">✅ ¡Entendido Comandante!</p>
                  <p className="text-[11px] leading-relaxed text-zinc-300">
                    Registrado en tu libro por defecto: <br />
                    • <strong>Ruta:</strong> SADM (Morón) · Local <br />
                    • <strong>Aeronave:</strong> LV-S001 <br />
                    • <strong>PIC Día Local:</strong> 1.2 hs <br />
                    • <strong>Aterrizajes:</strong> 2
                  </p>
                  <div className="pt-2 border-t border-white/10 text-[10px] font-mono text-aviation-cyan">
                    📊 Horas acumuladas: 486.7 hs · PCA 61.620 al 79%
                  </div>
                  <span className="block text-[9px] text-zinc-500 text-right">18:42</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature checklist */}
      <section className="section-padding relative z-10">
        <div className="container-wide grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-3">
            {[
              "Estadísticas automáticas de horas de vuelo (Día, Noche, IFR)",
              "Carga unificada de información detallada de la aeronave",
              "Copiloto de IA por WhatsApp con transcripción de notas de voz",
              "Clima METAR/TAF decodificado e interactivo en tiempo real",
              "Monitoreo de vencimientos médicos y licencias",
              "Control financiero integrado de depósitos y alquileres",
            ].map((item) => (
              <div key={item} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white dark:hover:bg-white/[0.03] transition-colors">
                <div className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </div>
                <span className="text-base text-zinc-900 dark:text-white/80 font-medium">{item}</span>
              </div>
            ))}
          </div>
          <div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-zinc-900 dark:text-white tracking-tight leading-tight mb-6">
              Tu carrera aeronáutica, siempre a la vista.
            </h2>
            <p className="text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Modo oscuro nativo para planeamientos nocturnos, exportación a PDF cuando lo necesitás, y un solo
              lugar donde vive todo lo que hoy repartís entre planillas, WhatsApp y notas sueltas.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding relative z-10 pb-32 md:pb-40">
        <div className="container-wide">
          <div className="rounded-[2.5rem] p-8 md:p-24 text-center relative overflow-hidden border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#111111] shadow-cal dark:shadow-none">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-aviation-blue/10 rounded-full blur-[100px] pointer-events-none" />
            <h2 className="text-4xl md:text-6xl font-display font-bold text-zinc-900 dark:text-white tracking-tight relative z-10">
              ¿Listo para despegar?
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-base md:text-xl max-w-xl mx-auto mt-5 relative z-10">
              Sumate a los pilotos que ya dejaron las planillas en tierra.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 relative z-10">
              <Link
                href="/register"
                className="w-full sm:w-auto bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-10 py-4 rounded-2xl font-semibold text-sm shadow-cal-highlight dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Crear tu cuenta
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto text-zinc-900 dark:text-white px-10 py-4 rounded-2xl font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors border border-zinc-200 dark:border-white/15"
              >
                Ingresar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-200 dark:border-white/10 relative z-10">
        <div className="container-wide">
          {/* Columns, as FlightDeck does. Every destination here is a route or an
              anchor that actually exists — a footer full of dead links is worse
              than a short one. The legal links below are the exception and are
              left untouched on purpose: they already pointed nowhere, and
              removing a privacy link is not a call to make from a refactor.
              See T3.6 in docs/brief/06-plan-post-flightdeck.md. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex items-center space-x-2.5 text-zinc-900 dark:text-white">
                <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-lg flex items-center justify-center shadow-lg">
                  <Compass className="w-5 h-5 text-white dark:text-zinc-900" />
                </div>
                <span className="font-display font-bold text-xl tracking-tight">Vector</span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs">
                Bitácora digital para pilotos argentinos. Formato ANAC, desglose de
                horas y vencimientos en un solo lugar.
              </p>
            </div>

            <div className="space-y-3">
              <p className="eyebrow">Producto</p>
              <ul className="space-y-2.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                <li><Link href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Características</Link></li>
                <li><Link href="#workflow" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Cómo funciona</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="eyebrow">Cuenta</p>
              <ul className="space-y-2.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                <li><Link href="/login" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Ingresar</Link></li>
                <li><Link href="/register" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Crear cuenta</Link></li>
                <li><Link href="/recover" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Recuperar contraseña</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="eyebrow">Legal</p>
              <ul className="space-y-2.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                <li><Link href="/legal/privacidad" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Privacidad</Link></li>
                <li><Link href="/legal/terminos" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Términos</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-zinc-200 dark:border-white/10">
            <p className="text-sm text-zinc-400 dark:text-zinc-600">
              &copy; 2026 Vector Aviation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
