# AGENTS.md — Bitácora de agentes de Vector

Este archivo es la **bitácora obligatoria** de todo agente de IA que modifique
este repositorio. Igual que un piloto no cierra un vuelo sin cargarlo en el
libro, ningún agente cierra una tanda de cambios sin dejar su entrada acá.

## Orientación rápida

- **Este repo es solo el frontend** (Next.js 16 App Router, React 19, Tailwind
  v4 — sin `tailwind.config.js`, el tema vive en `@theme` dentro de
  `src/app/globals.css` —, Framer Motion, next-themes). Los datos reales viven
  en un backend aparte (Python + Litestar + Supabase, en
  `/Users/defeee/Vector/FlightLog-BackEnd`) y la autenticación en otro servicio. El
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

### 2026-07-31 23:14 UTC — Claude (Opus 5, vía Claude Code) — RLS en `whatsapp_chats`

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- Migración Supabase `enable_rls_on_whatsapp_chats` — `ALTER TABLE
  public.whatsapp_chats ENABLE ROW LEVEL SECURITY`, sin políticas.

**Por qué:** La tabla guarda `phone` + `history` (la conversación completa con el
copiloto) y era la **única** de las ocho con RLS apagada: con la anon key
cualquiera podía leerla o reescribirla entera. No lo detectó ninguna entrada
anterior de esta bitácora; salió del linter de Supabase.

Se dejó **sin políticas a propósito**. El único consumidor es el backend
(`src/controllers/whatsapp.py`), que llega por el *service client* y por lo tanto
saltea RLS; el frontend no la toca nunca. Activar RLS sin políticas niega el
acceso a `anon` y `authenticated`, que es exactamente la accesibilidad deseada.
Agregar políticas por `user_id` habría sido imposible igual: la tabla se indexa
por teléfono y no tiene columna de usuario.

**Estado:** Terminado.

**Verificación:** `pg_class.relrowsecurity = true` confirmado por consulta. El
flujo del bot sigue andando porque el service role no está sujeto a RLS.

### 2026-07-31 23:14 UTC — Claude (Opus 5, vía Claude Code) — Fase 5: calculadoras operativas

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `src/lib/aviation.ts` — toda la matemática, pura y sin React.
- `src/components/dashboard/tools/ToolPrimitives.tsx` — `NumberField`,
  `ResultTile`, `ToolLayout`, y los helpers de formato.
- `src/components/dashboard/tools/{UnitConverter,FuelCalculator,WindCalculator,
  AltitudeCalculator,CloudBaseCalculator,GlideCalculator,Kneeboard}.tsx`.
- `src/components/dashboard/tools/ToolsClient.tsx` — selector de herramienta.
- `src/app/dashboard/tools/page.tsx` — la página.
- `src/components/dashboard/DashboardNav.tsx` — reescrito (ver abajo).

**Por qué:**

1. **Los inputs guardan `string`, no `number`.** Con estado numérico el campo
   pelea con el usuario a mitad de tipeo: "1." o "-" no parsean y el valor se
   borra solo. Se parsea en cada render, que además es lo que hace que el
   recálculo en vivo salga gratis.

2. **Una herramienta a la vez, no siete tarjetas apiladas.** Cada calculadora
   tiene cinco o seis campos; todas juntas entierran la que estás usando debajo
   de una página de campos ajenos, justo en el teléfono, que es donde esto se
   abre. El estado vive dentro de cada componente, así que cambiar de pestaña lo
   resetea — volver a una calculadora y encontrar números de hace una hora es
   peor que empezar limpio.

3. **El nav móvil no aguantaba dos destinos más.** Era una píldora de ancho fijo
   con 5 slots; pasar a 7 dejaba cada tab en ~35 px y aplastaba las etiquetas.
   Se agregó un slot "Más" que abre una hoja con lo que no entra. Los 5 destinos
   originales quedan **exactamente donde estaban** (la memoria muscular no se
   toca) y hay lugar para seguir creciendo. El rail de escritorio es vertical y
   los muestra todos.

4. **La piernera guarda `startedAt`, no el conteo.** Un cronómetro de cabina que
   se congela al bloquear el teléfono no sirve. Guardando la hora de arranque, el
   tiempo se recalcula contra el reloj de pared al volver.

5. **Las aproximaciones son las del E6B a propósito** (30 ft/hPa, 118,8 ft/°C,
   400 ft por °C de spread). Coincidir con el número que da el examen ANAC vale
   más que un modelo barométrico riguroso que discrepe con la respuesta oficial.

**Estado:** Terminado, las siete.

**Verificación:** `tsc --noEmit` limpio, `npm run build` OK. Playwright contra
las cuatro combinaciones (claro/oscuro × 1500 px/iPhone 13), **22 checks
numéricos** contra valores calculados a mano:
- Conversor: 100 NM = 185,2 km.
- Combustible: 120 L a 32 L/h → 3:45 de autonomía, 3:00 útil con 45 min de
  reserva, 285 NM de alcance, 72 L para una etapa de 1.5 h, sobran 48 L.
- Viento: pista 360, TAS 110, viento 310/18 → 11,6 kt de frente, 13,8 kt
  cruzado por izquierda, rumbo 353, GS 98.
- Altitud: 79 ft con QNH 1013 y 30 °C → PA 87 ft, DA 1.889 ft, ISA +15,2.
- Nubes: spread de 10 °C → 4.000 ft AGL, 12,0 °C en la base.
- Planeo: 3.000 ft a 9:1 → 4,4 NM, llega al campo a 4 NM.
- Piernera: el cronómetro avanza de verdad tras 2 s.
- Sin desborde horizontal: `scrollWidth == clientWidth` en las 7 pestañas a
  390 px. 0 errores de consola (queda un 404 de `/favicon.ico`, preexistente).

### 2026-07-31 23:14 UTC — Claude (Opus 5, vía Claude Code) — Fase 2: motor de auditoría

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- Migración `create_audit_findings` — tabla + RLS por `user_id` + índice único.
- Backend `src/services/audit_engine.py` — las cuatro reglas, puras.
- Backend `src/controllers/audit.py`, `src/models/audit.py` — los endpoints.
- Backend `src/controllers/flights.py` — recálculo tras crear/editar/borrar.
- Backend `src/controllers/dashboard.py` — contadores en el endpoint consolidado.
- Backend `test_audit_engine.py` — 19 checks, corren sin base ni servidor.
- Frontend `src/app/dashboard/audit/page.tsx`, `AuditClient.tsx`,
  `src/actions/audit.ts`, `LogbookHealthCard.tsx`.

**Por qué:**

1. **Es tabla y no vista** porque lo único que no es derivado es la decisión del
   piloto de suprimir un hallazgo. El sync es upsert + borrado de lo que ya no
   aplica, y el payload del upsert **omite** `suppressed` para que el
   `ON CONFLICT` no pueda pisarlo. Un wipe-and-reinsert des-suprimiría todo en el
   próximo vuelo cargado.

2. **Recálculo completo, no incremental** como pedía el brief. Editar un vuelo
   puede *limpiar* un hallazgo en **otro** vuelo (arreglás una superposición y
   hay que borrar también la del contrario), así que el pase incremental tiene
   que recorrer los vecinos igual. A escala de libro de vuelo es una query y un
   barrido ordenado.

3. **Un duplicado exacto no reporta además superposición.** Dos vuelos idénticos
   se solapan por definición; mostrar las dos reglas son dos hallazgos críticos
   por un solo error, y apunta al diagnóstico vago ("se superpone con...") en vez
   del accionable ("borrá la copia"). El motor le pasa los pares duplicados a la
   regla de superposición para que los ignore — pero si el vuelo *además* choca
   con un tercero no relacionado, esa sí se reporta. **Lo encontró un test**, no
   la lectura del código.

4. **Los timestamps que cruzan medianoche se normalizan.** El frontend arma
   `takeoff` y `landing` con la **misma** fecha (ver `logFlight`), así que un
   vuelo 23:30 → 00:20 vuelve con `landing < takeoff`. Sin corregirlo, se leía
   como un bloque de 23 h que se superponía con todo lo de esa noche.

5. **`inconsistent_total` distingue tres casos.** El form ya bloquea la
   sobre-asignación al guardar; lo retroactivo interesante es lo contrario:
   vuelos viejos sin desglose (advertencia) o con horas sin asignar
   (advertencia). Sobre-asignado queda como crítico.

**Estado:** Terminado.

**Verificación:** `test_audit_engine.py` 19/19. La app Litestar levanta y las
rutas registran. Contraste independiente en SQL contra los **39 vuelos reales**
de Federico: 0 superposiciones, 0 duplicados, 0 aeronaves faltantes, 0 totales
que no cierren — o sea que el motor no le va a inventar hallazgos. **No se probó
el ciclo HTTP completo contra el backend desplegado** (no hay credenciales de
Supabase en esta sesión); lo verificado es el motor y el armado de la app.

### 2026-07-31 23:14 UTC — Claude (Opus 5, vía Claude Code) — Fase 4: vencimientos y migración del CMA

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- Migración `create_documents_and_backfill_cma` — tabla `documents` + RLS +
  trigger de re-armado + backfill de los CMA que había en `profiles`.
- Backend `src/services/document_alerts.py`, `src/controllers/documents.py`,
  `src/models/document.py`, `src/config.py` (`DOCUMENTS_ALERT_SECRET`).
- Frontend `src/actions/document.ts`, `DocumentsManager.tsx`,
  `src/app/api/cron/document-alerts/route.ts`, `src/lib/whatsapp.ts`.
- Frontend: se sacó el campo CMA de `ProfileForm` y de `actions/profile.ts`;
  `OnboardingOverlay` ahora crea el documento; el contexto de IA (chat y
  WhatsApp) lista todos los vencimientos en vez de solo el CMA.

**Por qué:**

1. **El envío vive en el frontend y la decisión en el backend.** Las credenciales
   de Kapso están en la app Next, así que el backend dice *qué* vence
   (`/document-alerts/pending`) y registra *qué se entregó*
   (`/document-alerts/{id}/sent`), y el cron de Next es solo el cartero. Se
   marca **después** de un envío exitoso: al revés, una caída de Kapso quemaría
   el aviso de 60 días para siempre.

2. **`last_alert_threshold` guarda el bucket más ajustado ya avisado**, y un
   trigger lo pone en NULL cuando cambia `expiry_date`. Renovar un documento
   re-arma la escalera 60/30/7 sola, sin contabilidad extra.

3. **El endpoint del barrido falla cerrado.** Corre con service role sobre
   *todos* los usuarios, así que si `DOCUMENTS_ALERT_SECRET` no está configurado
   rechaza la llamada en vez de caer a un default — al revés de lo que hace hoy
   `WhatsAppController._verify_secret`, que cae a una constante hardcodeada (no
   lo toqué: cambiarlo puede desincronizar el secreto con el frontend).

4. **La columna `profiles.cma_expiry` sigue existiendo pero ya nadie la lee ni la
   escribe.** No la borré porque es `NOT NULL` y el backend desplegado la sigue
   insertando al auto-crear perfiles: tirarla ahora rompe producción hasta que se
   despliegue este código. Queda como el único paso pendiente de esta fase (ver
   abajo). La fuente de verdad en el código ya es una sola.

