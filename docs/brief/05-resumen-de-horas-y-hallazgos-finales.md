# Hallazgos finales — "Resumen de Horas" y otros detalles no cubiertos antes

Tercera pasada de research. Esta vez se exploró a fondo una pantalla de FlightDeck que no se había mirado en detalle en los briefs anteriores: **Logbook → Resumen** (`/logbook/resumen`, separada del Dashboard principal). Es, de lejos, la pantalla con más ideas nuevas aprovechables — más que cualquier otra cosa encontrada hasta ahora. También se revisó Herramientas y CV Aeronáutico para cerrar el mapa completo de FlightDeck.

---

## 1. La pantalla "Resumen de Horas" de FlightDeck — no tiene equivalente en Vector

Es una página separada del Dashboard, dedicada 100% a estadísticas de vuelo. Estructura completa, de arriba a abajo:

1. **Header**: "Resumen de Horas — Tu carrera como piloto, narrada por los datos" + selector de período (28D / 90D / 6M / 1A / Todo) como pills.
2. **Contador grande de horas acumuladas**, en tipografía odómetro (similar a lo que Vector ya tiene en su Dashboard, pero con la parte decimal en gris/más chica — un detalle tipográfico lindo).
3. **6 mini-cards de stats**: PIC, IFR, Noche, Multi, Aterrizajes, Vuelos — cada una con ícono, valor grande y caption.
4. **"Desglose ANAC" como matriz/tabla**, no como gráfico: filas = Local / Travesía, columnas = Día PIC / Día COP / Noche PIC / Noche COP, más una fila aparte para IMC PIC / IMC COP / Capota / Instructor / Multimotor. La celda con datos se resalta con fondo azul sólido. Es un vistazo instantáneo de "en qué categoría están cargadas mis horas" sin tener que abrir cada vuelo — complementa (no reemplaza) el desglose por vuelo que ya se armó en Nuevo Vuelo.
5. **"Dónde volé"**: un **mapa real** (Leaflet + OpenStreetMap, con zoom y controles), con un marcador circular por aeródromo visitado, más una lista lateral "Top Aeródromos" con barras horizontales de frecuencia. Esto es sustancialmente distinto de "Ruta METAR" de Vector (que es un diagrama de nodos para planificar una ruta multi-tramo antes de volar) — acá es un mapa retrospectivo de historial real, geográfico.
6. **"Horas por mes"**: gráfico de línea con promedio y una línea de tendencia móvil de 3 meses togglable.
7. **"Hora del día"**: un **gráfico radial tipo reloj** (00:00 arriba, 06:00 derecha, 12:00 abajo, 18:00 izquierda) con una cuña azul mostrando en qué franja horaria vuela más el usuario, y un círculo central con "PEAK 14:00". Debajo, desglose en 4 franjas (Mañana/Tarde/Atardecer/Madrugada) con horas de cada una.
8. **"Top rutas"**: rutas más voladas con mini-ícono de trazo punteado, nombres completos de los aeródromos, cantidad de veces volada y horas totales.
9. **"Lo que tus datos cuentan"** — la pieza más distintiva de toda la app: 3 tarjetas de **insights generados automáticamente en lenguaje natural** a partir de los datos del usuario, cada una con un ícono + eyebrow chico (PATRÓN SEMANAL, MEJOR MES, FAVORITA) + titular en negrita + una frase explicativa con tono humano. Ejemplos reales vistos: "Preferís días de semana — 0% de tus horas son sábado o domingo. Tu cockpit de fin de semana está listo.", "Jul 2026 fue tu techo · 1.5hs — Tu mes más intenso en este período. Buena energía para sostenerlo.", "LVTST te conoce mejor — 1 vuelos registrados en esa matrícula. Relación establecida." No son solo números: es la app "leyendo" el logbook y devolviendo una narrativa corta. Es probablemente el elemento con más personalidad de todo FlightDeck.
10. **"Por aeronave"**: lista de matrículas con vuelos/PIC/total por fila (Vector ya cubre esto con su donut chart — no es un gap, son dos formas válidas de mostrar lo mismo).

**Por qué esto importa más que un ajuste de color:** Federico dijo que lo que le gusta de FlightDeck es la sensación de interacción, pero esta pantalla en particular no es sobre interacción — es sobre que el producto se sienta "vivo" y como que conoce al piloto. El punto 9 (insights auto-generados) es el tipo de feature que genera el "wow" que separa un logbook de una app con personalidad.

**Sugerencia de alcance, de menor a mayor esfuerzo:**
- Mapa real de "dónde volé" (esfuerzo M — reutiliza la tabla `airports` de la Fase 0, solo hace falta plotear coordenadas ya guardadas con una librería de mapas como Leaflet o Mapbox).
- Matriz ANAC de solo lectura (esfuerzo S — es una tabla derivada de datos que Vector ya calcula para el desglose de cada vuelo, solo falta agregarlos).
- Gráfico radial de hora del día (esfuerzo S-M — cálculo simple de distribución horaria + un componente de gráfico circular, hay librerías que lo resuelven directo).
- Insights auto-generados (esfuerzo M — es lógica de reglas simples sobre datos ya existentes, no requiere IA para los ejemplos vistos: "% fin de semana", "mejor mes", "aeronave más usada" son cálculos directos, no generación de lenguaje real).

---

## 2. Herramientas — Vector ya resolvió esto mejor, no copiar el patrón de FlightDeck acá

FlightDeck: grid de 7 cards, cada una lleva a una **página nueva** por calculadora.

Vector: una sola página con un **tab-bar horizontal** (Conversor, Combustible, Viento, Altitud, Base de nubes, Planeo, Piernera) que cambia de calculadora al instante sin navegar, con un panel de "Resultado" bien resuelto (número grande + explicación de la conversión en texto).

Esto es, con bastante confianza, una decisión de UX mejor en Vector que en FlightDeck — menos clics, sin recargas de página. No hay nada que cambiar acá; vale la pena que Federico lo sepa para no "corregir" algo que ya está mejor que el original.

---

## 3. CV Aeronáutico — confirma baja prioridad, sin cambios de recomendación

Se abrió brevemente para confirmar que sigue siendo una feature de "carrera" separada del logbook (gestión de CVs con versión, estado de compartición, límite de 1 CV en plan Free). No agrega nada nuevo a lo ya documentado — se mantiene como Fase opcional de largo plazo, sin prioridad por ahora.

---

## Tabla de prioridad actualizada (agrega a la de `04-hallazgos-adicionales-fase1.5.md`)

| # | Qué | Esfuerzo | Por qué vale la pena |
|---|---|---|---|
| 7 | Mapa real "Dónde volé" en el Dashboard o una nueva pestaña de stats | M | Es geográfico y retrospectivo, distinto a todo lo que ya existe en Vector |
| 8 | Matriz ANAC de solo lectura (Local/Travesía × Día/Noche × PIC/COP) | S | Reusa datos ya calculados, alto valor visual por bajo esfuerzo |
| 9 | Gráfico radial "hora del día" | S-M | Detalle distintivo, refuerza la idea de "el producto me conoce" |
| 10 | Insights auto-generados ("Lo que tus datos cuentan") | M | El elemento con más personalidad de FlightDeck — no requiere IA, son reglas simples |
| — | Herramientas: no tocar, Vector ya está mejor resuelto que FlightDeck acá | — | — |
| — | CV Aeronáutico | L | Sigue siendo opcional / largo plazo |
