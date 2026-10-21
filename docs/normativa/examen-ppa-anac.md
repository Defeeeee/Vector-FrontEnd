# El banco de preguntas del examen de Piloto Privado (PPA) de ANAC

De dónde salen las preguntas de la práctica (`/guias/examen-ppa`, `src/data/examen-ppa.json`).

## La fuente

La página del examen de PPA de ANAC publica, para alumnos e instructores:
<https://www.argentina.gob.ar/anac/personal-aeronautico/examenes/ppa-piloto-privado-de-avion>

| Archivo | Qué trae |
|---|---|
| [Preguntas de acuerdo RAAC 61.105](https://www.argentina.gob.ar/sites/default/files/2021/05/preguntas-segun-raac-61-105.pdf) (108 páginas) | **385 preguntas con la respuesta correcta marcada** (un `*`). "Publicación de Preguntas Resolución Nº 306/2014", septiembre de 2014: "Las siguientes preguntas con sus respuestas corresponden al programa de instrucción reconocida del curso teórico de Piloto Privado. RAAC 61.105 Conocimientos aeronáuticos. El cuestionario formará parte de la evaluación de los exámenes de idoneidad." |
| [Preguntas de todos los capítulos](https://www.argentina.gob.ar/sites/default/files/2021/05/preguntas-todos-los-capitulos-ppa.pdf) (60 páginas) | 313 preguntas **sin** la respuesta, ordenadas en 8 capítulos: aerodinámica básica, grupo motopropulsor, instrumentos de vuelo, regulaciones, generalidades, meteorología, performance y navegación. |
| [Teoría y análisis de respuestas](https://www.argentina.gob.ar/sites/default/files/2021/05/teor-a-y-analisis-de-respuestas-ppa.pdf) | La teoría de cada capítulo. No trae una clave de respuestas. |
| [Anexo de figuras](https://www.argentina.gob.ar/sites/default/files/2021/05/anexo-figuras-para-las-preguntas-ppa.pdf) | Las figuras de las preguntas. |

Federico (2026-10-21): "los bancos de preguntas de anac son libres".

## Cómo se armó (2026-10-21)

Los scripts están en `scripts/examen-ppa/`, en Python con `pypdf`:

0. Se extrajo el texto de los PDF.
1. Se leyó el banco de la RAAC 61.105.
   - Cada pregunta empieza con `<n> S 1`, y cada opción con `<k> * <k>` si es la correcta, o `<k>  <k>` si no.
   - De las 385 preguntas, **6 no tienen una única correcta legible** y no entran: no se adivina una respuesta. Son la 307, 318, 327, 352, 359 y 374.
2. Se asignó la materia de dos maneras:
   - **235 preguntas**, cruzándolas por texto con los 8 capítulos del otro PDF;
   - **144 preguntas, a mano**, leyéndolas una por una. CRM, prevención de accidentes, factores humanos y mercancías peligrosas van en Generalidades, y "Regulaciones" se muestra como "Reglamentación".
3. Se limpiaron los prefijos internos del banco ("001-", "24-10-13", "PPAMOT:", "CRM", "NAV:"), las mayúsculas sostenidas y el pie de la última página ("Powered by TCExam…"), sin tocar el contenido.
4. **Las figuras (2026-10-21, segunda tanda)** salen del mismo banco, no del anexo: el banco pone cada figura adentro del recuadro de su pregunta, entre el texto y las opciones.
   - `4-recortar-figuras.py`, con PyMuPDF, busca las imágenes dibujadas entre el renglón de la pregunta y su primera opción (aunque caigan en otra página) y recorta esa caja a 170 dpi.
   - `5-figuras-sin-repetir.py` las achica a 900 px en JPEG y junta las repetidas: la Figura 37 aparece en 9 preguntas y la 30 en 10. **63 preguntas, 27 figuras, ~2 MB**, en `public/examen-ppa/`.
   - **Se revisaron las 63 una por una** en hojas de contacto: cada figura es la que el banco pone en esa pregunta.
   - Dos preguntas que el filtro marcó no la necesitan: la 167 ("con**figura**ción") y la 253 (el modelo de Reason es "una representación gráfica").
   - Una rareza del banco, que se respeta: la 266 y la 384 tienen el mismo texto ("La ilustración A indica que la aeronave se encuentra") con figuras y respuestas distintas, y lo mismo la 283 y la 385. Cada una va con la figura que el banco le pone.
   - El anexo de figuras no se usó: algunas figuras son dibujos y no imágenes, y le faltan figuras que el banco cita (la 21).

**Quedan 379 preguntas, 63 con figura.** El test `src/lib/examen-ppa.test.ts` fija su forma y que cada figura exista.

## Lo que hay que tener en cuenta

- **El banco es de 2014, y la RAAC 61 se reeditó en enero de 2026** (VI edición).
  - Las respuestas de reglamentación pueden no coincidir con la norma vigente. Por ejemplo, el banco pregunta "¿pasados cuántos días sin actividad de vuelo un PPA debe ser readaptado por un instructor?" con la respuesta "30". La experiencia reciente de la 61.060 vigente habla de 90 y 180 días; puede ser otro concepto, y no se corrige.
  - Por eso **cada pregunta de Reglamentación lleva una nota**: es la respuesta del banco de ANAC, y ante una duda manda la norma (invariante 6).
- **No se afirma nada del formato del examen** (cuántas preguntas, con cuánto se aprueba): no está en estas fuentes.
- Si ANAC publica un banco nuevo, se vuelven a correr los scripts y se revisa a mano la materia de lo que no se cruce.
