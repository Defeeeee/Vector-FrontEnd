"use client";

import { useState, useEffect } from "react";
import { CloudRain, Search, RefreshCw, ShieldAlert, BookOpen, Copy, Check, Compass, Play, MapPin, AlertCircle, ArrowRight, Wind, Thermometer, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Profile, Flight } from "@/types";

interface RouteWeatherClientProps {
  profile: Profile | null;
  flights: Flight[];
}

interface AirportWeather {
  icao: string;
  metar: string;
  taf: string;
  category: string;
  temp: number | null;
  windSpeed: number | null;
  windDir: string | number | null;
}

interface NotamItem {
  code: string;
  from: string;
  to: string;
  textRaw: string;
  textEsp: string;
}

interface MadhelData {
  name: string;
  fullName: string;
  state: string;
  fir: string;
  elevation: number;
  condition: string;
  control: string;
  traffic: string;
  status: string;
}

export default function RouteWeatherClient({ profile, flights }: RouteWeatherClientProps) {
  const [routeInput, setRouteInput] = useState("");
  const [activeRoute, setActiveRoute] = useState<string[]>(["SADF", "SAAK", "SAEZ"]);
  const [weatherData, setWeatherData] = useState<Record<string, AirportWeather>>({});
  const [notamsData, setNotamsData] = useState<Record<string, NotamItem[]>>({});
  const [madhelData, setMadhelData] = useState<Record<string, MadhelData | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [expandedTafs, setExpandedTafs] = useState<Record<string, boolean>>({});
  const [expandedNotams, setExpandedNotams] = useState<Record<string, boolean>>({});

  // Parse frequent routes from flight history
  const getFrequentRoutes = () => {
    const counts: Record<string, number> = {};
    flights.forEach((f) => {
      if (f.route && f.route.trim()) {
        const cleanRoute = f.route.trim().toUpperCase();
        counts[cleanRoute] = (counts[cleanRoute] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([routeStr]) => {
        return routeStr.split(/[\s\-\>]+/).filter((a) => a.length >= 3 && a.length <= 4);
      })
      .filter((routeArr) => routeArr.length >= 2);
  };

  const frequentRoutes = getFrequentRoutes();

  async function fetchRouteWeather(airports: string[]) {
    if (airports.length === 0) return;
    setLoading(true);
    setError(null);
    const results: Record<string, AirportWeather> = {};
    const notamsResults: Record<string, NotamItem[]> = {};
    const madhelResults: Record<string, MadhelData | null> = {};
    
    try {
      await Promise.all(
        airports.map(async (icao) => {
          // Weather lookup
          try {
            const res = await fetch(`/api/weather?icao=${icao}`);
            if (res.ok) {
              const data = await res.json();
              results[icao] = data;
            } else {
              results[icao] = {
                icao,
                metar: "Reporte no disponible o código incorrecto.",
                taf: "No disponible.",
                category: "UNK",
                temp: null,
                windSpeed: null,
                windDir: null
              };
            }
          } catch (e) {
            results[icao] = {
              icao,
              metar: "Error al conectar con la API de clima.",
              taf: "No disponible.",
              category: "UNK",
              temp: null,
              windSpeed: null,
              windDir: null
            };
          }

          // NOTAMs & MADHEL lookup
          try {
            const nRes = await fetch(`/api/notams?icao=${icao}`);
            if (nRes.ok) {
              const data = await nRes.json();
              notamsResults[icao] = data.notams || [];
              madhelResults[icao] = data.madhel || null;
            } else {
              notamsResults[icao] = [];
              madhelResults[icao] = null;
            }
          } catch (e) {
            notamsResults[icao] = [];
            madhelResults[icao] = null;
          }
        })
      );
      setWeatherData(results);
      setNotamsData(notamsResults);
      setMadhelData(madhelResults);
    } catch (err) {
      setError("Ocurrió un error al consultar las estaciones de la ruta.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRouteWeather(activeRoute);
  }, [activeRoute]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const airports = routeInput
      .toUpperCase()
      .split(/[\s\-\>\,\/]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 3 && s.length <= 4);

    if (airports.length >= 2) {
      setActiveRoute(airports);
      setRouteInput("");
    } else {
      setError("Por favor ingresa al menos 2 aeropuertos válidos (ej: SADF SAAK).");
    }
  };

  const copyMetar = (icao: string, metar: string) => {
    navigator.clipboard.writeText(metar);
    setCopiedStates((prev) => ({ ...prev, [icao]: true }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [icao]: false }));
    }, 2000);
  };

  const toggleTaf = (icao: string) => {
    setExpandedTafs((prev) => ({ ...prev, [icao]: !prev[icao] }));
  };

  const toggleNotams = (icao: string) => {
    setExpandedNotams((prev) => ({ ...prev, [icao]: !prev[icao] }));
  };

  // Weather rules config
  const categoryConfig: Record<string, { bg: string; text: string; dot: string; label: string; severity: number }> = {
    VFR: { bg: "bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/5 dark:border-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]", label: "VFR", severity: 0 },
    MVFR: { bg: "bg-blue-500/10 border-blue-500/20 dark:bg-blue-500/5 dark:border-blue-500/10", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]", label: "MVFR", severity: 1 },
    IFR: { bg: "bg-red-500/10 border-red-500/20 dark:bg-red-500/5 dark:border-red-500/10", text: "text-red-600 dark:text-red-400", dot: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]", label: "IFR", severity: 2 },
    LIFR: { bg: "bg-fuchsia-500/10 border-fuchsia-500/20 dark:bg-fuchsia-500/5 dark:border-fuchsia-500/10", text: "text-fuchsia-600 dark:text-fuchsia-400", dot: "bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]", label: "LIFR", severity: 3 },
    UNK: { bg: "bg-zinc-100 border-zinc-200 dark:bg-white/5 dark:border-white/5", text: "text-zinc-500 dark:text-zinc-400", dot: "bg-zinc-500", label: "UNK", severity: 0 }
  };

  // Calculate route overall safety rating
  const getRouteAnalysis = () => {
    let maxSeverity = 0;
    let worstStation = "";
    let highWindStation = "";
    let highWindVal = 0;
    let hasNotams = false;

    activeRoute.forEach((icao) => {
      const w = weatherData[icao];
      if (w) {
        const config = categoryConfig[w.category] || categoryConfig.UNK;
        if (config.severity > maxSeverity) {
          maxSeverity = config.severity;
          worstStation = icao;
        }
        if (w.windSpeed && w.windSpeed > 15 && w.windSpeed > highWindVal) {
          highWindVal = w.windSpeed;
          highWindStation = icao;
        }
      }
      if (notamsData[icao] && notamsData[icao].length > 0) {
        hasNotams = true;
      }
    });

    if (maxSeverity >= 2) {
      return {
        type: "danger",
        title: "Condiciones Instrumentales Detectadas (IFR)",
        desc: `Alerta: La estación ${worstStation} se encuentra bajo reglas de vuelo instrumental (IFR/LIFR). No se aconseja vuelo VFR. Se requiere habilitación de instrumentos e inspección estricta de mínimos de aeródromo.`
      };
    } else if (maxSeverity === 1) {
      return {
        type: "warning",
        title: "Condiciones Marginales (MVFR)",
        desc: `Precaución: Se detectó techo bajo o visibilidad reducida en ${worstStation}. Mantener vuelo visual pero verificar cartas de aproximación y techos nubosos en ruta.`
      };
    } else if (highWindVal > 0) {
      return {
        type: "warning",
        title: "Advertencia de Viento Fuerte",
        desc: `Atención: Se reportan vientos de ${highWindVal} KT en la estación ${highWindStation}. Verificar el viento de costado cruzado máximo demostrado para tu aeronave.`
      };
    } else if (hasNotams) {
      return {
        type: "warning",
        title: "NOTAMs Activos en la Ruta",
        desc: "Atención: Se han reportado avisos NOTAM en una o más estaciones de tu trayecto. Revisa los detalles abajo para verificar clausuras de pista o restricciones de servicio."
      };
    } else {
      return {
        type: "success",
        title: "Ruta 100% VFR Habilitada",
        desc: "Condiciones meteorológicas excelentes. Todas las estaciones reportan reglas de vuelo visual (VFR) con techos altos y vientos calmos."
      };
    }
  };

  const analysis = getRouteAnalysis();

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-8 py-6 pb-24">
      
      {/* Title Header */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">Servicios de Navegación</p>
        <h1 className="text-3xl md:text-4xl font-extrabold font-space-grotesk tracking-tighter text-zinc-900 dark:text-white leading-none">
          Planificador Meteorológico de Ruta
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl">
          Ingresa la ruta completa de tu vuelo para obtener un análisis meteorológico tramo por tramo del estado del METAR y TAF de cada aeródromo, incluyendo datos del registro oficial MADHEL de la ANAC.
        </p>
      </div>

      {/* Main Grid: Input Form & Quick Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Form Input Card */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2rem] p-6 md:p-8 shadow-cal dark:shadow-none space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Planificar Nuevo Trayecto</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Ingresa los códigos OACI ordenados del despegue al arribo final.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-stretch">
            <div className="flex-1 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 py-3.5 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-white/20 transition-all flex items-center space-x-3">
              <Compass className="w-5 h-5 text-zinc-400" />
              <input 
                value={routeInput}
                onChange={(e) => setRouteInput(e.target.value)}
                placeholder="Ej: SADF SAAK SAEZ" 
                className="bg-transparent text-sm font-bold uppercase w-full outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
            </div>
            <button 
              type="submit" 
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-bold text-xs uppercase tracking-wider px-8 py-4 rounded-2xl transition-all active:scale-[0.98]"
            >
              Calcular Ruta
            </button>
          </form>

          {/* Current Active Route Display */}
          <div className="pt-2">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Ruta Activa Seleccionada</p>
            <div className="flex flex-wrap items-center gap-3">
              {activeRoute.map((icao, idx) => (
                <div key={icao + "-" + idx} className="flex items-center space-x-2">
                  <div className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 px-4 py-2 rounded-xl text-xs font-black font-space-grotesk tracking-wide text-zinc-900 dark:text-white">
                    {icao}
                  </div>
                  {idx < activeRoute.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Suggestions Card */}
        <div className="lg:col-span-1 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2rem] p-6 md:p-8 shadow-cal dark:shadow-none space-y-6 flex flex-col justify-between h-full min-h-[260px]">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Rutas Frecuentes</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Vuelve a planificar tus tramos más volados recientemente.</p>
          </div>

          <div className="space-y-3 flex-1 pt-4">
            {frequentRoutes.length > 0 ? (
              frequentRoutes.map((routeArr, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveRoute(routeArr)}
                  className="w-full flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20 rounded-xl text-left transition-all active:scale-[0.98] group"
                >
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center space-x-1.5 font-space-grotesk">
                    {routeArr.map((icao, i) => (
                      <span key={i} className="flex items-center">
                        {icao}
                        {i < routeArr.length - 1 && <span className="mx-1 text-zinc-400">→</span>}
                      </span>
                    ))}
                  </span>
                  <Play className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors" />
                </button>
              ))
            ) : (
              <div className="text-center py-6 text-zinc-400 text-xs font-medium">Aún no hay vuelos registrados en tu historial.</div>
            )}
          </div>
        </div>
      </div>

      {/* Safety Analysis Report Banner */}
      <AnimatePresence mode="wait">
        {!loading && activeRoute.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className={`border rounded-[2rem] p-6 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between ${
              analysis.type === "danger" 
                ? "bg-red-500/5 border-red-500/20 text-red-500" 
                : analysis.type === "warning"
                ? "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-2xl ${
                analysis.type === "danger"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : analysis.type === "warning"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold font-space-grotesk tracking-tight text-lg md:text-xl leading-none">
                  {analysis.title}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed max-w-4xl">
                  {analysis.desc}
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => fetchRouteWeather(activeRoute)}
              className="p-3 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center space-x-2 text-xs font-bold shrink-0 self-stretch md:self-auto justify-center"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Actualizar Clima</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Route Stepper Node Diagram */}
      <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2rem] p-6 md:p-8 shadow-cal dark:shadow-none overflow-x-auto custom-scrollbar">
        <div className="min-w-[800px] py-4 flex items-center justify-between px-8 relative">
          
          {/* Horizontal connecting track line */}
          <div className="absolute left-[8%] right-[8%] h-1 bg-zinc-200 dark:bg-white/5 z-0" />
          
          {activeRoute.map((icao, idx) => {
            const w = weatherData[icao];
            const config = w ? (categoryConfig[w.category] || categoryConfig.UNK) : categoryConfig.UNK;
            
            return (
              <div key={icao + "-node-" + idx} className="flex flex-col items-center space-y-3 relative z-10 w-24">
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {idx === 0 ? "DESPEGUE" : idx === activeRoute.length - 1 ? "DESTINO" : `TRAMO ${idx}`}
                </div>
                
                {/* Node circle bubble */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 bg-white dark:bg-[#111111] ${
                  w ? (
                    w.category === "VFR" ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" :
                    w.category === "MVFR" ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]" :
                    w.category === "IFR" ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]" :
                    w.category === "LIFR" ? "border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.3)]" :
                    "border-zinc-300 dark:border-white/10"
                  ) : "border-zinc-300 dark:border-white/10"
                } transition-all duration-500`}>
                  <span className="text-xs font-black font-space-grotesk tracking-wide text-zinc-900 dark:text-white">
                    {icao}
                  </span>
                </div>

                <div className="text-center space-y-0.5">
                  <div className={`text-[10px] font-extrabold uppercase ${config.text}`}>
                    {w ? config.label : "Cargando..."}
                  </div>
                  <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 leading-none">
                    {w && w.temp !== null ? `${w.temp}°C` : "--°C"} | {w && w.windSpeed !== null && w.windSpeed > 0 ? `${w.windSpeed}KT` : "Calma"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Route Station Cards List */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-[0.2em] px-1">Reportes Detallados por Estación</h3>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin text-zinc-400" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Consultando meteorología y NOTAMs en vivo...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeRoute.map((icao, idx) => {
              const w = weatherData[icao];
              if (!w) return null;
              const config = categoryConfig[w.category] || categoryConfig.UNK;
              const airportNotams = notamsData[icao] || [];
              const madhel = madhelData[icao];
              
              return (
                <div 
                  key={icao + "-details-" + idx}
                  className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2rem] p-6 md:p-8 shadow-cal dark:shadow-none flex flex-col xl:flex-row gap-6 justify-between items-stretch transition-all duration-300 group"
                >
                  {/* Left panel: Station identifier, simple rule, Wind/Temp, and MADHEL */}
                  <div className="flex-1 flex flex-col justify-between space-y-6 xl:max-w-md">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-white rounded-xl flex items-center justify-center border border-zinc-200 dark:border-white/5 shadow-sm">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">ESTACIÓN {idx === 0 ? "DESPEGUE" : idx === activeRoute.length - 1 ? "ARRIBO" : "TRÁNSITO"}</p>
                        <h4 className="font-extrabold font-space-grotesk text-zinc-900 dark:text-white text-lg md:text-xl tracking-tight leading-none">
                          {icao} - Aeródromo
                        </h4>
                      </div>
                    </div>

                    {/* Flight rule badge */}
                    <div className={`border rounded-2xl p-4 flex items-center justify-between ${config.bg}`}>
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
                          <p className={`text-[9px] font-extrabold uppercase tracking-widest ${config.text}`}>
                            Condición {config.label}
                          </p>
                        </div>
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold leading-none mt-1">Estatus reglamentario de la estación</p>
                      </div>
                      <span className={`text-2xl font-black font-space-grotesk tracking-tight ${config.text}`}>
                        {w.category}
                      </span>
                    </div>

                    {/* Wind and Temperature */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 rounded-2xl p-3 flex items-center space-x-3">
                        <Wind className="w-4 h-4 text-zinc-400" />
                        <div>
                          <p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Viento</p>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white mt-1">
                            {w.windSpeed !== null && w.windSpeed > 0
                              ? `${w.windDir !== null ? `${w.windDir}°` : "VRB"} / ${w.windSpeed} KT`
                              : "Calma"}
                          </p>
                        </div>
                      </div>
                      <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 rounded-2xl p-3 flex items-center space-x-3">
                        <Thermometer className="w-4 h-4 text-zinc-400" />
                        <div>
                          <p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Temperatura</p>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white mt-1">
                            {w.temp !== null ? `${w.temp} °C` : "---"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* MADHEL General Info sub-card */}
                    {madhel && (
                      <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-white/5 pb-2">
                          <p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">REGISTRO OFICIAL MADHEL</p>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                            madhel.status === "OK" 
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                              : "bg-red-500/10 text-red-500 border border-red-500/20"
                          }`}>
                            {madhel.status}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 uppercase leading-snug">
                            {madhel.fullName}
                          </p>
                          <p className="text-[8px] text-zinc-400 dark:text-zinc-500 font-bold leading-none">{madhel.state}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="bg-white dark:bg-black/20 rounded-lg p-1.5 border border-zinc-200/50 dark:border-white/5">
                            <p className="text-[7px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">ELEVACIÓN</p>
                            <p className="text-[10px] font-black font-space-grotesk text-zinc-900 dark:text-white mt-1 leading-none">
                              {madhel.elevation}m <span className="text-[8px] font-normal text-zinc-400">({Math.round(madhel.elevation * 3.28084)}ft)</span>
                            </p>
                          </div>
                          <div className="bg-white dark:bg-black/20 rounded-lg p-1.5 border border-zinc-200/50 dark:border-white/5">
                            <p className="text-[7px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">FIR</p>
                            <p className="text-[10px] font-black font-space-grotesk text-zinc-900 dark:text-white mt-1 leading-none">
                              {madhel.fir}
                            </p>
                          </div>
                          <div className="bg-white dark:bg-black/20 rounded-lg p-1.5 border border-zinc-200/50 dark:border-white/5">
                            <p className="text-[7px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">TRÁNSITO</p>
                            <p className="text-[10px] font-black font-space-grotesk text-zinc-900 dark:text-white mt-1 leading-none">
                              {madhel.traffic === "INTL" ? "INTL" : "NAC"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-zinc-200/50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-zinc-300/30 dark:border-white/10 uppercase">
                            {madhel.condition === "PUBLICO" ? "Público" : "Privado"}
                          </span>
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-zinc-200/50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-zinc-300/30 dark:border-white/10 uppercase">
                            {madhel.control === "CONTROLLED" ? "Controlado" : "No Controlado"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right panel: METAR raw code, TAF and NOTAMs */}
                  <div className="flex-1 flex flex-col justify-between space-y-4 border-t xl:border-t-0 xl:border-l border-zinc-200 dark:border-white/10 pt-6 xl:pt-0 xl:pl-8">
                    
                    {/* METAR Code display box */}
                    <div className="bg-zinc-900 dark:bg-black/40 border border-zinc-800 dark:border-white/5 rounded-2xl p-4 font-mono text-[10px] font-bold leading-relaxed text-zinc-300 dark:text-zinc-200 break-words shadow-inner flex-1 flex flex-col justify-between relative overflow-hidden group/box">
                      
                      <div className="flex items-center justify-between border-b border-zinc-800 dark:border-white/5 pb-2 mb-2">
                        <p className="text-[8px] font-sans font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-none">CÓDIGO METAR REGISTRADO</p>
                        
                        <button 
                          onClick={() => copyMetar(icao, w.metar)}
                          className="p-1 rounded bg-zinc-800 dark:bg-white/5 text-zinc-400 hover:text-white transition-all active:scale-95 flex items-center space-x-1"
                        >
                          {copiedStates[icao] ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-[8px] font-sans text-emerald-400 font-bold px-0.5">Copiado</span>
                            </>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <p className="break-words font-mono tracking-normal text-zinc-200 dark:text-zinc-100 select-all leading-relaxed flex-1 flex items-center">
                        {w.metar}
                      </p>
                    </div>

                    {/* TAF details drop box */}
                    <div className="space-y-2">
                      <button 
                        type="button" 
                        onClick={() => toggleTaf(icao)}
                        className="w-full flex items-center justify-between text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white transition-colors py-1.5"
                      >
                        <span className="flex items-center space-x-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Ver Pronóstico TAF</span>
                        </span>
                        <span className="text-xs font-normal">{expandedTafs[icao] ? "▲" : "▼"}</span>
                      </button>
                      
                      <AnimatePresence>
                        {expandedTafs[icao] && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 font-mono text-[9px] font-medium leading-relaxed text-zinc-600 dark:text-zinc-300 break-words max-h-[140px] overflow-y-auto custom-scrollbar shadow-inner">
                              {w.taf}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* NOTAMs List */}
                    <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-white/5">
                      <button 
                        type="button" 
                        onClick={() => toggleNotams(icao)}
                        className="w-full flex items-center justify-between text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white transition-colors py-1.5"
                      >
                        <span className="flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Avisos NOTAM ({airportNotams.length})</span>
                        </span>
                        <span className="text-xs font-normal text-zinc-400">{expandedNotams[icao] ? "▲" : "▼"}</span>
                      </button>
                      
                      <AnimatePresence>
                        {expandedNotams[icao] && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-1 pt-1">
                              {airportNotams.length > 0 ? (
                                airportNotams.map((notam, nIdx) => (
                                  <div key={nIdx} className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-3.5 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-black font-space-grotesk tracking-wide text-zinc-900 dark:text-white">{notam.code}</span>
                                      <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500">Desde: {notam.from}</span>
                                    </div>
                                    <p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 leading-none">Hasta: {notam.to}</p>
                                    <p className="text-[10px] leading-relaxed text-zinc-700 dark:text-zinc-300 font-mono bg-zinc-900 dark:bg-black/30 text-zinc-200 p-3 rounded-lg border border-black/5 dark:border-white/5 font-semibold">
                                      {notam.textEsp || notam.textRaw}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 py-2 font-semibold italic text-center">No hay NOTAMs activos reportados para esta estación en la ANAC.</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
