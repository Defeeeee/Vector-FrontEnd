# Benchmark detallado: FlightDeck (flightdeck.ar)

Todo lo de este documento fue probado en vivo en una cuenta de prueba de FlightDeck (con permiso explícito de Federico de crear datos de prueba ahí — a diferencia de Vector, esa cuenta no la usa). Cada sección describe el patrón de interacción con precisión suficiente para reproducirlo sin necesidad de la captura de pantalla original.

---

## 1. Resolución de ICAO en tiempo real

Al cargar un vuelo, los campos de aeródromo son dos inputs de texto cortos (ancho ~140px), estilo "chip" grande con el texto centrado y en mayúscula (ej. `SADM`, tipografía grande ~24px), conectados por una flecha `→` entre ambos. Debajo de cada input, en gris chico, aparece el nombre resuelto del aeródromo apenas el ICAO es válido (ej. debajo de `SADM` aparece "Morón", debajo de `SAEZ` aparece "Ezeiza"). No hay botón de confirmar — el resolve pasa solo, con debounce corto mientras se tipea. Esto da la sensación de "el sistema ya sabe dónde estoy" antes de terminar de escribir.

Debajo de los dos inputs hay un toggle de dos botones: **Local** / **Travesía**, mutuamente excluyentes, que FlightDeck marca automáticamente según si origen y destino son el mismo aeródromo (Local) o distintos (Travesía) — el usuario puede overridearlo a mano.

## 2. Cálculo en vivo de horarios

Dos campos "Hora salida" / "Hora llegada", con un toggle **UTC** / **Local (-3)** arriba (Argentina). Apenas se completan ambas horas, aparece automáticamente, sin submit:

- Un chip negro grande con el **Block Time** (ej. "1:30"), calculado como diferencia entre llegada y salida.
- Debajo, un número en azul: el **"Tiempo ANAC"** — el block time redondeado según la regla de 0.3 (15 minutos = 0.3 horas), que es lo que efectivamente se carga al logbook. Este número es el que alimenta el resto del formulario (el desglose de abajo no puede superar este valor).
- Debajo de cada input de hora aparece chico el equivalente en UTC/local (el que no se eligió como principal), para que el usuario pueda verificar sin cambiar el toggle.

## 3. Desglose PIC/SIC — el patrón más importante a copiar

Esto vive en un panel lateral deslizable ("Ajustar Valores") que se abre al tocar un botón "Ajustar valores y desglose ANAC" debajo del bloque de horarios. Arriba del todo del panel: un chip fijo con **Total Block Time** (hora y decimal, ej. "1:30 — 1.5") que queda visible todo el tiempo mientras se scrollea el resto del panel.

Debajo, agrupado por secciones (**Travesía (XC)**, **Discriminación de tiempos**, **Vuelo por instrumentos**), cada categoría (Día PIC, Día COP, Noche PIC, Noche COP, Instructor, IMC PIC real, IMC COP real, Capota) se muestra como una fila con:

- Nombre de la categoría a la izquierda.
- Un número en negro a la derecha mostrando el valor actual (arranca en "0").
- Un **toggle switch** (interruptor on/off) a la derecha del todo.

Mientras el toggle está apagado, la fila está colapsada — no ocupa espacio de slider. Al activarlo, aparece debajo un **slider horizontal** (thumb circular negro sobre línea gris), cuyo rango va de 0 al **tiempo restante sin asignar** del Total Block Time (no al total completo — al total menos lo que ya esté asignado en otras categorías activas). Esto es la pieza clave: es **físicamente imposible** arrastrar el slider más allá de lo que queda disponible, así que nunca se puede cargar un desglose cuya suma supere el vuelo real. No hay mensaje de error porque el error no puede ocurrir.

Al mover el slider, el número de esa fila se actualiza en vivo, y en el header del bloque de vuelo (fuera de este panel) aparecen dos círculos: uno con el "Total" y otro con la etiqueta de la categoría más reciente activada (ej. "1.5 XC PIC"), dando feedback inmediato de qué quedó cargado sin tener que abrir el panel de nuevo.

## 4. Motor de auditoría

Sección de nav propia ("Auditoría", dentro de Logbook), con tres cards arriba: **Críticas** (rojo), **Advertencias** (amarillo), **Suprimidas** (gris), cada una con un número grande y un ícono. Debajo, una lista de "reglas con advertencias/críticas", cada una expandible, mostrando cuántos vuelos afecta y un texto explicativo en lenguaje llano (ej. "El vuelo no está asignado a ningún libro. Asignarlo ayuda a ordenar tus horas."). Cada finding se puede "suprimir" con una justificación de texto, y se recalcula automáticamente si el vuelo relacionado se edita.

