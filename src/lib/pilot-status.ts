import { Flight, PilotDocument } from "@/types";
import { documentStatus } from "@/lib/utils";
import { ClassRecency } from "@/lib/recency";

/**
 * ¿Se pueden ejercer las atribuciones de la licencia hoy?
 *
 * No es una pregunta que haya que inventar: la RAAC 61 la define. **61.060(a)(1)**
 * dice que las atribuciones sólo se ejercen cuando se cumplen, a la vez:
 *
 *   (i)   certificación médica aeronáutica vigente (RAAC 67)
 *   (ii)  habilitaciones válidas
 *   (iii) experiencia reciente (61.140)
 *   (iv)  repaso de vuelo (61.135)
 *
 * Vector ya tenía tres de las cuatro repartidas en pantallas distintas y ninguna
 * que las juntara. Esto las junta.
 *
 * A las cuatro condiciones de la norma se suman las que el piloto declare: un
 * documento puede marcarse como bloqueante de vuelo o sólo de pasajeros. Una cuota
 * de aeroclub no está en la RAAC, pero si el piloto dice que sin eso no vuela,
 * no vuela.
 *
 * **La respuesta no es sí/no.** La norma define estados con salidas distintas: a
 * quien se le venció la experiencia reciente puede volar **solo** a recuperarla
 * (61.140(c)(2)(i)); a quien se le venció el repaso, no. Devolver un booleano
 * perdería justo lo que el piloto necesita saber.
 */

export type EstadoPiloto =
  | "vigente"
  | "sin_recencia"
  | "repaso_vencido"
  | "documento_vencido"
  | "inactividad_prolongada";

export interface PilotStatus {
  estado: EstadoPiloto;
  /** Qué puede hacer hoy, en una línea. */
  puede: string;
  /** Qué tiene que hacer para volver, si algo falta. */
  paraVolver?: string;
  /** Sección de la RAAC que lo dice, para que sea verificable. */
  seccion: string;
  /** Detalle de qué disparó el estado (nombre del documento, clase, etc.). */
  detalle?: string;
}

/** 61.060(a)(2) — más de 24 meses sin actividad de vuelo. */
export const INACTIVIDAD_MESES = 24;

const mesesDesde = (iso: string, hoy: Date): number => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return (hoy.getUTCFullYear() - d.getUTCFullYear()) * 12 + (hoy.getUTCMonth() - d.getUTCMonth());
};

/**
 * Los tipos de documento que bloquean el ejercicio de las atribuciones.
 *
 * `seguro` y `aeronavegabilidad` no entran: son de la aeronave, no del piloto, y
 * 61.060(a)(1) habla de la licencia. Vencidos son un problema, pero no de esta
 * pregunta.
 */
const BLOQUEANTES: Record<string, { etiqueta: string; seccion: string }> = {
  cma: { etiqueta: "certificado médico", seccion: "61.060(a)(1)(i)" },
  licencia: { etiqueta: "licencia", seccion: "61.060(a)(1)(ii)" },
  habilitacion: { etiqueta: "habilitación", seccion: "61.060(a)(1)(ii)" },
};

/**
 * Evalúa el estado, del más grave al más leve.
 *
 * El orden importa: si alguien lleva tres años sin volar **y** tiene el CMA
 * vencido, lo que necesita saber es que perdió las atribuciones y necesita examen
 * de pericia, no que le falta un trámite médico.
 */
