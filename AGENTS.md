# AGENTS.md — Vector

Lo que un agente necesita saber **antes** de tocar este repo, en una lectura. La historia
de cada decisión está en la bitácora (`docs/bitacora/`); acá queda lo vigente.

> Hasta el 2026-09-22 este archivo era la bitácora completa: 6.178 líneas, 343 KB, y su
> propio proceso obligaba a leerlo entero. Se partió por mes en `docs/bitacora/`, sin
> editar una sola entrada. Si un comentario del código dice "ver la entrada X en
> AGENTS.md", la entrada está ahí: `grep -n "^##" docs/bitacora/*.md`.

## Qué es Vector

Bitácora digital para pilotos argentinos: formato ANAC, desglose de horas, vencimientos
y "¿puedo volar hoy?" según la RAAC 61. Desde la 2.19.0, además, una red de pilotos: @ y
perfil público, y desde la 2.20.0 publicaciones con fotos, aplausos y comentarios. Desde
la 2.21.0, el libro de vuelo en PDF con la hoja de siempre, y la red con bloqueos,
reportes, invitaciones y avisos push.
**El público es el alumno de escuela que va de
PPA a PCA**: no es dueño del avión, paga por hora o por pack, y abre la app para saber
si puede volar, cuánto le falta y cuánto le queda.

- **Este repo es sólo el frontend**: Next.js 16 (App Router), React 19, Tailwind v4 (sin
  `tailwind.config.js`: el tema vive en `@theme` dentro de `src/app/globals.css`),
  Framer Motion, next-themes.
- **El backend** es Python + Litestar + Supabase, en `/Users/defeee/Vector/FlightLog-BackEnd`,
  con su propio `AGENTS.md`. Todo cambio de modelo de datos se hace allá, con su
  migración en `migrations/`. La autenticación también sale de ahí (`NEXT_PUBLIC_AUTH_URL`).
- **Uso real al 2026-09-22**, medido en la base: 6 cuentas y **una sola con vuelos** (la de
  Federico, el dueño). Ninguna alta desde el 2026-08-10. Antes de proponer algo "por
  escala", volvé a medir.

## Mapa del código

| Dónde | Qué |
|---|---|
| `src/app/dashboard/` | Las pantallas logueadas. El layout trae la barra, las pestañas de sección, los carteles de red y el copiloto. |
| `src/lib/secciones.ts` | Las **cinco secciones** de la barra y sus pestañas (ver abajo). |
| `src/app/u/[handle]/` | El perfil público, el link que se comparte: fuera del dashboard, se abre sin cuenta. Quien lo abre con sesión va a `/dashboard/pilotos/[handle]`, el mismo perfil adentro de la app. |
| `src/app/dashboard/admin/`, `src/lib/admin.ts` | El panel de administración: sólo para los ids de `ADMINS_RED` del backend y 404 para el resto. **Sin link ni novedad a propósito:** se llega por URL. |
| `src/lib/resumen-social.ts`, `src/lib/publicaciones-servidor.ts` | Lo que la red lee del backend, con lo que le agrega el server: las fechas ya escritas y el mapa del vuelo. |
| `src/app/page.tsx`, `src/app/guias/`, `src/components/publico/`, `src/lib/sitio.ts` | Lo público: la landing (Server Component, estática), las guías con sus fuentes, `robots.ts`, `sitemap.ts` y las imágenes para compartir. Una guía nueva se agrega en `GUIAS` y aparece en el sitemap, el índice y el pie. **Todo lo que promete la landing se verifica contra el código**; lo regulatorio de las guías, contra la norma (invariante 6). |
| `src/lib/libro-anac.ts`, `src/lib/libro-anac-pdf.ts`, `src/app/api/bitacora/libro-anac/` | El libro de vuelo en PDF: qué va en cada casillero y las hojas (puro, testeado), el dibujo con pdf-lib y la ruta. Fuentes en `docs/normativa/libro-de-vuelo-anac.md`. |
| `src/lib/` | Lógica pura, **con sus tests al lado** (`*.test.ts`). Es lo único testeable: vitest corre en `environment: "node"`, sin DOM. |
| `src/actions/` | Server actions. Escriben contra el backend y revalidan las pantallas afectadas. |
| `src/lib/api.ts` | `apiFetch`: único camino al backend, con el token de la cookie. Cachea los GET 20 s. |
| `src/proxy.ts` | Protege `/dashboard` y renueva la sesión (el JWT de Supabase dura una hora). |
| `src/data/` | Aeródromos, pistas, AIP, aerovías, fixes y radioayudas en TSV **commiteados**: la app no depende de red en build ni en runtime. Se regeneran con `npm run build:*`. |
| `src/sw/sw.ts` | El service worker (PWA). Lo compila `scripts/build-sw.mjs` después de `next build`. |
| `docs/normativa/` | Las secciones de la RAAC 61 que cita el código, y las fuentes del libro de vuelo (RAAC 61.120 y Res. ANAC 470/2025). **La VI edición de la RAAC 61 (enero 2026) renumeró**: el libro de vuelo ya no es la 61.51. |
| `docs/brief/` | Los planes 01–11, tal como se escribieron. Son historia, no backlog: verificá contra el código antes de dar algo de ahí por pendiente. |

