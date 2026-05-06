import { apiFetch } from "@/lib/api";
import { Aircraft, Profile, FlightPack } from "@/types";
import { Plane, User, Shield, CreditCard, ChevronRight, Package } from "lucide-react";
import ProfileForm from "@/components/dashboard/ProfileForm";
import AircraftCard from "@/components/dashboard/AircraftCard";
import FlightPackCard from "@/components/dashboard/FlightPackCard";
import AircraftForm from "@/components/dashboard/AircraftForm";
import FlightPackForm from "@/components/dashboard/FlightPackForm";

import { redirect } from "next/navigation";

async function getSettingsData() {
  const [profilesRes, aircraftRes, packsRes] = await Promise.all([
    apiFetch("/profiles"),
    apiFetch("/aircraft"),
    apiFetch("/flight-packs")
  ]);

  if (profilesRes.status === 401 || aircraftRes.status === 401 || packsRes.status === 401) {
    console.log("SettingsPage: 401 Unauthorized. Redirecting to logout...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }

  const profiles: Profile[] = profilesRes.ok ? await profilesRes.json() : [];
  const aircraft: Aircraft[] = aircraftRes.ok ? await aircraftRes.json() : [];
  const packs: FlightPack[] = packsRes.ok ? await packsRes.json() : [];

  return { profile: profiles[0] || null, aircraft, packs };
}

export default async function SettingsPage() {
  const { profile, aircraft, packs } = await getSettingsData();

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto pb-20">
      <div className="space-y-2 px-2 pt-4 md:pt-8">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-space-grotesk font-bold tracking-tight text-zinc-900 dark:text-white leading-none">Configuración</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] leading-relaxed">Gestión de Perfil, Aeronaves y Packs de Horas</p>
      </div>

      {/* Profile Section */}
      <section className="space-y-4 md:space-y-6">
        <div className="flex items-center space-x-3 px-2">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
            <User className="w-4 h-4 md:w-5 md:h-5 text-white dark:text-zinc-900" />
          </div>
          <h3 className="text-lg md:text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white uppercase tracking-tighter">Perfil del Piloto</h3>
        </div>
        
        <div className="bg-white dark:bg-white/[0.02] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none hover:shadow-lg dark:hover:bg-white/[0.04] transition-all">
          <ProfileForm profile={profile} />
        </div>
      </section>

      {/* Flight Packs Section */}
      <section className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 px-2">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <Package className="w-4 h-4 md:w-5 md:h-5 text-white dark:text-zinc-900" />
            </div>
            <h3 className="text-lg md:text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white uppercase tracking-tighter">Packs de Horas</h3>
          </div>
          <span className="self-start md:self-auto text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-zinc-200 dark:border-white/10 shadow-sm">
            {packs.length} activos
          </span>
        </div>

        {/* Existing Packs List */}
        <div className="grid grid-cols-1 gap-4">
          {packs.length > 0 ? (
            packs.map(pack => (
              <FlightPackCard key={pack.id} pack={pack} aircraft={aircraft} />
            ))
          ) : (
             <div className="col-span-full bg-white dark:bg-white/[0.02] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] text-center border border-dashed border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none hover:shadow-md dark:hover:bg-white/[0.04] transition-all">
               <p className="text-zinc-500 dark:text-zinc-400 font-bold text-xs md:text-sm uppercase tracking-widest">No hay packs de horas registrados aún.</p>
             </div>
          )}
        </div>

        {/* Add New Pack Form */}
        <FlightPackForm aircraft={aircraft} />
      </section>

      {/* Aircraft Management Section */}
      <section className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 px-2">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <Plane className="w-4 h-4 md:w-5 md:h-5 text-white dark:text-zinc-900" />
            </div>
            <h3 className="text-lg md:text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white uppercase tracking-tighter">Mis Aeronaves</h3>
          </div>
          <span className="self-start md:self-auto text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-zinc-200 dark:border-white/10 shadow-sm">
            {aircraft.length} registradas
          </span>
        </div>

        {/* Existing Aircraft List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aircraft.length > 0 ? (
            aircraft.map(ac => (
              <AircraftCard key={ac.id} aircraft={ac} />
            ))
          ) : (
             <div className="col-span-full bg-white dark:bg-white/[0.02] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] text-center border border-dashed border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none hover:shadow-md dark:hover:bg-white/[0.04] transition-all">
               <p className="text-zinc-500 dark:text-zinc-400 font-bold text-xs md:text-sm uppercase tracking-widest">No hay aeronaves registradas aún.</p>
             </div>
          )}
        </div>

        {/* Add New Aircraft Form */}
        <AircraftForm />
      </section>
    </div>
  );
}
