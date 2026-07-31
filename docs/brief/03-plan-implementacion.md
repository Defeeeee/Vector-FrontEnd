# Plan de implementación — priorizado por brecha de UX con FlightDeck

Referencias: ver `01-benchmark-flightdeck.md` para el detalle de cada patrón, y `02-estado-actual-vector.md` para el punto de partida exacto de cada pantalla.

Federico fue explícito: lo que más le gustó de FlightDeck es la **sensación de interacción** (todo responde al toque, previene errores en vez de mostrarlos después), no una lista de features nuevas. Por eso las Fases 0 y 1 van primero aunque no agreguen ninguna pantalla nueva — son las que más cambian la sensación de usar el producto.

---

## Fase 0 — Infraestructura de aeródromos ICAO

**Objetivo:** que cualquier campo ICAO en Vector (Nuevo Vuelo, futuro FPL, Aeronaves) resuelva el nombre del aeródromo en vivo, como `SADM → Morón` en FlightDeck.

**Backend**
- Tabla `airports`: `icao`, `iata`, `name`, `municipality`, `country`, `lat`, `lon`, `type`, `source`.
- Job de ingesta: descargar `data.ourairports.com/data/airports.csv` (dominio público, ~80k aeródromos mundiales) y hacer upsert.
- Overlay: para ICAO que empiezan con `SA` (Argentina), enriquecer con los datos que Vector ya trae de MADHEL (pistas, frecuencias, combustible), ya que esa integración existe para otras features.
- Endpoint `GET /airports/search?q=SADM` indexado por prefijo, respuesta <50ms.
- Cron mensual de refresco.

**Frontend**
- Componente `AirportResolver` reutilizable: input + debounce (~150ms) + fetch a `/airports/search`, mostrando el nombre resuelto en texto chico debajo del input apenas hay match — igual que FlightDeck.

**Esfuerzo:** M. Bloquea la Fase 1.

---

## Fase 1 — Rediseño de "Nuevo Vuelo" (máxima prioridad de producto)

Ruta actual: `/dashboard/log-flight`. Sección "01. Información general" y "02. Desglose de tiempos" son el foco.

**Frontend**

1. Reemplazar el input único "Ruta" (hoy texto libre tipo "SAEZ SACO") por **dos inputs separados** (origen/destino) usando `AirportResolver` de la Fase 0, conectados con una flecha, replicando el patrón visual de chip grande de FlightDeck (texto centrado, mayúscula, ~24px). Agregar toggle **Local / Travesía** debajo, auto-detectado según si origen = destino, pero editable a mano.

2. Sumar, junto al "Tiempo (h)" que ya se autocalcula, un segundo valor visible: el **tiempo redondeado por la regla 0.3** (15 min = 0.3 hs) — hoy solo se muestra un número, falta la distinción entre block time crudo y tiempo ANAC aplicado, como hace FlightDeck.

3. **Rediseñar completo "02. Desglose de tiempos"** (hoy: 8 inputs numéricos planos PIC/SIC × Día/Noche × Loc/Tra) a un patrón **toggle + slider**:
   - Cada categoría arranca apagada y colapsada.
   - Al activar el toggle, aparece un slider cuyo máximo es el **tiempo restante sin asignar** (Total − suma de categorías ya activas) — nunca el total completo. Esto hace estructuralmente imposible cargar una suma que supere el vuelo real; no hace falta el mensaje de error post-submit que existe hoy.
   - Mantener el comportamiento actual de pre-cargar el valor total en la categoría por defecto (PIC Día Local) para no perder ese ahorro de tipeo en el caso común — simplemente ese valor inicial ahora es el estado inicial del toggle+slider correspondiente, no un input de texto.
   - Mostrar siempre visible un chip con el Total del vuelo (igual al de FlightDeck), y opcionalmente un segundo chip con la categoría recién asignada, para dar feedback sin tener que mirar todo el desglose.
   - Aplicar el mismo patrón a "03. Condiciones y simulador" (IMC Piloto, IMC Copiloto, Capota, Sim. Inst., Sim. Piloto) — son la misma clase de dato (tiempo parcial dentro del total) y hoy tienen el mismo problema.

