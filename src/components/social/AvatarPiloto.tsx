import { iniciales } from "@/lib/social";

/**
 * Las iniciales del piloto en un círculo. Las fotos son de una fase siguiente; hasta
 * entonces, las iniciales alcanzan para distinguir una fila de otra en una lista.
 */
export default function AvatarPiloto({ nombre, tamano = "md" }: { nombre: string; tamano?: "md" | "lg" }) {
  const clase =
    tamano === "lg"
      ? "w-20 h-20 md:w-24 md:h-24 text-2xl md:text-3xl"
      : "w-11 h-11 text-sm";
  return (
    <div
      aria-hidden="true"
      className={`${clase} shrink-0 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-display font-bold`}
    >
      {iniciales(nombre)}
    </div>
  );
}
