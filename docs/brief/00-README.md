# Brief para Opus 5 — Rediseño UX/UI de Vector inspirado en FlightDeck

> **Estado al 2026-07-31: las Fases 0, 1 y 3 ya están implementadas**, igual
> que la corrección del copiloto. Este documento quedó tal como fue escrito, o
> sea que las sigue describiendo como pendientes — no las rehagas. Antes de
> tocar nada leé `AGENTS.md` en la raíz del repo: la bitácora explica qué se
> hizo, **en qué puntos la implementación se apartó a propósito de lo que dice
> este brief y por qué**, y la sección "Pasos a seguir" tiene lo que queda.

## Cómo usar esta carpeta

Federico (dueño de Vector) quiere que la interacción y el pulido visual de Vector se acerquen mucho más a los de **FlightDeck** (flightdeck.ar), un competidor directo que probó a fondo y le gustó mucho la UX. Esta carpeta es el brief completo para implementar ese acercamiento.

Nota sobre imágenes: no pude adjuntar capturas de pantalla como archivos binarios en esta carpeta (la herramienta de navegador que usé guarda las capturas en el Chrome real del usuario, no en este entorno de archivos). Para compensar, `01-benchmark-flightdeck.md` describe cada patrón de interacción con el nivel de detalle que normalmente daría una captura: textos exactos, comportamiento de cada estado, coordenadas relativas, colores y microcopys tal como aparecen en la app real. Si necesitás las imágenes igual, pedile a Federico que comparta su pantalla o tome capturas puntuales de flightdeck.ar (cuenta de prueba, no la usa) — todo lo relevante ya está descripto acá en texto.

Leé los documentos en este orden:

1. **`01-benchmark-flightdeck.md`** — Qué hace FlightDeck y cómo se siente usarlo, patrón por patrón. Es la referencia de "a dónde queremos llegar".
2. **`02-estado-actual-vector.md`** — Qué tiene Vector hoy (probado en la cuenta real de producción de Federico, con datos reales — no se modificó nada). Es el punto de partida.
3. **`03-plan-implementacion.md`** — El plan de trabajo fase por fase, con lo que va en frontend vs backend, dependencias y prioridad. Prioriza explícitamente los puntos donde la brecha con FlightDeck es más grande.

## Restricción importante

Vector-FrontEnd es solo el frontend (Next.js 16, App Router, Tailwind v4, Framer Motion). Los datos reales viven en un backend separado (`api.flightlog.fdiaznemeth.com.ar`) y la autenticación en otro servicio (`auth.flightlog.fdiaznemeth.com.ar`). El frontend habla con ambos vía `apiFetch` (`src/lib/api.ts`) con Bearer token. Cualquier cambio de modelo de datos (auditoría, documentación, aeródromos) requiere tocar ese backend, no solo este repo — coordinarlo antes de asumir que es un cambio solo-frontend.

## Filosofía del pedido de Federico

No se trata de copiar features una por una — se trata de que la **sensación** de usar Vector se parezca a la de FlightDeck: respuesta instantánea a cada input, prevención de errores en vez de mensajes de error después del hecho, y una jerarquía visual que guía al usuario en vez de mostrarle 8 campos vacíos de una. Priorizá la interacción sobre el feature-count.
