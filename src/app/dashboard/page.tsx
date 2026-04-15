import { TrendingUp, Calendar, MapPin, Award, Zap, Compass, History, Clock, Plus } from "lucide-react";
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
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full">
      {/* Dynamic Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-8">
        <div className="space-y-4">
          <div className="h-px w-12 bg-zinc-200" />
          <h2 className="text-6xl font-space-grotesk font-bold tracking-tighter text-zinc-900 leading-none">
            {profile?.first_name || "Comandante"}
          </h2>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.4em]">
            Digital Aviator <span className="mx-2 text-zinc-300">/</span> {profile?.license_type || "No Lic."}
          </p>
        </div>
        
        <Link href="/dashboard/log-flight" className="bg-zinc-900 text-white font-bold text-[10px] uppercase tracking-[0.2em] px-10 py-5 rounded-xl shadow-cal-highlight transition-all hover:bg-zinc-800 flex items-center space-x-3">
          <span>Registrar Vuelo</span>
          <Plus className="w-4 h-4" />
        </Link>
      </section>

      {/* Live Session Widget (If Active) */}
      {session.active && (
        <section className="animate-in zoom-in-95 duration-500">
          <div className="p-1 bg-zinc-100 rounded-[2.5rem]">
            <div className="bg-zinc-900 rounded-[2.4rem] p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-cal">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-white text-zinc-900 rounded-xl flex items-center justify-center animate-pulse shadow-sm">
                  <Compass className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Vuelo en Progreso</p>
                  <h3 className="text-3xl font-bold font-space-grotesk text-white tracking-tighter">
                    {aircraftMap.get(session.session.aircraft_id)?.registration || "Unknown"}
                  </h3>
                </div>
              </div>
              <div className="flex flex-col md:items-end leading-none">
                <span className="text-5xl font-bold font-space-grotesk text-white tracking-tighter">LIVE</span>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em] mt-2">Desde {new Date(session.session.start_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} UTC</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-10 bg-white border border-zinc-200 rounded-[2.5rem] space-y-8 shadow-cal hover:shadow-lg transition-shadow">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Experiencia Total</p>
          <div className="space-y-1">
            <p className="text-7xl font-space-grotesk font-bold text-zinc-900 tracking-tighter">{totalHours.toFixed(1)}</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Horas de Vuelo</p>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-zinc-400 uppercase">
            <span className="text-zinc-900">{totalFlights}</span>
            <span>Vuelos Completados</span>
          </div>
        </div>

        <div className="p-10 bg-white border border-zinc-200 rounded-[2.5rem] space-y-8 shadow-cal hover:shadow-lg transition-shadow">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Actividad Reciente</p>
          <div className="space-y-1">
            <p className="text-7xl font-space-grotesk font-bold text-zinc-900 tracking-tighter">{lastMonthHours.toFixed(1)}</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Horas este mes</p>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-green-600 uppercase">
            <span>+{lastMonthFlights.length} Registros</span>
          </div>
        </div>

        <div className="p-10 bg-white border border-zinc-200 rounded-[2.5rem] space-y-8 shadow-cal hover:shadow-lg transition-shadow">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Alcance Global</p>
          <div className="space-y-1">
            <p className="text-7xl font-space-grotesk font-bold text-zinc-900 tracking-tighter">{airports.size}</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Aeródromos</p>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-zinc-400 uppercase">
            <span className="text-zinc-900">{mostVisited}</span>
            <span>Principal Destino</span>
          </div>
        </div>
      </div>

      {/* Flight Hours Packs Widget */}
      <FlightPackWidget packs={packs} />

      {/* PCA Tracker (only for PPA/Privado working towards PCA) */}
      {(profile?.license_type?.toUpperCase().includes("PPA") || profile?.license_type?.toUpperCase().includes("PRIVADO")) && !profile?.license_type?.toUpperCase().includes("PCA") && (
        <PCATracker flights={flights} />
      )}

      {/* Analytics */}
      <DashboardCharts monthlyData={chartData} aircraftData={aircraftData} />

      {/* Detail Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MetricItem label="Promedio" value={`${avgFlightTime.toFixed(1)}H`} icon={<Zap className="w-4 h-4" />} />
        <MetricItem label="Record" value={`${longestFlight.toFixed(1)}H`} icon={<Award className="w-4 h-4" />} />
        <MetricItem label="Landings" value={totalLandings.toString()} icon={<Clock className="w-4 h-4" />} />
        <MetricItem label="Fleet" value={aircraft.length.toString()} icon={<Compass className="w-4 h-4" />} />
      </div>
    </div>
  );
}

function MetricItem({ label, value, icon }: any) {
  return (
    <div className="p-8 rounded-[2rem] bg-white border border-zinc-200 shadow-sm flex flex-col items-center justify-center text-center space-y-3 hover:shadow-md transition-shadow">
      <div className="text-zinc-900 bg-zinc-50 p-2 rounded-lg">{icon}</div>
      <div className="space-y-1">
        <p className="text-2xl font-bold font-space-grotesk text-zinc-900 tracking-tight">{value}</p>
        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.3em]">{label}</p>
      </div>
    </div>
  );
}
