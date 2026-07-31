# AGENTS.md — Bitácora de agentes de Vector

Este archivo es la **bitácora obligatoria** de todo agente de IA que modifique
este repositorio. Igual que un piloto no cierra un vuelo sin cargarlo en el
libro, ningún agente cierra una tanda de cambios sin dejar su entrada acá.

## Orientación rápida

- **Este repo es solo el frontend** (Next.js 16 App Router, React 19, Tailwind
  v4 — sin `tailwind.config.js`, el tema vive en `@theme` dentro de
  `src/app/globals.css` —, Framer Motion, next-themes). Los datos reales viven
  en un backend aparte (Python + Litestar + Supabase, en
  `/home/ubuntu/FlightLog-BackEnd`) y la autenticación en otro servicio. El
  frontend habla con los dos vía `apiFetch` (`src/lib/api.ts`) con Bearer
  token. **Cualquier cambio de modelo de datos requiere tocar el backend**, no
  alcanza con este repo.
- **El brief que originó este trabajo está en `docs/brief/`.** Leelo en orden:
  `01-benchmark-flightdeck.md` (a dónde queremos llegar),
  `02-estado-actual-vector.md` (punto de partida),
  `03-plan-implementacion.md` (el plan fase por fase). La sección
  "Pasos a seguir" al final de este archivo dice qué está hecho y qué no.
- **El dataset de aeródromos se regenera con `npm run build:airports`**
  (baja OurAirports y reescribe `src/data/airports.tsv`). El TSV está
  commiteado a propósito: la app no depende de red en build ni en runtime.
  Correlo cada varios meses; el archivo upstream cambia lento.

---

## Proceso obligatorio

**Es obligatorio para cada agente.** Sin excepciones, sin "lo anoto después".

1. **Antes de empezar**, leé las entradas existentes al final de este archivo.
   Te dicen qué se tocó recién, por qué, y qué quedó pendiente o a medias.
2. **A medida que hacés cambios**, escribí la entrada. No al final de todo:
   si la sesión se corta, el trabajo sin registrar queda huérfano.
3. **Una entrada por tanda coherente de cambios** (una fase, una feature, un
   fix). No una por archivo, no una por sesión entera de ocho horas.
4. **Las entradas se agregan al final**, en orden cronológico. Nunca se
   reescribe ni se borra una entrada anterior — si algo salió mal o se
   revirtió, se escribe una entrada nueva que lo diga.
5. **El timestamp va en UTC**, obtenido de verdad (`date -u`), no estimado.
6. **La justificación no es opcional.** "Pedido del usuario" no alcanza:
   explicá *por qué esa solución* y qué alternativa descartaste. El próximo
   agente necesita el razonamiento, no el changelog — el changelog ya está en
   `git log`.
7. **Si algo quedó a medias, roto o bloqueado, se dice.** Una entrada que
   miente sobre el estado del repo es peor que no tener entrada.

---

## Template

Copiá este bloque tal cual y completalo:

```markdown
### YYYY-MM-DD HH:MM UTC — <Agente / modelo> — <Título corto de la tanda>

**Quién:** <nombre del agente, modelo y en nombre de quién trabaja>

**Qué cambié:**
- `ruta/al/archivo.ts` — qué se hizo ahí, en una línea.
- `ruta/al/otro.tsx` — ídem.

**Por qué:** El razonamiento. Qué problema resuelve, qué alternativas se
evaluaron y por qué se descartaron, qué restricción del proyecto lo condiciona.

**Estado:** Terminado / Parcial / Bloqueado — y si no está terminado, qué falta
exactamente y qué es lo próximo.

**Verificación:** Cómo se comprobó que funciona (build, screenshots, curl,
tests). Si no se verificó, decirlo explícitamente.
```

---

## Bitácora

### 2026-07-31 16:59 UTC — Claude (Opus 5, vía Claude Code) — Fase 0: infraestructura de aeródromos ICAO

**Quién:** Claude Opus 5 corriendo en Claude Code, trabajando para Federico
Díaz Nemeth sobre el brief `vector-opus5-implementation-brief`.

**Qué cambié:**
- `scripts/build-airports.mjs` — generador que baja el dataset público de
  OurAirports, lo filtra y produce el TSV que consume la app.
- `src/data/airports.tsv` — 17.128 aeródromos generados (755 KB, commiteado).
- `src/data/airports-overlay.tsv` — correcciones a mano sobre el import
  (nombres en castellano para SA*, aeródromos que faltan upstream).
- `src/lib/airports.ts` — índice en memoria (por ICAO, por prefijo, y un
  haystack normalizado para búsqueda por texto) + `searchAirports`.
