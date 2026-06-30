"use client";

import { useState, useEffect } from "react";
import { CloudRain, Wind, Thermometer, Search, RefreshCw, ShieldAlert, BookOpen, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WeatherWidgetProps {
  defaultAirport: string;
}

interface WeatherData {
  icao: string;
  metar: string;
  taf: string;
  category: string;
  temp: number | null;
  windSpeed: number | null;
  windDir: string | number | null;
}

export default function WeatherWidget({ defaultAirport }: WeatherWidgetProps) {
  const [airport, setAirport] = useState(defaultAirport && defaultAirport !== "---" ? defaultAirport : "SADF");
  const [searchVal, setSearchVal] = useState("");
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTaf, setShowTaf] = useState(false);
  const [copied, setCopied] = useState(false);

  async function fetchWeather(icaoCode: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather?icao=${icaoCode}`);
      if (!res.ok) {
        throw new Error("Aeropuerto no encontrado o reporte no disponible");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Error al obtener reporte");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather(airport);
  }, [airport]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchVal.trim().length >= 3) {
      setAirport(searchVal.trim().toUpperCase());
      setSearchVal("");
    }
  }

  const copyToClipboard = () => {
    if (data?.metar) {
      navigator.clipboard.writeText(data.metar);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const categoryColors: Record<string, { bg: string; text: string; dot: string; label: string; desc: string; glow: string }> = {
    VFR: { 
      bg: "bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/5 dark:border-emerald-500/10", 
      text: "text-emerald-600 dark:text-emerald-400", 
      dot: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]", 
      label: "VFR", 
      desc: "Reglas de Vuelo Visual (Cielo despejado)",
      glow: "from-emerald-500/15 via-emerald-500/5 to-transparent"
    },
    MVFR: { 
      bg: "bg-blue-500/10 border-blue-500/20 dark:bg-blue-500/5 dark:border-blue-500/10", 
      text: "text-blue-600 dark:text-blue-400", 
      dot: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]", 
      label: "MVFR", 
      desc: "VFR Marginal (Techo o visibilidad reducida)",
      glow: "from-blue-500/15 via-blue-500/5 to-transparent"
    },
    IFR: { 
      bg: "bg-red-500/10 border-red-500/20 dark:bg-red-500/5 dark:border-red-500/10", 
      text: "text-red-600 dark:text-red-400", 
      dot: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]", 
      label: "IFR", 
      desc: "Reglas de Vuelo Instrumental (Obligatorio plan IFR)",
      glow: "from-red-500/15 via-red-500/5 to-transparent"
    },
    LIFR: { 
      bg: "bg-fuchsia-500/10 border-fuchsia-500/20 dark:bg-fuchsia-500/5 dark:border-fuchsia-500/10", 
      text: "text-fuchsia-600 dark:text-fuchsia-400", 
      dot: "bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]", 
      label: "LIFR", 
      desc: "Instrumental Bajo (Poca o nula visibilidad)",
      glow: "from-fuchsia-500/15 via-fuchsia-500/5 to-transparent"
    },
    UNK: { 
      bg: "bg-zinc-500/10 border-zinc-500/20 dark:bg-white/5 dark:border-white/5", 
      text: "text-zinc-500 dark:text-zinc-400", 
      dot: "bg-zinc-500", 
      label: "Categoría Desconocida", 
      desc: "Sin datos de reglas de vuelo",
      glow: "from-zinc-500/10 via-transparent to-transparent"
    }
  };

  const currentCat = categoryColors[data?.category || "UNK"] || categoryColors.UNK;

  return (
    <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-cal dark:shadow-none flex flex-col md:flex-row gap-6 md:gap-8 items-stretch w-full justify-between group transition-all duration-500 relative overflow-hidden">
      
      {/* Ambient background glow reflecting current category */}
      <div className={`absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl ${currentCat.glow} rounded-full blur-[60px] pointer-events-none transition-all duration-700 opacity-60 dark:opacity-40 -mr-20 -mt-20`} />

      {/* Left Column: Station, Category, Wind and Temp */}
      <div className="flex-1 flex flex-col justify-between space-y-6 relative z-10">
        
        {/* Header and Search Form */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-white rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-none">
              <CloudRain className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] leading-none">Meteorología</p>
              <h3 className="font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tighter text-lg md:text-xl leading-none">Estación {data?.icao || airport}</h3>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex items-center bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl px-3.5 py-2.5 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-white/20 transition-all w-full sm:max-w-[130px] group/form">
            <input 
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="ICAO (Ej. SAEZ)..." 
              className="bg-transparent text-xs font-bold uppercase w-full outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
            <button type="submit" className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Loading and Data */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center">
            <div className="w-full bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex items-start space-x-3 text-red-500 text-xs">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="font-bold leading-normal">{error}</p>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-5 flex-1 flex flex-col justify-end pt-4">
            
            {/* Category Banner */}
            <div className={`border rounded-2xl p-4 md:p-5 flex items-center justify-between gap-3 ${currentCat.bg} transition-all duration-500`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${currentCat.dot} animate-pulse`} />
                  <p className={`text-[10px] font-extrabold uppercase tracking-[0.25em] leading-none ${currentCat.text}`}>
                    Condición {currentCat.label}
                  </p>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold leading-relaxed mt-1 max-w-[260px]">{currentCat.desc}</p>
              </div>
              <span className={`text-3xl font-black font-space-grotesk tracking-tight ${currentCat.text}`}>
                {data.category}
              </span>
            </div>

            {/* Weather values */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 rounded-2xl p-4 flex items-center space-x-4">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                  <Wind className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <div>
                  <p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Viento</p>
                  <p className="text-sm font-bold font-space-grotesk text-zinc-900 dark:text-white mt-1.5 leading-none">
                    {data.windSpeed !== null && data.windSpeed > 0
                      ? `${data.windDir !== null ? `${data.windDir}°` : "VRB"} / ${data.windSpeed} KT`
                      : "Calma"}
                  </p>
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 rounded-2xl p-4 flex items-center space-x-4">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                  <Thermometer className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Temperatura</p>
                  <p className="text-sm font-bold font-space-grotesk text-zinc-950 dark:text-white mt-1.5 leading-none">
                    {data.temp !== null ? `${data.temp} °C` : "---"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12 text-zinc-400 text-xs font-bold">No hay datos</div>
        )}
      </div>

      {/* Right Column: METAR, TAF and Actions */}
      <div className="flex-1 flex flex-col justify-between space-y-4 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-white/10 pt-6 md:pt-0 md:pl-8 relative z-10">
        
        {data ? (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            {/* METAR Code Box */}
            <div className="bg-zinc-900 dark:bg-black/40 border border-zinc-800 dark:border-white/5 rounded-2xl p-4 md:p-5 font-mono text-[11px] font-bold leading-relaxed text-zinc-300 dark:text-zinc-200 break-words shadow-inner flex-1 flex flex-col justify-between relative overflow-hidden group/metar">
              
              {/* Box Header with Copy action */}
              <div className="flex items-center justify-between border-b border-zinc-800 dark:border-white/5 pb-2.5 mb-2.5">
                <p className="text-[8px] font-sans font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-none">METAR CODE</p>
                
                <button 
                  onClick={copyToClipboard}
                  className="p-1.5 rounded-lg bg-zinc-800 dark:bg-white/5 text-zinc-400 hover:text-white transition-all active:scale-95 flex items-center space-x-1"
                  title="Copiar código METAR"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[8px] font-sans text-emerald-400 font-bold px-0.5">Copiado!</span>
                    </>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <p className="break-words font-mono font-semibold tracking-normal text-zinc-200 dark:text-zinc-100 select-all leading-normal flex-1 flex items-center">
                {data.metar}
              </p>
            </div>

            {/* TAF Toggle & Box */}
            <div className="space-y-2">
              <button 
                type="button" 
                onClick={() => setShowTaf(!showTaf)}
                className="w-full flex items-center justify-between text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white transition-colors py-2"
              >
                <span className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Pronóstico TAF</span>
                </span>
                <span className="text-xs font-normal text-zinc-400">{showTaf ? "▲" : "▼"}</span>
              </button>
              
              <AnimatePresence>
                {showTaf && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 font-mono text-[10px] font-medium leading-relaxed text-zinc-600 dark:text-zinc-300 break-words max-h-[140px] overflow-y-auto custom-scrollbar shadow-inner">
                      {data.taf}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs font-bold">Aún sin reportes cargados</div>
        )}

        {/* Button to refresh manually */}
        {!loading && data && (
          <button 
            onClick={() => fetchWeather(airport)}
            className="w-full flex items-center justify-center space-x-2 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white font-bold text-[8px] uppercase tracking-widest py-3.5 rounded-xl transition-all active:scale-[0.98] mt-2 shadow-sm dark:shadow-none"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar Clima</span>
          </button>
        )}
      </div>
    </div>
  );
}
