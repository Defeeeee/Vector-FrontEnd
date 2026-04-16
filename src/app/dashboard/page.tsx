import { TrendingUp, Calendar, MapPin, Award, Zap, Compass, History, Clock, Plus, Activity, Navigation2, Plane } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Flight, Aircraft, Profile, FlightPack } from "@/types";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import FlightPackWidget from "@/components/dashboard/FlightPackWidget";
import PCATracker from "@/components/dashboard/PCATracker";
import Link from "next/link";
import { redirect } from "next/navigation";

async function getDashboardData() {
  const response = await apiFetch("/dashboard");

  if (response.status === 401) {
    console.log("Dashboard: 401 Unauthorized. Redirecting to logout...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }

  if (!response.ok) {
    return { flights: [], aircraft: [], profile: null, session: { active: false }, packs: [] };
  }

  const data = await response.json();
  return {
    flights: data.flights || [],
    aircraft: data.aircraft || [],
    profile: data.profile || null,
    session: data.session || { active: false },
    packs: data.packs || []
  };
}

function splitRoute(route: string): [string, string] {
  if (route.includes('-')) {
    const [origin, dest] = route.split('-');
    return [origin?.trim().replace(/\s+/g, '') || "???", dest?.trim().replace(/\s+/g, '') || "???"];
  }
  const parts = route.trim().split(/\s+/);
  return [parts[0] || "???", parts[1] || "???"];
}

export default async function Dashboard() {
  const { flights, aircraft, profile, session, packs } = await getDashboardData();

  const totalFlights = flights.length;
  const totalHours = flights.reduce((acc: number, f: Flight) => acc + f.duration, 0);
  const totalLandings = flights.reduce((acc: number, f: Flight) => acc + f.landings, 0);
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const lastMonthFlights = flights.filter((f: Flight) => new Date(f.date + 'T00:00:00') >= thirtyDaysAgo);
  const lastMonthHours = lastMonthFlights.reduce((acc: number, f: Flight) => acc + f.duration, 0);

  const monthlyMap = new Map<string, number>();
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = `${monthNames[d.getMonth()]}`;
    monthlyMap.set(label, 0);
  }
  flights.forEach((f: Flight) => {
    const d = new Date(f.date + 'T00:00:00');
    const label = `${monthNames[d.getMonth()]}`;
    if (monthlyMap.has(label)) {
      monthlyMap.set(label, (monthlyMap.get(label) || 0) + f.duration);
    }
  });
  const chartData = Array.from(monthlyMap.entries()).map(([name, hours]) => ({
    name,
    hours: Number(hours.toFixed(1))
  }));

  const aircraftMap = new Map<string, Aircraft>(aircraft.map((a: Aircraft) => [a.id, a]));
  const regMap = new Map<string, number>();
  flights.forEach((f: Flight) => {
    const ac = f.aircraft_id ? aircraftMap.get(f.aircraft_id) : undefined;
    const reg = ac?.registration || "Unknown";
    regMap.set(reg, (regMap.get(reg) || 0) + f.duration);
  });

  const aircraftData = Array.from(regMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value: Number(value.toFixed(1)),
      color: ["#18181b", "#71717a", "#e4e4e7", "#f9fafb"][i % 4]
    }));

  const airportFreq = new Map<string, number>();
  flights.forEach((f: Flight) => {
    const [origin, dest] = splitRoute(f.route);
    if (origin !== "???") {
      const o = origin.toUpperCase();
      airportFreq.set(o, (airportFreq.get(o) || 0) + 1);
    }
    if (dest !== "???") {
      const d = dest.toUpperCase();
      airportFreq.set(d, (airportFreq.get(d) || 0) + 1);
    }
  });

  const sortedAirports = Array.from(airportFreq.entries()).sort((a, b) => b[1] - a[1]);
  const mostVisited = sortedAirports[0]?.[0] || "---";
  const airports = new Set(airportFreq.keys());
  
  const longestFlight = flights.length > 0 ? Math.max(...flights.map((f: Flight) => f.duration)) : 0;
  const avgFlightTime = totalFlights > 0 ? totalHours / totalFlights : 0;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full">
      {/* Dynamic Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
        <div className="space-y-3">
          <p className="text-zinc-500 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-[0.4em] flex items-center space-x-2">
             <Activity className="w-3 h-3" />
             <span>Centro de Operaciones</span>
          </p>
          <h2 className="text-5xl lg:text-7xl font-space-grotesk font-bold tracking-tighter text-zinc-900 dark:text-white leading-none">
            {profile?.first_name || "Comandante"}
          </h2>
        </div>
      </section>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
        
        {/* Live Session - Spans full width if active */}
        {session.active && (
          <div className="md:col-span-4 lg:col-span-6 animate-in zoom-in-95 duration-500">
            <div className="bg-green-500 text-white rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-cal relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)] pointer-events-none" />
              <div className="flex items-center space-x-6 relative z-10">
                <div className="w-16 h-16 bg-white text-green-600 rounded-2xl flex items-center justify-center animate-pulse shadow-lg">
                  <Compass className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-green-100 uppercase tracking-[0.3em]">Vuelo en Progreso</p>
                  <h3 className="text-3xl font-bold font-space-grotesk tracking-tighter">
                    {aircraftMap.get(session.session.aircraft_id)?.registration || "Unknown"}
                  </h3>
                </div>
              </div>
              <div className="flex flex-col md:items-end leading-none relative z-10">
                <span className="text-5xl font-bold font-space-grotesk tracking-tighter">LIVE</span>
                <p className="text-[10px] font-bold text-green-100 uppercase tracking-[0.3em] mt-2">Desde {new Date(session.session.start_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} UTC</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Experience Card - High Contrast */}
        <div className="md:col-span-4 lg:col-span-3 p-10 bg-zinc-900 dark:bg-[#111111] border border-zinc-800 dark:border-white/10 rounded-[2.5rem] space-y-8 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[300px] group transition-all">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/5 dark:bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-transform group-hover:scale-110" />
          <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 dark:bg-white/10 text-white dark:text-white rounded-xl flex items-center justify-center mb-6 shadow-sm border border-white/10 dark:border-white/5">
                 <Award className="w-6 h-6" />
              </div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em]">Experiencia Total</p>
              <div className="flex items-baseline space-x-2 mt-2">
                <p className="text-8xl font-space-grotesk font-bold text-white dark:text-white tracking-tighter leading-none">{totalHours.toFixed(1)}</p>
                <p className="text-lg font-bold text-zinc-500 dark:text-zinc-600 uppercase tracking-widest">Hs</p>
              </div>
          </div>
          <div className="relative z-10 flex items-center justify-between border-t border-white/10 dark:border-white/10 pt-6">
             <div className="flex flex-col">
                <span className="text-2xl font-bold text-white dark:text-white">{totalFlights}</span>
                <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest">Vuelos</span>
             </div>
             <Link href="/dashboard/history" className="w-10 h-10 bg-white dark:bg-white/10 text-zinc-900 dark:text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <Navigation2 className="w-4 h-4 rotate-45" />
             </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="md:col-span-2 lg:col-span-2 p-10 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] space-y-8 shadow-cal dark:shadow-none flex flex-col justify-between min-h-[300px] hover:shadow-md dark:hover:bg-[#1a1a1a] transition-all group">
          <div>
              <div className="w-10 h-10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-white rounded-xl flex items-center justify-center mb-6 border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-none">
                 <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">Últimos 30 Días</p>
              <p className="text-6xl font-space-grotesk font-bold text-zinc-900 dark:text-white tracking-tighter mt-2">{lastMonthHours.toFixed(1)}</p>
          </div>
          <div className="bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-zinc-100 dark:border-transparent flex items-center space-x-3 transition-colors">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">+{lastMonthFlights.length} Registros Nuevos</span>
          </div>
        </div>

        {/* Mini Detail Metrics - Stacked */}
        <div className="md:col-span-2 lg:col-span-1 flex flex-col gap-6">
           <div className="flex-1 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] shadow-cal dark:shadow-none p-6 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-md dark:hover:bg-[#1a1a1a] transition-all">
               <div className="p-2 bg-zinc-50 dark:bg-white/5 rounded-xl text-zinc-900 dark:text-white border border-zinc-100 dark:border-transparent"><MapPin className="w-4 h-4" /></div>
               <p className="text-3xl font-space-grotesk font-bold text-zinc-900 dark:text-white tracking-tighter">{airports.size}</p>
               <p className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">Aeródromos</p>
           </div>
           <div className="flex-1 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] shadow-cal dark:shadow-none p-6 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-md dark:hover:bg-[#1a1a1a] transition-all">
               <div className="p-2 bg-zinc-50 dark:bg-white/5 rounded-xl text-zinc-900 dark:text-white border border-zinc-100 dark:border-transparent"><Clock className="w-4 h-4" /></div>
               <p className="text-3xl font-space-grotesk font-bold text-zinc-900 dark:text-white tracking-tighter">{longestFlight.toFixed(1)}h</p>
               <p className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">Récord</p>
           </div>
        </div>
      </div>

      {/* Detail Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MetricItem label="Promedio de Vuelo" value={`${avgFlightTime.toFixed(1)}h`} icon={<Zap className="w-4 h-4" />} />
        <MetricItem label="Total Aterrizajes" value={totalLandings.toString()} icon={<Compass className="w-4 h-4" />} />
        <MetricItem label="Destino Frecuente" value={mostVisited} icon={<MapPin className="w-4 h-4" />} />
        <MetricItem label="Aeronaves Voladas" value={aircraft.length.toString()} icon={<Plane className="w-4 h-4" />} />
      </div>

      {/* Flight Hours Packs Widget */}
      <FlightPackWidget packs={packs} />

      {/* PCA Tracker (only for PPA/Privado working towards PCA) */}
      {(profile?.license_type?.toUpperCase().includes("PPA") || profile?.license_type?.toUpperCase().includes("PRIVADO")) && !profile?.license_type?.toUpperCase().includes("PCA") && (
        <PCATracker flights={flights} />
      )}

      {/* Analytics */}
      <DashboardCharts monthlyData={chartData} aircraftData={aircraftData} />

    </div>
  );
}

function MetricItem({ label, value, icon }: any) {
  return (
    <div className="px-8 py-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 shadow-sm hover:shadow-md dark:hover:bg-white/[0.04] transition-all group">
      <div className="text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-white/[0.05] p-3 rounded-xl border border-zinc-100 dark:border-white/10 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:border-zinc-300 dark:group-hover:border-white/20 transition-colors inline-block mb-3">
        {icon}
      </div>
      <div className="flex flex-col">
        <p className="text-2xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tight leading-none">{value}</p>
        <p className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] mt-1">{label}</p>
      </div>
    </div>
  );
}