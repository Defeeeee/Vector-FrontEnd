# Plan de trabajo posterior a la tanda "look de FlightDeck"

Este documento reemplaza como backlog vigente a las tablas de prioridad de
`04-hallazgos-adicionales-fase1.5.md` y `05-resumen-de-horas-y-hallazgos-finales.md`,
que quedaron parcialmente hechas en la tanda del **2026-08-01** (PR #9).

Se escribió **después** de comparar Vector contra FlightDeck en vivo, pantalla por
pantalla, con la cuenta real. Varias cosas que `04` y `05` daban por ciertas ya no
lo son: ver la sección "Correcciones al research previo" al final.

Cada tarea está pensada para entrar en **un commit o una PR chica**. Tienen id
estable (`T0.1`, `T2.3`…) para poder referenciarlas desde la bitácora.

**Leyenda de esfuerzo:** XS < 1 h · S ≈ media jornada · M ≈ 1–2 jornadas · L > 2 jornadas.

**Hechas:** `T2.1` · `T0.1` · `T0.2` · `T0.3` · `T0.6` · `T3.1` · `T3.3` · `T3.5` · `T3.6` · `T5.1`.
**Parcial:** `T0.4` — el scroller de la matriz ANAC se verificó constriñendo la card
a 358 px (scrollea sola, la página no desborda), pero **las media queries no se
pudieron probar**: la ventana de Chrome del entorno no baja de ~1514 px.
**Sin probar:** `T0.5` — con los datos reales de Federico ningún período queda
vacío, así que el empty state no se alcanza desde la UI.

### Auditoría del 2026-08-03 — qué es realmente nuevo

Este documento nació con **cinco tareas que describían cosas que ya existían**.
Todas las pendientes se verificaron contra el código; el resultado está anotado en
cada una. Resumen:

| Estado | Tareas |
|---|---|
| **Nuevo de verdad, confirmado** | `T2.1` `T2.2` `T2.3` `T2.4` `T2.5` `T2.6` `T2.7` `T2.8` `T3.9` `T4.1` `T4.2` |
| **Ya existía, se reescribió el alcance** | `T3.4` `T3.5` `T3.6` `T3.7` `T3.8` |
| **No es código, es configuración o una acción** | `T1.1` `T1.2` `T1.3` `T1.4` `T5.2`–`T5.4` |

Comprobaciones concretas: `Rol`, `Reglas de vuelo`, `matrícula manual`, `libro de
vuelo` y `observaciones` tienen **cero referencias** en `FlightLogForm.tsx` y en
`types/index.ts`. `UTC` aparece sólo como texto de dos labels, no como toggle. No
hay ninguna librería de mapas en `package.json`, ni ningún archivo que mencione
`sparkline` o `novedades`. De aeródromos existe `/api/airports/search` pero
**ninguna página**.

**Regla para el próximo que edite este documento:** verificá contra el código
antes de escribir una tarea. Cinco de las primeras veintiocho describían trabajo ya
hecho, y una tarea falsa cuesta más que una tarea faltante — manda a alguien a
construir algo que ya está.

---

## Tier 0 — Deuda de verificación

Va primero porque protege trabajo **ya mergeado**. La tanda de PR #9 se cerró con
varias pantallas que nunca se vieron renderizadas: el entorno de navegador de esa
sesión dejó de poder tomar capturas a mitad de camino, y la ventana no bajaba de
~1514 px, así que tampoco hubo pasada móvil.

| id | Tarea | Esfuerzo | Criterio de aceptación |
|---|---|---|---|
| T0.1 | Dashboard sin el hero split-flap | XS | Se ve a ojo en claro y oscuro; la fila de 4 tiles no desborda |
| T0.2 | Mockups de la landing | XS | Los 4 mocks se ven nítidos y siguen el tema; hoy solo están verificados por DOM |
| T0.3 | Login split screen a 375 px | XS | Panel de contexto oculto, form usable, sin scroll horizontal |
| T0.4 | `/dashboard/summary` a 390 px | S | **Riesgo concreto:** la matriz ANAC tiene `min-w-[520px]` dentro de un `overflow-x-auto`. Verificar que scrollea sola y no arrastra la página |
| T0.5 | `/dashboard/summary` con libro vacío | XS | El empty state aparece; ninguna sección tira `NaN` ni divide por cero |
| T0.6 | Filtro de período en los 5 valores | XS | 28D/90D/6M/1A/Todo; los totales de la matriz siempre cierran con el odómetro |

---

## Tier 1 — Cosas rotas o que prometen algo que no cumplen

No es diseño. Es la app no haciendo lo que dice.

### T1.1 — Configurar el cron de vencimientos ⚠️ *lo más importante de la lista*

La Fase 4 guarda documentos y calcula vencimientos, pero **si el cron no está
configurado no avisa nunca**. Un piloto que confía en Vector para el aviso del CMA
hoy no recibe nada, y eso es peor que no tener la feature: genera confianza falsa
sobre algo con consecuencias regulatorias.

- `DOCUMENTS_ALERT_SECRET` con el **mismo valor** en el `.env` del backend y del
  frontend. Si falta, el barrido rechaza la llamada a propósito (corre con service
  role sobre todos los usuarios: falla cerrado).
- Entrada de cron diaria contra
  `POST /api/cron/document-alerts?secret=$DOCUMENTS_ALERT_SECRET`.
- Devuelve `{pending, sent, skipped, failed}`. `skipped` son pilotos sin WhatsApp
  cargado; quedan **sin marcar** para que el aviso salga si después lo cargan.

**Esfuerzo:** XS (es configuración, no código). **Criterio:** una corrida manual
devuelve el JSON y un vencimiento de prueba dispara el mensaje.

### T1.2 — Correr la auditoría una primera vez por usuario

**Esfuerzo:** XS. El recálculo se dispara solo al crear/editar/borrar un vuelo, así
que un libro que no se toca no tiene hallazgos. El botón **Reanalizar** de
`/dashboard/audit` lo fuerza.

### T1.3 — Secuencia para borrar `profiles.cma_expiry`

**Esfuerzo:** S. **Orden obligatorio** — el paso 3 antes del 1 rompe producción:

1. Desplegar el backend actual.
2. Sacar `cma_expiry` de `ProfilesController.get_profiles`, de
   `src/models/profile.py` y de `Profile` en `src/types/index.ts`.
3. Recién ahí: `ALTER TABLE public.profiles DROP COLUMN cma_expiry;`

### T1.4 — Arreglar `WhatsAppController._verify_secret`

**Esfuerzo:** XS, pero **coordinado**. Cae a la constante hardcodeada
`"shared-vector-secret-2026"` porque `whatsapp_webhook_secret` no está declarado en
`src/config.py` y `extra="ignore"` descarta la variable de entorno. Hay que cambiar
los dos lados **a la vez** o se corta el bot.

---

## Tier 2 — Nuevo Vuelo: el gap estructural que queda

Es la pantalla más usada y donde el brief quedó más desactualizado. Medido en vivo:

| | Vector | FlightDeck |
|---|---|---|
| Ancho / radio | 930 px / 40 px | 1024 px / 20 px |
| Scroll | 1415 px de contenido en 690 px | **cero** |
| Layout | una columna | dos columnas |
| Desglose ANAC | inline (secciones 02/03/04) | panel deslizante tras un botón |

**La clave no es el layout, es la divulgación progresiva.** FlightDeck entra sin
scroll porque esconde el desglose detrás de "✦ Ajustar valores y desglose ANAC".

### Solo frontend

| id | Tarea | Esfuerzo | Nota |
|---|---|---|---|
| T2.1 | Desglose ANAC a panel deslizante | M | **El de mayor impacto.** Secciones 02/03 pasan a un drawer con Total Block Time fijo arriba. Conservar el bucket "resto" y el flag `pooled` del hook — ver la entrada de Fase 1 en AGENTS.md |
| T2.2 | Layout en dos columnas | S | Solo desktop; en móvil sigue en una. Depende de T2.1 para que valga la pena |
| T2.3 | Toggle UTC / Local (−3) | S | Cuidado: `takeoff` se guarda en UTC y el motor de auditoría asume eso |
| T2.4 | Observaciones como colapsable | XS | Campo nuevo, solo texto libre |

### Requiere backend — batchear en UNA PR del otro repo

| id | Tarea | Esfuerzo | Nota |
|---|---|---|---|
| T2.5 | Aterrizajes día / noche separados | M | Hoy Vector tiene un solo `landings` |
| T2.6 | Rol y Reglas de vuelo | M | Selects nuevos |
| T2.7 | Matrícula manual como fallback | S | Texto libre junto al select de aeronave |
| T2.8 | Libro de vuelo (múltiples libros) | L | El más grande; evaluar si vale |

> **Decidir T2.5–T2.8 juntos.** Son cuatro cambios de esquema; conviene una sola
> migración y no cuatro. **Requieren tocar `/home/ubuntu/FlightLog-BackEnd`**, que
> no es este repo.

---

## Tier 3 — Terminar el lenguaje visual

### T3.1 — Renombrar las variables de fuente `XS`

`layout.tsx` carga **Nunito** para los dos roles, pero las variables se llaman
`--font-inter` y `--font-space-grotesk`. O sea que `font-space-grotesk` en el markup
**no aplica Space Grotesk**: es Nunito en negrita. Es mecánico, sin cambio visual, y
saca una trampa para el próximo que lea el código.

### T3.2 — Decidir la tipografía sans `S` — **decisión de marca, no de código**

Nunito es redondeada y amigable; FlightDeck usa una grotesque más neutra. Es la
palanca tipográfica que queda después del pase de mono. **No la tome un agente
solo.**

### T3.3 — Bug de nav de la landing a ~800 px `XS`

El wordmark y "Características" se pegan y "Cómo funciona" parte en dos líneas.
Preexistente, no lo introdujo la tanda de tipografía.

### T3.4 — Sección narrativa negra para el copiloto IA `S`

> **Corregido el 2026-08-03.** La versión original de este documento decía "la
> landing no tiene sección negra". **Sí tiene**: la "Highlights band" (`page.tsx`
> ~línea 390). Pero es una **tira de stats** dentro de un contenedor redondeado,
> no una sección narrativa full-bleed. Lo que falta es distinto: darle al copiloto
> IA su propio momento, con historia, mock y un acento propio — que es lo que hace
> FlightDeck con su sección de importación (negro + dorado).

