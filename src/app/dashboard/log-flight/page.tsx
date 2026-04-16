import { apiFetch } from "@/lib/api";
import { Aircraft } from "@/types";
import Link from "next/link";
import FlightLogForm from "@/components/dashboard/FlightLogForm";
import LiveSessionController from "@/components/dashboard/LiveSessionController";
import { ChevronLeft } from "lucide-react";

import { redirect } from "next/navigation";

async function getData() {
  const [acRes, sessionRes] = await Promise.all([
    apiFetch("/aircraft"),
    apiFetch("/flight-helper/session")
  ]);

  if (acRes.status === 401 || sessionRes.status === 401) {
    console.log("LogFlightPage: 401 Unauthorized. Redirecting to logout...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }
  
  const aircraft: Aircraft[] = acRes.ok ? await acRes.json() : [];
  const session = sessionRes.ok ? await sessionRes.json() : { active: false };
  
  return { aircraft, session };
}

export default async function LogFlightPage() {
  const { aircraft, session } = await getData();

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full max-w-4xl mx-auto pb-20 px-2 pt-4 md:pt-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8">
        <div className="space-y-2 md:space-y-4">
          <div className="h-px w-8 md:w-12 bg-zinc-200 dark:bg-white/20" />
          <div className="flex items-center space-x-3 md:space-x-4">
            <Link href="/dashboard" className="p-2 md:p-3 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors group bg-white dark:bg-[#111111] shadow-sm border border-zinc-200 dark:border-white/10 md:border-transparent md:bg-transparent md:shadow-none">
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white" />
            </Link>
            <h2 className="text-4xl md:text-6xl font-space-grotesk font-bold tracking-tighter text-zinc-900 dark:text-white leading-none">Registrar</h2>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.4em] ml-14 md:ml-16">Operaciones de Vuelo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <FlightLogForm aircraft={aircraft} />
        </div>
        
        <div className="lg:col-span-1 order-1 lg:order-2 space-y-6 md:space-y-8">
          <LiveSessionController aircraft={aircraft} activeSession={session} />
          
          <div className="p-8 md:p-10 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-[2rem] md:rounded-[2.5rem] shadow-cal dark:shadow-none space-y-3 md:space-y-4 hidden lg:block">
            <h4 className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Ayuda Operativa</h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-[10px] md:text-xs font-bold leading-relaxed uppercase tracking-widest">
              Usa el cronómetro para un registro preciso. Al finalizar, los tiempos se sincronizarán con tu bitácora.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