### La navegación

Cinco secciones: **Inicio, Bitácora, Balance, Preparar vuelo, Pilotos**. Las pantallas que
no son sección son pestañas:

- Bitácora = Vuelos · Resumen · Calendario · Auditoría.
- Preparar vuelo = Planificador · Aeropuertos · Clima · Herramientas.
- Pilotos = Red · Buscar · Actividad. Publicar y el perfil de un piloto
  (`/dashboard/pilotos/[handle]`) cuelgan de la Red.

Las URLs son las de siempre. **Cinco es el techo**, porque es lo que entra en la píldora
del teléfono sin la hoja "Más", y un test lo fija. La pestaña activa es la de `href` más
específico (`pestanaActiva`): por prefijo, la Red se prendería junto con Buscar o
Actividad.

- Una pantalla nueva **se agrega en `SECCIONES`** y aparece sola en la barra y en las
  pestañas (`SeccionTabs`, en el layout). Si no es pestaña, va en `secciones.test.ts` con
  el motivo: en `CUELGAN_DE_UNA_PESTANA` si vive adentro de una sección, o en
  `FUERA_DE_LA_BARRA` si no. El test recorre `src/app/dashboard` y falla si una pantalla
  queda sin forma de llegar.
- El inicio contesta tres preguntas —¿puedo volar hoy?, ¿cuánto me falta?, ¿cuánto me
  queda?— y cierra con los últimos vuelos. **Lo que no conteste una de las tres va al
  Resumen**, no al inicio. La única excepción la decidió Federico: la tarjeta chica "Tu
  red", al final y por `Suspense`, para que la red nunca demore lo de arriba.
- **Registrar vuelo es una sola página** (`/dashboard/log-flight`). Hubo un modal
  interceptado (`@modal/(.)log-flight`) que se llevó cinco commits de arreglos en un
  mes; se sacó en la 2.18.0. No volver a interceptar esa ruta.

## Invariantes — lo que no se rompe

1. **Fechas y horas localizadas se formatean en el server, o no se formatean.** "Hoy"
   baja resuelto desde el server como `todayIso`. `toLocaleString` difiere entre Node y
   Chrome, y `new Date()` en un componente cliente hace que server y navegador discrepen
   de día: costó dos bugs de hidratación.
2. **"No sé" no es "no hay".** `/dashboard` nombra en `unavailable` las secciones que no
   pudo leer. Nunca se le dice "podés volar" o "no tenés CMA" a alguien cuyo dato no se
   pudo leer (`pilotStatus`, `documentosDisponibles`, `PrimerosPasos`).
3. **Un vuelo programado no es un vuelo.** `planned_flights` es una tabla aparte y
   **ninguna función de agregación la lee**: inflaría horas en un papel que se presenta
   ante ANAC, y `POST /flights` cobra el saldo.
4. **Un simulador es un renglón del libro, no un vuelo.** `soloVolados` lo saca de todo lo
   que mide vuelo. La excepción es el tracker de la PCA, que usa sus horas de
   instrumentos y hace su propio corte.
5. **Las horas de apertura** (`logbooks.opening_*`) suman a los totales pero no a
   promedios ni a la recencia: no tienen fecha.
6. **Lo regulatorio se escribe contra la RAAC, no de memoria**, citando la sección en el
   código (`docs/normativa/`). El plan 08 se escribió de memoria y tenía seis errores.
