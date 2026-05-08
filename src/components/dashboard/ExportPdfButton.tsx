"use client";

import { FileText, Loader2 } from "lucide-react";
import { Flight, Aircraft, Profile } from "@/types";
import { motion } from "framer-motion";
import { useState } from "react";
import { generateLogbookPdf } from "@/lib/pdfGenerator";

interface ExportPdfButtonProps {
  flights: Flight[];
  aircraft: Aircraft[];
  profile: Profile | null;
}

export default function ExportPdfButton({ flights, aircraft, profile }: ExportPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    if (flights.length === 0) return;
    setIsGenerating(true);

    try {
      const pdfBytes = await generateLogbookPdf(flights, aircraft, profile);
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Libro_Vuelo_${profile?.last_name || "Vector"}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error al generar el PDF. Por favor, intenta de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleExport}
      disabled={flights.length === 0 || isGenerating}
      className="p-4 md:py-5 md:px-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border border-transparent rounded-xl shadow-cal-highlight dark:shadow-none hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
      title="Exportar Libro Oficial (PDF)"
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
      ) : (
        <FileText className="w-4 h-4 md:w-5 md:h-5" />
      )}
      <span className="hidden md:inline font-bold text-[10px] uppercase tracking-widest">
        {isGenerating ? "Generando..." : "Libro (PDF)"}
      </span>
    </motion.button>
  );
}
