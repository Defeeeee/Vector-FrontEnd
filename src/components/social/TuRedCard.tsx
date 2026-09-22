import Link from "next/link";
import { Users } from "lucide-react";

export default function TuRedCard({ tieneHandle, nuevaActividad }: { tieneHandle: boolean; nuevaActividad: number }) {
  return (
    <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm p-6 mt-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-zinc-900 dark:text-white">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-zinc-900 dark:text-white">Tu red</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {tieneHandle ? "Lo último de los pilotos que seguís." : "Conectá con otros pilotos."}
          </p>
        </div>
      </div>
      
      {tieneHandle ? (
        <Link
          href="/dashboard/pilotos"
          className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-white font-semibold hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors relative"
        >
          Ir a la Red
          {nuevaActividad > 0 && (
            <span className="absolute right-4 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white">
              {nuevaActividad > 9 ? "9+" : nuevaActividad}
            </span>
          )}
        </Link>
      ) : (
        <Link
          href="/dashboard/settings#perfil-publico"
          className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
        >
          Crear mi perfil
        </Link>
      )}
    </div>
  );
}
