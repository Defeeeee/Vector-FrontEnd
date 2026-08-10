# Plan 08 — "¿Puedo volar hoy?" y métricas propias

## Contexto

Vector cuenta bien lo que un piloto **voló**. No contesta lo que un piloto **puede
hacer hoy**, que es la pregunta con consecuencias.

Y resulta que la RAAC 61 la contesta de forma casi literal. **61.060(a)(1)** dice
que las atribuciones de la licencia sólo se ejercen cuando se cumplen cuatro cosas
a la vez:

| | Condición | Sección | ¿Vector lo tiene? |
|---|---|---|---|
| i | Certificación médica vigente | RAAC 67 | **sí** — `documents` |
| ii | Habilitaciones válidas | — | **sí** — `documents` |
| iii | Experiencia reciente | 61.140 | **calculable** desde los vuelos |
| iv | Repaso de vuelo | 61.135 | **no existe** |

O sea que Vector ya tiene tres de las cuatro y no las junta en ningún lado. Este
plan las junta, agrega la que falta, y de paso convierte los mínimos regulatorios
en algo que el piloto define en vez de que yo hardcodee.

Al final, Vector pasa a **2.7.0**.

> **Estado al 2026-08-06: plan cerrado.** Hechas `R1`, `R2`, `R3`, `R4`, `R5`, `S1`
> y `V`. Migraciones `003` (repaso de vuelo) y `004` (custom_stats) aplicadas.
>
> **Dos cosas cambiaron al implementar:**
> - `R4` decía "no requiere esquema nuevo". Estaba mal: `documents.kind` tiene un
>   CHECK que enumera los tipos. Migración `003`, y **va antes que el frontend** o
>   el piloto ve un error al guardar.
> - `R1` no trae card propia: la UI llega con `R3`, para no construir la misma
>   dos veces.
>
> **Sin verificar a ojo:** la card del semáforo y el constructor de métricas. La
> extensión de Chrome estuvo desconectada toda la sesión y esas pantallas están
> detrás de login. La lógica está cubierta por 113 tests; lo visual no.

---

## Lo que la RAAC corrigió de la primera versión de este plan

Escribí una versión antes de leer la norma. Federico pasó la RAAC 61 Edición VI
(enero 2026) y **seis cosas estaban mal o faltaban**. Vale dejarlo escrito porque es
el argumento para no volver a planear features regulatorias de memoria:

1. **Los 90 días no son 90 para todos.** `61.140(a)(2)`: para **piloto privado**,
   planeador y globo se extiende a **180 días**. Federico es PPA — le habría dicho
   "no vigente" a alguien vigente.
2. **La recencia es por categoría, clase y tipo**, no global (`61.140(a)(1)`). Un
   piloto vigente en monomotor no lo está en multimotor.
3. **Aplica a PIC y a SIC**, no sólo al mando.
4. **Cuenta sólo como "única persona que manipula los controles"** — hay que
   filtrar por tiempo PIC, no por vuelo existente.
5. **La recencia nocturna son 180 días y exige aterrizajes "hasta la completa
   detención"** (`61.140(b)(1)`). Vector no registra ni el desglose día/noche de
   aterrizajes ni si fueron completos, así que **es doblemente incalculable** — pero
   `61.140(b)(2)` da una salida: quien mantenga **HVI vigente** cumple igual.
6. **Faltaban dos estados enteros:** el Repaso de Vuelo de 24 meses (`61.135`) y la
   pérdida total de atribuciones por 24 meses de inactividad (`61.060(a)(2)`).

---

## Verificado contra el código

| Afirmación | Comprobación | Resultado |
|---|---|---|
| No existe recencia | `grep -rli "recen\|currenc"` en `src/` | **no existe** |
| Existe progreso de licencia | `src/components/dashboard/PCATracker.tsx` | **existe y es completo** |
| `landings` se separa día/noche | `src/types/index.ts:8` | **no** — un solo número |
| Se registra si el aterrizaje fue completo | `Flight` | **no** |
| Los saldos iniciales tienen fecha | `Logbook.opening_*` | **no** |
| Hay estado de vencimiento reusable | `documentStatus` — `src/lib/utils.ts:170` | sí — `{daysRemaining, tone, label}` |
| Hay clase de aeronave | `Aircraft.type_acft` (MONT-T, MULT-T) | sí |
| Hay avisos por WhatsApp de vencimientos | `api/cron/document-alerts` | sí |
| Última migración | `FlightLog-BackEnd/migrations/` | `002` → la próxima es `003` |

**Busqué el progreso de licencia con nomenclatura OACI (PPL/CPL) y no lo encontré;
el repo usa la argentina (PPA/PCA).** Buscar también con los términos locales antes
de dar algo por ausente.

