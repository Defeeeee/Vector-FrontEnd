# Plan 10 — Onboarding: del registro al primer vuelo

> **Estado al 2026-08-10: cerrado.** Las cinco tareas (`O0`, `O1`, `O2`, `O3`,
> `O4`) están hechas y mergeadas. Ver la bitácora de `AGENTS.md` para lo que
> cambió al implementar: el alcance de `O0` se achicó al consultar la base, `O1`
> necesitaba un `revalidatePath` que este documento no preveía, y el paso 3 de
> `O2` se verificó contra el backend para que no cree un libro duplicado.
>
> **Lo que queda pendiente es la verificación del recorrido real** —que los writes
> de cada paso peguen contra el backend—, bloqueada por la cuenta de prueba.

## Contexto

Vector tuvo **15 usuarios registrados y un solo vuelo cargado**, el del dueño.
No es una hipótesis de producto: es el embudo medido contra la base el 2026-08-10.

| Etapa | Usuarios | |
|---|---|---|
| Se registraron | 15 | 100% |
| Llegaron a tener perfil | 10 | 67% ← *bug de RLS, ya arreglado (migración 006)* |
| Completaron el overlay de licencia | 8 | 53% |
| Cargaron ≥1 aeronave | 4 | **27%** |
| Cargaron ≥1 vuelo | **1** | **7%** |

Los dos escalones que importan son **8 → 4** (la aeronave) y **4 → 1** (el primer
vuelo). El onboarding actual pide licencia y CMA, y termina *justo antes* de los
dos. Este plan mueve esos dos escalones.

**Decisiones de Federico (2026-08-10):**
- El CMA pasa a ser **opcional y salteable**, no obligatorio.
- El overlay pasa a ser un **wizard de 3 pasos**: licencia+CMA → aeronave → horas
  de apertura.

---

## O0 — El semáforo tiene que saber decir "no sé" `S` — *va primero, y no es opcional*

**Esto habilita todo lo demás.** Si el CMA pasa a ser salteable sin tocar esto,
`pilotStatus` le dice **"vigente"** a un piloto cuyo estado médico no conocemos.

En `src/lib/pilot-status.ts:105-118`, los bloqueantes se detectan sólo por
**vencimiento**:

```ts
const vencido = documentos.find(
  (d) => BLOQUEANTES[d.kind] && documentStatus(d.expiry_date, hoy).tone === "expired"
);
```

Un documento que **no existe** no entra en ese `find` y la función sigue de largo
hasta `vigente`. Es exactamente el error que el plan 08 vino a evitar: afirmarle a
un piloto que puede volar cuando no lo sabemos.

**El patrón ya existe en la misma función.** El repaso de vuelo (línea 131) sí
trata la ausencia: `if (!repaso || ...expired)`, con un `detalle` distinto según
falte o esté vencido. Se replica eso para el CMA.

- `EstadoPiloto` suma `documento_faltante` (`src/lib/pilot-status.ts:30-35`).
- Va **después** de `documento_vencido` y **antes** del repaso: un CMA vencido es
  peor que uno no cargado, porque del vencido sí sabemos que no sirve.
- `puede`: "No podemos confirmar que puedas volar." `paraVolver`: "Cargá tu
  certificado médico en el Hangar."
- `FlightStatusCard` necesita un tono nuevo para ese estado — gris/neutro, **no
  verde y no rojo**. Ni "estás bien" ni "estás mal": "falta el dato".

**Se testea.** `src/lib/pilot-status.test.ts` ya tiene 18 casos y corre en
`environment: "node"` sobre lógica pura. Casos nuevos: sin CMA, sin licencia, sin
ninguno, y —el que evita la regresión— **con CMA vigente sigue dando `vigente`**.

---

## O1 — Nuevo Vuelo sin aeronaves deja de ser un callejón sin salida `XS`

El escalón 4 → 1. Hoy `StyledSelect` recibe `options=[]`, se abre, dice "Sin
resultados", y el `required` bloquea el submit **sin ninguna forma de
satisfacerlo**. No hay mensaje ni link. El piloto no puede avanzar y no se le dice
por qué.

**El riesgo real es la deriva entre las dos rutas.** El mismo agujero está en:
- `src/app/dashboard/log-flight/page.tsx` (página completa)
- `src/app/dashboard/@modal/(.)log-flight/page.tsx` (modal interceptado)

