"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Compass, Info, Plus, Printer, Trash2, Wind } from "lucide-react";
import type { Aircraft } from "@/types";
import type { PuntoResuelto } from "@/app/api/puntos/route";
import PuntoResolver from "./PuntoResolver";
import PageHeader from "./PageHeader";
import PlanMapa from "./PlanMapa";
import BriefingRuta from "./BriefingRuta";
import AlternativasCerca from "./AlternativasCerca";
import StyledSelect from "./StyledSelect";
import { fmt, hoursToHm, num, NumberField, ToolNote } from "./tools/ToolPrimitives";
import { calcularPlan, type ParametrosTramo } from "@/lib/navegacion";
import { computeFuel } from "@/lib/aviation";
import {
  diferenciaConSuperficie,
  nivelParaAltitud,
  type NivelViento,
} from "@/lib/vientos-altura";
import {
  DISPERSION_TOLERABLE,
  MAX_PUNTOS,
  dispersionDeVariacion,
  parsearRuta,
  puntosConBriefing,
  rutaAUrl,
  type PuntoRuta,
} from "@/lib/ruta-planificada";

/**
 * El planificador de navegación.
 *
 * Vector entraba recién cuando el vuelo había terminado. Los tramos, rumbos, tiempos y
 * combustible se hacían la noche anterior en una planilla fotocopiada, y para el
 * usuario de esta app eso pesa doble: es un PPA construyendo horas de travesía para el
 * PCA, o sea que planificar es lo que más hace.
 *
 * ## Reglas que sigue, y de dónde salen
 *
 * - **No hay botón "Calcular".** Es la convención de todos los calculadores de Vector
 *   (`ToolPrimitives`): los campos se guardan como texto y se parsean en cada render,
 *   nunca en el `blur`. Un `number` en el estado pelearía con el usuario por valores a
 *   medio tipear como "1." o "-".
 * - **Toda la matemática en verdadero; la variación se aplica al mostrar.** Ver
 *   `lib/navegacion.ts`. Acá eso se traduce en una sola cosa: el viento que se le pasa
 *   al cálculo es el del METAR **sin convertir**, porque el METAR escrito ya viene en
 *   grados verdaderos.
 * - **Cuando no se sabe, se dice.** Un tramo con un código sin resolver no se saltea:
 *   anula el cálculo y la pantalla señala cuál falta. Saltearlo uniría los vecinos con
 *   una recta que nadie va a volar y daría un total más corto con pinta de válido.
 * - **Un punto que no es aeródromo no va al briefing.** Una coordenada propia nunca va a
 *   tener METAR, y `veredictoDeRuta` cuenta cuántas estaciones contestaron para decidir
 *   si puede opinar: mandarla igual la contaría como una estación caída y bajaría el
 *   veredicto de una ruta impecable. Ver `puntosConBriefing`.
 *
 * ## Un punto ya no es sólo un aeródromo
 *
 * Se puede escribir `SADM` como siempre, y además `S34.68/W58.64` —el pueblo, el cruce
 * de rutas, la laguna, que es como se vuela VFR de verdad— o `BAR/045/25`, que son 25 NM
 * en el radial 045 del VOR de Bariloche. La gramática vive en `lib/puntos.ts` y el campo
 * es `PuntoResolver`, que existe justamente porque `AirportResolver` sólo acepta cuatro
 * letras y lo usan otras seis pantallas.
 *
 * ## Sin persistencia, a propósito
 *
 * El estado vive en la URL. Un plan se comparte mandando el link y se imprime desde el
 * navegador. Guardarlo en la base exigiría tabla, endpoints, permisos y una pantalla de
 * "mis planes" para algo que se usa una vez, la noche antes.
 */

/** Lo que se usa cuando la aeronave no tiene performance cargada. */
const TAS_POR_DEFECTO = 110;
const CONSUMO_POR_DEFECTO = 32;

interface Props {
  aeronaves: Aircraft[];
  /** Estado inicial leído de la URL por la página. */
  rutaInicial: string[];
  aeronaveInicial: string;
}

