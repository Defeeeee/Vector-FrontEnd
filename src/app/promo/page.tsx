"use client";

import { useState, useEffect } from "react";
import { Compass, Bot, User, ArrowLeft, Printer, TrendingUp, Award } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ChatSimMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_SIMULATIONS: Record<"hours" | "cma" | "route" | "goal", ChatSimMessage[]> = {
  hours: [
    { role: "user", content: "¿Cuántas horas volé en total?" },
    { role: "assistant", content: "Analizando tu bitácora... 📊 Tenés un total de **485.5 horas de vuelo**, distribuidas principalmente en tu aeronave principal LV-XYZ (320.0h) y LV-ABC (165.5h)." }
  ],
  cma: [
    { role: "user", content: "¿Cuándo vence mi CMA?" },
    { role: "assistant", content: "Revisando tus datos de perfil... ⏳ Tu Certificado Médico Aeronáutico (CMA) Clase 1 vence el **15 de Noviembre de 2026**. Estás en tiempo para realizar tu renovación." }
  ],
  route: [
    { role: "user", content: "¿Cuál es mi ruta más frecuente?" },
    { role: "assistant", content: "Analizando tus rutas... 🛩️ Tu ruta más frecuente es **SADP - SABE** (San Fernando a Aeroparque), registrada un total de 42 veces este año." }
  ],
  goal: [
    { role: "user", content: "¿Llego a las 500 horas este mes?" },
    { role: "assistant", content: "¡Sí, vas por buen camino! 🎯 Te faltan solo **14.5 horas** para alcanzar las 500h totales. Al ritmo de tu último mes (24.0h), lo lograrías en aproximadamente 12 días." }
  ]
};