**Estado:** Terminado salvo el `DROP COLUMN`, que depende del despliegue.

**Verificación:** Backfill confirmado: 8 CMA migrados sobre 8 perfiles con fecha
real (se excluyó el centinela `2100-12-31` que escribe el backend al auto-crear
perfiles). `test_audit_engine.py` cubre además la lógica de escalonado de avisos
(6 checks: 60 → 30 → vencido, y que no repita ninguno). `tsc --noEmit` y
`npm run build` OK. Playwright: la tarjeta de vencimientos marca "Vencido hace N
días" en rojo y el próximo vencimiento en la card del dashboard. **El envío real
por WhatsApp no se probó** — requiere credenciales de Kapso y mandar un mensaje
de verdad.

### 2026-07-31 23:14 UTC — Claude (Opus 5, vía Claude Code) — Dos bugs de hidratación

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `AuditClient.tsx` + `audit/page.tsx` — el timestamp se formatea en el server y
  baja como string ya armado.
- `DocumentsManager.tsx` + `settings/page.tsx` — "hoy" lo decide el server y baja
  como `todayIso`.

**Por qué:** Los encontró Playwright, no la lectura del código.

1. `toLocaleString("es-AR")` con hora **no da lo mismo en Node que en Chrome**:
   diferían en el espacio antes de "p. m.", y React tiraba mismatch y
   re-renderizaba el árbol entero.
2. `documentStatus()` usaba `new Date()` dentro de un client component. El server
   corre en UTC y el navegador de Federico en UTC-3: cualquier noche después de
   las 21:00 los dos caen en días distintos y **todos** los badges de "vence en N
   días" desincronizan.

Es la misma trampa que ya documentaba la entrada del heatmap; conviene tratarla
como regla del repo: **fecha/hora localizada se formatea en el server o no se
formatea.**

**Estado:** Terminado.

**Verificación:** Log del dev server limpio tras recargar: 0 errores de
hidratación en las 4 combinaciones (antes había 8).

### 2026-07-31 23:33 UTC — Claude (Opus 5, vía Claude Code) — Rediseño de la barra de navegación

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `src/components/dashboard/DashboardNav.tsx` — la barra móvil pasa a ser
  **icon-only**; el badge numerado se reemplaza por un punto; el rail gana el
  mismo indicador activo animado que ya tenía el móvil.

**Por qué:** Federico dijo que la barra quedaba fea y cargada, y tenía razón.
Screenshot en mano el problema era medible:

1. **Las etiquetas eran la fuente del ruido.** La barra comparte el borde
   inferior con la píldora de acciones, así que sólo dispone de ~222 px en un
   teléfono de 390. Con seis slots eso son 37 px cada uno, y a 10 px las
   etiquetas había que recortarlas a "Log" / "Saldo" / "Calc" / "Más": crípticas
   **y** apelmazadas, lo peor de los dos mundos.

   **Bajar la cantidad de destinos no las salvaba**, que fue lo primero que
   probé: con 5 slots son 44 px, y "Bitácora" a 10 px mide ~48 px. No entra a
   ninguna cantidad razonable de ítems. Por eso se van del todo en vez de
   seguir recortándolas — es lo único que le da aire a los íconos. Los nombres
   completos siguen estando donde hay lugar: la hoja de "Más" y los tooltips del
   rail.

2. **El badge rompía la silueta.** El círculo con el número se apoyaba sobre el
   borde redondeado de la píldora y no tenía dónde ubicarse sin pisarlo. Pasa a
   ser un punto de 8 px; el número exacto se sigue viendo en el tooltip del
   rail, en la fila de la hoja y en la propia página de auditoría.

3. **El punto va anclado al ícono, no al slot.** Anclado al slot se despegaba
   del glifo a medida que cambiaba la cantidad de destinos visibles, porque el
   ancho del slot es `flex-1`.

4. **El rail ahora usa `layoutId` como el móvil.** Antes el estado activo era un
   cambio de clase seco; ahora el chip se desliza entre ítems con el mismo
   resorte. Es el mismo lenguaje en las dos variantes.

Lo que **no** se tocó: los 5 destinos visibles siguen siendo los mismos y en el
mismo orden (la memoria muscular no se toca), y la píldora de acciones segregada
queda igual.

**Estado:** Terminado.

**Verificación:** `tsc --noEmit` y `npm run build` limpios. Playwright contra un
harness que reproduce el envoltorio exacto del layout (ancho real de iPhone,
píldora de acciones incluida), en claro y oscuro, con capturas a 4x: los 6 slots
miden 34×54 px —por encima del mínimo táctil— el chip activo se lee sin
ambigüedad, y la hoja de "Más" muestra nombres completos y el conteo. 0 errores
de consola (queda el 404 de `/favicon.ico`, preexistente).

### 2026-08-01 00:46 UTC — Claude (Opus 5, vía Claude Code) — Versionar el research posterior a la implementación

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `docs/brief/04-hallazgos-adicionales-fase1.5.md` y
  `05-resumen-de-horas-y-hallazgos-finales.md` — dos documentos nuevos que
  Federico pasó en un zip y que no estaban versionados.
- `docs/brief/00-README.md` — orden de lectura actualizado y nota de estado
  reescrita: ahora aclara que `01`, `02` y `03` describen un estado que ya no
  existe.
- `AGENTS.md` — "Pasos a seguir" apunta al backlog nuevo, más una subsección
  que contrasta ese research contra el código.

**Por qué:** Los documentos `04` y `05` son research hecho **después** de que
estas fases estuvieran desplegadas: se probó Vector ya con estos cambios contra
FlightDeck, pantalla por pantalla. Eso los convierte en el backlog vigente y
deja a los tres originales como registro histórico — pero el repo solo tenía
los tres viejos, así que un agente que clonara iba a trabajar contra un mapa
desactualizado, que es exactamente el problema que la entrada de las 18:06
había venido a resolver.

Se agregó además el contraste con el código, porque el research se hizo
probando la UI sin leer el repo y eso deja tres imprecisiones que cambian el
alcance: la fila de hallazgo de auditoría **ya está implementada** (se verificó
con datos ficticios; lo que falta es agrupar por regla y el "Expandir todo"),
la taxonomía de documentos **ya existe** en el `CHECK` de la tabla, y las
Herramientas de Vector están mejor resueltas que las de FlightDeck — conviene
que quede escrito para que nadie las "corrija".

**Estado:** Terminado. Los 10 ítems del backlog nuevo **no** se implementaron:
esto es solo versionar el conocimiento y dejarlo contrastado.

**Verificación:** Se diffearon los seis archivos del zip contra los cuatro del
repo: `01`, `02` y `03` son idénticos, `00-README` difiere solo en el orden de
lectura, y `04` y `05` son nuevos. Sin cambios de código, así que no hay build
que correr.

### 2026-08-01 01:08 UTC — Claude (Opus 5, vía Claude Code) — Backlog de FlightDeck: ítems 1, 3, 4 y 5

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `src/app/dashboard/@modal/(.)log-flight/page.tsx` y `@modal/default.tsx` —
  ruta interceptada para "Nuevo Vuelo".
- `src/components/dashboard/NewFlightModal.tsx` — el diálogo.
- `src/app/dashboard/layout.tsx` — slot `modal`.
- `src/components/dashboard/FlightLogForm.tsx` — props `onCancel` y
  `stickyActions`, stepper `LandingsStepper`, y se corrigió el
  `overflow-hidden` del contenedor.
- `src/components/dashboard/AuditClient.tsx` — íconos de severidad.
- `src/components/dashboard/DocumentsManager.tsx` — chips de alta rápida y
  arreglo de la fila en móvil.

**Por qué:**

1. **Ruta interceptada en vez de estado local.** El brief pedía el modal
   "manteniendo la ruta como fallback para deep-linking". Con
   `@modal/(.)log-flight` la **misma URL** es dos cosas: diálogo si llegás desde
   adentro de la app, página completa si recargás o entrás por link. De yapa, el
   diálogo **es** una entrada del historial, así que el gesto de "atrás" del
   teléfono lo cierra como cualquier sheet nativa — con estado local eso había
   que falsearlo.

2. **El `sticky` del footer no funcionaba y el motivo no era obvio.** El
   contenedor del form tiene `overflow-hidden` para recortar las esquinas
   redondeadas de la card, y eso lo convierte en el **contexto de scroll** del
   sticky: los botones quedaban clavados a un elemento de 1382 px en vez de al
   scroller visible, o sea sin fijarse. Dentro del diálogo ese recorte no aporta
   nada (el modal dibuja su propio redondeo), así que se limitó al caso de
   página. **Lo detectó una medición con Playwright**, no la lectura del CSS.

3. **`stickyActions` es un prop aparte y no se deduce de `inModal`.** El footer
   sangra fuera del padding horizontal para cubrir el ancho del diálogo, y esa
   medida solo coincide con este modal. El de "Finalizar vuelo"
   (`LiveSessionController`) usa otro padding y quedó intacto.

4. **El stepper de aterrizajes sigue aceptando tipeo.** Reemplazarlo por dos
   botones y una etiqueta hubiera obligado a apretar "+" once veces después de
   una sesión de circuitos. El del medio es un input real; el valor se sigue
   posteando con el mismo `name`, así que el server action no se tocó.

5. **Los íconos de severidad se apagan en cero.** Un escudo rojo sobre un "0"
   comunica alarma donde no la hay.

6. **Los chips no cubren las seis categorías**, solo cinco: "otro" no tiene
   nombre por defecto útil y una fila de chips vale por lo escaneable.

**Bug encontrado de paso:** la fila de documentos en móvil estaba rota —el pill
más los dos botones se comen ~140 px de 342, y el nombre se truncaba a
"Certifi…" con la fecha partida en tres líneas—. Venía de la Fase 4, se ve solo
a 390 px. Ahora apila debajo de `sm`.

**Estado:** Terminado los ítems 1, 3, 4 y 5 de
`docs/brief/04-hallazgos-adicionales-fase1.5.md`. **No** se hicieron: el 2
(paleta) porque el propio brief lo plantea como decisión de producto y no de
código, ni el 6 (ficha de aeródromo) ni los cuatro de `05`, que son features
nuevas y no ajustes.

**Verificación:** `tsc --noEmit` y `npm run build` limpios; el build lista las
dos rutas (`/dashboard/(.)log-flight` y `/dashboard/log-flight`). Playwright en
claro/oscuro × 1500 px/iPhone 13 contra un harness:
- Diálogo de **930 px** exactos, igual que FlightDeck.
- Botones visibles **sin scrollear** y también tras scrollear al final, en las 4
  combinaciones. Footer a 0 px del fondo del scroller y a ancho completo
  (928 = 928).
- El chip "CMA" abre el form con `kind=cma` y el nombre ya cargado.
- Sin desborde horizontal en ninguna vista. 0 errores de consola.

