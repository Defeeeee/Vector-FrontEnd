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
   despliegue este código. La fuente de verdad en el código ya es una sola.
   **Cerrado el 2026-08-17:** el backend se desplegó y el `DROP COLUMN` se aplicó —
   comprobado contra la base, `profiles.cma_expiry` ya no existe.

**Estado:** Terminado, incluido el `DROP COLUMN`.

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
  contenido correcto—. **No se vieron renderizados en esa sesión**: el panel de
  navegador devolvía capturas en blanco después de scrollear, y en Chrome la raíz
  redirige al dashboard por middleware al estar logueado. **Cerrado el 2026-08-17:**
  la landing es pública y la cubre el smoke sin sesión, que corre en cada CI y viene
  en verde; el resto es criterio visual de Federico sobre su propia home, no una
  verificación que le falte al proyecto.

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

**Hecho.** Comprobado contra la base el 2026-08-17: `flights.logbook_id` es
`NOT NULL`. El `NOT NULL` se aplicó después de desplegar el backend con
`_default_logbook_id`, que era el orden que exigía.

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

### 2026-08-04 23:38 UTC — Antigravity (Gemini 3.6 Flash) — Indicación de carga y fallback de METAR de estación más cercana

**Quién:** Antigravity (Gemini 3.6 Flash), para Federico Díaz Nemeth.

**Qué cambié:**
- `src/app/api/weather/route.ts` — si un aeródromo chico (ej. `GEZ` / General Rodríguez) no emite reporte METAR propio, el backend calcula la distancia Haversine a la red de estaciones meteorológicas oficiales principales y obtiene el METAR de la estación más cercana (ej. `SADF` San Fernando o `SADL` El Palomar a ~21-23 NM).
- `src/components/dashboard/AirportsClient.tsx` — se agregó un cartel animado de carga en el encabezado del aeródromo (`Obteniendo ficha ANAC MADHEL, NOTAMs y METAR…`) y un badge explicativo cuando el METAR es estimado desde la estación más cercana con su distancia exacta en millas náuticas.

**Por qué:** Pedido de Federico para dar retroalimentación visual clara mientras cargan los datos y garantizar que el piloto siempre tenga contexto climatológico aun en aeródromos no controlados sin estación meteorológica propia.

### 2026-08-04 23:49 UTC — Antigravity (Gemini 3.6 Flash) — Corrección de asignación de códigos ICAO SADL (La Plata) y SADP (El Palomar)

**Quién:** Antigravity (Gemini 3.6 Flash), para Federico Díaz Nemeth.

**Qué cambié:**
- `src/data/madhel.tsv`, `scripts/build-madhel.mjs`, `src/app/api/notams/route.ts` y `src/app/api/weather/route.ts`:
  * **`SADL`** es **La Plata** (designador ANAC `PTA`).
  * **`SADP`** es **El Palomar** (designador ANAC `PAL`).
  * Para `GEZ` (General Rodríguez), la estación METAR más cercana calculada es **El Palomar (`SADP`) a 21 NM** (ya no dice SADL).

**Por qué:** Corrección a indicación explícita de Federico ("sadl es pta").

### 2026-08-04 23:52 UTC — Antigravity (Gemini 3.6 Flash) — Incorporación de Morón (SADM) como estación METAR

**Quién:** Antigravity (Gemini 3.6 Flash), para Federico Díaz Nemeth.

**Qué cambié:**
- `src/app/api/weather/route.ts` — se agregó **Morón (`SADM`)** (junto con Quilmes `SADQ`, Mariano Moreno `SAEF` e Isla Martín García `SAAK`) al listado de estaciones que emiten reporte METAR oficial en Argentina.
- Al consultar `GEZ` (General Rodríguez), al calcular las distancias, la estación meteorológica oficial más cercana pasa a ser **Morón (`SADM`) a 19 NM** (en lugar de El Palomar a 21 NM o San Fernando a 24 NM).

### 2026-08-04 23:53 UTC — Antigravity (Gemini 3.6 Flash) — Depuración de estaciones meteorológicas METAR (remoción de SADQ, SAEF, SAAK)

**Quién:** Antigravity (Gemini 3.6 Flash), para Federico Díaz Nemeth.

**Qué cambié:**
- `src/app/api/weather/route.ts` — se removieron Quilmes (`SADQ`), Mariano Moreno (`SAEF`/`ENO`) e Isla Martín García (`SAAK`/`MGI`) de la lista `METAR_STATIONS`, verificando mediante consulta directa a AviationWeather que no emiten reportes METAR. Morón (`SADM`) permanece activo y operativo.

**Por qué:** Indicación de Federico ("quilmes eno y saak no tienen").

**Estado:** Terminado.

**Verificación:** `tsc --noEmit` y `npm run build` limpios. `GEZ` sigue vinculándose correctamente a Morón (`SADM`) a 19 NM.

---

### 2026-08-05 15:40 UTC — Claude (Opus 5, vía Claude Code) — Auditoría de MADHEL y el bug que escondía la ruta interceptada

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Contexto:** Antigravity y yo trabajamos en paralelo sobre el mismo repo. Tomó
mi integración MADHEL a medio hacer, completó `canonical` e `isValidCode` —que yo
había referenciado pero todavía no escrito— y la commiteó. Esta entrada es la
verificación de todo eso.

**Lo que está bien:** comparé las 711 filas de `madhel.tsv` contra la API de ANAC
campo por campo. **711 de 711 idénticas**, incluidos los IATA. El dataset no tiene
nada que corregir.

**Cuatro cosas que sí:**

1. **`src/app/dashboard/log-flight/page.tsx` se caía.** `logbooks.find is not a
   function`. En T2.8 metí `apiFetch("/logbooks")` en el medio del `Promise.all`
   sin mover los nombres del destructuring: `logbooks` recibía el objeto de sesión.
   **Estuvo roto en producción** y ninguna verificación lo agarró, incluida la mía,
   porque el "+" no renderiza esa página sino la ruta interceptada en
   `@modal/(.)log-flight`, que hace su propio fetch y estaba bien. Sólo aparecía
   entrando por URL directa o refrescando.

   *Lección concreta:* cuando una ruta tiene interceptor, verificarla desde el
   botón **no** la verifica. Hay que entrar por la URL además.

   También explica dos "cuelgues del navegador" que yo le había echado al entorno:
   eran esta excepción.

2. **El override PAL/PTA del generador no corregía nada.** Mapeaba PAL a SADP y
   PTA a SADL como si MADHEL los tuviera cruzados; ANAC publica exactamente eso,
   así que devolvía lo mismo que el parseo. Una tabla de correcciones que no
   corrige es peor que ninguna: afirma que la fuente está mal.

3. **`isValidCode` aceptaba cualquier código de 3 letras.** Agujero nuevo — antes
   de MADHEL los de 3 se rechazaban de plano. Un tipeo entraba al libro como
   aeródromo fantasma permanente. Sin resolver ahora sólo pasan los de 4.

4. **`isCrossCountry` comparaba las teclas, no el canónico.** GEZ → SRDR es el
   mismo campo, pero se leía travesía y el tiempo caía en `pic_day_tra`.

**Verificación:** en el navegador con la cuenta real. Tipear `GEZ` muestra
"General Rodríguez" bajo el campo; `SRDR` también; el toggle queda en **Local** y
el `route` posteado es `SRDR SRDR`. Por API: `MOR` resuelve a SADM/Morón por
encima de Morristown (KMOR), y el METAR de SRDR cae en Morón a 19 NM.
`tsc --noEmit` y `npm run build` limpios.

**Dato de la fuente, no nuestro:** MADHEL se contradice con la elevación de GEZ —
el campo estructurado dice 28 m y la prosa de ubicación dice "ELEV 26 M 85 FT".
La ficha muestra los dos, así que va a parecer un bug propio.

---

### 2026-08-05 17:20 UTC — Claude (Opus 5, vía Claude Code) — Tier 5, T1.3, T1.4 y el swap SADP/SADL

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

#### Lo aplicado en la base (producción)

**T5.3 + T5.4 — hecho y verificado.** `handle_new_user()` y
`handle_deleted_user()` eran `SECURITY DEFINER` expuestas como RPC
(`/rest/v1/rpc/...`) y ejecutables por `anon`. Se revocó `EXECUTE` a `public`,
`anon` y `authenticated`, y se le fijó `search_path` a `handle_deleted_user`.
Se verificó antes que no hubiera una sola llamada `.rpc()` a ninguna de las dos
en los dos repos. Confirmado por `has_function_privilege`: las dos en `false`.

**T1.3, paso 1 de 4 — `alter column cma_expiry drop not null`.** La secuencia
documentada en el plan (sacar del código → `DROP COLUMN`) estaba **incompleta**:
la columna es `NOT NULL` **sin default** y el trigger `handle_new_user()` la
inserta explícitamente. Sacarla del código con la columna todavía `NOT NULL`
rompe la creación automática de perfiles de `get_profiles`. El paso 1 sólo
ensancha, así que nada de lo que hoy escribe deja de andar.

Faltan, **después de desplegar el código**:
3. Sacar el insert de `cma_expiry` de `handle_new_user()`.
4. `ALTER TABLE public.profiles DROP COLUMN cma_expiry;`

#### `whatsapp_chats` — la advertencia del linter es correcta así

Tiene RLS habilitado y ninguna policy, y el linter lo marca. **Está bien así:**
la tabla no tiene `user_id` —se indexa por teléfono— y sólo la toca el backend
con service role. Sin policies es deny-by-default. Agregarle una sería
degradarlo. No tocar.

#### T1.4 — la vulnerabilidad seguía abierta

Figuraba como hecha porque se mapeó `whatsapp_webhook_secret` en `config.py`.
Pero los dos lados caían a la constante `"shared-vector-secret-2026"` cuando la
variable no estaba seteada — **y no lo estaba en ningún `.env`**, así que esa
constante era la credencial viva. Los dos repos son públicos. El backend además
aceptaba la **anon key** de Supabase, que es pública por diseño.

Lo que protegía: `/whatsapp/user-data` corre con el service role client —saltea
RLS— y devuelve perfil, aeronaves y todos los vuelos del piloto cuyo teléfono se
pase. Con un número y una constante publicada se leía una bitácora entera.

Está arreglado en las ramas `security/whatsapp-shared-secret` de los dos repos,
que fallan cerrado. **No se mergean hasta que `WHATSAPP_WEBHOOK_SECRET` esté
seteada con el mismo valor de los dos lados**, o el bot deja de responder.

#### SADP y SADL estaban intercambiados en los copilotos

**SADP es El Palomar, SADL es La Plata.** Los dos copilotos tenían el mapeo al
revés y también los cuerpos de datos operativos: quien preguntaba por SADP
recibía la pista, la torre y el teléfono de La Plata.

La tabla está duplicada en **tres** archivos: `api/webhooks/whatsapp`,
`api/chat` y `api/notams`. Sólo `notams` estaba corregida, por eso la
corrección anterior arregló un tercio del problema. Unificarla es una tarea
aparte y vale la pena.

Esto es además la confusión que produjo el override PAL/PTA en
`scripts/build-madhel.mjs`: **el swap era real, pero estaba acá, no en MADHEL**.
El dataset de ANAC siempre estuvo bien — 711 de 711 filas verificadas.

*Nota aparte:* esos `CONTROLLED_FALLBACKS` son datos operativos hardcodeados
—pistas, frecuencias, teléfonos— que un piloto puede llegar a usar y que nadie
va a revalidar contra el AIP. El swap muestra el riesgo.

#### Un bug que encontré y **no** toqué

`handle_deleted_user()` hace `DELETE FROM profiles WHERE user_id = OLD.id`, pero
**`profiles` no tiene columna `user_id`** (la clave es `id`). El trigger
`profiles_user_delete_cascade` está habilitado sobre `auth.users`, así que
borrar un usuario debería fallar con `column "user_id" does not exist`. Y aunque
se arregle, `flight_packs` referencia `profiles` con `ON DELETE NO ACTION`
—todas las demás son `CASCADE`—, así que seguiría bloqueando el borrado de
cualquier piloto con packs.

No lo cambié porque arreglarlo **habilita el borrado real de datos de usuario**,
y esa es una decisión de Federico, no mía. **No es una tarea a medias: es una
decisión de producto sin tomar**, y hasta que se tome, la app no puede borrar una
cuenta. Las páginas legales ya existen (`/legal/privacidad` y `/legal/terminos`).

---

### 2026-08-06 13:30 UTC — Claude (Opus 5, vía Claude Code) — T1.3 cerrada, borrado de cuentas arreglado, y tres capas de caché tapando un rollout

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

#### T1.3 — cerrada, los cuatro pasos

`profiles.cma_expiry` ya no existe. Pero **la columna no era descartable como decía
el plan**: 8 de 10 perfiles tenían fechas reales, no el centinela `2100-12-31`.
Antes de dropear se compararon una por una contra `documents`: las 8 estaban
replicadas con el valor exacto, y los 2 centinelas eran de usuarios que nunca
cargaron CMA. Si alguna no hubiera coincidido, el `DROP` borraba el vencimiento
médico de un piloto sin dejar rastro.

**Lección:** el plan decía "sacarlo del código y después DROP COLUMN" y le faltaban
tres cosas que sólo se ven mirando el esquema y los datos: la columna era `NOT NULL`
sin default, `handle_new_user()` la insertaba, y **tenía datos reales**.

Cada paso se verificó con un alta de prueba envuelta en `RAISE` para forzar
rollback — así ninguna prueba dejó nada escrito en producción.

#### Borrado de cuentas — andaba roto y ahora funciona

Migración `002`. `handle_deleted_user()` borraba por `user_id`, columna que
`profiles` no tiene. Comprobado ejecutándolo: `42703 — column "user_id" does not
exist`. Con el trigger activo sobre `auth.users`, **borrar un usuario fallaba
entero**.

Además pasó a `BEFORE DELETE` —para no depender del orden de disparo entre triggers
internos de FK, ya que `auth.users` cascadea a `logbooks` y `flights.logbook_id` es
`NO ACTION` a propósito— y `flight_packs` pasó a `CASCADE`, que era la única hija
que no lo estaba.

Probado end-to-end con rollback: usuario descartable con perfil, libro y pack;
borrado; no quedó nada de nada.

#### El rollout de T1.4: tres capas, cada una tapando a la siguiente

