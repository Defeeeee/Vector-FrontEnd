"use client";

import { useEffect, useState } from "react";
import { marcarEnElCad } from "@/actions/cad";
import type { BorradorCad } from "@/lib/cad";

/**
 * La mitad de Vector de la conversación con el CAD (la otra es `src/cad/puente.ts`).
 *
 * Sólo habla con la ventana que la abrió (`window.opener`) y sólo si es la del CAD: los
 * vuelos se mandan con `postMessage` al origen del CAD, nunca a `*`, y los mensajes que
 * llegan de cualquier otro lado se ignoran.
 */
export default function ConectorCad({ borradores, pasados, origenCad }: { borradores: BorradorCad[]; pasados: number; origenCad: string }) {
  const [estado, setEstado] = useState<"esperando" | "conectado" | "sin-cad">("esperando");
  const [marcados, setMarcados] = useState(0);

  useEffect(() => {
    // La ventana que la abrió (el marcador abre una ventanita), o la que la contiene, si la
    // metieron en un recuadro. Igual sólo se le habla al origen del CAD.
    const cad = (window.opener as Window | null) ?? (window.parent !== window ? window.parent : null);
    if (!cad) {
      setEstado("sin-cad");
      return;
    }
    const enviar = () => cad.postMessage({ tipo: "vector-cad:vuelos", version: 1, borradores, pasados }, origenCad);
    const alRecibir = async (e: MessageEvent) => {
      if (e.origin !== origenCad || e.source !== cad) return;
      const d = e.data as { tipo?: string; items?: { vectorId: string; cadId: number }[] };
      if (d?.tipo === "vector-cad:listo") {
        enviar();
      } else if (d?.tipo === "vector-cad:recibido") {
        setEstado("conectado");
      } else if (d?.tipo === "vector-cad:marcar") {
        const r = await marcarEnElCad(d.items ?? []);
        setMarcados((m) => m + r.marcados);
        cad.postMessage({ tipo: "vector-cad:marcados", marcados: r.marcados }, origenCad);
      }
    };
    window.addEventListener("message", alRecibir);
    try {
      enviar();
    } catch {
      // Si la ventana que la abrió no es el CAD, el navegador no deja mandar: se espera.
    }
    return () => window.removeEventListener("message", alRecibir);
  }, [borradores, pasados, origenCad]);

  const listos = borradores.filter((b) => !b.problema).length;

  if (estado === "sin-cad") {
    return (
      <>
        <h1 className="text-xl font-bold">Abrí esta ventana desde el CAD</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Entrá al CAD de ANAC, abrí &quot;Registro horas vuelo&quot; y tocá el marcador de Vector. Los pasos están en Bitácora → Vuelos → Pasar al
          CAD.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold">{estado === "conectado" ? "Conectado con el CAD" : "Conectando con el CAD…"}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Dejá esta ventana abierta mientras cargás. Seguí en el panel de Vector adentro del CAD.
      </p>
      <ul className="text-sm space-y-1">
        <li>
          <span className="font-mono font-bold">{borradores.length}</span> vuelos sin pasar al CAD, <span className="font-mono font-bold">{listos}</span>{" "}
          listos para mandar
        </li>
        <li>
          <span className="font-mono font-bold">{pasados + marcados}</span> ya anotados como pasados
        </li>
      </ul>
      <p className="text-xs text-zinc-500">Vector no ve tu contraseña de ANAC: carga desde tu sesión del CAD, en tu navegador.</p>
    </>
  );
}