### T3.5 — ~~Pasos numerados~~ → Numeración en mono `XS`

> **Corregido el 2026-08-03. Ya estaba hecho.** La sección "Cómo funciona" ya
> numera los pasos con un círculo negro y el índice adentro (`page.tsx` ~línea
> 375). Lo único que queda es cosmético: pasar el número a mono con formato `01`,
> para que hable el mismo idioma que el resto de la app.

### T3.6 — Footer en columnas + **links muertos** `S`

> **Corregido el 2026-08-03.** La versión original decía "hoy la landing no tiene
> footer". **Sí tiene** (`page.tsx` ~línea 468), pero es una sola fila: logo,
> cuatro links y copyright.

Dos cosas, y la segunda importa más que la estética:

1. Reestructurarlo en columnas, como FlightDeck.
2. **Los cuatro links apuntan a `href="#"`.** Twitter, GitHub, Privacidad y
   Términos no van a ningún lado en una landing pública. Privacidad y Términos
   además suelen ser exigibles. **No inventar destinos**: hay que crear las
   páginas o sacar los links.

### T3.7 — Sparklines en las stat cards `S`

> **Corregido el 2026-08-03 tras auditar el código.** Decía "hoy son planas". La
> tile negra **ya tiene un delta** ("+1.3 hs en 30 días"), agregado al bajar el
> hero. Lo que falta de verdad:
> - **Sparklines: no existe ninguna en el repo.** Eso sí es nuevo.
> - El delta actual es **absoluto** (horas), no porcentual como el de FlightDeck.
> - La **tira secundaria** (Promedio / Aterrizajes / Destino / Aeronaves) no tiene
>   delta de ningún tipo.