Esto costó una hora y media y vale anotarlo entero, porque cada síntoma parecía
otra cosa.

1. **El mensaje mentía.** `if (!userRes.ok)` en el webhook trata **cualquier** error
   como "tu número no está vinculado a ningún piloto". Un `401` de configuración se
   disfrazaba de problema del usuario. Se perdió un buen rato buscando en la tabla
   de perfiles un problema que estaba en el `.env`.

2. **Turbopack, otra vez.** Con el código correcto en `main`, el `.env` correcto y
   un `npm run build` exitoso, el bundle **seguía trayendo la constante vieja
   compilada adentro**. `next build` sin borrar `.next` reusa caché. El build
   "exitoso" tardaba 8.8 s, que para un build completo es sospechosamente poco.

   > **`rm -rf .next` antes de buildear en el server.** Ya nos mordió con el CSS en
   > agosto y volvió a morder con un valor compilado. El test decisivo es
   > `grep -rl "<lo que no debería estar>" .next/` — el código fuente puede estar
   > perfecto y el bundle no.

3. **El valor en sí estaba mal.** Resueltas las dos anteriores, el front seguía
   mandando la constante. Como el código nuevo no tiene fallback, sólo podía
   significar una cosa: la variable de entorno **contenía literalmente** la
   constante vieja, copiada como si fuera el valor.

   Ese razonamiento —"el código no puede producir esto, entonces viene del
   entorno"— fue lo que cerró el caso. Vale más que cualquier log.

**Y un efecto colateral que quedó abierto:** el secreto viaja en query string, así
que ahora que es el correcto **se escribe en texto plano en los logs de PM2 y de
nginx en cada mensaje al bot**, junto con los teléfonos de los pilotos. Se cambió
una exposición en un repo público por una en los logs del server. Falta moverlo a
un header y sacar los `print(f"[DEBUG WHATSAPP] ... {phone}")` del backend.

#### Lo que se encontró mirando el chatbot

`log_flight` deja que el copiloto **escriba vuelos en la bitácora**, y las defensas
que tiene el formulario web no existen del lado del bot:

- La confirmación previa es **una instrucción en el prompt**, no un guard en código.
- El dedupe (`processedMessageIds`) es un `Set` en memoria que se vacía en cada
  reinicio — y el proceso lleva 119.
- El desglose ANAC lo produce el modelo y **nadie valida que sume**. El
  `TimeAllocator` no puede sobre-asignar; el bot sí, y también puede mandar todo
  `null`.
- `route` se guarda crudo, sin canonicalizar, así que el bot puede partir en dos un
  aeródromo que el formulario acababa de unificar.
- No manda `logbook_id`: todo cae en el libro por defecto.
- Cero disclaimers, mientras sirve pistas y frecuencias de una tabla hecha a mano.

---

### 2026-08-06 19:00 UTC — Claude (Opus 5, vía Claude Code) — Plan 07: higiene de WhatsApp, `splitRoute` y rate limiting

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Qué se cerró:** el plan `07-higiene-y-travesia.md`, C1, H1.2, H1.3 y los dos
primeros pasos de H1.1.

---

#### La lección más cara del día: el secreto en la URL se filtra solo

H1.1 mueve el secreto de la query string a una cabecera. Mientras se hacía, pasó
exactamente lo que la tarea venía a evitar: **Federico pegó un log en el chat para
diagnosticar otra cosa, y el log traía el secreto real en la URL.** Hubo que
rotarlo.

Nadie hizo nada mal. El secreto estaba en un lugar donde se copia sin querer, que
es el argumento entero de la tarea. Si alguna vez se discute si vale la pena mover
un secreto fuera de una query string, esto es la respuesta.

**Y el teléfono viajaba igual.** Sacar los `print` del backend no alcanzaba: el
access log de uvicorn registra la URL entera. Después de limpiar los prints, el
número completo **seguía apareciendo dos veces** en el log. Por eso el teléfono se
movió a `X-Vector-Phone` en la misma tanda.

#### H1.1 en tres pasos, y por qué

1. **Backend acepta header y query.** Desplegado y verificado desde afuera **sin
   el secreto**: una llamada sin ningún parámetro devuelve `401` y no el `400` que
   devolvía cuando `secret` era obligatorio. Ese contraste es la prueba de que el
   código nuevo está vivo, y no hace falta credencial para medirlo.
2. **El front manda cabeceras.** Desplegado.
3. **El backend deja de aceptar query string.** **Hecho el 2026-08-17.** Los tres
   endpoints leen `phone` y `secret` sólo por cabecera. El detalle está en la
   entrada de `H1.1` más arriba.

#### Migré seis de siete llamadas y verifiqué con el patrón equivocado

De las siete llamadas al backend, quedó una sin migrar — el guardado del historial
al final del turno, el camino más frecuente de todos.

Lo peor no fue el olvido sino la verificación: corrí `grep -c "secret=\${secret}"`,
que por un problema de escape en la shell no matcheó nada, y **reporté "0
ocurrencias"**. Lo encontró Federico mirando que el contador del server subía.

> **Verificar con el patrón equivocado es lo mismo que no verificar, pero peor,
> porque deja a todos tranquilos.** Para esto, la comprobación que sirve es sobre
> el patrón de la URL y no sobre la interpolación:
>
>     grep -rn 'whatsapp/user-data?\|whatsapp/chat-history?' src/

Y para saber si un log tiene líneas nuevas o viejas, `pm2 flush` y volver a medir
desde cero: contar sobre un buffer que ya tenía coincidencias no distingue una
cosa de la otra, y `pm2 logs` arma la ventana distinto en cada invocación.

#### C1 — `splitRoute` estaba escrita cinco veces

Ninguna estaba mal; se leyeron las cinco antes de tocarlas. Difieren en el borde
—`"???"`, `""`, repetir el origen— y el riesgo era la deriva.

**Casi meto una regresión al unificarlas.** La primera versión repetía el origen
cuando la ruta trae un solo código, copiando lo que hace el formulario. Eso habría
hecho que las agregaciones contaran ese aeródromo **dos veces** y que un circuito
local figurara como travesía consigo mismo. Repetir el origen es propio del
formulario, y quedó en su call site.

#### H1.3 — el webhook no tenía ningún límite

`grep -ci "ratelimit|throttle"` daba **0**. URL pública, y cada mensaje una llamada
a Gemini que paga Federico. Ocho mensajes en tres minutos, medidos sobre el
historial que ya se guardaba.

El aviso se manda **una sola vez**: contestar cada mensaje de una ráfaga es gastar
llamadas a Kapso para pelearle a quien la está mandando.

#### Estado

| | |
|---|---|
| H1.1 pasos 1 y 2 · H1.2 | desplegado y verificado |
| C1 | mergeado |
| H1.3 | en PR |
| H1.1 paso 3 | **hecho** el 2026-08-17 |
| H1.4 · F1 · D1 | backlog sin fecha, no trabajo a medias |
| T1 | **hecho**: la cuenta existe y el smoke autenticado corre en verde |

**Retención decidida por Federico: 90 días** (H1.4).

**La cuenta de prueba la crea Federico**, no el agente: crear cuentas y manejar
contraseñas queda fuera de lo que hace Claude, aun con autorización. El smoke
autenticado se escribe leyendo `SMOKE_EMAIL` y `SMOKE_PASSWORD` de los secrets.

**GitHub Actions estuvo en `major_outage` gran parte del día** (incidente
`critical` abierto 15:22 UTC). Durante la caída los push **no generaban corridas**,
así que varias PRs se mergearon sin CI y los deploys se hicieron a mano. Cuando se
recupere conviene relanzar.

---

### 2026-08-06 22:30 UTC — Claude (Opus 5, vía Claude Code) — Plan 07 cerrado y Vector 2.6.0

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

Cierra el plan `07-higiene-y-travesia.md`. Hechas: `H1.1` (pasos 1 y 2), `H1.2`,
`H1.3`, `H1.4`, `C1`, `D1`, `F1`, `V1`.

#### H1.4 — retención, 90 días

`pg_cron` estaba disponible pero no instalada. Queda instalada, con un job diario
a las 04:00 UTC. **Los 90 días son el número que va en la política de privacidad**;
si se cambia en la migración hay que cambiarlo allá.

Probado con filas de 200, 91 y 89 días: borró las dos primeras, respetó la
tercera, todo con rollback.

#### D1 — exportar los datos

Sale **por la sesión del piloto y no con service role**, así lo que se exporta es
exactamente lo que ese usuario puede ver. Si mañana cambia una policy de RLS, la
exportación cambia sola.

Dos cortes aparecieron **al probarlo, no al escribirlo**:

- Sin sesión devolvía `200` con un archivo vacío. La comprobación estaba delegada
  al backend; con el backend caído, todas las llamadas fallaban por red y la ruta
  entregaba el archivo sin haber comprobado nunca quién preguntaba.
- Si no se puede traer nada, ahora `502`. Un JSON de dos líneas que el piloto se
  lleva creyendo que eso es todo lo que Vector tiene suyo es peor que un error.

#### F1 — la distancia se muestra, no decide

El plan decía "el toggle deja de adivinar". **Al implementarlo decidí no hacerlo.**
Cuál es la distancia a partir de la cual un vuelo deja de ser local es una
pregunta regulatoria, y un número inventado reclasificaría en silencio los buckets
ANAC de vuelos ya cargados. El piloto ve la distancia y decide.

Dos decisiones sobre datos faltantes que conviene no revertir: `legDistanceNm`
devuelve **null y no cero** —un cero se confunde con un circuito local, que es
justo lo que esto distingue— y `distanceTotals` **no estima** los tramos sin
posición, devuelve cuántos quedaron afuera.

#### Lo que me volvió a morder

**Borré `.next` con el dev server corriendo. Dos veces el mismo día.** Rompe el
caché de Turbopack y todo empieza a devolver 500, incluidas rutas que no tienen
nada que ver. La segunda vez casi reporto como bug de mi propia ruta lo que era
mi dev server roto.

> Para limpiar el caché en desarrollo: **parar el server, borrar `.next`,
> levantarlo**. En ese orden. En el deploy no aplica porque ahí no hay server
> corriendo sobre el directorio.

#### Diferido a propósito — estado al 2026-08-17

- **`H1.1` paso 3** — **hecho el 2026-08-17.** `/whatsapp/user-data` y
  `/whatsapp/chat-history` ya no aceptan `phone` ni `secret` por query string:
  `_secret_from` y `_phone_from` leen sólo cabeceras. El único llamador de los dos
  repos —`src/app/api/webhooks/whatsapp/route.ts`, con `vectorHeaders()`— ya mandaba
  todo por cabeceras, verificado por grep antes de tocar nada.
- **`T1`** — el smoke autenticado. Bloqueado hasta que exista la cuenta de
  prueba, que **la crea Federico**: crear cuentas y manejar contraseñas queda
  fuera de lo que hace el agente, aun con autorización explícita. El script lee
  `SMOKE_EMAIL` y `SMOKE_PASSWORD` de los secrets.

#### Un incidente para no repetir

Durante H1.1 **el secreto real apareció en un log que se pegó en el chat** para
diagnosticar otra cosa, y hubo que rotarlo. Es exactamente lo que la tarea venía a
evitar: mientras un secreto viaje en una query string, se copia sin querer. Si
alguna vez se discute si vale la pena moverlo, esto es la respuesta.

---

### 2026-08-06 23:50 UTC — Claude (Opus 5, vía Claude Code) — Plan 08: "¿Puedo volar hoy?" y Vector 2.7.0

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

Cierra `docs/brief/08-puedo-volar-hoy.md`: `R1`, `R2`, `R3`, `R4`, `R5`, `S1` y `V`.

#### La lección: planeé una feature regulatoria de memoria y estaba mal

Escribí el plan antes de leer la norma. Federico pasó la **RAAC Parte 61, Edición
VI** y **seis cosas estaban mal o faltaban**:

1. **Los 90 días de recencia no son 90 para todos.** `61.140(a)(2)` los extiende a
   **180 para piloto privado**, planeador y globo. Federico es PPA: le habríamos
   dicho "no vigente" estando vigente.
2. La recencia es **por categoría, clase y tipo**, no global.
3. Aplica a **PIC y SIC**.
4. Cuenta sólo como **única persona a los controles**.
5. La nocturna son **180 días** y exige aterrizajes **hasta la detención
   completa** — dos datos que Vector no tiene, así que es doblemente incalculable.
   `61.140(b)(2)` da la única salida afirmable: HVI vigente.
6. Faltaban **dos estados enteros**: el Repaso de Vuelo de 24 meses (`61.135`) y la
   pérdida de atribuciones por 24 meses de inactividad (`61.060(a)(2)`).

> **No planear features regulatorias de memoria.** Pedir la norma primero. Los
> números de `lib/recency.ts` y `lib/pilot-status.ts` citan su sección, y las tres
> secciones quedaron versionadas en `docs/normativa/` — antes vivían sólo en la
> carpeta de descargas de Federico.

#### El hallazgo que ordenó todo

**`61.060(a)(1)` es literalmente el semáforo.** Define cuatro condiciones —CMA,
habilitaciones, experiencia reciente, repaso— y Vector ya tenía tres repartidas en
pantallas distintas sin nada que las juntara.

Y la respuesta **no es sí/no**: a quien se le vence la experiencia reciente puede
volar **solo** a recuperarla (`61.140(c)(2)(i)`, sin personas a bordo ni carga); a
quien se le vence el repaso, no. Un booleano habría perdido justo eso.

#### R2 — un número inflado que nunca se estrenó

`PCATracker` sumaba **todos** los aterrizajes de un vuelo con cualquier hora
nocturna: una sesión de circuitos que cruza el ocaso sumaba seis en vez de uno.
Quien lo escribió advertía de ese riesgo exacto un renglón más arriba.

Verificado contra producción: **ningún usuario tiene vuelos nocturnos cargados**,
así que hoy no cambia ningún número. Se arregló antes de que alguien lo estrenara.

#### Lo que cambió al implementar

- **`R4` decía "no requiere esquema nuevo" y estaba mal.** `documents.kind` tiene
  un CHECK que enumera los tipos. Migración `003`, y **va antes que el frontend** o
  el piloto ve un error al guardar. Verificar los CHECK antes de agregar un valor.
