# El plan de vuelo: formulario OACI y presentación ante EANA

Las fuentes de `src/lib/plan-de-vuelo.ts`, `plan-de-vuelo-pdf.ts` y `oficinas-aro.ts`.
Leídas el 2026-10-10. Lo regulatorio se escribe contra esto, no de memoria
(invariante 6 de `AGENTS.md`).

## Las fuentes

| Documento | Qué tomamos | Dónde |
|---|---|---|
| **AIP Argentina, ENR 1.10** (AIRAC AMDT 2/2025, 27-Nov-25; el Apéndice 1 es de la AMDT 2/2024) | Las formas de presentación (punto 3), los cambios y las demoras (6 y 7), el **formulario modelo OACI** (Apéndice 1, pág. ENR 1.10-9) y las **instrucciones casilla por casilla** (Apéndice 1, punto 2) | https://ais.anac.gob.ar/descarga/aip-68de68fddd504 |
| **AIC A 19/2026** (17-Jun-26, GO-EANA; cancela la A 08/2025) | Presentación por mail: firmado, digitalizado, **en PDF**, a la ARO/AIS del aeródromo de salida "o a la más cercana que se encuentre brindando servicio", con la matrícula en el asunto; confirmar **por teléfono**; **guardar el formulario un año**. El Anexo ALFA: 49 oficinas con correo y teléfonos | https://ais.anac.gob.ar/descarga/aic-6a32db490b7b8 — el texto del anexo está en `src/data/aic-oficinas-aro.txt` |
| **PROGEN-ARO** (Res. ANAC 35/2025, Anexo I) | La ARO "comprobará que han sido completadas con exactitud, todas las casillas (de la 7 hasta la 19 inclusive)" (4.1.9). El modelo de formulario es el del PROGEN-ATM, Apéndice 2, que es el que reproduce la AIP | https://argentina.gob.ar/sites/default/files/anexo_i_-_progen_-_aro_-_resolucion_35-2025.pdf |
| **EANA, "Plan de vuelo — Datos para llenar casillas 10 y 18"** (oct. 2024) | Las mismas letras de la casilla 10 y los indicadores de la 18, en una hoja | https://eana.com.ar/sites/default/files/2024-11/Plan%20de%20Vuelo%20-%20casilla%2010%20y%2018%20-%20OCT_2024.pdf |

## Casilla por casilla (ENR 1.10, Apéndice 1, punto 2.2)

- **Generalidades (2.1):** "Insértense siempre las horas con 4 cifras UTC. Insértense las
  duraciones previstas con 4 cifras (horas y minutos)." Lo sombreado antes de la casilla
  3 (prioridad, destinatarios, hora de depósito, remitente) es para los servicios ATS y
  COM: queda en blanco.
- **7:** la matrícula "sin exceder de 7 caracteres alfanuméricos y sin guiones o
  símbolos" (p. ej., LVGVE).
- **8:** reglas V, I, Y o Z; tipo G para aviación general.
- **9:** el número, "si se trata de más de una" (si es una, en blanco); el designador del
  Doc 8643, o ZZZZ y `TYP/` en la 18; estela L si la masa máxima de despegue es de 7.000
  kg o menos.
- **10 a):** N si no se lleva equipo; S si se lleva el normalizado —"los equipos VHF RTF,
  VOR e ILS se consideran normalizados" (Nota 1)— y/o las letras de lo demás (D DME, F
  ADF, G GNSS, L ILS, O VOR, V VHF, Y 8,33 kHz…). **10 b):** N, o el transponder (A, C,
  E, S…) y ADS-B (B1, B2…).
- **13:** el indicador OACI de cuatro letras, o ZZZZ y `DEP/` con "el nombre y lugar del
  aeródromo"; para los que no están en la AIP, el lugar en coordenadas (`4620N07805W`).
  Luego, sin espacio, la EOBT.
- **15 a) y b):** la velocidad verdadera como N y 4 cifras (`N0485`); el nivel como A y 3
  cifras en centenares de pies (`A045`), o "respecto a los vuelos VFR no controlados, las
  letras VFR".
