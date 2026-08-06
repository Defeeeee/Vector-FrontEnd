# Plan 07 — Higiene de la superficie de WhatsApp, consistencia y distancia de travesía

> **Documento nuevo.** No reemplaza ni continúa a `06-plan-post-flightdeck.md`, que
> quedó cerrado. Lo de acá salió de auditar el código el 2026-08-06, después de
> terminar el 06.
>
> **Al final de este plan, Vector pasa a `2.6.0`.**

> **Estado al 2026-08-06, plan cerrado.** Hechas: `H1.1` (pasos 1 y 2), `H1.2`,
> `H1.3`, `H1.4`, `C1`, `D1`, `F1`, `V1`.
>
> **Pendientes a propósito:**
> - `H1.1` paso 3 — sacarle al backend el soporte de query string. Espera unos
>   días de confirmar en los logs que no queda ninguna llamada vieja.
> - `T1` — bloqueada hasta que exista la cuenta de prueba. La crea Federico:
>   crear cuentas y manejar contraseñas queda fuera de lo que hace el agente.
>
> **Dos cosas cambiaron al implementarlas, y el motivo está en cada tarea:**
> `H1.2` creció para mover también el teléfono (el access log de uvicorn guardaba
> la URL entera, así que sacar los `print` no alcanzaba), y `F1` **no** cambia el
> criterio de travesía — la distancia se muestra, no decide.

Cada tarea tiene id estable, criterio de aceptación y cómo verificarla. El orden
importa en dos lugares y está marcado.

**Leyenda de esfuerzo:** XS < 1 h · S ≈ media jornada · M ≈ 1–2 jornadas.

---

## Todo esto se verificó contra el código antes de escribirlo

El plan 06 nació con **cinco tareas que describían cosas que ya existían**, y esa
fue su lección más cara. Así que acá va lo que se comprobó, con el resultado:

| Afirmación | Cómo se comprobó | Resultado |
|---|---|---|
| El backend loguea teléfonos | `grep "print(f\"\[DEBUG WHATSAPP"` | 3 ocurrencias |
| El secreto viaja en la URL | 6 llamadas en el front, 3 endpoints en el back | confirmado |
| No hay rate limiting | `grep -ci "ratelimit\|throttle"` | **0** |
| `whatsapp_chats` no se purga | el backend recorta a 20 mensajes, nunca borra filas | confirmado |
| `pg_cron` | `pg_available_extensions` | disponible, **no instalada** |
| `splitRoute` duplicada | `grep -rln "function splitRoute"` | **5 copias** |
| Las 5 copias tienen un bug | se leyeron las 5 enteras | **no** — todas tienen fallback |
| No hay distancia entre aeródromos | el Haversine que existe es sólo para METAR | confirmado |
| Hay coordenadas para calcularla | `madhel.tsv`, 711 aeródromos con lat/lon | confirmado |

**`whatsapp_chats` tiene hoy 1 sola fila.** La retención (H1.4) es preventiva, no
una limpieza urgente. Decirlo evita que el próximo la priorice mal.

---

## Tier H — Higiene de la superficie de WhatsApp

Es la superficie más expuesta del producto: un endpoint público, que corre con
service role, y que ahora además escribe vuelos en la bitácora.

### H1.1 — Mover el secreto de la query string a un header `M` ⚠️ coordinado

**El problema.** `/whatsapp/user-data?phone=…&secret=…` deja el secreto **en texto
plano en los logs de nginx y de PM2, en cada mensaje que recibe el bot**. Se
arregló la exposición en un repo público (T1.4 del plan 06) y se trasladó a los
logs del server.

**Orden obligatorio — tres despliegues, no uno.** Cambiar los dos lados a la vez
corta el bot durante la ventana en que uno está desplegado y el otro no. Ya nos
pasó con el secreto y costó una hora y media.

1. **Backend acepta las dos formas.** Lee el header `X-Vector-Secret` y, si no
   viene, cae a la query string. Desplegar. Nada se rompe: el front todavía manda
   query.