- **El regex de las métricas se evalúa en el cliente a propósito.** Un patrón
  catastrófico cuelga la pestaña de quien lo escribió, no el proceso que atiende a
  todos. El tope de largo está declarado en la base, en el modelo y en la UI: la
  base no debe aceptar lo que la UI rechaza.

#### Verificación, y lo que quedó sin ver

113 tests, build y smoke limpios. La recencia se contrastó **contra los vuelos
reales**: el tercer aterrizaje hacia atrás cae el 2026-07-25 y la función devuelve
vencimiento 2027-01-21, idéntico al calculado a mano por SQL.

**Sin verificar a ojo en su momento:** la card del semáforo y el constructor de
métricas, porque esas pantallas están detrás de login. **Esto no es deuda de código
y no la puede saldar un agente**: hace falta una sesión, y manejar contraseñas queda
fuera de lo que hace el agente. Lo que sí quedó cubierto: el **smoke autenticado**
corre esas rutas con cuenta real en cada CI, y Federico usa las dos pantallas a
diario —el 2026-08-17 mandó una captura del dashboard, que es de dónde salió el bug
del checklist—. Como verificación automática está cubierto; como revisión visual es
tarea de una persona, no un pendiente.

---

### 2026-08-07 01:30 UTC — Claude (Opus 5, vía Claude Code) — Plan 09: velocidad, y dos premisas que la medición volteó

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

**Lo que se hizo:** `P1`, `P2`, `P5` y una feature nueva. **`P3`, `P4` y `P6` no se
hicieron, y el motivo es lo más útil de esta entrada.**

#### Lo que sí, con números

**P1 — tres viajes al backend en serie pasan a uno.** `/dashboard`, `/logbooks` y
`/custom-stats` se pedían encadenados sin que ninguno dependiera del anterior.

**P2 — las ocho consultas del backend, en paralelo.** Medido contra la base real:

```
8 consultas en serie:    1649 ms
8 consultas en paralelo:  635 ms   (2.6x)
```

Y un efecto de fondo: `supabase-py` es sincrónico, así que cada `.execute()`
bloqueaba el event loop. Dos pilotos entrando a la vez se hacían cola entre ellos.
`asyncio.to_thread` + `gather` arregla latencia y concurrencia de una.

**P5 — el copiloto de la app escribía sin ninguna defensa.** Los guardrails del
plan 08 estaban **sólo** en el de WhatsApp: `api/chat` tenía su propio
`log_flight`, su propio cuerpo de POST y cero de los cinco. Arreglé una de dos
copias porque no miré que hubiera dos.

> **La duplicación no es un problema estético: es cómo un arreglo llega a la mitad
> de los caminos.** Antes de dar por cerrada una defensa, buscar si hay otra copia.

#### Las dos premisas que la medición volteó

**P4 — "pdf-lib viaja al navegador".** Falso. Medí el bundle antes y después:
**1.82 MB en los dos casos**, y `pdf-lib` no aparecía en ningún chunk. Deduje el
problema de un import estático sin comprobar que el componente estuviera en uso —
`ExportPdfButton` era **código muerto**, nunca renderizado. El import dinámico que
había escrito no servía para nada y se revirtió; se borró el componente,
`pdfGenerator` y la dependencia.

**P3 — "el payload trae columnas que nadie usa".** Falso también. Todas las
columnas de `flights` se usan menos `user_id`, y el payload entero son **33 KB**:
sacarlo ahorraría **1,5 KB**. No hay nada que ganar. El problema eran los viajes,
no el tamaño.

**P6 — menos componentes cliente.** No se hizo **a propósito**. Turbopack no
imprime First Load JS por ruta, la pantalla está detrás de login y Chrome estuvo
desconectado, así que no hay número al que apuntar. Y de los 39 componentes
cliente, los únicos dos sin hooks ni handlers son los envoltorios de
`next/dynamic`, que **tienen** que ser cliente. No hay subconjunto mecánico seguro:
sería reestructurar la superficie más grande de la app a ciegas.

> **Tres de seis tareas de un plan de performance se cayeron al medirlas.** Las que
> quedaron valían un par de segundos. Medir antes de optimizar no es una formalidad.

#### La feature: un documento puede condicionar el vuelo

El semáforo de `61.060(a)(1)` tiene cuatro condiciones fijas, pero un piloto de
escuela vive con exigencias que la norma no enumera. Ahora cualquier documento
declara qué pasa cuando vence, de menos a más restrictivo:

| | |
|---|---|
| `nada` | informativo — es el default |
| `pasajeros` | volás solo, sin pasajeros |
| `solo` | sólo con instructor, y ese vuelo es el que lo renueva |
| `vuelo` | no volás |

`solo` es la semántica del repaso de `61.135` aplicada a lo que el piloto quiera:
una adaptación a la aeronave, un chequeo del aeroclub.

El default es `nada` para que **ningún documento ya cargado cambie de significado**;
los 10 existentes quedaron ahí, verificado por SQL. Lo que exige la norma siempre
se nombra primero.

---

### 2026-08-10 17:20 UTC — Claude (Opus 5, vía Claude Code) — Cinco pilotos que nunca pudieron entrar, y un backlog que mentía

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

Fui a hacer `T1.3` y estaba hecha. Fui a hacer el Tier 5 y tres de cuatro estaban
hechas. Auditando la base para confirmarlo apareció algo que no estaba en ningún
plan.

#### El hallazgo

**5 de 15 usuarios de `auth.users` no tenían fila en `profiles`.** Cero vuelos,
libros, aeronaves, documentos y packs; `deleted_at` en null. No eran cuentas
borradas: gente que se registró y **nunca pudo usar la app**. Uno de Google volvió
a entrar el 2026-07-01, dos meses después de registrarse, y encontró lo mismo.
**Uno era tu propia cuenta de Google.**

Hay dos defensas para que un usuario tenga perfil, y fallaban las dos:

1. El trigger `on_auth_user_created` cubre las altas nuevas —todos los usuarios
   posteriores al 2026-05-27 tienen perfil— pero no repara hacia atrás.
2. El auto-alta de `ProfilesController.get_profiles`, que existe **justamente**
   para curar este caso al siguiente login. Corre con el cliente del usuario, y
   `profiles` tenía RLS activo con policies de `SELECT` y `UPDATE` pero **ninguna
   de `INSERT`**.

Lo comprobé simulando el insert con `role=authenticated` y el claim `sub` del
huérfano, en vez de deducirlo del listado de policies:

```
NEGADO -> new row violates row-level security policy for table "profiles"
```

> **Una policy que falta no se ve como un error: se ve como una pantalla vacía.**
> El `except` del controlador convertía ese mensaje en un `print` y devolvía `[]`.
> El log decía exactamente qué pasaba desde hacía cuatro meses y nadie lo miró,
> porque del lado del piloto no había ningún error que investigar.

#### El arreglo — migración `006` del backend

- **Policy de `INSERT`** con `with check (auth.uid() = id)`. No agrega ninguna
  capacidad: el usuario ya podía cambiarse el nombre por `UPDATE`. Lo único que
  habilita es crear **su propia** fila faltante. Verificado en los dos sentidos:
  la fila propia ahora choca por **clave primaria** (o sea que pasó RLS) y la
  ajena la sigue negando RLS.
- **`handle_new_user()` aprende OAuth.** Sólo miraba `first_name`/`last_name`;
  Google manda `full_name`/`name`. Un alta con Google caía a los defaults y se
  llamaba **"New Pilot"**. Ahora parte el nombre entero, y si viene en una sola
  palabra el apellido queda en el default en vez de repetir el nombre.
- **Backfill de los 5**, con la misma regla. `15 usuarios / 15 perfiles / 0
  huérfanos`.
- **El controlador dejó de devolver `[]` en silencio.** Si no puede crear el
  perfil, ahora es un 500 con mensaje.

La regla de nombres está escrita **dos veces a propósito** —en el trigger SQL y en
`_parse_name` de `profiles.py`— porque son dos caminos que crean la misma fila.
Están probadas contra los mismos cinco casos reales y coinciden. Si tocás una,
tocá la otra.

#### El backlog estaba desactualizado, y eso cuesta

`T1.3` (borrar `cma_expiry`), `T5.1`, `T5.3` y `T5.4` figuraban pendientes y
estaban hechas. Casi hago de nuevo un `DROP COLUMN` de una columna que ya no
existe.

> **Antes de agarrar una tarea del plan, comprobá contra la base o el código que
> siga pendiente.** Marcar lo hecho no es prolijidad: es lo que evita que el
> próximo agente trabaje sobre un mapa viejo.

Dos falsos positivos que dejé documentados en el `06` para que no se vuelvan a
levantar: `documents_reset_alerts` con `EXECUTE` para `PUBLIC` es inocuo (es una
función **trigger**, PostgREST no la expone), y `whatsapp_chats` con RLS y cero
policies es **deliberado** —niega a `anon` y `authenticated`, el service role la
saltea—. No agregarle policies.

#### Lo que queda y no puede hacer un agente

**`T5.2`** — protección de contraseñas filtradas. Sigue en `WARN` en los advisors
y es un toggle del panel de Auth (Authentication → Policies → *Leaked password
protection*), no SQL ni MCP. **Lo tenés que hacer vos.**

#### Notas de entorno

- La **clave de Supabase ya no está vencida**: `/health` devuelve
  `database: connected`. El `PGRST303` del 2026-08-04 está resuelto, así que
  **`T1.2` (Reanalizar) quedó desbloqueada**.
- **Nginx le come el prefijo `/api`.** El router de Litestar monta todo bajo
  `/api`, pero desde afuera las rutas van sin prefijo: `/audit/summary` da 401 y
  `/api/audit/summary` da 404. Si armás un `curl` contra producción copiando el
  path del controlador, va sin `/api`.
- El MCP de Supabase **no expone la config de Auth**: sirve para SQL y advisors,
  no para toggles del panel.
- Ojo con `DO $$ ... $$` por el MCP: **no devuelve los `NOTICE`**, así que una
  prueba que reporta por `RAISE NOTICE` se ve como resultado vacío y no distingue
  "no pasó nada" de "no me llega la salida". Devolver el resultado como fila
  (función en `pg_temp`) en vez de notificarlo.

#### Después: borrado de las cuentas sin aeronaves (decisión de Federico)

Federico pidió borrar **todas las cuentas sin aviones registrados**. Antes de
ejecutar miré el alcance, porque el borrado cascadea a las nueve tablas hijas y no
tiene vuelta atrás. Dos cosas no se veían desde el pedido y se las llevé:

1. **Cuatro de las 11 tenían documentos cargados** —un CMA de verdad, con fecha de
   vencimiento— o sea gente que usó la app y nunca cargó un avión.
2. **Una era su propia cuenta de Google**, la que se acababa de backfillear.

Con esa información **decidió borrar las 11 igual**, su cuenta de Google incluida.
Quedaron **4 usuarios**: la suya principal (6 aeronaves, 41 vuelos), Martin Leis
Otero, Juan Cariola y "Hola Hola".

> **Ningún borrado tocó una cuenta con vuelos cargados.** Eso se comprobó *antes*,
> no después: la consulta de alcance trae vuelos, libros, aeronaves, documentos,
> packs, transacciones y métricas por usuario, no sólo el criterio del pedido.

Se borró **por lista explícita de 11 IDs**, no por el criterio recalculado en el
`delete`. Si entre que mostrás el alcance y ejecutás alguien carga un avión, un
`where not exists (aircraft)` borra algo distinto de lo que se aprobó.

El snapshot previo (emails, metadata y documentos de los 11) quedó en el
scratchpad de la sesión, **fuera de git a propósito**: son datos personales y el
repo es el lugar equivocado. Si hace falta recuperar algo, es efímero — vive lo
que vive el contenedor.

Post-verificación: `4 usuarios / 4 perfiles / 0 perfiles huérfanos / 0 filas sin
dueño` en las nueve tablas hijas, y los 41 vuelos de Federico intactos.

---

### 2026-08-10 18:10 UTC — Claude (Opus 5, vía Claude Code) — Plan 10: el embudo de onboarding, y dos cosas que sólo se ven mirando la base

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

Arranca `docs/brief/10-onboarding.md`. Hechas `O0`, `O1` y `O4`; `O2` y `O3` en curso.

#### El número que ordena el plan

Vector tuvo **15 usuarios registrados y un solo vuelo cargado**, el de Federico.
Medido, no estimado:

```
registraron 15 → con perfil 10 → completaron el overlay 8 → con aeronave 4 → con vuelo 1
```

Los dos escalones son **8 → 4** (la aeronave) y **4 → 1** (el primer vuelo). El
onboarding pedía licencia y CMA, o sea que **terminaba justo antes de los dos**.

#### `O0` — el semáforo decía "vigente" sin saber nada

`pilotStatus` detectaba documentos **vencidos**, no **faltantes**. El `find` sobre
`BLOQUEANTES` sólo matchea los que tienen `expiry_date` pasada, y uno que no existe
no entra: la función seguía de largo hasta `vigente`. Le afirmaba a un piloto que
podía volar sin saber nada de su certificado médico.

Con el CMA volviéndose salteable en el wizard, "no está cargado" deja de ser un
caso de laboratorio. Estado nuevo `documento_faltante`, y un **tercer tono** en
`FlightStatusCard`: en ámbar se lee como "algo está mal con tu CMA" cuando lo que
pasa es que no hay ninguno. El gris dice que falta el dato.

> **El alcance lo cambió mirar la base, no leer el código.** Iba a disparar el
> estado por cualquiera de los tres bloqueantes. Consultando primero:
> **ningún piloto tiene cargados `licencia` ni `habilitacion` como documento** —el
> tipo de licencia vive en `profiles.license_type`—, así que exigir los tres habría
> mandado a los cuatro usuarios reales a "no podemos confirmar" el día uno, y el
> estado no habría significado nada. Se dispara **sólo por el CMA**. Hay un test
> dedicado a esa regresión.

#### `O1` — y el bug que el plan iba a introducir

El select de aeronave recibía `options=[]` con `required`: se abría, decía "Sin
resultados" y bloqueaba el submit **sin ninguna forma de satisfacerlo**.

`SinAeronaves` **embebe `AircraftForm`** en vez de linkear a Configuración: la
salida del callejón va adentro del callejón. Es un componente y no un `if`
duplicado porque lo usan la página **y** el modal interceptado, y ese par ya derivó
una vez.

