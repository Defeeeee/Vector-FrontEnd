# Plan 09 — Velocidad del dashboard y simplificación

> **Estado al 2026-08-07: cerrado.** Hechas `P1`, `P2` y `P5`.
>
> **`P3`, `P4` y `P6` no se hicieron, y el motivo importa:**
> - `P4` — la premisa era falsa. El bundle mide **1.82 MB antes y después**;
>   `pdf-lib` nunca estuvo en el cliente porque `ExportPdfButton` era código
>   muerto. Se borró el componente y la dependencia.
> - `P3` — también falsa. El payload son **33 KB** y la única columna sin usar
>   ahorraría **1,5 KB**.
> - `P6` — sin número al que apuntar (Turbopack no imprime First Load JS por ruta)
>   y sin subconjunto seguro: los únicos dos componentes sin hooks son los
>   envoltorios de `next/dynamic`, que tienen que ser cliente.
>
> Tres de seis tareas se cayeron al medirlas. Las que quedaron valen ~2 segundos.

## Contexto

El dashboard es la pantalla que más se abre y la que más tarda. Nada de eso es
misterioso: **hace tres viajes al backend en serie**, y el primero dispara **ocho
consultas a Supabase también en serie**.

El número que ordena la prioridad:

```
api.flightlog.fdiaznem.com.ar/health   TTFB 547 ms
```

`/health` hace **una** consulta trivial. Ese medio segundo es el piso de cualquier
llamada al backend, y el dashboard paga tres.

Y hay una segunda mitad: **los dos copilotos están duplicados**, y esa duplicación
ya causó un problema real que este plan aprovecha para cerrar.

---

## Medido, no supuesto

| Qué | Cómo se midió | Resultado |
|---|---|---|
| Round trips del dashboard | `dashboard/page.tsx` | **3 en serie**: `/dashboard` → `/logbooks` → `/custom-stats` |
| Consultas del backend | `controllers/dashboard.py` | **8 `.execute()` secuenciales** |
| El cliente de Supabase | `supabase-py` | **sincrónico** — cada `.execute()` bloquea el event loop |
| Costo de un round trip | `curl` contra producción | **547 ms** para una consulta |
| Paginación de vuelos | `/dashboard` | **no hay** — devuelve todos, siempre |
| Componentes cliente | `grep '"use client"'` | **39 de 45** en el dashboard |
| `pdf-lib` en el bundle | `ExportPdfButton.tsx:7` | **import estático** desde un componente cliente |
| `recharts` | `DashboardChartsLazy` | ya está diferido |
| Guardrails del copiloto | `grep` en `api/chat/route.ts` | **cero de cinco** |

---

## P1 — Los tres viajes en serie pasan a uno `XS`

```ts
const { ... } = await getDashboardData();   // /dashboard  + /logbooks (en serie)
const customStats = await listCustomStats(); // /custom-stats
```

Tres esperas encadenadas donde ninguna depende de la anterior. Un `Promise.all`
las convierte en el tiempo de la más lenta.

**Es la mejora más grande por línea cambiada de todo el plan.** Con 547 ms de piso
por llamada, pasar de tres secuenciales a tres en paralelo saca alrededor de un
segundo.

Archivo: `src/app/dashboard/page.tsx`.

---

## P2 — Las ocho consultas del backend, en paralelo `S`

`controllers/dashboard.py` encadena ocho `.execute()`: perfil, aeronaves, vuelos,
sesión, packs, transacciones, auditoría y documentos. Ninguna depende de la
anterior salvo por el `user_id`, que ya se tiene.

**El cliente de `supabase-py` es sincrónico**, así que además de tardar, cada
consulta *bloquea el event loop* — con dos pilotos entrando a la vez, se hacen cola
entre ellos. Envolverlas en `asyncio.to_thread` y juntarlas con `asyncio.gather`
arregla las dos cosas de una.

**Cuidado con no volverlo peor:** ocho hilos por request multiplican las conexiones
a Supabase. Conviene agrupar en dos o tres tandas antes que abrir ocho de golpe, y
mirar los límites del plan de Supabase antes de decidir.

---

## P3 — Dejar de traer columnas que nadie usa `S`

`/dashboard` hace `select("*")` sobre `flights` y devuelve todos los vuelos. Hoy son
41 y no se nota; el payload crece para siempre con la carrera del piloto.

