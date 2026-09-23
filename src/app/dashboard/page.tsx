import { Activity, ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { apiFetch } from "@/lib/api";
import { Flight, Aircraft, FlightPack, PilotDocument, Logbook, PlannedFlight, Transaction, Profile } from "@/types";
import ChangelogNotice from "@/components/dashboard/ChangelogNotice";
import VuelosPendientes from "@/components/dashboard/VuelosPendientes";
import PrimerosPasos from "@/components/dashboard/PrimerosPasos";
import FlightStatusCard from "@/components/dashboard/FlightStatusCard";
import ProximoVencimiento from "@/components/dashboard/ProximoVencimiento";
import PCATracker from "@/components/dashboard/PCATracker";
import SaldoCard from "@/components/dashboard/SaldoCard";
import FlightPackWidget from "@/components/dashboard/FlightPackWidget";
import RecentFlights from "@/components/dashboard/RecentFlights";
import TuRedInicio from "@/components/social/TuRedInicio";
import { listPlannedFlights } from "@/actions/planned-flight";
import { estadoOnboarding } from "@/lib/onboarding";
import { soloVolados } from "@/lib/simulador";
import { costosPorVuelo, gastoDelMes } from "@/lib/costos";
import { openingTotals } from "@/lib/summary";
import { horasPorMes } from "@/lib/tendencia";

/**
 * Los endpoints que necesita esta pantalla, en paralelo.
 *
 * Estaban encadenados sin que ninguno dependiera del anterior. Medido contra
 * producción, una llamada trivial al backend tarda ~547 ms: en serie es cerca de un
 * segundo y medio de espera que se puede colapsar al tiempo de la más lenta.
 *
 * `Promise.all` y no `allSettled`: si `/dashboard` falla, la página no tiene nada
 * que mostrar igual. Los otros dos degradan solos a lista vacía más abajo.
 *
 * Las métricas propias ya no se piden acá: se mudaron al Resumen con el resto de
 * los números sobre lo que se voló.
 */
async function getDashboardData() {
  const [response, logbooksResponse, planned] = await Promise.all([
    apiFetch("/dashboard"),
    apiFetch("/logbooks"),
    // Aparte y no como extensión de `/dashboard`: ese endpoint ya devuelve la
    // bitácora entera sin paginar. `listPlannedFlights` degrada a lista vacía sola,
    // así que un backend sin la migración 009 no rompe esta pantalla.
    listPlannedFlights(),
  ]);

  if (response.status === 401) {
    console.log("Dashboard: 401 Unauthorized. Redirecting to logout...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }

  if (!response.ok) {
    // Nada de esto es "no hay": es "no pudimos preguntar". `unavailable` con
    // todas las secciones para que abajo nadie saque conclusiones de las listas
    // vacías. Ver `pilotStatus`.
    return {
      flights: [], aircraft: [], profile: null, session: { active: false }, packs: [],
      documents: [], logbooks: [] as Logbook[], planned: [] as PlannedFlight[],
      transactions: [] as Transaction[], balance: 0,
      unavailable: ["profile", "aircraft", "flights", "session", "packs", "transactions", "audit", "documents"],
    };
  }

  const data = await response.json();

  // Logbooks are not in the /dashboard payload yet; fetched alongside so the
  // totals on this page can include carried-forward hours.
  const logbooks: Logbook[] = logbooksResponse.ok ? await logbooksResponse.json() : [];

  return {
    logbooks,
    planned,
    /**
     * Qué secciones del payload no se pudieron leer. El backend las nombra en vez
     * de mandar `[]` a secas: una consulta que falla y una tabla vacía llegaban
     * idénticas, y el semáforo le decía "no tenés certificado médico" a pilotos
     * que sí lo tienen cargado.
     */
    unavailable: (data.unavailable as string[]) || [],
    flights: data.flights || [],
    aircraft: data.aircraft || [],
    profile: (data.profile as Profile) || null,
    session: data.session || { active: false },
    packs: (data.packs as FlightPack[]) || [],
    documents: (data.documents as PilotDocument[]) || [],
    // Son lo que hace posible mostrar cuánto salió cada vuelo. Ver `src/lib/costos.ts`.
    transactions: (data.transactions as Transaction[]) || [],
    /** Suma de las transacciones, calculada en el backend. Ver `SaldoCard`. */
    balance: typeof data.balance === "number" ? data.balance : 0,
  };
}

/**
 * El inicio contesta tres preguntas, y en este orden:
 *
 * 1. **¿Puedo volar hoy?** — el semáforo de RAAC 61.060 y el próximo vencimiento.
 * 2. **¿Cuánto me falta?** — el tracker de la PCA, o las horas totales si la
 *    licencia no va camino a la comercial.
 * 3. **¿Cuánto me queda?** — el saldo con la escuela, o las horas del pack.
 *
 * Y cierra con lo último que se voló. Todo lo demás que vivía acá —gráficos, heatmap,
 * récords, promedios, métricas propias— se mudó al Resumen, que es donde se va a
 * mirar lo que ya pasó; el clima, a "Preparar vuelo"; y la salud del libro, a la
 * pestaña Auditoría, que lleva el contador en la barra. Eran más de una docena de
 * bloques para alguien que abre la app a ver si puede volar el sábado.
 */
export default async function Dashboard() {
  const { flights: bitacora, aircraft, profile, session, packs, documents, logbooks, planned, unavailable, transactions, balance } =
    await getDashboardData();

  /*
    `bitacora` es el libro entero; `flights` es lo que se voló.

    Una sesión de simulador es una fila del libro —el de papel la tiene— pero no es un
    vuelo: no cuenta para la vigencia de 61.060 ni para el gasto del mes. Las dos
    excepciones se pasan a mano y están marcadas donde se usan: el tracker de la PCA,
    que necesita las horas de instrucción del simulador y hace su propio corte, y los
    últimos vuelos, que muestran el libro.
  */
  const flights = soloVolados(bitacora as Flight[], aircraft as Aircraft[]);
  const todayIso = new Date().toISOString().slice(0, 10);

  /** Si esa sección del payload se pudo leer. Ver `unavailable` más arriba. */
  const disponible = (seccion: string) => !unavailable.includes(seccion);
  const documentosDisponibles = disponible("documents");

  // Cuánto salió cada vuelo, del cobro que quedó registrado. Vacío en modo `packs`,
  // donde el vuelo consume horas y no pesos. Ver `src/lib/costos.ts`.
  const costos = costosPorVuelo(transactions as Transaction[]);
  const gastoMes = gastoDelMes(flights as Flight[], costos, todayIso.slice(0, 7));

  /*
    El saldo sólo se muestra si se sabe. Con la consulta de transacciones caída, o sin
    un solo movimiento cargado, el backend manda cero — y "$ 0" se leería como "no
    tenés plata" cuando lo cierto es "no lo sabemos".
  */
  const saldoConocido =
    profile?.tracking_mode === "balance" && disponible("transactions") && transactions.length > 0;

  const licencia = profile?.license_type?.toUpperCase() ?? "";
  const vaALaComercial = (licencia.includes("PPA") || licencia.includes("PRIVADO")) && !licencia.includes("PCA");

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 pt-4">
        <div className="space-y-2 md:space-y-3">
          <p className="eyebrow flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            <span>Centro de operaciones</span>
          </p>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tighter text-zinc-900 dark:text-white leading-none">
            {profile?.first_name || "Comandante"}
          </h2>
        </div>

        {session.active ? (
          <Link
            href="/dashboard/log-flight"
            className="inline-flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-full bg-green-500/10 border border-green-500/20 hover:bg-green-500/15 transition-colors self-start md:self-auto"
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 animate-blip" />
            </span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              Vuelo en curso · {(aircraft as Aircraft[]).find((a) => a.id === session.session?.aircraft_id)?.registration || "Unknown"}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          </Link>
        ) : (
          // La acción principal de la app, con su nombre. El "+" del rail y de la
          // píldora del teléfono no dicen qué hacen, y un alumno nuevo no tiene por
          // qué adivinarlo.
          <Link
            href="/dashboard/log-flight"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold shadow-cal-highlight dark:shadow-none hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors self-start md:self-auto"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Registrar vuelo
          </Link>
        )}
      </section>

      {/* 1. ¿Puedo volar hoy? — las cuatro condiciones de RAAC 61.060(a)(1), y
          debajo lo que vence primero. Va arriba de todo porque es la única pregunta
          de esta pantalla con consecuencias antes de despegar. */}
      <div className="space-y-3">
        <FlightStatusCard
          flights={flights as Flight[]}
          aircraft={aircraft as Aircraft[]}
          documents={documents as PilotDocument[]}
          profile={profile}
          documentosDisponibles={documentosDisponibles}
        />
        {documentosDisponibles && <ProximoVencimiento documents={documents as PilotDocument[]} />}
      </div>

      {/* "¿Volaste esto?" — el vuelo que el piloto programó y cuya fecha ya pasó.
          Es lo único de la pantalla, además del semáforo, que le pide algo: un vuelo
          sin registrar es un agujero en el libro. "Hoy" baja resuelto desde el
          server, como en el resumen y el heatmap. */}
      <VuelosPendientes
        planned={planned as PlannedFlight[]}
        aircraft={aircraft as Aircraft[]}
        todayIso={todayIso}
        tieneVuelos={bitacora.length > 0}
      />

      {/* Desaparece solo cuando los cuatro pasos están hechos. Los datos ya vienen
          del Promise.all de arriba: no agrega ni un viaje al backend. */}
      <PrimerosPasos
        // `null` y no `false` en cada paso cuya consulta falló: el paso no se
        // dibuja, en vez de pedirle al piloto que cargue algo que ya tiene.
        //
        // **Los cuatro, no sólo el CMA.** El 2026-08-17 una request perdió siete
        // de las ocho consultas y el checklist le marcó tres pasos en falso a un
        // piloto que tenía todo cargado.
        estado={estadoOnboarding({
          profile,
          perfilDisponible: disponible("profile"),
          tieneCma: documentosDisponibles
            ? (documents as PilotDocument[]).some((d) => d.kind === "cma")
            : null,
          aeronaves: disponible("aircraft") ? aircraft.length : null,
          vuelos: disponible("flights") ? flights.length : null,
        })}
      />

      <ChangelogNotice />

      {/* 2. ¿Cuánto me falta? — Recibe el libro entero, no `flights`: las horas de
          instrumento en simulador cuentan para el requisito, y el tracker hace su
          propio corte con `separarSimuladores` para que no cuenten para nada más. */}
      {vaALaComercial ? (
        <PCATracker
          flights={bitacora}
          logbooks={logbooks as Logbook[]}
          aircraft={aircraft as Aircraft[]}
          todayIso={todayIso}
        />
      ) : (
        <HorasTotales flights={flights as Flight[]} logbooks={logbooks as Logbook[]} todayIso={todayIso} />
      )}

      {/* 3. ¿Cuánto me queda? — pesos para quien lleva saldo, horas para quien lleva
          packs. Ninguno de los dos se dibuja si no tiene nada que decir. */}
      {profile?.tracking_mode === "balance" ? (
        saldoConocido && <SaldoCard saldo={balance} gasto={gastoMes} />
      ) : (
        <FlightPackWidget packs={packs} />
      )}

      {/* Cierra con el libro mismo. Todo lo de arriba es estado; esto es lo último
          que pasó. Una sesión de simulador es un renglón como cualquier otro y
          esconderla acá sería esconder algo que el piloto acaba de cargar. */}
      <RecentFlights flights={bitacora as Flight[]} aircraft={aircraft as Aircraft[]} costos={costos} limit={3} />

      {/* "Tu red": la única tarjeta que no contesta una de las tres preguntas, por
          decisión de Federico. Chica, al final, y por `Suspense`: el feed es un viaje
          más al backend y nunca puede demorar el "¿puedo volar hoy?". */}
      <Suspense fallback={null}>
        <TuRedInicio />
      </Suspense>
    </div>
  );
}

/**
 * Para quien no va camino a la PCA —ya es comercial, o su licencia no es de
 * privado—, la segunda pregunta no es "cuánto me falta" sino "cuánto llevo".
 *
 * Suma las horas de apertura de los libros: un piloto que migró 500 horas del libro de
 * papel no puede ver 46. Es el mismo total que el Resumen, que es adonde lleva.
 */
function HorasTotales({ flights, logbooks, todayIso }: { flights: Flight[]; logbooks: Logbook[]; todayIso: string }) {
  const voladas = flights.reduce((acc, f) => acc + f.duration, 0);
  const total = voladas + openingTotals(logbooks).totalHours;
  // Una cuenta nueva no tiene nada que contar todavía, y de eso ya se ocupa
  // `PrimerosPasos`. Un cero grande acá sería ruido.
  if (total === 0) return null;

  const hace30 = new Date(Date.parse(`${todayIso}T00:00:00Z`) - 30 * 86_400_000).toISOString().slice(0, 10);
  const ultimos30 = flights.filter((f) => f.date >= hace30).reduce((acc, f) => acc + f.duration, 0);

  return (
    <Link
      href="/dashboard/summary"
      className="group flex items-end justify-between gap-6 rounded-[1.75rem] border p-5 md:p-6 bg-zinc-900 dark:bg-[#111111] border-zinc-900 dark:border-white/10 shadow-xl hover:bg-zinc-800 dark:hover:bg-[#161616] transition-colors"
    >
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/50">Horas totales</p>
        <p className="data text-3xl md:text-4xl font-bold leading-none mt-2 text-white">
          {total.toFixed(1)}
          <span className="text-base font-medium ml-1 text-white/50">hs</span>
        </p>
        <p className="text-[11px] text-white/50 mt-2">+{ultimos30.toFixed(1)} hs en 30 días · Ver resumen</p>
      </div>
      <Sparkline points={horasPorMes(flights, todayIso).map((m) => m.hours)} />
    </Link>
  );
}

/**
 * Six months of hours as a bare polyline.
 *
 * Hand-rolled SVG rather than pulling the chart library into the first paint to
 * draw six points.
 *
 * Coordinates are rounded before they reach the path — Math on floats
 * serializes differently in Node and Chrome, which is a hydration mismatch. The
 * radial dial on the summary page already got caught by exactly this.
 */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2 || points.every((p) => p === 0)) return null;

  const max = Math.max(...points, 1);
  const w = 72;
  const h = 20;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - (p / max) * h).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-[72px] h-5 overflow-visible shrink-0" aria-hidden="true">
      <path d={d} fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="stroke-white/45" />
    </svg>
  );
}