2. **Frontend pasa a mandar el header** en las 6 llamadas. Desplegar. A partir de
   acá los logs dejan de tener el secreto.
3. **Backend deja de aceptar la query string.** Desplegar. Recién acá se cierra.

Entre el 2 y el 3 conviene dejar pasar unos días y confirmar en los logs que no
queda ninguna llamada con `secret=` en la URL.

**Criterio de aceptación:** `grep "secret=" access.log` no devuelve nada nuevo
después del paso 2, y el bot contesta después de cada uno de los tres despliegues.

### H1.2 — Sacar los `print` con datos personales `XS`

```python
print(f"[DEBUG WHATSAPP] Fetching user data for phone: {phone} (clean: {clean_phone})")
print(f"[DEBUG WHATSAPP] Service role key configured: {bool(...)}")
print(f"[DEBUG WHATSAPP] Profile query returned no data for phone: {clean_phone}")
```

Números de teléfono de pilotos en texto plano, en cada request. El segundo además
informa si la service role key está configurada, que no le importa a nadie salvo
a quien esté probando el endpoint.

No se borra el diagnóstico, se le saca el dato: loguear que **hubo** una consulta
sin resolver sirve; loguear de qué número, no. Si hace falta correlacionar, un
hash corto del teléfono alcanza.

También se saca el stack trace completo que el backend escupe ante un `401` de
rutina: un rechazo esperado no es una excepción digna de traceback.

**Criterio:** ningún `print` del módulo contiene `{phone}` ni `{clean_phone}`.

### H1.3 — Rate limiting en el webhook `S`

**Hoy: cero.** La URL del webhook es pública y cada mensaje dispara una llamada a
Gemini que paga Federico. Cualquiera que la encuentre puede vaciar la cuota. Que
el código ya tenga manejo específico de errores de cuota sugiere que pasó al menos
una vez sin que nadie atacara.

Ventana por número: N mensajes por minuto, y un tope diario por número. Se apoya en
el historial que ya se guarda —tiene los ids y ahora los timestamps— así que no
hace falta almacenamiento nuevo.

Cuando se corta, se le contesta al piloto que espere un momento, no silencio.

**Criterio:** un test que simule N+1 mensajes seguidos del mismo número y verifique
que el N+1 no llega a Gemini.

### H1.4 — Retención de `whatsapp_chats` `S`

Guarda conversaciones completas, indexadas por teléfono, para siempre. Ahí adentro
hay consultas sobre vencimientos médicos. La página de privacidad va a tener que
declarar un plazo, y "para siempre" es una respuesta incómoda.

`pg_cron` está **disponible pero no instalada**. Hay que instalarla y programar un
borrado de las conversaciones sin actividad en N días — 90 es un punto de partida
razonable, pero **el plazo lo decide Federico**, porque es lo que va a quedar
escrito en la política.

**Hoy hay 1 sola fila**, así que esto es preventivo. No hay urgencia, sí orden:
conviene que exista antes de publicar los legales, no después.

**Criterio:** el job existe en `cron.job`, y una fila con `updated_at` viejo
desaparece al correrlo a mano.

---

## Tier C — Consistencia

### C1 — Unificar `splitRoute` `S`

Está escrita **cinco veces**: `dashboard/page.tsx`, `FlightCard.tsx`,
`RecentFlights.tsx`, `FlightLogForm.tsx` y `lib/summary.ts`.

**No hay un bug hoy** — se leyeron las cinco y todas contemplan el separador por
espacio. Pero difieren en el borde: tres devuelven `"???"` cuando falta el destino,
`summary.ts` devuelve `""`, y la del formulario repite el origen para tratar el
circuito local. Cuatro criterios distintos sobre el campo que identifica
aeródromos, y la próxima que alguien toque va a divergir de las otras cuatro.

Queda una sola en `lib/`, con tests, y las demás la importan. El valor de relleno
—`"???"` o `""`— pasa a ser un parámetro, porque las dos formas son legítimas
según quién pregunte.

