"use client";

import { useState, useTransition } from "react";
import { Profile, Aircraft, FlightPack, Transaction, Flight } from "@/types";
import { toggleTrackingMode, depositBalance, updateAircraftCost } from "@/actions/balance";
import { 
  Wallet, Coins, ArrowUpRight, ArrowDownRight, 
  Plane, Package, Check, X, Edit2, Loader2, Plus,
  ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BalanceClientProps {
  profile: Profile | null;
  aircraft: Aircraft[];
  packs: FlightPack[];
  initialTransactions: Transaction[];
  initialBalance: number;
  flights: Flight[];
}

export default function BalanceClient({
  profile,
  aircraft,
  packs,
  initialTransactions,
  initialBalance,
  flights,
}: BalanceClientProps) {
  const [isPending, startTransition] = useTransition();
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpDesc, setTopUpDesc] = useState("");
  const [expandedPackId, setExpandedPackId] = useState<string | null>(null);
  
  // Rate Editing state
  const [editingAircraftId, setEditingAircraftId] = useState<string | null>(null);
  const [editingCost, setEditingCost] = useState("");

  const trackingMode = profile?.tracking_mode || "packs";

  const handleToggleMode = (mode: "packs" | "balance") => {
    if (mode === trackingMode) return;
    startTransition(async () => {
      try {
        await toggleTrackingMode(profile?.id || "", mode);
      } catch (err: any) {
        alert(err.message || "Error al cambiar el modo");
      }
    });
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Por favor ingresa un monto válido mayor a cero");
      return;
    }
    
    startTransition(async () => {
      try {
        await depositBalance(amount, topUpDesc);
        setIsTopUpOpen(false);
        setTopUpAmount("");
        setTopUpDesc("");
      } catch (err: any) {
        alert(err.message || "Error al depositar");
      }
    });
  };

  const handleSaveRate = (aircraftId: string) => {
    const cost = parseFloat(editingCost);
    if (isNaN(cost) || cost < 0) {
      alert("Por favor ingresa un costo válido");
      return;
    }

    startTransition(async () => {
      try {
        await updateAircraftCost(aircraftId, cost);
        setEditingAircraftId(null);
        setEditingCost("");
      } catch (err: any) {
        alert(err.message || "Error al actualizar tarifa");
      }
    });
  };

  return (
    <div className="space-y-8 md:space-y-12">
      {/* Mode Switcher Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-1.5">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-space-grotesk font-bold tracking-tight text-zinc-900 dark:text-white leading-none">Balance</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] leading-relaxed">
            Administra tus consumos de vuelo, saldos y packs de horas
          </p>
        </div>

        {/* Premium Tab Selector */}
        <div className="bg-zinc-100 dark:bg-white/5 p-1 rounded-2xl flex items-center border border-zinc-200 dark:border-white/10 relative w-full md:w-auto overflow-hidden self-start md:self-center">
          <button
            onClick={() => handleToggleMode("packs")}
            disabled={isPending}
            className="flex-1 md:flex-none relative px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 z-10 transition-colors duration-300 disabled:opacity-50"
          >
            {trackingMode === "packs" && (
              <motion.div
                layoutId="nav-pill-bg"
                className="absolute inset-0 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-xl shadow-sm"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            <span className={`relative z-10 ${trackingMode === "packs" ? "text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
              Packs de Horas
            </span>
          </button>

          <button
            onClick={() => handleToggleMode("balance")}
            disabled={isPending}
            className="flex-1 md:flex-none relative px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 z-10 transition-colors duration-300 disabled:opacity-50"
          >
            {trackingMode === "balance" && (
              <motion.div
                layoutId="nav-pill-bg"
                className="absolute inset-0 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-xl shadow-sm"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            <span className={`relative z-10 ${trackingMode === "balance" ? "text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
              Saldo en Cuenta ($)
            </span>
          </button>
        </div>
      </div>

      {isPending && (
        <div className="flex items-center justify-center space-x-2 text-zinc-500 text-xs font-bold uppercase tracking-widest px-2 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-900 dark:text-white" />
          <span>Sincronizando estado...</span>
        </div>
      )}

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        
        {/* Left / Center Area: Shows either Packs or Balance Transaction Log */}
        <div className="lg:col-span-2 space-y-8 md:space-y-10">
          
          {trackingMode === "packs" ? (
            <section className="space-y-6">
              <div className="flex items-center space-x-3 px-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-md">
                  <Package className="w-4 h-4 text-white dark:text-zinc-900" />
                </div>
                <h3 className="text-lg md:text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white uppercase tracking-tighter">Packs Activos</h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {packs.length > 0 ? (
                  packs.map((pack) => {
                    const isNegative = pack.remaining_hours < 0;
                    const progress = Math.max(0, Math.min((pack.remaining_hours / pack.total_hours) * 100, 100));
                    return (
                      <div 
                        key={pack.id} 
                        className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-3xl p-6 md:p-8 hover:shadow-md dark:hover:bg-white/[0.04] transition-all flex flex-col justify-between space-y-6"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                              Creado el {new Date(pack.created_at).toLocaleDateString("es-AR")}
                            </span>
                            <h4 className="text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white uppercase tracking-tight mt-1">
                              {pack.name}
                            </h4>
                          </div>
                          <span className={`text-[8px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${pack.is_active ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'}`}>
                            {pack.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Horas Restantes</span>
                            <span className={`text-2xl font-bold font-space-grotesk ${isNegative ? 'text-red-600 dark:text-red-500' : 'text-zinc-900 dark:text-white'}`}>
                              {pack.remaining_hours.toFixed(1)} <span className="text-xs font-bold text-zinc-400">/ {pack.total_hours.toFixed(1)} hs</span>
                            </span>
                          </div>
                          
                          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1 }}
                              className="h-full bg-zinc-900 dark:bg-white rounded-full"
                            />
                          </div>
                        </div>

                        <div className="border-t border-zinc-100 dark:border-white/5 pt-4 flex flex-col space-y-4">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-2">Aeronaves Habilitadas</span>
                            <div className="flex flex-wrap gap-2">
                              {pack.aircraft_ids.map((aid) => {
                                const acft = aircraft.find(a => a.id === aid);
                                return (
                                  <span key={aid} className="text-[9px] font-bold uppercase tracking-widest bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-white/5 shadow-sm">
                                    {acft ? `${acft.registration} (${acft.icao})` : "Aeronave"}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* Consumptions History */}
                          {(() => {
                            const packFlights = flights.filter(f => 
                              f.aircraft_id && 
                              pack.aircraft_ids.includes(f.aircraft_id) && 
                              new Date(f.takeoff) >= new Date(pack.start_date)
                            ).sort((a, b) => new Date(b.takeoff).getTime() - new Date(a.takeoff).getTime());

                            const isExpanded = expandedPackId === pack.id;

                            return (
                              <div className="pt-2 border-t border-zinc-100/50 dark:border-white/5 flex flex-col w-full">
                                <button
                                  onClick={() => setExpandedPackId(isExpanded ? null : pack.id)}
                                  className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white flex items-center space-x-2 transition-colors self-start"
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  <span>Historial de Consumo</span>
                                  <span className="bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded-full text-[8px] text-zinc-400">
                                    {packFlights.length} {packFlights.length === 1 ? "vuelo" : "vuelos"}
                                  </span>
                                </button>

                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                      animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                      className="overflow-hidden space-y-2 w-full"
                                    >
                                      {packFlights.length > 0 ? (
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                          {packFlights.map((f) => {
                                            const acft = aircraft.find(a => a.id === f.aircraft_id);
                                            return (
                                              <div key={f.id} className="flex justify-between items-center text-xs py-2 border-b border-zinc-100/50 dark:border-white/5 last:border-b-0">
                                                <div className="flex flex-col">
                                                  <span className="font-bold text-zinc-900 dark:text-white uppercase">{f.route}</span>
                                                  <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">
                                                    {new Date(f.date + 'T00:00:00').toLocaleDateString("es-AR")} • {acft?.registration}
                                                  </span>
                                                </div>
                                                <span className="font-bold text-zinc-500 dark:text-zinc-400 font-space-grotesk">
                                                  -{f.duration.toFixed(1)} hs
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center py-4">
                                          No hay vuelos registrados para este pack.
                                        </p>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })()}

                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white dark:bg-white/[0.02] p-10 rounded-[2rem] text-center border border-dashed border-zinc-200 dark:border-white/10">
                    <p className="text-zinc-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-widest">No hay packs de horas registrados aún.</p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="space-y-8">
              
              {/* Account Balance Card */}
              <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-cal dark:shadow-none flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all">
                <div className="flex items-center space-x-6">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem] bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-900 dark:text-white shadow-sm flex-shrink-0">
                    <Wallet className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] block leading-none">Saldo Disponible</span>
                    <h3 className="text-4xl md:text-5xl font-space-grotesk font-bold text-zinc-900 dark:text-white tracking-tighter leading-none pt-1">
                      $ {initialBalance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setIsTopUpOpen(true)}
                  className="w-full md:w-auto bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-[10px] uppercase tracking-[0.2em] px-8 py-4.5 rounded-xl shadow-cal-highlight dark:shadow-none hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center justify-center space-x-2"
                >
                  <Coins className="w-4 h-4" />
                  <span>Cargar Saldo</span>
                </button>
              </div>

              {/* Transactions Ledger */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 px-2">
                  <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-md">
                    <Coins className="w-4 h-4 text-white dark:text-zinc-900" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white uppercase tracking-tighter">Historial de Movimientos</h3>
                </div>

                <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm">
                  {initialTransactions.length > 0 ? (
                    <div className="divide-y divide-zinc-100 dark:divide-white/5">
                      {initialTransactions.map((tx) => {
                        const isDeposit = tx.type === "deposit";
                        return (
                          <div key={tx.id} className="p-5 md:p-6 flex items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-white/[0.01] transition-colors">
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${
                                isDeposit 
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                  : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/25'
                              }`}>
                                {isDeposit ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wide">
                                  {tx.description}
                                </h5>
                                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1 block">
                                  {new Date(tx.created_at).toLocaleString("es-AR")}
                                </span>
                              </div>
                            </div>
                            <span className={`text-base font-bold font-space-grotesk ${isDeposit ? 'text-green-500' : 'text-zinc-900 dark:text-white'}`}>
                              {isDeposit ? "+" : "-"}$ {Math.abs(tx.amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <p className="text-zinc-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-widest">No hay movimientos registrados aún.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>

        {/* Right Sidebar: Aircraft Rate Configuration */}
        <section className="space-y-6">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-md">
              <Plane className="w-4 h-4 text-white dark:text-zinc-900" />
            </div>
            <h3 className="text-lg md:text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white uppercase tracking-tighter">Costos Aeronaves</h3>
          </div>

          <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-[2rem] p-6 space-y-4 shadow-sm">
            {aircraft.length > 0 ? (
              aircraft.map((ac) => {
                const isEditing = editingAircraftId === ac.id;
                return (
                  <div 
                    key={ac.id} 
                    className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.01] border border-zinc-100 dark:border-white/5 flex flex-col space-y-3 hover:border-zinc-300 dark:hover:border-white/10 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wide">
                          {ac.registration}
                        </h4>
                        <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5 block">
                          {ac.type} ({ac.icao})
                        </span>
                      </div>
                      
                      {trackingMode === "balance" && !isEditing && (
                        <button
                          onClick={() => {
                            setEditingAircraftId(ac.id);
                            setEditingCost(String(ac.cost_per_hour || 0));
                          }}
                          className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50 dark:border-white/5">
                      {trackingMode === "balance" ? (
                        <>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Tarifa por Hora</span>
                          
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editingCost}
                                  onChange={(e) => setEditingCost(e.target.value)}
                                  className="bg-white dark:bg-black/40 border border-zinc-300 dark:border-white/10 rounded-lg pl-6 pr-2 py-1 text-xs font-bold text-zinc-900 dark:text-white w-24 outline-none focus:border-zinc-900 dark:focus:border-white/50"
                                />
                              </div>
                              <button
                                onClick={() => handleSaveRate(ac.id)}
                                disabled={isPending}
                                className="p-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:scale-105 transition-transform"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingAircraftId(null)}
                                className="p-1.5 bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 rounded-lg hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-zinc-950 dark:text-white font-space-grotesk">
                              $ {(ac.cost_per_hour || 0).toLocaleString("es-AR", { minimumFractionDigits: 1 })} <span className="text-[10px] text-zinc-400">/hs</span>
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Horas Disponibles</span>
                          {(() => {
                            const totalRemainingHoursForAc = packs
                              .filter(p => p.is_active && p.aircraft_ids.includes(ac.id))
                              .reduce((sum, p) => sum + p.remaining_hours, 0);
                            const hasNegative = totalRemainingHoursForAc < 0;

                            return (
                              <span className={`text-sm font-bold font-space-grotesk ${hasNegative ? 'text-red-600 dark:text-red-500' : 'text-zinc-950 dark:text-white'}`}>
                                {totalRemainingHoursForAc.toFixed(1)} <span className="text-[10px] text-zinc-400">hs</span>
                              </span>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-zinc-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider py-4">No hay aeronaves cargadas</p>
            )}
          </div>
        </section>

      </div>

      {/* Top-up Modal */}
      <AnimatePresence>
        {isTopUpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTopUpOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2rem] w-full max-w-md p-6 md:p-8 shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-zinc-100 dark:border-white/5 pb-4">
                <h4 className="text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white uppercase tracking-tight">Cargar Saldo</h4>
                <button
                  onClick={() => setIsTopUpOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleTopUpSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Monto a Cargar ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      required
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-zinc-900 dark:text-white w-full outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Concepto / Descripción</label>
                  <input
                    type="text"
                    placeholder="Ej. Transferencia Banco"
                    value={topUpDesc}
                    onChange={(e) => setTopUpDesc(e.target.value)}
                    className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 dark:text-white w-full outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white/50 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl shadow-cal-highlight dark:shadow-none hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 pt-4"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Confirmar Carga</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
