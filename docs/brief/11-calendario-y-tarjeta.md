# Plan 11 — El calendario y la tarjeta

## Contexto

El embudo medido contra la base el 2026-08-10: **15 usuarios registrados, 1 vuelo
cargado**. El Plan 10 atacó eso sacando obstáculos del onboarding y está mergeado,
pero todavía sin medir.

Este plan lo ataca por dos lados distintos.

**El calendario cambia *cuándo* se piden los datos.** Hasta ahora todo el esfuerzo
fue lograr que el piloto cargue el vuelo **después**, de memoria, con el avión ya
guardado. Un vuelo programado invierte el orden: la ruta, la aeronave y la fecha se
escriben **antes de volar**, cuando están frescas y hay entusiasmo. El registro deja
de ser entrada de datos y pasa a ser confirmación.

**La tarjeta compartible es el motor de crecimiento.** El resumen de horas de un
piloto es lo único de un libro de vuelo que alguien le muestra a otro, y hasta hoy
no había forma de sacar nada de Vector que se pudiera mandar por WhatsApp.

**Fuera de alcance, por decisión de Federico:** el calendario **no** se integra con
el copiloto de WhatsApp, y la tarjeta **no** lleva mapa.

---

## C0 — La tabla `planned_flights`

### Tabla aparte, nunca una columna en `flights`

Es la decisión estructural del plan, y hay tres motivos en orden de fuerza:

1. **`flights` tiene `NOT NULL` en `landings`, `duration`, `takeoff`, `landing` y
   `purpose`.** Un plan no tiene ninguno de los cinco: "el sábado a la mañana" no
   tiene hora de aterrizaje. Meterlo ahí obliga a aflojar las restricciones de la
   tabla que **es** el documento legal, para acomodar filas que no lo son.

2. **Toda consulta agregada leería vuelos que no existen** salvo que le agreguen un
   filtro nuevo: `summary.ts`, `anacMatrix`, el motor de auditoría, `pilot-status`,
   los totales del dashboard, el CSV y el export JSON. Un filtro olvidado le infla
   las horas a alguien en un papel que presenta ante ANAC, y ese error no se ve.

3. **`POST /flights` tiene efectos.** `create_flight` llama a
   `_sync_flight_transaction`, que en modo balance **cobra la hora contra el saldo
   del piloto**, y después recalcula la auditoría. Un plan viviendo en `flights`
   cobraría plata por un vuelo que no ocurrió.

**Invariante:** ninguna función de agregación recibe jamás una fila de esta tabla.

### La migración `009`

Columnas: `date` (lo único obligatorio), `aircraft_id` nullable con
`on delete set null`, `route`, `notes`, `status`
(`programado`/`completado`/`descartado`), `flight_id`, `postponed_until`.

Dos índices más allá del de usuario+fecha:

- **Único parcial sobre `flight_id`.** Un vuelo no puede cerrar dos planes; sin
  esto, dos planes del mismo día apuntando al mismo vuelo hacen que el calendario
  muestre dos vuelos donde hay uno.

**RLS con las cuatro políticas explícitas**, y no la variante de una sola `for all`
que usa `custom_stats`. La migración `006` es la razón: a `profiles` le faltaba la
de `insert` y el camino de auto-reparación del backend falló en silencio para 5 de
15 usuarios. Cuatro políticas escritas hacen visible cuál falta.

---

## C1 — La pestaña

`/dashboard/calendario`, server component, con el ítem **al final** de `navItems`
—entra novena, o sea a la hoja "Más" en el teléfono— porque reordenar los primeros
cinco movería íconos que la gente ya tiene en la memoria muscular.

**El mes se navega por `searchParams` (`?mes=2026-08`), no por estado de cliente.**
Además de hacerlo linkeable, saca la aritmética de fechas del navegador: ni qué mes
es ni qué día es hoy se deciden en el cliente, los dos bajan resueltos desde el
server. Este repo ya pagó dos bugs de hidratación por lo contrario.

La grilla muestra **lo programado y lo ya volado**. Que estén los dos no es
decorativo: un calendario que sólo muestra planes arranca vacío para todo el mundo y
no le sirve a nadie hasta que el piloto adopte una costumbre que todavía no tiene.

Dos presentaciones sobre **una sola estructura de datos**: grilla en escritorio y
agenda en el teléfono, porque abajo de `sm` siete columnas dan celdas de ~44 px y no
entra "SADF SADR".

---

## C2 — La conversión, que es el punto de todo esto

### Reusar el prefill que ya existía

`/dashboard/log-flight` **ya parseaba** `?prefill=true&aircraft_id&route&...` desde
que lo estrenó el camino de WhatsApp/Atajos de iOS. Así que **"Completar" es un
link**, no un formulario nuevo — y como es la misma URL, entra por la ruta
interceptada y se abre como modal sobre el dashboard, gratis.

**La duplicación del parseo se borró en vez de comentarse.** Los dos archivos
—página y modal— llevaban un comentario diciendo "si tocás uno, tocá el otro", y aun
así ya habían derivado una vez. Ahora hay un solo `parsePrefill` en
`src/lib/prefill.ts`, con tests. De paso arregla dos bugs que estaban ahí:
`?landings=hola` dejaba `NaN` en un campo numérico, y las claves ausentes se
asignaban con un cast que dejaba `undefined` en propiedades tipadas `string`.