**Criterio:** `grep -rc "function splitRoute" src/` devuelve 1, y los tests cubren
los tres formatos que hay guardados hoy (`"A B"`, `"A-B"`, `"A"`).

---

## Tier T — Testing

### T1 — Smoke test autenticado `M`

El smoke actual comprueba 12 rutas, pero **no entra al dashboard**: sin sesión el
middleware redirige antes de que la página corra. Por eso un crash como el de
`/dashboard/log-flight` —`logbooks.find is not a function`, que estuvo roto en
producción— **no se detecta**. Está documentado dentro del propio script.

Hace falta una cuenta de prueba con datos propios y su cookie de sesión en los
secrets del repo. Con eso el CI cubre la clase de bug que hoy sólo aparece cuando
la sufre un piloto.

**Decisión pendiente de Federico:** esa cuenta vive en la base de producción. La
alternativa es un proyecto de Supabase aparte para tests, que es más limpio y más
trabajo.

**Criterio:** el smoke recorre las 12 rutas del dashboard autenticado y falla si
alguna devuelve 5xx.

---

## Tier D — Datos del usuario

### D1 — Exportar mis datos `S`

Cuando se publiquen los legales, un piloto puede pedir sus datos. `generateLogbookPdf`
ya existe y arma el libro; falta el resto —perfil, aeronaves, documentos, packs,
transacciones y el historial del copiloto— en un formato que sirva para llevárselo,
no sólo para imprimirlo. JSON o CSV.

Es más plomería que feature nueva, y es la contrapartida del borrado de cuentas que
ya funciona.

**Criterio:** un botón en Hangar que descarga un archivo con todo lo que la base
tiene de ese usuario.

---

## Tier F — Feature

### F1 — Distancia de travesía `M`

**Lo desbloqueó MADHEL:** ahora hay lat/lon de 711 aeródromos en el directorio.

Hoy `isCrossCountry` es `canonicalOrigin !== canonicalDestination`. Es una
aproximación: despegar y aterrizar en campos distintos a 8 km no es lo mismo que
una travesía, y el bucket ANAC al que cae el tiempo depende de esa distinción.

Con las coordenadas sale la distancia real por gran círculo. Tres cosas:

1. **El toggle deja de adivinar.** Sigue mandando el piloto —la decisión es suya—
   pero la sugerencia pasa a estar fundada.
2. **Distancia por vuelo**, guardada o derivada, y millas totales en el Resumen.
   Ningún libro digital argentino lo muestra.
3. **El vuelo más largo por distancia**, además del más largo por tiempo que ya
   está en el dashboard.

**Cuidado con el aeródromo sin coordenadas.** No todos los de `madhel.tsv` las
tienen; cuando falten, no se inventa: la distancia queda vacía y el toggle vuelve
al criterio actual.

**Criterio:** SADF→SAEZ da ~20 NM, SADF→SAZS (Bariloche) da ~830 NM, y un
aeródromo sin coordenadas no rompe ninguna pantalla.

---

## Tier V — Cierre

### V1 — Versión 2.6.0 `XS`

`package.json`, los tags de versión en las páginas de auth, y una entrada en
`ChangelogNotice` con lo que el piloto efectivamente ve: la distancia de travesía y
la exportación de datos. La higiene no va en el changelog del usuario.

---

## Orden sugerido

```
H1.2 ─┐
H1.3 ─┼─ independientes, en cualquier orden
C1   ─┤
F1   ─┘

H1.1 ── tres despliegues, con días de por medio (arrancar temprano)
H1.4 ── antes de publicar los legales
D1   ── antes de publicar los legales
T1   ── bloqueada: decisión sobre la cuenta de prueba
V1   ── al final
```

**Arrancar por H1.1**, porque su reloj es el más largo: son tres despliegues
espaciados y el resto se puede hacer mientras tanto.

**T1 está bloqueada** de tu lado hasta decidir dónde vive la cuenta de prueba.