7. **La versión vive en `package.json`** y un test obliga a que `CHANGELOG[0]` de
   `src/lib/changelog.ts` sea la misma. Novedades = sólo lo que el piloto ve.
   `CHANGELOG.md` se genera con `npm run build:changelog`.
8. **Después de escribir, revalidar cada pantalla que muestra ese dato** (`revalidatePath`).
   `apiFetch` cachea los GET 20 s: una pantalla que falte en la lista muestra el dato
   viejo. Y los `catch` de las acciones dejan pasar el `redirect` de Next con
   `esErrorDeRedirect`. La excepción son las publicaciones, los aplausos y los
   comentarios: esas pantallas se piden sin cache y la tarjeta es dueña de su estado, así
   que revalidar sólo volvería a dibujar el feed entero en cada aplauso (ver
   `actions/social.ts`).
9. **`API_URL` por defecto es `http://127.0.0.1:7477/api`, con `/api`**: el backend vive
   en el mismo VPS. Por el dominio público va **sin** `/api`, porque lo agrega el proxy
   (Traefik, `addPrefix` en `flightlog.fdiaznem.com.ar.yml`; ver Deploy). Esa asimetría
   cortó producción el 2026-08-27. En CI el smoke usa el dominio público.
10. **La tarjeta compartible saca los números de la sesión**, nunca del query string, y no
    acepta `user_id`: una tarjeta pública necesita un token firmado y su propio modelo
    de amenaza.
11. **Las cartas Jeppesen son contenido pago**: las sirve el backend sólo a perfiles con
    `jeppesen_access`. No se exponen a nadie más.
12. **Los datos del AIP se validan contra el PDF oficial** en los tests, en las dos
    direcciones. Un número que no aparece en la fuente no entra.
13. **Los números de un plan salen de la base, no de la bitácora.** Una entrada dijo "2000
    vuelos" cuando había 45, y casi se diseñó paginación de servidor sobre eso.
14. **De la red social sale sólo lo que el piloto eligió.** Del perfil, cinco números de
    horas agregadas; de la bitácora, **nada solo**: una publicación lleva un vuelo sólo si
    el piloto lo adjunta, y de ese vuelo sólo los datos que prendió (ruta como origen y
    destino, duración, tipo de avión, fecha). Es una copia (`resumen_de_vuelo` del
    backend) y **nunca lleva la matrícula**. Ninguna fila de `flights` ni ningún
    `user_id` cruza la API.
    - Una publicación la ve quien puede ver el perfil de su autor, y lo impone el RLS
      (migraciones 018 y 019 del backend), no esta app.
    - Las fotos se re-codifican en el backend sin EXIF (sin la ubicación GPS) y las de
      publicaciones se sirven con URLs firmadas. La foto de perfil es pública, como el @.
    - Si agregás un dato a lo que se publica, va en la política de privacidad y en el
      texto del Hangar y de `CrearHandleRapido`. Desde el 2026-09-24 **el @ es un paso
      obligatorio del alta** (Federico) y ahí arranca en **Privado**: el @, el nombre
      elegido y la licencia se ven siempre; las horas y lo publicado, según la visibilidad.
    - La vista previa (`opengraph-image`) pide **siempre como anónimo**: el link lo recibe
      cualquiera.
    - Los avisos push dicen quién y qué (te siguió, aplaudió, comentó), **nunca datos de
      la bitácora** (`services/avisos.py` del backend). Un bloqueo también lo impone el
      RLS (migración 021), y quien fue bloqueado ve un 404, como si el @ no existiera.
15. **Ninguna pantalla escribe al dibujarse.** El smoke recorre las pantallas contra la
    base de producción dando por hecho que mirar no cambia nada. Por eso la Actividad
    marca lo visto desde el navegador (`marcarActividadVista`), no en el render.

## Comandos

```bash
npm run dev                # http://localhost:3000 (ojo: ver abajo contra qué base escribe)
npx tsc --noEmit           # mirá el código de salida: `| head && echo ok` miente
npm test                   # vitest, lógica pura
npm run build              # next build + service worker
npm run smoke              # después del build: levanta `next start` y recorre rutas
npm run build:changelog    # regenera CHANGELOG.md
```