- **15 c), fuera de rutas ATS:** "INSÉRTESE DCT entre puntos sucesivos, a no ser que
  ambos puntos estén definidos por coordenadas geográficas o por marcación y distancia."
  Los puntos van "normalmente separados por no más de 30 minutos de tiempo de vuelo o
  por 370 km (200 NM)". Formatos: designador (2 a 5 caracteres), grados y minutos (11
  caracteres, `4620N07805W`), o marcación magnética y distancia desde un punto con 3 y 3
  cifras (`DUB180040`).
- **16:** destino como en la 13 (`DEST/`), "DESPUÉS, SIN DEJAR UN ESPACIO" la duración
  total prevista; hasta dos alternativas (`ALTN/` si van con ZZZZ).
- **18:** "INSÉRTESE 0 (cero) si no hay otros datos", o los indicadores **en el orden de
  la AIP**: STS, PBN, NAV, COM, DAT, SUR, DEP, DEST, DOF, REG, EET, SEL, TYP, CODE, DLE,
  OPR, ORGN, PER, ALTN, RALT, TALT, RIF, RMK. "Los guiones o barras oblicuas sólo deben
  usarse como se estipula." `DOF/` es la fecha de salida en seis cifras, AAMMDD.
- **19:** E/ la autonomía en 4 cifras; P/ las personas a bordo, o TBN; R/, S/, J/ y D/:
  **se tacha** lo que no se lleva ("TÁCHESE U si no está disponible la frecuencia UHF de
  243,0 MHz"…); A/ el color y las marcas; N/ se tacha si no hay observaciones; C/ el
  piloto al mando; y quién lo presenta.

## Decisiones de Vector sobre lo que la norma deja abierto

- **DOF/ va siempre**, con la fecha **UTC** de la salida: una salida a las 22:00 en
  Argentina es otro día en UTC. La AIP no obliga a ponerlo en un vuelo del día, pero
  tampoco lo prohíbe, y saca la duda de qué día es.
- **El formulario es el de EANA**, no el dibujo de la AIP: el que se imprime en las
  oficinas ARO/AIS. El fondo sale del plan que Federico presentó el 10/10/2026 y le
  aceptaron (`LVS114-SADF1530SADF_101026.pdf`), y de ese plan salen también las
  convenciones de abajo.
- **Un aeródromo intermedio va con su código** (`ATE`), como en ese plan. La AIP reconoce
  los indicadores nacionales de tres letras.
- **La ruta empieza y termina con DCT** (`DCT ATE DCT`), como en ese plan.
- **NAV/ABAS** cuando el GPS tiene aumentación ABAS (con Z en la casilla 10), y **PER/**
  con la categoría de performance, si el piloto la marca.
- **Casilla 19:** el teléfono va en las observaciones (`N/ T.E. +54…`); "Comandante de la
  aeronave" lleva nombre, licencia y número; las radios de emergencia son las de
  supervivencia, no la VHF del avión; "Presentado por" queda vacío si no lo presenta otro.
- **Hora oficial argentina = UTC−3**, sin horario de verano (`DESFASE_ARGENTINA_HORAS`).
- **No se completa nada con valores estimados**: si el planificador usa la TAS o el
  consumo por defecto, el PDF no se baja hasta cargarlos.
- **Se manda desde el mail del piloto**, no desde Vector: la respuesta de la oficina le
  llega a él, y su carpeta de enviados es la copia que la AIC pide guardar un año.

## Lo que no sabemos

- **El horario de cada oficina ARO/AIS.** La AIC dice "la más cercana que se encuentre
  brindando servicio"; Vector propone la más cercana por distancia y deja elegir otra.
- **La AIC trae el mismo teléfono para Córdoba (SACO) y Bahía Blanca (SAZB)**,
  `(+54 351) 4756428`: con la característica de Córdoba, parece un error de la AIC. Se
  copió tal cual, y la pantalla muestra la lista entera de teléfonos de cada oficina.
- Los plazos de anticipación para presentar un plan VFR no están en la ENR 1.10; sí los
  de cambios (CHG, hasta 15 minutos antes de la EOBT) y demoras (DLA, avisar con 30
  minutos; más de 1 hora de demora en un vuelo no controlado obliga a enmendar o
  presentar uno nuevo).