4. Construir un hook compartido `useAnacBreakdown(totalHours)` que centralice la lógica de "máximo disponible = total − suma de otras categorías activas", usado tanto en el desglose principal como en condiciones/simulador, para no duplicar la lógica de validación en dos lugares.

5. Reemplazar los `<select>` nativos de Aeronave y Finalidad por el mismo componente de select estilizado que ya usa el resto de la app (revisar qué librería de UI ya está en uso en el repo — probablemente ya hay un patrón para esto en otro formulario) para que no rompan la consistencia visual.

6. Mantener sin cambios: el panel "Modo operativo — Vuelo en vivo" (cronómetro), y el campo "04. Descuento aplicado" — son diferenciadores de Vector, no tocar su lógica.

**Backend**
- Confirmar que el modelo de datos ya soporta guardar estas categorías por separado (según la documentación original del producto, sí) — si es así, esta fase es mayormente frontend salvo la Fase 0.
- Si hoy la validación de "suma ≤ total" vive solo como validación de backend al guardar, mantenerla igual como defensa en profundidad, aunque el frontend ya lo prevenga estructuralmente.

**Esfuerzo:** M-L. Es la fase de mayor impacto percibido — vale invertir en pulir la animación del slider (Framer Motion, que ya está en el stack) y el comportamiento de teclado/accesibilidad del control.

---

## Fase 2 — Motor de auditoría del logbook

Hoy no existe ninguna versión de esto en Vector.

**Backend**
- Tabla `audit_findings`: `id`, `user_id`, `flight_id`, `rule_type` (`overlap` | `unregistered_aircraft` | `duplicate` | `inconsistent_total` | `unassigned_book` si Vector tiene concepto de "libros"), `severity` (`critical` | `warning`), `message`, `suppressed` (bool), `suppressed_reason`, `created_at`, `recalculated_at`.
- Reglas iniciales: superposición temporal entre vuelos del mismo usuario; aeronave referenciada que no existe en el Hangar; duplicados (mismo origen/destino/fecha/matrícula/horarios); inconsistencia si la suma de segmentos PIC/SIC no coincide con el total (esto Vector ya lo valida al guardar — acá se trata de dejarlo también como hallazgo auditable retroactivo, no solo bloqueo en el submit).
- Trigger de recálculo al crear/editar/borrar un vuelo, para ese vuelo y los que se solapen en fecha.
- Endpoints: `GET /audit/summary`, `GET /audit/findings`, `POST /audit/findings/:id/suppress`.

**Frontend**
- Nueva página bajo un ítem de nav nuevo (hoy el sidebar solo tiene 5 íconos: Dashboard, Historial, Balance, Ruta METAR, Configuración — agregar "Auditoría" ahí, con el mismo estilo de ícono).
- 3 cards de conteo (Críticas/Advertencias/Suprimidas) + lista expandible por regla, igual al patrón de FlightDeck.
- Badge numérico en el ícono de nav cuando hay hallazgos sin resolver.
- Card "Salud del logbook" en el Dashboard actual (encaja bien cerca de la card de PCA que ya existe), con link directo.

**Esfuerzo:** L.

---

## Fase 3 — Heatmap de actividad en el Dashboard

El dashboard de Vector ya tiene más variedad de gráficos que FlightDeck (barras, dona, área acumulada) — esta fase es puntual, no una reconstrucción.

**Backend**
- Endpoint `GET /stats/activity-heatmap?months=12`: días con vuelo + horas por día.

**Frontend**
- Grid CSS de cuadraditos por día (no necesita librería, es un patrón simple), coloreado por intensidad, con leyenda "menos → más" y tooltip on hover. Ubicarlo cerca de la card "Horas acumuladas" que ya existe.

