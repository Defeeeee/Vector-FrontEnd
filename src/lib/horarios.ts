/**
 * Horas de reloj, y la única conversión local↔UTC de la app.
 *
 * **Todo lo que se guarda es UTC.** `flights.takeoff` y `flights.landing` se
 * arman como `${date}T${HH:mm}:00Z`, el motor de auditoría los lee así, y los
 * vuelos programados siguen la misma regla. Lo local es exclusivamente una forma
 * de *mostrar*: el formulario de vuelo tiene un interruptor que cambia lo que se
 * ve y nunca lo que se postea.
 *
 * El comentario de `FlightLogForm` lo dice sin vueltas: invertir eso *"movería
 * todos los vuelos tres horas y rompería en silencio la detección de
 * superposiciones"*. Por eso la conversión vive acá, en un solo lugar y con
 * tests, en vez de repetida en cada formulario que muestre una hora.
 */

/**
 * Argentina es UTC−3 todo el año.
 *
 * **No hay horario de verano desde 2009**, así que una constante es honesta acá y
 * no una simplificación: no existe una fecha del año en la que este número sea
 * otro. Si algún día vuelve el cambio de hora, esto deja de alcanzar y hay que
 * pasar a una zona horaria de verdad — y va a ser evidente, porque todas las
 * horas mostradas se corren una hora.
 */
export const UTC_OFFSET_ARG = -3;

/** `true` si es una hora de reloj "HH:MM" válida. */
export function esHora(hhmm: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm);
}

/**
 * Corre una hora de reloj tantas horas, dando la vuelta al día.
 *
 * Devuelve la entrada intacta si no es una hora válida, para que un campo a medio
 * tipear no se convierta en basura mientras el piloto escribe.
 *
 * **Da la vuelta sin fecha a propósito.** Un vuelo que despega 23:00 local es
 * 02:00 UTC del día siguiente, y esta función devuelve "02:00" sin avisar que
 * cambió el día: quien la use para armar un timestamp completo tiene que resolver
 * esa parte. Hoy nadie lo hace, porque el formulario arma el timestamp con la
 * fecha que el piloto eligió aparte.
 */
export function correrReloj(hhmm: string, horas: number): string {
  if (!esHora(hhmm)) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const corrida = (((h + horas) % 24) + 24) % 24;
  return `${String(corrida).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** De la hora guardada (UTC) a la que se le muestra al piloto. */
export function aLocal(utc: string): string {
  return correrReloj(utc, UTC_OFFSET_ARG);
}

/** De lo que el piloto escribió en local a lo que se guarda (UTC). */
export function aUtc(local: string): string {
  return correrReloj(local, -UTC_OFFSET_ARG);
}

/**
 * Normaliza lo que devuelve Postgres para una columna `time`.
 *
 * PostgREST manda `"14:00:00"`, y los `<input type="time">` y el formulario de
 * vuelo trabajan con `"14:00"`. Sin esto, un valor con segundos entra al prefill
 * y el navegador lo descarta sin decir nada: el campo queda vacío y parece que el
 * dato nunca se guardó.
 */
export function soloHoraYMinuto(valor: string | null | undefined): string {
  if (!valor) return "";
  const m = /^(\d{2}:\d{2})/.exec(valor);
  return m ? m[1] : "";
}
