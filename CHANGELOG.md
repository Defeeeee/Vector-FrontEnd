# Novedades de Vector

Generado por `npm run build:changelog` desde `src/lib/changelog.ts`. **No editar a mano:**
lo que se escriba acá se pierde en la próxima corrida.

Sólo va lo que el piloto ve. Lo de adentro —tests, refactors, migraciones— está en
`AGENTS.md`.

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