### T3.8 — Pasar la card AWOS a media columna con tabs `S`

> **Corregido el 2026-08-03 tras auditar el código.** Decía "suele estar vacía",
> lo que sugería que había poco construido. **No es así:** `WeatherWidget` ya trae
> banner de condición con color por categoría METAR, buscador de ICAO, grilla de
> métricas, METAR crudo, TAF colapsable y botón de refresco.

Lo que falta es sólo el **empaque**, y es más chico de lo que parecía:

1. Hoy ocupa el **ancho completo** del dashboard; en FlightDeck es media columna,
   al lado del heatmap.
2. No tiene **tabs Clima / NOTAMs** — hay endpoint de NOTAMs (`/api/notams`) pero
   la card no los muestra.

### T3.9 — Fila NOVEDADES de changelog `M` — *opcional*

Cards descartables de novedades del producto. Barato y hace que la app se sienta
mantenida, pero requiere de dónde leer las novedades.

---

## Tier 4 — Features nuevas

### T4.1 — Ficha de aeródromo `L` — *lo más distintivo que le queda a FlightDeck*

ICAO en tipografía enorme, pills de clasificación (PÚBLICO / CONTROLADO /
INTERNACIONAL), grid de 6 mini-cards (elevación, FIR, región, referencia,
coordenadas, tipo), meteorología con METAR crudo y link a la AIP.