- **En desarrollo, el server le pega a `API_URL`** (por defecto el backend local en
  `127.0.0.1:7477/api`), y ese backend usa **la base de producción**: lo que se cree
  desde `npm run dev` se escribe en los datos reales. Para probar pantallas sin riesgo,
  usá el backend falso de la sección siguiente.
- Si `tsc` se queja de un módulo en `.next/types` que ya no existe (una ruta borrada),
  es cache de build: `rm -rf .next`.
- El smoke entra al dashboard sólo con `SMOKE_EMAIL`/`SMOKE_PASSWORD`, **contra
  producción** y en modo lectura. En CI los tiene; sin ellos saltea esa tanda y pasa
  igual, así que un verde no prueba que haya entrado: buscá `--- con sesión ---` en la
  salida.

## Cómo verificar lo que está detrás de login

Sin credenciales, y sin tocar producción: un backend falso local y una cookie cualquiera.

- `src/proxy.ts` sólo exige que exista la cookie `session_token`; **no verifica la
  firma** (eso lo hace el backend). Un JWT con `exp` en el futuro y sin
  `refresh_token` alcanza para que el proxy deje pasar y no intente renovar.
- Levantá un servidor que conteste JSON bajo `/api/*` —`/profiles`, `/dashboard`,
  `/logbooks`, `/audit/summary`, `/planned-flights`, `/custom-stats`, `/aircraft`,
  `/flight-helper/session`… (la lista sale de `grep -rho 'apiFetch("[^"]*' src`)— y
  corré `API_URL=… NEXT_PUBLIC_API_URL=… NEXT_PUBLIC_AUTH_URL=… npx next dev` apuntando
  ahí. Las variables del entorno le ganan a `.env.local`.
- Así se verificaron la 2.18.0 y el recorrido "Completar → Registrar → guardar". Lo que
  esto **no** prueba es el backend real: los writes contra producción siguen siendo
  verificación a mano.
- Mirá siempre claro **y** oscuro, escritorio **y** teléfono. Con el panel del navegador
  oculto las transiciones CSS no avanzan: desactivalas antes de medir colores.

## Deploy

**Se despliega pusheando a `main`, y sólo si el CI pasa.** `ci.yml` corre `tsc`, tests,
build y smoke con sesión; cuando termina en verde, `.github/workflows/deploy.yml`
(`workflow_run`) entra por SSH al VPS, hace `git reset --hard` **al commit que aprobó el
CI**, `npm ci`, borra `.next`, construye, reinicia con
`pm2 restart vector-frontend --update-env` y **vuelve solo al commit anterior** si el
health check falla. No copiar archivos ni reiniciar PM2 a mano. Para desplegar sin
esperar al CI está el botón de `workflow_dispatch`.

Hasta el 2026-09-22 el deploy corría en cada push sin mirar el CI, y así llegaron once
commits en rojo a producción. El health check pega a `/api/airports/search`, que lee los
TSV del disco y **nunca toca el backend**: un deploy verde no prueba que el dashboard
ande; el smoke del CI, sí.

**El proxy es Traefik, no nginx.** El tráfico entra por Cloudflare y lo atiende el
contenedor `main-traefik` (red del host, puertos 80 y 443), con una ruta por dominio en
`/home/ubuntu/traefik/dynamic/` del VPS: `vector.fdiaznem.com.ar.yml` manda a
`127.0.0.1:3010`. **nginx está apagado**: lo que queda en `/etc/nginx/sites-*` es de
antes y no sirve nada, así que tocarlo no cambia nada. Traefik no limita el tamaño del
cuerpo: un POST de 13 MB llega entero a Next (medido el 2026-09-23). El tope que
importa es el del backend (`request_max_body_size`, 30 MB).

## Estado y pendientes (al 2026-09-24)

- **Alumno piloto** (Federico, 2026-09-24; `lib/licencias.ts`):
  - no lleva libro de vuelo, así que no ve el PDF, el importador, "cerrar hoja", los
    libros en el Hangar, el número de licencia ni el legajo;
  - registra vuelos con un formulario simple (`VueloAlumnoForm`);
  - "¿Puedo volar hoy?" sale de su capítulo de la RAAC (61.060(b), 61.405, 61.410,
    61.415) y el tracker es el camino a la PPA (61.520(a), `lib/ppa-progress.ts`);
  - sus horas no cuentan una vez rendida la PPA: `profiles.fecha_ppa` (migración 022)
    se pide al pasar de Alumno a PPA. Sin fecha, cuentan todos los vuelos. Es una
    decisión de Federico sobre la práctica; la RAAC no la dice así (ver `licencias.ts`).