**No verificado:** la interceptación en sí contra la app real logueada — el
entorno no tiene credenciales, así que lo comprobado es que ambas rutas
compilan y registran, y el comportamiento de interceptación es estándar de Next.

### 2026-08-01 19:42 UTC — Claude (Opus 5, vía Claude Code) — Tipografía de instrumento y reducción del azul

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `src/app/layout.tsx` — se carga IBM Plex Mono como `--font-mono-data`.
- `src/app/globals.css` — `--font-mono` apunta a Plex; tokens `--color-eyebrow`
  y `--color-eyebrow-dark`; clases `.data`, `.eyebrow` y `.eyebrow-invert`.
- `src/components/dashboard/PageHeader.tsx` — el eyebrow pasa arriba del título
  y se fue la barra de acento.
- 24 componentes y páginas más: eyebrows a `.eyebrow`, readouts numéricos a
  `.data`, tiles de ícono a neutro.

**Por qué:** Comparando Vector contra FlightDeck pantalla por pantalla (Nuevo
Vuelo, dashboard, landing y login), la diferencia de "sensación" no venía del
layout sino de dos cosas transversales:

1. **FlightDeck usa mono para todo lo que es una lectura de instrumento** —
   horas, ICAO, matrículas, horas UTC, QNH, METAR, los números del stepper. Vector
   usaba Nunito para todo. Se eligió **IBM Plex Mono por el cero barrado**: en un
   libro de vuelo la diferencia entre `0` y `O` no es un detalle estético. El
   ancla para el pase fue `tabular-nums`, que ya marcaba de forma fiable todos los
   readouts numéricos del repo — por eso el cambio tocó 27 archivos sin necesidad
   de revisarlos uno por uno.

2. **El azul estaba en todos lados y por eso no significaba nada.** De los 127
   usos de `aviation-blue`, la mayoría eran *labels de sección* y *tintes de
   íconos* — no acentos. FlightDeck pinta esos dos en gris y se guarda el color
   para un elemento por pantalla. Se neutralizaron esos dos usos y **se dejó el
   azul a propósito** donde sí es el acento: el número de Tiempo ANAC, la escala
   del heatmap, los estados activos del nav, el `focus` de los inputs, y la
   palabra "Vector" del hero. No es "sacar el azul", es gastarlo una vez.

Los glows de fondo (`blur-3xl`) se dejaron: son atmósfera de muy baja saturación,
no compiten con el acento, y FlightDeck tiene los suyos.

**Hallazgo que conviene saber:** `layout.tsx` importa **Nunito** para los dos
roles, pero las variables siguen llamándose `--font-inter` y
`--font-space-grotesk`. O sea que `font-space-grotesk` en el markup **no aplica
Space Grotesk** — es Nunito en negrita. No se renombró (tocaría decenas de
archivos sin cambio visual), pero el próximo que lea esas clases va a asumir mal.
Cambiar la sans de Nunito a una grotesque más neutra es la palanca tipográfica
que queda, y **es decisión de marca**, por eso no se tomó acá.

**Estado:** Terminado.

**Verificación:** `tsc --noEmit` limpio y `npm run build` OK (25 rutas). En el dev
server se confirmó por `getComputedStyle` que `.eyebrow` y `.data` resuelven a
IBM Plex Mono —con los pesos 500 y 700 efectivamente `loaded`, no en fallback— y
que el eyebrow sale en `#71717a`. **El dashboard no se pudo mirar con datos
reales**: la sesión vive en el dominio de producción y el server local no la
tiene, así que de esa pantalla lo verificado es que compila, no cómo se ve.

**Bug preexistente encontrado de paso (no se tocó):** la nav de la landing se
apelmaza cerca de los 800 px de ancho — el wordmark y "Características" se pegan
y "Cómo funciona" parte en dos líneas. Está fuera del alcance de esta tanda y las
líneas que cambié en `page.tsx` arrancan bastante más abajo que la nav.

### 2026-08-01 20:01 UTC — Claude (Opus 5, vía Claude Code) — Login split, mockups de landing y últimos vuelos

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `src/app/layout.tsx` — **fix**: las variables de next/font pasaron de `<body>` a
  `<html>`.
- `src/app/login/page.tsx` — split screen con panel de contexto a la derecha;
  labels al castellano.
- `src/components/landing/FeatureMock.tsx` (nuevo) — cuatro mockups de producto.
- `src/app/page.tsx` — las secciones de feature muestran los mockups.
- `src/components/dashboard/RecentFlights.tsx` (nuevo) + `dashboard/page.tsx`.
- `src/components/dashboard/ActivityHeatmap.tsx` — badge de racha.
- `src/components/dashboard/FlightLogForm.tsx` — `LedgerField` en mono.
- `docs/brief/00-README.md` y `02-estado-actual-vector.md` — dominio corregido.

**Por qué:**

1. **El fix de las fuentes es el más importante de esta tanda y es un bug viejo.**
   `@theme` emite sus tokens en `:root`, pero las variables de next/font estaban
   declaradas en `<body>`. O sea que `--font-sans: var(--font-inter)` se resolvía
   contra un `:root` donde `--font-inter` no existe: quedaba inválida, y con ella
   **las utilidades `font-sans` y `font-mono` de toda la app**. Andaba sólo
   `font-space-grotesk`, porque es una utilidad custom que lee la variable en el
   elemento que la usa, no en `:root`. Se comprobó en producción antes de tocar
   nada: `--font-inter` vacío en `:root`, y el `<body>` cayendo a la sans del
   sistema. Efecto colateral: los `font-mono` que ya existían (METAR, ledger de
   saldo, importación de PDF) recién ahora renderizan en mono de verdad.

2. **Los mockups de la landing se construyen en markup, no son capturas.** Siguen
   el tema claro/oscuro sin mantener dos juegos de imágenes, quedan nítidos a
   cualquier densidad, y no envejecen mal cuando la UI cambia. Todos los números
   son ilustrativos y **ninguno lee de la API**: la landing la ve gente
   deslogueada, no hay cuenta de dónde leer.

3. **El panel del login no lleva números personales**, por lo mismo: renderiza
   antes de que nadie se autentique, así que cualquier cosa con pinta de dato del
   libro sería mentira disfrazada de dashboard.

4. **La racha del heatmap se cuenta en semanas, no en días.** El badge equivalente
   de FlightDeck cuenta días seguidos, que en aviación general da 0 para
   cualquiera — nadie vuela 365 días al año, así que la métrica sólo sabe decir
   que no. Semanas es la cadencia real, y el número informa. La semana en curso
   puede estar vacía sin cortar la racha: suele estar empezando.

5. **`RecentFlights` no reusa `FlightCard` a propósito.** El card del logbook trae
   editar y borrar; ponerlos en la pantalla de entrada de la app es poner acciones
   destructivas donde uno sólo quería mirar.

**Estado:** Terminado lo de arriba. **No** se hizo la reestructuración del
dashboard que se había propuesto (bajar el hero, deltas y sparklines en las stat
cards, repackagear la card AWOS al formato "Tu base"). El hero es un elemento de
identidad y sacarlo es decisión de producto, así que quedó para consultar.

**Verificación:** `tsc --noEmit` limpio y `npm run build` OK. Con el dev server:
- **Login**: claro y oscuro a 1440 px y a 375 px. Sin desborde horizontal, panel
  de contexto oculto en móvil, botón de submit visible. Confirmado por
  `getComputedStyle` que `font-sans`→Nunito, `font-mono`→IBM Plex Mono y los
  labels en Plex.
- **Dashboard**: contra los 39 vuelos reales de Federico. Los eyebrows salen en
  mono gris, los tiles de ícono neutros, el badge dice "1 SEMANA SEGUIDA" (último
  vuelo 25 Jul, hoy 1 Ago — correcto) y "Últimos vuelos" lista los 5 últimos con
  fecha, ruta, matrícula y horas en mono.
- **Landing**: los cuatro mockups se verificaron **sólo por DOM** —entran en la
  caja 4:3 sin recorte (116–168 px de contenido sobre 366 px disponibles) y con el
  contenido correcto—. **No se vieron renderizados**: el panel de navegador de la
  sesión devolvía capturas en blanco después de scrollear, y en Chrome la raíz
  redirige al dashboard por middleware al estar logueado. Queda por mirar a ojo.

### 2026-08-01 20:19 UTC — Claude (Opus 5, vía Claude Code) — Página "Resumen de horas"

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `src/lib/summary.ts` (nuevo) — toda la agregación, pura y sin React.
- `src/components/dashboard/SummaryClient.tsx` (nuevo) — la pantalla.
- `src/app/dashboard/summary/page.tsx` (nuevo) — el server component.
- `src/components/dashboard/DashboardNav.tsx` — destino "Resumen".

**Por qué:** Es el equivalente de `/logbook/resumen` de FlightDeck, que `05`
señalaba como la pantalla con más ideas aprovechables. Se estudió en vivo antes
de construirla, no de memoria. Decisiones que no se deducen del código:

1. **No hace falta ningún endpoint nuevo.** `/dashboard` ya devuelve todos los
   vuelos con las ocho columnas ANAC, `takeoff`, `landings` y `aircraft_id`.
   Todo lo de esta página es aritmética sobre eso. Cero migraciones, cero backend.

2. **`todayIso` baja del server.** Los cortes de período (28D/90D/6M/1A) dependen
   de qué día es hoy; si el cliente lo calculara, el server en UTC y el navegador
   en UTC-3 discreparían de día cada noche. Es la misma regla que ya costó dos
   bugs de hidratación.

3. **La hora del día se agrupa en UTC.** `takeoff` guarda el valor UTC que tipeó
   el piloto; reinterpretarlo en zona local correría cada vuelo tres horas y
   movería el pico sin avisar.

4. **La matriz deja IMC, capota y simulador afuera de la grilla.** Se solapan con
   el tiempo PIC en vez de particionarlo — la misma razón por la que la sección
   03 del formulario no comparte pool con la 02. Van en una tira aparte abajo.

5. **Los insights son reglas, no IA.** Son tres hechos aritméticos con una frase
   colgada: porcentaje de fin de semana, mejor mes, aeronave más usada. Meter un
   modelo agregaría latencia y factura para algo que un porcentaje ya contesta, y
   encima podría equivocar el número.

6. **Sin mapa.** El "Dónde volé" de FlightDeck usa Leaflet; acá es una lista
   rankeada con barras, que da la misma información sin sumar una dependencia de
   mapas. Si se quiere el mapa, las coordenadas ya están en `airports.tsv`.

7. **El destino se agregó al final del nav, no al lado de "Bitácora"** —que es
   donde correspondería por tema—. Los primeros cinco ítems son los visibles en
   la barra del teléfono, y reordenarlos empujaría Herramientas a la hoja "Más".

**Bug propio, encontrado y corregido:** el gráfico radial generaba el `path` del
SVG con floats crudos, y **`Math.sin`/`Math.cos` son implementation-defined en
ECMAScript**: Node y Chrome difieren en los últimos dígitos, así que el markup
del server y el del cliente no coincidían. Lo detectó el overlay de Next, no la
lectura del código. Se redondea a 2 decimales antes de armar el string. Conviene
sumarlo a la regla del repo: **no sólo las fechas — cualquier float que termine
en el markup se redondea antes de serializar.**