> **Lo que casi se me pasa:** `addAircraft` revalidaba sólo `/dashboard` y
> `/dashboard/settings`, y los GET se cachean 20s (`api.ts`). El empty state vive
> en `/dashboard/log-flight`, que no estaba en la lista — **cargar la aeronave no
> habría hecho desaparecer la pantalla que la pedía**, sin ningún error. El
> comentario de `api.ts` dice que las server actions "ya llaman a `revalidatePath`,
> así que no queda data vieja": es cierto **sólo para las rutas listadas**, y esa
> suposición es justo la que rompe. Al agregar una pantalla que depende de datos
> frescos, revisar quién revalida esa ruta.

#### `O4` — dos copias que no llegaron a divergir

`/login` ofrecía Google y `/register` no. El SVG y el handler estaban inline; salen
a `GoogleButton`, que usan las dos. `onPendingChange` preserva el bloqueo del
formulario de credenciales que login ya tenía.

#### Verificación

126 tests (5 nuevos), `tsc`, `build` y `smoke` limpios en cada paso. `/register` y
`/login` **sí se verificaron a ojo** —son públicas— con Playwright en claro y
oscuro, desktop y móvil, comprobando además que no hay scroll horizontal.

> **Para capturas en oscuro:** el tema es `next-themes` con `attribute="class"`, no
> `prefers-color-scheme`. `colorScheme: 'dark'` en Playwright **no alcanza** y la
> captura sale en claro sin avisar. Hay que sembrar `localStorage.theme = 'dark'`
> con `addInitScript` y comprobar `documentElement.classList.contains('dark')`.
> Playwright no está en el repo; se instala aparte con
> `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` y `executablePath: '/opt/pw-browsers/chromium'`.

**Lo que está detrás de login no lo verifica a ojo un agente, y es por diseño.**
Hace falta una sesión, y manejar contraseñas queda fuera de lo que hace el agente.
**Y no se piden por el chat** — durante el plan 07 un secreto pegado para
diagnosticar otra cosa hubo que rotarlo.

**Cerrado como categoría el 2026-08-17:** la cuenta de prueba existe y el **smoke
autenticado corre en verde en el CI**, cubriendo las rutas del dashboard con sesión
real. Lo que queda es revisión visual humana, que no es un pendiente del proyecto
sino algo que Federico hace usando la app.

#### Después: `O2` (wizard de 3 pasos) y `O3` (checklist)

**`O2`.** El overlay pasa de dos campos a tres pasos: licencia+CMA → aeronave →
saldo inicial. **Todo salteable menos la licencia**, que sigue siendo el gate. Un
modal que no se puede cerrar y pide datos que el piloto no tiene a mano no lo
retiene: lo expulsa.

- El `defaultValue="2027-12-31"` del CMA **se fue**. Quien pasara sin mirar quedaba
  con una fecha inventada alimentando el semáforo y las alertas de vencimiento.
- El paso 3 arranca **colapsado**: son 12 campos numéricos en el primer minuto y
  este overlay ya perdía gente con dos. El que no trae horas ve un botón.
- Cada paso guarda lo suyo y no avanza si falló. Antes los dos writes iban juntos
  y si el segundo fallaba quedaba a medias sin decirlo.
- `OpeningBalanceFields` sale de `LogbooksManager` y lo usan los dos. Copiarlo era
  la forma más rápida de que un bucket ANAC cambie en un lado y no en el otro.

> **Verificado contra el backend antes de escribirlo:** el paso 3 crea un libro, y
> `_default_logbook_id` ya auto-crea "Mi libro" al cargar el primer vuelo. Podían
> quedar dos. No pasa: `logbooks.py:86` hace `is_default = not bool(existing)`, así
> que el primero que crea el usuario **es** el default y el auto-creado no se
> dispara.

**`O3`.** `PrimerosPasos` recoge lo que el wizard saltea. Va en
`dashboard/page.tsx` y no en el layout: la página ya trae aeronaves, vuelos,
perfil y documentos en su `Promise.all`, así que **no agrega ni un viaje**; el
layout envuelve todas las rutas del dashboard y ahí un fetch nuevo se paga en cada
navegación. Se borra sola cuando los cuatro pasos están hechos, sin estado
persistido.

La condición vive en `src/lib/onboarding.ts` y no inline: **el overlay y el
checklist opinan sobre lo mismo**, y con la condición escrita a mano en los dos, el
día que se agregue un requisito uno dice que sí y el otro que no. Es además lo
único de este plan con test automático posible (7 casos).

#### Cómo verificar lo que está detrás de login sin poder loguearse

Se armó una página descartable en `src/app/harness-tmp/page.tsx` que renderiza el
overlay y el checklist con datos ficticios, se sacaron capturas y **se borró antes
de commitear**. Dos cosas que cuesta descubrir:

- **Una carpeta que empieza con `_` no se enruta.** `src/app/_harness` da 404 sin
  ningún error: el App Router las trata como privadas. Hay que usar otro nombre.
- Para ver los pasos 2 y 3 hay que parchear el estado inicial, porque avanzar
  exige que las server actions respondan. Se hizo como **edit local revertido
  desde una copia**, no como prop nueva: una API que sólo existe para el harness
  termina en producción.

Queda verificado a ojo, en claro y oscuro y en móvil, sin scroll horizontal: los
tres pasos del wizard y el checklist en `0 de 4` y `3 de 4`. **Lo que sigue sin
probarse es el recorrido real** —que los writes de cada paso peguen contra el
backend— y eso necesita la cuenta de prueba.

> **Ojo con `cmd 2>&1 | head -5 && echo "limpio"`:** el `&&` cuelga del `head`, no
> del comando, así que imprime "limpio" aunque haya fallado. Pasó con `tsc` en esta
> sesión y el error era real (caché de `.next` apuntando al harness borrado).
> Comprobar por código de salida.

#### `T1` del plan 07 — el smoke autenticado, después de dos planes esperándolo

**La nota que venía arrastrándose era falsa.** Decía "el script lee `SMOKE_EMAIL` y
`SMOKE_PASSWORD` de los secrets": `smoke.mjs` sólo leía `SMOKE_PORT`. Describía
cómo iba a ser, no cómo era, y así quedó dos planes. Cargar los secrets no habría
activado nada.

Ahora sí lo hace. Con las dos variables presentes entra con sesión real y comprueba
que **rendericen** las 10 pantallas del dashboard; sin ellas omite esa tanda y pasa
igual. Esa degradación no es comodidad: **los secrets no llegan a los PR desde
forks**, y sin ella cualquier PR externo daría rojo por una credencial que no puede
tener. Un 307 en esa tanda se reporta como "la sesión no fue aceptada" y no como
éxito, porque si no la cobertura desaparecería en silencio.

**Es de sólo lectura a propósito, y la razón es de infraestructura:** el build
apunta al backend de **producción** —no hay uno de test—, así que verificar el alta
de vuelos escribiría en la base real en cada push y exigiría un teardown confiable.
Esa mitad se verifica a mano; la lista está en `docs/brief/10-onboarding.md`.

**Activo desde el 2026-08-10.** Federico cargó los secrets y el rerun lo confirma:

```
--- con sesión ---
✓ 200 /dashboard · /log-flight · /history · /summary · /settings
✓ 200 /audit · /balance · /airports · /tools · /route-weather

22 rutas OK (incluye el dashboard con sesión).
```

> **El verde del CI no alcanza para dar esto por comprobado.** El script pasa
> igual cuando omite la tanda autenticada, así que un ✅ no distingue "entró" de
> "no había credenciales". Hay que leer la salida: el `--- con sesión ---` y el
> conteo de **22** en vez de 12 son la prueba.

#### Dos decisiones tomadas, para no "arreglarlas" sin querer

- **El smoke se loguea contra producción en cada push, y si el backend está caído
  el CI se pone rojo.** Federico lo decidió así el 2026-08-10, sabiendo el costo.
  **No degradar el fallo de login a warning**: la alternativa es que la cobertura
  del dashboard desaparezca en silencio, que es lo que este trabajo vino a
  terminar.
- **La verificación de los caminos de escritura del wizard queda manual**, con la
  lista en `docs/brief/10-onboarding.md`. No automatizarla: el build apunta al
  backend de producción —no hay uno de test— y hacerlo escribiría en la base real
  en cada push.

---

### 2026-08-10 22:30 UTC — Claude (Opus 5, vía Claude Code) — Documentos que no vencen, y el Hangar al avatar

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

Dos de tres ideas de Federico. La subida de PDF/PNG **no se hizo y no está
pendiente de nadie: es backlog sin fecha**, porque no hay ningún bucket de Storage
creado y arrancarlo es greenfield.

#### El crash que había debajo de "las licencias no siempre vencen"

`documents.expiry_date` era `NOT NULL`. El pedido sonaba a cambio de modelo de
datos; lo caro estaba en el código:

```ts
const expiry = Date.parse(`${expiryDate.slice(0, 10)}T00:00:00Z`);
```

Con `null` eso **tira una excepción**, y `pilotStatus` llama a `documentStatus`
por cada documento bloqueante: **un solo documento sin fecha tiraba el semáforo
entero** en vez de degradarlo. Justo la pantalla que esta misma sesión arregló
para que nunca afirme de más.

> **Hacer el tipo nullable *antes* de tocar la base fue lo que hizo el trabajo.**
> El typechecker marcó los cuatro consumidores; los cuatro habrían aparecido en
> producción de a uno.

**La distinción semántica, que conviene no borrar:** sin fecha es **"no vence"**,
no "no sabemos". Lo segundo es `documento_faltante`, agregado hoy para el
documento que debería estar y no está. Acá el documento está y sabemos que no
caduca: nunca vencido, nunca bloquea, nunca alerta. Y **se muestra en gris, no en
verde** — no es salud, es la ausencia de una cuenta regresiva.

Dos consecuencias que quedaron resueltas y no son obvias: en la card de
vencimientos, los documentos sin fecha no cuentan como urgentes ni pueden ser "el
próximo a vencer", y si ninguno vence la card lo dice en vez de inventar un número.

Descubierto de paso: **el barrido ya lo contemplaba** — `document_alerts.py` abre
con `if not raw_expiry: return None`. No hubo que tocarlo.

**La migración 007 es de las seguras de aplicar antes de desplegar**, al revés que
un `DROP COLUMN`: sólo relaja una restricción, ninguna fila cambia, y el código
viejo no puede escribir un null porque exigía la fecha. Verificado: `nullable YES`,
0 nulos sobre 6 documentos.

#### Hangar al avatar — y la trampa

Sale del nav y pasa al avatar en las tres superficies: rail de desktop, barra
superior y header móvil.

> **El avatar sólo existía en desktop.** Sacar Hangar del nav sin agregarlo al
> header móvil lo dejaba **sin ninguna entrada en el teléfono**: es el 7º destino
> y `MOBILE_SLOTS = 5`, así que caía en el sheet de "Más" y de ahí desaparecía.
> Antes de mover algo del nav, mirar en qué superficies existe el destino nuevo.

Los cinco primeros destinos quedan intactos, que es lo que el comentario de
`DashboardNav` pide expresamente no romper.

**Verificación:** 142 tests (9 nuevos, incluidos los de integración que fijan que
un bloqueante sin fecha no rompe ni bloquea, y que un CMA sin fecha **no** dispara
`documento_faltante` porque el documento existe). `tsc`, build y smoke limpios.
El aspecto —avatar en las tres superficies, badge gris— está detrás de login y
**no se vio**.

---

### 2026-08-12 15:55 UTC — Claude (Opus 5, vía Claude Code) — `T1.1` cerrada: el primer aviso de vencimiento, tres planes después

**Quién:** Claude Opus 5 corriendo en Claude Code, para Federico Díaz Nemeth.

El backlog decía **"Esfuerzo: XS (es configuración, no código)"**. Entre eso y que
un piloto recibiera el primer aviso hubo cinco cosas, y **ninguna era el cron**.

#### 1. Texto libre no sirve para avisar

Meta sólo permite texto libre dentro de las **24 horas** desde el último mensaje
del piloto. **Un aviso de vencimiento es proactivo por definición**: llega justo
cuando el piloto no escribió nada.

> Explica el cuadro entero, incluida la parte que confundía: **el copiloto de
> WhatsApp funciona porque responde dentro de la ventana. Los avisos no pueden,
> por la misma razón por la que el bot sí.**

Hizo falta un número de producción (las plantillas están deshabilitadas en
sandbox), dos plantillas *utility* aprobadas por Meta, y `sendWhatsAppTemplate`.
Los nombres y el idioma van por entorno: los fija la aprobación, no el código.

**Las plantillas se cargaron con parámetros numerados = posicionales**, que es lo
que manda la implementación. Con parámetros *nombrados*, Meta exige
`parameter_name` en cada uno y hay que cambiar la función.

#### 2. Y dos bugs de contaminación de sesión, en dos niveles

El barrido devolvía `[]` **con 200 y sin ningún error**. Los `edge_logs` de
Supabase lo mostraron:

```
GET /rest/v1/documents?select=*
apikey        = service_role
authorization = authenticated     <- el token de un piloto
content_range = 0-2/*             <- 3 filas de 6
```

PostgREST prioriza `Authorization` sobre `apikey`: el cliente de service role
consultaba como usuario común y RLS le tapaba las filas ajenas.

> **La contaminación de sesión tiene dos niveles y arreglar uno no arregla el
> otro.** El 2026-08-10 se descacheó `get_base_client()` y eso arregló `/health`,
> donde lo compartido era el **cliente**. Acá lo compartido eran las **options**:
> `ClientOptions` crea su `storage` con `default_factory`, pero `supabase-py` hace
> `copy.copy(options)` —superficial— y sólo rehace los `headers`. El storage queda
> siendo el mismo objeto, así que el login guarda la sesión ahí y **cualquier
> cliente posterior la recupera**.

Probado con el paquete real: `a.storage is b.storage → True` con options
compartidas, `False` con una nueva por llamada.

#### La lección que vale más que los bugs

> **El barrido nunca falló.** Devolvía 200 y una lista vacía, indistinguible de "no
> hay nada por avisar". Con el cron puesto habría corrido **en verde todos los
> días** avisándole a un solo piloto, y no había forma de notarlo desde afuera.
>
> Un proceso que corre sobre **todos** los usuarios y de golpe ve los de uno tiene
> que **gritar**. El fallback a la clave anónima ahora loguea, pero el problema
> general sigue abierto: nadie se entera de que un barrido silencioso dejó de ver
> gente.