export default function PlanificadorClient({ aeronaves, rutaInicial, aeronaveInicial }: Props) {
  const [codigos, setCodigos] = useState<string[]>(() =>
    rutaInicial.length >= 2 ? rutaInicial : ["", ""]
  );
  const [resueltos, setResueltos] = useState<(PuntoResuelto | null)[]>(() =>
    Array(Math.max(rutaInicial.length, 2)).fill(null)
  );
  const [aeronaveId, setAeronaveId] = useState(aeronaveInicial);

  const [tas, setTas] = useState("");
  const [consumo, setConsumo] = useState("");
  const [combustible, setCombustible] = useState("");
  const [reserva, setReserva] = useState("45");

  const [vientoDir, setVientoDir] = useState("");
  const [vientoVel, setVientoVel] = useState("");
  const [variacion, setVariacion] = useState("");

  /*
    Tres banderas de "el piloto ya lo tocó". Sin ellas, el autocompletado desde la
    aeronave o desde el METAR pisaría lo que la persona acaba de escribir cada vez que
    cambia otra cosa — el peor modo de falla de un formulario que se completa solo.
  */
  const tocoPerformance = useRef(false);
  const tocoViento = useRef(false);
  const tocoVariacion = useRef(false);

  const [metar, setMetar] = useState<{ estacion: string; texto: string } | null>(null);

  /** Altitud de crucero. Es lo que decide qué nivel de viento en altura corresponde. */
  const [altitud, setAltitud] = useState("");
  const [niveles, setNiveles] = useState<NivelViento[]>([]);
  /** El viento de superficie que trajo el METAR, para poder compararlo con el de altura. */
  const vientoSuperficie = useRef<{ direccion: number; velocidad: number } | null>(null);

  const aeronave = aeronaves.find((a) => a.id === aeronaveId) ?? null;

  /* ---------------------------------------------------------------------- */
  /* Autocompletado                                                          */
  /* ---------------------------------------------------------------------- */

  // Performance desde la aeronave elegida.
  useEffect(() => {
    if (!aeronave || tocoPerformance.current) return;
    if (aeronave.cruise_tas_kt) setTas(String(aeronave.cruise_tas_kt));
    if (aeronave.fuel_burn_lph) setConsumo(String(aeronave.fuel_burn_lph));
    if (aeronave.fuel_capacity_l) setCombustible(String(aeronave.fuel_capacity_l));
  }, [aeronave]);

  const salida = resueltos[0] ?? null;

  // Variación desde el aeródromo de salida.
  useEffect(() => {
    if (tocoVariacion.current) return;
    if (salida?.variacionW !== undefined) setVariacion(String(salida.variacionW));
  }, [salida]);

  /*
    Viento desde el METAR de salida — **sólo si la salida es un aeródromo**. Se puede
    empezar una ruta en una coordenada, y pedirle el METAR a `S34.68/W58.64` sería pedirle
    el clima a un código que no existe: un 404 y un campo de viento que no se completa
    nunca, sin explicación.
  */
  const icaoSalida = salida?.clase === "aerodromo" ? salida.codigo : null;

  useEffect(() => {
    if (!icaoSalida || tocoViento.current) return;
    let cancelado = false;

    (async () => {
      try {
        const res = await fetch(`/api/weather?icao=${encodeURIComponent(icaoSalida)}`);
        if (!res.ok || cancelado) return;
        const datos = await res.json();
        if (cancelado || tocoViento.current) return;

        // `windDir` puede venir "VRB" cuando el viento es variable. No es un número y
        // no hay rumbo que corregir: se deja el campo vacío en vez de inventar un cero,
        // que sería viento del norte.
        const dir = Number(datos.windDir);
        const vel = Number(datos.windSpeed);
        if (Number.isFinite(dir)) setVientoDir(String(dir));
        if (Number.isFinite(vel)) setVientoVel(String(vel));
        if (Number.isFinite(dir) && Number.isFinite(vel)) {
          vientoSuperficie.current = { direccion: dir, velocidad: vel };
        }
        if (datos.metar) {
          setMetar({ estacion: datos.nearestStation?.icao || icaoSalida, texto: datos.metar });
        }
      } catch {
        // Sin METAR se planifica igual, con viento cero o el que el piloto tipee. No
        // vale la pena molestar con un error por un dato que es una comodidad.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [icaoSalida]);

  // Viento en altura para el punto de salida.
  useEffect(() => {
    if (salida?.lat === undefined || salida?.lon === undefined) return;
    let cancelado = false;

    (async () => {
      try {
        const res = await fetch(`/api/winds-aloft?lat=${salida.lat}&lon=${salida.lon}`);
        if (!res.ok || cancelado) return;
        const datos = await res.json();
        if (!cancelado) setNiveles(datos.niveles ?? []);
      } catch {
        // Sin viento en altura se planifica con el de superficie, que es lo que se venía
        // haciendo. No es un error que valga la pena mostrar.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [salida?.lat, salida?.lon]);

  /*
    Cuando hay altitud de crucero y hay niveles, el viento sale del nivel que corresponde
    en vez del METAR de superficie. **Es el salto de calidad del planificador**: a 3.000 ft
    el viento suele rolar 20-30° a la derecha y soplar 10-15 kt más que en la pista.

    Respeta `tocoViento` igual que el METAR: si el piloto escribió un viento, manda el suyo.
  */
  const altitudNum = num(altitud);
  const nivelElegido = altitudNum > 0 ? nivelParaAltitud(niveles, altitudNum) : null;

  useEffect(() => {
    if (!nivelElegido || tocoViento.current) return;
    setVientoDir(String(nivelElegido.direccion));
    setVientoVel(String(nivelElegido.velocidad));
  }, [nivelElegido]);

  /* ---------------------------------------------------------------------- */
  /* Estado en la URL                                                        */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const params = new URLSearchParams();
    const ruta = rutaAUrl(codigos.filter(Boolean));
    if (ruta) params.set("ruta", ruta);
    if (aeronaveId) params.set("av", aeronaveId);
    const query = params.toString();

    /*
      `history.replaceState` y no `router.replace`: esto corre con cada tecla del campo
      de ruta, y `router.replace` dispara un render del server component en cada una.
      La URL es estado de esta pantalla, no una navegación.
    */
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [codigos, aeronaveId]);

  /* ---------------------------------------------------------------------- */
  /* Puntos y cálculo                                                        */
  /* ---------------------------------------------------------------------- */

  const puntos: PuntoRuta[] = useMemo(
    () =>
      codigos.map((codigo, i) => {
        const ref = resueltos[i];
        return {
          codigo,
          label: ref?.label ?? "",
          lat: ref?.lat,
          lon: ref?.lon,
          variacionW: ref?.variacionW,
          resuelto: !!ref,
          clase: ref?.clase,
          elevacionFt: ref?.elevacionFt,
          pistas: ref?.pistas,
          estacion: ref?.estacion,
        };
      }),
    [codigos, resueltos]
  );

  const cargados = puntos.filter((p) => p.codigo.trim());
  const faltantes = cargados.filter((p) => p.lat === undefined || p.lon === undefined);
  const listos = faltantes.length === 0 && cargados.length >= 2;

  const tasNum = num(tas, aeronave?.cruise_tas_kt ?? TAS_POR_DEFECTO);
  const consumoNum = num(consumo, aeronave?.fuel_burn_lph ?? CONSUMO_POR_DEFECTO);
  const usandoTasEstimada = !tas.trim() && !aeronave?.cruise_tas_kt;

  const parametros: ParametrosTramo = {
    tasKt: tasNum,
    viento: { direccion: num(vientoDir), velocidad: num(vientoVel) },
    variacionW: num(variacion),
    consumoLh: consumoNum,
  };

  const plan = useMemo(
    () =>
      listos
        ? calcularPlan(
            cargados.map((p) => ({ lat: p.lat!, lon: p.lon! })),
            parametros
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listos, JSON.stringify(cargados.map((p) => [p.lat, p.lon])), JSON.stringify(parametros)]
  );

  const dispersion = dispersionDeVariacion(puntos);

  const combustibleNum = num(combustible);
  const chequeoCombustible =
    plan?.totales.minutos != null && combustibleNum > 0
      ? computeFuel({
          fuelOnBoard: combustibleNum,
          burnRate: consumoNum,
          reserveMinutes: num(reserva, 45),
          legMinutes: plan.totales.minutos,
          groundSpeed: 0,
        })
      : null;

  /* ---------------------------------------------------------------------- */
  /* Edición de la ruta                                                      */
  /* ---------------------------------------------------------------------- */

  const cambiarCodigo = useCallback((i: number, valor: string) => {
    setCodigos((prev) => prev.map((c, j) => (j === i ? valor : c)));
  }, []);

  const resolverPunto = useCallback((i: number, ref: PuntoResuelto | null) => {
    setResueltos((prev) => {
      if (prev[i]?.codigo === ref?.codigo) return prev;
      const copia = [...prev];
      copia[i] = ref;
      return copia;
    });
  }, []);

  const agregarPunto = () => {
    if (codigos.length >= MAX_PUNTOS) return;
    setCodigos((prev) => [...prev, ""]);
    setResueltos((prev) => [...prev, null]);
  };

  const quitarPunto = (i: number) => {
    // Dos es el mínimo: con uno no hay tramo que calcular y la pantalla no tendría
    // nada que mostrar.
    if (codigos.length <= 2) return;
    setCodigos((prev) => prev.filter((_, j) => j !== i));
    setResueltos((prev) => prev.filter((_, j) => j !== i));
  };

  /**
   * Reemplaza la ruta entera de un saque.
   *
   * **Conserva lo ya resuelto, y no es una optimización: sin eso queda roto.**
   * `AirportResolver` avisa su resolución sólo cuando su `value` cambia, así que si
   * acá se borran todas las resoluciones, un código que quedó en la misma posición
   * —el SADM de salida, casi siempre— nunca vuelve a avisar y el plan se queda
   * diciendo "no reconocemos SADM" para siempre. Se remapea por código.
   */
  const pegarRuta = (texto: string) => {
    const nuevos = parsearRuta(texto);
    if (nuevos.length < 2) return;

    const porCodigo = new Map<string, PuntoResuelto>();
    resueltos.forEach((ref, i) => {
      if (ref) porCodigo.set(codigos[i].trim().toUpperCase(), ref);
    });

    setCodigos(nuevos);
    setResueltos(nuevos.map((c) => porCodigo.get(c) ?? null));
  };

  const puntosMapa = cargados
    .filter((p) => p.lat !== undefined && p.lon !== undefined)
    .map((p) => ({ codigo: p.codigo, label: p.label, lat: p.lat!, lon: p.lon! }));

  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-8 md:space-y-10">
      <PageHeader
        eyebrow="Planificación"
        title="Planificador"
        action={
          <button
            type="button"
            onClick={() => window.print()}
            data-imprimir="no"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-zinc-200 dark:border-white/10 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        }
      >
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
          Tramos, rumbos, tiempos y combustible. Se calcula solo mientras cargás; el plan queda en la
          dirección de esta página, así que se comparte con el link.
        </p>
      </PageHeader>

      <div
        data-imprimir="planilla"
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-6 md:gap-10"
      >
        {/* ------------------------------------------------ Entradas ---- */}
        <div className="space-y-8" data-imprimir="no">
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Ruta</h3>

            <div className="space-y-3">
              {codigos.map((codigo, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <PuntoResolver
                      label={i === 0 ? "Salida" : i === codigos.length - 1 ? "Llegada" : `Punto ${i + 1}`}
                      value={codigo}
                      onChange={(v) => cambiarCodigo(i, v)}
                      onResolve={(ref) => resolverPunto(i, ref)}
                      autoFocus={i === 0 && !codigo}
                    />
                  </div>
                  {codigos.length > 2 && (
                    <button
                      type="button"
                      onClick={() => quitarPunto(i)}
                      aria-label={`Quitar punto ${i + 1}`}
                      className="mb-1 p-2.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {codigos.length < MAX_PUNTOS && (
              <button
                type="button"
                onClick={agregarPunto}
                className="inline-flex items-center gap-2 text-sm font-semibold text-aviation-blue hover:underline"
              >
                <Plus className="w-4 h-4" />
                Agregar punto intermedio
              </button>
            )}

            <label className="block">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                O pegá la ruta entera
              </span>
              <input
                type="text"
                placeholder="SADM CHV SAAJ"
                title="Separá los puntos con espacios, comas o guiones. La barra va adentro de un punto: BAR/045/25"
                /*
                  El único campo de la pantalla que **no** se aplica en vivo, y es a
                  propósito. Los demás son valores; éste es un reemplazo masivo: aplicado
                  tecla por tecla, escribir "SADM SADF" pasaría por el estado "SADM S" y
                  tiraría la ruta abajo a mitad de tipeo. Se aplica al salir del campo o
                  con Enter.
                */
                onBlur={(e) => pegarRuta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    pegarRuta((e.target as HTMLInputElement).value);
                  }
                }}
                className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-white/10 py-2 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
              />
            </label>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Aeronave</h3>

            {aeronaves.length > 0 ? (
              <StyledSelect
                name="aeronave"
                value={aeronaveId}
                onChange={(v) => setAeronaveId(v)}
                options={[
                  { value: "", label: "Sin elegir" },
                  ...aeronaves.map((a) => ({
                    value: a.id,
                    label: `${a.registration} — ${a.type}`,
                  })),
                ]}
              />
            ) : (
              <p className="text-xs text-zinc-400">
                No tenés aeronaves cargadas. Podés planificar igual tipeando la performance.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="TAS crucero"
                suffix="kt"
                value={tas}
                onChange={(v) => {
                  tocoPerformance.current = true;
                  setTas(v);
                }}
                placeholder={String(TAS_POR_DEFECTO)}
              />
              <NumberField
                label="Consumo"
                suffix="L/h"
                value={consumo}
                onChange={(v) => {
                  tocoPerformance.current = true;
                  setConsumo(v);
                }}
                placeholder={String(CONSUMO_POR_DEFECTO)}
              />
              <NumberField
                label="Combustible"
                suffix="L"
                value={combustible}
                onChange={(v) => {
                  tocoPerformance.current = true;
                  setCombustible(v);
                }}
              />
              <NumberField
                label="Reserva"
                suffix="min"
                value={reserva}
                onChange={setReserva}
                placeholder="45"
              />
            </div>

            {usandoTasEstimada && (
              <ToolNote>
                Sin TAS cargada se estima con {TAS_POR_DEFECTO} kt y {CONSUMO_POR_DEFECTO} L/h. Cargá la
                performance de la aeronave en el Hangar y el plan deja de ser una estimación.
              </ToolNote>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Wind className="w-4 h-4 text-zinc-400" />
              Viento y variación
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Viento de"
                suffix="°"
                value={vientoDir}
                onChange={(v) => {
                  tocoViento.current = true;
                  setVientoDir(v);
                }}
                min={0}
                max={360}
              />
              <NumberField
                label="Intensidad"
                suffix="kt"
                value={vientoVel}
                onChange={(v) => {
                  tocoViento.current = true;
                  setVientoVel(v);
                }}
                min={0}
              />
            </div>

            <NumberField
              label="Altitud de crucero"
              suffix="ft"
              value={altitud}
              onChange={setAltitud}
              placeholder="4500"
              min={0}
            />

            <NumberField
              label="Variación magnética (W positiva)"
              suffix="°"
              value={variacion}
              onChange={(v) => {
                tocoVariacion.current = true;
                setVariacion(v);
              }}
            />

            {/*
              De dónde salió el viento que está en los campos. Antes decía siempre "del
              METAR"; ahora puede venir del modelo en altura, y **el piloto tiene que
              saber cuál está usando**: son números distintos y llevan a rumbos distintos.
            */}
            {nivelElegido ? (
              <ToolNote>
                Viento a {fmt(nivelElegido.altitudFt, 0)} ft ({nivelElegido.hPa} hPa) del modelo GFS.
                {(() => {
                  const sup = vientoSuperficie.current;
                  if (!sup) return null;
                  const d = diferenciaConSuperficie(sup, nivelElegido);
                  return (
                    <>
                      {" "}Contra la superficie{" "}
                      <strong>
                        {d.giroGrados === 0
                          ? "no rola"
                          : `rola ${fmt(Math.abs(d.giroGrados), 0)}° a la ${d.giroGrados > 0 ? "derecha" : "izquierda"}`}
                      </strong>{" "}
                      y sopla {d.masNudos >= 0 ? `${fmt(d.masNudos, 0)} kt más` : `${fmt(-d.masNudos, 0)} kt menos`}.
                    </>
                  );
                })()}
              </ToolNote>
            ) : metar ? (
              <ToolNote>
                Viento tomado del METAR de {metar.estacion}. <strong>Es viento de superficie</strong>, y
                se está usando para crucero. Cargá la altitud de crucero y lo tomamos del modelo en
                altura, que es bastante distinto: suele rolar a la derecha y soplar más fuerte.
              </ToolNote>
            ) : null}

            {altitudNum > 0 && niveles.length === 0 && (
              <ToolNote>
                No pudimos traer el viento en altura para esta zona. Se sigue usando el de superficie.
              </ToolNote>
            )}

            {dispersion !== null && dispersion > DISPERSION_TOLERABLE && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
                <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                  Entre las puntas de esta ruta la variación cambia {fmt(dispersion, 1)}°. Una sola para
                  todo el plan alcanza en travesías cortas; acá conviene recalcular los últimos tramos con
                  la del destino.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* ------------------------------------------------ Resultados --- */}
        <div className="space-y-6">
          {!listos ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 px-6 py-14 text-center">
              <Compass className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
              <p className="mt-4 text-sm font-semibold text-zinc-900 dark:text-white">
                {faltantes.length > 0
                  ? `No reconocemos ${faltantes.map((p) => p.codigo).join(", ")}`
                  : "Cargá salida y llegada"}
              </p>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                {faltantes.length > 0
                  ? "El plan no se calcula salteando un punto: uniría los vecinos con una recta que no vas a volar y el total saldría más corto de lo que es."
                  : "Indicador ICAO (SADM), designador de ANAC (MOR), una coordenada propia (S34.68/W58.64) o un punto por radial y distancia (BAR/045/25)."}
              </p>
            </div>
          ) : (
            <>
              {/*
                Con qué se calculó. **En papel es imprescindible**: la planilla se lleva
                al avión sin la pantalla al lado, y un rumbo sin saber con qué viento
                salió no se puede corregir cuando el viento cambia. En pantalla ocupa una
                línea y no molesta.
              */}
              <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 flex flex-wrap gap-x-4 gap-y-1">
                {aeronave && <span>{aeronave.registration}</span>}
                <span>TAS {fmt(tasNum, 0)} kt</span>
                <span>
                  Viento {num(vientoVel) > 0 ? `${grados(num(vientoDir))}/${fmt(num(vientoVel), 0)}` : "calma"}
                </span>
                <span>
                  Var {fmt(Math.abs(num(variacion)), 1)}° {num(variacion) >= 0 ? "W" : "E"}
                </span>
                <span>Consumo {fmt(consumoNum, 0)} L/h</span>
                {altitudNum > 0 && <span>{fmt(altitudNum, 0)} ft</span>}
                <span>
                  Viento {nivelElegido ? `de altura (${nivelElegido.hPa} hPa)` : "de superficie"}
                </span>
              </p>

              <PlanillaTramos plan={plan!} puntos={cargados} />

              <Sintonizar puntos={cargados} />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-imprimir="junto">
                <Total label="Distancia" valor={fmt(plan!.totales.distanciaNm, 1)} unidad="NM" />
                <Total
                  label="Tiempo"
                  valor={plan!.totales.minutos === null ? "—" : hoursToHm(plan!.totales.minutos / 60)}
                />
                <Total
                  label="Combustible"
                  valor={plan!.totales.litros === null ? "—" : fmt(plan!.totales.litros, 1)}
                  unidad="L"
                />
                <Total
                  label={chequeoCombustible ? "Sobra" : "A bordo"}
                  valor={
                    chequeoCombustible
                      ? fmt(chequeoCombustible.remainingAfterLeg, 1)
                      : combustibleNum > 0
                        ? fmt(combustibleNum, 0)
                        : "—"
                  }
                  unidad="L"
                  tono={
                    chequeoCombustible && chequeoCombustible.remainingAfterLeg < 0 ? "bad" : "neutral"
                  }
                />
              </div>

              {chequeoCombustible && chequeoCombustible.remainingAfterLeg < 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-500" />
                  <p className="text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-200">
                    <strong>No alcanza.</strong> Faltan {fmt(Math.abs(chequeoCombustible.remainingAfterLeg), 1)} L
                    para este plan con {num(reserva, 45)} minutos de reserva.
                  </p>
                </div>
              )}

              {plan!.tramosImposibles > 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-500" />
                  <p className="text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-200">
                    Con este viento{" "}
                    {plan!.tramosImposibles === 1
                      ? "hay un tramo que no se puede volar"
                      : `hay ${plan!.tramosImposibles} tramos que no se pueden volar`}
                    . Los totales de tiempo y combustible quedan sin calcular: sumar sólo los tramos que
                    cierran daría un número más chico que la realidad.
                  </p>
                </div>
              )}

              {/* En papel el mapa no sirve: las reglas de impresión sacan los fondos
                  —para no gastar tinta— y con ellos los tiles, así que quedaría un
                  rectángulo vacío ocupando un tercio de la hoja. La planilla es lo que
                  se lleva al avión. */}
              <div data-imprimir="no">
                <PlanMapa puntos={puntosMapa} />
              </div>

              {/*
                El briefing absorbido de la pantalla de Ruta METAR. Antes el piloto
                tipeaba la misma ruta dos veces, en dos pantallas distintas.
              */}
              <BriefingRuta
                puntos={puntosConBriefing(cargados).map((p) => ({
                  codigo: p.codigo,
                  label: p.label,
                  lat: p.lat,
                  lon: p.lon,
                  elevacionFt: p.elevacionFt,
                  pistas: p.pistas,
                  variacionW: p.variacionW,
                }))}
              />

              <AlternativasCerca
                puntos={cargados.map((p) => ({ codigo: p.codigo, lat: p.lat, lon: p.lon }))}
                groundSpeedKt={plan!.tramos[0]?.groundSpeed ?? null}
              />

              {metar && (
                <details className="text-[11px]" data-imprimir="no">
                  <summary className="cursor-pointer font-semibold text-zinc-500 dark:text-zinc-400">
                    METAR usado
                  </summary>
                  <p className="mt-2 font-mono text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400 break-all">
                    {metar.texto}
                  </p>
                </details>
              )}

              <div className="flex items-start gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p>
                  Planilla de apoyo, no un plan de vuelo ANAC. Los rumbos salen de coordenadas por
                  loxodrómica —rumbo constante— y se convierten a magnético con la variación de arriba.
                  Contrastalos con la carta antes de volar.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PlanillaTramos({
  plan,
  puntos,
}: {
  plan: ReturnType<typeof calcularPlan>;
  puntos: PuntoRuta[];
}) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <table className="w-full min-w-[520px] text-sm border-collapse">
        <thead>
          <tr className="text-left">
            {["Tramo", "Dist", "CV", "CM", "WCA", "RM", "GS", "Tiempo", "Comb"].map((h) => (
              <th
                key={h}
                className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 pb-2 pr-3 border-b border-zinc-200 dark:border-white/10"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plan.tramos.map((tramo, i) => (
            <tr key={i} className="border-b border-zinc-100 dark:border-white/5">
              <td className="py-2.5 pr-3 font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                {puntos[i]?.codigo} → {puntos[i + 1]?.codigo}
              </td>
              <td className="py-2.5 pr-3 data text-zinc-600 dark:text-zinc-300">{fmt(tramo.distanciaNm, 1)}</td>
              <td className="py-2.5 pr-3 data text-zinc-400 dark:text-zinc-500">{grados(tramo.cursoVerdadero)}</td>
              <td className="py-2.5 pr-3 data text-zinc-600 dark:text-zinc-300">{grados(tramo.cursoMagnetico)}</td>
              <td className="py-2.5 pr-3 data text-zinc-600 dark:text-zinc-300">
                {tramo.wca >= 0 ? "+" : "−"}
                {fmt(Math.abs(tramo.wca), 0)}
              </td>
              {/* El rumbo magnético es el número que va al DG, así que es el único en
                  negrita: la planilla se lee de reojo en vuelo. */}
              <td className="py-2.5 pr-3 data font-bold text-zinc-900 dark:text-white">
                {grados(tramo.rumboMagnetico)}
              </td>
              <td className="py-2.5 pr-3 data text-zinc-600 dark:text-zinc-300">{fmt(tramo.groundSpeed, 0)}</td>
              <td className="py-2.5 pr-3 data text-zinc-600 dark:text-zinc-300">
                {tramo.minutos === null ? (
                  <span className="text-red-600 dark:text-red-400 font-semibold">no vuela</span>
                ) : (
                  `${Math.round(tramo.minutos)}′`
                )}
              </td>
              <td className="py-2.5 data text-zinc-600 dark:text-zinc-300">
                {tramo.litros === null ? "—" : fmt(tramo.litros, 1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
        CV curso verdadero · CM curso magnético · WCA corrección por viento · RM rumbo magnético a volar
      </p>
    </div>
  );
}

/**
 * Qué sintonizar, cuando algún punto sale de una radioayuda.
 *
 * **Va en la planilla impresa, no atrás de un desplegable.** Es la razón por la que el
 * directorio de radioayudas existe: si un punto está definido como "25 NM en el radial
 * 045 de BAR", el número que hay que poner en el NAV es parte del punto, no un dato de
 * consulta. Buscarlo en la carta con el avión andando es justo lo que esta pantalla
 * viene a evitar.
 *
 * No se muestra nada cuando la ruta es toda de aeródromos, que es la mayoría.
 */
function Sintonizar({ puntos }: { puntos: PuntoRuta[] }) {
  // Una estación puede definir varios puntos —dos radiales del mismo VOR— y se sintoniza
  // una sola vez. Se listan por ident, en el orden en que aparecen en la ruta.
  const estaciones = new Map<string, NonNullable<PuntoRuta["estacion"]>>();
  for (const p of puntos) {
    if (p.estacion && !estaciones.has(p.estacion.ident)) estaciones.set(p.estacion.ident, p.estacion);
  }
  if (estaciones.size === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.03] px-4 py-3">
      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Sintonizar
      </p>
      <ul className="mt-2 space-y-1">
        {[...estaciones.values()].map((e) => (
          <li key={e.ident} className="flex items-baseline gap-2 text-xs">
            <span className="font-bold tracking-wider text-zinc-900 dark:text-white">{e.ident}</span>
            {e.frecuencia && (
              <span className="data font-semibold text-zinc-600 dark:text-zinc-300">{e.frecuencia}</span>
            )}
            <span className="text-zinc-400 dark:text-zinc-500 truncate">
              {e.tipo} · {e.nombre}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Grados de rumbo, siempre con tres dígitos: así se cantan y así se leen. */
function grados(valor: number): string {
  return String(Math.round(valor) % 360).padStart(3, "0");
}

function Total({
  label,
  valor,
  unidad,
  tono = "neutral",
}: {
  label: string;
  valor: string;
  unidad?: string;
  tono?: "neutral" | "bad";
}) {
  return (
    <div className="bg-zinc-50 dark:bg-white/[0.03] rounded-2xl p-4 border border-zinc-100 dark:border-white/5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold data leading-none ${
          tono === "bad" ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-white"
        }`}
      >
        {valor}
        {unidad && <span className="ml-1 text-sm font-bold text-zinc-400 dark:text-zinc-500">{unidad}</span>}
      </p>
    </div>
  );
}
