"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ChevronDown, Download, FileText, Mail, Phone, Share2, Eraser } from "lucide-react";
import type { Aircraft } from "@/types";
import type { PuntoResuelto } from "@/app/api/puntos/route";
import {
  armarPlan,
  asuntoDelMail,
  mensajeFpl,
  salidaUtc,
  type DatosPlanDeVuelo,
  type ElementoRuta,
} from "@/lib/plan-de-vuelo";
import { oficinaParaSalida, primerTelefono, type OficinaUbicada } from "@/lib/oficinas-aro";

/**
 * El plan de vuelo OACI, armado con la ruta del planificador.
 *
 * Lo calculado (ruta, velocidad, nivel, duración, autonomía) sale del planificador; lo
 * que sólo sabe el piloto (equipo, supervivencia, personas a bordo) se marca acá. **El
 * equipo y el color del avión se recuerdan por avión en este navegador**: no cambian
 * entre vuelos, y volver a marcarlos es la fricción que esto viene a sacar. Como la
 * performance del planificador, no van a la base: son una comodidad, no un dato.
 *
 * **Se manda desde el mail del piloto, no desde Vector** (AIC A 19/2026): el PDF firmado
 * va adjunto a la oficina ARO/AIS. Así la respuesta de la oficina le llega a él, y su
 * carpeta de enviados es la copia que la AIC pide guardar un año. Que Vector lo mandara
 * por él dejaría un plan "presentado" del que el piloto no tiene constancia.
 */

interface Props {
  codigos: string[];
  resueltos: (PuntoResuelto | null)[];
  aeronave: Aircraft | null;
  tasKt: number;
  /**
   * El planificador estima TAS y consumo cuando el avión no los tiene cargados. Sirve para
   * una planilla, pero **en un plan de vuelo sería declarar un número inventado**: la
   * velocidad de la casilla 15 y la autonomía de la 19. Con estimados no se baja el PDF.
   */
  tasEstimada: boolean;
  consumoEstimado: boolean;
  altitudFt: number | null;
  minutosTotales: number | null;
  litros: number;
  consumoLh: number;
  oficinas: OficinaUbicada[];
  nombrePiloto: string;
  /** La fecha de hoy en Argentina, resuelta en el server (invariante 1). */
  hoy: string;
}

/** Lo que se recuerda por avión. */
interface Equipo {
  vhf: boolean;
  vor: boolean;
  ils: boolean;
  dme: boolean;
  adf: boolean;
  gnss: boolean;
  ochoTreintaTres: boolean;
  transponder: "" | "N" | "A" | "C" | "S" | "E";
  adsbOut: boolean;
  colorMarcas: string;
  elt: boolean;
}

const EQUIPO_VACIO: Equipo = {
  vhf: true,
  vor: false,
  ils: false,
  dme: false,
  adf: false,
  gnss: false,
  ochoTreintaTres: false,
  transponder: "",
  adsbOut: false,
  colorMarcas: "",
  elt: true,
};

/**
 * Casilla 10 a), ENR 1.10: "S si se lleva equipo normalizado" —VHF RTF, VOR e ILS (Nota
 * 1)— "Y/O" las letras de lo demás; "N si no se lleva equipo". Las letras van en orden.
 */
function codigoEquipo(e: Equipo): string {
  const normalizado = e.vhf && e.vor && e.ils;
  const letras = [
    !normalizado && e.vhf ? "V" : "",
    !normalizado && e.vor ? "O" : "",
    !normalizado && e.ils ? "L" : "",
    e.dme ? "D" : "",
    e.adf ? "F" : "",
    e.gnss ? "G" : "",
    e.ochoTreintaTres ? "Y" : "",
  ]
    .filter(Boolean)
    .sort()
    .join("");
  const codigo = `${normalizado ? "S" : ""}${letras}`;
  return codigo || "N";
}

function codigoVigilancia(e: Equipo): string {
  if (!e.transponder) return "";
  if (e.transponder === "N") return "N";
  return `${e.transponder}${e.adsbOut && (e.transponder === "E" || e.transponder === "S") ? "B1" : ""}`;
}

function leer<T>(clave: string, base: T): T {
  try {
    const v = window.localStorage.getItem(clave);
    return v ? { ...base, ...JSON.parse(v) } : base;
  } catch {
    return base;
  }
}