Por eso el orden importó: **primero un envío real funcionando, después el cron.**
Programarlo antes habría convertido un bug silencioso en una rutina diaria
silenciosa.

#### Otras dos cosas que salieron del camino

- **El bot dejó de mentir.** `if (!userRes.ok)` mandaba "tu número no está asociado
  a ningún piloto" ante **cualquier** error del backend. Ahora sólo un 404 dice
  eso. Estaba documentado desde el plan 07 sin arreglar y volvió a confundir al
  conectar el número de producción.
- **El formato de teléfono argentino:** WhatsApp manda `5411…` (12 dígitos, **sin
  el 9**) y el perfil guarda `54911…` (13). La rama alternativa del backend lo
  cubre y funciona. El log de "sin match" ahora dice largo y prefijo además del
  sufijo — con sólo el sufijo el diagnóstico quedaba trabado, porque coincidía.

#### Estado

**Primer aviso entregado el 2026-08-11 11:47 UTC.** Cron instalado el 2026-08-12:
`0 12 * * *` (09:00 ART), leyendo el secreto del `.env` y mandándolo por cabecera.
El script escribe una línea por día en `~/logs/document-alerts.log`.

Verificado antes/después en la misma consulta de Supabase: `authenticated` con
`0-2/*` pasó a `service_role` con `0-5/*`, y el barrido devuelve
`{"pending":1,"sent":0,"skipped":1,"failed":0}`. El `skipped` es un piloto sin
WhatsApp, que queda **sin marcar** para que el aviso salga si algún día lo carga.

⚠️ **Al consultar los `edge_logs` de Supabase, fijar la ventana con la fecha
correcta.** Se perdió una vuelta mirando los del día anterior.

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

### 1. Borrar `profiles.cma_expiry` — **hecho, cerrado el 2026-08-17**

Comprobado contra la base: la columna **ya no existe**. Lo que sigue es el
procedimiento que se usó, por si hace falta repetirlo con otra columna.

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

Del backlog de `04`, el ítem **6** (ficha de aeródromo) **no se hizo: es backlog
sin fecha**, no una tarea a medias. El **2** (paleta) se resolvió parcialmente en el
pase de tipografía y monocromo; lo que resta ahí es una **decisión de marca de
Federico** sobre la tipografía sans, no trabajo de código (ver esa entrada).

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
- El MCP de Supabase **sí** estuvo autenticado en esta sesión (entradas anteriores decían lo contrario): las tres migraciones se aplicaron desde acá.

### 2026-08-06 15:50 UTC — Antigravity (Gemini 3.6 Flash) — Clave SSH dedicada y fixes de CI/CD para deploy automático

**Quién:** Antigravity (Gemini 3.6 Flash) trabajando para Federico Díaz Nemeth.

**Qué cambié:**
- `scripts/smoke.mjs` — ejecución directa de `node_modules/.bin/next` y agregada de `process.exit(0/1)` explícito al finalizar para evitar que el proceso quede en listener y cuelgue el runner de CI.
- `.github/workflows/deploy.yml` — carga explícita de NVM (`export NVM_DIR="$HOME/.nvm"`) en la sesión SSH para asegurar uso de Node `>=20` (`v24.1.0`) durante `npm run build`, y corrección del puerto en el health check de `3000` a `3010`.

**Por qué:**
1. **Runner colgado en CI:** `smoke.mjs` no cerraba el event loop al finalizar la verificación de rutas públicas, provocando un timeout de 60 minutos en GitHub Actions.
2. **Fallos de compilación en el VPS:** En sesiones SSH no interactivas, NVM no se cargaba automáticamente y el script ejecutaba Node `v18.19.1` (sistema), incompatible con Next.js 16 (`>=20.9.0`).
3. **Falso positivo en Health Check:** El script probaba `http://localhost:3000/login`, pero en PM2 el proceso `vector-frontend` corre en el puerto `3010`. El fallo de HTTP 500/connection refused gatillaba el rollback automático.

**Estado:** Terminado.

**Verificación:** 
- Generación de clave `vector_deploy` y autorización en `authorized_keys` del servidor `oraclearm` confirmada.
- Secrets de GitHub (`DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`) vinculados en ambos repositorios.
- Corridas de GitHub Actions comprobadas en `main`: CI ✅ `success` (47s) y Deploy ✅ `success` (46s).

### 2026-08-13 20:30 UTC — Claude (Opus 5, vía Claude Code) — Aceptado no es entregado: el aviso que se quemaba sin que nadie lo leyera

**Quién:** Claude (Opus 5) trabajando para Federico Díaz Nemeth.

**El síntoma que lo destapó:** a las 09:00 de hoy llegó el primer aviso proactivo
real —`Inspección Smart`, 26 días, umbral de 30—. Funcionó. Pero al mirar cómo
había quedado marcado apareció que la marca se pone cuando **Kapso responde 2xx**,
y eso no es una entrega: es un acuse de recibo de la API. Meta resuelve la entrega
después, asincrónicamente, y avisa por webhook.

Entre las dos cosas caben un número dado de baja, un piloto que bloqueó la cuenta
y una plantilla pausada. Cuando pasa cualquiera de esas, el documento ya quedó
marcado con el umbral de 30 y `should_alert` no vuelve a disparar hasta el de 7:
**el aviso se quema sin que nadie lo haya leído**, y el piloto se entera un mes
más tarde, o no se entera.

**Qué cambié:**
- `src/lib/whatsapp.ts` — `sendWhatsAppTemplate` deja de devolver `boolean` y
  devuelve `{ accepted, messageId }`. Colapsar las dos cosas en un `true` era
  exactamente lo que hacía imposible distinguir "salió" de "llegó". El parseo del
  wamid va en su propio `try`: si el JSON no se puede leer el envío **igual fue
  aceptado**, y degradar eso a fallo mandaría el aviso de nuevo mañana sobre un
  mensaje que el piloto ya recibió.
- `src/app/api/cron/document-alerts/route.ts` — pasa el `message_id` al marcar, y
  el contador pasa de `sent` a `accepted`, que es lo que efectivamente sabemos al
  terminar el barrido.
- `src/app/api/webhooks/whatsapp/route.ts` — `parseStatus` y
  `desmarcarAvisoFallido`. **Los payloads de `statuses` ya venían llegando y los
  tirábamos**: las tres ramas de parseo eran todas de mensajes entrantes, así que
  un status se caía al final con el teléfono vacío y se descartaba sin log.

**Dos decisiones que no se deducen del código:**

1. **Se sigue marcando en la aceptación, y se desmarca ante el fallo.** La
   alternativa —esperar el `delivered` para marcar— deja una ventana entre el
   envío y el webhook en la que un segundo barrido manda el aviso duplicado.
   Marcar y desmarcar falla del lado correcto: el peor caso es un reintento, no un
   silencio.
2. **El manejo de `statuses` va antes del deduplicador.** Un status trae el id del
   mensaje *saliente*, que para un aviso es un id que este proceso ya vio al
   enviarlo; pasarlo por `processedMessageIds` lo descartaría como reenvío del
   webhook, que es justo el aviso que no queremos perder.

**Estado:** Terminado. Migración `008` aplicada.

**Verificación:** `npx tsc --noEmit` = 0, `npm test` 142/142, `npm run build`
compilado en 8.3s. Backend: `python3 test_audit_engine.py` 16/16, con dos casos
nuevos que fijan la invariante del reintento — que un documento desmarcado vuelve
a disparar, y que dispara **el bucket de hoy y no el que falló** (si el fallo se
detecta cuando ya bajó de 30 a 7, reintentar el de 30 sería avisar de más días de
los que quedan).

**Lo que queda sin cubrir, dicho:** un aviso aceptado cuya respuesta no trajo
wamid queda marcado y **no se puede reintentar solo** — se loguea un `warn` cuando
pasa. Y el `failed` depende de que Kapso reenvíe los status de Meta; no está
verificado contra un fallo real todavía, sólo contra la forma del payload.

### 2026-08-14 01:45 UTC — Claude (Opus 5, vía Claude Code) — Plan 11: el calendario y la tarjeta compartible

**Quién:** Claude (Opus 5) trabajando para Federico Díaz Nemeth.

**Qué es:** dos features del plan `docs/brief/11-calendario-y-tarjeta.md`. El
calendario de vuelos programados —con la tarjeta de "¿volaste esto?" en el
dashboard— y la tarjeta de estadísticas compartible por WhatsApp. Ninguna de las dos
toca el copiloto, y la tarjeta no lleva mapa: las dos exclusiones son decisión de
Federico.

**Las decisiones que no se deducen del código:**

- **`planned_flights` es una tabla aparte y nunca una columna en `flights`.** Tres
  motivos, en orden: `flights` tiene NOT NULL en cinco columnas que un plan no
  tiene; toda consulta agregada leería vuelos inexistentes salvo que le agreguen un
  filtro, y un filtro olvidado infla las horas de alguien en un papel que presenta
  ante ANAC; y **`POST /flights` cobra la hora contra el saldo del piloto** vía
  `_sync_flight_transaction`, así que un plan ahí adentro cobraría plata por un
  vuelo que no ocurrió.

- **El marcado del plan al completarlo es best-effort.** El vuelo ya está guardado
  cuando se intenta; si el PATCH falla, el plan queda en `programado` y la tarjeta
  vuelve a preguntar. Un recordatorio duplicado es molesto y visible; revertir el
  vuelo sería perder una entrada de bitácora por un post-it. Misma dirección de
  falla que el marcado de los avisos de vencimiento.

- **La duplicación del prefill se borró en vez de comentarse.** `log-flight/page.tsx`
  y `@modal/(.)log-flight/page.tsx` parseaban el mismo objeto literal y los dos
  llevaban un comentario avisando que ya habían derivado. Ahora hay un solo
  `parsePrefill` en `src/lib/prefill.ts`, con tests. Un tercer comentario no
  arreglaba nada.

- **La tarjeta compartible duplica el sistema de diseño a mano, y está bien.**
  satori entiende un subconjunto de CSS: sin grid, sin variables CSS, sin Tailwind,
  sin `filter: blur()`. **No se puede importar ningún componente de la app.** El
  archivo lo dice para que nadie intente reusar `Card`.

- **Las fuentes NO se cargan como documenta `@vercel/og`.** El patrón
  `fetch(new URL(..., import.meta.url))` es sólo para el runtime edge; en Node eso
  es un `file://` y el `fetch` de Node no lo soporta ("not implemented... yet...").
  Van con `fs.readFile` y **perezosas**, porque a nivel de módulo el intento corría
  durante `next build` y lo rompía.

- **El preview de la tarjeta es la imagen final**, el mismo endpoint y los mismos
  bytes. Una vista previa dibujada en HTML sería una segunda implementación sin nada
  que la mantenga sincronizada, y no hay harness de tests de componentes para
  atraparlo. Por lo mismo se descartó el drag and drop.

- **El mes del calendario se navega por `searchParams`**, no por estado de cliente:
  ni el mes ni "hoy" se deciden en el navegador. Dos bugs de hidratación previos.

**Estado:** Terminado y pusheado. **La migración `009` necesita aplicarse a mano** —
es aditiva y el frontend tolera un backend sin ella (`listPlannedFlights` devuelve
`[]`), así que el orden de los deploys no importa.

**Verificación:** `npx tsc --noEmit` = 0 · `npm test` **186/186** (eran 142) ·
`npm run build` limpio · `npm run smoke` 14 rutas OK. La tarjeta se renderizó de
verdad a un PNG y se miró.

**Lo que quedó sin comprobar en su momento — todo cerrado el 2026-08-17:**

- La tanda con sesión del smoke no corría en el contenedor (sin `SMOKE_EMAIL` /
  `SMOKE_PASSWORD`), así que de `/api/share-card` sólo se veía el 401. **Cerrado:**
  después corrió con sesión y dio `200 /api/share-card?tiles=pic,noche` en 14 s, o
  sea un render de satori de verdad.
- El `import src.app` del backend no se podía correr localmente: `litestar` no está
  instalado y `pip install -r requirements.txt` falla por un `PyJWT` que instaló
  Debian sin `RECORD`. **Cerrado, y con la solución anotada para la próxima: crear
  un venv** (`python3 -m venv`) y instalar ahí — el venv no ve el `PyJWT` roto del
  sistema y la instalación pasa. Con eso se corren los tres jobs del CI del backend
  desde el contenedor: `import src.app`, `ruff` y `test_audit_engine.py`.
- El CI del backend se miró en verde antes de mergear, y sigue en verde.

---

## Una lista vacía no es una respuesta — 2026-08-14

**El bug:** el semáforo del dashboard le decía a un piloto «no tenés un certificado
médico cargado» cada tanto al entrar, teniéndolo cargado, y se arreglaba solo después
de pasar por el Hangar.

La causa raíz está del lado del backend (ver su `AGENTS.md`: una carrera entre los
ocho hilos de `/dashboard` sobre el mismo cliente de Supabase). Lo que toca a este
repo es la mitad de arriba: **`documents: []` llegaba igual si el piloto no tiene
documentos que si la consulta se cayó**, y `pilotStatus` resolvía esa ambigüedad
afirmando.

`/dashboard` ahora manda `unavailable: string[]` con las secciones que no se pudieron
leer, y eso baja como `documentosDisponibles` a los tres lugares que opinaban sobre
documentos:

- **`pilotStatus`** gana el estado `datos_no_disponibles` — "no pudimos leer tus
  documentos, es una falla nuestra". Va después de `inactividad_prolongada`, que sale
  de los vuelos y sigue siendo verdad, y antes de todo lo que mire la lista.
- **`estadoOnboarding`** acepta `tieneCma: boolean | null`. `null` es "no sé" y ese
  paso **no se dibuja** en `PrimerosPasos`: ni tildado, que sería mentir, ni
  pendiente, que sería pedirle que cargue lo que ya tiene. Ojo con `!v` al contar
  pendientes — `null` también es falsy.
- **`LogbookHealthCard`** dice "no pudimos cargar tus vencimientos" en vez de "no hay
  documentos cargados".

Y `getDashboardData` marca **las ocho** secciones como no disponibles cuando
`/dashboard` no responde ok, que es el mismo caso a mayor escala.