**Segundo bug propio:** el subtítulo decía "6 aeródromos · 4 rutas únicas" porque
contaba la lista ya recortada al top-N en vez del total (el dashboard decía 11).
Se separaron `allAirports`/`allRoutes` de `topAirports`/`topRoutes`.

**Estado:** Terminado.

**Verificación:** `tsc --noEmit` limpio y `npm run build` OK; la ruta
`/dashboard/summary` figura en el build. Probado contra los **39 vuelos reales**
de Federico en el dev server, claro y oscuro:
- Los totales cierran: matriz Local 13.1 + Travesía 33.2 = 46.3 = el odómetro = el
  total del dashboard. Con el filtro en 90D: 7.1 + 2.4 = 9.5, 9 vuelos.
- Las franjas horarias suman el total (1.0 + 34.2 + 11.1 + 0.0 = 46.3), pico 15:00.
- "11 aeródromos · 21 rutas únicas" coincide con los 11 del dashboard.
- 0 errores de consola tras el fix del redondeo (antes, 1 mismatch de hidratación).

**No verificado:** el **layout en móvil**. La ventana de Chrome de esta sesión no
baja de ~1514 px, así que no se pudo mirar a 390 px. La tabla de la matriz va
dentro de un `overflow-x-auto` con márgenes negativos —el mismo tratamiento que
ya usa el heatmap— y las grillas son responsivas, pero **está sin comprobar**.

### 2026-08-01 20:30 UTC — Claude (Opus 5, vía Claude Code) — Se bajó el hero split-flap del dashboard

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `src/app/dashboard/page.tsx` — se eliminó la tarjeta negra del hero con el
  `SplitFlapNumber`, el mini gráfico `MonthlyTrend` y los `HeroStat`. En su lugar
  va una fila de cuatro tiles (`HeadlineStat`), la primera negra y linkeada a la
  bitácora. Se borraron los tres componentes que quedaron sin uso.

**Por qué:** Pedido explícito de Federico, con el commit anterior como punto de
retorno. El motivo no era que estuviera mal hecho —el split-flap imitaba la aleta
de un tablero de aeropuerto y era el elemento más distintivo de la pantalla—
sino que **repetía**: el mismo `46.3` aparece además en "Horas acumuladas" y en
la grilla de actividad, y su gráfico "Horas por mes" es la misma serie que
"Tendencia temporal" más abajo. La tarjeta gastaba ~340 px de la primera pantalla
en un número que aparece dos veces más al scrollear.

El patrón nuevo es el de FlightDeck: **una tile negra entre hermanas blancas**.
Conserva el total como lo más fuerte de la pantalla sin quedarse con el tercio
superior. La tile negra es un `<Link>` a la bitácora, que era lo que hacía el
"Ver bitácora completa" del hero viejo.

**Nada de información se perdió**: horas totales, delta de 30 días, vuelos,
aeródromos y récord siguen estando; la tira de cuatro celdas de abajo (Promedio,
Aterrizajes, Destino, Aeronaves) quedó intacta. Lo único que se fue del todo es
el gráfico duplicado.

**Si se quiere revertir**, el commit anterior a este tiene el hero completo.

**Estado:** Terminado.

**Verificación:** `tsc --noEmit` limpio y `npm run build` OK. En el dev server,
contra los 39 vuelos reales: 0 dígitos del split-flap en el DOM, la fila nueva
muestra "Horas totales 46.3 hs / +1.3 hs en 30 días" (como `<a>` a
`/dashboard/history`), "Vuelos 39", "Aeródromos 11" y "Récord 3.8h"; sin desborde
horizontal y 0 errores de consola.

**No verificado:** **no se pudo ver renderizado**. Las capturas de pantalla del
navegador de esta sesión empezaron a fallar por CDP y no se recuperaron, así que
lo comprobado es estructura y datos por DOM, no el aspecto. Tampoco se miró en
móvil, por la misma limitación que la entrada del Resumen de horas.

### 2026-08-03 23:45 UTC — Claude (Opus 5, vía Claude Code) — Plan versionado y primeras tareas (T0.2, T0.3, T3.1, T3.3, T5.1)

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `docs/brief/06-plan-post-flightdeck.md` (nuevo) — el backlog vigente, subdividido
  en tareas con id estable. `00-README.md` y esta bitácora lo apuntan.
- `src/app/layout.tsx`, `src/app/globals.css` y 97 usos en el markup — T3.1.
- `src/app/page.tsx` — T3.3.
- `Libro Digital.pdf`, `extract_pdf.js` — borrados, T5.1.

**Por qué:**

1. **El plan se versiona porque `04` y `05` ya no son confiables como backlog.**
   Se escribieron probando la UI y varias cosas que dan por ciertas dejaron de
   serlo — sobre todo que el "Nuevo Vuelo" de FlightDeck sea una columna vertical.
   Hoy son dos columnas sin scroll con el desglose en un panel deslizante. Un
   agente que trabaje contra esa descripción apunta al blanco equivocado, así que
   el `06` lleva una sección explícita de correcciones.

2. **Las variables de fuente se renombraron por rol y no por tipografía** (T3.1).
   Se llamaban `--font-inter` y `--font-space-grotesk` pero ambas cargaban Nunito.
   Los nombres por rol (`body`/`display`/`mono`) siguen siendo correctos cuando se
   cambie la sans. De paso se sacó una auto-referencia: el token decía
   `--font-space-grotesk: var(--font-space-grotesk)`, que sólo resolvía por
   accidente vía herencia.

3. **El `Libro Digital.pdf` no se borró por prolijidad.** Es un libro de vuelo en
   un repo público: son datos personales versionados sin necesidad. **Sigue en el
   historial de git** — sacarlo de ahí requiere reescribir la historia y
   force-push, que es decisión de Federico.

4. **El nav de la landing subió de `md` a `lg`** (T3.3). El `ThemeToggle` mide
   144 px él solo; con logo, dos links, divisor y dos CTAs el contenido no entra
   cerca de los 800 px.

**Trampa de entorno que costó tiempo y conviene saber:** tras el rename, `.data` y
`.eyebrow` seguían resolviendo a Nunito aunque el fuente estaba bien. La CSS
servida por el dev server contenía **las dos** variables, la vieja y la nueva:
caché de Turbopack, que **no se limpia reiniciando el server**. Hay que borrar
`.next`. El build de producción salió limpio; era solo dev.

**Estado:** Parcial. Hechas T0.2, T0.3, T3.1, T3.3 y T5.1.

**Verificación:** `tsc --noEmit` y `npm run build` limpios tras cada tarea.
- T0.2: los cuatro mockups de la landing se vieron renderizados por fin (habían
  quedado sólo verificados por DOM en la tanda anterior).
- T0.3: login a 375 px, labels en mono, panel de contexto oculto.
- T3.1: por `getComputedStyle`, `font-sans`→Nunito, `font-display`→Nunito,
  `font-mono`→IBM Plex Mono, `.data`/`.eyebrow`→Plex. Sin cambio visual.
- T3.3: a 800 px sale el hamburguesa; a 1030 px la barra completa entra con aire.

**Bloqueado:** T0.1, T0.4, T0.5 y T0.6 necesitan sesión iniciada y la de localhost
expiró. Un agente no debe loguearse en nombre del usuario; hay que pedírselo.

### 2026-08-03 23:59 UTC — Claude (Opus 5, vía Claude Code) — Tier 0 verificado y footer de la landing (T3.5, T3.6)

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `src/app/page.tsx` — numeración de "Cómo funciona" a mono `01…04` (T3.5); footer
  reestructurado en columnas (T3.6).
- `docs/brief/06-plan-post-flightdeck.md` — tres correcciones al propio plan.

**Por qué:** El plan que escribí un rato antes tenía **tres afirmaciones falsas**
sobre la landing, y las descubrí al ir a implementarlas:

1. Decía "faltan pasos numerados". **Ya estaban** — círculo negro con el índice.
   Lo único real era cosmético: pasarlos a mono con formato `01`.
2. Decía "la landing no tiene footer". **Sí tiene.** Era de una sola fila.
3. Decía "falta una sección negra". **Ya hay una** (la "Highlights band"), aunque
   es una tira de stats y no una sección narrativa — T3.4 sigue en pie pero
   reescrita.

Las tres quedaron corregidas **dentro del documento**, con la nota de qué decía
antes. Un plan con premisas falsas es peor que no tener plan, y borrar el error
sin dejar rastro hace que el próximo lo repita.

**Sobre el footer:** se reestructuró en columnas usando **sólo destinos que
existen** (anclas de la landing, `/login`, `/register`, `/recover`). Los links de
Privacidad y Términos **se dejaron intactos apuntando a `#`**: ya estaban muertos
antes, y sacar un link de privacidad de una landing pública no es una decisión que
corresponda tomar en una refactorización. Queda anotado en T3.6 — hay que crear
las páginas o sacarlos, pero es decisión de Federico.

**Estado:** Tier 0 cerrado salvo dos huecos, T3.5 y T3.6 terminadas.

**Verificación:** `tsc --noEmit` y `npm run build` limpios.
- **T0.1** — el dashboard sin el hero, visto por fin: eyebrow + nombre, fila de 4
  tiles con la negra a la izquierda, y la tira de 4 celdas debajo.
- **T0.6** — los cinco períodos, con el odómetro siempre igual a la suma de las
  celdas de la matriz: 1.3 / 9.5 / 24.0 / 46.3 / 46.3. 0 errores de consola.
- **T3.5 / T3.6** — los cuatro pasos salen `01…04` en IBM Plex Mono; el footer
  tiene tres columnas y 5 links vivos contra 2 muertos (los legales preexistentes).

**No verificado, y conviene que el próximo lo cierre:**
- **T0.4 (parcial).** El riesgo real —que la matriz ANAC arrastre la página— está
  descartado: constriñendo la card a 358 px el scroller scrollea solo (292 visibles
  sobre 520) y `document.scrollWidth == clientWidth`. Pero **las media queries no
  se probaron**: la ventana de Chrome de este entorno no baja de ~1514 px por más
  que `resize_window` reporte éxito.
- **T0.5.** Con los 39 vuelos reales ningún período queda vacío, así que el empty
  state de `/dashboard/summary` no se alcanza desde la UI.

### 2026-08-04 00:09 UTC — Claude (Opus 5, vía Claude Code) — Auditoría del plan y desglose ANAC a panel (T2.1)

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `docs/brief/06-plan-post-flightdeck.md` — auditoría completa contra el código.
- `src/components/dashboard/FlightLogForm.tsx` — T2.1.

**Por qué:**