**Lo que no voy a hacer es paginar.** Las métricas propias (`S1` del plan 08) se
evalúan en el cliente sobre la lista completa, y paginar las rompería en silencio —
mostrarían números menores sin decir que están mirando una parte. Paginar de verdad
exige mover ese cálculo al servidor, y eso es otro plan.

Lo que sí entra: pedir sólo las columnas que las pantallas usan. Es una reducción
de payload sin cambio de comportamiento.

---

## P4 — `pdf-lib` fuera del bundle `XS`

```ts
// ExportPdfButton.tsx — componente cliente
import { generateLogbookPdf } from "@/lib/pdfGenerator";  // → pdf-lib
```

Un import estático desde un componente cliente: **`pdf-lib` viaja al navegador de
todo el que abra esa pantalla**, haya tocado el botón o no. Pasa a `import()`
dinámico dentro del handler del click.

`recharts` ya está diferido con `DashboardChartsLazy`; esto es el mismo patrón
aplicado donde falta.

---

## P5 — Unificar los dos copilotos `M`

`api/webhooks/whatsapp/route.ts` (1199 líneas) y `api/chat/route.ts` (710) tienen
cada uno su propio `buildFlightContext`, su `getAirportInfoHelper` y su declaración
de herramientas.

**Y la duplicación ya costó algo concreto.** Los guardrails del plan anterior
—confirmación en dos pasos, validación del desglose ANAC, canonicalización de la
ruta, límite de mensajes— están **sólo en el de WhatsApp**:

```
copilot-guards   0        breakdownError   0
pendingFlight    0        canonicalRoute   0
rateLimited      0        ← en api/chat/route.ts
```

El copiloto de la app **escribe vuelos sin ninguna de esas defensas**. O sea que
"el copiloto ya no puede escribir un vuelo mal" es cierto por WhatsApp y falso
dentro de la app.

Sale a `src/lib/copilot/`: contexto, herramientas y ejecución compartidas; cada
ruta se queda sólo con lo suyo —firma del webhook y formato de WhatsApp de un lado,
sesión del otro—. Los guards se aplican en el camino compartido, así no se puede
volver a arreglar la mitad.

**Esto no es cosmética: es la tarea que cierra el agujero.**

---

## P6 — Menos componentes cliente `M`

39 de 45 componentes del dashboard son `"use client"`, y `framer-motion` está
importado en 27 archivos. Muchos son cliente por una animación de entrada o por un
ícono, no porque necesiten estado.

Es la tarea más difusa de medir y por eso va última: conviene atacarla **después**
de P1–P4, con un número de referencia ya mejorado, y sólo donde se note.

---

## Cómo se mide

Sin medición antes y después, esto es fe. Y **la pantalla que importa está detrás
de login**, así que:

1. **Instrumentar primero.** `console.time` alrededor de cada fetch en
   `dashboard/page.tsx` y del handler de `/dashboard` en el backend. El propio log
   de Next ya imprime `application-code` por request, que sirve de testigo.
2. **Tomar la línea de base** con la cuenta real antes de tocar nada, y anotarla.
3. **Después de P1 y P2**, repetir y comparar. Si la mejora no aparece en el
   número, la hipótesis estaba mal y hay que volver a medir en vez de seguir.
4. **Para el bundle:** `npm run build` imprime el First Load JS por ruta. Anotar el
   de `/dashboard` y `/dashboard/history` antes y después de P4.
5. `npm test` (113 hoy) y `npm run smoke` en cada paso.

**Queda pendiente el smoke autenticado** (`T1` del plan 07, bloqueado por la cuenta
de prueba). Con esa cuenta, la medición del dashboard se podría automatizar en vez
de hacerla a mano.

---

## Orden

```
P1  ── una línea, la mejora más grande. Primero.
P2  ── el backend; mirar límites de conexiones de Supabase antes.
P4  ── independiente de todo, y trivial.
P3  ── payload; sin tocar el comportamiento.
P5  ── la más grande, y la única que cierra un agujero de seguridad.
P6  ── al final, con un número ya mejorado y sólo donde se note.
```

Si hubiera que hacer sólo dos: **P1 y P5**. La primera porque es un `Promise.all`
que saca cerca de un segundo; la segunda porque hoy hay un camino que escribe en la
bitácora sin las defensas que el otro sí tiene.