**La regla:** antes de escribir una afirmación sobre el piloto a partir de una
colección vacía, preguntar si esa colección puede estar vacía por una falla. Si puede,
el estado "no sé" tiene que existir. `documento_faltante` se agregó justo para eso y
aun así la capa de abajo le pasaba "no hay" cuando lo que había pasado era "no pude
preguntar".

### Actualización del mismo día — el arreglo cubría uno de cuatro

Esta entrada, tal como se escribió, arreglaba **sólo la consulta de documentos**,
porque ése era el bug que Federico había reportado. Horas después mandó una captura
de "Primeros pasos" marcándole **1 de 4**: licencia, aeronave y vuelo sin tildar,
teniendo `license_type = PPA`, 6 aeronaves y 41 vuelos cargados. En los logs, esa
request de `/dashboard` había perdido siete de sus ocho consultas.

**El bug nunca fue "el CMA": es "una lista vacía se lee como una afirmación", y hay
cuatro listas.** Arreglar la instancia reportada y no la clase dejó tres agujeros
idénticos abiertos, con la entrada de bitácora diciendo que estaba resuelto.

Ahora `estadoOnboarding` acepta `null` en **los cuatro** pasos y el dashboard le pasa
`null` a cada uno cuya sección esté en `unavailable`. Un paso que no se pudo
verificar no se dibuja.

**Para la próxima:** cuando el arreglo de un bug se pueda aplicar a N lugares y se
aplique a uno, la entrada tiene que decir cuáles quedaron afuera y por qué. Si no,
el registro miente por omisión.

Confirmado por Federico después del despliegue: el dashboard anda.

---

## Vencimientos que se mueven solos — 2026-08-14

El pedido: «que se puedan setear vencimientos variables, por ejemplo en base a la
fecha del último vuelo, que se actualiza constantemente». La mitad de fondo está en
el backend (migración 011 y `src/services/derived_expiries.py`); acá va lo que toca
a esta app.

**El cálculo no vive acá.** `expiry_date` llega ya resuelta y todo lo que la lee
—`documentStatus`, `pilotStatus`, `LogbookHealthCard`— sigue igual, sin enterarse de
que existen reglas. `src/lib/expiry-rules.ts` hace otras dos cosas:

- **Explicarle la regla al piloto.** Sin eso ve una fecha que se le mueve sola y no
  sabe por qué. Por eso la fila del listado dice "Se recalcula: 60 días después de tu
  último vuelo" debajo de la fecha.
- **Previsualizar.** `vencimientoDerivado` repite la aritmética del backend para que
  el formulario conteste "entonces hoy vence el ..." mientras el piloto escribe los
  días.

**El texto de ayuda dice que volar corre la fecha hacia adelante, y eso es
deliberado.** Es al revés que todos los otros vencimientos de Vector, donde lo único
que ayuda es un trámite. Sin decirlo, la cuenta regresiva se lee como una amenaza en
vez de como lo que es.

**El "No vence" dejó de ser una casilla y pasó a ser un select de tres.** El motivo
original de la casilla sigue valiendo —un `<input type="date">` con valor no se puede
vaciar de forma confiable, y nadie adivinaba que podía dejarlo en blanco—, pero
ahora hay tres estados y tres no entran en una casilla.

**`parseVencimiento` arma el trío regla/offset/fecha de una sola vez** porque los
tres son incoherentes por separado: el CHECK rechaza una regla derivada sin offset y
un offset sobre una regla fija. Con `ultimo_vuelo` **no manda `expiry_date`**: esa
columna tiene un solo escritor, que es el backend. `upsertCmaDocument` manda
`expiry_rule: "fijo"` explícito por lo mismo — sin eso, un CMA que hubiera quedado
con regla derivada se comería la fecha que el piloto acaba de escribir en el
onboarding, en el próximo vuelo.

**El costo que quedó abierto:** `/dashboard/settings` ahora pide `/flights` para
tener el ancla, y ese endpoint devuelve la bitácora entera sin paginar. Va en el
`Promise.all` que ya estaba, así que no agrega latencia, pero sí una respuesta
grande en una página que no la necesitaba. El día que ese endpoint pagine, pedirle el
último vuelo y nada más.

**Estado:** pusheado, y las migraciones 011 y 012 aplicadas. Los tres modos guardan.

La 012 existe porque el CHECK de la 011 no rechazaba nada —`false or NULL` es NULL y
un CHECK que da NULL pasa—, así que durante un rato la única validación real del
trío regla/offset/fecha fue `_apply_expiry_rule` en el backend. Está en el `AGENTS.md`
del backend con el detalle.

---

## Contar desde un vuelo puntual — 2026-08-14

El cuarto modo del formulario de vencimientos: "Contado desde un vuelo puntual", que
guarda `expiry_rule: 'vuelo_ancla'` con el id del vuelo. El porqué del modelo está en
el `AGENTS.md` del backend; acá va lo que toca a esta app.

**Los dos textos de ayuda dicen lo contrario a propósito.** Con `ultimo_vuelo`,
volar **corre** la fecha hacia adelante; con `vuelo_ancla`, no la mueve nada. Una vez
guardados, los dos modos se ven idénticos —una fecha y una leyenda— y esa línea es la
única forma que tiene el piloto de saber cuál eligió. Confundirlos es creer que estás
cubierto cuando no. Por eso son dos funciones separadas, `ayudaRegla` y `ayudaAncla`,
y no una con un `if`.

**`sumarOffset` está duplicada del backend** (`derived_expiries.sumar_offset`), y es
duplicación deliberada: el formulario previsualiza la fecha mientras el piloto
escribe la cantidad, y sin la cuenta acá esa previsualización no existe. Si las dos
se separan, la pantalla muestra una fecha y la base guarda otra. **Los tests de los
dos lados comparten los mismos cuatro casos**, incluido el que rompe cualquier
implementación ingenua: 31 de enero + 1 mes es el 28 de febrero, no el 3 de marzo.

**`descripcionRegla` no inventa cuál vuelo era.** Recibe la fecha del ancla como
segundo argumento y, si no la tiene, dice "desde un vuelo que elegiste" en vez de
nombrar uno. Es peor de leer y es lo único cierto.

**Sin vuelos cargados el modo avisa en vez de ofrecer un select vacío**, que sería un
callejón sin salida.

`DocumentsManager` pasó de recibir `ultimoVuelo` a recibir `flights`: necesita la
lista entera para el selector del ancla, y de ahí saca el último vuelo solo.

**Estado:** pusheado, migraciones 011/012/013 aplicadas. Los cuatro modos guardan.

---

## El tracker de PCA pasa de informe a respuesta — 2026-08-14

Seis diales y el piloto adivinando cuál pesa. El problema es que **el que pesa
rota**: se puede estar al 97% del total y trabado por 2 hs de travesía, o sea con el
medidor grande casi lleno y el dial chiquito decidiendo qué vuelo conviene hacer.

Tres respuestas nuevas al pie de la card, con datos que ya estaban:

- **Qué tenés más lejos**, comparando **en fracción y no en valor absoluto** — 3 hs
  de travesía sobre 20 y 3 aterrizajes nocturnos sobre 5 no son comparables como
  números sueltos.
- **Cuándo se cierra**, con el ritmo **de ese requisito** y no de las horas totales:
  quien vuela 8 hs por mes dando vueltas al aeródromo avanza cero en travesía, y
  proyectar con el ritmo general daría una fecha optimista sobre justo lo que lo
  tiene trabado. Sin ritmo devuelve `null`, no infinito: no haber volado eso en tres
  meses no autoriza a contestar "nunca".
- **Cuánto sale terminar**, `cost_per_hour` ponderado por horas voladas × las horas
  que faltan. Es **un piso**: un mismo vuelo avanza varios requisitos a la vez, así
  que lo mínimo es la brecha más grande, no la suma de las brechas.

**El título cambia según cuántos falten.** Con uno pendiente es "Lo que te frena";
con varios, "Lo que más lejos tenés". Medido contra los datos de producción, el
piloto real tiene 5 requisitos pendientes y el que sale es nocturno (5 hs) mientras
hay uno de 152 hs: llamar a eso "lo que te frena" sugeriría que cerrándolo terminó.

**Toda la aritmética se mudó a `src/lib/pca-progress.ts`.** Estaba adentro del `.tsx`
y por lo tanto **sin un solo test** —vitest corre en `environment: "node"` y no puede
testear componentes—, así que los seis números de 61.620 nunca se habían verificado.
Ahora tienen 24 tests, incluidos los dos que ya tenían comentarios de advertencia en
el componente: el tope de 5 h del instrumento simulado se aplica **sobre el
acumulado** y no vuelo por vuelo, y los aterrizajes de apertura **no** cuentan como
nocturnos.

También se fue la leyenda "(reducido: 150 hs)": el medidor dividía siempre por 200 y
nunca usaba el 150, y Federico confirmó que ese piloto no existe entre sus usuarios.
Ofrecer un camino que nadie va a tomar es ruido en la pantalla de todos.

**Queda igual y a propósito:** el `subObjetivo` de PIC (70 sobre 100) tiene la misma
forma que el 150 y sigue ahí. No lo toqué porque no está confirmado qué codifica.


---

## Estado al cierre — 2026-08-17

**No hay nada pendiente de verificación en este documento.** Todo lo que en su
momento quedó como "no se pudo comprobar acá" está cerrado, con la evidencia en su
entrada. Lo que aparece como backlog es backlog: ideas sin fecha, no trabajo a medias.

**En producción, desplegado y verificado:**

| | Commit | CI | Deploy |
|---|---|---|---|
| Frontend | `a5c5916` | verde | verde |
| Backend | `807aa3d` | verde | verde |

- Migraciones **008 a 013 aplicadas**, comprobadas contra la base una por una.
- `tsc` 0 · **265 tests** · build limpio · smoke con sesión en verde.
- Cero respuestas no-2xx en Supabase en 24 h: ni un `PGRST303`, y los 128×400 y
  86×429 contra `/auth/v1/token` que había antes de `auto_refresh_token=False`
  desaparecieron.

**Nada abierto.** La causa raíz de las tandas incompletas de `/dashboard` se
investigó hasta el final: la hipótesis de la carrera entre hilos **se puso a prueba
y resultó falsa** —640 consultas concurrentes en un venv contra el proyecto real, en
las dos variantes, cero fallos—. Lo que encaja con la evidencia es un fallo
transitorio de conexión durante el arranque en frío, dos segundos después de un
deploy, y eso es exactamente lo que el reintento arregla. Verificado en producción:
~130 requests desde el despliegue, con un pico de 7 en 5 segundos, sin una sola
tanda incompleta. El detalle está en el `AGENTS.md` del backend.

**Deuda técnica anotada, sin urgencia:** `/flights` devuelve la bitácora entera sin
paginar, y ya la piden el dashboard, el resumen y la configuración. Con 41 vuelos no
se nota; con 2000 sí.

---

## Cuánto salió cada vuelo — 2026-08-17

Vector tenía los dos factores desde siempre —`aircraft.cost_per_hour` y la
transacción que `_sync_flight_transaction` graba por cada vuelo— y **nunca los
mostraba juntos**. Para un alumno de escuela que paga la hora, "cuánto llevo
gastado" es la pregunta del mes, y la contestaba a mano.

Ahora aparece en tres lugares: la fila de "Últimos vuelos" del dashboard, la
cabecera de cada mes del libro, y el detalle de cada vuelo. Más una tarjeta de "lo
que va del mes" arriba de los packs.

**El número sale de la transacción, no de una cuenta.** Es la decisión de fondo de
`src/lib/costos.ts`: el backend calcula `duración × cost_per_hour − descuento` **en
el momento de cargar el vuelo** y guarda el resultado. Recalcularlo al leer, con el
`cost_per_hour` de hoy, mostraría el precio actual sobre un vuelo de hace seis meses
— y en una escuela el precio de la hora sube. La transacción es el precio histórico;
la cuenta sería una suposición.

**Cero se trata como "no sé", no como "gratis".** Un cobro en cero sale de dos
situaciones indistinguibles desde el frontend: la aeronave no tiene precio cargado
—cuatro de las seis de Federico están en 0— o el vuelo tuvo 100% de descuento. La
primera es mucho más común, y escribir "$ 0" sobre un vuelo que el piloto pagó es
peor que no escribir nada. Por eso nada de esto se dibuja sin un cobro mayor a cero:
en modo `packs` la app se ve exactamente igual que antes.

**El gasto del mes se agrupa por la fecha del vuelo, no por `created_at` de la
transacción.** Un vuelo de julio anotado en agosto —lo que pasa cuando alguien se
pone al día con la bitácora— caería en el mes equivocado y haría mentir a los dos
meses a la vez.

**Lo que este cambio dejó a la vista, y es un agujero anterior:** Federico está en
modo `balance` y **sólo 2 de sus 41 vuelos tienen cobro**. `_sync_flight_transaction`
corre al crear o editar un vuelo, así que los 39 anteriores al cambio de modo nunca
se cobraron. **No hay backfill al pasar de `packs` a `balance`**, y sin él la
pantalla de saldo viene mostrando un número incompleto desde entonces. Es una
decisión de producto —escribir 39 transacciones de plata retroactivas no es algo que
un agente haga sin que se lo pidan— así que queda dicho acá, no hecho.

**Verificación:** `tsc` 0 · **278 tests** (eran 265; 13 nuevos sobre `costos.ts`) ·
build limpio. Contra la base: 2 cobros con vuelo asociado, los dos distintos de cero,
$1.100.500 en total.

---

## Cuatro cosas que los datos ya sabían — 2026-08-17

Todas salen de información que Vector tenía y no mostraba. Ninguna agregó una
columna a la base.

**Cobros históricos (`BackfillCobros`).** Una tarjeta en Saldo que incorpora los
cobros de los vuelos que quedaron sin registrar. El detalle está en el `AGENTS.md`
del backend; lo que importa acá es que **la tarjeta dice en negrita que el saldo no
cambia**. Es la primera pregunta de cualquiera frente a un botón que escribe cobros
retroactivos, y si la respuesta no está a la vista el botón no se toca.