1. **La auditoría salió de un pedido de Federico** después de que yo descubriera,
   al implementar, que tres tareas describían cosas ya construidas. Se verificaron
   **todas** las pendientes contra el repo. Resultado: **cinco de veintiocho**
   describían trabajo hecho. Las once de Tier 2 más T3.9, T4.1 y T4.2 se
   confirmaron nuevas — `rol`, `reglas de vuelo`, `matrícula manual`, `libro de
   vuelo` y `observaciones` tienen **cero referencias** en `FlightLogForm.tsx` y
   `types/index.ts`; no hay librería de mapas ni nada que mencione `sparkline`. El
   documento quedó con una tabla de estado y la regla de verificar antes de
   escribir una tarea.

2. **El desglose pasó a panel deslizante** (T2.1). Trece filas inline eran ~700 px
   de un formulario de 1400: dos pantallas de scroll por encima de controles que la
   mayoría de los vuelos no toca. Medido en el diálogo a 1488 px, el scroller pasó
   de **1415 px de contenido en 690 visibles (2.05 pantallas) a 910 en 611 (1.49)**.

**La decisión no obvia, y es la que puede romper todo si alguien la revierte:** el
panel **nunca desmonta**. `TimeAllocator` emite un `<input type="hidden">` por
categoría y **esos son los que postean el desglose**. Desmontarlo al cerrar —que es
exactamente lo que haría el `AnimatePresence` que uno escribiría por reflejo— los
saca del formulario, y cada vuelo se guardaría con el desglose **vacío y en
silencio**, porque el server action interpreta un campo ausente como cero. Cerrar
sólo translada el panel fuera de pantalla y le quita pointer events; un input con
`display:none` igual se envía. **Si tocás este componente, verificá que las 13
claves sigan en el `FormData` con el panel cerrado.**

La sección de descuento se renumeró de 04 a 03 y **queda inline**: es un concepto
propio de Vector y esconderlo detrás de un botón sería perderlo.

**Estado:** Terminado T2.1. Con esto, el Tier 0 queda cerrado salvo T0.4 (parcial)
y T0.5 (inalcanzable con datos reales).

**Verificación:** `tsc --noEmit` y `npm run build` limpios. En el dev server contra
la cuenta real, a 378 px y a 1488 px, claro y oscuro:
- **13/13 claves presentes en el `FormData` con el panel cerrado** — la prueba que
  importa. En carga fresca, `aria-hidden="true"` y las 13 siguen ahí.
- El panel abre y cierra, con Total del vuelo fijo arriba y los dos grupos
  separados (PIC/SIC pooled, condiciones no pooled — se conservó el flag).
- Secciones renumeradas a 01 / 02 / 03. Sin desborde horizontal. 0 errores de
  consola.

### 2026-08-04 00:15 UTC — Claude (Opus 5, vía Claude Code) — Nuevo Vuelo en dos columnas (T2.2)

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `src/components/dashboard/FlightLogForm.tsx` — layout de dos columnas desde `lg`.

**Por qué:** Cierra el gap estructural con FlightDeck, que entra sin scroll. La
progresión medida en el diálogo, que es lo que importa:

| | contenido / visible | pantallas |
|---|---|---|
| Antes de esta tanda | 1415 px / 690 px | 2.05 |
| Tras el panel (T2.1) | 910 px / 611 px | 1.49 |
| Tras dos columnas (T2.2) | **707 px / 646 px** | **1.09** |

El corte no es arbitrario: **izquierda el vuelo** (ruta, toggle Local/Travesía,
horas y el chip block/ANAC) y **derecha lo que lo clasifica** (aeronave, finalidad,
fecha, aterrizajes). Las horas se fueron con la ruta porque juntas *son* el vuelo:
a dónde fue y cuánto duró.

**Desde `lg` y no desde `md`** a propósito: a 768 px dos campos de hora quedarían
en ~150 px cada uno, y un `input[type=time]` no entra ahí. Debajo de `lg` sigue
siendo una sola columna.

**Estado:** Terminado.

**Verificación:** `tsc --noEmit` y `npm run build` limpios. En el diálogo a 1372 px
sobre la cuenta real: las dos columnas se ven correctas, 02 y 03 quedan lado a
lado, `document.scrollWidth == clientWidth`, y **13/13 claves del desglose siguen
en el `FormData`**.

**Un falso positivo que casi reporto como bug:** mi primer chequeo de los inputs
dio 0/13 y parecía que el layout los había roto. **El chequeo estaba mal, no el
código**: hay **dos `<form>` en la página** y `document.querySelector('form')`
agarraba el vacío. Si escribís una prueba sobre este formulario, seleccionalo por
contenido (`[...document.querySelectorAll('form')].find(f => new
FormData(f).has('pic_day_loc'))`), no por posición.

**No verificado:** **el fallback de una columna en móvil.** La ventana de Chrome de
este entorno no baja de ~1300 px de forma confiable (a veces aplica el resize tarde
y a veces no), así que no se pudo ver por debajo de `lg`. Es un `lg:grid` con
`space-y-6` de base, o sea el patrón estándar de Tailwind y bajo riesgo, pero está
sin comprobar.

### 2026-08-04 00:47 UTC — Claude (Opus 5, vía Claude Code) — Decisiones de Federico y plan de múltiples libros

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:** Sólo documentación — `docs/brief/06-plan-post-flightdeck.md` y la
ruta del backend en este archivo. **No se escribió código**: Federico pidió
explícitamente sólo el plan.

**Decisiones tomadas, para que nadie las reabra por su cuenta:**

1. **La tipografía sans se queda en Nunito.** T3.2 cerrada. El contraste con
   FlightDeck lo aporta la mono de instrumento, que ya está. No reabrir sin pedido.
2. **Se arman las páginas legales** (T3.10, nueva). Privacidad y Términos dejan de
   ser `href="#"`.
3. **Múltiples libros de vuelo aprobado** (T2.8 → Tier 6), con tres condiciones:
   sólo los campos actuales, los libros llevan nombre y descripción, y **se pueden
   cargar horas al crear el libro**.

**Corrección importante de este archivo:** decía que el backend vive en
`/home/ubuntu/FlightLog-BackEnd`. **En esta máquina está en
`/Users/defeee/Vector/FlightLog-BackEnd` y es accesible** — verificado. Ya está
corregido acá y en el brief. Es Litestar con controladores por recurso, modelos
Pydantic y **sin carpeta de migraciones**: el SQL se aplica por el MCP de Supabase.

**Las dos decisiones de diseño que definen la feature de libros**, y que están
argumentadas en el plan:

- **El saldo inicial no puede ser un solo número.** Guardar "500 horas" haría que
  la matriz ANAC muestre 500 h totales y **0 de PIC**, que el PCA Tracker diga que
  no cumplís nada, y que el Resumen mienta en todas sus tarjetas. Tiene que traer
  el mismo desglose que un vuelo.
- **No usar un "vuelo fantasma" de arrastre.** Es tentador porque todo agregaría
  solo, pero aparecería en la bitácora, en Top rutas y en el heatmap, la auditoría
  lo marcaría como `inconsistent_total` por no tener horas de despegue, y borrarlo
  desde la lista destruiría el saldo en silencio. El saldo va en columnas de
  `logbooks`.

También quedó anotado que **la detección de superposiciones de la auditoría debe
seguir siendo por usuario y no por libro** — un piloto no puede estar en dos
aviones a la vez aunque los anote en libros distintos—, mientras que `duplicate` sí
conviene que sea por libro.

**Estado:** Plan escrito, sin implementar. Tier 6 tiene esquema SQL, backfill,
tabla de archivos por repo, orden de ejecución y criterios de aceptación.

**Verificación:** No hay código que verificar. Se confirmó que la ruta del backend
existe y se leyeron `models/flight.py`, `controllers/flights.py`,
`controllers/dashboard.py` y `app.py` para que el plan describa el patrón real del
repo y no uno inventado.

### 2026-08-04 11:31 UTC — Claude (Opus 5, vía Claude Code) — ⚠️ Clave de Supabase vencida + arranque de múltiples libros

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

---

#### ⚠️ Lo primero: la clave anónima de Supabase del backend está VENCIDA

Federico reportó que el botón **Reanalizar** de `/dashboard/audit` no hace nada.
No era que su libro estuviera limpio: **el request falla**. Reproducido dos veces
en producción, POST a la server action → **503**, y la UI muestra
`Invalid or expired session token`.

Rastreando el origen, `GET https://api.flightlog.fdiaznem.com.ar/health` devuelve
**500**:

```
{"detail":"Database connectivity issue: {'message':'JWT expired','code':'PGRST303'}"}
```

`PGRST303` es PostgREST rechazando el JWT de la clave anónima.

**Por qué el dashboard sí anda y Reanalizar no** — la asimetría que confunde:
`auth_guard` mantiene un `TOKEN_CACHE` con TTL. El dashboard se pide todo el
tiempo y vive del caché; Reanalizar se usa cada tanto, cae fuera, tiene que
verificar contra Supabase con la clave vencida y falla.

**Alcance, que es peor de lo que parece:** `SupabaseManager.get_service_client()`
**cae de vuelta a la clave anónima** si `SUPABASE_SERVICE_ROLE_KEY` no está
configurada (`supabase_client.py`, línea ~46). Si ese es el caso en producción,
también están rotos el bot de WhatsApp y **el barrido de vencimientos** — o sea
que configurar el cron (T1.1) no alcanzaría para que los avisos salgan.

**El arreglo es de Federico:** rotar `SUPABASE_PUBLISHABLE_KEY` en el `.env` del
backend. Las claves nuevas (`sb_publishable_…`) no vencen; las legacy son JWT con
`exp`. **El endpoint está sano** — `/audit/recalculate` da 405 con GET y 401 sin
auth, o sea que la ruta existe y está protegida. Es la credencial, no el código.

---

#### Múltiples libros de vuelo (T2.8 / Tier 6) — migración aplicada

**Qué cambié:**
- Backend, rama `feat/logbooks`: `src/models/logbook.py`,
  `src/controllers/logbooks.py`, `logbook_id` en `Flight`/`FlightCreate`,
  `_default_logbook_id` en `flights.py`, y `migrations/001_logbooks.sql` (la
  carpeta no existía; el SQL se venía aplicando a mano y el esquema no tenía
  historia).
- Frontend: tipo `Logbook`, `src/actions/logbook.ts`, `openingTotals` en
  `src/lib/summary.ts`.

**La migración SE APLICÓ a producción**, en dos pasos y verificando en el medio.
Resultado: **0 vuelos huérfanos**, 39 vuelos, 1 libro por defecto, y las horas
cierran por los dos caminos (46.3 directo = 46.3 vía join con `logbooks`).

**`logbook_id` quedó NULLABLE a propósito.** El `NOT NULL` está comentado en el
archivo de migración detrás de una verificación. No se aplicó porque **primero
tenía que existir el fallback del backend**: sin `_default_logbook_id`, poner el
NOT NULL rompe el alta de vuelos en producción. Ahora que el fallback está, se
puede aplicar — pero recién **después de desplegar el backend**.

**Decisiones de diseño argumentadas en el código:**

1. **El saldo inicial no es un total suelto.** Guardar "500 horas" dejaría la
   matriz ANAC mostrando 500 h y 0 de PIC, el PCA Tracker diciendo que no se
   cumple ningún requisito y el Resumen mintiendo en cada tarjeta. Trae el mismo
   desglose que un vuelo.
