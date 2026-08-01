# Fase 1.5 — Hallazgos adicionales tras la primera implementación

Este documento se agrega después de que Opus 5 implementó la Fase 0-5 del plan original (`03-plan-implementacion.md`). Se probó de nuevo Vector en la cuenta real de Federico (solo lectura, sin guardar nada) y FlightDeck en la cuenta de test, pantalla por pantalla, para precisar qué falta a nivel estético — que es el pedido explícito de Federico: "todavía no se siente como FlightDeck".

---

## 1. Confirmado que ya funciona bien (no tocar)

- **Resolución ICAO en vivo**: `SADM` → "Morón" aparece igual que en FlightDeck.
- **Block Time / Tiempo ANAC como dos valores separados**: implementado exacto, mismo formato de chip negro.
- **Desglose "02" con toggle + slider**: funciona, con "Asignado X/X h" corriendo arriba y badge "RESTO" en la categoría default — coincide con el patrón de FlightDeck.
- **Labels de campo en mayúscula chica gris** (SALIDA, LLEGADA, AERONAVE, FINALIDAD, FECHA, ATERRIZAJES, DESPEGUE/ATERRIZAJE UTC): esto en realidad **ya está igual** que FlightDeck — se había marcado como "no verificado" en el brief anterior, ahora confirmado que sí se aplicó de forma consistente. No es un gap.
- **Auditoría**: la página existe, con cards Críticas/Advertencias/Suprimidas, tabs Abiertas/Suprimidas, botón Reanalizar, y un empty-state ("El libro cierra sin observaciones") con ícono de check verde — bien resuelto.
- **Vencimientos** (antes solo un campo CMA): ahora es una lista real con categoría, fecha, pill de estado ("Vence en 517 días") y acciones editar/borrar, más botón "+ Agregar documento". El patrón visual (nombre + badge de categoría + fecha + pill de estado + iconos de acción a la derecha) es prácticamente idéntico al de FlightDeck.

---

## 2. Gap real más grande: Nuevo Vuelo como página, no como modal

FlightDeck abre "Nuevo Vuelo" como un **diálogo flotante centrado sobre el fondo difuminado** (blur del dashboard detrás), con ancho fijo (~930px), no ocupa toda la pantalla, tiene su propio botón de cerrar (X) arriba a la izquierda del título, y "Cancelar" / "Guardar Vuelo" quedan siempre visibles abajo sin scrollear.

Vector navega a `/dashboard/log-flight` como página completa, full-width, con scroll largo.

**Por qué importa (según la lógica de Federico):** un modal comunica "esto es una acción rápida que voy a hacer y cerrar", una página comunica "este es un formulario largo que tengo que completar". Es probablemente el factor individual que más pesa en la sensación de "esto no se siente FlightDeck", más que cualquier diferencia de color.

**Sugerencia:** convertir `/dashboard/log-flight` en un modal/dialog (Radix Dialog o similar, ya que el stack tiene Framer Motion) que se abre sobre el Dashboard o la Bitácora, en vez de ser una ruta de página completa. Mantener la ruta como fallback para deep-linking, pero el flujo normal (botón "+") debería abrir el modal sin navegar.

---

## 3. Paleta: Vector sigue usando azul de marca, FlightDeck es casi monocromático

En el form de vuelo, FlightDeck usa negro/blanco/gris en casi todo — el único color real es el número de Tiempo ANAC. Vector usa azul en el toggle Local/Travesía, en los switches del desglose, en accents de texto. Esto no es "incorrecto", es una decisión de marca — pero es la razón visual más obvia de por qual Vector se ve "más SaaS genérico" y FlightDeck se ve "más instrumento de cabina".

**Sugerencia (opcional, es una decisión de producto no solo de código):** reservar el azul de marca para un solo acento por pantalla (ej. el link/CTA principal) y pasar controles secundarios (toggles, switches) a negro/gris, como prueba en una sola pantalla (Nuevo Vuelo) antes de extenderlo a toda la app.

---

## 4. Detalle puntual: Aterrizajes sigue siendo input numérico plano

FlightDeck reemplazó el campo de aterrizajes por un **stepper (−/+ con número al medio)**, no un input de texto. Vector todavía tiene `ATERRIZAJES` como input numérico plano con el valor "1" tipeable a mano.

Es un cambio chico (una tarde de trabajo) pero es exactamente el tipo de "micro-interacción táctil" que Federico identificó como lo que más le gusta de FlightDeck.

---

## 5. Auditoría: los cards de conteo no tienen ícono de severidad

Vector: los 3 cards (Críticas / Advertencias / Suprimidas) muestran solo el número y el label en texto, sin ícono.