---

## R1 — Experiencia reciente (61.140) `M`

**Qué.** 3 despegues y aterrizajes con circuito completo, como única persona a los
controles, **por clase de aeronave**, dentro de la ventana que corresponda.

**Ventana:** 90 días, o **180 si la licencia es de piloto privado**. `license_type`
es texto libre, así que se deriva igual que hoy hace `PCATracker` —busca "PPA" o
"PRIVADO"— y **la ventana usada se muestra en pantalla**, para que un valor raro en
ese campo sea visible y no silencioso.

**Dónde.** `src/lib/recency.ts`, puro y testeable. Card en el dashboard.

**Cómo.** Por cada clase (`Aircraft.type_acft`), recorrer los vuelos de esa clase
del más nuevo al más viejo, contando `landings` de vuelos con tiempo PIC o SIC > 0,
hasta llegar a 3. La fecha de ese vuelo **+ ventana** es el vencimiento. Se reusa
`documentStatus` para el tono y el texto, así lee igual que los vencimientos que el
piloto ya conoce.

**Tres límites que se muestran, no se esconden:**

- **Los saldos iniciales no cuentan** — no tienen fecha. Un piloto que cargó su
  historial como saldo inicial aparecería como no vigente. Es el mismo criterio que
  `PCATracker` ya documenta.
- **Los despegues no se registran aparte**; se usa `landings` como proxy.
- **El circuito completo tampoco.** La norma pide despegue y aterrizaje *con su
  circuito*; Vector no lo distingue.

**Nocturna: no se calcula, y se dice por qué.** Requiere aterrizajes nocturnos
hasta la detención completa, dos datos que no existen. La card muestra *"no
calculable con los datos del libro"* en vez de un número inflado — salvo que el
piloto tenga **HVI vigente**, caso en que `61.140(b)(2)` la da por cumplida y eso sí
se puede afirmar.

**Criterio:** con los vuelos reales, la fecha coincide con `fecha del 3er aterrizaje
hacia atrás + ventana`, calculada a mano; un piloto con vuelos sólo en MONT-T
aparece no vigente en MULT-T.

---

## R2 — Sobreconteo de aterrizajes nocturnos en `PCATracker` `XS`

`PCATracker.tsx:55` suma **todos** los aterrizajes de un vuelo como nocturnos si el
vuelo tiene alguna hora nocturna. Una sesión de circuitos que cruza el ocaso —seis
aterrizajes, uno solo después de la puesta— suma seis.

Quien lo escribió fue explícito sobre este riesgo un renglón más arriba, al excluir
los saldos iniciales: *"inflar un requisito de aterrizajes nocturnos es el tipo de
error que manda a un piloto a un checkride corto"*.

**Regla nueva:** si el vuelo es **enteramente** nocturno (`pic_day_* == 0`), cuentan
todos sus aterrizajes; si es mixto, cuenta **uno**. Subcuenta en vez de inflar, que
es el lado correcto del error.

**Criterio:** test con un vuelo mixto de 6 aterrizajes → 1; uno enteramente nocturno
de 6 → 6.

---

## R3 — Semáforo `61.060(a)(1)` `M`

Una card arriba del dashboard que evalúa **las cuatro condiciones de la norma** y no
contesta sí/no sino **qué podés hacer**, que es lo que la regulación realmente
define:

| Estado | Qué se puede |
|---|---|
| Las cuatro en verde | PIC con pasajeros |
| Recencia vencida, repaso vigente | **Auto-reentrenamiento**: volar solo, sin personas a bordo ni carga, a hacer los circuitos faltantes (`61.140(c)(2)(i)`) |
| Repaso vencido | No se puede actuar como PIC. Repaso de 1 h tierra + 1 h vuelo con instructor (`61.135(b)`) |
| CMA vencido | No se ejercen atribuciones (`61.060(a)(1)(i)`) |
| Más de 24 meses sin volar | Pérdida total: reentrenamiento **y** examen de pericia ante ANAC (`61.060(a)(2)`) |

Cada estado cita la sección, para que el piloto pueda verificarlo y para que quien
lea el código sepa de dónde salió el número.

No incluye estado de aeronave: se descartó porque Vector apunta a alumnos de
escuela, que no son dueños del avión.

Si todo está en verde la card va compacta y sólo se expande cuando hay algo que
mirar — mismo criterio que `WhatsAppMissingNotice`, que aparece únicamente cuando
duele.

---

## R4 — Repaso de vuelo como documento `S`

Es la condición que falta y **no se puede derivar de los vuelos**: la norma pide un
repaso con instructor **firmado en el libro** (`61.135(a)(2)`), y Vector no tiene
firmas ni un código de finalidad que lo identifique.