**Esfuerzo:** S.

---

## Fase 4 — Tracker de vencimientos de documentación completo

Hoy Vector solo tiene el campo "Vencimiento CMA" en Configuración. Esta fase lo reemplaza por un sistema real.

**Backend**
- Tabla `documents`: `id`, `user_id`, `category`, `subcategory`, `class_or_type`, `expiry_date`, `restrictions`, `file_url` (nullable), `created_at`.
- Taxonomía (igual a la relevada en FlightDeck, sección 5 de `01-benchmark-flightdeck.md`): Licencias y Habilitaciones, Certificaciones, Certificados ANAC, Documentos Personales, Otro.
- Cron diario de alertas con umbral configurable (sugerido default: 60/30/7 días).
- Tie-in con el bot de WhatsApp ya existente: reutilizar el motor de function-calling para mandar el aviso de vencimiento por WhatsApp además de (o en vez de) notificación in-app — esto FlightDeck no lo puede hacer y Vector sí, aprovechando infraestructura ya construida.
- Endpoints CRUD `/documents`, `GET /documents/alerts`.
- Migrar el campo actual "Vencimiento CMA" de Configuración a ser una entrada más dentro de esta tabla (categoría "Certificaciones" → "Certificado Médico (CMA)"), no un campo aparte.

**Frontend**
- Nueva página "Documentación" en el nav.
- Modal "Agregar documento" con selector de categoría → clase/tipo → fecha de vencimiento → restricciones opcionales.
- Banner en Dashboard con el documento más próximo a vencer dentro del umbral (patrón "X vence en N días").

**Esfuerzo:** M.

---

## Fase 5 — Calculadoras operativas (quick wins, en paralelo)

100% frontend, sin dependencia de backend. Se pueden hacer en cualquier momento sin bloquear nada.

1. Conversor de unidades aeronáuticas.
2. Combustible (consumo/autonomía).
3. Viento (triángulo y deriva).
4. Altitud densidad y de presión.
5. Base de nubes.
6. Planeo.
7. Piernera (bloc de notas + cronómetros de cabina).

**Esfuerzo:** S cada una.

---

## Fases opcionales, más largo plazo

- **FPL OACI**: solo si Vector quiere cubrir pre-vuelo además de logbook. Requiere ampliar el modelo de Aeronave con campos de equipamiento fijo (10a/10b, ítem 18/19) para poder autocompletar, igual que FlightDeck. Esfuerzo L, prioridad baja por ahora.
- **CV Aeronáutico / Carrera**: solo si es una decisión de producto explícita de expandirse más allá de logbook. Esfuerzo L, prioridad baja.

---

## Corrección rápida, no depende de nada

Ajustar el system prompt del copiloto IA para que nunca incluya IDs internos de base de datos en las respuestas visibles al usuario (se detectó un UUID expuesto al preguntar por el vuelo más largo). Esfuerzo trivial, hacerlo apenas se toque ese código.

---

## Orden sugerido

| Fase | Qué | Depende de | Esfuerzo | Por qué esta prioridad |
|---|---|---|---|---|
| 0 | Aeródromos ICAO | — | M | Bloquea Fase 1 |
| 1 | Nuevo Vuelo: toggle+slider, ICAO resolve | Fase 0 | M-L | Máximo impacto en la sensación de uso — pedido explícito de Federico |
| 2 | Motor de auditoría | Fase 1 | L | Brecha total hoy — no existe nada |
| 3 | Heatmap de actividad | — | S | Rápido, completa un dashboard que ya es fuerte |
| 4 | Documentación completa | — | M | Landing promete esto y hoy es un solo campo |
| 5 | Calculadoras | — | S | Relleno de bajo riesgo, en paralelo a cualquier fase |
| — | FPL OACI | Fase 0 | L | Opcional, largo plazo |
| — | CV / Carrera | Fase 4 | L | Opcional, decisión de producto aparte |
