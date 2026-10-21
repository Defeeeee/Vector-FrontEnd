"use client";

import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { marcarEnElCad, omitirEnElCad, traerDelCad } from "@/actions/cad";
import { CLAVE_MARCADOR_USADO } from "@/components/dashboard/MarcadorCad";
import type { BorradorCad, MotivoOmitido, VueloConocido } from "@/lib/cad";

/**
 * La mitad de Vector de la conversación con el CAD (la otra es `src/cad/puente.ts`).
 *
 * Sólo habla con la ventana que la abrió (`window.opener`) y sólo si es la del CAD: los
 * vuelos se mandan con `postMessage` al origen del CAD, nunca a `*`, y los mensajes que
 * llegan de cualquier otro lado se ignoran.
 */
export default function ConectorCad({
  borradores,
  pasados,
  omitidos,
  conocidos,
  matriculas,
  origenCad,
}: {
  borradores: BorradorCad[];
  pasados: number;
  omitidos: (BorradorCad & { motivo: MotivoOmitido })[];
  conocidos: VueloConocido[];
  matriculas: string[];
  origenCad: string;
}) {
  const [estado, setEstado] = useState<"esperando" | "conectado" | "sin-cad">("esperando");
  const [marcados, setMarcados] = useState(0);
  const [traidos, setTraidos] = useState(0);

  useEffect(() => {
    // La ventana que la abrió (el marcador abre una ventanita), o la que la contiene, si la
    // metieron en un recuadro. Igual sólo se le habla al origen del CAD.
    const cad = (window.opener as Window | null) ?? (window.parent !== window ? window.parent : null);
    if (!cad) {
      setEstado("sin-cad");
      return;
    }
    const enviar = () => cad.postMessage({ tipo: "vector-cad:vuelos", version: 3, borradores, pasados, omitidos, conocidos, matriculas }, origenCad);
    const alRecibir = async (e: MessageEvent) => {
      if (e.origin !== origenCad || e.source !== cad) return;
      const d = e.data as {
        tipo?: string;
        items?: { vectorId: string; cadId: number }[];
        omitir?: { vectorId: string; motivo: MotivoOmitido | null }[];
        vuelos?: unknown[];
      };
      if (d?.tipo === "vector-cad:listo") {
        enviar();
      } else if (d?.tipo === "vector-cad:recibido") {
        setEstado("conectado");
        // Para que "Pasar al CAD" muestre el paso del marcador ya hecho.
        try {
          localStorage.setItem(CLAVE_MARCADOR_USADO, "1");
        } catch {
          /* sin almacenamiento, el paso se sigue mostrando entero */
        }
      } else if (d?.tipo === "vector-cad:marcar") {
        const r = await marcarEnElCad(d.items ?? []);
        setMarcados((m) => m + r.marcados);
        cad.postMessage({ tipo: "vector-cad:marcados", marcados: r.marcados }, origenCad);
      } else if (d?.tipo === "vector-cad:omitir") {
        const r = await omitirEnElCad(d.omitir ?? []);
        cad.postMessage({ tipo: "vector-cad:omitidos", cambiados: r.cambiados }, origenCad);
      } else if (d?.tipo === "vector-cad:traer") {
        const r = await traerDelCad(Array.isArray(d.vuelos) ? d.vuelos : []);
        setTraidos((t) => t + r.creados);
        cad.postMessage({ tipo: "vector-cad:traidos", ...r }, origenCad);
      }
    };
    window.addEventListener("message", alRecibir);
    try {
      enviar();
    } catch {
      // Si la ventana que la abrió no es el CAD, el navegador no deja mandar: se espera.
    }
    return () => window.removeEventListener("message", alRecibir);
  }, [borradores, pasados, omitidos, conocidos, matriculas, origenCad]);

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

  const conectado = estado === "conectado";
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="relative grid place-items-center w-11 h-11 rounded-2xl bg-zinc-900 dark:bg-white">
          <Compass className="w-5 h-5 text-white dark:text-zinc-900" aria-hidden="true" />
          <span
            className={`absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-50 dark:border-zinc-950 ${
              conectado ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
            }`}
          />
        </span>
        <div>
          <h1 className="text-lg font-bold leading-tight">{conectado ? "Conectado con el CAD" : "Conectando con el CAD…"}</h1>
          <p className="text-xs text-zinc-500">Seguí en el panel de Vector, adentro del CAD.</p>
        </div>
      </div>

      <p className="rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 px-4 py-3 text-sm">
        <b>Podés minimizar esta ventana, pero no la cierres</b> hasta terminar: por acá Vector anota los vuelos que el CAD recibió.
      </p>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">Sin pasar</dt>
          <dd className="font-mono text-xl font-bold">{borradores.length}</dd>
          <dd className="text-xs text-zinc-500">{listos} listos</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">En el CAD</dt>
          <dd className="font-mono text-xl font-bold">{pasados + marcados}</dd>
          {marcados > 0 && <dd className="text-xs text-emerald-600">{marcados} recién anotados</dd>}
          {traidos > 0 && <dd className="text-xs text-emerald-600">{traidos} traídos a Vector</dd>}
        </div>
      </dl>
      <p className="text-xs text-zinc-500">Vector no ve tu contraseña de ANAC: carga desde tu sesión del CAD, en tu navegador.</p>
    </>
  );
}
