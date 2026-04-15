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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full max-w-4xl mx-auto pb-20 px-2 pt-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="h-px w-12 bg-zinc-200" />
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="p-2 hover:bg-zinc-100 rounded-full transition-colors group">
              <ChevronLeft className="w-6 h-6 text-zinc-500 group-hover:text-zinc-900" />
            </Link>
            <h2 className="text-6xl font-space-grotesk font-bold tracking-tighter text-zinc-900 leading-none">Registrar</h2>
          </div>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.4em] ml-14">Operaciones de Vuelo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <FlightLogForm aircraft={aircraft} />
        </div>
        
        <div className="lg:col-span-1 order-1 lg:order-2 space-y-8">
          <LiveSessionController aircraft={aircraft} activeSession={session} />
          
          <div className="p-10 bg-white border border-zinc-200 rounded-[2.5rem] shadow-sm space-y-4">
            <h4 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">Ayuda Operativa</h4>
            <p className="text-zinc-500 text-xs font-bold leading-relaxed uppercase tracking-widest">
              Usa el cronómetro para un registro preciso. Al finalizar, los tiempos se sincronizarán con tu bitácora.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
