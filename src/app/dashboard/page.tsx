import { TrendingUp, MapPin, Zap, Compass, Activity, ArrowRight, Plane } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { buildActivityHeatmap } from "@/lib/utils";
import { Flight, Aircraft, Profile, FlightPack, AuditSummary, PilotDocument } from "@/types";
import DashboardCharts from "@/components/dashboard/DashboardChartsLazy";
import ActivityHeatmap from "@/components/dashboard/ActivityHeatmap";
import LogbookHealthCard from "@/components/dashboard/LogbookHealthCard";
import FlightPackWidget from "@/components/dashboard/FlightPackWidget";
import PCATracker from "@/components/dashboard/PCATracker";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import Link from "next/link";
import { redirect } from "next/navigation";

async function getDashboardData() {
  const response = await apiFetch("/dashboard");

  if (response.status === 401) {
    console.log("Dashboard: 401 Unauthorized. Redirecting to logout...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }

  const emptyAudit: AuditSummary = { critical: 0, warning: 0, suppressed: 0, open_total: 0, by_rule: {} };

  if (!response.ok) {
    return { flights: [], aircraft: [], profile: null, session: { active: false }, packs: [], audit: emptyAudit, documents: [] };
  }

  const data = await response.json();
  return {
    flights: data.flights || [],
    aircraft: data.aircraft || [],
    profile: data.profile || null,
    session: data.session || { active: false },
    packs: data.packs || [],
    audit: (data.audit as AuditSummary) || emptyAudit,
    documents: (data.documents as PilotDocument[]) || []
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
  const { flights, aircraft, profile, session, packs, audit, documents } = await getDashboardData();

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

  // Cumulative hours — one point per calendar month so scale is consistent
  const monthNamesShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const cumulativeData = (() => {
    if (flights.length === 0) return [];
    // Sum hours per month key "YYYY-MM"
    const monthTotals = new Map<string, number>();
    for (const f of flights as Flight[]) {
      const key = f.date.slice(0, 7); // "YYYY-MM"
      monthTotals.set(key, (monthTotals.get(key) || 0) + f.duration);
    }
    // Build a continuous range from first flight month to current month
    const allKeys = Array.from(monthTotals.keys()).sort();
    const [startYear, startMonth] = allKeys[0].split("-").map(Number);
    const now = new Date();
    const points: { date: string; total: number; monthHours: number }[] = [];
    let running = 0;
    let y = startYear, m = startMonth;
    while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const hrs = monthTotals.get(key) || 0;
      running += hrs;
      points.push({
        date: `${monthNamesShort[m - 1]} ${String(y).slice(2)}`,
        total: Number(running.toFixed(1)),
        monthHours: Number(hrs.toFixed(1)),
      });
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return points;
  })();

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

  // Laid out here rather than in the client component so SSR and hydration
  // agree on which day is "today" regardless of the browser's timezone.
  const heatmapData = buildActivityHeatmap(flights as Flight[]);

  const longestFlight = flights.length > 0 ? Math.max(...flights.map((f: Flight) => f.duration)) : 0;
  const avgFlightTime = totalFlights > 0 ? totalHours / totalFlights : 0;

  return (
    <div className="space-y-10 md:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 pt-4">
        <div className="space-y-2 md:space-y-3">
          <p className="text-aviation-blue-dark dark:text-aviation-cyan font-semibold text-xs flex items-center gap-2">
             <Activity className="w-3.5 h-3.5" />
             <span>Centro de operaciones</span>
          </p>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-space-grotesk font-bold tracking-tighter text-zinc-900 dark:text-white leading-none">
            {profile?.first_name || "Comandante"}
          </h2>
        </div>

        {session.active && (
          <Link
            href="/dashboard/log-flight"
            className="inline-flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-full bg-green-500/10 border border-green-500/20 hover:bg-green-500/15 transition-colors self-start md:self-auto"
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 animate-blip" />
            </span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              Vuelo en curso · {aircraftMap.get(session.session.aircraft_id)?.registration || "Unknown"}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          </Link>
        )}
      </section>

      {/* Flight Deck Hero — split-flap total experience + real monthly trend + core stats */}
      <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-zinc-900 dark:bg-[#111111] border border-zinc-800 dark:border-white/10 shadow-2xl p-8 md:p-14">
        <div className="absolute top-0 right-0 w-[320px] md:w-[480px] h-[320px] md:h-[480px] bg-aviation-blue/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Left: Total experience, departure-board style */}
          <div className="space-y-6">
            <p className="text-sm font-medium text-aviation-cyan/80">Experiencia total · horas de vuelo</p>
            <SplitFlapNumber value={totalHours.toFixed(1)} />
            <div className="flex items-center gap-2 text-sm text-white/50">
              <TrendingUp className="w-4 h-4 text-aviation-cyan" />
              <span>+{lastMonthHours.toFixed(1)} hs en los últimos 30 días</span>
            </div>
            <Link
              href="/dashboard/history"
              className="inline-flex items-center gap-2 text-white text-sm font-semibold border-b border-white/20 hover:border-white pb-1 transition-colors"
            >
              Ver bitácora completa
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Right: real monthly trend + inline stat trio (ticket-stub dividers) */}
          <div className="space-y-8">
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-4">Horas por mes</p>
              <MonthlyTrend data={chartData} />
            </div>

            <div className="grid grid-cols-3 border-t border-dashed border-white/15 pt-6">
              <HeroStat value={totalFlights} label="Vuelos" />
              <HeroStat value={airports.size} label="Aeródromos" divider />
              <HeroStat value={`${longestFlight.toFixed(1)}h`} label="Récord" divider />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary stat strip — one bordered instrument cluster, not four separate boxes */}
      <div className="rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-cal dark:shadow-none grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 divide-x-0 md:divide-x divide-zinc-100 dark:divide-white/10 overflow-hidden">
        <StatCell icon={<Zap className="w-4 h-4" />} label="Promedio Vuelo" value={`${avgFlightTime.toFixed(1)}h`} />
        <StatCell icon={<Compass className="w-4 h-4" />} label="Aterrizajes" value={totalLandings.toString()} />
        <StatCell icon={<MapPin className="w-4 h-4" />} label="Destino" value={mostVisited} />
        <StatCell icon={<Plane className="w-4 h-4" />} label="Aeronaves" value={aircraft.length.toString()} />
      </div>

      {/* Flight Hours Packs */}
      <FlightPackWidget packs={packs} />

      {/* METAR/TAF Weather Widget - Full width horizontal card */}
      <WeatherWidget defaultAirport={mostVisited} />

      {/* Logbook health + expiries — both answer "is anything wrong that the
          flight list won't show me", so they sit together above the PCA tracker. */}
      <LogbookHealthCard audit={audit} documents={documents} />

      {/* PCA Tracker (only for PPA/Privado working towards PCA) - Full width below */}
      {(profile?.license_type?.toUpperCase().includes("PPA") || profile?.license_type?.toUpperCase().includes("PRIVADO")) && !profile?.license_type?.toUpperCase().includes("PCA") && (
        <PCATracker flights={flights} />
      )}

      {/* Analytics */}
      <DashboardCharts monthlyData={chartData} aircraftData={aircraftData} cumulativeData={cumulativeData} />

      {/* Activity grid — sits right under "Horas acumuladas": that card answers
          "how much", this one answers "how regularly". */}
      <ActivityHeatmap data={heatmapData} />

    </div>
  );
}

function HeroStat({ value, label, divider }: { value: string | number; label: string; divider?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center px-2 ${divider ? "border-l border-dashed border-white/15" : ""}`}>
      <span className="text-2xl md:text-3xl font-space-grotesk font-bold text-white tracking-tighter leading-none">{value}</span>
      <span className="text-xs font-medium text-zinc-500 mt-1.5">{label}</span>
    </div>
  );
}

function SplitFlapNumber({ value }: { value: string }) {
  return (
    <div className="flex items-end gap-4">
      <div className="flex gap-1 md:gap-1.5">
        {value.split("").map((ch, i) =>
          ch === "." ? (
            <div key={i} className="w-3 md:w-4 flex items-end justify-center pb-2 md:pb-3">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white" />
            </div>
          ) : (
            <div
              key={i}
              className="relative w-10 md:w-14 h-16 md:h-20 bg-black rounded-lg md:rounded-xl border border-white/10 flex items-center justify-center shadow-inner overflow-hidden"
            >
              <span className="text-4xl md:text-6xl font-space-grotesk font-bold text-white tabular-nums leading-none">{ch}</span>
              <div className="absolute left-0 right-0 top-1/2 h-px bg-black/60" />
              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/[0.03]" />
            </div>
          )
        )}
      </div>
      <span className="text-base md:text-lg font-medium text-zinc-500 pb-2 md:pb-3">hs</span>
    </div>
  );
}

function MonthlyTrend({ data }: { data: { name: string; hours: number }[] }) {
  const max = Math.max(...data.map((d) => d.hours), 1);
  return (
    <div className="space-y-2.5">
      <div className="flex items-end gap-2.5 h-20">
        {data.map((d, i) => (
          <div key={i} className="flex-1 h-full flex items-end">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-aviation-blue to-aviation-cyan transition-all"
              style={{ height: `${Math.max((d.hours / max) * 100, d.hours > 0 ? 8 : 2)}%`, opacity: d.hours > 0 ? 1 : 0.15 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-xs font-medium text-zinc-500">{d.name}</span>
        ))}
      </div>
    </div>
  );
}

function StatCell({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="px-6 py-6 md:py-8 flex flex-col items-start md:items-center md:text-center gap-3 hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors">
      <div className="text-aviation-blue-dark dark:text-aviation-cyan bg-aviation-blue/10 p-2.5 rounded-xl">
        {icon}
      </div>
      <div className="flex flex-col md:items-center">
        <p className="text-xl md:text-2xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tight leading-none">{value}</p>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-1">{label}</p>
      </div>
    </div>
  );
}
