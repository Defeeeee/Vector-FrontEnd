"use client";

import { Download } from "lucide-react";
import { Flight, Aircraft } from "@/types";
import { motion } from "framer-motion";

interface ExportFlightsButtonProps {
  flights: Flight[];
  aircraft: Aircraft[];
}

export default function ExportFlightsButton({ flights, aircraft }: ExportFlightsButtonProps) {
  const handleExport = () => {
    if (flights.length === 0) return;

    const aircraftMap = new Map(aircraft.map(a => [a.id, a]));

    // CSV Headers
    const headers = [
      "Fecha", "Matrícula", "Tipo", "Categoría", "Ruta", "Aterrizajes", "Duración", "Despegue", "Aterrizaje",
      "PIC_Dia_Loc", "PIC_Dia_Tra", "PIC_Noche_Loc", "PIC_Noche_Tra",
      "SIC_Dia_Loc", "SIC_Dia_Tra", "SIC_Noche_Loc", "SIC_Noche_Tra",
      "IMC_Pil", "IMC_Cop", "Capota", "Sim_Instructor", "Sim_Pil_Inst"
    ].join(",");

    // CSV Rows
    const rows = flights.map(f => {
      const ac = f.aircraft_id ? aircraftMap.get(f.aircraft_id) : undefined;
      return [
        f.date,
        ac?.registration || "N/A",
        ac?.type || "N/A",
        ac?.type_acft || "N/A",
        `"${f.route}"`, // Quote route in case of commas
        f.landings,
        f.duration,
        new Date(f.takeoff).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + 'Z',
        new Date(f.landing).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + 'Z',
        f.pic_day_loc || 0, f.pic_day_tra || 0, f.pic_night_loc || 0, f.pic_night_tra || 0,
        f.sic_day_loc || 0, f.sic_day_tra || 0, f.sic_night_loc || 0, f.sic_night_tra || 0,
        f.imc_pil || 0, f.imc_cop || 0, f.capota || 0, f.sim_instructor || 0, f.sim_pil_en_inst || 0
      ].join(",");
    });

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vector_flight_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleExport}
      disabled={flights.length === 0}
      className="p-4 md:py-5 md:px-6 bg-white dark:bg-white/[0.05] text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 rounded-xl shadow-sm dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/[0.1] transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
      title="Exportar a CSV"
    >
      <Download className="w-4 h-4 md:w-5 md:h-5" />
      <span className="hidden md:inline font-bold text-[10px] uppercase tracking-widest">Exportar</span>
    </motion.button>
  );
}
