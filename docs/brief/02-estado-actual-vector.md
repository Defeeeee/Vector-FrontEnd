# Estado actual de Vector (probado en cuenta real de producción)

Esto se probó navegando la cuenta real de Federico en vector.fdiaznemeth.com.ar. **No se creó ni modificó ningún dato** — el formulario de "Nuevo vuelo" se llenó a modo de prueba y se descartó sin guardar. Los números de referencia (39 vuelos, 46.3 hs totales) son reales y no cambiaron durante la sesión.

## Navegación actual

Sidebar con 5 íconos: Dashboard (grid), Historial/Bitácora (reloj), Balance (billetera), Ruta METAR (nube), Configuración/Hangar (engranaje) — más un botón "+" flotante abajo para "Nuevo vuelo". Comparado con FlightDeck (11 ítems de nav), Vector tiene una superficie de navegación mucho más chica — lo cual puede ser una virtud (menos ruido) pero hoy es así porque faltan secciones, no porque se haya simplificado a propósito (no hay Auditoría, no hay Documentación dedicada, no hay Aeropuertos).

## Dashboard — punto fuerte actual, no tocar la esencia

Ya tiene, con buen pulido visual:

- Card oscura grande arriba con contador tipo odómetro de horas totales (dígitos individuales en cajitas negras) + bar chart chico "Horas por mes" + fila de stats (Vuelos, Aeródromos, Récord).
- Fila de 4 stat cards chicas (Promedio Vuelo, Aterrizajes, Destino más frecuente, Aeronaves).
- Card de "Paquete de vuelo" activo con barra de progreso y % disponible.
- Card de estación meteorológica (METAR decodificado: condición VFR/IMC, viento, temperatura, código METAR crudo con botón copiar, TAF colapsable, botón "Actualizar clima", e input para consultar otro ICAO).
- "Tracker PCA Reg. 61.620" con badge "En progreso".
- Bar chart "Horas por mes" (tendencia temporal) y donut chart "Horas por aeronave" (distribución de flota) — dos gráficos separados y bien logrados.
- Card oscura grande "Horas acumuladas" con gráfico de área/línea mostrando la progresión total desde el primer vuelo hasta hoy (eje temporal real, no solo últimos meses).

**Conclusión: en variedad de gráficos, el dashboard de Vector ya iguala o supera al de FlightDeck.** No hace falta rehacerlo — sí vale la pena sumarle el heatmap de actividad estilo GitHub que tiene FlightDeck, que es un patrón distinto (frecuencia de vuelo día a día) a lo que ya existe acá (que es todo agregado por mes/aeronave).

## Nuevo Vuelo — acá está la brecha más grande

Ruta: `/dashboard/log-flight`. Formulario de una sola pantalla (no modal), con secciones numeradas "01. Información general", "02. Desglose de tiempos", "03. Condiciones y simulador", "04. Descuento aplicado". A la derecha, un panel fijo "Modo operativo — Vuelo en vivo" con selector de aeronave y botón "Iniciar cronómetro" (el clock-in/clock-out que Federico describió — esto funciona bien y FlightDeck no tiene un equivalente directo, es un plus de Vector).

Problemas concretos encontrados:

1. **Campo "Ruta" es un único input de texto libre** (placeholder "SAEZ SACO"), sin separar origen/destino, sin resolver a nombre de aeródromo, sin badge Local/Travesía automático. El usuario tiene que saber de memoria o buscar en otro lado qué significa cada ICAO.
2. **"Tiempo (h)" sí se autocalcula** en vivo al completar Despegue/Aterrizaje (UTC) — esto ya funciona bien, es equivalente al Block Time de FlightDeck. Lo que falta es el segundo número (tiempo redondeado por regla 0.3) mostrado por separado — hoy solo se ve un valor.
3. **"02. Desglose de tiempos" son 8 inputs numéricos de texto plano**: PIC DÍA LOC, PIC DÍA TRA, PIC NOC LOC, PIC NOC TRA, SIC DÍA LOC, SIC DÍA TRA, SIC NOC LOC, SIC NOC TRA. El sistema pre-carga el tiempo total en "PIC DÍA LOC" por default (buen detalle, ahorra tipeo en el caso más común), pero si el vuelo real fue de noche, travesía, o con SIC, el usuario tiene que borrar y redistribuir a mano entre estos 8 campos sin ningún límite visual ni total corriendo a la vista. No hay sliders, no hay toggles, no hay prevención de que la suma supere el total (la validación existe pero es post-submit, según la documentación original del producto).
4. **"03. Condiciones y simulador"**: IMC PILOTO, IMC COPILOTO, CAPOTA, SIM. INST., SIM. PILOTO — mismos inputs numéricos planos, mismo problema.
5. **"04. Descuento aplicado"** — select de "Tipo de descuento" (Sin descuento / otros). Esto es un campo que FlightDeck no tiene, ligado al sistema financiero de Vector — mantenerlo, es una diferenciación real.
6. **Selects nativos del navegador** para Aeronave y Finalidad (sin estilizar como el resto de la UI, que es prolija) — visualmente no está mal pero rompe la consistencia con inputs custom que sí tiene el resto del formulario.
7. Botón "Importar desde PDF (Beta)" ya existe en esta pantalla — confirma que la importación de bitácora en papel (descripta originalmente por Federico) está al menos en beta.

