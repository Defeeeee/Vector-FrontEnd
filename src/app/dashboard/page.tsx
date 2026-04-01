import { TrendingUp, Calendar, MapPin, Award, Zap, Compass, History, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Flight, Aircraft, Profile } from "@/types";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import Link from "next/link";

async function getDashboardData() {
  const [flightsRes, aircraftRes, profilesRes] = await Promise.all([
    apiFetch("/flights"),
    apiFetch("/aircraft"),
    apiFetch("/profiles")
  ]);

  const flights: Flight[] = flightsRes.ok ? await flightsRes.json() : [];
  const aircraft: Aircraft[] = aircraftRes.ok ? await aircraftRes.json() : [];
  const profiles: Profile[] = profilesRes.ok ? await profilesRes.json() : [];

  return { flights, aircraft, profile: profiles[0] || null };
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
  const { flights, aircraft, profile } = await getDashboardData();

  const totalFlights = flights.length;
  const totalHours = flights.reduce((acc, f) => acc + f.duration, 0);
  const totalLandings = flights.reduce((acc, f) => acc + f.landings, 0);
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const lastMonthFlights = flights.filter(f => new Date(f.date + 'T00:00:00') >= thirtyDaysAgo);
  const lastMonthHours = lastMonthFlights.reduce((acc, f) => acc + f.duration, 0);

  const monthlyMap = new Map<string, number>();
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = `${monthNames[d.getMonth()]}`;
    monthlyMap.set(label, 0);
  }
  flights.forEach(f => {
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

  const aircraftMap = new Map(aircraft.map(a => [a.id, a]));
  const regMap = new Map<string, number>();
  flights.forEach(f => {
    const ac = aircraftMap.get(f.aircraft_id);
    const reg = ac?.registration || "Unknown";
    regMap.set(reg, (regMap.get(reg) || 0) + f.duration);
  });

  const aircraftData = Array.from(regMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value: Number(value.toFixed(1)),
      color: ["#ffffff", "#71717a", "#27272a", "#18181b"][i % 4]
    }));

  const airportFreq = new Map<string, number>();
  flights.forEach(f => {
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
  
  const longestFlight = flights.length > 0 ? Math.max(...flights.map(f => f.duration)) : 0;
  const avgFlightTime = totalFlights > 0 ? totalHours / totalFlights : 0;

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full">
      {/* Dynamic Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="h-px w-12 bg-white/20" />
          <h2 className="text-6xl font-black tracking-tighter text-white leading-none">
            {profile?.first_name || "Comandante"}
          </h2>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.4em]">
            Digital Aviator <span className="mx-2 text-zinc-800">/</span> {profile?.license_type || "No Lic."}
          </p>
        </div>
        
        <Link href="/dashboard/log-flight" className="bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] px-10 py-5 rounded-full shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center space-x-3">
          <span>Registrar Vuelo</span>
          <TrendingUp className="w-4 h-4" />
        </Link>
      </section>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
        <div className="p-10 bg-white/[0.02] border border-white/[0.05] rounded-[3rem] space-y-8 hover:bg-white/[0.04] transition-colors">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Experiencia Total</p>
          <div className="space-y-1">
            <p className="text-7xl font-black text-white tracking-tighter">{totalHours.toFixed(1)}</p>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Horas de Vuelo</p>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-black text-zinc-500 uppercase">
            <span className="text-white">{totalFlights}</span>
            <span>Vuelos Completados</span>
          </div>
        </div>

        <div className="p-10 bg-white/[0.02] border border-white/[0.05] rounded-[3rem] space-y-8 hover:bg-white/[0.04] transition-colors">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Actividad Reciente</p>
          <div className="space-y-1">
            <p className="text-7xl font-black text-white tracking-tighter">{lastMonthHours.toFixed(1)}</p>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Horas este mes</p>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-black text-emerald-500 uppercase">
            <span>+{lastMonthFlights.length} Registros</span>
          </div>
        </div>

        <div className="p-10 bg-white/[0.02] border border-white/[0.05] rounded-[3rem] space-y-8 hover:bg-white/[0.04] transition-colors">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Alcance Global</p>
          <div className="space-y-1">
            <p className="text-7xl font-black text-white tracking-tighter">{airports.size}</p>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Aeródromos</p>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-black text-zinc-500 uppercase">
            <span className="text-white">{mostVisited}</span>
            <span>Principal Destino</span>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <DashboardCharts monthlyData={chartData} aircraftData={aircraftData} />

      {/* Detail Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricItem label="Promedio" value={`${avgFlightTime.toFixed(1)}H`} icon={<Zap className="w-3 h-3" />} />
        <MetricItem label="Record" value={`${longestFlight.toFixed(1)}H`} icon={<Award className="w-3 h-3" />} />
        <MetricItem label="Landings" value={totalLandings.toString()} icon={<Clock className="w-3 h-3" />} />
        <MetricItem label="Fleet" value={aircraft.length.toString()} icon={<Compass className="w-3 h-3" />} />
      </div>
    </div>
  );
}

function MetricItem({ label, value, icon }: any) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.03] flex flex-col items-center justify-center text-center space-y-3 hover:bg-white/[0.03] transition-colors">
      <div className="text-zinc-600">{icon}</div>
      <div className="space-y-1">
        <p className="text-2xl font-black text-white tracking-tight">{value}</p>
        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em]">{label}</p>
      </div>
    </div>
  );
}