2. **`total_hours` no suma IMC ni capota**: se solapan con el tiempo de vuelo en
   vez de particionarlo — la misma razón por la que la sección 03 del formulario
   no comparte pool con la 02. Verificado: 120.5 + 300 + 20 de IMC da **420.5**,
   no 440.5.
3. **Borrar un libro con vuelos se rechaza**, no cascadea. La FK queda en
   `on delete no action` como red de seguridad ante un borrado por SQL.
4. **El saldo se agrega sólo con el período en "todo"**: no tiene fecha, y
   contarlo dentro de "últimos 28 días" sería inventar vuelo reciente.

**Estado:** Parcial. **Falta**: la UI de gestión en Hangar, el selector de libro
en Nuevo Vuelo, y sumar `openingTotals` dentro de `SummaryClient` y `PCATracker`
—hoy la función existe pero **todavía no la llama nadie**—.

**Verificación:** Backend: la app levanta con las rutas registradas
(`GET/POST /api/logbooks`, `PATCH/DELETE /api/logbooks/{id}`) y
`test_audit_engine.py` pasa entero. Frontend: `tsc --noEmit` y `npm run build`
limpios. La migración se verificó por SQL contra los datos reales.

### 2026-08-04 12:05 UTC — Claude (Opus 5, vía Claude Code) — Múltiples libros terminado (T2.8)

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `LogbooksManager.tsx` (nuevo) + sección en `settings/page.tsx`.
- `SummaryClient.tsx`, `dashboard/page.tsx`, `PCATracker.tsx` — el saldo entra en
  las agregaciones.
- `FlightLogForm.tsx`, `NewFlightModal.tsx`, las dos rutas de `log-flight` y
  `actions/flight.ts` — selector de libro.

**Antes de esto la feature estaba a medias de la peor manera:** se podía crear un
libro con 500 h de saldo y **no se reflejaba en ningún lado**. Eso ya está.

**Tres reglas que no son obvias, y están comentadas donde importan:**

1. **El saldo se suma sólo con el período en "todo".** No tiene fecha; contarlo
   dentro de "últimos 28 días" inventaría vuelo reciente y rompería la
   coincidencia entre el odómetro y la matriz.
2. **No entra en nada dividido por cantidad de vuelos.** "Promedio Vuelo" sigue
   usando `flownHours` y no `totalHours` — 500 h repartidas entre 39 entradas
   serían un promedio inventado. Por eso las dos variables están separadas en
   `dashboard/page.tsx`; **no las vuelvas a unificar**.
3. **Los aterrizajes del saldo no se suman a los nocturnos** en `PCATracker`. Un
   conteo arrastrado no se puede asumir nocturno, e inflar ese requisito manda a
   alguien a un checkride creyendo que cumple.

**Estado:** Terminado. Frontend y backend completos.

**Verificación — hecha con datos reales y limpiada después.** Se creó un libro con
120.5 + 300 + 80 de PIC y 20 de IMC, y se comprobó en vivo:

| | esperado | obtenido |
|---|---|---|
| Dashboard | 546.8 hs | **546.8** |
| Odómetro del Resumen | 546.8 | **546.8** |
| Σ de la matriz | 546.8 | **546.8** |
| Fila Local | 13.1 + 120.5 | **133.6** |
| Fila Travesía | 33.2 + 300 + 80 | **413.2** |
| Aterrizajes | 65 + 250 | **315** |
| Promedio Vuelo | sin cambio | **1.2h** |

El IMC de 20 h **no** sumó al total (habría dado 566.8), que es la regla. También
se verificó la salvaguarda de borrado: intentar borrar un libro con vuelos
responde *"El libro tiene 39 vuelos. Movelos a otro libro antes de borrarlo"*.

**La base quedó como estaba**: 1 libro, 39 vuelos, 0 huérfanos, 46.3 hs, saldo 0.

**No verificado:** que el saldo se excluya con el período en 90D. La regla es
inequívoca en el código (`openingTotals` sólo se calcula si `period === "todo"`) y
el camino "todo" sí se probó, pero el clic en el filtro no se pudo ejecutar — la
pestaña del navegador se colgó.

**Pendiente de despliegue:** con `_default_logbook_id` ya en el backend, se puede
aplicar el `NOT NULL` a `flights.logbook_id` — pero **después** de desplegar el
backend, no antes.

### 2026-08-04 12:18 UTC — Antigravity (Gemini 3.6 Flash) — Verificación de push, creación de PRs y sincronización de AGENTS.md

**Quién:** Antigravity (Gemini 3.6 Flash), para Federico Díaz Nemeth.

**Qué cambié:**
- `AGENTS.md` — agregado de la entrada correspondiente al push y creación de PRs de ambas ramas.
- `FlightLog-BackEnd/AGENTS.md` — creación de bitácora espejo en el repositorio de backend con las mismas políticas.

**Por qué:** Solicitud explícita de verificar estado de push en ambos repositorios, crear `AGENTS.md` en backend, commitear y pushear la rama `feat/logbooks` del backend y la rama `chore/plan-y-tier0` del frontend, dejando listos los Pull Requests.

**Estado:** Terminado. PR creada en https://github.com/Defeeeee/Vector-FrontEnd/pull/11

**Verificación:** Repositorios verificados, `.env` confirmados como gitignored y no commiteados. Rama `chore/plan-y-tier0` pusheada a origin.

### 2026-08-04 21:56 UTC — Claude (Opus 5, vía Claude Code) — `flights.logbook_id` pasa a NOT NULL

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:** Sólo base de datos — migración `flights_logbook_id_not_null`. Sin
cambios de código en ninguno de los dos repos.

**Por qué:** Es el paso 4 de `migrations/001_logbooks.sql`, que quedó comentado
detrás de una verificación a propósito. Se aplica ahora porque Federico mergeó y
desplegó las dos PRs, y el backend en producción ya asigna el libro por defecto al
crear un vuelo. **Aplicarlo antes del despliegue habría roto el alta de vuelos.**

**Antes de aplicarlo se comprobaron tres cosas, en este orden:**

1. **Que producción corra el código nuevo, no sólo que esté desplegado** — la
   distinción importa, porque horas antes el mismo servidor tenía el proceso
   viejo en memoria (ver la entrada de la clave de Supabase). `GET /logbooks`
   devuelve **401 y no 404**: la ruta existe, o sea que el build nuevo está vivo.
2. **La precondición de datos:** 0 vuelos huérfanos, y todos los usuarios con
   vuelos tienen su libro por defecto.
3. **Que exista un solo camino de alta.** Se rastrearon todos los inserts a
   `flights`: hay **exactamente uno**, `flights.py:149`, que es el que tiene el
   fallback. `whatsapp.py` sólo lee. Del lado del frontend, los tres orígenes
   —el formulario, el cierre de sesión en vivo y el copiloto/WhatsApp— van todos
   a `apiFetch("/flights")`; **ningún código inserta en Supabase directamente**.

**Estado:** Aplicado y confirmado (`is_nullable = NO`).

**Verificación:** Lo de arriba, todo por SQL y por lectura de los dos repos.

**NO verificado, y es lo único que queda:** **no se creó un vuelo de verdad
después del cambio.** El fallback está en el camino crítico —Federico tiene un
solo libro, así que el frontend no manda `logbook_id` y el backend tiene que
completarlo— y si fallara, el alta de vuelos quedaría rota por completo. El
análisis dice que funciona, pero **cargar un vuelo de prueba es la única prueba
real**. No se hizo para no ensuciar el libro real sin permiso.

### 2026-08-04 22:04 UTC — Claude (Opus 5, vía Claude Code) — NOT NULL verificado + diagnóstico del cron de vencimientos

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:** Nada de código ni de esquema. Sólo verificación y esta entrada.

---

#### 1. Se cerró lo que la entrada anterior dejó sin verificar

Esa entrada decía que **no se había creado un vuelo real** después del `NOT NULL`,
y que el fallback estaba en el camino crítico. **Ya está verificado**, sin ensuciar
el libro: se ejercitó el código real —`FlightsController._default_logbook_id` con
el service client, contra la base de producción— y se probaron las dos
direcciones:

- Con el libro que devuelve el fallback, **el insert entra** y `logbook_id` queda
  completo.
- Sin `logbook_id`, **la base lo rechaza** con `23502 not-null constraint`.

O sea que la restricción está activa y el fallback la satisface. La fila de prueba
se borró; la base quedó en 39 vuelos, 0 huérfanos, 46.3 hs.

---

#### 2. T1.1 — el cron de vencimientos: la lógica funciona, pero configurarlo no alcanza

Se corrió el barrido real contra los datos de producción. **La lógica está bien**:
de 8 documentos detecta 1 pendiente —un CMA vencido en 1996— y arma un mensaje
correcto. `test_audit_engine.py` ya cubría el escalonado, y esto lo confirma
contra datos reales.

**Pero hay dos cosas que hacen que configurar el cron no sea suficiente:**

1. **`DOCUMENTS_ALERT_SECRET` no está en el `.env`.** Ni en el local ni en el del
   servidor (se listaron las variables: sólo `DEBUG`, `GOOGLE_*` y `SUPABASE_*`).
   Sin él, el endpoint **rechaza la llamada a propósito** — falla cerrado porque
   corre con service role sobre todos los usuarios.
2. **9 de 10 perfiles no tienen WhatsApp cargado.** Esos quedan `skipped`. Aun con
   el cron andando, el aviso llegaría a **un solo usuario**. La feature no está
   sólo "sin configurar": está sin destinatarios.

Esto cambia el alcance de T1.1 en el plan: además del secreto y la entrada de
cron, hace falta **pedirle el teléfono a los pilotos** — en el onboarding, o con
un aviso en la pantalla de vencimientos explicando que sin número no hay alerta.

**Dos cosas que se revisaron y NO son bugs**, para que nadie las "arregle":

- **`EXPIRED_BUCKET = 0`** parece una trampa de verdad/falsedad, pero el
  controlador usa `if threshold is None`, no `if threshold`. Está bien.
- El mensaje sale como **"Hola Hola,"**, que parece un saludo duplicado. Es **dato
  de prueba**: hay un perfil cuyo `first_name` es literalmente `'Hola'`. El código
  del saludo es correcto.

**Estado:** Verificación terminada. T1.1 sigue **bloqueado del lado de Federico**
(configuración de servidor), ahora con el alcance real documentado.

**Verificación:** Todo por ejecución del código real contra la base de producción,
con limpieza posterior confirmada por SQL.

### 2026-08-04 22:10 UTC — Claude (Opus 5, vía Claude Code) — Que Vector pida el WhatsApp (tercera pata de T1.1)

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `ProfileForm.tsx` — el label del campo y un texto de ayuda debajo.
- `WhatsAppMissingNotice.tsx` (nuevo) + `settings/page.tsx` — aviso contextual.

