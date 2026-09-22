# AGENTS.md — Vector

Lo que un agente necesita saber **antes** de tocar este repo, en una lectura. La historia
de cada decisión está en la bitácora (`docs/bitacora/`); acá queda lo vigente.

> Hasta el 2026-09-22 este archivo era la bitácora completa: 6.178 líneas, 343 KB, y su
> propio proceso obligaba a leerlo entero. Se partió por mes en `docs/bitacora/`, sin
> editar una sola entrada. Si un comentario del código dice "ver la entrada X en
> AGENTS.md", la entrada está ahí: `grep -n "^##" docs/bitacora/*.md`.

## Qué es Vector

Bitácora digital para pilotos argentinos: formato ANAC, desglose de horas, vencimientos
y "¿puedo volar hoy?" según la RAAC 61. Desde la 2.19.0, además, una red de pilotos con
@ y perfil público. **El público es el alumno de escuela que va de
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
| `src/app/u/[handle]/` | El perfil público de la red social, fuera del dashboard: se abre sin cuenta. |
| `src/lib/` | Lógica pura, **con sus tests al lado** (`*.test.ts`). Es lo único testeable: vitest corre en `environment: "node"`, sin DOM. |
| `src/actions/` | Server actions. Escriben contra el backend y revalidan las pantallas afectadas. |
| `src/lib/api.ts` | `apiFetch`: único camino al backend, con el token de la cookie. Cachea los GET 20 s. |
| `src/proxy.ts` | Protege `/dashboard` y renueva la sesión (el JWT de Supabase dura una hora). |
| `src/data/` | Aeródromos, pistas, AIP, aerovías, fixes y radioayudas en TSV **commiteados**: la app no depende de red en build ni en runtime. Se regeneran con `npm run build:*`. |
| `src/sw/sw.ts` | El service worker (PWA). Lo compila `scripts/build-sw.mjs` después de `next build`. |
| `docs/normativa/` | Las secciones de la RAAC 61 que cita el código. |
| `docs/brief/` | Los planes 01–11, tal como se escribieron. Son historia, no backlog: verificá contra el código antes de dar algo de ahí por pendiente. |

### La navegación

Cinco secciones: **Inicio, Bitácora, Balance, Preparar vuelo, Pilotos**. Las pantallas que
no son sección son pestañas:

- Bitácora = Vuelos · Resumen · Calendario · Auditoría.
- Preparar vuelo = Planificador · Aeropuertos · Clima · Herramientas.
- Pilotos = Buscar · Solicitudes.

Las URLs son las de siempre. **Cinco es el techo**, porque es lo que entra en la píldora
del teléfono sin la hoja "Más", y un test lo fija. La pestaña activa es la de `href` más
específico (`pestanaActiva`): por prefijo, Buscar y Solicitudes se prenderían juntas.

- Una pantalla nueva **se agrega en `SECCIONES`** y aparece sola en la barra y en las
  pestañas (`SeccionTabs`, en el layout). Si no va en ninguna sección, va en
  `FUERA_DE_LA_BARRA` de `secciones.test.ts` con el motivo: el test recorre
  `src/app/dashboard` y falla si una pantalla queda sin forma de llegar.
- El inicio contesta tres preguntas —¿puedo volar hoy?, ¿cuánto me falta?, ¿cuánto me
  queda?— y cierra con los últimos vuelos. **Lo que no conteste una de las tres va al
  Resumen**, no al inicio.
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
   `esErrorDeRedirect`.
9. **`API_URL` por defecto es `http://127.0.0.1:7477/api`, con `/api`**: el backend vive
   en el mismo VPS. Por el dominio público va **sin** `/api`, porque lo agrega nginx. Esa
   asimetría cortó producción el 2026-08-27. En CI el smoke usa el dominio público.
10. **La tarjeta compartible saca los números de la sesión**, nunca del query string, y no
    acepta `user_id`: una tarjeta pública necesita un token firmado y su propio modelo
    de amenaza.
11. **Las cartas Jeppesen son contenido pago**: las sirve el backend sólo a perfiles con
    `jeppesen_access`. No se exponen a nadie más.
12. **Los datos del AIP se validan contra el PDF oficial** en los tests, en las dos
    direcciones. Un número que no aparece en la fuente no entra.
13. **Los números de un plan salen de la base, no de la bitácora.** Una entrada dijo "2000
    vuelos" cuando había 45, y casi se diseñó paginación de servidor sobre eso.
14. **De la red social, hacia afuera salen sólo agregados.** El perfil público
    (`/u/[handle]`) se abre sin cuenta. El backend decide qué ve cada uno con
    `puede_ver_horas` **antes** de leer nada, y devuelve cinco números de horas. Ninguna
    fila de `flights` ni ningún `user_id` cruza la API. La regla se repite en el RLS de la
    migración 018 del backend.
    - Si agregás un dato al perfil público, va en la política de privacidad y en el texto
      del formulario del Hangar, porque crear el @ es el consentimiento.
    - La vista previa (`opengraph-image`) pide **siempre como anónimo**: el link lo recibe
      cualquiera.

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

**Se despliega pusheando a `main`.** `.github/workflows/deploy.yml` entra por SSH al VPS,
hace `git reset --hard origin/main`, `npm ci`, borra `.next`, construye, reinicia con
`pm2 restart vector-frontend --update-env` y **vuelve solo al commit anterior** si el
health check falla. No copiar archivos ni reiniciar PM2 a mano.

El health check pega a `/api/airports/search`, que lee los TSV del disco y **nunca toca el
backend**: un deploy verde no prueba que el dashboard ande. CI (`ci.yml`) corre `tsc`,
tests, build y smoke en cada push.

## Estado y pendientes (al 2026-09-22)

- **La landing promete "PDF oficial"** (`src/app/page.tsx`) y ese export no existe: se
  borró como código muerto en el plan 09. Hoy hay CSV (Bitácora) y JSON (Hangar).
- **Supabase está en `us-east-1`** y el VPS en São Paulo: ~160 ms por consulta, el piso de
  latencia de toda pantalla. Moverlo a `sa-east-1` es decisión de Federico (downtime).
- **Propuestas de simplificación sin decidir:** congelar lo que hoy no usa nadie
  (métricas propias, calendario, la UI de múltiples libros) y poner detrás de un permiso
  por perfil lo que excede al alumno (aerovías, HVI, Jeppesen).
- **La red social tiene deliberadamente fuera del MVP** feed, fotos, aplausos,
  comentarios, bloquear usuarios, redirigir un @ viejo y páginas de escuela o
  aeródromo. Además:
  - el login siempre vuelve a `/dashboard`, no al perfil desde el que se fue a ingresar;
  - la búsqueda no tiene límite de pedidos, más allá de exigir sesión y un tope de 20
    resultados.

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