function guardar(clave: string, valor: unknown) {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento se usa igual: sólo no se recuerda.
  }
}

/** Los puntos del medio de la ruta como los necesita la casilla 15. */
function elementosDeRuta(codigos: string[], resueltos: (PuntoResuelto | null)[]): ElementoRuta[] {
  const out: ElementoRuta[] = [];
  for (let i = 1; i < codigos.length - 1; i++) {
    const codigo = codigos[i]?.trim();
    if (!codigo) continue;
    const r = resueltos[i];
    if (r?.clase === "aerovia") {
      out.push({ tipo: "aerovia", designador: codigo });
    } else {
      out.push({ tipo: r?.clase ?? "fix", codigo: r?.codigo ?? codigo, lat: r?.lat, lon: r?.lon });
    }
  }
  return out;
}

export default function PlanDeVueloOaci(props: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <section
      data-imprimir="no"
      className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-4 p-5 md:p-6 text-left"
      >
        <span className="w-11 h-11 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-white dark:text-zinc-900" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-zinc-900 dark:text-white">Plan de vuelo para EANA</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            El formulario OACI lleno con esta ruta, en PDF para mandar a la oficina ARO/AIS.
          </span>
        </span>
        <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>
      {abierto && <Formulario {...props} />}
    </section>
  );
}

