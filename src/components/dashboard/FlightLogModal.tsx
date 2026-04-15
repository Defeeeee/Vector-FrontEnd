"use client";

import { Aircraft } from "@/types";
import FlightLogForm from "./FlightLogForm";
import { X, Plane } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FlightLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  aircraft: Aircraft[];
  initialData?: any;
}

export default function FlightLogModal({ isOpen, onClose, aircraft, initialData }: FlightLogModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm cursor-pointer" 
          />

          {/* Content */}
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-4xl bg-white border border-zinc-200 rounded-[3rem] p-8 md:p-12 shadow-cal space-y-10 my-auto z-10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                  <Plane className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-3xl font-space-grotesk font-bold uppercase tracking-tighter text-zinc-900">Finalizar Vuelo</h2>
                  <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em]">Completa el registro de tu sesión</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-zinc-100 border border-transparent hover:border-zinc-200 rounded-full transition-colors group"
              >
                <X className="w-6 h-6 text-zinc-500 group-hover:text-zinc-900" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto pr-4 -mr-4 custom-scrollbar">
              <FlightLogForm 
                aircraft={aircraft} 
                initialData={initialData} 
                onSuccess={onClose} 
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
