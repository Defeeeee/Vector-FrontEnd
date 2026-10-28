/**
 * El puente entre Vector y el CAD de ANAC: corre adentro de la pestaña del CAD, con la
 * sesión del piloto, cuando toca el marcador "Vector → CAD" (`/dashboard/history/cad`).
 *
 * 1. Abre una ventanita de Vector (`/cad/conector`), que tiene la sesión de Vector y le
 *    pasa los vuelos que faltan, ya armados (`lib/cad.ts`), por `postMessage`.
 * 2. Lee del CAD las listas (finalidades, aeródromos, autoridades) y los vuelos que ya
 *    tiene, y muestra un panel con cada vuelo: por cargar, ya está, o para revisar.
 * 3. Cada vuelo lleva **su** autoridad certificante y su nombre (Federico, 2026-10-21): el
 *    panel propone la última usada para esa finalidad (`autoridadSugerida`).
 * 4. Al confirmar, crea cada vuelo con la misma API que usa el formulario del CAD. Quedan
 *    "Pendiente de DDJJ": **la declaración jurada la hace el piloto**, en otra pantalla.
 * 5. Le avisa a la ventanita cuáles quedaron, para marcarlos en Vector.
 *
 * Y el camino inverso, en la pestaña "Traer a Vector": los vuelos que el piloto ya declaró
 * en el CAD y no están en Vector se leen de a uno (`Get`), se traducen al libro
 * (`vueloDesdeCad`) y la ventanita los crea en Vector (`traerDelCad`).
 *
 * Vector nunca ve la contraseña de ANAC, y el CAD nunca ve la sesión de Vector. Los
 * mensajes sólo se aceptan de la ventanita que abrió este script, desde el origen de Vector.
 *
 * Lo compila `scripts/build-puente.mjs` a `public/cad/puente.js`.
 */
import {
  CLASES_SIMULADOR,
  borradosDelCad,
  TRAER_DEL_CAD,
  claveDeAutoridad,
  corteCad,
  estaEnVector,
  faltaAutoridad,
  faltaSimulador,
  fechaCortaCad,
  filaCad,
  mismoVueloOtroDia,
  payloadCad,
  recordarAutoridades,
  simuladorSugerido,
  vueloDesdeCad,
  yaEstaEnElCad,
  type AutoridadCad,
  type BorradorCad,
  type FilaCad,
  type FilaTraida,
  type ItemCad,
  type MemoriaAutoridades,
  type MotivoOmitido,
  type SimuladorCad,
  type VueloConocido,
  type VueloEnElCad,
} from "../lib/cad";

declare const __CAD_ORIGEN__: string;

interface Fila extends FilaCad {
  resultado?: { ok: boolean; texto: string };
}

type Paso = "elegir" | "confirmar" | "cargando" | "listo";

interface FilaTraer {
  t: FilaTraida;
  /** Ignorado por el piloto: se recuerda en este navegador (`CLAVE_IGNORADOS`). */
  ignorado: boolean;
  elegido: boolean;
}

const API = "/foliadoweb/api/VueloTripulante/";
const CLAVE_MEMORIA = "vector-cad-autoridades";
const CLAVE_IGNORADOS = "vector-cad-ignorados";
const BRUJULA = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/></svg>`;

const ESTILOS = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .p { width: min(560px, calc(100vw - 24px)); max-height: calc(100vh - 24px); display: flex; flex-direction: column; background: #fff; color: #18181b;
    border: 1px solid #e4e4e7; border-radius: 22px; box-shadow: 0 24px 64px rgba(24,24,27,.28); overflow: hidden;
    font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .m { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; }
  .cab { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid #f4f4f5; }
  .logo { width: 30px; height: 30px; border-radius: 9px; background: #18181b; display: grid; place-items: center; flex: none; }
  .cab h2 { margin: 0; font-size: 15px; font-weight: 700; } .cab p { margin: 0; font-size: 12px; color: #71717a; }
  .cab .esp { flex: 1; }
  .ico { border: 0; background: none; width: 30px; height: 30px; border-radius: 9px; font-size: 18px; line-height: 1; color: #71717a; cursor: pointer; }
  .ico:hover { background: #f4f4f5; color: #18181b; }
  .tabs { display: flex; gap: 4px; padding: 8px 16px 0; } .tabs[hidden] { display: none; }
  .tab { flex: 1; border: 0; background: #f4f4f5; color: #52525b; border-radius: 10px; padding: 8px 10px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  .tab[aria-selected=true] { background: #18181b; color: #fff; }
  .tab .n { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 500; opacity: .7; margin-left: 4px; }
  .tab:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
  .cuerpo { overflow: auto; padding: 14px 16px 6px; flex: 1; }
  .barra { display: flex; height: 8px; border-radius: 99px; overflow: hidden; background: #f4f4f5; margin: 2px 0 8px; }
  .barra i { display: block; height: 100%; }
  .v-esta { background: #10b981; } .v-nuevo { background: #2563eb; } .v-rev { background: #f59e0b; }
  .resumen { font-size: 13px; color: #3f3f46; margin: 0 0 4px; }
  .resumen b { color: #18181b; }
  .nota { font-size: 12px; color: #71717a; margin: 0; }
  .sec { margin-top: 16px; }
  .sec > h3 { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin: 0 0 6px; font-size: 13px; font-weight: 700; }
  .sec > h3 span { font-weight: 500; color: #71717a; font-size: 12px; }
  .enl { background: none; border: 0; padding: 0; color: #2563eb; font: inherit; font-size: 12px; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
  .fila { border: 1px solid #f4f4f5; border-radius: 14px; padding: 10px 12px; margin-bottom: 8px; }
  .fila.rev { border-color: #fde68a; background: #fffbeb; }
  .fila.falta { border-color: #fca5a5; }
  .fila.ok { border-color: #a7f3d0; background: #ecfdf5; }
  .fila.err { border-color: #fecaca; background: #fef2f2; }
  .linea { display: flex; align-items: center; gap: 10px; }
  .linea input[type=checkbox] { width: 16px; height: 16px; accent-color: #18181b; flex: none; }
  .ruta { flex: 1; min-width: 0; }
  .ruta b { font-size: 13px; } .ruta div { font-size: 12px; color: #71717a; }
  .fecha { font-size: 12px; color: #52525b; flex: none; }
  .acc { flex: none; display: flex; gap: 8px; }
  .acc .enl { color: #52525b; }
  .omit { color: #71717a; font-size: 12px; flex: none; }
  .motivo { font-size: 12px; color: #92400e; margin: 6px 0 0 26px; }
  .motivo a { color: #92400e; }
  .aut { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 8px 0 0 26px; }
  .aut select, .aut input { width: 100%; padding: 7px 9px; border: 1px solid #d4d4d8; border-radius: 9px; font: inherit; font-size: 12px; background: #fff; color: #18181b; }
  .aut select:focus, .aut input:focus { outline: 2px solid #2563eb; outline-offset: 0; border-color: transparent; }
  .aut .enl { grid-column: 1 / -1; justify-self: start; } .aut .enl[hidden] { display: none; }
  .sim { border: 1px solid #bfdbfe; background: #eff6ff; border-radius: 14px; padding: 10px 12px; margin-bottom: 8px; }
  .sim b { font-size: 13px; } .sim p { margin: 2px 0 8px; font-size: 12px; color: #52525b; }
  .sim .g { display: grid; grid-template-columns: 1fr 96px auto; gap: 6px; }
  .sim select { width: 100%; padding: 7px 9px; border: 1px solid #d4d4d8; border-radius: 9px; font: inherit; font-size: 12px; background: #fff; color: #18181b; }
  .sim .listo { color: #047857; font-size: 12px; margin: 0; }
  .estado { font-size: 12px; margin: 6px 0 0 26px; }
  .estado.ok { color: #047857; } .estado.err { color: #b91c1c; }
  details { margin-top: 16px; } summary { cursor: pointer; font-size: 13px; font-weight: 700; }
  summary span { font-weight: 500; color: #71717a; font-size: 12px; }
  .pie { border-top: 1px solid #f4f4f5; padding: 12px 16px 14px; background: #fff; }
  .pie p { margin: 0 0 10px; font-size: 13px; }
  .pie .err { color: #b91c1c; }
  .bots { display: flex; gap: 8px; flex-wrap: wrap; }
  .b { border: 0; border-radius: 999px; padding: 10px 16px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  .b:focus-visible, .ico:focus-visible, .enl:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
  .neg { background: #18181b; color: #fff; } .sec2 { background: #f4f4f5; color: #18181b; }
  .b:disabled { opacity: .4; cursor: default; }
  .prog { height: 6px; border-radius: 99px; background: #f4f4f5; overflow: hidden; margin-bottom: 8px; }
  .prog i { display: block; height: 100%; background: #2563eb; transition: width .3s; }
  pre { background: #f4f4f5; border-radius: 12px; padding: 10px; font-size: 11px; overflow: auto; max-height: 300px; margin: 8px 0 0; }
  .vacio { text-align: center; padding: 18px 8px; color: #52525b; }
  .pill { display: none; align-items: center; gap: 8px; padding: 8px 14px 8px 8px; border-radius: 999px; background: #18181b; color: #fff; border: 0; cursor: pointer;
    font: 600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-shadow: 0 12px 32px rgba(24,24,27,.35); }
  .pill .logo { width: 24px; height: 24px; border-radius: 999px; background: #fff; }
  .pill .logo svg { stroke: #18181b; }
  .min .p { display: none; } .min .pill { display: inline-flex; }
  @media (prefers-reduced-motion: reduce) { .prog i { transition: none; } }
`;