- `src/app/api/airports/search/route.ts` — `GET ?q=` (sugerencias) y
  `GET ?icao=` (resolución exacta).
- `src/components/dashboard/AirportResolver.tsx` — input chip con debounce de
  150 ms que muestra el nombre resuelto debajo (SADM → Morón).
- `src/types/index.ts` — tipo `AirportRef` para que el cliente tipe la
  respuesta sin importar el módulo server-only.

**Por qué:** El brief planteaba esta fase como tabla `airports` en Supabase +
endpoint en el backend Litestar. **Se resolvió 100% en el frontend a
propósito**, por dos razones:

1. El conector MCP de Supabase no está autenticado en esta sesión, así que no
   puedo aplicar la migración. Bloquear la Fase 1 —que es la de mayor impacto
   percibido y el pedido explícito de Federico— detrás de una migración que no
   puedo correr era el peor de los caminos.
2. Aun pudiendo, para este caso el frontend gana: son 755 KB de datos que
   cambian dos veces al año. Cargarlos una vez en memoria del proceso Next
   responde en <1 ms, contra ~50 ms de round-trip al backend + Supabase por
   cada tecla. El resolver se dispara con cada pulsación; la latencia *es* la
   feature.

Si más adelante se quiere la tabla en Supabase (para que el bot de WhatsApp o
el FPL la usen), el endpoint puede pasar a leer de ahí sin tocar el componente.

Detalle no obvio: OurAirports archiva muchos aeródromos argentinos bajo un
ident placeholder (`AR-0332`, `SA04`) y esconde el ICAO real en `keywords` /
`gps_code`. Sin el segundo pase de recuperación del generador faltaban códigos
de uso corriente como **SAAK** (Isla Martín García), que aparece en las rutas
de ejemplo del propio Vector.

**Estado:** Terminado.

**Verificación:** `curl` contra el dev server — `?icao=SADM` devuelve
`{"label":"Morón"}`; búsquedas por prefijo (`SAD` → San Fernando/La Plata/
Morón/El Palomar), por IATA (`AEP` → SABE) y por ciudad con acentos (`moron` →
SADM) responden correcto en ~8 ms.

### 2026-07-31 17:09 UTC — Claude (Opus 5, vía Claude Code) — Fase 1: rediseño de "Nuevo Vuelo"

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `src/hooks/useAnacBreakdown.ts` — hook compartido de asignación de tiempos.
- `src/components/dashboard/TimeAllocator.tsx` — fila toggle + slider.
- `src/components/dashboard/StyledSelect.tsx` — listbox propio (con búsqueda)
  que reemplaza a los `<select>` nativos de Aeronave, Finalidad y Descuento.
- `src/components/dashboard/FlightLogForm.tsx` — reescritura de las secciones
  01/02/03.
- `src/lib/utils.ts` — `calculateBlockMinutes` y `formatBlockTime`.
- `src/app/globals.css` — estilos del slider `.anac-slider`.

**Por qué:** Las decisiones de diseño que no son obvias leyendo el código:

1. **El "resto" en vez de arrancar todo en cero.** FlightDeck arranca todas las
   categorías en 0 y el piloto reparte. Vector hoy precarga el total en PIC Día
   Local, y eso ahorra tipeo en el caso más común (que es la mayoría de los
   vuelos). Copiar a FlightDeck literal habría sido una regresión. La solución
   es un **bucket "resto"**: PIC Día Local/Travesía (según Local/Travesía)
   sostiene todo lo no asignado. Cuando subís el slider de otra categoría, el
   resto le cede el tiempo automáticamente. Se conservan las dos propiedades:
   el caso común es cero clics, y la suma nunca puede pasarse del total.

2. **Sección 03 NO comparte pool con la 02.** El brief pedía "el mismo patrón",
   pero IMC Piloto, Capota y Sim. no son una partición del vuelo — se solapan
   entre sí y con el tiempo PIC. Meterlas en el mismo pool habría impedido
   cargar, por ejemplo, 1.4 h de IMC en un vuelo de 1.4 h que además ya tiene
   1.4 h de PIC, que es un caso perfectamente válido. El hook tiene un flag
   `pooled` justo por esto: la 02 es pooled, la 03 no (cada una topeada al
   total de forma independiente).

3. **`calculateFlightDuration` ya aplicaba la regla de 0.3.** O sea que lo que
   faltaba no era el número ANAC sino el **block time crudo**, al revés de lo
   que sugería el brief. Por eso se agregó `calculateBlockMinutes` y el chip
   muestra `1:22` junto a `1.4`, editable a mano tocando el número.

