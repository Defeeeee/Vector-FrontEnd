import { MapPin, Zap, Compass, Activity, ArrowRight, Plane } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { buildActivityHeatmap } from "@/lib/utils";
import { Flight, Aircraft, Profile, FlightPack, AuditSummary, PilotDocument } from "@/types";
import DashboardCharts from "@/components/dashboard/DashboardChartsLazy";
import ActivityHeatmap from "@/components/dashboard/ActivityHeatmap";
import LogbookHealthCard from "@/components/dashboard/LogbookHealthCard";
import FlightPackWidget from "@/components/dashboard/FlightPackWidget";
import PCATracker from "@/components/dashboard/PCATracker";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import RecentFlights from "@/components/dashboard/RecentFlights";
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
          <p className="eyebrow flex items-center gap-2">
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

      {/* Headline row. Replaces the split-flap hero card that used to sit here.
          That card was ~340px tall and repeated itself: the same 46.3 also shows
          up in "Horas acumuladas" and in the activity grid further down, and its
          inline "Horas por mes" chart is the same series as "Tendencia temporal".
          One black tile among white siblings keeps the total as the loudest thing
          on the screen without spending a third of the fold on it. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <HeadlineStat
          feature
          label="Horas totales"
          value={totalHours.toFixed(1)}
          unit="hs"
          caption={`+${lastMonthHours.toFixed(1)} hs en 30 días`}
          href="/dashboard/history"
        />
        <HeadlineStat label="Vuelos" value={String(totalFlights)} caption="Entradas de log" />
        <HeadlineStat label="Aeródromos" value={String(airports.size)} caption="Códigos ICAO únicos" />
        <HeadlineStat label="Récord" value={longestFlight.toFixed(1)} unit="h" caption="Vuelo más largo" />
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

      {/* Closes the dashboard on the logbook itself. Everything above is
          aggregate; this is the last thing that actually happened. */}
      <RecentFlights flights={flights as Flight[]} aircraft={aircraft as Aircraft[]} />

    </div>
  );
}

/**
 * One tile of the headline row. `feature` paints it black so the row has a
 * single obvious entry point instead of four equal boxes competing.
 */
function HeadlineStat({
  label,
  value,
  unit,
  caption,
  feature,
  href,
}: {
  label: string;
  value: string;
  unit?: string;
  caption: string;
  feature?: boolean;
  href?: string;
}) {
  const body = (
    <>
      <p
        className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
          feature ? "text-white/50" : "text-zinc-400 dark:text-zinc-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`data text-3xl md:text-4xl font-bold leading-none mt-2 ${
          feature ? "text-white" : "text-zinc-900 dark:text-white"
        }`}
      >
        {value}
        {unit && (
          <span className={`text-base font-medium ml-1 ${feature ? "text-white/50" : "text-zinc-400 dark:text-zinc-500"}`}>
            {unit}
          </span>
        )}
      </p>
      <p className={`text-[11px] mt-2 ${feature ? "text-white/50" : "text-zinc-400 dark:text-zinc-500"}`}>
        {caption}
      </p>
    </>
  );

  const className = `rounded-[1.75rem] border p-5 md:p-6 transition-colors ${
    feature
      ? "bg-zinc-900 dark:bg-[#111111] border-zinc-900 dark:border-white/10 shadow-xl hover:bg-zinc-800 dark:hover:bg-[#161616]"
      : "bg-white dark:bg-white/[0.02] border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none"
  }`;

  return href ? (
    <Link href={href} className={`${className} block`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}



function StatCell({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="px-6 py-6 md:py-8 flex flex-col items-start md:items-center md:text-center gap-3 hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors">
      <div className="text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/10 p-2.5 rounded-xl">
        {icon}
      </div>
      <div className="flex flex-col md:items-center">
        <p className="text-xl md:text-2xl font-bold data text-zinc-900 dark:text-white tracking-tight leading-none">{value}</p>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-1">{label}</p>
      </div>
    </div>
  );
}