function Formulario({
  codigos,
  resueltos,
  aeronave,
  tasKt,
  tasEstimada,
  consumoEstimado,
  altitudFt,
  minutosTotales,
  litros,
  consumoLh,
  oficinas,
  nombrePiloto,
  hoy,
}: Props) {
  const claveAvion = `vector_fpl_avion_${aeronave?.id ?? "sin"}`;
  const [equipo, setEquipo] = useState<Equipo>(EQUIPO_VACIO);
  const [matricula, setMatricula] = useState(aeronave?.registration ?? "");
  const [tipo, setTipo] = useState(aeronave?.icao ?? "");
  const [fecha, setFecha] = useState(hoy);
  const [hora, setHora] = useState("");
  const [vfrNoControlado, setVfrNoControlado] = useState(altitudFt === null);
  const [altn1, setAltn1] = useState("");
  const [altn2, setAltn2] = useState("");
  const [personas, setPersonas] = useState("");
  const [operador, setOperador] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [supervivencia, setSupervivencia] = useState(false);
  const [chalecos, setChalecos] = useState(false);
  const [notaSupervivencia, setNotaSupervivencia] = useState("");
  const [piloto, setPiloto] = useState(nombrePiloto);
  const [presentadoPor, setPresentadoPor] = useState("");
  const [oficinaElegida, setOficinaElegida] = useState("");
  const [hayFirma, setHayFirma] = useState(false);
  const [estado, setEstado] = useState<"" | "armando" | "listo" | "error">("");
  const lienzo = useRef<HTMLCanvasElement>(null);

  // Lo recordado: por avión el equipo, y del piloto el nombre y el operador.
  useEffect(() => {
    setEquipo(leer(claveAvion, EQUIPO_VACIO));
  }, [claveAvion]);
  useEffect(() => {
    const p = leer("vector_fpl_piloto", { piloto: "", operador: "" });
    if (p.piloto) setPiloto(p.piloto);
    if (p.operador) setOperador(p.operador);
  }, []);

  const cambiarEquipo = (cambio: Partial<Equipo>) => {
    setEquipo((prev) => {
      const nuevo = { ...prev, ...cambio };
      guardar(claveAvion, nuevo);
      return nuevo;
    });
  };

  const salida = { codigo: codigos[0] ?? "", nombre: resueltos[0]?.label ?? "", lat: resueltos[0]?.lat, lon: resueltos[0]?.lon };
  const ultimo = codigos.length - 1;
  const destino = {
    codigo: codigos[ultimo] ?? "",
    nombre: resueltos[ultimo]?.label ?? "",
    lat: resueltos[ultimo]?.lat,
    lon: resueltos[ultimo]?.lon,
  };

  const datos: DatosPlanDeVuelo = {
    matricula,
    reglas: "V",
    tipoVuelo: "G",
    tipoAeronave: tipo,
    descripcionAeronave: aeronave?.type ?? "",
    estela: "L",
    equipo: codigoEquipo(equipo),
    vigilancia: codigoVigilancia(equipo),
    salida,
    destino,
    alternativas: [altn1, altn2].filter((c) => c.trim()).map((c) => ({ codigo: c, nombre: c })),
    fechaLocal: fecha,
    horaLocal: hora,
    tasKt,
    altitudFt: vfrNoControlado ? null : altitudFt,
    ruta: elementosDeRuta(codigos, resueltos),
    minutosTotales: minutosTotales ?? 0,
    litros,
    consumoLh,
    operador,
    observaciones,
    personas,
    radio: { uhf: false, vhf: equipo.vhf, elt: equipo.elt },
    supervivencia: { lleva: supervivencia, polar: false, desierto: false, maritimo: false, selva: false },
    chalecos: { lleva: chalecos, luz: false, fluoresceina: false, uhf: false, vhf: false },
    botes: { lleva: false, numero: "", capacidad: "", cubierta: false, color: "" },
    colorMarcas: equipo.colorMarcas,
    observacionesSupervivencia: notaSupervivencia,
    piloto,
    presentadoPor,
  };
  const armado = armarPlan(datos);
  const plan = armado.plan;
  const faltas = [
    ...(tasEstimada ? [{ casilla: "15", mensaje: "Cargá la TAS de crucero en el planificador: ahora usa una estimada." }] : []),
    ...(consumoEstimado ? [{ casilla: "19", mensaje: "Cargá el consumo en el planificador: la autonomía saldría de uno estimado." }] : []),
    ...armado.faltas,
  ];
  const utc = salidaUtc(fecha, hora);

  const sugerida = useMemo(() => oficinaParaSalida(salida, oficinas), [salida.codigo, salida.lat, salida.lon, oficinas]); // eslint-disable-line react-hooks/exhaustive-deps
  const oficina = oficinas.find((o) => o.oaci === oficinaElegida) ?? sugerida?.oficina ?? null;
  const telefono = oficina ? primerTelefono(oficina.telefonos) : null;
  const asunto = asuntoDelMail(plan, fecha);
  const sinAltitud = !vfrNoControlado && altitudFt === null;
  const listo = faltas.length === 0 && !sinAltitud && hayFirma;

  const recordarPiloto = () => guardar("vector_fpl_piloto", { piloto, operador });

  async function generarPdf(): Promise<File | null> {
    setEstado("armando");
    try {
      recordarPiloto();
      const firmaPng = await new Promise<Uint8Array | undefined>((resolve) => {
        const c = lienzo.current;
        if (!c || !hayFirma) return resolve(undefined);
        c.toBlob(async (b) => resolve(b ? new Uint8Array(await b.arrayBuffer()) : undefined), "image/png");
      });
      const { pdfPlanDeVuelo } = await import("@/lib/plan-de-vuelo-pdf");
      const bytes = await pdfPlanDeVuelo(plan, {
        firmaPng,
        pie: "Formulario modelo OACI de la AIP Argentina (ENR 1.10, Apéndice 1), completado con Vector.",
      });
      setEstado("listo");
      const nombre = `plan-de-vuelo-${plan.c7}-${fecha}.pdf`;
      return new File([bytes as BlobPart], nombre, { type: "application/pdf" });
    } catch {
      setEstado("error");
      return null;
    }
  }

  async function bajar() {
    const archivo = await generarPdf();
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    const a = document.createElement("a");
    a.href = url;
    a.download = archivo.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function compartir() {
    const archivo = await generarPdf();
    if (!archivo) return;
    if (navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: asunto, text: asunto });
      } catch {
        // Cancelar el menú de compartir no es un error.
      }
    } else {
      const url = URL.createObjectURL(archivo);
      window.open(url, "_blank");
    }
  }

  const cuerpo = [
    "Buenos días:",
    "",
    `Adjunto el plan de vuelo de ${plan.c7}, salida ${plan.c13ad} ${plan.c13hora}Z, destino ${plan.c16ad}.`,
    `Piloto al mando: ${piloto}.`,
    "",
    "Gracias.",
  ].join("\n");
  const mailto = oficina
    ? `mailto:${oficina.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
    : "";

  return (
    <div className="border-t border-zinc-100 dark:border-white/5 p-5 md:p-6 space-y-8">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
        La ruta, la velocidad, el nivel, la duración y la autonomía salen de este plan. Completá lo que sólo vos
        sabés y bajá el formulario. Según la AIC A 19/2026, se manda <b>firmado y en PDF</b> a la oficina ARO/AIS,
        y después <b>se llama</b> para confirmar que lo recibieron.
      </p>

      <Grupo titulo="Salida">
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Fecha">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
          </Campo>
          <Campo etiqueta="Fuera de calzos (hora argentina)">
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={INPUT} />
          </Campo>
        </div>
        {utc && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            En el plan: <span className="data font-bold text-zinc-900 dark:text-white">{utc.hora} UTC</span>, DOF/{utc.dof}.
          </p>
        )}
      </Grupo>

      <Grupo titulo="Aeronave">
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Matrícula">
            <input value={matricula} onChange={(e) => setMatricula(e.target.value)} className={`${INPUT} uppercase placeholder:normal-case`} placeholder="LV-ABC" />
          </Campo>
          <Campo etiqueta="Tipo OACI">
            <input value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${INPUT} uppercase placeholder:normal-case`} placeholder="C152" maxLength={4} />
          </Campo>
        </div>
        <Campo etiqueta="Equipo a bordo que funciona (casilla 10)">
          <div className="flex flex-wrap gap-2">
            <Chip activo={equipo.vhf} onClick={() => cambiarEquipo({ vhf: !equipo.vhf })}>VHF</Chip>
            <Chip activo={equipo.vor} onClick={() => cambiarEquipo({ vor: !equipo.vor })}>VOR</Chip>
            <Chip activo={equipo.ils} onClick={() => cambiarEquipo({ ils: !equipo.ils })}>ILS</Chip>
            <Chip activo={equipo.dme} onClick={() => cambiarEquipo({ dme: !equipo.dme })}>DME</Chip>
            <Chip activo={equipo.adf} onClick={() => cambiarEquipo({ adf: !equipo.adf })}>ADF</Chip>
            <Chip activo={equipo.gnss} onClick={() => cambiarEquipo({ gnss: !equipo.gnss })}>GPS</Chip>
            <Chip activo={equipo.ochoTreintaTres} onClick={() => cambiarEquipo({ ochoTreintaTres: !equipo.ochoTreintaTres })}>8,33 kHz</Chip>
          </div>
        </Campo>
        <Campo etiqueta="Transponder">
          <select
            value={equipo.transponder}
            onChange={(e) => cambiarEquipo({ transponder: e.target.value as Equipo["transponder"] })}
            className={INPUT}
          >
            <option value="">Elegí…</option>
            <option value="N">No tiene o no funciona (N)</option>
            <option value="A">Modo A (A)</option>
            <option value="C">Modo A y C, con altitud (C)</option>
            <option value="S">Modo S, con altitud e identificación (S)</option>
            <option value="E">Modo S con ADS-B (E)</option>
          </select>
        </Campo>
        {(equipo.transponder === "S" || equipo.transponder === "E") && (
          <Tilde activo={equipo.adsbOut} onChange={(v) => cambiarEquipo({ adsbOut: v })}>
            ADS-B &ldquo;out&rdquo; de 1090 MHz (B1)
          </Tilde>
        )}
        <Campo etiqueta="Color y marcas">
          <input
            value={equipo.colorMarcas}
            onChange={(e) => cambiarEquipo({ colorMarcas: e.target.value })}
            className={INPUT}
            placeholder="Blanco con franjas azules"
          />
        </Campo>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          Queda en <span className="data">{codigoEquipo(equipo)}/{codigoVigilancia(equipo) || "?"}</span>. Se recuerda para
          este avión en este navegador.
        </p>
      </Grupo>

      <Grupo titulo="Vuelo">
        <Tilde activo={vfrNoControlado} onChange={setVfrNoControlado}>
          VFR no controlado: en el nivel va &ldquo;VFR&rdquo; en vez de la altitud
        </Tilde>
        {sinAltitud && <Aviso>Cargá la altitud de crucero en el planificador, o marcá VFR no controlado.</Aviso>}
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Alternativa">
            <input value={altn1} onChange={(e) => setAltn1(e.target.value)} className={`${INPUT} uppercase placeholder:normal-case`} placeholder="SADM" maxLength={4} />
          </Campo>
          <Campo etiqueta="2ª alternativa">
            <input value={altn2} onChange={(e) => setAltn2(e.target.value)} className={`${INPUT} uppercase placeholder:normal-case`} placeholder="Opcional" maxLength={4} />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Personas a bordo">
            <input value={personas} onChange={(e) => setPersonas(e.target.value)} className={INPUT} placeholder="2, o TBN" maxLength={3} />
          </Campo>
          <Campo etiqueta="Operador (OPR/)">
            <input value={operador} onChange={(e) => setOperador(e.target.value)} className={INPUT} placeholder="Escuela o aeroclub" />
          </Campo>
        </div>
        <Campo etiqueta="Observaciones (RMK/)">
          <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={INPUT} placeholder="Vuelo de instrucción" />
        </Campo>
      </Grupo>

      <Grupo titulo="Emergencia y supervivencia">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Tilde activo={equipo.elt} onChange={(v) => cambiarEquipo({ elt: v })}>ELT</Tilde>
          <Tilde activo={supervivencia} onChange={setSupervivencia}>Equipo de supervivencia</Tilde>
          <Tilde activo={chalecos} onChange={setChalecos}>Chalecos salvavidas</Tilde>
        </div>
        {(supervivencia || chalecos) && (
          <Campo etiqueta="Qué llevás (va en N/)">
            <input value={notaSupervivencia} onChange={(e) => setNotaSupervivencia(e.target.value)} className={INPUT} placeholder="Botiquín, bengalas…" />
          </Campo>
        )}
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
          Lo que no se lleva sale tachado, como pide la AIP. La radio de 121,5 sigue a la VHF de arriba; la de 243,0
          (UHF) sale tachada.
        </p>
      </Grupo>

      <Grupo titulo="Piloto y firma">
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Piloto al mando">
            <input value={piloto} onChange={(e) => setPiloto(e.target.value)} className={INPUT} />
          </Campo>
          <Campo etiqueta="Presentado por">
            <input value={presentadoPor} onChange={(e) => setPresentadoPor(e.target.value)} className={INPUT} placeholder={piloto || "Nombre"} />
          </Campo>
        </div>
        <Firma lienzo={lienzo} onCambio={setHayFirma} />
      </Grupo>

      <Grupo titulo="El mensaje">
        <p className="data text-[11px] leading-relaxed break-all rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-100 dark:border-white/5 p-4 text-zinc-700 dark:text-zinc-300">
          {mensajeFpl(plan)}
        </p>
        {(faltas.length > 0 || !hayFirma) && (
          <ul className="space-y-1.5">
            {faltas.map((f, i) => (
              <li key={i} className="flex gap-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  <b>Casilla {f.casilla}.</b> {f.mensaje}
                </span>
              </li>
            ))}
            {!hayFirma && (
              <li className="flex gap-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Falta la firma: la AIC pide el plan firmado.</span>
              </li>
            )}
          </ul>
        )}
      </Grupo>

      <Grupo titulo="Presentarlo">
        <Campo etiqueta="Oficina ARO/AIS">
          <select value={oficina?.oaci ?? ""} onChange={(e) => setOficinaElegida(e.target.value)} className={INPUT}>
            {!oficina && <option value="">Elegí la oficina…</option>}
            {oficinas.map((o) => (
              <option key={o.oaci} value={o.oaci}>
                {o.nombre} ({o.oaci})
              </option>
            ))}
          </select>
        </Campo>
        {sugerida && !sugerida.propia && !oficinaElegida && (
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
            {salida.codigo} no tiene oficina ARO/AIS. La más cercana es {sugerida.oficina.nombre}, a{" "}
            {Math.round(sugerida.distanciaNm ?? 0)} NM. La AIC dice &ldquo;la más cercana que se encuentre brindando
            servicio&rdquo;: si a esa hora está cerrada, elegí otra.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Boton onClick={compartir} deshabilitado={!listo || estado === "armando"} principal>
            <Share2 className="w-4 h-4" /> Compartir PDF
          </Boton>
          <Boton onClick={bajar} deshabilitado={!listo || estado === "armando"}>
            <Download className="w-4 h-4" /> Bajar PDF
          </Boton>
        </div>
        {estado === "error" && <Aviso>No se pudo armar el PDF. Probá de nuevo.</Aviso>}

        {oficina && (
          <ol className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
            <Paso n={1}>Bajá o compartí el PDF firmado.</Paso>
            <Paso n={2}>
              Mandalo adjunto a{" "}
              <a href={mailto} className="font-semibold text-aviation-blue dark:text-aviation-cyan underline underline-offset-2 break-all">
                <Mail className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                {oficina.correo}
              </a>{" "}
              con el asunto <span className="data text-xs font-bold">{asunto}</span>.
            </Paso>
            <Paso n={3}>
              Llamá para confirmar que lo recibieron
              {telefono ? (
                <>
                  :{" "}
                  <a href={`tel:${telefono.marcar}`} className="font-semibold text-aviation-blue dark:text-aviation-cyan underline underline-offset-2">
                    <Phone className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                    {telefono.mostrar}
                  </a>
                </>
              ) : null}
              . Te dicen si lo aceptan o por qué lo rechazan.
              {telefono?.mostrar !== oficina.telefonos && (
                <span className="block text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">{oficina.telefonos}</span>
              )}
            </Paso>
            <Paso n={4}>Guardá el formulario un año: la AIC dice que te lo pueden pedir.</Paso>
          </ol>
        )}
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
          Correos y teléfonos de la AIC A 19/2026 (Anexo ALFA). Vos sos el responsable de lo que dice el plan: revisalo
          contra la carta y la AIP antes de mandarlo.
        </p>
      </Grupo>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Piezas                                                                      */
/* -------------------------------------------------------------------------- */

const INPUT =
  "w-full bg-transparent border-b-2 border-zinc-200 dark:border-white/10 focus:border-zinc-900 dark:focus:border-white py-2 text-sm font-bold text-zinc-900 dark:text-white outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 placeholder:font-medium transition-colors";

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{titulo}</h4>
      {children}
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{etiqueta}</span>
      {children}
    </label>
  );
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
        activo
          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white"
          : "border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400"
      }`}
    >
      {children}
    </button>
  );
}

function Tilde({ activo, onChange, children }: { activo: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
      <input
        type="checkbox"
        checked={activo}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-zinc-900 dark:accent-white"
      />
      <span>{children}</span>
    </label>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 text-xs text-amber-700 dark:text-amber-400">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

function Boton({
  onClick,
  deshabilitado,
  principal,
  children,
}: {
  onClick: () => void;
  deshabilitado?: boolean;
  principal?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        principal
          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
          : "border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function Paso({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-white/10 text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

/**
 * La firma, con el dedo o el mouse. Se dibuja en tinta oscura sobre transparente, que es
 * como queda en el PDF, también en modo oscuro.
 */
function Firma({ lienzo, onCambio }: { lienzo: React.RefObject<HTMLCanvasElement | null>; onCambio: (hay: boolean) => void }) {
  const dibujando = useRef(false);

  useEffect(() => {
    const c = lienzo.current;
    if (!c) return;
    const escala = window.devicePixelRatio || 1;
    c.width = c.clientWidth * escala;
    c.height = c.clientHeight * escala;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(escala, escala);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b1f6b";
  }, [lienzo]);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const borrar = () => {
    const c = lienzo.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    onCambio(false);
  };

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl border-2 border-dashed border-zinc-200 dark:border-white/15 bg-white overflow-hidden">
        <canvas
          ref={lienzo}
          className="w-full h-32 touch-none cursor-crosshair block"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            dibujando.current = true;
            const ctx = e.currentTarget.getContext("2d");
            const p = punto(e);
            ctx?.beginPath();
            ctx?.moveTo(p.x, p.y);
          }}
          onPointerMove={(e) => {
            if (!dibujando.current) return;
            const ctx = e.currentTarget.getContext("2d");
            const p = punto(e);
            ctx?.lineTo(p.x, p.y);
            ctx?.stroke();
            onCambio(true);
          }}
          onPointerUp={() => {
            dibujando.current = false;
          }}
        />
        <span className="pointer-events-none absolute left-4 bottom-2 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
          Firmá acá
        </span>
      </div>
      <button
        type="button"
        onClick={borrar}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
      >
        <Eraser className="w-3.5 h-3.5" /> Borrar firma
      </button>
    </div>
  );
}