Este par **ya causó un bug** por tocarse uno y no el otro (ver el comentario de
`log-flight/page.tsx:11-15` sobre el orden del `Promise.all`).

**Por eso el empty state es un componente compartido, no un `if` copiado dos
veces:** `src/components/dashboard/SinAeronaves.tsx`, con la casa de estilo de
`AuditClient.tsx:344-351` (`rounded-[2rem]`, `border-dashed`, badge de ícono) y un
CTA a `/dashboard/settings`. Cada ruta hace `if (aircraft.length === 0) return
<SinAeronaves />` antes de renderizar el formulario.

**No tocar el orden del `Promise.all`** de `log-flight/page.tsx:16-20`. La guarda
va después de `const { aircraft, ... } = await getData()` (línea 51), nunca dentro
del fetch.

El empty state **embebe `AircraftForm`** tal cual, sin re-implementar el alta: ya
trae su `try/catch`, su estado de pending y su banner de error. La salida del
callejón está adentro del callejón.

### ⚠️ Sin esto, O1 no funciona

`addAircraft` (`src/actions/flight.ts:209-210`) revalida **sólo** `/dashboard` y
`/dashboard/settings`. Los GET se cachean 20 segundos
(`src/lib/api.ts:21`, `next: { revalidate: 20 }`).

`/dashboard/log-flight` **no está en esa lista**. O sea: el piloto llega al empty
state, carga su primera aeronave desde ahí, y la pantalla que le pide cargar una
aeronave **sigue ahí hasta 20 segundos**. La acción que resuelve el problema no
resuelve la pantalla.

Hay que agregar `revalidatePath("/dashboard/log-flight")` a `addAircraft`, con el
criterio de `revalidateEverythingThatCounts()` (`logbook.ts:22-30`). El comentario
de `api.ts:17-19` dice que las server actions "ya llaman a `revalidatePath`, así
que no queda data vieja" — es cierto **sólo para las rutas listadas**, y esta
suposición es justo la que rompe acá.

Verificar a mano que una sola ruta cubre también el modal interceptado, que
resuelve a la misma URL. No asumirlo.

`LiveSessionController.tsx:31-40` también avisa con `alert()` sólo si no hay
*selección*, no si no hay *aeronaves*. Queda cubierto por la guarda de la página.

---

## O2 — El wizard de 3 pasos `M`

Reescribe `src/components/dashboard/OnboardingOverlay.tsx`. Sigue siendo un modal
sobre el dashboard, montado desde `layout.tsx:137`.

**Paso 1 — Licencia y certificado médico**
- `license_type` se queda como está (default `PPA`).
- `cma_document_expiry`: **se le saca el `defaultValue="2027-12-31"`**
  (línea 102). Campo vacío, y un botón **"Lo cargo después"** que saltea.
- Si se saltea, no se llama a `upsertCmaDocument` y el semáforo lo refleja vía
  `O0`. Una nota corta en el paso lo dice, así el piloto sabe qué está
  postergando.

**Paso 2 — Primera aeronave** (salteable)
- Reusa los campos de `AircraftForm.tsx`: `registration`, `type`, `icao`
  requeridos, `type_acft` opcional.
- Llama a `addAircraft` de `src/actions/flight.ts:193`.
- ⚠️ **`addAircraft` hace `throw` en vez de devolver `{error}`**, al revés que sus
  hermanas `updateAircraft`/`deleteAircraft` (líneas 213-258). Hay que envolverlo
  en `try/catch` o —mejor— alinearlo a `{error}` como las otras dos. Alinearlo es
  el arreglo correcto; `AircraftForm` ya lo llama dentro de un `try/catch`, así que
  el cambio es compatible.

**Paso 3 — Horas de apertura** (salteable)
- Reusa `createLogbook({name, description, opening})` de
  `src/actions/logbook.ts:38`.
- **No duplicar la grilla de 12 campos.** Hoy vive dentro de `LogbookForm`
  (`LogbooksManager.tsx:167-315`), que es un bottom-sheet completo. Se **extrae**
  la grilla a `src/components/dashboard/OpeningBalanceFields.tsx`, con
  `OPENING_FIELDS` y `TOTAL_KEYS` (líneas 14-29) movidos ahí, y **tanto
  `LogbookForm` como el wizard la consumen**. Extraer, no copiar: si un día cambia
  un bucket ANAC, cambia en un solo lugar.