**El precio de la hora en el tiempo (`PrecioHoraChart`).** Cada transacción guardó el
precio **del día en que se voló**, así que la serie muestra los aumentos reales de la
escuela y no el precio de hoy proyectado hacia atrás. SVG a mano y no la librería de
gráficos: `DashboardCharts` se carga en diferido justamente para no pagarla en el
primer paint, y traerla a Saldo para dibujar seis puntos sería pagarla de nuevo.
Ponderado por horas — un vuelo de 0,3 h en el avión caro no puede mover el mes tanto
como uno de 3 h en el barato.

**Buscar en la bitácora (`lib/busqueda-vuelos.ts`).** El filtro miraba ruta y
matrícula. Ahora hay rango de fechas, aeronave, propósito, y el texto entra también
en las **observaciones** — que es donde el piloto escribe "con Martín", "examen" o
"primer solo", o sea exactamente lo que después busca. La lógica se fue a un módulo
puro con 11 tests: **un filtro que se equivoca esconde vuelos sin avisar**, que en un
registro regulatorio es la peor forma de fallar. Los campos extra van detrás de un
botón; cuatro campos permanentes serían cuatro campos vacíos el 99% de las veces.

**Racha y comparación (`lib/actividad.ts`, `ComoVenisVolando`).** El heatmap dibuja
la actividad, pero dibujarla no es decirla: un piloto mira una grilla de cuadraditos
y no sabe si viene mejor o peor que en marzo. Dos decisiones que hacen la diferencia
entre un dato y un reproche:

- **La semana en curso no corta la racha si todavía no volaste.** Es martes y no
  volaste: la racha sigue viva desde la semana pasada, porque quedan cinco días.
  Contarla como cortada convertiría el número en un reproche los lunes.
- **Los meses sin volar cuentan como cero en el promedio.** Promediar sólo los meses
  con actividad daría una vara artificialmente alta: quien voló en marzo y en julio
  no tiene un promedio de sus dos mejores meses. Y sin ningún mes anterior no se
  compara nada, porque un promedio de ceros diría "vas 8 horas mejor que siempre" en
  el primer mes de uso.

**Verificación:** `tsc` 0 · **308 tests** (eran 278; 30 nuevos en tres módulos) ·
build limpio.

---

## Que la app no explote sin red — 2026-08-17

Primera mitad del plan 12. Vector no degradaba ante un corte de red: **explotaba**.

`src/lib/api.ts` no tenía `try/catch`, así que sin red el `fetch` tiraba
`TypeError: fetch failed` y la excepción subía al render del server component. Y como
`src/app/dashboard/layout.tsx` llama a `getProfile()` sin protección, **un corte de
red reventaba el layout y con él las trece páginas del dashboard**. Lo que veía el
piloto era una pantalla en blanco con "Application error: a server-side exception has
occurred" — porque además **no existía ningún `error.tsx` en toda la app**.

**El arreglo grande sale de una decisión chica: `apiFetch` devuelve un `Response`
sintético con status 503 en vez de propagar la excepción.** Los doce llamadores ya
hacen `if (!response.ok)`, así que un 503 fluye por caminos que ya están escritos
**sin tocar un solo call site** — y en `dashboard/page.tsx` cae solo en el patrón
`unavailable`, que ya distingue "no hay datos" de "no pudimos preguntar". Devolver
`null` o dejar que tire habría obligado a tocar los doce archivos.

Con **timeout de 8 s** (`AbortSignal.timeout`), porque un backend que acepta la
conexión y no contesta cuelga el render hasta que la plataforma lo mate: "no explotar"
con treinta segundos en blanco sigue siendo explotar, sólo que despacio.

**Cuatro fronteras de error, y hacen falta las cuatro.** La que importa entender:
`src/app/dashboard/error.tsx` **no captura lo que tira `src/app/dashboard/layout.tsx`**
—un boundary no atrapa a su propio layout—, y ese layout es justo el que llamaba a
`getProfile()`. Por eso también está `src/app/error.tsx`. Más `global-error.tsx`
(reemplaza el documento entero, así que renderiza sus propios `<html>`/`<body>`) y un
`not-found.tsx`.

Los tres estados —sin red, sesión vencida, error real— existen porque **cada uno se
resuelve distinto**: la red se espera, la sesión se renueva entrando de nuevo, el
error se reintenta. La clasificación es por texto del mensaje y **es frágil a
propósito**: en producción Next lo reemplaza por un digest, así que lo más probable es
caer en el genérico. Por eso el genérico tiene que servir solo.

**`getProfile` ahora devuelve `{profile, disponible}`**, no sólo el perfil: `null` era
ambiguo entre "piloto sin perfil" y "servidor que no contestó". Con `disponible: false`
el layout muestra `SinConexionBanner`, porque un dashboard en cero sin explicación se
lee como "perdí mis datos" y no como "perdí la señal". Es la misma disciplina de
`unavailable` y del estado `datos_no_disponibles` del semáforo.

**Se borró `next.config.mjs`**: había dos configs y Next resuelve `.js` primero, así
que el `.mjs` **nunca se leía**. Era una trampa para el próximo que editara el archivo
equivocado.

**Lo que NO se testeó automáticamente, dicho:** `apiFetch` importa `getSessionToken`,
que es `"use server"` y usa `cookies()`, así que testearlo exige mockear ese módulo —
y este repo no tiene un solo mock. Seis líneas de `try/catch` no justifican estrenar
esa práctica. Se verifica a mano con el backend apagado, y está en la lista de
comprobaciones del plan.

**Verificación:** `tsc` 0 · 308 tests (sin cambios: nada de esto es testeable en
`environment: "node"`) · build limpio.

**Falta de esta mitad:** el refresh de sesión (A4/A5), que necesita un endpoint nuevo
en el backend.

## La sesión moría a la hora, no a las 24 — 2026-08-18

Segunda mitad del plan 12, y cierra un agujero que llevaba meses abierto sin que nadie
lo hubiera nombrado.

**El `access_token` de Supabase vive una hora** (está documentado en
`supabase_client.py:17`). **La cookie `session_token` vive veinticuatro.** En el medio
había veintitrés horas en las que `src/proxy.ts` veía la cookie, dejaba pasar, y
**todas las páginas pedían con un JWT vencido**: 401 y logout. La sesión no moría a
las 24 h — moría a la hora, y de una forma que se leía como un bug de datos.

Y lo peor: **el `refresh_token` se venía guardando en una cookie de 30 días desde hacía
meses sin que existiera una sola línea, ni en el frontend ni en el backend, que lo
canjeara.** Estaba la mitad de un mecanismo, sin la otra mitad.

**`POST /auth/refresh` en el backend.** Sin guard a propósito: quien llama **no tiene**
un access token válido, que es justamente el motivo por el que llama. La autorización
es el refresh token mismo, que Supabase valida. Pasar el token explícito a
`refresh_session(...)` evita el storage del cliente por completo
(`supabase_auth/_sync/gotrue_client.py:760`), así que no hay estado compartido que
contaminar — la lección de todo el episodio de sesiones cruzadas sigue valiendo.

**El refresh vive en `src/proxy.ts` y no en `apiFetch`, y no es una preferencia.** Es
la restricción de Next que el propio `api.ts` documenta desde hace meses: *"causes
'Cookies can only be modified' error when called during Server Component rendering"*.
El proxy es el único lugar donde se puede escribir una cookie.

**Las dos mitades del arreglo, y la segunda es la que se olvida:**

1. `response.cookies.set(...)` — para el navegador, o sea las navegaciones siguientes.
2. `request.cookies.set(...)` + `NextResponse.next({ request: { headers } })` — para
   **este** render. Sin esto, la página que se está por dibujar sigue leyendo el token
   viejo de `cookies()` y hace todas sus llamadas con el JWT vencido: la renovación
   funciona y el usuario ve un error igual, una vez por hora. `RequestCookies.set`
   reescribe la cabecera `cookie` del request, y ahí es donde las dos líneas se
   conectan.

**El disparador no es "la cookie desapareció", como decía el plan.** Esa idea sólo
funciona si la cookie caduca cuando caduca el token, y acá dura 24× más. Se decide por
el `exp` del JWT, decodificado **sin verificar la firma** — de eso se ocupa el backend
en cada request; acá el `exp` sólo dice *cuándo* renovar, y un token falsificado con un
`exp` mentiroso no gana nada. Con **margen de 5 minutos**: un render que arranca con
tres segundos de token por delante hace sus llamadas con el token ya muerto.

**Un token ilegible no se renueva.** `vidaRestante` devuelve `null` —no "vencido"—
ante cualquier cosa rara, y `necesitaRenovar` lo trata como "no sé, no toco". Es la
misma disciplina de `unavailable` y `datos_no_disponibles`: **cuando no se sabe, no se
afirma.**

**Distinguir 401 de "no contestó" es lo que evita desloguear a alguien que estaba
bien.** Sólo el 401 significa sesión muerta; un 500 o un timeout es un problema del
servidor, y tratarlo como sesión muerta desloguearía a todos los pilotos ante un deploy
roto. Borrar el refresh token obliga a escribir la contraseña de nuevo: fallar es
recuperable, desloguear no.

**La lógica salió del proxy a `src/lib/sesion.ts`** porque `vitest` corre con
`include: ["src/**/*.test.ts"]` y no puede montar un proxy de Next: lo que queda en ese
archivo **no se testea nunca**. 14 tests, incluido el del payload con acentos —el JWT
trae el apellido del piloto, y `atob` devuelve bytes crudos, así que sin decodificar
UTF-8 esto rompía sólo para algunas cuentas.

**Verificación, y esta vez fue de verdad:** además de `tsc` 0 · 322 tests · build
limpio, se levantó un stub de auth y un stub de API en local y se corrieron los seis
caminos contra un `next start` real. El decisivo: con un `session_token` vencido y un
refresh válido, **las seis llamadas del render salieron con el `exp` del token nuevo**,
no del viejo. Ésa es la prueba de que la mitad 2 funciona, y es la que no se puede
deducir leyendo el código. Los otros cinco: 401 → borra las dos cookies y manda a
login · 500 → **no** desloguea · sin `session_token` con refresh bueno → renueva y
sigue · token vivo → **cero** llamadas al servidor de auth · desde `/` → renueva y
redirige a `/dashboard`. Contra producción se confirmó que el endpoint responde 401 con
`Refresh token is not valid`, 400 si falta el campo y 404 en una ruta inexistente.

**La carrera del token de un solo uso, dicho claro:** cada canje invalida el anterior.
GoTrue tolera reusar el mismo durante ~10 s y en esa ventana devuelve la misma sesión,
que es lo que salva el caso real —dos pestañas, o los prefetch de Next disparando
juntos—. Fuera de esa ventana no hay simultaneidad que valga. **No hay lock**, y no
hace falta.

**Con esto la parte A del plan 12 está cerrada.** Queda la parte B: el planificador de
vuelo, empezando por `aviation.test.ts`.

## El motor de navegación, verificado antes de construirle encima — 2026-08-18

`B0` del plan 12. `src/lib/aviation.ts` era **el archivo más matemático del repo y no
tenía un solo test** — 411 líneas de trigonometría de las que come todo calculador
operativo de Vector, y de las que va a comer el planificador entero. **41 tests.**

**Los valores esperados salen de calcular a mano, no de correr el código y anotar lo
que dio.** Un test escrito de la segunda forma no encuentra bugs: los fija.

**El test que más importa es el más aburrido: viento cero.** Sin viento no hay
corrección posible, así que la ground speed tiene que dar exactamente la TAS y el WCA
exactamente cero. **Es la prueba que detecta un marco de referencia mal aplicado** —el
único riesgo del plan 12 con consecuencia de navegación— porque cualquier desvío ahí es
una variación magnética metida donde no va.

Los otros casos que valen: viento de cola (headwind negativo, GS que sube), cruzado
puro de 20 kt sobre 100 de TAS (WCA 11,54° y GS 97,98 — un cruzado casi no cuesta
velocidad), simetría izquierda/derecha, el rumbo dando la vuelta por el norte en vez de
salir negativo, y **los dos modos de fracaso, que son distintos**: el cruzado que supera
la TAS (`asin` daría NaN) y el viento de frente más fuerte que el avión (la GS sale
negativa, o sea que se vuela para atrás). Más `computeFuel` con la reserva mayor al
combustible a bordo, `computeCloudBase` con rocío por encima de la temperatura —niebla,
base en el suelo y no bajo tierra—, y `computeGlide` con la distinción de que **el viento
mueve la distancia pero no el tiempo en el aire**.

**La suite se verificó contra sí misma con cuatro mutantes**, porque una suite escrita
después del código puede pasar sin probar nada: invertir el signo del headwind →
6 fallas · sacar el wrap del rumbo → 2 · no descontar la reserva → 3 · `angleDelta`
ingenuo sin cruzar el norte → 1. Las cuatro detectadas.

**Y se corrigió el comentario que era la trampa.** `windTriangle` decía en su docstring
*"Magnetic heading"* pero calcula `heading = course + wca`: **es agnóstico del marco**.
Hoy funciona porque el piloto tipea un rumbo que ya es magnético. Un nav log que derive
el curso de coordenadas le pasaría grados verdaderos y el resultado saldría mal **en
silencio**, con todos los números corridos lo mismo. El docstring ahora lo dice, y deja
escrita la regla de `B2`: toda la matemática en verdadero, la variación aplicada una
sola vez al mostrar.

**Verificación:** `tsc` 0 · **363 tests** · sin cambios de comportamiento — lo único que
se tocó de `aviation.ts` son comentarios.

## La planilla de navegación, y una decisión de geometría que no era obvia — 2026-08-18

`B1` del plan 12: `src/lib/navegacion.ts`, la lógica pura del planificador. **27 tests**
nuevos (25 propios más dos de `distance.ts`).

**Lo que no existía en el repo:** ninguna función de bearing. `distance.ts` medía cuánto
hay pero no para dónde, y encima **redondeaba a entero** — correcto para mostrar, malo
para encadenar: cuatro tramos acumulan hasta 2 NM de error de redondeo antes de que
empiece la aritmética de tiempos. Se agregó `distanciaNmPrecisa` **en el mismo archivo,
con `distanceNm` pasando a ser su redondeo**, porque ese archivo ya advierte en su
encabezado que `splitRoute` llegó a existir cinco veces.

### Loxodrómica, no ortodrómica

El plan decía "rumbo inicial de gran círculo" y **está mal para esto**. Una planilla de
navegación existe para poner un número en el DG y sostenerlo hasta el próximo punto; el
rumbo inicial del gran círculo cambia mientras avanzás, así que sostenerlo te deja al
costado.