**Se modela como un documento más**, junto al CMA: `kind = "repaso_vuelo"`, con
fecha de realización y vencimiento a **24 meses contados desde el mes** —granularidad
de mes, como dice `61.135(a)`—. Con eso hereda gratis la lista de vencimientos y los
**avisos por WhatsApp** que ya funcionan.

No requiere esquema nuevo: `documents` ya tiene `kind`, `issued_date` y
`expiry_date`.

**Excepciones que conviene anotar en la UI** (`61.135(c)(d)(e)`): quien aprobó una
prueba de pericia, completó fases de un programa 121/135, o es instructor con
licencia vigente renovada, no necesita el repaso.

---

## R5 — Inactividad mayor a 24 meses `XS`

`61.060(a)(2)`: más de 24 meses sin actividad de vuelo y se pierden **todas** las
atribuciones — ya no alcanza un repaso, hace falta reentrenamiento con instructor y
examen de pericia ante la ANAC.

Es el estado más grave y el más fácil de detectar: fecha del último vuelo. Entra
como el peor estado del semáforo de R3, y como aviso anticipado a los 21 meses vía
la maquinaria de alertas que ya existe.

---

## S1 — Motor de métricas propias `L`

**La idea de fondo:** si un piloto define sus propias métricas, la recencia y los
hitos pasan a ser *presets* de una misma cosa, y **los mínimos dejan de estar
hardcodeados** — que es justo la limitación de `PCATracker`, atado a un único camino
PPA → PCA.

**Es para todos, no para power users**, así que la UI manda y el regex es la salida
de emergencia.

```
nombre     "Recencia multimotor"
métrica    horas | aterrizajes | vuelos
filtros    clase · aeronave · finalidad · aeródromo · ventana de días
objetivo   3            (opcional: sin objetivo es sólo un contador)
avanzado   regex sobre route | purpose | remarks
```

Con eso salen sin escribir código por cada una: recencia por clase, habilitación por
tipo, hitos personales, horas de instrucción recibida.

**Dónde vive.** Evaluación en `src/lib/custom-stats.ts`, puro y testeable —mismo
criterio por el que los guards del copiloto se sacaron a `src/lib/copilot-guards.ts`.
Persistencia en tabla `custom_stats` + controlador siguiendo el patrón de
`src/controllers/logbooks.py`, migración `003`. UI: constructor en el Hangar,
métricas activas en el dashboard.

**El regex se evalúa en el cliente, a propósito.** El dashboard ya tiene todos los
vuelos cargados, así que un patrón catastrófico cuelga **la pestaña de quien lo
escribió, no el servidor de todos**. Igual van tope de largo y timeout; algo a prueba
de todo necesitaría RE2 o un sandbox, que no está en las dependencias.

**Presets** que se agregan con un toque: recencia, primeras 100 horas, aeródromo
número 20. Eso resuelve los hitos sin ser una feature aparte.

---

## V — Versión 2.7.0 `XS`

`package.json`, login, registro y `ChangelogNotice`. En novedades va lo que el piloto
ve: el semáforo, la recencia y las métricas propias.

---

## Orden

```
R2  ── independiente y es un número equivocado en producción: arranca por acá
R1  ── base del resto
R4  ── documento, independiente de R1
R3  ── necesita R1, R4 y R5
R5  ── trivial una vez que existe R3
S1  ── la más grande; usa R1 como preset
V   ── al final
```

---

## Verificación

- **Tests** (`npm test`, hoy 59): `recency.ts` y `custom-stats.ts` son puros y van
  cubiertos. Casos que importan: el vuelo mixto de R2, la ventana de 180 días para
  privado, el aislamiento por clase, y que los saldos iniciales no cuenten.
- **Datos reales:** contrastar la recencia contra los vuelos de Federico calculando
  a mano la fecha del tercer aterrizaje hacia atrás, por clase.
- **Build y smoke** (`npm run build && npm run smoke`, 12 rutas).
- **A ojo, con sesión:** el semáforo en sus cinco estados —forzando fechas— y el
  constructor de métricas. Estas pantallas están detrás de login; es la deuda de
  verificación que quedó del plan 07.
- **Bitácora** en `AGENTS.md` al cerrar, con las secciones de la RAAC citadas, para
  que el próximo sepa de dónde salió cada número.

## Fuentes

`RAAC Parte 61, Edición VI (enero 2026)` — secciones `61.060`, `61.135`, `61.140`.
Copia en `~/Downloads/anexo_7559671_1 new 27012026.pdf`. **Conviene versionar el PDF
o al menos las secciones citadas en `docs/`**, porque el plan depende de números que
hoy sólo viven en la carpeta de descargas de Federico.