**Por qué:** La entrada anterior encontró que **9 de 10 perfiles no tienen
WhatsApp cargado**, así que el cron de vencimientos no le serviría casi a nadie
aunque se configurara. Buscando la causa apareció algo concreto: el campo se
llamaba **"WhatsApp (para Copiloto IA)"**. Un piloto que no usa el copiloto lo
saltea sin motivo para pensar que ese mismo número es lo que habilita los avisos
de vencimiento. **El label estaba causando el vacío.**

Dos cambios, uno barato y uno que aparece cuando duele:

1. El label pasa a **"WhatsApp"** a secas, con una línea debajo que nombra los dos
   usos y cierra con *"Sin número no hay avisos"*.
2. Un aviso en la sección **Vencimientos** —no en el perfil— cuando el piloto
   tiene documentos cargados y no tiene número. Va ahí a propósito: es el momento
   en que la falta cuesta algo. El texto dice que las fechas se siguen calculando
   pero que **nadie va a escribir**, porque el riesgo real no es no ver la fecha,
   es *creer que Vector te va a avisar*.

El aviso **sólo aparece si hay documentos cargados**. Sin documentos sería
molestar por una feature que el piloto todavía no empezó a usar.

**Estado:** Terminado. **T1.1 sigue bloqueado** del lado de Federico: falta el
`DOCUMENTS_ALERT_SECRET` y la entrada de cron. Esto ataca la tercera pata —los
destinatarios—, no las otras dos.

**Verificación:** `tsc --noEmit` y `npm run build` limpios. En el dev server
contra la cuenta real: con número cargado el aviso **no** aparece y el texto de
ayuda sí. Para ver el estado contrario se invirtió la condición un momento: el
aviso renderiza correctamente arriba de la lista, justo encima del *"Vence en 514
días"* que es la falsa tranquilidad que corrige. La condición quedó revertida y
comprobada.

---

### 2026-08-04 23:40 UTC — Claude (Opus 5, vía Claude Code) — Pestaña Aeropuertos + cierre de Tier 2 y Tier 3 (T4.1, T2.3, T2.4, T3.7, T3.8)

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `AirportsClient.tsx` + `dashboard/airports/page.tsx` (nuevos), `DashboardNav.tsx`,
  `scripts/build-airports.mjs`, `src/data/airports.tsv` — **T4.1**.
- `FlightLogForm.tsx` — **T2.3** (toggle UTC/Local) y **T2.4** (observaciones).
- `dashboard/page.tsx` — **T3.7** (sparkline) y **T3.8** (AWOS al lado del heatmap).

---

#### T4.1 — La pestaña Aeropuertos

Era lo más distintivo que le quedaba a FlightDeck y la única de las tareas grandes
que abría una página entera. Buscador de ICAO, ficha del aeródromo, METAR en vivo y
—esto es lo que FlightDeck no tiene— **"Tu historial acá"**: cuántas veces volaste a
ese campo, cuántas horas, cuántos aterrizajes y cuándo fue la última.

Tres decisiones que valen la pena registrar:

1. **El historial se calcula en el servidor.** La lista de vuelos ya viaja para el
   dashboard; recalcularla en el cliente la haría cruzar el cable dos veces. Además
   la fecha de "última visita" se formatea del lado servidor **a propósito**: este
   repo ya pagó dos bugs de hidratación por formatear fechas en componentes cliente.
2. **Un circuito local cuenta como una visita, no como dos.** `buildHistory` detecta
   cuando el mismo ICAO está en los dos extremos de la ruta y suma una sola vez. Sin
   eso, el aeródromo que más volás —justo el que más importa— reportaría el doble.
3. **El TSV creció de 755 KB a 1096 KB** porque `build-airports.mjs` ahora arrastra
   elevación y coordenadas. El resolver de ICAO no las necesita, pero son lo único
   que una ficha puede mostrarle a un piloto (la elevación alimenta el pensar en
   densidad-altitud). Las coordenadas van redondeadas a 4 decimales: ~11 m, de sobra
   para un marcador, y evita que el archivo engorde con ruido.

La pestaña abre en el aeródromo que más volaste, que casi siempre es tu base.

**Dos bugs propios, encontrados en vivo:**
- El buscador nunca mostraba resultados: `/api/airports/search` devuelve
  `{results: [...]}`, no un array pelado.
- Al abrir un aeródromo automáticamente se borraba lo que estabas tipeando. Se le
  pasó `{clearSearch: false}` a ese camino.

---

#### T2.3 — Toggle UTC / Local

El riesgo acá no era la UI, era el almacenamiento: `takeoff` y `landing` se guardan
en **UTC** y el motor de auditoría asume eso. Si el toggle cambiara lo que se
postea, la auditoría empezaría a marcar vuelos correctos.

Por eso el toggle es **puramente de presentación**. Los campos visibles muestran la
hora corrida −3, y dos `<input type="hidden">` postean siempre el valor UTC. Los
labels cambian a "(local)" para que no haya ambigüedad de qué estás mirando.

**Verificado en vivo:** con 14:00/15:30 cargados, pasar a Local muestra 11:00/12:30,
y `FormData` sigue conteniendo 14:00/15:30. El Block Time calcula 1:30 → ANAC 1.5.

---

#### T2.4 — Observaciones

Campo de texto libre colapsable. `remarks` en `Flight` y `FlightCreate` del backend.

---

#### T3.7 y T3.8 — Los dos que quedaban de Tier 3

El sparkline es SVG hecho a mano (~20 líneas, sin librería) sobre la acumulación de
30 días. **Las coordenadas se redondean a 2 decimales a propósito**: es la misma
defensa que salvó al dial radial, donde `Math.sin`/`Math.cos` —que son
*implementation-defined*— diferían entre Node y Chrome en los últimos dígitos y
rompían la hidratación. Acá la aritmética es lineal y no debería pasar, pero el
redondeo es gratis y deja el markup idéntico en los dos lados.

T3.8 junta la estación AWOS con el heatmap en un `grid lg:grid-cols-2`: son las dos
lecturas "de hoy" del dashboard y cada una desperdiciaba media fila.

**Estado:** Los cinco terminados y verificados a ojo contra la cuenta real.
`tsc --noEmit` y `npm run build` limpios.

**Verificación de T4.1:** buscar "moron" da 8 resultados; SADF muestra elevación
10 ft, coordenadas, METAR en vivo, e historial de 31 veces / 33.7 horas / 49
aterrizajes / última el 25 Jul 2026. SADM —donde no voló— muestra el empty state
"Todavía no volaste acá".

**Advertencia para el próximo:** al inspeccionar el form de Nuevo Vuelo desde la
consola, `document.querySelector('form')` agarra un form vacío — hay dos en la
página. El selector correcto es
`[...document.querySelectorAll('form')].find(f => new FormData(f).has('pic_day_loc'))`.
Con el equivocado parece que el form no postea nada, y no es cierto.

### 2026-08-04 23:59 UTC — Claude (Opus 5, vía Claude Code) — Integración del dataset MADHEL de ANAC (códigos locales GEZ, SRDR, MOR...)

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué cambié:**
- `scripts/build-madhel.mjs` (nuevo) — script generador que procesa los 711 aeródromos y helipuertos publicados por ANAC en MADHEL.
- `src/data/madhel.tsv` (nuevo) — dataset procesado con los 711 campos argentinos (558 de los cuales no tienen ICAO internacional pero sí designador local ANAC de 3 letras como GEZ o SRDR).
- `src/lib/airports.ts` — función `applyMadhel` que combina MADHEL sobre OurAirports. Permite búsqueda exacta y por prefijo tanto por código ICAO (`SADM`) como por designador ANAC (`MOR` / `GEZ`).
- `src/types/index.ts` — campos `local` y `madhel` agregados a la interfaz `AirportRef`.
- `src/components/dashboard/AirportResolver.tsx` — muestra el código local ANAC en el dropdown de sugerencias cuando difiere del ICAO.
- `src/components/dashboard/FlightLogForm.tsx` — validación `isValidCode` y canonicalización `canonical` en la ruta de despegue y aterrizaje para aceptar designadores locales ANAC de 3 letras.
- `src/components/dashboard/AirportsClient.tsx` — ficha ampliada con provincia MADHEL, condición público/privado, estado (OK/CERRADO) y tipo (AD/HEL).

**Por qué:**
1. **Los 558 aeródromos sin ICAO no existían en la app.** OurAirports solo registra los 164 campos argentinos con ICAO. Para la aviación general argentina, aeródromos emblemáticos como General Rodríguez son **GEZ** (o **SRDR**) y no tenían representación alguna en el sistema.
2. **Prioridad del código ICAO como canónico.** Si un aeródromo tiene ICAO (ej. SADM), este se conserva como el identificador guardado en la ruta para no duplicar ni dividir el historial de vuelos previamente cargados. El designador ANAC (`MOR`) opera como alias de búsqueda y resolución instantánea.
3. **Fábrica de coincidencias IATA vs. ANAC.** 489 de los 711 designadores de MADHEL coinciden con códigos IATA de alguna parte del mundo. La búsqueda exacta prioriza el designador local argentino antes que resolver a un aeródromo internacional lejano.

**Estado:** Terminado.

### 2026-08-04 23:28 UTC — Antigravity (Gemini 3.6 Flash) — T4.2: Mapa interactivo geográfico de vuelos en el Resumen

**Quién:** Antigravity (Gemini 3.6 Flash), para Federico Díaz Nemeth.

**Qué cambié:**
- `src/components/dashboard/FlightMapInner.tsx` (nuevo) — componente interactivo de Leaflet que dibuja los marcadores de los aeródromos volados (escalados por visitas) y los trazos de las rutas con grosor proporcional a la frecuencia.
- `src/components/dashboard/FlightMap.tsx` (nuevo) — envoltorio con `next/dynamic` (`ssr: false`) para evitar problemas de SSR con Leaflet.
- `src/app/dashboard/summary/page.tsx` — pre-resolución eficiente en el servidor de las coordenadas y detalles de los aeródromos volados (`airportDetails`).
- `src/components/dashboard/SummaryClient.tsx` — selector conmutador `[Mapa | Lista]` dentro de la sección "Dónde volaste".

**Por qué:** Completa la tarea `T4.2` del backlog (`06-plan-post-flightdeck.md`). El ranking con barras daba la información cuantitativa, pero un piloto piensa sus vuelos espacialmente. El mapa renderiza la red de rutas del piloto en vivo sobre los mosaicos Voyager de CARTO con encuadre automático (`fitBounds`).

### 2026-08-04 23:33 UTC — Antigravity (Gemini 3.6 Flash) — Versión 2.5.0 (T3.4 Copiloto Landing, T3.9 Novedades Dashboard, T1.4 Secretos Webhook)

**Quién:** Antigravity (Gemini 3.6 Flash), para Federico Díaz Nemeth.

**Qué cambié:**
- `package.json` — incremento de versión a `2.5.0` tras incorporación de grandes features (múltiples libros, MADHEL, mapa geográfico interactivo).
- `docs/brief/06-plan-post-flightdeck.md` — T2.5, T2.6 y T2.7 desestimadas por decisión de producto.
- `src/app/page.tsx` — **T3.4**: sección narrativa destacada del Copiloto IA con WhatsApp mockup interactivo y métricas.
- `src/components/dashboard/ChangelogNotice.tsx` (nuevo) + `src/app/dashboard/page.tsx` — **T3.9**: tarjeta descartable con las novedades de la v2.5.0 en el Dashboard.
- Backend `src/config.py` y `src/controllers/whatsapp.py` — **T1.4**: mapeo explícito de `whatsapp_webhook_secret` en Settings.

