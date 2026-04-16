import { apiFetch } from "@/lib/api";
import { Aircraft, Profile, FlightPack } from "@/types";
import { addAircraft } from "@/actions/flight";
import { createFlightPack } from "@/actions/flight-pack";
import { Plane, User, Plus, Shield, CreditCard, ChevronRight, Package } from "lucide-react";
import ProfileForm from "@/components/dashboard/ProfileForm";
import AircraftCard from "@/components/dashboard/AircraftCard";
import FlightPackCard from "@/components/dashboard/FlightPackCard";

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
        <div className="bg-white dark:bg-white/[0.02] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none hover:shadow-lg dark:hover:bg-white/[0.04] transition-all space-y-6 md:space-y-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <Plus className="w-4 h-4 text-white dark:text-zinc-900" />
            </div>
            <h4 className="text-xs md:text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Cargar Nuevo Pack</h4>
          </div>
          
          <form action={createFlightPack} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ml-1 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">Nombre del Pack</label>
                <input 
                  name="name" 
                  placeholder="ej. Pack 50h Cessna" 
                  required 
                  className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white/50 transition-all font-bold placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
                />
              </div>
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ml-1 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">Total de Horas</label>
                <input 
                  name="total_hours" 
                  type="number"
                  step="0.1"
                  placeholder="ej. 50" 
                  required 
                  className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white/50 transition-all font-bold placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
                />
              </div>
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ml-1 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">Fecha de Inicio</label>
                <input 
                  name="start_date" 
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required 
                  className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white/50 transition-all font-bold [color-scheme:light] dark:[color-scheme:dark]" 
                />
              </div>
              <div className="space-y-2 md:col-span-2 group">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ml-1">Aeronaves Válidas</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  {aircraft.map(ac => (
                    <label key={ac.id} className="flex items-center space-x-3 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 p-4 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-all">
                      <input 
                        type="checkbox" 
                        name="aircraft_ids" 
                        value={ac.id} 
                        className="w-5 h-5 rounded border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 text-zinc-900 dark:text-purple-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{ac.registration}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="w-full md:w-auto bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold text-[10px] uppercase tracking-[0.2em] py-5 px-10 rounded-2xl transition-all active:scale-[0.98] shadow-cal-highlight dark:shadow-xl flex items-center justify-center"
            >
              Cargar Pack
            </button>
          </form>
        </div>
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
        <div className="bg-white dark:bg-white/[0.02] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none hover:shadow-lg dark:hover:bg-white/[0.04] transition-all space-y-6 md:space-y-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <Plus className="w-4 h-4 text-white dark:text-zinc-900" />
            </div>
            <h4 className="text-xs md:text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Agregar Nueva Aeronave</h4>
          </div>
          
          <form action={addAircraft} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ml-1 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">Matrícula</label>
                <input 
                  name="registration" 
                  placeholder="ej. LV-ABC" 
                  required 
                  className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-blue-500/20 focus:border-zinc-900 dark:focus:border-blue-500/50 transition-all font-bold uppercase placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
                />
              </div>
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ml-1 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">Marca y Modelo</label>
                <input 
                  name="type" 
                  placeholder="ej. Cessna 150" 
                  required 
                  className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-blue-500/20 focus:border-zinc-900 dark:focus:border-blue-500/50 transition-all font-bold placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
                />
              </div>
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ml-1 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">Tipo ICAO</label>
                <input 
                  name="icao" 
                  placeholder="ej. C150" 
                  required 
                  className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-blue-500/20 focus:border-zinc-900 dark:focus:border-blue-500/50 transition-all font-bold uppercase placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
                />
              </div>
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ml-1 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">Categoría (ANAC)</label>
                <div className="relative">
                  <select 
                    name="type_acft"
                    className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-blue-500/20 focus:border-zinc-900 dark:focus:border-blue-500/50 transition-all font-bold appearance-none cursor-pointer"
                  >
                    <option value="MONT-T" className="dark:bg-zinc-900">MONT-T (Monomotor Terrestre)</option>
                    <option value="MULT-T" className="dark:bg-zinc-900">MULT-T (Multimotor Terrestre)</option>
                    <option value="MONT-H" className="dark:bg-zinc-900">MONT-H (Monomotor Hidroavión)</option>
                    <option value="MULT-H" className="dark:bg-zinc-900">MULT-H (Multimotor Hidroavión)</option>
                  </select>
                  <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 dark:text-zinc-400 rotate-90 pointer-events-none" />
                </div>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="w-full md:w-auto bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold text-[10px] uppercase tracking-[0.2em] py-5 px-10 rounded-2xl transition-all active:scale-[0.98] shadow-cal-highlight dark:shadow-xl flex items-center justify-center"
            >
              Registrar Aeronave
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
