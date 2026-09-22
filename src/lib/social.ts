/**
 * Ayudas puras de la red social, fuera de los componentes para poder testearlas.
 */

/**
 * El mensaje para el piloto, a partir del cuerpo de un error del backend.
 *
 * El manejador global del backend (`src/app.py`) devuelve `{detail, extra}`. En los
 * errores propios —"Ese @ ya lo tiene otro piloto."— el texto está en `detail`. En los
 * 400 de validación, `detail` es genérico ("Validation failed for PUT ...") y el motivo
 * está en `extra[0].message`, con el prefijo que le agrega Pydantic.
 */
export function mensajeDeErrorApi(cuerpo: unknown, porDefecto: string): string {
  if (!cuerpo || typeof cuerpo !== "object") return porDefecto;
  const { detail, extra } = cuerpo as { detail?: unknown; extra?: unknown };

  if (Array.isArray(extra) && extra.length > 0) {
    const primero = extra[0] as { message?: unknown };
    if (typeof primero?.message === "string" && primero.message.trim()) {
      return primero.message.replace(/^Value error,\s*/i, "").trim();
    }
  }
  if (typeof detail === "string" && detail.trim() && !/^Validation failed/i.test(detail)) {
    return detail.trim();
  }
  return porDefecto;
}

/** "Federico Díaz Nemeth" → "FD". Para el avatar, que todavía no tiene foto. */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primera = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] ?? "" : "";
  return (primera + ultima).toUpperCase();
}
