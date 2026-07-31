import { apiFetch } from "@/lib/api";
import { Aircraft, Profile, FlightPack, PilotDocument } from "@/types";
import { Plane, User, Package, CalendarClock } from "lucide-react";
import ProfileForm from "@/components/dashboard/ProfileForm";
import AircraftCard from "@/components/dashboard/AircraftCard";
import FlightPackCard from "@/components/dashboard/FlightPackCard";
import AircraftForm from "@/components/dashboard/AircraftForm";
import FlightPackForm from "@/components/dashboard/FlightPackForm";
import DocumentsManager from "@/components/dashboard/DocumentsManager";
import PageHeader from "@/components/dashboard/PageHeader";

import { redirect } from "next/navigation";

async function getSettingsData() {
  const [profilesRes, aircraftRes, packsRes, documentsRes] = await Promise.all([
    apiFetch("/profiles"),
    apiFetch("/aircraft"),
    apiFetch("/flight-packs"),
    apiFetch("/documents")
  ]);

  if (profilesRes.status === 401 || aircraftRes.status === 401 || packsRes.status === 401) {
    console.log("SettingsPage: 401 Unauthorized. Redirecting to logout...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }

  const profiles: Profile[] = profilesRes.ok ? await profilesRes.json() : [];
  const aircraft: Aircraft[] = aircraftRes.ok ? await aircraftRes.json() : [];
  const packs: FlightPack[] = packsRes.ok ? await packsRes.json() : [];
  const documents: PilotDocument[] = documentsRes.ok ? await documentsRes.json() : [];

  return { profile: profiles[0] || null, aircraft, packs, documents };
}

export default async function SettingsPage() {
  const { profile, aircraft, packs, documents } = await getSettingsData();
  const cma = documents.find(doc => doc.kind === "cma");

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <PageHeader eyebrow="Perfil, vencimientos, aeronaves y packs de horas" title="Configuración" />

      {/* Profile Section */}
      <section className="space-y-4 md:space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
            <User className="w-4 h-4 md:w-5 md:h-5 text-aviation-cyan dark:text-aviation-blue-dark" />
          </div>
          <h3 className="text-lg md:text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tight">Perfil del piloto</h3>
        </div>

        <div className="bg-white dark:bg-white/[0.02] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none hover:shadow-lg dark:hover:bg-white/[0.04] transition-all">
          <ProfileForm profile={profile} cmaExpiry={cma?.expiry_date} />
        </div>
      </section>

      {/* Documents / expiry tracker */}
      <section className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <CalendarClock className="w-4 h-4 md:w-5 md:h-5 text-aviation-cyan dark:text-aviation-blue-dark" />
            </div>
            <h3 className="text-lg md:text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tight">Vencimientos</h3>
          </div>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-zinc-200 dark:border-white/10 shadow-sm">
            {documents.length} cargados
          </span>
        </div>

        <DocumentsManager documents={documents} todayIso={new Date().toISOString().slice(0, 10)} />
      </section>

      {/* Aircraft + Packs side by side on wide screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-10 items-start">
        {/* Aircraft Management Section */}
        <section className="space-y-4 md:space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
                <Plane className="w-4 h-4 md:w-5 md:h-5 text-aviation-cyan dark:text-aviation-blue-dark" />
              </div>
              <h3 className="text-lg md:text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tight">Mis aeronaves</h3>
            </div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-zinc-200 dark:border-white/10 shadow-sm">
              {aircraft.length} registradas
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {aircraft.length > 0 ? (
              aircraft.map(ac => (
                <AircraftCard key={ac.id} aircraft={ac} />
              ))
            ) : (
              <div className="col-span-full bg-white dark:bg-white/[0.02] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] text-center border border-dashed border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none hover:shadow-md dark:hover:bg-white/[0.04] transition-all">
                <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">No hay aeronaves registradas aún.</p>
              </div>
            )}
          </div>

          <AircraftForm />
        </section>

        {/* Flight Packs Section */}
        <section className="space-y-4 md:space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
                <Package className="w-4 h-4 md:w-5 md:h-5 text-aviation-cyan dark:text-aviation-blue-dark" />
              </div>
              <h3 className="text-lg md:text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tight">Packs de horas</h3>
            </div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-zinc-200 dark:border-white/10 shadow-sm">
              {packs.length} activos
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {packs.length > 0 ? (
              packs.map(pack => (
                <FlightPackCard key={pack.id} pack={pack} aircraft={aircraft} />
              ))
            ) : (
              <div className="bg-white dark:bg-white/[0.02] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] text-center border border-dashed border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none hover:shadow-md dark:hover:bg-white/[0.04] transition-all">
                <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">No hay packs de horas registrados aún.</p>
              </div>
            )}
          </div>

          <FlightPackForm aircraft={aircraft} />
        </section>
      </div>
    </div>
  );
}