4. **Se sacó la validación de suma del cliente.** Ya no hace falta un mensaje
   de error post-submit porque el estado inválido no es alcanzable. La
   validación del server action (`src/actions/flight.ts`) **se dejó intacta**
   como defensa en profundidad, tal como pedía el brief.

5. El campo `route` se sigue enviando como `"SADM SAEZ"`, así que **el backend
   no requiere ningún cambio** para esta fase.

**Estado:** Terminado. Sin tocar: el panel "Vuelo en vivo" y la sección
"04. Descuento aplicado" (diferenciadores de Vector).

**Verificación:** `tsc --noEmit` limpio, `npm run build` OK. Probado con
Playwright contra la cuenta real, en claro y oscuro, a 1500px y en iPhone 13:
- SADM→Morón / SAEZ→Ezeiza resuelven mientras se tipea; Travesía se
  autodetecta, y con origen = destino pasa a Local.
- Block 1:22 → ANAC 1.4, con el resto en PIC Día Travesía = 1.4.
- Subiendo PIC Noche Travesía al máximo, el resto cae a 0 y la suma sigue 1.4.
- Con el pool agotado, el slider de SIC Día Travesía queda con `max="0"` y el
  navegador **rechaza** un intento de setearlo en 9 — la sobreasignación es
  inalcanzable, no solo validada.
- 0.6 + 0.8 = 1.4 exacto. En la sección 03, IMC Piloto 1.4 y Capota 1.4
  conviven, como corresponde.
- 0 errores de consola en todas las corridas.

### 2026-07-31 17:09 UTC — Claude (Opus 5, vía Claude Code) — Copiloto IA: dejar de filtrar UUIDs

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `src/app/api/chat/route.ts` — regla explícita en el system prompt + función
  `stripInternalIds()` aplicada a la respuesta antes de devolverla.

**Por qué:** El brief detectó que el copiloto contestaba cosas como
`... [ID: d8342011-be9f-...]`. El modelo **necesita** esos UUID en su contexto
para poder llamar a `update_flight` / `delete_flight`, así que no se pueden
sacar del prompt. Se corrigió en dos capas a propósito: la regla del prompt
cubre el caso normal, y el filtro de salida cubre el caso en que el modelo la
ignore — un prompt es una guía, no una garantía, y acá el costo de que falle lo
paga el usuario final viendo basura.

**Estado:** Terminado.

**Verificación:** `tsc --noEmit` y `npm run build` OK. **No se probó contra el
modelo en vivo** (requiere gastar llamadas a Gemini con la cuenta real); el
filtro de salida es determinístico y se puede verificar leyéndolo, pero la
efectividad de la regla del prompt no está medida.

### 2026-07-31 17:31 UTC — Claude (Opus 5, vía Claude Code) — Fase 3: heatmap de actividad

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `src/lib/utils.ts` — `buildActivityHeatmap()`, que arma la grilla de 53
  columnas × 7 días a partir de los vuelos.
- `src/components/dashboard/ActivityHeatmap.tsx` — la card, con leyenda
  "Menos → Más" y tooltip por día.
- `src/app/dashboard/page.tsx` — calcula la grilla y la monta justo debajo de
  "Horas acumuladas".

**Por qué:**

1. **No hizo falta el endpoint `/stats/activity-heatmap` del brief.** El
   dashboard ya recibe **todos** los vuelos del usuario en la llamada a
   `/dashboard` (los usa para el gráfico acumulado, que también recorre el
   historial completo). Agregar un endpoint habría sido una segunda consulta al
   backend para agrupar datos que ya están en memoria. Si algún día el logbook
   crece a decenas de miles de vuelos y `/dashboard` deja de traerlos todos,
   ahí sí hace falta el endpoint — hoy no.

2. **La grilla se arma en el server, no en el cliente.** Depende de qué día es
   "hoy". Si el componente cliente la recalculara, el navegador de Federico
   (UTC-3) y el server (UTC) discreparían sobre la última columna varias horas
   por día, y React tiraría error de hidratación. Se pasa ya armada.

3. **Toda la aritmética de fechas es en UTC.** Sumar un día es `+86400000` solo
   si no hay DST en el medio; con fechas locales, los dos cambios de hora al
   año duplicarían o saltearían una columna sin avisar.

4. **La intensidad es relativa al día más cargado del propio piloto, pero con
   el techo en 4 h.** Sin el techo, un único vuelo de traslado largo aplasta un
   año entero de instrucción de 1.2 h contra el tono más pálido y la grilla
   deja de decir nada.

