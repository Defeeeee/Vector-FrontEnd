import { ArrowRight, Mic, Plane } from "lucide-react";

/**
 * Product mocks for the landing feature sections.
 *
 * These are rebuilt in markup rather than being screenshots, for three reasons:
 * they follow the light/dark theme without shipping two image sets, they stay
 * sharp at any density, and they cannot go stale the way a PNG of the UI does
 * the moment the UI changes.
 *
 * Every number here is illustrative. Nothing reads from the API — this renders
 * for logged-out visitors, so there is no account to read from.
 */

function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#111111]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 dark:border-white/10 shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-white/15" />
        <span className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-white/15" />
        <span className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-white/15" />
        <span className="ml-2 data text-[10px] text-zinc-400 dark:text-zinc-600 truncate">{url}</span>
      </div>
      <div className="flex-1 min-h-0 p-5 md:p-6 flex flex-col justify-center overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
      {children}
    </span>
  );
}

/** Registro — the Nuevo Vuelo form, down to the block/ANAC split. */
function LogFlightMock() {
  return (
    <BrowserFrame url="vector.fdiaznem.com.ar/dashboard/log-flight">
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div className="space-y-1">
            <FieldLabel>Salida</FieldLabel>
            <div className="data text-lg md:text-xl font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-white/10 pb-1">
              SADM
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 mb-2" />
          <div className="space-y-1">
            <FieldLabel>Llegada</FieldLabel>
            <div className="data text-lg md:text-xl font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-white/10 pb-1">
              SAEZ
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-zinc-400 dark:text-zinc-500">
            Local
          </span>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
            Travesía
          </span>
        </div>

        <div className="rounded-xl bg-zinc-900 dark:bg-black px-4 py-3 flex items-center gap-6">
          <div>
            <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-white/40">Block time</p>
            <p className="data text-base font-bold text-white leading-tight">1:22</p>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div>
            <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-white/40">Tiempo ANAC</p>
            <p className="data text-base font-bold text-aviation-cyan leading-tight">1.4</p>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/** PCA — progress against the Reg. 61.620 boxes. */
function PcaMock() {
  const rows = [
    { label: "Total de vuelo", done: 148.2, need: 200 },
    { label: "PIC", done: 92.5, need: 100 },
    { label: "Travesía", done: 38.4, need: 50 },
    { label: "Nocturno", done: 6.1, need: 10 },
  ];
  return (
    <BrowserFrame url="vector.fdiaznem.com.ar/dashboard/balance">
      <div className="space-y-3">
        {rows.map((r) => {
          const pct = Math.min(100, (r.done / r.need) * 100);
          return (
            <div key={r.label} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 truncate">
                  {r.label}
                </span>
                <span className="data text-[11px] font-bold text-zinc-900 dark:text-white shrink-0">
                  {r.done.toFixed(1)}
                  <span className="text-zinc-400 dark:text-zinc-600">/{r.need}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-zinc-900 dark:bg-white"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </BrowserFrame>
  );
}

/** Copiloto IA — the WhatsApp round trip. */
function CopilotMock() {
  return (
    <BrowserFrame url="wa.me · Copiloto Vector">
      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-zinc-900 dark:bg-white px-3.5 py-2.5 flex items-center gap-2.5">
            <Mic className="w-3.5 h-3.5 text-white dark:text-zinc-900 shrink-0" />
            <span className="flex items-end gap-0.5 h-4">
              {[5, 9, 14, 7, 11, 6, 12, 8].map((h, i) => (
                <span
                  key={i}
                  className="w-0.5 rounded-full bg-white/60 dark:bg-zinc-900/60"
                  style={{ height: `${h}px` }}
                />
              ))}
            </span>
            <span className="data text-[10px] text-white/70 dark:text-zinc-900/70">0:12</span>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-zinc-100 dark:bg-white/[0.06] px-3.5 py-3 space-y-2">
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Cargué el vuelo. ¿Confirmás?
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="data text-[11px] font-bold text-zinc-900 dark:text-white">SADM</span>
              <Plane className="w-3 h-3 text-zinc-400 dark:text-zinc-600" />
              <span className="data text-[11px] font-bold text-zinc-900 dark:text-white">SAEZ</span>
              <span className="ml-auto data text-[11px] font-bold text-zinc-900 dark:text-white">1.4 h</span>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/** Meteorología — raw METAR plus the decoded read-out. */
function WeatherMock() {
  const cells = [
    { k: "Viento", v: "180° 9kt" },
    { k: "Visib.", v: "6km" },
    { k: "Techo", v: "CAVOK" },
    { k: "QNH", v: "1012" },
  ];
  return (
    <BrowserFrame url="vector.fdiaznem.com.ar/dashboard/route-weather">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="eyebrow">Estación</p>
            <p className="data text-lg font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">
              SADM
            </p>
          </div>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-500">
            VMC
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {cells.map((c) => (
            <div key={c.k}>
              <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {c.k}
              </p>
              <p className="data text-[11px] font-bold text-zinc-900 dark:text-white mt-0.5">{c.v}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-zinc-100 dark:bg-white/[0.06] px-3 py-2">
          <p className="data text-[9px] leading-relaxed text-zinc-500 dark:text-zinc-400 break-all">
            <span className="font-bold text-zinc-900 dark:text-white">METAR</span>{" "}
            SADM 011900Z 18009KT CAVOK 20/12 Q1012
          </p>
        </div>
      </div>
    </BrowserFrame>
  );
}

const MOCKS = [LogFlightMock, PcaMock, CopilotMock, WeatherMock];

/** Picks the mock matching a feature's position in the landing list. */
export default function FeatureMock({ index }: { index: number }) {
  const Mock = MOCKS[index % MOCKS.length];
  return <Mock />;
}
