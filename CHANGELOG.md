# Novedades de Vector

Generado por `npm run build:changelog` desde `src/lib/changelog.ts`. **No editar a mano:**
lo que se escriba acá se pierde en la próxima corrida.

Sólo va lo que el piloto ve. Lo de adentro —tests, refactors, migraciones— está en
`AGENTS.md`.

## v2.16.0 — El tracker ahora mide la PCA y la HVI juntas

_22 de agosto de 2026_

- **Las dos licencias en la misma card, porque casi nadie hace la PCA sola** — El camino normal acá es sacar la comercial y la habilitación por instrumentos como un solo tramo. El tracker mostraba sólo 61.620, y con los seis diales en verde podías estar a treinta horas de instrumentos del examen que en realidad vas a rendir. Ahora suma el requisito de la HVI: 40 horas de instrumentos, de las cuales hasta 20 pueden ser en simulador.
- **Y el dial de instrumentos dejó de decir que no volaste nada** — Cuando lo que te frenaba eran las horas de instrumentos, la proyección contestaba siempre "no volaste nada de eso en los últimos 3 meses" aunque las tuvieras cargadas. Ya proyecta con tu ritmo real.

## v2.15.0 — Vector sin señal, y los simuladores en el libro

_22 de agosto de 2026_

- **La app abre en la plataforma aunque no haya señal** — Instalala desde el navegador del celular y las pantallas que ya visitaste con conexión siguen abriendo sin ella, con un cartel que dice de cuándo es la foto que estás viendo. El planificador resuelve aeródromos, radioayudas y fixes con un catálogo que viaja adentro de la app: la ruta que armás sin señal da los mismos números que con señal.
- **Ahora todo dato meteorológico dice de cuándo es** — Debajo de cada METAR está la hora en que se observó, sacada del propio texto del reporte. Y pasadas las dos horas deja de mostrarse: un METAR viejo no es meteorología, es un texto viejo, y no alimenta ningún veredicto de ruta.
- **Los simuladores se cargan como en el libro de papel** — Marcá el equipo como simulador en el hangar y la sesión se anota igual que un vuelo —fecha, horarios, ruta— pero las horas van enteras a la columna de instrucción terrestre y no suman tiempo total. La ruta acepta escribir LOCAL, que no es un aeródromo, y no se cuenta ni como aterrizaje ni como destino visitado.

## v2.14.0 — Los 51 aeródromos controlados, con sus cartas

_19 de agosto de 2026_

- **Frecuencias, pistas y combustible de toda la red controlada** — Antes teníamos datos del AIP de ocho aeródromos; ahora de los 51 que ANAC publica con ficha, Morón incluido. Salen del documento oficial y cada número está verificado contra el PDF en las dos direcciones: nada que no esté publicado, y nada publicado que falte.
- **Las cartas oficiales, en la ficha** — El plano de aeródromo y la carta de aproximación de cada uno, con su edición y desde cuándo rige, sin salir a buscarlas al sitio de ANAC. Son 246 documentos.
- **Y corregimos el largo de nueve pistas** — Cruzando el AIP con la base que usábamos aparecieron nueve pistas mal medidas. Morón figuraba con 2850 m y mide 2303; San Fernando con 1801 y mide 1690. Donde ANAC publica la medida, ahora manda ANAC.

## v2.13.0 — La ruta se reordena, y los puntos entran donde quieras

_19 de agosto de 2026_

- **Meté un punto en el medio sin borrar nada** — Entre cada par de puntos ahora hay un "Punto acá": el punto nuevo entra ahí y no al final. Antes, para agregar una escala en el medio había que borrar todo lo que venía después y volver a escribirlo.
- **Y se puede subir y bajar** — Cada punto tiene flechas para moverlo de lugar. Si la ruta tiene una aerovía, se mueve entera con su punto de salida — no se puede partir al medio ni dejarla sin el punto por donde entrás.

## v2.12.1 — Rutas por aerovía, eligiendo en vez de escribiendo

_19 de agosto de 2026_

- **"Ir por aerovía", abajo de cada punto** — Debajo de cada punto de la ruta aparece un botón que te ofrece las aerovías que pasan por ahí y hasta dónde llega cada una. Elegís las dos cosas de una lista: no hay que saberse ninguna de memoria ni tener la carta al lado. La aerovía queda como una franja entre los dos puntos, y si cambiás el destino se recalcula sola en vez de dejarte once campos sueltos para borrar a mano.
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