## Balance — punto fuerte, FlightDeck no tiene equivalente

`/dashboard/balance`. Dos tabs: "Packs de horas" / "Saldo en cuenta ($)". Muestra packs activos con barra de progreso (horas restantes / total), aeronaves habilitadas para ese pack, historial de consumo expandible, y a la derecha una lista de "Costos aeronaves" con horas disponibles por matrícula. Bien resuelto, no toca esta sección salvo por consistencia visual con el resto.

## Ruta METAR (planificador multi-tramo) — punto fuerte, mejor que FlightDeck en este punto

`/dashboard/route-weather`. Input para pegar una ruta completa (ej. "SADF SAAK SAEZ"), botón "Calcular ruta", lista de "Rutas frecuentes" clickeables para recalcular rutas ya usadas. Resultado: diagrama horizontal con un nodo por aeródromo (color por condición: verde VFR, gris UNK, azul MVFR), banner de advertencia automático si hay condiciones marginales en algún tramo ("Precaución: se detectó techo bajo o visibilidad reducida en SAEZ..."), y debajo "Reportes detallados por estación" con viento/temperatura por aeródromo. Esto es más rico que el lookup de un solo aeródromo por vez que tiene FlightDeck — no tocar la lógica, si acaso sumarle NOTAMs por estación si no los tiene ya.

## Configuración / Hangar

`/dashboard/settings`. Incluye: perfil del piloto con licencia ANAC y **un único campo "Vencimiento CMA"** (fecha), gestión de flota (cards de aeronave con matrícula/marca-modelo/tipo ICAO/categoría), formulario "Agregar nueva aeronave", y la creación de packs de horas (nombre, total de horas, fecha de inicio, aeronaves válidas con checkboxes).

**Esto es el único tracking de vencimiento que existe hoy en todo Vector: un campo de fecha.** No hay categorías (licencia de vuelo, habilitaciones, inglés OACI, ORR, pasaporte, visa, antecedentes penales), no hay alertas configurables, no hay página dedicada de Documentación. La landing de Vector promete "Monitoreo de vencimientos médicos y licencias" como feature — hoy es mucho menos de lo que promete.

## Copiloto IA

Chat flotante (burbuja azul abajo a la derecha), siempre visible, sin paywall. Al abrirse muestra preguntas sugeridas ("¿Cuántas horas totales tengo?", "¿Cuál fue mi vuelo más largo?", etc.) y responde en 2-3 segundos con datos reales del usuario ("Powered by Gemini · Tus datos nunca se almacenan" como nota de privacidad). **Funciona bien y está disponible en el tier gratis — mantenerlo así, es ventaja competitiva directa contra FlightDeck.**

Un detalle a corregir: al preguntarle por el vuelo más largo, la respuesta incluyó el UUID interno del registro entre corchetes (ej. `[ID: d8342011-be9f-4308-858b-6ebde90f8b94]`). Es un detalle de implementación filtrándose al usuario — ajustar el system prompt del copiloto para que no incluya IDs internos en las respuestas visibles.

## Faltantes confirmados (no encontrados en ninguna sección)

- Motor de auditoría (superposiciones, aeronaves no registradas, duplicados).
- Página de Documentación con categorías y alertas.
- Plan de Vuelo OACI / FPL.
- Página de Aeropuertos con pistas/frecuencias/combustible y NOTAMs oficiales por aeródromo (Ruta METAR cubre clima, no esto).
- Calculadoras operativas.
- Resolución de ICAO a nombre en cualquier input.