- En el wizard se muestra el total corriente igual que en `LogbooksManager.tsx:257-262`.
- **El riesgo de este paso, dicho:** son 12 campos numéricos en el primer minuto de
  uso, y hoy el overlay pierde gente con **dos**. Por eso el paso 3 arranca
  colapsado, con el saldo total visible y un "Cargar saldo inicial" que lo
  despliega — el que no lo necesita ve un botón, no una grilla. Si al medir el
  embudo el 10→8 empeora, este paso sale del wizard y queda sólo en el checklist.

**Transversal:** los `alert()` de `OnboardingOverlay.tsx:34,39` pasan a un banner
en el modal, como el de `AircraftForm.tsx:34-38`. Y hoy, si `updateProfile`
funciona pero `upsertCmaDocument` falla, queda a medias sin decirlo — cada paso
reporta su propio error y no avanza si falló.

---

## O3 — Checklist de primeros pasos `M`

Reemplaza el gate binario. Hoy `needsOnboarding = profile?.license_type === "-"`
(`OnboardingOverlay.tsx:22`): apenas el piloto escribe cualquier cosa el overlay no
vuelve nunca más, aunque no tenga ni aeronaves ni vuelos. Los que saltearon pasos
en el wizard necesitan un lugar donde volver.

**Va en `src/app/dashboard/page.tsx`, no en `layout.tsx`.** El layout sólo trae
`/profiles` y `/audit/summary` (línea 51); el checklist necesita aeronaves y
vuelos, y **`dashboard/page.tsx` ya los tiene** en su `Promise.all`
(líneas 27-62). Ponerlo en el layout obliga a un fetch nuevo que duplica lo que la
página ya pidió — y el plan 09 acaba de sacar viajes de más, no de agregarlos.

- `src/components/dashboard/PrimerosPasos.tsx`, con 4 ítems derivados de datos que
  ya están en memoria: licencia cargada, CMA cargado, ≥1 aeronave, ≥1 vuelo.
- Se renderiza **sólo si algún ítem falta**. Cuando están los 4, desaparece sola —
  sin estado persistido, sin columna nueva.
- **`src/lib/onboarding.ts` con `isProfileComplete(profile)`**, importado por el
  wizard *y* por el checklist. Hoy la condición está escrita a mano en
  `OnboardingOverlay.tsx:22`; con dos lugares que opinan sobre "¿terminó de
  configurarse?", el día que se agregue un campo obligatorio uno va a decir que sí
  y el otro que no. Es además de las pocas cosas de este plan con test automático
  posible (`src/lib/onboarding.test.ts`, lógica pura, config actual de vitest).
- Ubicación: entre `CustomStatsRow` (línea 238) y `ChangelogNotice` (línea 241).
  **Después de `FlightStatusCard`**, que está comentado como "la única pregunta de
  esta pantalla con consecuencias antes de despegar" y no se baja.

**De yapa:** `dashboard/page.tsx:82-92` reimplementa la suma de horas de apertura
en línea en vez de importar `openingTotals` de `src/lib/summary.ts:73-89`. Cuando
se toque el archivo, unificar.

---

## O4 — Google en `/register` `XS`

`/login` tiene el botón; `/register` no. Las cuentas de Google que existen se
crearon desde la pantalla de login: **la única pantalla que dice "Crear cuenta" es
la que no tiene el camino más corto.**

- El SVG de Google está **inline** en `login/page.tsx:268-273`, sin componente
  compartido. Se extrae a `src/components/GoogleButton.tsx` (botón + ícono +
  estado de carga) y lo usan **las dos** páginas — mismo argumento que `O1`: dos
  copias derivan.
- En `register/page.tsx` va entre el `</form>` (línea 177) y el footer (línea 179),
  espejo exacto de login.
- Reusa `getGoogleLoginUrl()` de `src/actions/auth.ts:192`. No hace falta tocar el
  callback: `src/app/auth/callback/page.tsx` ya resuelve el retorno.

---

## Orden

```
O0  ── el semáforo aprende a decir "no sé". Habilita O2 y es lo único con
       consecuencia regulatoria. Primero, y con tests.
O1  ── XS, independiente de todo, y es el escalón 4 → 1. Puede ir solo.
O4  ── XS, independiente. Puede ir solo.
O2  ── el wizard. Depende de O0.
O3  ── el checklist. Después del wizard, porque recoge lo que el wizard saltea.
```

