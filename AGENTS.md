# AGENTS.md — Bitácora de agentes de Vector

Este archivo es la **bitácora obligatoria** de todo agente de IA que modifique
este repositorio. Igual que un piloto no cierra un vuelo sin cargarlo en el
libro, ningún agente cierra una tanda de cambios sin dejar su entrada acá.

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

---

## Pasos a seguir (para el próximo agente)

El plan del brief `vector-opus5-implementation-brief`
(`03-plan-implementacion.md`) está **completo: Fases 0, 1, 2, 3, 4 y 5**, más el
fix del copiloto. Lo que queda no es una fase nueva sino deuda concreta:

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