### El marcado es best-effort, a propósito

`logFlight` lee el `planned_id` que viaja como hidden input y, **con el vuelo ya
creado**, marca el plan como `completado` con su `flight_id`. Dentro de su propio
`try/catch`, y antes del `redirect` —que tira `NEXT_REDIRECT`, así que nada de lo
que vaya después corre.

Si el marcado falla, el vuelo ya está guardado, que es lo único que importa: es el
registro legal. El plan queda en `programado` y la tarjeta vuelve a preguntar — un
recordatorio duplicado, molesto y visible. Revertir el vuelo para mantener limpio un
recordatorio sería perder una entrada de bitácora por un post-it. **Es la misma
dirección de falla que el marcado de los avisos de vencimiento: el peor caso es
repetir, nunca callar.**

### La tarjeta del dashboard

Entre `FlightStatusCard` y `CustomStatsRow`: es lo único de la pantalla, además del
semáforo, que le pide algo al piloto, y va arriba de las métricas propias porque
todas se calculan sobre los vuelos —hasta que este se cargue, todas están cortas.

**Tres botones, no cuatro.** *"Lo volé pero distinto"* no lleva botón propio: el
prefill es editable, así que se entra por "Completar" y se cambia lo que haga falta.
Un segundo botón al mismo destino es un segundo botón.

**No aparece si el piloto no tiene ningún vuelo.** `PrimerosPasos` ya es dueño de
esa pantalla y su cuarto paso es exactamente "registrá tu primer vuelo".

Tope de dos: con tres o más se colapsa a una línea con link al calendario. Una
interrupción que enumera cinco cosas ya no es una interrupción, es una pantalla.

---

## T0 — La tarjeta compartible

### Generada con `ImageResponse`, sin dependencias nuevas

`next/og` ya viene adentro de Next 16 —`node_modules/next/og.js` exporta
`ImageResponse` y `@vercel/og` trae satori y `resvg.wasm` vendorizados—.

**Los números salen de la sesión, en el servidor. Nunca del query string**, que sólo
dice *qué fichas* mostrar. Un número en la URL es falsificable, y esta imagen se
comparte como si fuera un dato. Por lo mismo, la ruta **no** lleva ni llevará un
parámetro `user_id` "por si algún día queremos una tarjeta pública": eso necesita un
token firmado y su propio modelo de amenaza.

### Las fuentes hay que vendorizarlas

`next/font/google` descarga las tipografías en build y **no deja nada en disco que
satori pueda leer**. Se vendorizaron `Nunito-ExtraBold.ttf` e
`IBMPlexMono-SemiBold.ttf` (OFL, con su licencia al lado).

**Y no se cargan como documenta `@vercel/og`.** Ese patrón —`fetch(new URL(...,
import.meta.url))`— es sólo para el runtime edge; en Node `import.meta.url` resuelve
a un `file://` y el `fetch` de Node no lo soporta: tira "not implemented... yet...".
Van con `fs.readFile`, y **perezosas**: a nivel de módulo el intento corría durante
`next build` y lo rompía.

### La composición

1080×1080, fondo `#111111`, **siempre oscura**: una imagen compartida no tiene tema
del que enterarse. El acento (`#38bdf8`) se gasta en **un solo elemento**, el número
grande — la regla escrita en `globals.css`. Todo lo que se lee como medición va en
IBM Plex Mono, que se eligió por el cero barrado.

**satori entiende un subconjunto de CSS**: sin grid, sin variables CSS, sin
Tailwind, sin `filter: blur()`. La tarjeta es un archivo aislado con estilos inline
que **imita** el sistema de diseño; no se puede importar ningún componente de la
app. Esa duplicación es inevitable y está documentada en el archivo.

### Selección con preview, no drag and drop

El preview **es literalmente la imagen final**: `<img src="/api/share-card?tiles=...">`,
el mismo endpoint y los mismos bytes. Dibujar una vista previa en HTML sería una
segunda implementación del mismo diseño sin nada que las mantenga sincronizadas — el
problema que el par página/modal ya tiene, y acá peor, porque **no hay harness de
tests de componentes** que lo pueda atrapar.

Por lo mismo se descartó el drag and drop: es la superficie manual más grande de
verificar, con cero cobertura automática, para reordenar cuatro fichas. El orden en
que el piloto las toca es el orden en que salen.

**La privacidad se resuelve por construcción:** matrícula y aeródromos son fichas
opcionales que el piloto elige, no datos que la tarjeta filtre por default.

---

## Verificación

**Automática:** `tsc` = 0 · `npm test` 186/186 (eran 142) · `npm run build` limpio ·
`npm run smoke` 14 rutas, con `/dashboard/calendario` (307) y `/api/share-card`
(**401** sin sesión, que es lo que comprueba que el chequeo de auth sigue ahí).

Los dos casos anti-regresión que importan:
- **"un vuelo programado para hoy no es pendiente"** — el día no terminó, y
  preguntarle a las 9 de la mañana si ya voló es la forma más rápida de enseñarle a
  ignorar la tarjeta.
- **"el héroe incluye las horas de apertura"** — un piloto que migró 500 horas de
  papel y comparte "1.0 hs" es el peor resultado posible.

**A mano**, que es donde se rompe: la comprobación central es programar un vuelo con
fecha de ayer y confirmar que **el total de horas del dashboard no se movió**. Un
plan no es un vuelo.
