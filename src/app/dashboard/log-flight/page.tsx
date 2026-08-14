import { apiFetch } from "@/lib/api";
import { Aircraft } from "@/types";
import Link from "next/link";
import FlightLogForm from "@/components/dashboard/FlightLogForm";
import LiveSessionController from "@/components/dashboard/LiveSessionController";
import SinAeronaves from "@/components/dashboard/SinAeronaves";
import { parsePrefill } from "@/lib/prefill";
import { ChevronLeft } from "lucide-react";

import { redirect } from "next/navigation";

async function getData() {
  // Order matters and has already bitten once: `/logbooks` was added in the
  // middle of this array without moving the names, so `logbooks` got the session
  // object and the page died on `logbooks.find is not a function`. It only showed
  // up on a direct hit or a refresh — coming from the "+" renders the intercepted
  // route at @modal/(.)log-flight, which fetches its own data and was fine.
  const [acRes, lbRes, sessionRes] = await Promise.all([
    apiFetch("/aircraft"),
    apiFetch("/logbooks"),
    apiFetch("/flight-helper/session")
  ]);

  if (acRes.status === 401 || sessionRes.status === 401) {
    console.log("LogFlightPage: 401 Unauthorized. Redirecting to logout...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }
  
  const aircraft: Aircraft[] = acRes.ok ? await acRes.json() : [];
  const logbooks = lbRes.ok ? await lbRes.json() : [];
  const session = sessionRes.ok ? await sessionRes.json() : { active: false };
  
  return { aircraft, session, logbooks };
}

interface PageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}

export default async function LogFlightPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? (searchParams instanceof Promise ? await searchParams : searchParams) : {};
  // Un solo parser, compartido con `@modal/(.)log-flight`. Este par ya derivó una
  // vez; la duplicación se borró en vez de comentarse por tercera vez.
  const { initialData: prefillData, plannedId } = parsePrefill(resolvedParams);

  const { aircraft, session, logbooks } = await getData();

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8">
        <div className="space-y-2 md:space-y-4">
          <div className="flex items-center space-x-3 md:space-x-4">
            <Link href="/dashboard" className="p-2 md:p-3 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors group bg-white dark:bg-[#111111] shadow-sm border border-zinc-200 dark:border-white/10 md:border-transparent md:bg-transparent md:shadow-none">
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white" />
            </Link>
            <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tighter text-zinc-900 dark:text-white leading-none">Registrar</h2>
          </div>
          <p className="eyebrow ml-14 md:ml-16">Operaciones de vuelo</p>
        </div>

        <Link 
          href="/dashboard/log-flight/import" 
          className="border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-900 dark:text-white font-semibold text-sm px-5 py-3.5 rounded-xl transition-all shadow-sm active:scale-[0.98] self-start md:self-auto flex items-center space-x-2"
        >
          <span>Importar desde PDF (Beta)</span>
        </Link>
      </div>

      {/*
        Sin aeronaves no hay nada que completar: el select queda vacío y el
        `required` bloquea el submit sin salida. La cabecera se mantiene arriba
        para no dejar al piloto sin el botón de volver.

        Este branch tiene que existir igual en `@modal/(.)log-flight/page.tsx`.
      */}
      {aircraft.length === 0 ? (
        <SinAeronaves />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <FlightLogForm aircraft={aircraft} logbooks={logbooks} initialData={prefillData} plannedId={plannedId} />
        </div>
        
        <div className="lg:col-span-1 order-1 lg:order-2 space-y-6 md:space-y-8">
          <LiveSessionController aircraft={aircraft} activeSession={session} />
          
          <div className="p-8 md:p-10 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-[2rem] md:rounded-[2.5rem] shadow-cal dark:shadow-none space-y-3 md:space-y-4 hidden lg:block">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Ayuda operativa</h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-relaxed">
              Usa el cronómetro para un registro preciso. Al finalizar, los tiempos se sincronizarán con tu bitácora.
            </p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