export function pilotStatus(
  documentos: PilotDocument[],
  recencias: ClassRecency[],
  flights: Flight[],
  hoy = new Date()
): PilotStatus {
  // 61.060(a)(2) — el peor estado, y el más fácil de detectar.
  const ultimo = flights.reduce<string | null>(
    (acc, f) => (!acc || f.date > acc ? f.date : acc), null
  );
  if (ultimo && mesesDesde(ultimo, hoy) > INACTIVIDAD_MESES) {
    return {
      estado: "inactividad_prolongada",
      puede: "No podés ejercer las atribuciones de tu licencia.",
      paraVolver:
        "Más de 24 meses sin volar: hace falta certificación médica vigente, " +
        "reentrenamiento con instructor y aprobar un examen de pericia ante la ANAC.",
      seccion: "61.060(a)(2)",
      detalle: `Tu último vuelo registrado es del ${ultimo.slice(0, 10)}.`,
    };
  }

  // 61.060(a)(1)(i) y (ii) — sin esto no se ejerce nada, ni siquiera volar solo.
  const vencido = documentos.find(
    (d) => BLOQUEANTES[d.kind] && documentStatus(d.expiry_date, hoy).tone === "expired"
  );
  if (vencido) {
    const info = BLOQUEANTES[vencido.kind];
    return {
      estado: "documento_vencido",
      puede: "No podés ejercer las atribuciones de tu licencia.",
      paraVolver: `Renová tu ${info.etiqueta} antes de volar.`,
      seccion: info.seccion,
      detalle: `${vencido.name} — ${documentStatus(vencido.expiry_date, hoy).label.toLowerCase()}.`,
    };
  }

  // Documentos que el piloto marcó como bloqueantes de vuelo. Van acá, entre las
  // condiciones de la norma y el repaso: no son RAAC —una cuota del aeroclub no
  // está en la 61— pero si el piloto dice que sin eso no vuela, no vuela.
  const bloqueaVuelo = documentos.find(
    (d) => d.blocking === "vuelo" && documentStatus(d.expiry_date, hoy).tone === "expired"
  );
  if (bloqueaVuelo) {
    return {
      estado: "documento_vencido",
      puede: "No podés volar.",
      paraVolver: `Renová ${bloqueaVuelo.name} antes de volar.`,
      seccion: "requisito propio",
      detalle: `${bloqueaVuelo.name} — ${documentStatus(bloqueaVuelo.expiry_date, hoy).label.toLowerCase()}. Lo marcaste como bloqueante.`,
    };
  }

  // 61.135 — el repaso. Sin él no se puede actuar como piloto al mando.
  const repaso = documentos.find((d) => d.kind === "repaso_vuelo");
  if (!repaso || documentStatus(repaso.expiry_date, hoy).tone === "expired") {
    return {
      estado: "repaso_vencido",
      puede: "No podés actuar como piloto al mando.",
      paraVolver:
        "Hacé un repaso de vuelo con un instructor: mínimo 1 hora de instrucción " +
        "en tierra y 1 hora en vuelo, firmado en tu libro.",
      seccion: "61.135",
      detalle: repaso
        ? `Tu repaso ${documentStatus(repaso.expiry_date, hoy).label.toLowerCase()}.`
        : "No tenés un repaso de vuelo cargado. Si lo hiciste, cargalo en el Hangar.",
    };
  }

  // Documentos que impiden volar solo. Misma consecuencia que el repaso vencido,
  // y se levantan igual: volando con un instructor. Van después del repaso porque
  // si los dos faltan, conviene nombrar primero el que exige la norma.
  const bloqueaSolo = documentos.find(
    (d) => d.blocking === "solo" && documentStatus(d.expiry_date, hoy).tone === "expired"
  );
  if (bloqueaSolo) {
    return {
      estado: "repaso_vencido",
      puede: "Sólo podés volar con instructor.",
      paraVolver: `Necesitás un vuelo con instructor para renovar ${bloqueaSolo.name}.`,
      seccion: "requisito propio",
      detalle: `${bloqueaSolo.name} — ${documentStatus(bloqueaSolo.expiry_date, hoy).label.toLowerCase()}. Lo marcaste como bloqueante de vuelo solo.`,
    };
  }

  // Documentos que sólo impiden llevar pasajeros. Misma salida que la falta de
  // experiencia reciente: se puede volar solo.
  const bloqueaPasajeros = documentos.find(
    (d) => d.blocking === "pasajeros" && documentStatus(d.expiry_date, hoy).tone === "expired"
  );
  if (bloqueaPasajeros) {
    return {
      estado: "sin_recencia",
      puede: "Podés volar solo, pero no llevar pasajeros.",
      paraVolver: `Renová ${bloqueaPasajeros.name} para volver a llevar pasajeros.`,
      seccion: "requisito propio",
      detalle: `${bloqueaPasajeros.name} — ${documentStatus(bloqueaPasajeros.expiry_date, hoy).label.toLowerCase()}. Lo marcaste como bloqueante de pasajeros.`,
    };
  }

  // 61.140 — la experiencia reciente. Acá sí hay salida volando solo.
  const sinRecencia = recencias.filter((r) => !r.vigente);
  if (sinRecencia.length > 0) {
    return {
      estado: "sin_recencia",
      puede: "Podés volar solo, pero no llevar pasajeros.",
      paraVolver:
        "Auto-reentrenamiento: volá sin personas a bordo ni carga y completá los " +
        "circuitos de tránsito que te faltan. Anotalo en tu libro y recuperás la vigencia.",
      seccion: "61.140(c)(2)(i)",
      detalle: `Sin experiencia reciente en ${sinRecencia.map((r) => r.clase).join(", ")}.`,
    };
  }

  const proxima = [...recencias].sort((a, b) =>
    (a.expiresOn ?? "9999").localeCompare(b.expiresOn ?? "9999")
  )[0];

  return {
    estado: "vigente",
    puede: "Podés volar como piloto al mando y llevar pasajeros.",
    seccion: "61.060(a)(1)",
    detalle: proxima?.expiresOn
      ? `Tu experiencia reciente en ${proxima.clase} vence el ${proxima.expiresOn}.`
      : undefined,
  };
}