FlightDeck: cada card tiene un ícono dentro de un círculo de color acorde a la severidad — escudo rojo para Críticas, triángulo de advertencia naranja para Advertencias, ojo tachado gris para Suprimidas. Además tiene un link "Expandir todo" junto al conteo de reglas, y cada finding individual se muestra como fila expandible con: pill de severidad (ej. "ADVERTENCIA" en amarillo), nombre de la regla en negrita, cantidad de vuelos afectados, y texto explicativo en gris debajo.

Vector hoy tiene 0 hallazgos así que no se pudo ver cómo se renderiza una fila con datos reales — vale la pena revisar ese estado con datos de prueba (en una cuenta que no sea la real de Federico) antes de dar la Fase 2 por completa.

**Sugerencia:** agregar los íconos de severidad a los 3 cards, y confirmar que el patrón fila-expandible con pill + regla + conteo + explicación esté implementado para cuando haya hallazgos reales.

---

## 6. Documentación: falta el patrón de "chips de alta rápida"

FlightDeck, en la página de Documentación, muestra una fila de chips clickeables ("Inglés OACI", "Certificado ORR", "Cert. Horas ANAC", "Cert. Validez Licencia", "Antecedentes", "Pasaporte") que abren directamente el modal de carga con la categoría pre-seleccionada — evita tener que elegir la categoría de una lista larga cada vez.

Vector hoy solo tiene un botón genérico "+ Agregar documento" que probablemente abre un selector de categoría desde cero.

Nota aparte: FlightDeck también tiene una feature de verificación de identidad con DNI (card superior, "Validá tu identidad una vez con el frente del DNI") — esto es más una feature de confianza/compliance que estética, no es prioritario para este ajuste, pero queda documentado por si en algún momento Vector quiere sumar verificación de identidad.

**Sugerencia:** agregar 4-6 chips de categorías frecuentes arriba del botón "Agregar documento" en Vector, usando la misma taxonomía ya definida en la Fase 4 original.

---

## 7. Aeropuertos: página de ficha por aeródromo, ausente en Vector

Esto ya estaba listado como "faltante confirmado" en el brief original, pero ahora se probó a fondo en FlightDeck y vale la pena describirlo con precisión porque es visualmente el patrón más "producto pulido" de toda la app:

Al buscar un ICAO (ej. `SADF`), la ficha muestra:
- El código ICAO en tipografía enorme (~48px, negro, bold) al lado del nombre del aeródromo, con chips chicos OACI/IATA/LOCAL debajo del nombre.
- Pills de clasificación en una fila (PÚBLICO, CONTROLADO, INTERNACIONAL, y un cuarto pill rojo "NO" cuyo significado no quedó claro sin abrir el detalle — posiblemente "NO apto para vuelo nocturno" o similar).
- Grid de 6 mini-cards con ícono (Elevación, FIR, Región, Referencia, Coordenadas, Tipo), cada una con label chico gris arriba y valor grande abajo.
- Sección "Meteorología" con pill de condición (ej. "IMC · INSTRUMENTOS" en naranja), 5 mini-cards (Viento, Temp, Visib., QNH, Techo) y el código METAR crudo en una barra de fondo gris tipo monoespaciado.
- Card "Datos operativos detallados en la AIP" con link externo a la fuente oficial ANAC.
- Footer con fuente y fecha de vigencia ("Fuente: MADHEL — ANAC · vigencia 02/02/2024") y link a "Ficha oficial (PDF)".

Vector no tiene una página equivalente — "Ruta METAR" cubre planificación multi-tramo (un caso de uso distinto: varios aeródromos en una ruta), no la ficha completa de un aeródromo individual.

Esto depende de la infraestructura de la Fase 0 (tabla `airports` + overlay MADHEL) que ya debería existir si se implementó el resolver ICAO — así que el costo incremental de esta página es sobre todo de frontend, reutilizando el endpoint de búsqueda que ya se construyó.

**Prioridad:** media — es la pantalla más visualmente distintiva de FlightDeck después de Nuevo Vuelo, pero es una página nueva completa (no un ajuste), así que conviene evaluarla como su propia fase (era la Fase 0 original la que se limitaba al resolver, no a esta ficha completa).

---

## Resumen de próximos pasos, en orden de impacto en la sensación de uso

| # | Qué | Esfuerzo | Impacto en "sensación FlightDeck" |
|---|---|---|---|
| 1 | Nuevo Vuelo como modal, no página | M | Muy alto — es estructural |
| 2 | Reducir paleta azul a un acento por pantalla en Nuevo Vuelo | S-M | Alto — cambia el tono general |
| 3 | Stepper −/+ en Aterrizajes | S | Medio — pero es el tipo de detalle que Federico nota |
| 4 | Íconos de severidad en cards de Auditoría + verificar fila de finding con datos reales | S | Medio |
| 5 | Chips de alta rápida en Documentación | S | Bajo-medio |
| 6 | Página de ficha de aeródromo (Aeropuertos) | L | Medio — feature nueva, no ajuste |