**La infraestructura ya existe**: `airports.tsv` tiene los datos y
`/api/airports/search` está construido. Es casi todo frontend. Conviene tratarla
como su propia fase, no como un ajuste.

### T4.2 — Mapa geográfico en el Resumen `M`

La mitad que falta del ítem 7 de `05`. El ranking con barras ya está hecho; falta el
mapa. Requiere Leaflet o Mapbox. Las coordenadas ya están en el TSV.

---

## Tier 5 — Higiene

| id | Tarea | Esfuerzo |
|---|---|---|
| T5.1 | Borrar `Libro Digital.pdf` y `extract_pdf.js` de la raíz — nada los importa | XS |
| T5.2 | Activar protección de contraseñas filtradas en Supabase | XS |
| T5.3 | Revocar ejecución por `anon` vía RPC de `handle_new_user()` / `handle_deleted_user()` | S |
| T5.4 | Fijar `search_path` en `handle_deleted_user` | XS |

---

## Orden recomendado

**T0 → T1.1 → T2.1 → T3.1**

- **T0** es lo más barato y protege trabajo ya mergeado.
- **T1.1** es lo único de la lista con impacto real sobre un piloto.
- **T2.1** es el mayor salto de "sensación" que queda.
- **T3.1** conviene antes de construir más pantallas, no después.

T4.1 se deja para cuando el resto esté cerrado: es una página nueva completa.

---

## Correcciones al research previo

Cosas que `04` y `05` daban por ciertas y que la comparación en vivo del
2026-08-01 desmintió. **No trabajar contra la versión vieja:**

1. **El "Nuevo Vuelo" de FlightDeck ya no es una columna vertical.** `04` §2 lo
   describe como un stack de una columna de ~930 px. Hoy son **dos columnas de
   1024 px que entran sin scroll**, precedidas por una página de selección de tipo
   (Vuelo / Simulador / TCP).
2. **El desglose ANAC de FlightDeck no es inline.** Vive en un panel deslizante.
   Eso es lo que le permite no scrollear, no el ancho.
3. **FlightDeck tiene dos steppers de aterrizajes** (día y noche), no uno.
4. **El input azulado del login de Vector no era un problema de diseño**: era el
   autofill de Chrome. El código siempre usó `bg-zinc-50`.
5. **La paleta (ítem 2 de `04`) quedó resuelta a medias.** El pase de monocromo se
   hizo; lo que queda es T3.2, que es decisión de marca.
6. **El dominio del brief estaba mal.** `00-README.md` y `02` decían
   `fdiaznemeth.com.ar`, que es NXDOMAIN. El real es `fdiaznem.com.ar`. Ya corregido.

---

## Reglas del repo que salieron de esta tanda

- **Fecha, hora localizada o cualquier float que termine en el markup: se redondea
  o se formatea en el server.** Ya se sabía de las fechas; se suma que
  `Math.sin`/`Math.cos` son *implementation-defined* en ECMAScript y que Node y
  Chrome difieren en los últimos dígitos — eso rompió la hidratación del gráfico
  radial del Resumen.
- **`@theme` emite sus tokens en `:root`.** Cualquier variable que esos tokens
  referencien tiene que estar declarada en `:root` (o sea, en `<html>`), no en
  `<body>`.
