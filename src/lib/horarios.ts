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

/**
 * Qué anda mal con las horas de un vuelo programado, o `null` si están bien.
 *
 * ## Por qué la validación es nuestra y no del navegador
 *
 * Un `<input type="time">` a medio completar —el caso típico es el AM/PM sin elegir en un
 * navegador con reloj de 12 horas— queda en estado `badInput`: **su `value` es la cadena
 * vacía aunque la hora y los minutos se vean puestos**, y el navegador bloquea el envío con
 * su mensaje genérico. El piloto ve un horario escrito y un cartel que le dice que es
 * inválido, sin decirle qué le falta.
 *
 * Con esto el formulario valida antes y el mensaje lo ponemos nosotros, en castellano y
 * diciendo cuál de los dos campos es.
 *
 * ## Qué **no** valida
 *
 * No exige que el aterrizaje sea posterior al despegue. Un vuelo que sale 23:30 y aterriza
 * 00:40 cruza la medianoche y es perfectamente normal; rechazarlo obligaría a cargar el
 * plan mal a propósito. Y son horas tentativas de un plan, no el registro de un vuelo.
 */
export function problemaDeHoras(despegue: string, aterrizaje: string): string | null {
  /*
    Se normaliza antes de juzgar: un `<input type="time">` con segundos —y hay navegadores
    que los agregan solos— devuelve `"12:30:00"`, que no es `HH:MM` y sería rechazado como
    basura. Es una hora perfectamente buena escrita con un campo de más.
  */
  const roto = (v: string) => v.trim() !== "" && !esHora(soloHoraYMinuto(v.trim()));
  if (roto(despegue)) return "El horario de despegue quedó incompleto. Completá hora y minutos.";
  if (roto(aterrizaje)) return "El horario de aterrizaje quedó incompleto. Completá hora y minutos.";
  return null;
}


/**
 * Lo que se sabe de un campo de hora: lo que vale y si el navegador dice que hay algo
 * escrito que no logra interpretar (`validity.badInput`).
 *
 * Existe como tipo propio para que **la regla se pueda testear sin un navegador**. El
 * `vitest` de este repo corre en `environment: "node"`: no hay `HTMLInputElement`, así que
 * cualquier regla escrita directamente contra el DOM queda verificable sólo a ojo — y esta
 * regla ya se equivocó una vez en producción.
 */
export interface EstadoHora {
  /** El `value` del input. Cadena vacía si está en blanco. */
  valor: string;
  /** El `validity.badInput` del input. */
  entradaInvalida: boolean;
}

/**
 * Qué horario se está por perder al guardar, o `null`.
 *
 * ## El problema
 *
 * **Un `<input type="time">` a medio completar tiene `value === ""`.** No devuelve lo que
 * se ve escrito: devuelve la cadena vacía, igual que si estuviera en blanco. Y en un plan
 * las horas son opcionales, así que por el valor solo no hay forma de distinguir "no puso
 * hora" de "puso hora y le falta un pedazo". La única señal que los separa es `badInput`.
 *
 * Sin esto —y el formulario lleva `noValidate`, que hace falta para que el cartel sea
 * nuestro y no el globo genérico del navegador— un horario a medio escribir se guardaría
 * en blanco sin decir nada.
 *
 * ## Por qué esto **avisa** y no bloquea
 *
 * Porque la señal miente y ya lo demostró. La primera versión cortaba el envío con
 * `badInput`, y un piloto reportó el cartel con los dos horarios puestos —`12:30` y
 * `15:30`— en un picker que ni siquiera mostraba AM/PM: **no pudo programar el vuelo**.
 * Chromium no reproduce ese estado, así que no hay forma de saber desde acá qué navegador
 * lo produce ni bajo qué condición.
 *
 * Con una señal que no se puede verificar, lo que se elige es de qué lado caer, y los dos
 * lados no cuestan lo mismo. Un falso positivo que bloquea deja a alguien sin poder usar la
 * pantalla, con todo bien cargado y sin nada que pueda hacer al respecto. Un falso negativo
 * pierde **una hora tentativa y opcional** de un plan que se edita en dos clics. Por eso el
 * plan se guarda siempre y el aviso aparece después, diciendo exactamente qué faltó.
 *
 * La condición además exige valor vacío: si hay algo utilizable en el campo, se confía en
 * el campo y no hay nada que avisar, aunque el navegador insista con `badInput`.
 */
export function avisoDeHorarios(despegue: EstadoHora, aterrizaje: EstadoHora): string | null {
  const perdido = (e: EstadoHora) => e.valor === "" && e.entradaInvalida;
  const rotos = [
    perdido(despegue) ? "despegue" : null,
    perdido(aterrizaje) ? "aterrizaje" : null,
  ].filter((x): x is string => x !== null);

  if (rotos.length === 0) return null;
  return rotos.length === 1
    ? `El horario de ${rotos[0]} quedó a medio completar y no se guardó. Editá el vuelo para agregarlo.`
    : "Los dos horarios quedaron a medio completar y no se guardaron. Editá el vuelo para agregarlos.";
}

/**
 * `avisoDeHorarios` leyendo los dos campos del formulario.
 *
 * Toda la decisión vive en `avisoDeHorarios`, que se testea; acá queda sólo la lectura del
 * DOM. Un campo que no está —o que no es un input— cuenta como vacío y sin aviso: esto
 * existe para no perder un dato en silencio, no para exigir que el formulario tenga una
 * forma determinada.
 */
export function horariosPerdidos(form: HTMLFormElement): string | null {
  const leer = (nombre: string): EstadoHora => {
    const el = form.elements.namedItem(nombre);
    if (!(el instanceof HTMLInputElement)) return { valor: "", entradaInvalida: false };
    return { valor: el.value, entradaInvalida: el.validity.badInput };
  };
  return avisoDeHorarios(leer("takeoff_time"), leer("landing_time"));
}