export default function PromoFlyerPage() {
  const [activeSim, setActiveSim] = useState<keyof typeof CHAT_SIMULATIONS>("hours");
  const [messages, setMessages] = useState<ChatSimMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Run simulation
    setMessages([]);
    setIsTyping(true);
    const sim = CHAT_SIMULATIONS[activeSim];
    
    // First message (User)
    const t1 = setTimeout(() => {
      setMessages([sim[0]]);
      
      // Typing state for Assistant
      const t2 = setTimeout(() => {
        setIsTyping(true);
        
        // Second message (Assistant)
        const t3 = setTimeout(() => {
          setMessages(prev => [...prev, sim[1]]);
          setIsTyping(false);
        }, 1500);
        
        return () => clearTimeout(t3);
      }, 800);
      
      return () => clearTimeout(t2);
    }, 400);

    return () => clearTimeout(t1);
  }, [activeSim]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white transition-colors duration-300 flex flex-col items-center p-4 md:p-8 print:p-0 print:bg-white print:text-black">
      {/* Subtle background glow - App Vibe */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-zinc-200/50 dark:bg-white/5 rounded-full blur-[120px] opacity-60 pointer-events-none print:hidden" />

      {/* Header Bar - Hidden when printing */}
      <header className="w-full max-w-5xl flex items-center justify-between mb-8 pb-4 border-b border-zinc-200 dark:border-white/10 relative z-20 print:hidden">
        <Link href="/" className="flex items-center space-x-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al inicio</span>
        </Link>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </header>

      {/* FLYER CONTAINER */}
      <div className="w-full max-w-[900px] bg-white dark:bg-[#0c0c0c] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] p-6 md:p-12 shadow-cal dark:shadow-none relative overflow-hidden transition-colors flex flex-col justify-between print:border-0 print:shadow-none print:p-0 print:bg-white print:text-black" style={{ minHeight: "1150px" }}>
        
        {/* Top Branding */}
        <div className="flex items-center justify-between w-full mb-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-md print:bg-black print:text-white">
              <Compass className="w-5.5 h-5.5" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-bold font-space-grotesk tracking-tighter uppercase">Vector</span>
              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] mt-1 print:text-zinc-600">Flight Logbook</span>
            </div>
          </div>

          <div className="px-4 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-white/[0.02] print:border-black print:text-black">
            Lanzamiento 2026
          </div>
        </div>

        {/* Catchy Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-space-grotesk font-bold tracking-tighter uppercase leading-[1.0] text-zinc-900 dark:text-white print:text-black">
            Tu bitácora ahora es inteligente.
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base font-medium mt-4 max-w-xl mx-auto print:text-zinc-700">
            Presentamos el nuevo **Copiloto IA**. Un asistente integrado con toda tu experiencia de vuelo, estadísticas y habilitaciones bajo lenguaje natural.
          </p>
        </div>

        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-10 flex-1 items-stretch">
          
          {/* Left Side Bento Column */}
          <div className="md:col-span-4 flex flex-col justify-between gap-6">
            
            {/* Simulation Triggers / Stats Preview */}
            <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl p-6 flex-1 flex flex-col justify-between transition-colors shadow-sm dark:shadow-none print:bg-zinc-50 print:border-zinc-200">
              <div>
                <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Preguntas de Prueba</p>
                <div className="space-y-2.5 print:hidden">
                  {(Object.keys(CHAT_SIMULATIONS) as Array<keyof typeof CHAT_SIMULATIONS>).map((key) => {
                    const label = CHAT_SIMULATIONS[key][0].content;
                    const isActive = activeSim === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveSim(key)}
                        className={`w-full text-left text-xs font-bold px-4 py-3 rounded-xl border transition-all active:scale-[0.98] ${
                          isActive
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                            : "bg-white dark:bg-black/40 hover:bg-zinc-100 dark:hover:bg-white/[0.04] text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-white/10"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Printable static list of prompts */}
                <div className="hidden print:block space-y-2">
                  {(Object.keys(CHAT_SIMULATIONS) as Array<keyof typeof CHAT_SIMULATIONS>).map((key) => (
                    <div key={key} className="text-xs font-bold text-zinc-800 border-b border-zinc-200 py-1.5">
                      • {CHAT_SIMULATIONS[key][0].content}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-200 dark:border-white/10 mt-6 print:border-zinc-200">
                <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Conectado a</p>
                <div className="flex items-center space-x-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 print:text-black">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Bitácora en Tiempo Real</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Widget */}
            <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl p-6 transition-colors shadow-sm dark:shadow-none print:bg-zinc-50 print:border-zinc-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-white/10 flex items-center justify-center text-zinc-800 dark:text-white print:bg-zinc-200">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Progreso Anual</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold font-space-grotesk tracking-tighter">485.5</span>
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">/ 500 Horas</span>
                </div>
                <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full w-[97%] bg-zinc-900 dark:bg-white print:bg-black" />
                </div>
              </div>
            </div>

          </div>

          {/* Center Bento Column - AI Chat Mockup */}
          <div className="md:col-span-5 flex flex-col">
            <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl p-4 md:p-6 flex-1 flex flex-col justify-between relative transition-colors shadow-sm dark:shadow-none print:bg-zinc-50 print:border-zinc-200">
              
              {/* Device Notch Header */}
              <div className="h-10 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between px-2 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center print:bg-black print:text-white">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold font-space-grotesk">Copiloto IA</span>
                </div>
                <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">En Línea</span>
              </div>

              {/* Chat Body Mock */}
              <div className="flex-1 space-y-4 min-h-[300px] flex flex-col justify-end pb-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                      msg.role === "user" 
                        ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-900 print:bg-black print:text-white" 
                        : "bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 print:bg-zinc-300 print:text-black"
                    }`}>
                      {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed font-medium ${
                      msg.role === "user"
                        ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-900 rounded-tr-sm"
                        : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-100 rounded-tl-sm border border-zinc-200/50 dark:border-white/5 print:bg-white print:border-zinc-300 print:text-black"
                    }`}>
                      {msg.content.includes("**") ? (
                        <p>
                          {msg.content.split("**").map((text, idx) => (
                            idx % 2 === 1 ? <strong key={idx} className="font-bold">{text}</strong> : text
                          ))}
                        </p>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-white/10 flex items-center justify-center text-zinc-400">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/50 dark:border-white/5 rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1.5 print:bg-white print:border-zinc-300">
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Mock */}
              <div className="border-t border-zinc-200 dark:border-white/10 pt-4">
                <div className="bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 flex items-center justify-between print:border-zinc-300">
                  <span className="text-zinc-400 dark:text-zinc-600 text-[10px] font-bold">Preguntá sobre tus horas...</span>
                  <div className="w-6 h-6 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center print:bg-black print:text-white">
                    <span className="text-[10px]">↑</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Side Bento Column - QR & Quick Info */}
          <div className="md:col-span-3 flex flex-col justify-between gap-6">
            
            {/* QR Code Card */}
            <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl p-6 flex-1 flex flex-col justify-between items-center text-center transition-colors shadow-md print:bg-white print:text-black print:border print:border-zinc-200">
              <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest print:text-zinc-600">Escaneá para probar</p>
              
              {/* QR Image */}
              <div className="bg-white p-3 rounded-2xl my-4 shadow-sm border border-zinc-200 flex items-center justify-center">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://vector.fdiaznem.com.ar"
                  alt="QR a Vector"
                  className="w-32 h-32"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider">vector.fdiaznem.com.ar</p>
                <p className="text-[9px] text-zinc-500 dark:text-zinc-400 print:text-zinc-600">Probá la IA en vivo desde tu cuenta</p>
              </div>
            </div>

            {/* Quick Security Badge */}
            <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl p-6 transition-colors shadow-sm dark:shadow-none print:bg-zinc-50 print:border-zinc-200">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-white/10 flex items-center justify-center text-zinc-800 dark:text-white print:bg-zinc-200">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Seguro y Privado</span>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium print:text-zinc-700">
                Tus datos de vuelo nunca se almacenan ni se utilizan para entrenar modelos. Procesamiento en tiempo real con encriptación.
              </p>
            </div>

          </div>

        </div>

        {/* Footer Brand Info */}
        <div className="border-t border-zinc-200 dark:border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-widest gap-4 print:border-zinc-300 print:text-zinc-600">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4" />
            <span>VECTOR LOGBOOK</span>
          </div>
          <span>DESARROLLADO CON GEMINI 2.5 FLASH</span>
          <span>© 2026 VECTOR AVIATION</span>
        </div>

      </div>

      {/* CSS Styling to format beautifully in Print/PDF Mode */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          nav, header, footer {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:bg-zinc-50 {
            background-color: #f9fafb !important;
          }
          .print\\:text-black {
            color: black !important;
          }
          .print\\:text-zinc-600 {
            color: #52525b !important;
          }
          .print\\:text-zinc-700 {
            color: #3f3f46 !important;
          }
          .print\\:border-zinc-200 {
            border-color: #e4e4e7 !important;
          }
          .print\\:border-zinc-300 {
            border-color: #d4d4d8 !important;
          }
        }
      `}</style>
    </div>
  );
}