El hallazgo más importante de UX: **el badge de conteo aparece en el ítem de navegación del sidebar** (un círculo naranja con el número) apenas hay algo pendiente — no hace falta entrar a buscarlo. Y además aparece como card destacada en el Dashboard principal ("Salud del logbook — 1 advertencia — Revisá los detalles en Auditoría"), con click directo a la sección. El usuario se entera del problema sin buscarlo activamente.

## 5. Tracker de vencimientos de documentación

Página "Documentación" con estado vacío claro ("Empezá a cargar tu documentación") y botón "Agregar documento" que abre un selector categorizado:

- **Licencias y Habilitaciones**: Licencia de vuelo, Habilitación de vuelo.
- **Certificaciones**: Certificado Médico (CMA), Inglés OACI, Certificado ORR.
- **Certificados ANAC**: Cert. Horas de Vuelo, Cert. Validez de Licencia, Cert. Antecedentes Penales.
- **Documentos Personales**: Pasaporte, Visa B1/B2 EE.UU.
- **Otro**: Documento personalizado (nombre libre).

Al elegir una categoría se abre un modal chico con: **Clase** (select, ej. clase del CMA), **Fecha de vencimiento** (date picker nativo), **Restricciones** (texto libre opcional, ej. "uso de lentes correctivos"), y un botón "Adjuntar documento" marcado "Premium" (bloqueado en free, mostrado igual pero deshabilitado — señal de upsell sin ocultar la función).

Una vez guardado, si el documento está por vencer dentro de un umbral, aparece un banner en el Dashboard con el patrón "Visa B1/B2 vence en 53 días" — texto directo, sin necesidad de abrir la sección.

## 6. Dashboard general

Cards de estadística con **sparkline chico** integrado en la esquina (Horas Totales, Últimos 90 días, Aeronave preferida, Aeródromos visitados). Debajo, un **heatmap de actividad** estilo GitHub-contributions (grid de cuadraditos por día, 12 meses, intensidad de color según horas voladas ese día, con leyenda "menos → más" y opción de hover para ver el detalle de un día).

Card "Tu base" — detecta automáticamente el aeródromo de salida más frecuente del usuario y muestra ahí mismo el clima decodificado: condición (VFR/IMC con badge de color), viento, visibilidad, techo, QNH, y el código METAR crudo colapsable con botón de copiar. Tiene un tab secundario para NOTAMs del mismo aeródromo.

## 7. Plan de Vuelo OACI (FPL)

Formulario que respeta la numeración de ítems real del formulario OACI Doc 4444 (Item 7 Aircraft Identification, Item 8 Flight Rules, Item 9 Number/Type/Wake Turbulence, Item 10a/10b Equipment, Item 13 Departure Aerodrome/Time, Item 15 Cruising Speed/Level/Route, Item 18 Datos fijos, Item 19 Equipo de emergencia). Toggle EN/ES arriba. Tiene un selector "Cargar datos de mis aeronaves" que autocompleta todo el formulario desde el perfil de la aeronave guardada — el truco es que el modelo de datos de Aeronave en FlightDeck ya incluye los campos de equipamiento ICAO fijos (10a/10b, ítem 18, ítem 19) para que este autocompletado funcione, no son campos que se piden recién en el FPL.

## 8. Calculadoras operativas

Grid de 7 tarjetas simples (ícono + nombre + descripción de una línea), cada una lleva a una calculadora dedicada: Conversor de unidades, Combustible, Viento (triángulo y deriva), Altitud densidad, Base de nubes, Planeo, Piernera (bloc de notas + cronómetros). Todas gratis, sin dependencia de datos de usuario — son utilidades puras.

## 9. CV Aeronáutico (fuera de alcance inmediato, pero vale documentarlo)

Patrón de "perfil con barra de completitud" (ej. "19%"), con secciones (Datos Personales, Licencias y Habilitaciones, Programas y Cursos, Experiencia de Vuelo, Experiencia Laboral, Formación Académica) que muestran un ícono de warning amarillo y texto específico de qué falta (ej. "Falta: DNI, domicilio, teléfono", "Completá el desglose de horas PIC/SIC"). Autopoblado desde el logbook real del usuario. Exportable a PDF y como link compartible.

## 10. Detalle de negocio, no de UI

AIR Copilot (su IA) y NOTAMs están bloqueados detrás de plan pago ("Basic y Pro") en la práctica, aunque la landing los insinúa como parte del free. Esto es relevante porque el copiloto de Vector es gratis y funciona ya — es un argumento de venta real, no solo un detalle de paridad de features.
