# Novedades de Vector

Generado por `npm run build:changelog` desde `src/lib/changelog.ts`. **No editar a mano:**
lo que se escriba acá se pierde en la próxima corrida.

Sólo va lo que el piloto ve. Lo de adentro —tests, refactors, migraciones— está en
`AGENTS.md`.

## v2.12.0 — Rutas por aerovía, sin escribir todos los puntos

_19 de agosto de 2026_

- **Escribí la aerovía y listo** — En el campo de pegar la ruta podés poner ALBAL UM424 EZE y te carga los once puntos del medio, como en un plan de vuelo. Si el punto por el que entrás no está en esa aerovía te lo dice y te muestra por dónde pasa, en vez de armarte una ruta que no pediste.
- **220 aerovías, y las que no verificamos no aparecen** — Salen del ENR 3 del AIP y cada secuencia se contrasta contra el ENR 4.4: si a una le falta un punto, no la publicamos. Una aerovía incompleta daría una travesía más corta que la real y con pinta de válida. De la aerovía se usa sólo por dónde pasa: los niveles y la clase de espacio aéreo hay que consultarlos aparte.

## v2.11.0 — Los puntos de aerovía, en el planificador

_19 de agosto de 2026_

- **Los 1018 puntos significativos del AIP** — Escribí DORVO, AKNOS o cualquiera de los cinco letras que canta el control y entra en la ruta como un punto más, con su tramo, su rumbo y su tiempo. Te muestra a qué aerovías pertenece y de qué edición del AIP salió — se enmienda cada 28 días.

## v2.10.1 — Las frecuencias de los aeródromos controlados estaban mal

_19 de agosto de 2026_

- **Corregimos las frecuencias, las pistas y el combustible** — De los ocho aeródromos controlados que mostrábamos —Aeroparque, Ezeiza, San Fernando, El Palomar, Córdoba, Rosario, Mar del Plata y Bariloche— casi todos los datos estaban equivocados: la torre de San Fernando figuraba en 118.45 y son 119.00 y 120.05, El Palomar tenía la pista 17/35 anotada como 16/34, y Ezeiza aparecía con AVGAS cuando sólo hay JET A-1. Ahora salen del AIP de ANAC, con la fecha de vigencia a la vista. Si planificaste con esos números, revisalos.
- **Y ahora se puede verificar** — Cada frecuencia y cada medida que ves de esos aeródromos tiene que aparecer en el PDF oficial de ANAC, y hay una prueba automática que lo comprueba en cada cambio. Los teléfonos de esos ocho se sacaron: no teníamos de dónde confirmarlos.

## v2.10.0 — Un punto de la ruta ya no tiene que ser un aeródromo

_19 de agosto de 2026_

- **Puntos por radial y distancia** — Escribí BAR/045/25 y el planificador lo toma como punto: 25 NM en el radial 045 del VOR de Bariloche. Usa la variación con la que está alineada la estación, que no es la de hoy ni la del aeródromo, y te dice qué frecuencia sintonizar.
- **Tus propios puntos visuales** — El pueblo, el cruce de rutas, la laguna: si tenés la coordenada, escribila como S34.68/W58.64 y entra en la ruta como un punto más, con su tramo, su rumbo y su tiempo.
- **Las radioayudas del país** — 96 estaciones —VOR, VOR-DME y los NDB que no se confunden con otro— con su frecuencia y su posición, para poder apoyar la ruta en ellas.

## v2.9.0 — Todo el preflight en una sola pantalla

_19 de agosto de 2026_

- **Planificador de vuelo** — Cargá la ruta y te arma la planilla de navegación mientras escribís: rumbos, tiempos y combustible por tramo, con el viento del METAR de salida y la variación magnética de tu aeródromo. Se imprime y se comparte con el link.
- **Performance de tus aeronaves** — Cargá una vez la velocidad de crucero, el consumo y el tanque de cada avión, y el planificador deja de estimar para calcular con tus números.
- **Briefing y planificación en la misma pantalla** — El planificador ahora trae también el METAR, el TAF y los NOTAM de cada punto, el viento cruzado sobre la pista y la densidad de altitud. Y podés tomar el viento del modelo en altura en vez del de superficie, que a 10.000 ft puede cambiar el tiempo de un tramo diez minutos.
- **La sesión dejó de caerse** — Vector te echaba más o menos cada hora, sin aviso y sin motivo aparente. Ahora se renueva sola y aguanta treinta días.

## v2.7.0 — ¡Tu bitácora Vector sigue sumando herramientas!

_10 de agosto de 2026_

- **¿Podés volar hoy?** — Vector junta tu certificado médico, tu repaso de vuelo y tu experiencia reciente, y te dice qué podés hacer — citando la sección de la RAAC 61.
- **Tus propias métricas** — Armá los números que querés seguir —horas en una aeronave, aterrizajes en un aeródromo, lo que sea— y aparecen en tu dashboard.
