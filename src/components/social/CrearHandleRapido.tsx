import Link from "next/link";
import { AtSign } from "lucide-react";

export default function CrearHandleRapido() {
  return (
    <div className="rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-4 text-zinc-900 dark:text-white">
        <AtSign className="w-6 h-6" />
      </div>
      <h3 className="font-display font-bold text-xl mb-2 text-zinc-900 dark:text-white">Sumate a la red</h3>
      <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-sm mx-auto">
        Elegí tu @ para conectar con otros pilotos, compartir vuelos y comentar en la red.
      </p>
      <Link
        href="/dashboard/settings#perfil-publico"
        className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
      >
        Crear mi perfil
      </Link>
    </div>
  );
}
