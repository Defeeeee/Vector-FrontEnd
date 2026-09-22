"use client";

import { useState, useRef } from "react";
import { Image as ImageIcon, Plane, X, Loader2 } from "lucide-react";
import { useAvisos } from "@/components/dashboard/Avisos";
import { comprimirImagen } from "@/lib/imagen-cliente";
import AvatarPiloto from "./AvatarPiloto";

interface VueloMinimo {
  id: string;
  ruta: string;
  duracion: number;
  aeronave?: string;
  fecha: string;
}

export default function ComposerPublicacion({
  avatarUrl,
  nombre,
  vueloInicial,
  onSuccess
}: {
  avatarUrl?: string | null;
  nombre: string;
  vueloInicial?: VueloMinimo;
  onSuccess?: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [vuelo, setVuelo] = useState<VueloMinimo | undefined>(vueloInicial);
  
  const [flags, setFlags] = useState({
    ruta: true,
    duracion: true,
    aeronave: false,
    fecha: false
  });
  
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notificar } = useAvisos();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newFiles = Array.from(e.target.files);
    
    if (fotos.length + newFiles.length > 4) {
      notificar({ tipo: "error", titulo: "Máximo 4 fotos por publicación" });
      return;
    }

    setLoading(true);
    try {
      const comprimidas = await Promise.all(newFiles.map(f => comprimirImagen(f)));
      setFotos(prev => [...prev, ...comprimidas]);
    } catch (err) {
      notificar({ tipo: "error", titulo: "Error al procesar imagen" });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!texto.trim() && fotos.length === 0 && !vuelo) return;
    setLoading(true);

    try {
      const formData = new FormData();
      if (texto.trim()) formData.append("texto", texto.trim());
      if (vuelo) {
        formData.append("vuelo_id", vuelo.id);
        if (flags.ruta) formData.append("mostrar_ruta", "1");
        if (flags.duracion) formData.append("mostrar_duracion", "1");
        if (flags.aeronave) formData.append("mostrar_aeronave", "1");
        if (flags.fecha) formData.append("mostrar_fecha", "1");
      }
      
      fotos.forEach((foto) => {
        formData.append("fotos", foto);
      });

      const res = await fetch("/api/social/publicaciones", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) { const txt = await res.text(); console.error("Error from backend:", txt); throw new Error(txt); }
      
      setTexto("");
      setFotos([]);
      setVuelo(undefined);
      onSuccess?.();
      notificar({ tipo: "exito", titulo: "Publicado en tu red" });
    } catch (err) {
      notificar({ tipo: "error", titulo: "No se pudo publicar: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm p-5 md:p-6 mb-6">
      <div className="flex items-start gap-3 md:gap-4">
        <AvatarPiloto nombre={nombre} avatarUrl={avatarUrl} />
        <div className="flex-1 min-w-0">
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value.slice(0, 1000))}
            placeholder="¿Qué querés compartir con tu red?"
            className="w-full bg-transparent border-0 focus:ring-0 resize-none outline-none text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 p-0 text-base md:text-lg min-h-[60px]"
            maxLength={1000}
          />
          
          {fotos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 mt-2">
              {fotos.map((f, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-200 dark:border-white/10">
                  <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="Preview" />
                  <button onClick={() => removeFoto(i)} className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {vuelo && (
            <div className="mb-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-3 text-sm relative">
              <button onClick={() => setVuelo(undefined)} className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
              <div className="font-semibold text-zinc-900 dark:text-white mb-2 pr-6 flex items-center gap-2">
                <Plane className="w-4 h-4 text-aviation-blue" />
                Vuelo adjunto
              </div>
              <div className="flex flex-wrap gap-4 text-zinc-700 dark:text-zinc-300">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white">
                  <input type="checkbox" checked={flags.ruta} onChange={e => setFlags(f => ({ ...f, ruta: e.target.checked }))} className="rounded text-aviation-blue focus:ring-aviation-blue border-zinc-300 bg-transparent" />
                  Ruta
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white">
                  <input type="checkbox" checked={flags.duracion} onChange={e => setFlags(f => ({ ...f, duracion: e.target.checked }))} className="rounded text-aviation-blue focus:ring-aviation-blue border-zinc-300 bg-transparent" />
                  Tiempo
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white">
                  <input type="checkbox" checked={flags.aeronave} onChange={e => setFlags(f => ({ ...f, aeronave: e.target.checked }))} className="rounded text-aviation-blue focus:ring-aviation-blue border-zinc-300 bg-transparent" />
                  Aeronave
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white">
                  <input type="checkbox" checked={flags.fecha} onChange={e => setFlags(f => ({ ...f, fecha: e.target.checked }))} className="rounded text-aviation-blue focus:ring-aviation-blue border-zinc-300 bg-transparent" />
                  Fecha
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-3 border-t border-zinc-100 dark:border-white/5">
            <div className="flex items-center gap-1">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={fotos.length >= 4 || loading}
                className="p-2 text-aviation-blue hover:bg-aviation-blue/10 rounded-full transition-colors disabled:opacity-50"
                title="Subir fotos"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono ${texto.length > 900 ? 'text-orange-500' : 'text-zinc-400'}`}>
                {texto.length}/1000
              </span>
              <button 
                onClick={handleSubmit}
                disabled={loading || (!texto.trim() && fotos.length === 0 && !vuelo)}
                className="px-5 py-2 bg-aviation-blue text-white rounded-full font-semibold text-sm hover:bg-aviation-blue-dark transition-colors disabled:opacity-50 disabled:hover:bg-aviation-blue flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Publicar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