(function () {
  const script = document.currentScript as HTMLScriptElement | null;
  const VECTOR = script?.src ? new URL(script.src).origin : "https://vector.fdiaznem.com.ar";
  const w = window as unknown as { __vectorCad?: { mostrar: () => void } };

  if (location.origin !== __CAD_ORIGEN__) {
    alert(`Tocá el marcador de Vector en la pestaña del CAD (${__CAD_ORIGEN__.replace(/^https?:\/\//, "")}), adentro de "Registro horas vuelo".`);
    return;
  }
  if (w.__vectorCad) {
    w.__vectorCad.mostrar();
    return;
  }

  /* ------------------------------------------------------------- el panel --- */

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;top:12px;right:12px;z-index:2147483647";
  const raiz = host.attachShadow({ mode: "open" });
  document.body.appendChild(host);
  raiz.innerHTML = `<style>${ESTILOS}</style><div id="marco">
    <div class="p" role="dialog" aria-label="Vector → CAD">
      <div class="cab"><span class="logo">${BRUJULA}</span><div class="esp"><h2>Vector → CAD</h2><p>Tus vuelos de Vector, en tu CAD</p></div>
        <button class="ico" id="minimizar" title="Minimizar" aria-label="Minimizar">–</button><button class="ico" id="cerrar" title="Cerrar" aria-label="Cerrar">×</button></div>
      <div class="tabs" role="tablist" id="tabs" hidden>
        <button class="tab" role="tab" id="tab-llevar" aria-selected="true">Pasar al CAD<span class="n" id="n-llevar"></span></button>
        <button class="tab" role="tab" id="tab-traer" aria-selected="false">Traer a Vector<span class="n" id="n-traer"></span></button>
      </div>
      <div class="cuerpo" id="cuerpo"></div>
      <div class="pie" id="pie"></div>
    </div>
    <button class="pill" id="pill"><span class="logo">${BRUJULA}</span><span id="pilltxt">Vector → CAD</span></button>
  </div>`;
  const marco = raiz.getElementById("marco") as HTMLDivElement;
  const cuerpo = raiz.getElementById("cuerpo") as HTMLDivElement;
  const pie = raiz.getElementById("pie") as HTMLDivElement;
  const $ = <T extends HTMLElement>(id: string) => raiz.getElementById(id) as T | null;
  ($("cerrar") as HTMLButtonElement).onclick = () => (host.style.display = "none");
  ($("minimizar") as HTMLButtonElement).onclick = () => marco.classList.add("min");
  ($("pill") as HTMLButtonElement).onclick = () => marco.classList.remove("min");
  w.__vectorCad = {
    mostrar: () => {
      host.style.display = "";
      marco.classList.remove("min");
    },
  };

  ($("tab-llevar") as HTMLButtonElement).onclick = () => {
    modo = "llevar";
    dibujar();
  };
  ($("tab-traer") as HTMLButtonElement).onclick = () => {
    modo = "traer";
    if (!traer) void leerParaTraer();
    else dibujar();
  };

  const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
  const horas = (n: number) => n.toFixed(1).replace(".", ",");

  /* ----------------------------------------------------------- el CAD ------- */

  async function getCad<T>(ruta: string): Promise<T> {
    const r = await fetch(API + ruta, { credentials: "include", headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "sesion" : `El CAD contestó ${r.status}.`);
    return r.json() as Promise<T>;
  }

  async function vuelosDelCad(): Promise<VueloEnElCad[]> {
    const q = "descripcion=&tipoTrip=TM&sortField=fechaSalida&sortDirection=DESC&rowsPerPage=1000&pageNumber=1&mostrarIngresados=true&solicitudFoliadoId=null";
    const r = await getCad<{ dataSource?: VueloEnElCad[] }>(`GetPagedList?${q}`);
    return r.dataSource ?? [];
  }

  async function lugares(): Promise<ItemCad[]> {
    return getCad<ItemCad[]>("GetLugarAterrizajeListItem?tipoLugar=AER&tipoVuelo=2").catch(() => [] as ItemCad[]);
  }

  /** El modelo que el CAD le asocia a un simulador: el formulario ofrece sólo ése. */
  async function modeloDe(simId: number): Promise<{ modeloId: number | null; modelo: string | null }> {
    const m = await getCad<ItemCad[]>(`GetModelosPorSimuladorListItem?simId=${simId}`).catch(() => [] as ItemCad[]);
    return m[0] ? { modeloId: Number(m[0].key) || null, modelo: m[0].value || null } : { modeloId: null, modelo: null };
  }


  /* ------------------------------------------------------- la ventanita ----- */

  let ventana: Window | null = null;
  const esperando = new Map<string, (d: Record<string, unknown>) => void>();

  window.addEventListener("message", (e) => {
    if (e.origin !== VECTOR || !ventana || e.source !== ventana) return;
    const d = e.data as Record<string, unknown>;
    if (!d || typeof d.tipo !== "string") return;
    const resolver = esperando.get(d.tipo);
    if (resolver) {
      esperando.delete(d.tipo);
      resolver(d);
    }
  });

  function esperar(tipo: string, ms: number): Promise<Record<string, unknown> | null> {
    return new Promise((res) => {
      const t = setTimeout(() => {
        esperando.delete(tipo);
        res(null);
      }, ms);
      esperando.set(tipo, (d) => {
        clearTimeout(t);
        res(d);
      });
    });
  }

  function abrirVentana() {
    ventana = window.open(`${VECTOR}/cad/conector`, "vector-cad", "popup,width=420,height=560");
  }

  /**
   * Chrome deja abrir una ventana sólo como respuesta a un toque, y este script termina de
   * cargar un momento después del toque en el marcador: muchas veces la ventanita queda
   * bloqueada. Entonces el panel pide el toque él (Federico, 2026-10-21: había que tocar
   * "Abrir Vector de nuevo" después de un error).
   */
  function pedirToque() {
    cuerpo.innerHTML = `<div class="vacio"><p><b>Conectá el CAD con Vector</b></p>
      <p class="nota">Se abre una ventanita de Vector con tu sesión. Dejala abierta mientras cargás: podés minimizarla.</p></div>`;
    pie.innerHTML = `<div class="bots"><button class="b neg" id="conectar">Conectar con Vector</button></div>`;
    ($("conectar") as HTMLButtonElement).onclick = () => {
      abrirVentana();
      void empezar();
    };
  }

  async function pedirVuelos(): Promise<{
    borradores: BorradorCad[];
    omitidos: (BorradorCad & { motivo: MotivoOmitido })[];
    conocidos: VueloConocido[];
    matriculas: string[];
    marcados: (BorradorCad & { cadId: number })[];
  } | null> {
    if (!ventana || ventana.closed) abrirVentana();
    if (!ventana) return null;
    const llegan = esperar("vector-cad:vuelos", 30_000);
    // La ventanita puede tardar en cargar: se le pide hasta que conteste.
    const insistir = setInterval(() => ventana?.postMessage({ tipo: "vector-cad:listo" }, VECTOR), 1000);
    const d = await llegan;
    clearInterval(insistir);
    if (d) ventana?.postMessage({ tipo: "vector-cad:recibido" }, VECTOR);
    return d && Array.isArray(d.borradores)
      ? {
          borradores: d.borradores as BorradorCad[],
          omitidos: Array.isArray(d.omitidos) ? (d.omitidos as (BorradorCad & { motivo: MotivoOmitido })[]) : [],
          conocidos: Array.isArray(d.conocidos) ? (d.conocidos as VueloConocido[]) : [],
          matriculas: Array.isArray(d.matriculas) ? (d.matriculas as string[]) : [],
          marcados: Array.isArray(d.marcados) ? (d.marcados as (BorradorCad & { cadId: number })[]) : [],
        }
      : null;
  }

  async function traerAVector(vuelos: unknown[]): Promise<{ creados: number; yaEstaban: number; rechazados: number; error?: string } | null> {
    if (!ventana || ventana.closed) return null;
    const vuelve = esperar("vector-cad:traidos", 120_000);
    ventana.postMessage({ tipo: "vector-cad:traer", vuelos }, VECTOR);
    const d = await vuelve;
    return d
      ? { creados: Number(d.creados) || 0, yaEstaban: Number(d.yaEstaban) || 0, rechazados: Number(d.rechazados) || 0, error: typeof d.error === "string" ? d.error : undefined }
      : null;
  }

  async function omitirEnVector(items: { vectorId: string; motivo: MotivoOmitido | null }[]): Promise<number | null> {
    if (!ventana || ventana.closed) return null;
    const vuelve = esperar("vector-cad:omitidos", 30_000);
    ventana.postMessage({ tipo: "vector-cad:omitir", omitir: items }, VECTOR);
    const d = await vuelve;
    return d ? Number(d.cambiados) || 0 : null;
  }

  /** Les saca la marca "en el CAD" a vuelos que el piloto borró allá. */
  async function desmarcarEnVector(vectorIds: string[]): Promise<number> {
    if (!vectorIds.length || !ventana || ventana.closed) return 0;
    const vuelve = esperar("vector-cad:desmarcados", 30_000);
    ventana.postMessage({ tipo: "vector-cad:desmarcar", vectorIds }, VECTOR);
    const d = await vuelve;
    return d ? Number(d.desmarcados) || 0 : 0;
  }

  /** Guarda en el Hangar qué simulador del CAD es ese equipo (migración 036). */
  async function simuladorEnVector(avionId: string, simulador: SimuladorCad): Promise<boolean> {
    if (!ventana || ventana.closed) return false;
    const vuelve = esperar("vector-cad:simulador-guardado", 30_000);
    ventana.postMessage({ tipo: "vector-cad:simulador", avionId, simulador }, VECTOR);
    const d = await vuelve;
    return !!d?.ok;
  }

  async function marcarEnVector(items: { vectorId: string; cadId: number; autoridad?: AutoridadCad }[]): Promise<number | null> {
    if (items.length === 0) return 0;
    if (!ventana || ventana.closed) return null;
    const vuelve = esperar("vector-cad:marcados", 30_000);
    ventana.postMessage({ tipo: "vector-cad:marcar", items }, VECTOR);
    const d = await vuelve;
    return d ? Number(d.marcados) || 0 : null;
  }

  /* ---------------------------------------------------------- la memoria ---- */

  function leerMemoria(): MemoriaAutoridades | null {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_MEMORIA) ?? "null") as MemoriaAutoridades | null;
    } catch {
      return null;
    }
  }
  function guardarMemoria(m: MemoriaAutoridades) {
    try {
      localStorage.setItem(CLAVE_MEMORIA, JSON.stringify(m));
    } catch {
      /* sin almacenamiento, la próxima vez se propone vacía */
    }
  }

  /* -------------------------------------------------------------- el flujo -- */

  let filas: Fila[] = [];
  let autoridades: ItemCad[] = [];
  let simuladores: ItemCad[] = [];
  let paso: Paso = "elegir";
  let aviso = "";
  let vistaPrevia = "";
  let progreso = { hechos: 0, total: 0 };
  let marcadosEnVector: number | null = 0;

  // Lo que se leyó del CAD y de Vector al empezar, para la pestaña "Traer a Vector".
  let modo: "llevar" | "traer" = "llevar";
  let cadLista: VueloEnElCad[] = [];
  let listasCad: { finalidades: ItemCad[]; lugares: ItemCad[] } = { finalidades: [], lugares: [] };
  let conocidos: VueloConocido[] = [];
  let matriculas: string[] = [];
  let traer: FilaTraer[] | null = null;
  let leyendo = { hechos: 0, total: 0 };
  let pasoTraer: Paso = "elegir";
  let resultadoTraer: { creados: number; yaEstaban: number; rechazados: number; error?: string } | null = null;

  const porCargar = () => filas.filter((f) => !f.omitido && f.ids && !f.enElCad && !f.resultado?.ok);
  const elegidas = () => porCargar().filter((f) => f.elegido);
  const yaEstan = () => filas.filter((f) => !f.omitido && f.enElCad);
  const paraRevisar = () => filas.filter((f) => !f.omitido && f.problema);
  const omitidas = () => filas.filter((f) => f.omitido);

  function cargando(texto: string, detalle = "") {
    cuerpo.innerHTML = `<div class="vacio"><p><b>${esc(texto)}</b></p><p class="nota">${detalle}</p></div>`;
    pie.innerHTML = "";
  }

  async function empezar() {
    cargando("Buscando tus vuelos en Vector…", "Se abre una ventanita de Vector: dejala abierta, podés minimizarla.");
    try {
      // Una sola lista de aeródromos: la AER es igual para local y travesía, y trae adentro a
      // la LAD (leído del CAD real el 2026-10-21). Pesa 1,2 MB.
      const [vector, finalidades, auts, enElCad, lugaresCad, sims] = await Promise.all([
        pedirVuelos(),
        getCad<ItemCad[]>("GetFinalidadListItem?tcp=false"),
        getCad<ItemCad[]>("GetAutoridadesListItem"),
        vuelosDelCad(),
        lugares(),
        getCad<ItemCad[]>("GetSimuladoresListItem").catch(() => [] as ItemCad[]),
      ]);
      if (!vector) {
        const bloqueada = !ventana || ventana.closed;
        cuerpo.innerHTML = bloqueada
          ? `<div class="vacio"><p><b>El navegador bloqueó la ventanita de Vector.</b></p>
            <p class="nota">Permití las ventanas emergentes de este sitio (el ícono a la derecha de la barra de direcciones) y tocá de nuevo.</p></div>`
          : `<div class="vacio"><p><b>La ventanita de Vector no contestó.</b></p>
            <p class="nota">Fijate que en ella tengas la sesión de Vector iniciada, y tocá de nuevo.</p></div>`;
        pie.innerHTML = `<div class="bots"><button class="b neg" id="reintentar">Conectar con Vector</button></div>`;
        ($("reintentar") as HTMLButtonElement).onclick = () => {
          abrirVentana();
          void empezar();
        };
        return;
      }
      autoridades = auts;
      simuladores = [...sims].sort((a, b) => a.value.localeCompare(b.value));
      cadLista = enElCad;
      listasCad = { finalidades, lugares: lugaresCad };
      conocidos = vector.conocidos;
      matriculas = vector.matriculas;
      ($("tabs") as HTMLDivElement).hidden = !TRAER_DEL_CAD;
      const ctx = { enElCad, finalidades, lugares: lugaresCad, autoridades: auts, corte: corteCad(enElCad), memoria: leerMemoria() };
      // Los que se borraron del CAD vuelven a la lista, sin la marca en Vector.
      const borrados = borradosDelCad(vector.marcados, enElCad);
      const devueltos = await desmarcarEnVector(borrados.map((b) => b.vectorId));
      filas = [
        ...borrados.slice(0, devueltos).map(({ cadId: _, ...b }) => filaCad(b, ctx)),
        ...vector.borradores.map((b) => filaCad(b, ctx)),
        ...vector.omitidos.map(({ motivo, ...b }) => ({ ...filaCad(b, ctx), omitido: motivo, elegido: false })),
      ];
      paso = "elegir";
      dibujar();
    } catch (e) {
      const sesion = e instanceof Error && e.message === "sesion";
      cuerpo.innerHTML = `<div class="vacio"><p><b>${sesion ? "El CAD no tiene tu sesión iniciada." : esc(e instanceof Error ? e.message : e)}</b></p>
        <p class="nota">Entrá al CAD, abrí "Registro horas vuelo" y volvé a tocar el marcador.</p></div>`;
      pie.innerHTML = "";
    }
  }

  /* ------------------------------------------------------------ el dibujo --- */

  function opcionesAutoridad(elegida: string) {
    return `<option value="">Autoridad…</option>${autoridades
      .map((a) => `<option value="${esc(a.key)}" ${a.key === elegida ? "selected" : ""}>${esc(a.value)}</option>`)
      .join("")}`;
  }

  function filaHtml(f: Fila, i: number, conCaja: boolean) {
    const clases = ["fila"];
    if (f.problema) clases.push("rev");
    if (f.resultado) clases.push(f.resultado.ok ? "ok" : "err");
    const marcarFalta = paso === "elegir" && aviso && f.elegido && faltaAutoridad(f.autoridad);
    if (marcarFalta) clases.push("falta");
    const caja = conCaja ? `<input type="checkbox" data-i="${i}" ${f.elegido ? "checked" : ""} aria-label="Cargar el vuelo del ${esc(f.b.fecha)}">` : "";
    const meta = [f.b.matricula, `${horas(f.b.horas)} h`, f.b.finalidad.toLowerCase()].filter(Boolean).map(esc).join(" · ");
    // Sacarlo de la lista: "Ignorar" lo que no se puede mandar, "Ya foliado" lo que se podría.
    let acc = "";
    if (paso === "elegir" && !f.resultado) {
      if (f.omitido) acc = `<span class="omit">${f.omitido === "foliado" ? "Ya foliado" : "Ignorado"}</span><span class="acc"><button class="enl" data-omit="${i}" data-motivo="">Deshacer</button></span>`;
      else if (f.problema) acc = `<span class="acc"><button class="enl" data-omit="${i}" data-motivo="ignorado">Ignorar</button></span>`;
      else if (conCaja) acc = `<span class="acc"><button class="enl" data-omit="${i}" data-motivo="foliado" title="Ya está en un libro foliado antes del CAD">Ya foliado</button></span>`;
    }
    let extra = "";
    if (f.omitido) extra = "";
    else if (f.problema) extra = `<p class="motivo">${esc(f.problema)} <a href="${VECTOR}/dashboard/history?editar=${encodeURIComponent(f.b.vectorId)}" target="_blank" rel="noopener">Corregir en Vector</a></p>`;
    else if (f.resultado) extra = `<p class="estado ${f.resultado.ok ? "ok" : "err"}">${esc(f.resultado.texto)}</p>`;
    else if (conCaja && f.elegido)
      extra = `<div class="aut"><select data-aut="${i}" aria-label="Autoridad certificante">${opcionesAutoridad(f.autoridad.id)}</select>
        <input type="text" data-nom="${i}" value="${esc(f.autoridad.nombre)}" placeholder="Nombre y apellido" aria-label="Nombre y apellido de la autoridad">
        <button class="enl" data-rep="${i}" ${faltaAutoridad(f.autoridad) ? "hidden" : ""}>Repetir en los vacíos</button></div>`;
    else if (conCaja && f.anterior) extra = `<p class="nota" style="margin:6px 0 0 26px">Es anterior a tus vuelos en el CAD: ¿ya estaba foliado?</p>`;
    return `<div class="${clases.join(" ")}"><div class="linea">${caja}<span class="fecha m">${esc(f.b.fecha)}</span>
      <span class="ruta"><b class="m">${esc(f.b.ruta)}</b><div>${meta}</div></span>${acc}</div>${extra}</div>`;
  }

  const sinTraer = () => cadLista.filter((v) => !estaEnVector(v, conocidos));

  function pestañas() {
    ($("tab-llevar") as HTMLButtonElement).setAttribute("aria-selected", String(modo === "llevar"));
    ($("tab-traer") as HTMLButtonElement).setAttribute("aria-selected", String(modo === "traer"));
    ($("n-llevar") as HTMLSpanElement).textContent = String(porCargar().length);
    ($("n-traer") as HTMLSpanElement).textContent = String(
      traer ? traer.filter((x) => x.t.vuelo && !x.ignorado).length : sinTraer().filter((v) => !ignoradosGuardados().includes(v.vueloTripulanteID)).length
    );
  }

  /** Los simuladores del Hangar con vuelos por cargar: cuál es en el CAD y su clase, una vez por equipo. */
  function equiposSimulador() {
    const porAvion = new Map<string, { equipo: string; cad: SimuladorCad | null; n: number }>();
    for (const f of porCargar()) {
      const s = f.b.simulador;
      if (!s?.avionId) continue;
      const e = porAvion.get(s.avionId) ?? { equipo: s.equipo, cad: s.cad, n: 0 };
      e.n++;
      porAvion.set(s.avionId, e);
    }
    return [...porAvion.entries()];
  }

  function simuladoresHtml() {
    return equiposSimulador()
      .map(([avionId, e]) => {
        const sugerido = e.cad ? String(e.cad.id) : simuladorSugerido(e.equipo, simuladores)?.key ?? "";
        const clase = e.cad?.clase ?? "";
        const listo = !faltaSimulador({ tipoVueloID: 3 } as BorradorCad, e.cad);
        return `<div class="sim"><b>${esc(e.equipo)}</b> <span class="nota">· ${e.n === 1 ? "1 sesión" : `${e.n} sesiones`}</span>
          <p>${listo ? "Así va al CAD. Podés cambiarlo:" : "¿Cuál es en el CAD? Se elige una vez y Vector lo recuerda."}</p>
          <div class="g"><select data-sim="${esc(avionId)}" aria-label="Simulador en el CAD"><option value="">Elegí el simulador…</option>${simuladores
            .map((s) => `<option value="${esc(s.key)}" ${s.key === sugerido ? "selected" : ""}>${esc(s.value)}</option>`)
            .join("")}</select>
          <select data-clase="${esc(avionId)}" aria-label="Clase del simulador"><option value="">Clase…</option>${CLASES_SIMULADOR.map(
            (c) => `<option ${c === clase ? "selected" : ""}>${c}</option>`
          ).join("")}</select>
          <button class="b neg" data-guardarsim="${esc(avionId)}" style="padding:7px 12px">Guardar</button></div></div>`;
      })
      .join("");
  }

  async function guardarSimulador(avionId: string) {
    const sel = raiz.querySelector<HTMLSelectElement>(`select[data-sim="${CSS.escape(avionId)}"]`);
    const cls = raiz.querySelector<HTMLSelectElement>(`select[data-clase="${CSS.escape(avionId)}"]`);
    const item = simuladores.find((s) => s.key === sel?.value);
    if (!item || !cls?.value) {
      aviso = "Elegí el simulador y su clase (la que figura en el CAD: ATD, BATD, PCATD…).";
      return dibujar();
    }
    const simulador: SimuladorCad = { id: Number(item.key), nombre: item.value, clase: cls.value, ...(await modeloDe(Number(item.key))) };
    const ok = await simuladorEnVector(avionId, simulador);
    for (const f of filas) if (f.b.simulador?.avionId === avionId) f.b = { ...f.b, clase: simulador.clase, simulador: { ...f.b.simulador, cad: simulador } };
    aviso = ok ? "" : "Quedó elegido para esta vez, pero no pudimos guardarlo en Vector: fijate que la ventanita siga abierta.";
    dibujar();
  }

  function dibujar() {
    pestañas();
    if (modo === "traer") return dibujarTraer();
    const cargar = porCargar();
    const estan = yaEstan();
    const revisar = paraRevisar();
    const cargados = filas.filter((f) => f.resultado?.ok);
    const total = filas.length - omitidas().length || 1;
    const pct = (n: number) => `${(100 * n) / total}%`;
    ($("pilltxt") as HTMLSpanElement).textContent = cargar.length ? `Vector → CAD · ${cargar.length} por cargar` : "Vector → CAD";

    const omit = omitidas();
    const anteriores = cargar.filter((f) => f.anterior);
    if (filas.length === omit.length && omit.length === 0) {
      cuerpo.innerHTML = `<div class="vacio"><p><b>Todos tus vuelos de Vector ya están en el CAD.</b></p><p class="nota">Cuando cargues uno nuevo, volvé a tocar el marcador.</p></div>`;
      pie.innerHTML = "";
      return;
    }

    cuerpo.innerHTML = `
      <div class="barra" role="img" aria-label="${estan.length + cargados.length} ya están, ${cargar.length} por cargar, ${revisar.length} para revisar">
        <i class="v-esta" style="width:${pct(estan.length + cargados.length)}"></i><i class="v-nuevo" style="width:${pct(cargar.length)}"></i><i class="v-rev" style="width:${pct(revisar.length)}"></i>
      </div>
      <p class="resumen"><b>${cargar.length}</b> por cargar, <b>${estan.length + cargados.length}</b> ya están y <b>${revisar.length}</b> para revisar.</p>
      <p class="nota">Cada vuelo lleva su autoridad certificante. Quedan "Pendiente de DDJJ": la declaración la hacés vos.</p>
      ${paso === "elegir" ? simuladoresHtml() : ""}
      ${
        revisar.length
          ? `<div class="sec"><h3>Para revisar <span>No se mandan hasta corregirlos</span></h3>${revisar.map((f) => filaHtml(f, filas.indexOf(f), false)).join("")}</div>`
          : ""
      }
      ${
        cargar.length || cargados.length
          ? `<div class="sec"><h3>Por cargar ${
              cargar.length > 1 && paso === "elegir" ? `<span><button class="enl" id="todos">Tildar todos</button> · <button class="enl" id="ninguno">Ninguno</button></span>` : ""
            }</h3>${
              anteriores.length && paso === "elegir"
                ? `<p class="nota" style="margin:0 0 8px">${anteriores.length === 1 ? "1 es anterior" : `${anteriores.length} son anteriores`} a tu primer vuelo en el CAD. <button class="enl" id="foliar">${anteriores.length === 1 ? "Marcarlo" : "Marcarlos"} como ya foliado${anteriores.length === 1 ? "" : "s"}</button></p>`
                : ""
            }${[...cargados, ...cargar].map((f) => filaHtml(f, filas.indexOf(f), paso === "elegir" && !f.resultado?.ok)).join("")}</div>`
          : ""
      }
      ${
        omit.length
          ? `<details><summary>Fuera de la lista <span>(${omit.length}: ya foliados o ignorados)</span></summary>${omit.map((f) => filaHtml(f, filas.indexOf(f), false)).join("")}</details>`
          : ""
      }
      ${
        estan.length
          ? `<details><summary>Ya están en el CAD <span>(${estan.length})</span></summary>${estan.map((f) => filaHtml(f, filas.indexOf(f), false)).join("")}
             <div class="bots" style="margin-top:4px"><button class="b sec2" id="anotar">Anotarlos en Vector</button></div></details>`
          : ""
      }
      ${vistaPrevia ? `<div class="sec"><h3>Lo que se mandaría <span><button class="enl" id="cerrarprev">Cerrar</button></span></h3><p class="nota">No se mandó nada.</p><pre>${esc(vistaPrevia)}</pre></div>` : ""}
    `;
    dibujarPie();
    conectar();
  }

  function dibujarPie() {
    const sel = elegidas();
    const h = sel.reduce((t, f) => t + f.b.horas, 0);
    const n = sel.length;
    const vuelos = (k: number) => (k === 1 ? "1 vuelo" : `${k} vuelos`);
    if (paso === "cargando") {
      pie.innerHTML = `<div class="prog"><i style="width:${(100 * progreso.hechos) / (progreso.total || 1)}%"></i></div><p>Cargando ${progreso.hechos + 1 > progreso.total ? progreso.total : progreso.hechos + 1} de ${progreso.total}…</p>`;
      return;
    }
    if (paso === "listo") {
      const ok = filas.filter((f) => f.resultado?.ok).length;
      const mal = filas.filter((f) => f.resultado && !f.resultado.ok).length;
      pie.innerHTML = `<p><b>${ok === 1 ? "Cargaste 1 vuelo" : `Cargaste ${ok} vuelos`} en el CAD.</b>${mal ? ` <span class="err">${mal} no ${mal === 1 ? "entró" : "entraron"}: mirá el motivo arriba.</span>` : ""}</p>
        <p class="nota" style="margin-bottom:10px">Ahora hacé la declaración en "DDJJ de Horas de vuelo".${marcadosEnVector === null ? " No pudimos avisarle a Vector: la próxima vez van a aparecer como ya cargados." : ""}</p>
        <div class="bots"><button class="b neg" id="recargar">Ver en el CAD</button>${porCargar().length ? `<button class="b sec2" id="seguir">Seguir cargando</button>` : ""}</div>`;
      return;
    }
    if (paso === "confirmar") {
      pie.innerHTML = `<p>¿Cargar ${vuelos(n)} (${horas(h)} h) en el CAD? Quedan "Pendiente de DDJJ".</p>
        <div class="bots"><button class="b neg" id="sicargar">Cargar en el CAD</button><button class="b sec2" id="volver">Volver</button></div>`;
      return;
    }
    pie.innerHTML = `${aviso ? `<p class="err">${esc(aviso)}</p>` : ""}<div class="bots">
      <button class="b neg" id="cargar" ${n ? "" : "disabled"}>${n ? `Cargar ${vuelos(n)} · ${horas(h)} h` : "Tildá los vuelos a cargar"}</button>
      <button class="b sec2" id="probar" ${n ? "" : "disabled"}>Ver lo que se manda</button></div>`;
  }

  /** Los eventos de lo que se acaba de dibujar. Escribir no redibuja: no se pierde el foco. */
  function conectar() {
    raiz.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((cb) => {
      cb.onchange = () => {
        filas[Number(cb.dataset.i)].elegido = cb.checked;
        aviso = "";
        dibujar();
      };
    });
    // "Repetir en los vacíos" se ofrece recién cuando ese vuelo tiene algo para repetir.
    const alCambiar = (i: number, cambio: Partial<AutoridadCad>) => {
      filas[i].autoridad = { ...filas[i].autoridad, ...cambio };
      const rep = raiz.querySelector<HTMLButtonElement>(`button[data-rep="${i}"]`);
      if (rep) rep.hidden = faltaAutoridad(filas[i].autoridad);
    };
    raiz.querySelectorAll<HTMLSelectElement>("select[data-aut]").forEach((s) => {
      s.onchange = () => alCambiar(Number(s.dataset.aut), { id: s.value });
    });
    raiz.querySelectorAll<HTMLInputElement>("input[data-nom]").forEach((inp) => {
      inp.oninput = () => alCambiar(Number(inp.dataset.nom), { nombre: inp.value });
    });
    raiz.querySelectorAll<HTMLButtonElement>("button[data-rep]").forEach((btn) => {
      btn.onclick = () => {
        const origen = filas[Number(btn.dataset.rep)].autoridad;
        if (faltaAutoridad(origen)) return;
        for (const f of elegidas()) if (faltaAutoridad(f.autoridad)) f.autoridad = { ...origen };
        dibujar();
      };
    });
    const tildar = (si: boolean) => () => {
      for (const f of porCargar()) f.elegido = si;
      dibujar();
    };
    $("todos")?.addEventListener("click", tildar(true));
    $("ninguno")?.addEventListener("click", tildar(false));
    $("cerrarprev")?.addEventListener("click", () => {
      vistaPrevia = "";
      dibujar();
    });
    $("anotar")?.addEventListener("click", () => void anotarLosQueEstan());
    raiz.querySelectorAll<HTMLButtonElement>("button[data-guardarsim]").forEach((btn) => {
      btn.onclick = () => void guardarSimulador(btn.dataset.guardarsim!);
    });
    raiz.querySelectorAll<HTMLButtonElement>("button[data-omit]").forEach((btn) => {
      btn.onclick = () => void omitir([filas[Number(btn.dataset.omit)]], (btn.dataset.motivo || null) as MotivoOmitido | null);
    });
    $("foliar")?.addEventListener("click", () => void omitir(porCargar().filter((f) => f.anterior), "foliado"));
    $("cargar")?.addEventListener("click", () => pedirConfirmacion());
    $("probar")?.addEventListener("click", () => mostrarVistaPrevia());
    $("volver")?.addEventListener("click", () => {
      paso = "elegir";
      dibujar();
    });
    $("sicargar")?.addEventListener("click", () => void cargar());
    $("recargar")?.addEventListener("click", () => location.reload());
    $("seguir")?.addEventListener("click", () => {
      paso = "elegir";
      dibujar();
    });
  }

  /** Saca vuelos de la lista (o los devuelve) y lo guarda en Vector. Si Vector no contesta, vuelve atrás. */
  async function omitir(sel: Fila[], motivo: MotivoOmitido | null) {
    if (!sel.length) return;
    const antes = sel.map((f) => [f, f.omitido, f.elegido] as const);
    for (const f of sel) {
      f.omitido = motivo;
      f.elegido = false;
    }
    aviso = "";
    dibujar();
    const n = await omitirEnVector(sel.map((f) => ({ vectorId: f.b.vectorId, motivo })));
    if (n === null || n < sel.length) {
      for (const [f, o, e] of antes) {
        f.omitido = o;
        f.elegido = e;
      }
      aviso = "No pudimos guardarlo en Vector: fijate que la ventanita siga abierta y probá de nuevo.";
      dibujar();
    }
  }

  function validar(): boolean {
    const sinSimulador = elegidas().filter((f) => faltaSimulador(f.b)).length;
    const faltan = elegidas().filter((f) => faltaAutoridad(f.autoridad)).length;
    aviso = sinSimulador
      ? "Elegí arriba cuál es tu simulador en el CAD y su clase, y tocá Guardar."
      : faltan
        ? `A ${faltan === 1 ? "1 vuelo le falta" : `${faltan} vuelos les falta`} la autoridad o el nombre: el CAD los pide en cada vuelo.`
        : "";
    return !faltan && !sinSimulador;
  }

  function payloads(sel: Fila[]) {
    return sel.map((f) =>
      payloadCad(f.b, { ...f.ids!, autoridadID: f.autoridad.id, autoridadNombre: f.autoridad.nombre.trim().toUpperCase() })
    );
  }

  function mostrarVistaPrevia() {
    if (!validar()) return dibujar();
    const p = payloads(elegidas());
    vistaPrevia = JSON.stringify(p.slice(0, 3), null, 2) + (p.length > 3 ? `\n… y ${p.length - 3} más` : "");
    dibujar();
  }

  function pedirConfirmacion() {
    if (!validar()) return dibujar();
    paso = "confirmar";
    vistaPrevia = "";
    dibujar();
  }

  async function cargar() {
    const sel = elegidas();
    const p = payloads(sel);
    paso = "cargando";
    progreso = { hechos: 0, total: sel.length };
    dibujar();
    for (let k = 0; k < sel.length; k++) {
      try {
        const r = await fetch(API + "Create", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(p[k]),
        });
        if (r.ok) sel[k].resultado = { ok: true, texto: "Cargado en el CAD" };
        else {
          const c = await r.json().catch(() => ({}) as Record<string, string>);
          sel[k].resultado = { ok: false, texto: `El CAD no lo aceptó: ${c.message || c.exceptionMessage || `error ${r.status}`}` };
        }
      } catch (e) {
        sel[k].resultado = { ok: false, texto: `No se pudo mandar: ${e instanceof Error ? e.message : e}` };
      }
      progreso.hechos = k + 1;
      dibujarPie();
    }

    guardarMemoria(recordarAutoridades(leerMemoria(), sel.filter((f) => f.resultado?.ok).map((f) => ({ finalidad: claveDeAutoridad(f.b), autoridad: f.autoridad }))));
    // Los ids salen de la lista del CAD: el mismo criterio que para los que ya estaban.
    const enElCad = await vuelosDelCad().catch(() => [] as VueloEnElCad[]);
    // Con la autoridad que se usó, para que el vuelo en Vector diga lo mismo que el CAD.
    const items = filas
      .map((f) => ({ f, id: f.enElCad ?? (f.resultado?.ok ? yaEstaEnElCad(f.b, enElCad) : null) }))
      .filter((x): x is { f: Fila; id: number } => !!x.id)
      .map((x) => ({
        vectorId: x.f.b.vectorId,
        cadId: x.id,
        ...(x.f.resultado?.ok ? { autoridad: { id: x.f.autoridad.id, nombre: x.f.autoridad.nombre.trim().toUpperCase() } } : {}),
      }));
    marcadosEnVector = await marcarEnVector(items);
    for (const f of sel) if (!f.resultado?.ok) f.elegido = false;
    paso = "listo";
    dibujar();
  }

  async function anotarLosQueEstan() {
    const items = yaEstan().map((f) => ({ vectorId: f.b.vectorId, cadId: f.enElCad! }));
    const n = await marcarEnVector(items);
    aviso = n === null ? "No pudimos hablar con Vector." : "";
    if (n !== null) filas = filas.filter((f) => !f.enElCad);
    dibujar();
  }

  /* ------------------------------------------------- traer a Vector ------- */

  /** El detalle de un vuelo del CAD. La forma de la ruta no se pudo confirmar: se prueban las dos. */
  async function detalleDelCad(id: number): Promise<Record<string, unknown>> {
    for (const ruta of [`Get?id=${id}`, `Get/${id}`]) {
      try {
        const d = await getCad<Record<string, unknown> | { data?: Record<string, unknown> }>(ruta);
        if (d && typeof d === "object") return ("data" in d && d.data && typeof d.data === "object" ? d.data : d) as Record<string, unknown>;
      } catch {
        /* se prueba la otra */
      }
    }
    return {};
  }

  async function leerParaTraer() {
    const faltan = sinTraer();
    traer = null;
    leyendo = { hechos: 0, total: faltan.length };
    pasoTraer = "elegir";
    resultadoTraer = null;
    dibujar();
    const filasNuevas: FilaTraer[] = new Array(faltan.length);
    let siguiente = 0;
    // De a cuatro: el CAD es del Estado y no hace falta apurarlo más.
    await Promise.all(
      Array.from({ length: Math.min(4, faltan.length) }, async () => {
        while (siguiente < faltan.length) {
          const k = siguiente++;
          const v = faltan[k];
          const detalle = await detalleDelCad(v.vueloTripulanteID);
          let t = vueloDesdeCad({ ...(v as unknown as Record<string, unknown>), ...detalle }, listasCad, matriculas);
          const otro = t.vuelo ? mismoVueloOtroDia(t.vuelo.takeoff, t.vuelo.matricula, conocidos) : null;
          if (otro)
            t = {
              ...t,
              vuelo: null,
              problema: `En Vector figura el ${fechaCortaCad(otro)}, a la misma hora y en el mismo avión: ¿cuál es la fecha correcta? Corregí la que esté mal para no duplicarlo.`,
            };
          filasNuevas[k] = { t, elegido: !t.problema, ignorado: ignoradosGuardados().includes(t.cadId) };
          leyendo.hechos++;
          if (modo === "traer") dibujarTraer();
        }
      })
    );
    traer = filasNuevas;
    dibujar();
  }

  function ignoradosGuardados(): number[] {
    try {
      const v = JSON.parse(localStorage.getItem(CLAVE_IGNORADOS) ?? "[]");
      return Array.isArray(v) ? v.filter((x) => Number.isInteger(x)) : [];
    } catch {
      return [];
    }
  }
  function guardarIgnorados() {
    try {
      localStorage.setItem(CLAVE_IGNORADOS, JSON.stringify((traer ?? []).filter((x) => x.ignorado).map((x) => x.t.cadId)));
    } catch {
      /* sin almacenamiento, vuelven a aparecer la próxima vez */
    }
  }

  function filaTraerHtml(x: FilaTraer, i: number, conCaja: boolean) {
    const t = x.t;
    const acc =
      pasoTraer !== "elegir"
        ? ""
        : x.ignorado
          ? `<span class="omit">Ignorado</span><span class="acc"><button class="enl" data-ign="${i}" data-si="">Deshacer</button></span>`
          : t.problema
            ? `<span class="acc"><button class="enl" data-ign="${i}" data-si="1">Ignorar</button></span>`
            : "";
    const caja = conCaja ? `<input type="checkbox" data-t="${i}" ${x.elegido ? "checked" : ""} aria-label="Traer el vuelo del ${esc(t.fecha)}">` : "";
    const meta = [t.matricula, `${horas(t.horas)} h`, t.finalidad.toLowerCase()].filter(Boolean).map(esc).join(" · ");
    return `<div class="fila ${t.problema ? "rev" : ""}"><div class="linea">${caja}<span class="fecha m">${esc(t.fecha || "¿?")}</span>
      <span class="ruta"><b class="m">${esc(t.ruta || "Sin ruta")}</b><div>${meta}</div></span>${acc}</div>
      ${t.problema && !x.ignorado ? `<p class="motivo">${esc(t.problema)}</p>` : ""}</div>`;
  }

  function dibujarTraer() {
    if (!traer) {
      const pct = leyendo.total ? (100 * leyendo.hechos) / leyendo.total : 0;
      cuerpo.innerHTML = `<div class="vacio"><p><b>Leyendo tus vuelos del CAD…</b></p>
        <div class="prog" style="max-width:240px;margin:10px auto"><i style="width:${pct}%"></i></div>
        <p class="nota m">${leyendo.hechos} de ${leyendo.total}</p></div>`;
      pie.innerHTML = "";
      return;
    }
    const listos = traer.filter((x) => x.t.vuelo && !x.ignorado);
    const revisar = traer.filter((x) => x.t.problema && !x.ignorado);
    const ignorados = traer.filter((x) => x.ignorado);
    if (traer.length === 0) {
      cuerpo.innerHTML = `<div class="vacio"><p><b>Todos tus vuelos del CAD ya están en Vector.</b></p></div>`;
      if (pasoTraer === "listo") dibujarPieTraer();
      else pie.innerHTML = "";
      return;
    }
    const editable = pasoTraer === "elegir";
    cuerpo.innerHTML = `
      <p class="resumen">${
        listos.length
          ? `<b>${listos.length}</b> ${listos.length === 1 ? "vuelo del CAD no está" : "vuelos del CAD no están"} en Vector${revisar.length ? `, y <b>${revisar.length}</b> para revisar` : ""}.`
          : `No queda nada para traer${revisar.length ? `: ${revisar.length === 1 ? "falta revisar 1 vuelo" : `faltan revisar ${revisar.length} vuelos`}` : ""}.`
      }</p>
      <p class="nota">Se agregan a tu bitácora con el desglose del libro, marcados como "En el CAD". No se descuentan de tu saldo. Si en Vector cargaste los totales de tu libro, tildá sólo los posteriores a esa hoja.</p>
      ${
        revisar.length
          ? `<div class="sec"><h3>Para revisar <span>No se traen</span></h3>${revisar.map((x) => filaTraerHtml(x, traer!.indexOf(x), false)).join("")}</div>`
          : ""
      }
      ${
        listos.length
          ? `<div class="sec"><h3>Para traer ${
              listos.length > 1 && editable ? `<span><button class="enl" id="t-todos">Tildar todos</button> · <button class="enl" id="t-ninguno">Ninguno</button></span>` : ""
            }</h3>${listos.map((x) => filaTraerHtml(x, traer!.indexOf(x), editable)).join("")}</div>`
          : ""
      }
      ${
        ignorados.length
          ? `<details><summary>Ignorados <span>(${ignorados.length})</span></summary>${ignorados.map((x) => filaTraerHtml(x, traer!.indexOf(x), false)).join("")}</details>`
          : ""
      }`;
    dibujarPieTraer();
    raiz.querySelectorAll<HTMLInputElement>("input[data-t]").forEach((cb) => {
      cb.onchange = () => {
        traer![Number(cb.dataset.t)].elegido = cb.checked;
        dibujarPieTraer();
      };
    });
    const tildar = (si: boolean) => () => {
      for (const x of listos) x.elegido = si;
      dibujarTraer();
    };
    raiz.querySelectorAll<HTMLButtonElement>("button[data-ign]").forEach((btn) => {
      btn.onclick = () => {
        const x = traer![Number(btn.dataset.ign)];
        x.ignorado = !!btn.dataset.si;
        x.elegido = false;
        guardarIgnorados();
        dibujar();
      };
    });
    $("t-todos")?.addEventListener("click", tildar(true));
    $("t-ninguno")?.addEventListener("click", tildar(false));
  }

  function dibujarPieTraer() {
    const sel = (traer ?? []).filter((x) => x.elegido && x.t.vuelo);
    const n = sel.length;
    const h = sel.reduce((t, x) => t + x.t.horas, 0);
    const vuelos = (k: number) => (k === 1 ? "1 vuelo" : `${k} vuelos`);
    if (pasoTraer === "cargando") {
      pie.innerHTML = `<p>Guardando ${vuelos(n)} en Vector…</p>`;
      return;
    }
    if (pasoTraer === "listo" && resultadoTraer) {
      const r = resultadoTraer;
      pie.innerHTML = `<p><b>${r.creados === 1 ? "Trajiste 1 vuelo" : `Trajiste ${r.creados} vuelos`} a Vector.</b>${r.yaEstaban ? ` ${r.yaEstaban} ya estaban.` : ""}${
        r.rechazados ? ` <span class="err">${r.rechazados} no ${r.rechazados === 1 ? "entró" : "entraron"}.</span>` : ""
      }</p>${r.error ? `<p class="err">${esc(r.error)}</p>` : ""}
        <div class="bots"><a class="b neg" href="${VECTOR}/dashboard/history" target="_blank" rel="noopener" style="text-decoration:none">Ver mi bitácora</a></div>`;
      return;
    }
    if (pasoTraer === "confirmar") {
      pie.innerHTML = `<p>¿Traer ${vuelos(n)} (${horas(h)} h) a tu bitácora de Vector?</p>
        <div class="bots"><button class="b neg" id="t-si">Traer a Vector</button><button class="b sec2" id="t-volver">Volver</button></div>`;
      ($("t-si") as HTMLButtonElement).onclick = () => void traerSeleccion();
      ($("t-volver") as HTMLButtonElement).onclick = () => {
        pasoTraer = "elegir";
        dibujarTraer();
      };
      return;
    }
    pie.innerHTML = `<div class="bots"><button class="b neg" id="t-traer" ${n ? "" : "disabled"}>${n ? `Traer ${vuelos(n)} · ${horas(h)} h` : "Tildá los vuelos a traer"}</button></div>`;
    ($("t-traer") as HTMLButtonElement).onclick = () => {
      pasoTraer = "confirmar";
      dibujarTraer();
    };
  }

  async function traerSeleccion() {
    const sel = (traer ?? []).filter((x) => x.elegido && x.t.vuelo);
    pasoTraer = "cargando";
    dibujarTraer();
    const r = await traerAVector(sel.map((x) => x.t.vuelo));
    resultadoTraer = r ?? { creados: 0, yaEstaban: 0, rechazados: sel.length, error: "No pudimos hablar con Vector: fijate que la ventanita siga abierta." };
    if (r && r.creados + r.yaEstaban > 0) {
      // Ya están en Vector: salen de la lista, y la cuenta de la pestaña baja.
      const ids = new Set(sel.map((x) => x.t.cadId));
      conocidos = [...conocidos, ...cadLista.filter((v) => ids.has(v.vueloTripulanteID)).map((v) => ({ cadId: v.vueloTripulanteID, salida: "", matricula: "" }))];
      traer = (traer ?? []).filter((x) => !ids.has(x.t.cadId));
    }
    pasoTraer = "listo";
    dibujar();
  }

  // Se prueba abrir la ventanita ya; si el navegador la bloquea, se pide el toque.
  abrirVentana();
  if (ventana) void empezar();
  else pedirToque();
})();
