"use client";

import { iniciales } from "@/lib/social";
import { useState } from "react";

export default function AvatarPiloto({
  nombre,
  avatarUrl,
  tamano = "md",
}: {
  nombre: string;
  avatarUrl?: string | null;
  tamano?: "md" | "lg" | "sm";
}) {
  const [error, setError] = useState(false);

  let clase = "w-11 h-11 text-sm";
  if (tamano === "lg") clase = "w-20 h-20 md:w-24 md:h-24 text-2xl md:text-3xl";
  if (tamano === "sm") clase = "w-8 h-8 text-xs";

  const showInitials = !avatarUrl || error;

  return (
    <div
      aria-hidden="true"
      className={`${clase} shrink-0 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-display font-bold overflow-hidden`}
    >
      {showInitials ? (
        iniciales(nombre)
      ) : (
        <img
          src={avatarUrl}
          alt={nombre}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