`O1` y `O4` son independientes y se pueden mergear sueltas. **Si hubiera que hacer
sólo dos: `O0` y `O1`** — la primera porque sin ella el CMA opcional le miente al
piloto, la segunda porque destraba el paso donde el embudo se corta.

---

## Riesgos

- **La revalidación de `addAircraft`** (ver O1). Es el único bug que este plan
  introduciría si no se mira: la pantalla no se resuelve tras la acción que la
  resuelve, y se ve como "no anda" sin ningún error.
- **`addAircraft` hace `throw`** donde sus hermanas devuelven `{error}`. Alinearlo
  toca a `AircraftForm`; verificar que el alta desde Configuración siga andando.
  Mientras no se alinee, **ningún call site nuevo debe llamarlo pelado** — todos
  pasan por `AircraftForm`, que ya lo envuelve.
- **El par página/modal de Nuevo Vuelo ya derivó una vez.** El componente
  compartido es la mitigación mínima. La causa real de aquella deriva fueron **dos
  `getData()` paralelos** con el mismo fetch y el mismo manejo de 401; si entra en
  el alcance, extraer ese loader a `src/lib/log-flight-data.ts` es el arreglo
  durable. Un ítem de checklist de review no lo es.
- **Extraer `OpeningBalanceFields` toca `LogbooksManager`**, que hoy anda. La
  extracción no debe cambiar el comportamiento del alta/edición de libros.
- **No hay harness de tests de componentes.** `vitest.config.mts` es
  `environment: "node"` e `include: ["src/**/*.test.ts"]` — sin `.tsx`, sin jsdom.
  Todo lo visual se verifica a mano; por eso `O0` concentra la lógica testeable.
- **Fechas:** el wizard muestra vencimientos. Formatear en el server o no
  formatear — `toLocaleString` con hora y `new Date()` en cliente ya costaron dos
  bugs de hidratación.

---

## Verificación

**Automática**
- `npm test` — casos nuevos en `pilot-status.test.ts`: sin CMA, sin licencia, sin
  ninguno, y **con CMA vigente sigue dando `vigente`** (la anti-regresión).
- `npx tsc --noEmit` y `npm run build` limpios.
- `npm run smoke` — cubre `/register` (200), así que O4 no puede romperlo en
  silencio.

**A mano, que es donde se rompe** — en **claro y oscuro, desktop y móvil**:
1. **Cuenta nueva de verdad.** Registrarse, y recorrer el wizard **salteando todo**
   → el dashboard tiene que mostrar el checklist con 3 ítems pendientes y el
   semáforo en gris, **no en verde**.
2. Repetir completando los 3 pasos → checklist ausente, semáforo evaluado.
3. **Con cero aeronaves**, entrar a `/dashboard/log-flight` **y** abrir el modal
   desde el "+". Las dos rutas tienen que mostrar `SinAeronaves`, no un select
   vacío. Después cargar la aeronave **desde ahí mismo** y confirmar que la
   pantalla pasa al formulario real **sin refrescar a mano** — si no lo hace, falta
   el `revalidatePath` de O1, y es el modo de falla más fácil de pasar por alto
   porque no tira ningún error.
4. **Regresión:** una cuenta que ya tiene aeronaves no ve ningún cambio en
   `/dashboard/log-flight`.
4. Cargar horas de apertura en el wizard y confirmar que el total del dashboard las
   suma — contra `Configuración → Libros`, que muestra el mismo saldo.
5. Google desde `/register` completa el alta y cae en `/dashboard`.
6. **Regresión de Configuración:** alta y edición de aeronave y de libro siguen
   andando después de las extracciones.

**Cuenta de prueba:** la crea Federico. Manejar contraseñas queda fuera de lo que
hace el agente, y el smoke autenticado (`T1` del plan 07) sigue bloqueado por eso.

---

## Entregables

- `docs/brief/10-onboarding.md` — este plan, versionado en el repo con la
  convención de los otros nueve.
- Entrada en `AGENTS.md` al cerrar, con el embudo antes/después.
- Actualizar `docs/brief/06-plan-post-flightdeck.md`: esto absorbe parte de Tier 2.