5. **El tooltip cuelga de la card, no de la grilla.** La grilla vive en un
   contenedor con `overflow-x-auto`, que recorta también en vertical: la
   primera versión mostraba el tooltip cortado al ras en la fila superior.
   Se ancla a la card con `getBoundingClientRect` y se clampea a 80 px de los
   bordes.

6. **Detalles de móvil:** la columna de días (L/M/V/D) quedó **afuera** del
   scroller para que no se vaya con el scroll, la grilla arranca scrolleada al
   extremo derecho (la pregunta es "¿cómo vengo estas semanas?", no "¿qué hice
   en agosto?"), y como en touch no hay hover, tocar un cuadradito abre el
   tooltip y volver a tocarlo lo cierra.

**Estado:** Terminado.

**Verificación:** `tsc --noEmit` limpio y `npm run build` OK. Playwright contra
la cuenta real, claro y oscuro a 1500px y en iPhone 13:
- 369 cuadraditos (53 semanas menos los días futuros de la última columna), 25
  días con vuelo, 46.3 hs — coincide con el total del gráfico acumulado.
- Las 12 etiquetas de mes salen en orden Ago→Jul, alineadas a su columna.
- Tooltip: "Lun 3 Nov 2025 / 1.0 hs · 1 vuelo".
- Móvil: el scroller mide 275 px de ancho visible sobre 1003 px de contenido y
  abre mostrando May–Jul.
- 0 errores de consola en todas las corridas.

### 2026-07-31 18:06 UTC — Claude (Opus 5, vía Claude Code) — Hacer el repo autocontenido

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `docs/brief/` — el brief completo (4 documentos) commiteado al repo, con una
  nota arriba del README aclarando que las Fases 0, 1 y 3 ya están hechas.
- `AGENTS.md` — sección "Orientación rápida" al principio, y las referencias al
  brief ahora apuntan a `docs/brief/` en vez de citarlo por nombre.
- `package.json` — `npm run build:airports`.

**Por qué:** Federico preguntó si un agente que clone el repo entiende todo, y
la respuesta era **no**. Este archivo citaba el brief once veces y decía "el
plan completo está en `03-plan-implementacion.md`", pero ese archivo vivía en
un `/tmp` de mi sesión: el próximo agente iba a leer una referencia a un
documento que no existe en ningún lado que él pueda alcanzar. Tres huecos, tres
arreglos:

1. **El brief no estaba versionado.** Ahora sí. Se commiteó con la decisión
   explícita de Federico, porque el repo es público y el brief incluye un
   benchmark de un competidor con nombre y URL más el roadmap del producto.
   No es una decisión que un agente deba tomar solo — preguntá antes de
   publicar material de estrategia.
2. **`scripts/build-airports.mjs` no estaba en `package.json`.** El brief pedía
   un cron mensual de refresco; sin un script registrado, el próximo agente
   tenía que deducir el comando leyendo el archivo.
3. **Faltaba el contexto de arquitectura.** Que este repo es solo el frontend y
   que cualquier cambio de modelo de datos obliga a tocar otro repo es la
   restricción que más condiciona el trabajo acá, y estaba solo implícita en
   las entradas de las fases bloqueadas.

**Estado:** Terminado.

**Verificación:** Las referencias cruzadas dentro del brief
(`01-benchmark-flightdeck.md` desde `03-plan-implementacion.md`) son rutas
relativas y los cuatro archivos quedaron en la misma carpeta, así que siguen
resolviendo. Los cuatro documentos se revisaron buscando credenciales antes de
commitear: la única coincidencia es la descripción de arquitectura con los
hostnames públicos de la API, sin secretos.

---

## Pasos a seguir (para el próximo agente)

El plan completo está en `docs/brief/03-plan-implementacion.md`.
**Hechas: Fase 0, Fase 1, Fase 3 y el fix del copiloto.** Lo que queda, en el
orden en que conviene agarrarlo:

### 1. Fase 5 — Calculadoras operativas · DESBLOQUEADA, empezá por acá

100% frontend, sin backend, sin dependencias nuevas. Son siete: conversor de
unidades, combustible (consumo/autonomía), viento (triángulo y deriva),
altitud densidad y de presión, base de nubes, planeo, y piernera (bloc de
notas + cronómetros de cabina).

Cosas a respetar, que no están en el brief:

- Todas comparten la misma forma: entradas numéricas → resultado en vivo.
  **Nada de botón "Calcular"** — recalculá en cada tecla, igual que el
  `AirportResolver` y el `TimeAllocator`. Esa es la sensación que pidió
  Federico y ya es el patrón del repo.
- Reusá lo que existe: `StyledSelect` para elegir unidades,
  `src/app/globals.css` → `.anac-slider` si algún parámetro se presta a slider,
  `PageHeader` para el encabezado de la página.
- Va como ítem nuevo en el nav (`src/components/dashboard/DashboardNav.tsx`,
  hoy 5 íconos: Dashboard, Historial, Balance, Ruta METAR, Configuración).
- La piernera necesita persistencia local — `localStorage`, no backend.

### 2. Fase 2 — Motor de auditoría · BLOQUEADA

**No se puede hacer solo en el frontend** como se hizo la Fase 0: son datos
derivados y persistentes por usuario, con supresión de hallazgos.

Para desbloquearla hace falta una de estas dos:
- Que Federico autorice el conector MCP de Supabase (configuración de
  conectores en claude.ai, o `claude mcp` / `/mcp` en una sesión
  **interactiva** — en sesiones no interactivas el OAuth no corre), **o**
- que aplique a mano la migración.

Lo que hay que crear, según el brief:
- Tabla `audit_findings`: `id`, `user_id`, `flight_id`, `rule_type`
  (`overlap` | `unregistered_aircraft` | `duplicate` | `inconsistent_total`),
  `severity` (`critical` | `warning`), `message`, `suppressed` (bool),
  `suppressed_reason`, `created_at`, `recalculated_at`. Con RLS por `user_id`,
  igual que el resto de las tablas.
- Reglas iniciales: superposición temporal entre vuelos del mismo usuario;
  aeronave referenciada que no está en el Hangar; duplicados (misma
  fecha/ruta/matrícula/horarios); suma de segmentos ≠ total.
- Recálculo al crear/editar/borrar un vuelo, para ese vuelo y los que se
  solapen en fecha.
- Endpoints Litestar: `GET /audit/summary`, `GET /audit/findings`,
  `POST /audit/findings/:id/suppress`.
- Frontend: página nueva + ítem de nav con badge de conteo, 3 cards
  (Críticas/Advertencias/Suprimidas), y card "Salud del logbook" en el
  Dashboard cerca del `PCATracker`.

Nota: la regla `inconsistent_total` **ya se valida al guardar** en
`src/actions/flight.ts`; acá se trata de dejarla además como hallazgo
auditable retroactivo sobre los vuelos viejos, no de duplicar el bloqueo.

### 3. Fase 4 — Tracker de vencimientos · BLOQUEADA (mismo motivo)

Tabla `documents` + cron diario de alertas (60/30/7 días) + endpoints CRUD.
Lo interesante es el tie-in con el bot de WhatsApp que **ya existe** en este
repo (`src/app/api/webhooks/whatsapp/`): mandar el aviso de vencimiento por
WhatsApp reusando el motor de function-calling. Eso FlightDeck no lo puede
hacer. Ojo: hay que **migrar** el campo "Vencimiento CMA" que hoy vive suelto
en Configuración a ser una fila más de esta tabla, no dejar los dos.

### Antes de tocar nada

- **Leé las entradas de la bitácora de arriba.** Varias decisiones (el bucket
  "resto", por qué la sección 03 no comparte pool, por qué los aeródromos no
  están en Supabase) no se deducen del código y revertirlas por accidente es
  fácil.
- Correr `npx tsc --noEmit` y `npm run build` antes de dar algo por terminado.
- Verificar en el navegador, claro **y** oscuro, desktop **y** móvil. Todo el
  repo está hecho con las dos variantes y es donde más se rompen las cosas.

### Notas de infraestructura

- El backend está en `/home/ubuntu/FlightLog-BackEnd` (Python + Litestar +
  Supabase), **no** en la ruta macOS `/Users/defeee/...` que aparece en el
  brief. Router con prefijo `/api`, `auth_guard`, `request.state.user.id`, RLS
  con clientes Supabase por usuario.
- Los MCP de Supabase y `Claude_Code_Remote` requieren OAuth y **no** están
  autenticados en sesiones no interactivas.
- **`.env` está trackeado en git** (viene de antes de estas sesiones). No lo
  commitees con cambios locales. Convendría sacarlo del índice
  (`git rm --cached .env`), agregarlo al `.gitignore` y rotar lo que haya
  quedado expuesto — no lo hice porque es una decisión de Federico, no mía.
- `scratch/`, `HOJA LIBRO DE VUELO.pdf` y
  `src/components/dashboard/pdf_fields.json` son restos de una prueba de
  parseo de PDF. No están commiteados y nada del código los importa.