- **El alta es obligatoria y retomable** (Federico, 2026-09-24): tapa el dashboard hasta
  terminarla y vuelve al primer paso sin hacer (`GET /onboarding/estado`, `pasoDelAlta`):
  licencia y CMA, avión, @, tus vuelos.
  Sólo el importador del PDF queda sin tapar. La cookie `vector_alta` con el id de la cuenta
  evita preguntar en cada pantalla. El recordatorio del día siguiente
  (`/api/cron/primer-vuelo`) corre desde el crontab del VPS a las 10:00 ART. Mandar el PDF
  del libro por WhatsApp es una idea de Federico para después.
- **SEO:** hay guías, sitemap y datos estructurados, pero falta que Federico verifique el
  dominio en Google Search Console y envíe el sitemap. El sitio vive en un subdominio
  personal (`vector.fdiaznem.com.ar`): un dominio propio ayudaría. La landing no dice
  "gratis": el precio es decisión de Federico.
- **El libro en PDF no es "oficial" y no se lo llama así.** Desde el 1/11/2025 cada vuelo
  se declara en el CAD de ANAC (Res. 470/2025); el PDF es el libro en papel que convive
  con eso, y lo anotado tiene que coincidir. Si ANAC aclara que los tiempos van en horas
  y minutos (el punto 5 dice "sexagesimal", el CAD muestra decimales), cambia
  `formatoLibro`.
- **Supabase está en `us-east-1`** y el VPS en São Paulo: ~160 ms por consulta, el piso de
  latencia de toda pantalla. Moverlo a `sa-east-1` es decisión de Federico (downtime).
- **Propuestas de simplificación sin decidir:** congelar lo que hoy no usa nadie
  (métricas propias, calendario, la UI de múltiples libros) y poner detrás de un permiso
  por perfil lo que excede al alumno (aerovías, HVI, Jeppesen).
- **La red social deja afuera, a propósito,** editar una publicación, redirigir un @ viejo
  y páginas de escuela o aeródromo. Además:
  - los reportes no tienen pantalla: se leen en la tabla `reportes` y llegan como aviso
    push a los `ADMINS_RED` del backend;
  - los avisos push necesitan las claves VAPID en el `.env` del backend; sin ellas no se
    ofrecen;
  - el login siempre vuelve a `/dashboard`, no al perfil desde el que se fue a ingresar;
  - la búsqueda no tiene límite de pedidos, más allá de exigir sesión y un tope de 20
    resultados;
  - la exportación no incluye un comentario propio en una publicación que ya no podés
    ver (el RLS de `comentarios` sigue al de la publicación).

## La bitácora

Cada tanda coherente de cambios deja una entrada **al final del archivo del mes** en
`docs/bitacora/AAAA-MM.md` (si no existe, se crea). Es obligatorio, como cargar un
vuelo en el libro:

1. Antes de empezar, leé las entradas del mes y buscá con `grep` lo que toque tu cambio.
2. Escribila mientras trabajás, no al final: una sesión cortada deja trabajo huérfano.
3. Timestamp en UTC de verdad (`date -u`). Nunca se reescribe una entrada: si algo se
   revirtió, va una entrada nueva que lo dice.
4. **La justificación no es opcional.** "Pedido del usuario" no alcanza: por qué esa
   solución y qué alternativa se descartó. El qué ya está en `git log`.
5. Si algo quedó a medias, roto o sin verificar, se dice.
6. Si la entrada cambia algo de lo de arriba —un invariante, la navegación, un
   pendiente—, **se actualiza también este archivo**. Éste tiene que seguir entrando en
   una lectura.

```markdown
### YYYY-MM-DD HH:MM UTC — <Agente / modelo> — <Título corto>

**Qué cambié:** archivo por archivo, una línea cada uno.
**Por qué:** el razonamiento y las alternativas descartadas.
**Estado:** terminado / parcial / bloqueado, y qué falta.
**Verificación:** cómo se comprobó; si no se verificó, decirlo.
```
