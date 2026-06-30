"use client";

import { useState, useEffect } from "react";
import { CloudRain, Wind, Thermometer, Search, RefreshCw, ShieldAlert, Eye, BookOpen } from "lucide-react";
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

  const categoryColors: Record<string, { bg: string; text: string; dot: string; label: string; desc: string }> = {
    VFR: { 
      bg: "bg-emerald-500/10 border-emerald-500/20", 
      text: "text-emerald-600 dark:text-emerald-400", 
      dot: "bg-emerald-500", 
      label: "VFR", 
      desc: "Reglas de Vuelo Visual" 
    },
    MVFR: { 
      bg: "bg-blue-500/10 border-blue-500/20", 
      text: "text-blue-600 dark:text-blue-400", 
      dot: "bg-blue-500", 
      label: "MVFR", 
      desc: "VFR Marginal (Techo/Vis reducida)" 
    },
    IFR: { 
      bg: "bg-red-500/10 border-red-500/20", 
      text: "text-red-600 dark:text-red-400", 
      dot: "bg-red-500", 
      label: "IFR", 
      desc: "Reglas de Vuelo Instrumental" 
    },
    LIFR: { 
      bg: "bg-fuchsia-500/10 border-fuchsia-500/20", 
      text: "text-fuchsia-600 dark:text-fuchsia-400", 
      dot: "bg-fuchsia-500", 
      label: "LIFR", 
      desc: "Instrumental Bajo (Poca Visibilidad)" 
    },
    UNK: { 
      bg: "bg-zinc-500/10 border-zinc-500/20", 
      text: "text-zinc-500", 
      dot: "bg-zinc-500", 
      label: "Categoría Desconocida", 
      desc: "Sin datos de reglas de vuelo" 
    }
  };

  const currentCat = categoryColors[data?.category || "UNK"] || categoryColors.UNK;

  return (
    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-white/10 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between h-full relative overflow-hidden group transition-all duration-300">
      
      {/* Upper header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg flex items-center justify-center shadow-sm">
              <CloudRain className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Meteorología</h4>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mt-1">Estación {data?.icao || airport}</h3>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex items-center bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-zinc-900/10 dark:focus-within:ring-white/10 transition-all max-w-[120px]">
            <input 
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="OACI" 
              className="bg-transparent text-xs font-bold uppercase w-full outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
            />
            <button type="submit" className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Status indicator */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        ) : error ? (
          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex items-start space-x-3 text-red-500 text-xs">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="font-bold leading-normal">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Category Banner */}
            <div className={`border rounded-2xl p-3 flex items-center justify-between gap-3 ${currentCat.bg} transition-all`}>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${currentCat.dot} animate-pulse`} />
                  <p className={`text-[10px] font-extrabold uppercase tracking-[0.2em] leading-none ${currentCat.text}`}>
                    Condición {currentCat.label}
                  </p>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold leading-none mt-1">{currentCat.desc}</p>
              </div>
              <span className={`text-xl font-black font-space-grotesk tracking-tight ${currentCat.text}`}>
                {data.category}
              </span>
            </div>

            {/* Weather values */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 rounded-2xl p-3 flex items-center space-x-3">
                <Wind className="w-4 h-4 text-zinc-400" />
                <div>
                  <p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Viento</p>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white mt-1">
                    {data.windSpeed !== null && data.windSpeed > 0
                      ? `${data.windDir !== null ? `${data.windDir}°` : "VRB"} / ${data.windSpeed} KT`
                      : "Calma"}
                  </p>
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 rounded-2xl p-3 flex items-center space-x-3">
                <Thermometer className="w-4 h-4 text-zinc-400" />
                <div>
                  <p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Temperatura</p>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white mt-1">
                    {data.temp !== null ? `${data.temp} °C` : "---"}
                  </p>
                </div>
              </div>
            </div>

            {/* METAR Code Box */}
            <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl p-3 space-y-1.5 select-all font-mono text-[9px] font-bold leading-relaxed text-zinc-600 dark:text-zinc-300 break-words shadow-inner">
              <p className="text-[8px] font-sans font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1">METAR</p>
              {data.metar}
            </div>

            {/* TAF Toggle & Box */}
            <div className="space-y-2">
              <button 
                type="button" 
                onClick={() => setShowTaf(!showTaf)}
                className="w-full flex items-center justify-between text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white transition-colors py-1"
              >
                <span className="flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ver Pronóstico TAF</span>
                </span>
                <span className="text-xs font-normal">{showTaf ? "▲" : "▼"}</span>
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
                    <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-2xl p-3 font-mono text-[9px] font-bold leading-relaxed text-zinc-600 dark:text-zinc-300 break-words max-h-[140px] overflow-y-auto custom-scrollbar">
                      {data.taf}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-zinc-400 text-xs font-bold">No hay datos</div>
        )}
      </div>

      {/* Button to refresh manually */}
      {!loading && data && (
        <button 
          onClick={() => fetchWeather(airport)}
          className="mt-4 w-full flex items-center justify-center space-x-2 bg-transparent hover:bg-zinc-100 dark:hover:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white font-bold text-[8px] uppercase tracking-widest py-3 rounded-xl transition-all active:scale-[0.98]"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Actualizar Clima</span>
        </button>
      )}
    </div>
  );
}
