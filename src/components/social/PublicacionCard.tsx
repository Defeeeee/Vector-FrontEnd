"use client";

import { useState } from "react";
import { Publicacion, Comentario } from "@/types";
import { Flame, MessageCircle, Trash2, X } from "lucide-react";
import AvatarPiloto from "./AvatarPiloto";
import { useAvisos } from "@/components/dashboard/Avisos";
import { toggleAplauso as toggleAplausoServer, borrarPublicacion } from "@/actions/social";
import Link from "next/link";

export default function PublicacionCard({ publicacion, onDeleted }: { publicacion: Publicacion; onDeleted?: () => void }) {
  const [aplaudida, setAplaudida] = useState(publicacion.aplaudida);
  const [aplausos, setAplausos] = useState(publicacion.aplausos);
  const [loadingAplauso, setLoadingAplauso] = useState(false);
  const [showVisor, setShowVisor] = useState<string | null>(null);
  const { notificar } = useAvisos();

  const toggleAplauso = async () => {
    if (loadingAplauso) return;
    setLoadingAplauso(true);
    
    // Optimistic UI
    const estabaAplaudida = aplaudida;
    setAplaudida(!estabaAplaudida);
    setAplausos(a => estabaAplaudida ? a - 1 : a + 1);
    
    const res = await toggleAplausoServer(publicacion.id, !estabaAplaudida, publicacion.autor.handle);
    
    if (!res.ok) {
      // Revert Optimistic UI
      setAplaudida(estabaAplaudida);
      setAplausos(a => estabaAplaudida ? a + 1 : a - 1);
      notificar({ tipo: "error", titulo: "Error al aplaudir" });
    }
    setLoadingAplauso(false);
  };

  const handleDelete = async () => {
    if (!confirm("¿Borrar esta publicación?")) return;
    const res = await borrarPublicacion(publicacion.id);
    if (res.ok) {
      onDeleted?.();
      notificar({ tipo: "exito", titulo: "Publicación eliminada" });
    } else {
      notificar({ tipo: "error", titulo: res.error || "Error al borrar" });
    }
  };

  const formattedDate = new Date(publicacion.created_at).toLocaleDateString("es-AR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  });

  return (
    <div className="rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm p-5 md:p-6 mb-4">
      <div className="flex items-start justify-between mb-3">
        <Link href={`/u/${publicacion.autor.handle}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <AvatarPiloto nombre={publicacion.autor.nombre_visible} avatarUrl={publicacion.autor.avatar_url} tamano="md" />
          <div>
            <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              {publicacion.autor.nombre_visible}
              <span className="text-zinc-400 dark:text-zinc-500 font-normal">@{publicacion.autor.handle}</span>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{formattedDate}</div>
          </div>
        </Link>
        {publicacion.es_mia && (
          <button onClick={handleDelete} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {publicacion.texto && (
        <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap mb-4 text-sm md:text-base">
          {publicacion.texto}
        </p>
      )}

      {publicacion.vuelo && (
        <div className="mb-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-3 inline-flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          {publicacion.vuelo.ruta && (
            <div className="flex items-center gap-1.5"><span className="font-medium">Ruta:</span> {publicacion.vuelo.ruta}</div>
          )}
          {publicacion.vuelo.duracion !== undefined && publicacion.vuelo.duracion !== null && (
            <div className="flex items-center gap-1.5"><span className="font-medium">Tiempo:</span> {(publicacion.vuelo.duracion).toFixed(1)}h</div>
          )}
          {publicacion.vuelo.aeronave && (
            <div className="flex items-center gap-1.5"><span className="font-medium">Equipo:</span> {publicacion.vuelo.aeronave}</div>
          )}
          {publicacion.vuelo.fecha && (
            <div className="flex items-center gap-1.5"><span className="font-medium">Fecha:</span> {publicacion.vuelo.fecha}</div>
          )}
        </div>
      )}

      {publicacion.fotos.length > 0 && (
        <div className={`grid gap-2 mb-4 ${publicacion.fotos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {publicacion.fotos.map((foto, idx) => (
            <div 
              key={idx} 
              className={`relative cursor-pointer overflow-hidden rounded-xl border border-zinc-100 dark:border-white/5 bg-zinc-100 dark:bg-zinc-900 ${publicacion.fotos.length === 3 && idx === 0 ? 'col-span-2' : ''}`}
              onClick={() => setShowVisor(foto.url)}
              style={{ aspectRatio: publicacion.fotos.length === 1 ? `${foto.ancho}/${foto.alto}` : '4/3' }}
            >
              <img src={foto.url} className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300" alt="Foto de publicación" loading="lazy" />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-zinc-100 dark:border-white/5">
        <button 
          onClick={toggleAplauso}
          className={`flex items-center gap-2 text-sm font-semibold transition-colors ${aplaudida ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
        >
          <Flame className={`w-5 h-5 ${aplaudida ? 'fill-current' : ''}`} />
          {aplausos > 0 && aplausos}
        </button>
        <Link 
          href={`/dashboard/pilotos/publicar?reply=${publicacion.id}`}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          {publicacion.comentarios > 0 && publicacion.comentarios}
        </Link>
      </div>

      {showVisor && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowVisor(null)}>
          <button className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-black/50 rounded-full" onClick={() => setShowVisor(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={showVisor} className="max-w-full max-h-full object-contain rounded-lg" alt="Visor" />
        </div>
      )}
    </div>
  );
}