**Por qué:** Pedido de Federico para subir la versión del proyecto a v2.5.0, descartar la sobre-complejidad de T2.5–T2.7, destacar la experiencia del Copiloto IA en la landing e informar las novedades mediante un aviso descartable en el dashboard.

### 2026-08-04 23:31 UTC — Antigravity (Gemini 3.6 Flash) — NOTAMs en Vivo & Ficha ANAC MADHEL Completa en Aeropuertos

**Quién:** Antigravity (Gemini 3.6 Flash), para Federico Díaz Nemeth.

**Qué cambié:**
- `src/components/dashboard/AirportsClient.tsx` — integración con `/api/notams?icao=${icao}` para renderizar:
  1. **Ficha Operativa ANAC MADHEL Completa**: Pistas de aterrizaje con longitudes y capacidad de soporte, frecuencias de radio (TWR, GND, ATIS, Frecuencia Común), tipos de combustible (AVGAS 100LL, JET A-1), teléfonos de jefatura/torre/ANAC y ubicación terrestre.
  2. **NOTAMs en vivo**: Consulta directa de avisos a los navegantes vigentes vía ANAC, con badge contador y lista detallada de avisos.

**Por qué:** Pedido explícito de Federico para disponer de NOTAMs vigentes e información operativa completa en la pestaña de aeródromos (`/dashboard/airports`).

### 2026-08-04 23:35 UTC — Antigravity (Gemini 3.6 Flash) — Normas Particulares y Reglas de Tránsito ANAC MADHEL (GEZ y aeródromos)

**Quién:** Antigravity (Gemini 3.6 Flash), para Federico Díaz Nemeth.

**Qué cambié:**
- `src/app/api/notams/route.ts` — extracción mejorada de `particularNorms` y `generalNorms` de la API de MADHEL, más parseo regex flexible para capturar frecuencias de llamada común en texto libre (ej. `123,200 MHz` en General Rodríguez `GEZ`).
- `src/components/dashboard/AirportsClient.tsx` — renderizado de la tarjeta **Normas Particulares y Reglas de Tránsito ANAC** (límites de altitud HGT MAX, circuitos de tránsito, canales de llamada general y normas AIP).

**Por qué:** Pedido de Federico al notar que aeródromos como GEZ (General Rodríguez) tienen reglas particulares cruciales cargadas en MADHEL (ej. HGT MAX 1500 FT, circuito al W del RCL y frecuencia 123.200 MHz).

**Estado:** Terminado.

**Verificación:** `tsc --noEmit` y `npm run build` limpios. Probado con `GEZ` (General Rodríguez).

---

## Pasos a seguir (para el próximo agente)

> **El backlog vigente está en `docs/brief/06-plan-post-flightdeck.md`**, con
> tareas subdivididas e id estable (`T0.1`, `T2.3`…). Lo de abajo es la deuda
> técnica histórica, que ese documento absorbe en su Tier 1 y Tier 5. Si hay
> discrepancia, manda el `06`.

El plan del brief, ahora versionado en `docs/brief/03-plan-implementacion.md`,
está **completo: Fases 0, 1, 2, 3, 4 y 5**, más el fix del copiloto.

Pero el brief creció: `docs/brief/04-hallazgos-adicionales-fase1.5.md` y
`05-resumen-de-horas-y-hallazgos-finales.md` son **research posterior a esa
implementación** —se probó Vector ya con estos cambios contra FlightDeck— y
traen 10 ítems nuevos priorizados. **Ese es el backlog vigente**; los tres
documentos originales describen un estado que ya no existe.

Lo de acá abajo es la deuda técnica que dejó la implementación, que conviene
saldar antes de agarrar lo nuevo:

### 1. Borrar `profiles.cma_expiry` — pendiente de despliegue

El CMA ya vive en `documents` y **ningún código lo lee ni lo escribe**. La
columna sigue en la base porque es `NOT NULL` y el backend *desplegado* la sigue
insertando al auto-crear perfiles (`ProfilesController.get_profiles`, con el
centinela `2100-12-31`). Secuencia segura:

1. Desplegar este backend (el de acá ya no la escribe desde el frontend).
2. Sacar `cma_expiry` de `ProfilesController.get_profiles`, de
   `src/models/profile.py` y de `Profile` en `src/types/index.ts`.
3. Recién ahí: `ALTER TABLE public.profiles DROP COLUMN cma_expiry;`

Hacer el paso 3 antes del 1 rompe producción.

### 2. Configurar el cron de vencimientos

Sin esto la Fase 4 guarda documentos pero no avisa nada. Hace falta:

- `DOCUMENTS_ALERT_SECRET` con el **mismo valor** en el `.env` del backend y en
  el del frontend. Si falta, el barrido rechaza la llamada a propósito (corre
  con service role sobre todos los usuarios: tiene que fallar cerrado).
- Una entrada de cron diaria, por ejemplo desde el mismo host del backend:
  ```
  0 12 * * * curl -fsS -X POST \
    "https://vector.fdiaznem.com.ar/api/cron/document-alerts?secret=$DOCUMENTS_ALERT_SECRET"
  ```
  Devuelve `{pending, sent, skipped, failed}`. `skipped` son pilotos sin WhatsApp
  cargado; esos quedan **sin marcar** para que el aviso salga si después lo
  cargan.

### 3. Correr la auditoría una primera vez por usuario

El recálculo se dispara solo al crear/editar/borrar un vuelo, así que un libro
que no se toca no tiene hallazgos hasta entonces. El botón **Reanalizar** de
`/dashboard/audit` lo fuerza. Contra los vuelos actuales de Federico da limpio
(verificado por SQL), así que la página va a decir "sin observaciones" — es
correcto, no es que esté rota.

### 4. Deuda menor que quedó identificada

- **`WhatsAppController._verify_secret` cae a una constante hardcodeada**
  (`"shared-vector-secret-2026"`) porque `whatsapp_webhook_secret` **no está
  declarado** en `src/config.py` y `extra="ignore"` descarta la variable de
  entorno. O sea que hoy el secreto real del `.env` no se usa. No lo cambié
  porque el frontend manda su propio valor y arreglarlo de un lado sin el otro
  corta el bot. Hay que cambiar los dos a la vez.
- **Avisos del linter de Supabase que quedan** (ninguno crítico): protección de
  contraseñas filtradas desactivada, `handle_new_user()` y
  `handle_deleted_user()` ejecutables por `anon` vía RPC, y `search_path`
  mutable en `handle_deleted_user`.
- **`Libro Digital.pdf` y `extract_pdf.js` están commiteados** en la raíz y nada
  del código los importa (son restos de la prueba de parseo de PDF). No los borré
  porque borrar archivos es decisión de Federico, pero se pueden sacar.

### Sobre el backlog nuevo, contrastado con el código

El research de `04` y `05` se hizo probando la UI desplegada, sin leer el
código. Tres precisiones que cambian el alcance de esos ítems:

- **`04` §5 dice que no se pudo ver cómo renderiza un hallazgo porque el libro
  de Federico da limpio.** Sí se vio: se verificó con datos ficticios en un
  harness de Playwright. La fila ya existe con pill de severidad, nombre de
  regla, mensaje y acción de silenciar (`AuditClient.tsx` → `FindingCard`). Lo
  que **falta de verdad** frente a FlightDeck es más chico de lo que sugiere el
  documento: agrupar por regla con conteo de vuelos afectados, y el control de
  "Expandir todo". Los íconos de severidad en los tres cards de conteo sí
  faltan, eso es correcto.
- **`04` §6 supone que "Agregar documento" abre un selector desde cero.**
  Confirmado leyendo `DocumentsManager.tsx`: el `StyledSelect` de tipo arranca
  en "otro". Los chips de alta rápida aplican tal cual, y la taxonomía ya está
  definida en el `CHECK` de la tabla `documents` — no hay que inventarla.
- **`05` §2 concluye que las Herramientas de Vector están mejor resueltas que
  las de FlightDeck** (una página con tab-bar contra siete páginas separadas).
  Coincide con la decisión que está documentada en la entrada de la Fase 5.
  **No lo "arregles" copiando el patrón de FlightDeck.**

**Estado del backlog de `05` al 2026-08-01:** los ítems **8** (matriz ANAC), **9**
(gráfico radial de hora del día) y **10** (insights auto-generados) están hechos,
dentro de la página `/dashboard/summary`. Del ítem **7** (mapa "dónde volé") se
hizo la mitad informativa —el ranking de aeródromos con barras— pero **no el mapa
geográfico**: eso requiere Leaflet o similar. Las coordenadas ya están en
`airports.tsv`, así que es trabajo de frontend solamente.

Del backlog de `04` sigue pendiente el ítem **6** (ficha de aeródromo), y el **2**
(paleta) se resolvió parcialmente en el pase de tipografía y monocromo — lo que
queda es la decisión de marca sobre la tipografía sans (ver esa entrada).

### Antes de tocar nada

- **Leé las entradas de la bitácora de arriba.** Varias decisiones (el bucket
  "resto", por qué la sección 03 no comparte pool, por qué los aeródromos no
  están en Supabase, por qué un duplicado no reporta además superposición) no se
  deducen del código y revertirlas por accidente es fácil.
- **Fecha u hora localizada: se formatea en el server, o no se formatea.** Ya
  costó dos bugs de hidratación (ver la entrada correspondiente). `toLocaleString`
  con hora difiere entre Node y Chrome, y `new Date()` en un client component
  hace que server y navegador discrepen de día.
- Correr `npx tsc --noEmit` y `npm run build` antes de dar algo por terminado, y
  `python test_audit_engine.py` en el backend si tocás las reglas.
- Verificar en el navegador, claro **y** oscuro, desktop **y** móvil. Todo el
  repo está hecho con las dos variantes y es donde más se rompen las cosas.

### Notas de infraestructura

- El backend es Python + Litestar + Supabase. Router con prefijo `/api`,
  `auth_guard`, `request.state.user.id`, RLS con clientes Supabase por usuario.
  Los controladores que corren sobre todos los usuarios (`/whatsapp`,
  `/document-alerts`) no llevan `auth_guard` y validan un secreto compartido —
  van en controladores aparte porque los guards de Litestar se **acumulan** por
  capa y un handler no puede optar por salirse.
- **`.env` ya no está trackeado** (`git rm --cached`, más `.gitignore`). Sus dos
  valores eran las URLs públicas de la API y coinciden exactamente con los
  fallbacks que ya tenía el código, así que sacarlo no cambia comportamiento.
  Nunca hubo secretos ahí. La plantilla de variables está en `.env.example`.
- El MCP de Supabase **sí** estuvo autenticado en esta sesión (entradas
  anteriores decían lo contrario): las tres migraciones se aplicaron desde acá.
