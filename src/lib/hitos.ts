/**
 * Los hitos de horas de un perfil público.
 *
 * Salen sólo del total de horas, a propósito: lo público de un piloto son sus horas
 * (decisión de Federico, 2026-09-22), así que un hito no puede revelar nada que las
 * horas no digan ya —ni aeródromos, ni fechas, ni aeronaves—.
 */

export const HITOS_DE_HORAS = [50, 100, 150, 200, 250, 500, 1000] as const;

export interface EstadoHitos {
  /** Los hitos ya pasados, de menor a mayor. */
  alcanzados: number[];
  /** El próximo, o `null` si ya pasó todos. */
  proximo: number | null;
  /** Cuánto falta para el próximo, con un decimal. `null` si no hay próximo. */
  faltan: number | null;
  /** Avance entre el hito anterior (o cero) y el próximo, de 0 a 1. */
  avance: number;
}

export function estadoHitos(totalHoras: number): EstadoHitos {
  const total = Number.isFinite(totalHoras) ? Math.max(0, totalHoras) : 0;
  const alcanzados = HITOS_DE_HORAS.filter((h) => total >= h);
  const proximo = HITOS_DE_HORAS.find((h) => total < h) ?? null;
  if (proximo === null) return { alcanzados, proximo: null, faltan: null, avance: 1 };

  const anterior = alcanzados[alcanzados.length - 1] ?? 0;
  return {
    alcanzados,
    proximo,
    faltan: Number((proximo - total).toFixed(1)),
    avance: (total - anterior) / (proximo - anterior),
  };
}