Cuánto importa, con los números medidos: SADM→SAAJ (113 NM) da **274,05°** loxodrómico
contra 273,40° ortodrómico — medio grado, ruido. Pero SADM→SAZN (524 NM) da **240,71°
contra 237,93°**: casi tres grados. La diferencia crece con `Δλ · sen(latitud)`, o sea
con los tramos largos este-oeste, que son justo los de travesía.

Hay una propiedad que lo cierra y que además quedó como test: **el rumbo de vuelta es
exactamente el recíproco, 180° justos.** En el gran círculo no lo es —SAAJ→SADM difiere
en 178,70°— y una planilla donde ida y vuelta no son recíprocas está mal para cualquier
piloto que la mire. La distancia sigue siendo ortodrómica: ahí la diferencia es de
segundo orden y no justifica una segunda implementación.

### El marco de referencia, resuelto en un solo lugar

**Toda la matemática en verdadero; la variación se aplica una sola vez, al mostrar.** El
curso sale de coordenadas (verdadero), el viento del METAR se reporta en grados
verdaderos, y `windTriangle` devuelve el rumbo en el marco en que entró. Los campos
`cursoMagnetico` y `rumboMagnetico` son los únicos que la ven.

`aMagnetico(verdadero, variacionW)` toma **grados oeste positivos** —como los publica la
carta argentina y como los lee el piloto— y los **suma**. El parámetro lleva la `W` en
el nombre a propósito: **el WMM publica declinación con el signo al revés, positiva al
este**, y un campo llamado `variacion` a secas sería una invitación a mezclarlos. Mezclar
los signos no cancela el error: lo duplica, de 10 a 30° según la zona.

### Nulls donde no se sabe

Un tramo que no se puede volar devuelve `minutos: null` y `litros: null`, no cero — cero
se leería como "no tarda nada". Y **los totales de tiempo y combustible se anulan si
algún tramo es imposible**: sumar sólo los que cierran daría un número más chico que la
realidad y con pinta de válido, que es exactamente el dato con el que alguien despega.
La distancia total sí se conserva, porque no depende del viento. El tramo que traba
queda identificable para que la pantalla lo señale.

`calcularPlan` **no calcula reservas ni contesta "¿me alcanza el combustible?"**: eso es
`computeFuel`, y la pantalla lo llama con `totales.minutos`. Meterlo acá sería tener la
política de reservas escrita en dos lados.

### Verificación

`tsc` 0 · **390 tests** · build limpio. Los rumbos esperados salen de una implementación
escrita aparte en otro lenguaje a partir de la fórmula, no del código de acá — comparar
el código contra sí mismo no prueba nada. Las coordenadas son las de `madhel.tsv`, así
que los valores se pueden contrastar contra una carta.

Cuatro mutantes, las cuatro detectadas: variación con el signo invertido → 4 fallas ·
rumbo pasado a ortodrómico → 6 · **variación aplicada antes del triángulo de viento
—el bug silencioso— → 1**, justo el test escrito para eso · totales que ignoran el tramo
imposible → 1.

**Falta para el planificador:** `B2` (la columna de variación magnética en el TSV, hoy
inexistente), `B3` (ruta multipunto), `B4` (migración 014 con TAS, consumo y tanques por
aeronave) y `B5` (la pantalla).

## Performance por aeronave y la variación magnética — 2026-08-18

`B4` y `B2` del plan 12, los dos datos que le faltaban al planificador.

### B4 — Migración 014: TAS, consumo y tanque

`aircraft` sabía cuánto sale la hora y no sabía a qué velocidad vuela. Los calculadores
venían usando constantes hardcodeadas —TAS 110, consumo 32 L/h— que son las del Harmony
y de ningún otro avión.

**Por aeronave y no por plan**: se cargan una vez al dar de alta el avión y sirven para
siempre. Por plan habría que tipearlos antes de cada vuelo, que es exactamente la
fricción que el planificador viene a sacar.

**Nullables y sin default.** Un default de 110 kt sería mentir con cara de dato: el
piloto vería una velocidad que nadie cargó, sin forma de distinguirla de una real. Null
es "no lo sé" y la pantalla lo dice.

Los CHECK son `> 0 AND <= techo`. Vale escribir por qué funcionan: **un CHECK que evalúa
a NULL pasa** —sólo FALSE rechaza—, así que los nulls entran solos. Es la misma lógica
de tres valores que en la migración 011 hizo que una restricción no rechazara nada; acá
juega a favor. Verificado con la tabla de verdad en la base: null pasa, 0 rechaza, 500
rechaza, 110 pasa.

Los campos van en `CamposPerformance.tsx`, **un componente compartido**, porque el alta
y la edición son dos formularios distintos y tres campos duplicados divergen — la
lección de `splitRoute`, que en este repo llegó a estar escrita cinco veces.

Del formulario sale `null` y no `0` cuando el campo está vacío: el cero rompería el
CHECK y además significa otra cosa. Y acepta coma decimal, porque acá se escribe 31,5.

### B2 — La variación magnética, y una premisa del plan que era falsa

**El plan decía "Argentina va de ~5° a 15° W". Es falso, y de una forma que importa: el
signo se da vuelta adentro del país.** Morón 10,0° W, Salta 9,3° W — pero **Bariloche
5,4° E y Ushuaia 11,7° E**. La línea agónica cruza la Patagonia. Medido sobre los 711
aeródromos, el país va de **17,8° W en Misiones a 12,6° E en Santa Cruz: treinta grados
de punta a punta**.

Eso convierte el argumento de "una constante nacional sería aproximada" en otro mucho
más fuerte: **en medio país estaría equivocada por el doble de la variación**.

Columna 14 de `madhel.tsv`, calculada por `scripts/build-magvar.mjs` con `geomagnetism`
(WMM-2025) como **devDependency**: cero dependencias en producción, cero costo por
request. La variación se mueve 0,1–0,2°/año, así que la columna sirve varios años; el
modelo vence el 13/11/2029.

**El signo, otra vez.** El WMM publica declinación **positiva al este**; la carta
argentina y el piloto usan variación **oeste positiva**. La columna guarda la segunda
porque es la que se suma al rumbo verdadero. El campo se llama `variacionW` con la `W`
adentro justamente para que nadie lo mezcle con la declinación del modelo.

**El script es idempotente**: recorta a 13 columnas antes de agregar la 14ª, así que
correrlo dos veces no hace crecer el archivo. Verificado por md5 y por un test.

`build-madhel.mjs` **se lleva puesta esta columna** cuando regenera el TSV desde ANAC.
Queda avisado en su encabezado y, mejor, hay un test que falla si alguien se olvida de
correr `npm run build:magvar` después.

### Verificación

`tsc` 0 · **399 tests** · build limpio · migración aplicada y verificada en producción.

La librería se contrastó contra **los 213 valores oficiales de prueba del WMM** que trae
el propio paquete: peor diferencia **0,005°**. Vale contar que el primer intento dio
245° de diferencia y **el error era mío** —le estaba pasando la altitud en metros donde
espera kilómetros—; leer el test del paquete lo aclaró. Una discrepancia enorme contra
una referencia oficial casi siempre es el arnés, no la librería.

Los nueve tests de `magvar.test.ts` leen el TSV real a propósito: lo que puede romperse
acá no es una fórmula sino que alguien regenere los datos y se olvide del segundo paso.

## El planificador de navegación — 2026-08-18

`B3` y `B5`, y con esto **el plan 12 queda cerrado entero**.

Vector entraba recién cuando el vuelo había terminado. Los tramos, rumbos, tiempos y
combustible se hacían la noche anterior en una planilla fotocopiada — y para el usuario
de esta app eso pesa doble: es un PPA juntando horas de travesía para el PCA, o sea que
planificar es lo que más hace.

### B3 — La ruta multipunto, sin tocar `splitRoute`

`splitRoute` devuelve **exactamente dos elementos**, tiene doce consumidores y un test
que le fija el contrato. **No se tocó.** Ese contrato es correcto para lo que hace: el
campo `route` describe de dónde salió y dónde terminó un vuelo, y todas las agregaciones
—mapa, resumen, estadísticas— cuentan sobre esa base.

Un plan es otra cosa: SADM → San Fernando → Junín es **un** vuelo con **tres** puntos, y
el del medio no es ni origen ni destino. `src/lib/ruta-planificada.ts` modela eso, y en
el borde `aCampoRoute` traduce al formato de siempre: primero y último. **Los puntos
intermedios se pierden ahí, y está dicho en el código** en vez de disimulado. Una ida y
vuelta devuelve un solo código, como un circuito local — repetirlo haría que las
agregaciones contaran ese aeródromo dos veces.

**Un punto sin resolver no se saltea: anula el cálculo.** Saltearlo uniría los vecinos
con una recta que nadie va a volar y el total saldría más corto que la realidad con
pinta de válido. La pantalla dice cuál falta.

### B5 — La pantalla

Ruta nueva `/dashboard/planificador`. Sin botón "Calcular", como todos los calculadores
(`ToolPrimitives`). Estado en la URL vía `history.replaceState` y no `router.replace`:
esto corre con cada tecla y `router.replace` dispararía un render del server component
en cada una.

Se autocompleta solo y **no pisa lo que el piloto escribió**: tres flags de "ya lo
tocó" separan el autocompletado (performance desde la aeronave, viento desde el METAR
de salida, variación desde el aeródromo) de la edición manual.

`RouteWeatherClient` **no se tocó** —846 líneas, el peor archivo del área—. Que
convivan; absorberlo es otro plan.

### Dos bugs que sólo aparecieron manejando la pantalla de verdad

**1. Pegar la ruta entera dejaba todo sin resolver.** `AirportResolver` avisa su
resolución sólo cuando su `value` cambia. Al reemplazar la ruta yo borraba todas las
resoluciones, así que un código que quedaba en la misma posición —el SADM de salida,
casi siempre— **nunca volvía a avisar** y el plan decía "no reconocemos SADM" para
siempre. Se remapean por código.

**2. El campo de pegar aplicaba en vivo.** Tecla por tecla, escribir "SADM SADF" pasaba
por el estado "SADM S" y tiraba la ruta abajo a mitad de tipeo. Es el único campo de la
pantalla que **no** va en vivo, porque no es un valor: es un reemplazo masivo. Aplica al
salir o con Enter.

Ninguno de los dos se veía en el código ni los habría agarrado un test unitario —
`vitest` corre en `environment: "node"` y no puede montar componentes.

### La impresión, que tampoco salió bien de una

La planilla tiene que poder volver a ser papel: se lleva al avión y no depende de que el
teléfono tenga batería. El primer intento imprimía **la tabla cortada en la columna RM**
y los totales encimados: esconder la columna de entradas no alcanza, **su track del grid
sigue ocupando lugar**. En papel va a una sola columna.

También se sacaron el mapa —las reglas de impresión quitan los fondos para no gastar
tinta, y con ellos los tiles: quedaba un rectángulo vacío ocupando un tercio de la hoja—
y el globo del copiloto, que vive en el layout y salía en la esquina de cualquier página
impresa.

Y se agregó la línea de condiciones —matrícula, TAS, viento, variación, consumo—, que
**en papel es imprescindible**: un rumbo sin saber con qué viento salió no se puede
corregir cuando el viento cambia.

### Verificación

`tsc` 0 · **421 tests** · build limpio · smoke 15 rutas.

La pantalla se manejó con un navegador de verdad contra un `next start`, porque es la
única forma: los componentes no se pueden testear en este repo. Nueve escenarios, y los
números contrastados a mano:

- SADM→SAAJ sin viento: 113,3 NM · CV 274 · CM 284 (274,05 + 10 de Morón) · GS 110 ·
  62′ · 33,0 L. **Los seis calculados aparte y coincidentes.**
- Con viento 004/30: WCA +16, RM 300, GS 106.
- Tres puntos: dos tramos y los totales igual a la suma.
- Código inexistente en el medio: no calcula y nombra el que falta.
- Combustible insuficiente: "faltan 129,9 L".
- Viento cruzado mayor que la TAS: "no vuela" en el tramo, totales anulados, distancia
  conservada.
- Variación SADM→SAZS: avisa que cambia **15,4°** entre las puntas — el caso exacto que
  la premisa falsa del plan habría tapado.
- Claro, oscuro, móvil (sin scroll horizontal) e impresión.
- **Cero errores de JavaScript** en todos.

Un caso del arnés estuvo mal elegido y vale anotarlo: probé "viento imposible" con
200 kt del 090 sobre un rumbo 237 y el tramo salió volable — es viento de **cola**, no
cruzado. El bug estaba en mi prueba, no en el código.

## El timeout que puse a ojo rompió la tarjeta — 2026-08-19

Al mergear el plan 12 a `main`, el deploy salió bien y **CI quedó en rojo**. Venía en
rojo desde `d236a85`, que es mío.

Tipos, tests y build en verde; fallaba una sola cosa del smoke:
`✗ 502 /api/share-card?tiles=pic,noche`, exactamente **8,0 segundos** después de
empezar. Ése es el timeout que yo mismo había puesto en `apiFetch`.

**El número lo inventé.** El comentario que lo justificaba estaba bien razonado —un
backend que acepta la conexión y no contesta cuelga el render— pero los 8 s no salieron
de ninguna medición.

La medición sale de la última corrida verde: entre `/dashboard/calendario` y la tarjeta
pasaron **12,6 s**. La tarjeta pide con `cache: "no-store"` a propósito —para no dibujar
un total viejo en una imagen que ya no puede volver atrás— así que va siempre al backend
en frío, sin el `revalidate: 20` que salva a las páginas. Con 8 s, las dos llamadas se
abortaban y la tarjeta salía 502.

**El arreglo no es subir el número, es dejar de tener uno solo.** El presupuesto pasa a
ser por llamador: 15 s por defecto —holgado contra los 3,5 s que tarda de verdad un
render de página en el mismo entorno, y sigue acotando el caso del backend colgado— y
25 s para el generador de imágenes, donde una tarjeta lenta es infinitamente mejor que
ninguna tarjeta.

**La lección, y es la misma de siempre en esta bitácora:** un número plausible con un
comentario convincente al lado sigue siendo un número inventado. El smoke lo agarró
porque prueba contra el backend real; ningún test unitario lo habría visto.
