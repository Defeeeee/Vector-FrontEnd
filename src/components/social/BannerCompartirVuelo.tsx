import Link from "next/link";
import { Share2 } from "lucide-react";

export default function BannerCompartirVuelo() {
  return (
    <div className="bg-aviation-blue/10 dark:bg-aviation-blue/20 border border-aviation-blue/20 dark:border-aviation-blue/30 rounded-2xl p-4 flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-aviation-blue/20 flex items-center justify-center text-aviation-blue">
          <Share2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-zinc-900 dark:text-white">Compartí con tu red</h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Ahora podés compartir tus vuelos, subir fotos y contar detalles con otros pilotos.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/pilotos/publicar"
        className="px-4 py-2 text-sm font-semibold bg-aviation-blue text-white rounded-lg hover:bg-aviation-blue-dark transition-colors shrink-0"
      >
        Publicar ahora
      </Link>
    </div>
  );
}
