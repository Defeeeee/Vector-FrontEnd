"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Loader2,
  Mountain,
  MapPin,
  Globe,
  Plane,
  Navigation,
  Ticket,
} from "lucide-react";
import { AirportRef } from "@/types";

/** What the pilot has flown at this aerodrome, precomputed on the server. */
export interface AirportHistory {
  visits: number;
  hours: number;
  landings: number;
  /** Already formatted on the server — see the hydration note in AGENTS.md. */
  lastVisit: string | null;
  asOrigin: number;
  asDestination: number;
}

interface Weather {
  metar: string;
  category: string;
  temp: number | null;
  windSpeed: number | null;
  windDir: string | number | null;
}

const SIZE_LABEL: Record<string, string> = {
  L: "Grande",
  M: "Mediano",
  S: "Pequeño",
  H: "Helipuerto",
};

const CATEGORY_TONE: Record<string, string> = {
  VFR: "bg-green-500/10 text-green-600 dark:text-green-500",
  MVFR: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  IFR: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
  LIFR: "bg-red-500/10 text-red-600 dark:text-red-500",
};

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
        {icon}
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="data text-base font-bold text-zinc-900 dark:text-white mt-1.5 truncate">{value}</p>
    </div>
  );
}

export default function AirportsClient({
  history,
  initialIcao,
}: {
  /** ICAO -> what the pilot flew there. Only codes present in their logbook. */
  history: Record<string, AirportHistory>;
  initialIcao: string | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AirportRef[]>([]);
  const [selected, setSelected] = useState<AirportRef | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loadingWx, setLoadingWx] = useState(false);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Open on the pilot's most-flown aerodrome instead of an empty state: the
  // question "what is my home field doing right now" is the common one, and
  // making them type it every visit is a toll on the frequent case.
  useEffect(() => {
    if (initialIcao) void pick(initialIcao, { clearSearch: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIcao]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    // 150 ms matches AirportResolver — the resolver feel is the point, and two
    // different debounces in the same app read as lag in one of them.
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/airports/search?q=${encodeURIComponent(q)}`);
        // The two search endpoints disagree on shape: `?q=` wraps the list in
        // `{ results }`, while `?icao=` returns the airport bare. Reading the
        // wrapper as an array silently yields `length === undefined`, so the
        // dropdown just never appears — no error, no clue.
        const body = res.ok ? await res.json() : null;
        setResults(Array.isArray(body?.results) ? body.results : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setResults([]);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function pick(icao: string, opts: { clearSearch?: boolean } = {}) {
    const { clearSearch = true } = opts;
    setResults([]);
    // The initial auto-open resolves asynchronously, and clearing the box there
    // would wipe whatever the pilot had already started typing — a race that
    // shows up exactly when someone opens the tab and types straight away.
    if (clearSearch) setQuery("");
    setWeather(null);

    const res = await fetch(`/api/airports/search?icao=${icao}`);
    if (!res.ok) return;
    const airport: AirportRef = await res.json();
    setSelected(airport);

    setLoadingWx(true);
    try {
      const wx = await fetch(`/api/weather?icao=${icao}`);
      setWeather(wx.ok ? await wx.json() : null);
    } catch {
      setWeather(null);
    } finally {
      setLoadingWx(false);
    }
  }

  const mine = selected ? history[selected.icao] : undefined;

  return (
    <div className="space-y-8 w-full">
      <div ref={boxRef} className="relative max-w-xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscá por ICAO, ciudad o nombre — SADM, Morón…"
          className="w-full bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-2xl py-4 pl-14 pr-12 text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-aviation-blue transition-colors placeholder:font-normal placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-cal dark:shadow-none"
        />
        {searching && (
          <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-400" />
        )}

        {results.length > 0 && (
          <ul className="absolute z-20 mt-2 w-full max-h-80 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#111111] shadow-xl divide-y divide-zinc-100 dark:divide-white/5">
            {results.map((a) => (
              <li key={a.icao}>
                <button
                  type="button"
                  onClick={() => pick(a.icao)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="data text-sm font-bold text-zinc-900 dark:text-white w-14 shrink-0">
                    {a.icao}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-zinc-700 dark:text-zinc-300 truncate">{a.label}</span>
                    <span className="block text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{a.name}</span>
                  </span>
                  {history[a.icao] && (
                    <span className="data shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400">
                      {history[a.icao].visits}×
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!selected && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Buscá un aeródromo para ver su ficha, el clima y tu historial ahí.
        </p>
      )}

      {selected && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <h2 className="data text-5xl md:text-7xl font-bold text-zinc-900 dark:text-white leading-none tracking-tight">
              {selected.icao}
            </h2>
            <div className="pb-1 min-w-0">
              <p className="text-lg md:text-xl font-display font-bold text-zinc-900 dark:text-white tracking-tight truncate">
                {selected.label}
              </p>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate">{selected.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Fact
              icon={<Mountain className="w-3.5 h-3.5" />}
              label="Elevación"
              value={selected.elevation !== undefined ? `${selected.elevation} ft` : "—"}
            />
            <Fact icon={<MapPin className="w-3.5 h-3.5" />} label="Ciudad" value={selected.city || "—"} />
            <Fact icon={<Globe className="w-3.5 h-3.5" />} label="País" value={selected.country || "—"} />
            <Fact
              icon={<Plane className="w-3.5 h-3.5" />}
              label="Tipo"
              value={SIZE_LABEL[selected.size] || "—"}
            />
            <Fact icon={<Ticket className="w-3.5 h-3.5" />} label="IATA" value={selected.iata || "—"} />
            <Fact
              icon={<Navigation className="w-3.5 h-3.5" />}
              label="Coords"
              value={
                selected.lat !== undefined && selected.lon !== undefined
                  ? `${selected.lat.toFixed(2)}, ${selected.lon.toFixed(2)}`
                  : "—"
              }
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Meteorología */}
            <div className="rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-cal dark:shadow-none p-6 md:p-7 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Meteorología</p>
                  <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-white tracking-tight mt-1">
                    Condiciones ahora
                  </h3>
                </div>
                {weather?.category && weather.category !== "UNK" && (
                  <span
                    className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      CATEGORY_TONE[weather.category] || "bg-zinc-100 dark:bg-white/10 text-zinc-500"
                    }`}
                  >
                    {weather.category}
                  </span>
                )}
              </div>

              {loadingWx ? (
                <p className="text-sm text-zinc-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Consultando…
                </p>
              ) : weather ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Viento
                      </p>
                      <p className="data text-sm font-bold text-zinc-900 dark:text-white mt-1">
                        {weather.windSpeed !== null && weather.windSpeed > 0
                          ? `${weather.windDir !== null ? `${weather.windDir}°` : "VRB"} / ${weather.windSpeed} kt`
                          : "Calma"}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Temp
                      </p>
                      <p className="data text-sm font-bold text-zinc-900 dark:text-white mt-1">
                        {weather.temp !== null ? `${weather.temp} °C` : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-100 dark:bg-white/[0.06] px-3 py-2.5">
                    <p className="data text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300 break-words">
                      {weather.metar}
                    </p>
                  </div>
                  {/* The METAR is informational — see the Términos page. */}
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
                    Informativo. No lo uses como única fuente para una decisión operativa.
                  </p>
                </>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Sin reporte para este aeródromo. La mayoría de los aeródromos chicos no emiten METAR.
                </p>
              )}
            </div>

            {/* Tu historial — esto es lo que FlightDeck no puede mostrar. */}
            <div className="rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-cal dark:shadow-none p-6 md:p-7 space-y-4">
              <div>
                <p className="eyebrow">Tu historial acá</p>
                <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-white tracking-tight mt-1">
                  {mine ? "Ya volaste a este aeródromo" : "Todavía no volaste acá"}
                </h3>
              </div>

              {mine ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Veces
                      </p>
                      <p className="data text-2xl font-bold text-zinc-900 dark:text-white mt-1">{mine.visits}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Horas
                      </p>
                      <p className="data text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                        {mine.hours.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Aterrizajes
                      </p>
                      <p className="data text-2xl font-bold text-zinc-900 dark:text-white mt-1">{mine.landings}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-200 dark:border-white/10 space-y-2 text-[13px]">
                    <p className="flex justify-between gap-3">
                      <span className="text-zinc-500 dark:text-zinc-400">Última vez</span>
                      <span className="data font-bold text-zinc-900 dark:text-white">{mine.lastVisit}</span>
                    </p>
                    <p className="flex justify-between gap-3">
                      <span className="text-zinc-500 dark:text-zinc-400">Como salida / llegada</span>
                      <span className="data font-bold text-zinc-900 dark:text-white">
                        {mine.asOrigin} / {mine.asDestination}
                      </span>
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Cuando registres un vuelo desde o hacia {selected.icao}, vas a ver acá cuántas
                  veces fuiste, cuántas horas y cuándo fue la última.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
