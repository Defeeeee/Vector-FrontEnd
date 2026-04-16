"use client";

import { motion } from "framer-motion";
import { Compass, Check, ArrowRight, Layout, TrendingUp, Award, Clock, Database, Target, MapPin, X, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinks = [
  { name: "Características", href: "#features" },
  { name: "Flujo de Trabajo", href: "#workflow" },
];

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="w-full flex flex-col min-h-screen bg-zinc-50 dark:bg-black overflow-hidden transition-colors duration-300">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-white/10 transition-colors duration-300">
        <div className="container-wide flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2 text-zinc-900 dark:text-white group">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <span className="font-space-grotesk font-bold text-xl tracking-tighter uppercase">Vector</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-widest"
              >
                {link.name}
              </Link>
            ))}
            <div className="h-4 w-px bg-zinc-200 dark:bg-white/10" />
            <div className="w-40 scale-90 origin-right"><ThemeToggle /></div>
            <Link
              href="/login"
              className="text-sm font-bold text-zinc-900 dark:text-white hover:opacity-70 transition-opacity uppercase tracking-widest"
            >
              Ingresar
            </Link>
            <Link
              href="/register"
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] uppercase tracking-[0.2em] font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-cal-highlight dark:shadow-none"
            >
              Empezar
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-zinc-900 dark:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-16 left-0 w-full bg-white dark:bg-[#111111] border-b border-zinc-200 dark:border-white/10 p-6 flex flex-col space-y-4 shadow-cal dark:shadow-none"
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <hr className="border-zinc-100 dark:border-white/10" />
            <div className="w-full"><ThemeToggle /></div>
            <Link href="/login" className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest mt-4">
              Ingresar
            </Link>
            <Link
              href="/register"
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-center font-bold text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg"
            >
              Empezar
            </Link>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 md:pt-56 pb-20 relative z-10 px-4 md:px-0">
        <div className="container-wide flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6 md:space-y-8 max-w-5xl"
          >
            <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 shadow-sm transition-colors">
              <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />
              <span>Bitácora de Grado Aeronáutico</span>
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-9xl font-space-grotesk font-bold text-zinc-900 dark:text-white leading-[1.0] md:leading-[0.95] tracking-tighter uppercase transition-colors">
              Registros precisos. <br className="hidden md:block" /> Cero fricción.
            </h1>
            <p className="text-base md:text-xl lg:text-2xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed transition-colors px-4 md:px-0">
              Vector es un logbook digital monocromático de alto contraste, diseñado para pilotos que exigen datos limpios y herramientas confiables.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/register"
                className="w-full sm:w-auto bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 md:px-10 py-4 md:py-5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity shadow-cal-highlight dark:shadow-none flex items-center justify-center space-x-3 hover:scale-105 active:scale-95"
              >
                <span>Registra tu primer vuelo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 px-8 md:px-10 py-4 md:py-5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors flex items-center justify-center text-zinc-900 dark:text-white shadow-sm dark:shadow-none"
              >
                Ver características
              </Link>
            </div>
          </motion.div>

          {/* Interface Mockup - Bento Box Style */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="mt-16 md:mt-24 w-full max-w-6xl rounded-[2rem] md:rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none bg-white dark:bg-[#111111] p-2 md:p-4 overflow-hidden relative transition-colors"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full md:w-[800px] h-[400px] bg-zinc-100 dark:bg-white/5 rounded-full blur-[100px] opacity-50 pointer-events-none transition-colors" />
            <div className="w-full bg-zinc-50 dark:bg-black rounded-2xl md:rounded-[2rem] border border-zinc-200 dark:border-white/10 overflow-hidden shadow-inner flex flex-col relative z-10 transition-colors">
                {/* Mock Header */}
                <div className="h-10 md:h-12 bg-white dark:bg-[#111111] border-b border-zinc-200 dark:border-white/10 flex items-center px-4 md:px-6 space-x-2 transition-colors">
                    <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 transition-colors" />
                    <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 transition-colors" />
                    <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 transition-colors" />
                </div>
                {/* Mock Content */}
                <div className="flex flex-col md:flex-row p-4 md:p-6 gap-4 md:gap-6 h-auto md:h-[600px]">
                    {/* Mock Sidebar */}
                    <div className="hidden md:flex w-64 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2rem] flex-col p-6 space-y-8 shadow-sm dark:shadow-none transition-colors">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-xl transition-colors" />
                            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded transition-colors" />
                        </div>
                        <div className="space-y-4">
                            <div className="h-12 w-full bg-zinc-100 dark:bg-white/5 rounded-xl transition-colors" />
                            <div className="h-12 w-full bg-zinc-50 dark:bg-white/[0.02] rounded-xl transition-colors" />
                            <div className="h-12 w-full bg-zinc-50 dark:bg-white/[0.02] rounded-xl transition-colors" />
                        </div>
                    </div>
                    {/* Mock Main Area (Bento Grid) */}
                    <div className="flex-1 flex flex-col gap-4 md:gap-6">
                        {/* Header Area */}
                        <div className="flex items-center justify-between">
                            <div className="h-8 md:h-10 w-32 md:w-48 bg-zinc-200 dark:bg-zinc-800 rounded-xl transition-colors" />
                            <div className="hidden md:block h-10 w-32 bg-zinc-900 dark:bg-white rounded-xl transition-colors" />
                        </div>
                        {/* Bento Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 flex-1">
                            <div className="md:col-span-2 h-40 md:h-auto bg-zinc-900 dark:bg-[#111111] rounded-2xl md:rounded-[2rem] p-6 md:p-8 flex flex-col justify-between shadow-lg relative overflow-hidden group border border-transparent dark:border-white/10 transition-colors">
                                <div className="w-10 md:w-12 h-10 md:h-12 bg-white/10 dark:bg-white/5 rounded-xl flex items-center justify-center transition-colors"><Award className="w-5 md:w-6 h-5 md:h-6 text-white" /></div>
                                <div className="space-y-2">
                                    <div className="h-3 md:h-4 w-24 md:w-32 bg-white/20 dark:bg-white/10 rounded transition-colors" />
                                    <div className="h-12 md:h-16 w-32 md:w-48 bg-white rounded-xl transition-colors" />
                                </div>
                            </div>
                            <div className="hidden md:flex bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2rem] p-8 flex-col justify-between shadow-sm dark:shadow-none transition-colors">
                                <div className="w-12 h-12 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-transparent rounded-xl flex items-center justify-center transition-colors"><TrendingUp className="w-6 h-6 text-zinc-900 dark:text-white" /></div>
                                <div className="h-12 w-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl transition-colors" />
                            </div>
                            <div className="md:col-span-3 h-48 md:h-auto bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-2xl md:rounded-[2rem] p-6 md:p-8 flex flex-col space-y-4 shadow-sm dark:shadow-none transition-colors">
                                <div className="h-4 md:h-6 w-24 md:w-32 bg-zinc-200 dark:bg-zinc-800 rounded transition-colors" />
                                <div className="space-y-2 md:space-y-3">
                                    <div className="h-10 md:h-12 w-full bg-zinc-50 dark:bg-white/5 rounded-xl transition-colors" />
                                    <div className="h-10 md:h-12 w-full bg-zinc-50 dark:bg-white/5 rounded-xl transition-colors" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding bg-zinc-50 dark:bg-black relative z-10 transition-colors duration-300">
        <div className="container-wide">
          <div className="max-w-3xl mb-12 md:mb-16">
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold text-zinc-900 dark:text-white mb-4 md:mb-6 tracking-tighter uppercase transition-colors">
              Herramientas de Precisión.
            </h2>
            <p className="text-base md:text-xl text-zinc-500 dark:text-zinc-400 font-medium transition-colors">
              Reimaginamos la bitácora de vuelo digital para ser rápida, clara y focalizada en lo que importa: tus datos, sin distracciones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { t: "Registro Rápido", d: "Diseñado para entornos de alta tensión. Interfaces enfocadas tipo Bento que minimizan el tiempo de carga de datos.", i: <Layout className="w-6 h-6" /> },
              { t: "Seguimiento PCA", d: "Visualiza automáticamente tu progreso hacia los requisitos comerciales (Reg. 61.620) con gráficos de avance claros.", i: <Target className="w-6 h-6" /> },
              { t: "Gestión de Packs", d: "Controla horas prepagadas en aeronaves o simuladores. Alertas visuales cuando el paquete está por agotarse.", i: <Database className="w-6 h-6" /> }
            ].map((feature, i) => (
              <motion.div
                key={feature.t}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 shadow-sm hover:shadow-cal dark:shadow-none dark:hover:bg-[#151515] transition-all space-y-4 md:space-y-6 group"
              >
                <div className="w-12 md:w-14 h-12 md:h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                  {feature.i}
                </div>
                <h3 className="text-xl md:text-2xl font-space-grotesk font-bold text-zinc-900 dark:text-white tracking-tight uppercase">{feature.t}</h3>
                <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-bold leading-relaxed">
                  {feature.d}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits List */}
      <section id="workflow" className="section-padding bg-white dark:bg-black border-t border-zinc-200 dark:border-white/10 relative z-10 transition-colors duration-300">
        <div className="container-wide flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
          <div className="flex-1 space-y-6 md:space-y-8">
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold text-zinc-900 dark:text-white tracking-tighter uppercase leading-[1.1] transition-colors">
              Tu carrera aeronáutica bajo control.
            </h2>
            <div className="space-y-4">
              {[
                "Estadísticas automáticas de horas de vuelo (Día, Noche, IFR)",
                "Carga unificada de información detallada de la aeronave",
                "Monitoreo de vencimientos médicos y licencias",
                "Interfaz Modo Oscuro nativa para planeamientos nocturnos"
              ].map((item) => (
                <div key={item} className="flex items-start md:items-center space-x-3 md:space-x-4">
                  <div className="w-5 md:w-6 h-5 md:h-6 mt-0.5 md:mt-0 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/20 flex items-center justify-center flex-shrink-0 shadow-sm transition-colors">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </div>
                  <span className="text-sm md:text-base text-zinc-900 dark:text-zinc-300 font-bold transition-colors">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 w-full max-w-lg aspect-square bg-zinc-50 dark:bg-[#111111] rounded-3xl md:rounded-[3rem] border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none p-4 md:p-8 relative overflow-hidden flex items-center justify-center transition-colors mt-8 lg:mt-0">
             <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-zinc-200/50 dark:bg-white/5 blur-3xl -mr-24 md:-mr-32 -mt-24 md:-mt-32 rounded-full transition-colors" />
             <div className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-white/10 rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 shadow-sm space-y-6 md:space-y-8 relative z-10 transition-colors">
                <div className="flex items-baseline space-x-2">
                    <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Total PIC</div>
                    <div className="text-4xl md:text-6xl font-space-grotesk font-bold text-zinc-900 dark:text-white tracking-tighter">485.5</div>
                </div>
                <div className="h-3 md:h-4 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden transition-colors">
                    <div className="h-full w-2/3 bg-zinc-900 dark:bg-white transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                     <div className="p-4 md:p-5 bg-zinc-50 dark:bg-white/[0.03] border border-zinc-100 dark:border-white/5 rounded-xl md:rounded-2xl space-y-1 md:space-y-2 transition-colors">
                        <div className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Nocturno</div>
                        <div className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white tracking-tighter">42.2</div>
                     </div>
                     <div className="p-4 md:p-5 bg-zinc-50 dark:bg-white/[0.03] border border-zinc-100 dark:border-white/5 rounded-xl md:rounded-2xl space-y-1 md:space-y-2 transition-colors">
                        <div className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Inst</div>
                        <div className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white tracking-tighter">80.0</div>
                     </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-zinc-50 dark:bg-black border-t border-zinc-200 dark:border-white/10 relative z-10 pb-32 md:pb-40 transition-colors duration-300">
        <div className="container-wide">
          <div className="bg-zinc-900 dark:bg-white rounded-3xl md:rounded-[3.5rem] p-8 md:p-32 text-center space-y-8 md:space-y-10 relative overflow-hidden shadow-2xl transition-colors">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent)] dark:bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.05),transparent)] pointer-events-none transition-colors" />
            <h2 className="text-4xl md:text-7xl font-space-grotesk font-bold text-white dark:text-zinc-900 tracking-tighter uppercase relative z-10 transition-colors">
              ¿Listo para empezar?
            </h2>
            <p className="text-zinc-400 dark:text-zinc-600 text-sm md:text-xl max-w-xl mx-auto font-bold relative z-10 transition-colors">
              Únete a miles de pilotos profesionales que ya han modernizado su bitácora.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 pt-4 relative z-10">
              <Link
                href="/register"
                className="w-full sm:w-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-cal-highlight dark:shadow-none hover:scale-105 active:scale-95 transition-all"
              >
                Crear tu cuenta
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto text-white dark:text-zinc-900 px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 dark:hover:bg-black/5 transition-colors border border-white/20 dark:border-black/10"
              >
                Ingresar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-200 dark:border-white/10 bg-white dark:bg-[#111111] relative z-10 transition-colors duration-300">
        <div className="container-wide">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center space-x-2 text-zinc-900 dark:text-white">
              <div className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg flex items-center justify-center shadow-lg transition-colors">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-space-grotesk font-bold text-xl tracking-tighter uppercase">Vector</span>
            </div>
            <div className="flex space-x-8 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
              <Link href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Twitter</Link>
              <Link href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">GitHub</Link>
              <Link href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Privacidad</Link>
              <Link href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Términos</Link>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 font-bold">
              &copy; 2026 Vector Aviation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}