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
 * Vector nunca ve la contraseña de ANAC, y el CAD nunca ve la sesión de Vector. Los
 * mensajes sólo se aceptan de la ventanita que abrió este script, desde el origen de Vector.
 *
 * Lo compila `scripts/build-puente.mjs` a `public/cad/puente.js`.
 */
import {
  autoridadSugerida,
  faltaAutoridad,
  payloadCad,
  recordarAutoridades,
  resolverFinalidad,
  resolverLugar,
  yaEstaEnElCad,
  type AutoridadCad,
  type BorradorCad,
  type ItemCad,
  type MemoriaAutoridades,
  type VueloEnElCad,
} from "../lib/cad";

declare const __CAD_ORIGEN__: string;

interface Fila {
  b: BorradorCad;
  enElCad: number | null;
  problema: string | null;
  ids: { finalidadID: string; origenID: string; destinoID: string } | null;
  elegido: boolean;
  anterior: boolean;
  autoridad: AutoridadCad;
  resultado?: { ok: boolean; texto: string };
}

type Paso = "elegir" | "confirmar" | "cargando" | "listo";

const API = "/foliadoweb/api/VueloTripulante/";
const CLAVE_MEMORIA = "vector-cad-autoridades";
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
  .motivo { font-size: 12px; color: #92400e; margin: 6px 0 0 26px; }
  .motivo a { color: #92400e; }
  .aut { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 8px 0 0 26px; }
  .aut select, .aut input { width: 100%; padding: 7px 9px; border: 1px solid #d4d4d8; border-radius: 9px; font: inherit; font-size: 12px; background: #fff; color: #18181b; }
  .aut select:focus, .aut input:focus { outline: 2px solid #2563eb; outline-offset: 0; border-color: transparent; }
  .aut .enl { grid-column: 1 / -1; justify-self: start; } .aut .enl[hidden] { display: none; }
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

  async function lugares(tipoVuelo: number): Promise<ItemCad[]> {
    const [aer, lad] = await Promise.all([
      getCad<ItemCad[]>(`GetLugarAterrizajeListItem?tipoLugar=AER&tipoVuelo=${tipoVuelo}`).catch(() => [] as ItemCad[]),
      getCad<ItemCad[]>(`GetLugarAterrizajeListItem?tipoLugar=LAD&tipoVuelo=${tipoVuelo}`).catch(() => [] as ItemCad[]),
    ]);
    return [...aer, ...lad];
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

  async function pedirVuelos(): Promise<{ borradores: BorradorCad[] } | null> {
    if (!ventana || ventana.closed) ventana = window.open(`${VECTOR}/cad/conector`, "vector-cad", "popup,width=420,height=560");
    if (!ventana) return null;
    const llegan = esperar("vector-cad:vuelos", 30_000);
    // La ventanita puede tardar en cargar: se le pide hasta que conteste.
    const insistir = setInterval(() => ventana?.postMessage({ tipo: "vector-cad:listo" }, VECTOR), 1000);
    const d = await llegan;
    clearInterval(insistir);
    if (d) ventana?.postMessage({ tipo: "vector-cad:recibido" }, VECTOR);
    return d && Array.isArray(d.borradores) ? { borradores: d.borradores as BorradorCad[] } : null;
  }

  async function marcarEnVector(items: { vectorId: string; cadId: number }[]): Promise<number | null> {
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
  let paso: Paso = "elegir";
  let aviso = "";
  let vistaPrevia = "";
  let progreso = { hechos: 0, total: 0 };
  let marcadosEnVector: number | null = 0;

  const porCargar = () => filas.filter((f) => f.ids && !f.enElCad && !f.resultado?.ok);
  const elegidas = () => porCargar().filter((f) => f.elegido);
  const yaEstan = () => filas.filter((f) => f.enElCad);
  const paraRevisar = () => filas.filter((f) => f.problema);

  function cargando(texto: string, detalle = "") {
    cuerpo.innerHTML = `<div class="vacio"><p><b>${esc(texto)}</b></p><p class="nota">${detalle}</p></div>`;
    pie.innerHTML = "";
  }

  async function empezar() {
    cargando("Buscando tus vuelos en Vector…", "Se abre una ventanita de Vector: dejala abierta, podés minimizarla.");
    try {
      const [vector, finalidades, auts, enElCad, lugaresLocal, lugaresTravesia] = await Promise.all([
        pedirVuelos(),
        getCad<ItemCad[]>("GetFinalidadListItem?tcp=false"),
        getCad<ItemCad[]>("GetAutoridadesListItem"),
        vuelosDelCad(),
        lugares(1),
        lugares(2),
      ]);
      if (!vector) {
        cuerpo.innerHTML = `<div class="vacio"><p><b>No pudimos hablar con Vector.</b></p>
          <p class="nota">Si el navegador bloqueó la ventanita, permití las ventanas emergentes de este sitio. Fijate también que tengas la sesión de Vector iniciada.</p></div>`;
        pie.innerHTML = `<div class="bots"><button class="b neg" id="reintentar">Abrir Vector de nuevo</button></div>`;
        ($("reintentar") as HTMLButtonElement).onclick = () => void empezar();
        return;
      }
      autoridades = auts;
      const memoria = leerMemoria();
      // Lo anterior al primer vuelo que ya está en el CAD probablemente se folió en papel.
      const corte = enElCad.reduce<string | null>((min, v) => (!min || v.fechaSalida < min ? v.fechaSalida : min), null);
      filas = vector.borradores.map((b) =>
        armarFila(b, enElCad, finalidades, b.tipoVueloID === 1 ? lugaresLocal : lugaresTravesia, corte, memoria)
      );
      paso = "elegir";
      dibujar();
    } catch (e) {
      const sesion = e instanceof Error && e.message === "sesion";
      cuerpo.innerHTML = `<div class="vacio"><p><b>${sesion ? "El CAD no tiene tu sesión iniciada." : esc(e instanceof Error ? e.message : e)}</b></p>
        <p class="nota">Entrá al CAD, abrí "Registro horas vuelo" y volvé a tocar el marcador.</p></div>`;
      pie.innerHTML = "";
    }
  }

  function armarFila(
    b: BorradorCad,
    enElCad: VueloEnElCad[],
    finalidades: ItemCad[],
    lista: ItemCad[],
    corte: string | null,
    memoria: MemoriaAutoridades | null
  ): Fila {
    const anterior = !!corte && b.fechaHoraSalida.slice(0, 19) < corte.slice(0, 19);
    const autoridad = autoridadSugerida(memoria, b.finalidad);
    if (b.problema) return { b, enElCad: null, problema: b.problema, ids: null, elegido: false, anterior, autoridad };
    const id = yaEstaEnElCad(b, enElCad);
    if (id) return { b, enElCad: id, problema: null, ids: null, elegido: false, anterior, autoridad };
    const finalidadID = resolverFinalidad(b.finalidad, finalidades);
    const origenID = resolverLugar(b.origen, lista);
    const destinoID = b.tipoVueloID === 1 ? origenID : resolverLugar(b.destino, lista);
    let problema: string | null = null;
    if (!finalidadID) problema = `El CAD no tiene la finalidad "${b.finalidad}".`;
    else if (!origenID) problema = `${b.origen.codigo} no está en la lista de aeródromos del CAD. Cargalo a mano.`;
    else if (!destinoID) problema = `${b.destino.codigo} no está en la lista de aeródromos del CAD. Cargalo a mano.`;
    return {
      b,
      enElCad: null,
      problema,
      ids: problema ? null : { finalidadID: finalidadID!, origenID: origenID!, destinoID: destinoID! },
      elegido: !problema && !anterior,
      anterior,
      autoridad,
    };
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
    const meta = `${esc(f.b.matricula)} · ${horas(f.b.horas)} h · ${esc(f.b.finalidad.toLowerCase())}`;
    let extra = "";
    if (f.problema) extra = `<p class="motivo">${esc(f.problema)} <a href="${VECTOR}/dashboard/history?editar=${encodeURIComponent(f.b.vectorId)}" target="_blank" rel="noopener">Corregir en Vector</a></p>`;
    else if (f.resultado) extra = `<p class="estado ${f.resultado.ok ? "ok" : "err"}">${esc(f.resultado.texto)}</p>`;
    else if (conCaja && f.elegido)
      extra = `<div class="aut"><select data-aut="${i}" aria-label="Autoridad certificante">${opcionesAutoridad(f.autoridad.id)}</select>
        <input type="text" data-nom="${i}" value="${esc(f.autoridad.nombre)}" placeholder="Nombre y apellido" aria-label="Nombre y apellido de la autoridad">
        <button class="enl" data-rep="${i}" ${faltaAutoridad(f.autoridad) ? "hidden" : ""}>Repetir en los vacíos</button></div>`;
    else if (conCaja && f.anterior) extra = `<p class="nota" style="margin:6px 0 0 26px">Es anterior a tus vuelos en el CAD: ¿ya estaba foliado?</p>`;
    return `<div class="${clases.join(" ")}"><div class="linea">${caja}<span class="fecha m">${esc(f.b.fecha)}</span>
      <span class="ruta"><b class="m">${esc(f.b.ruta)}</b><div>${meta}</div></span></div>${extra}</div>`;
  }

  function dibujar() {
    const cargar = porCargar();
    const estan = yaEstan();
    const revisar = paraRevisar();
    const cargados = filas.filter((f) => f.resultado?.ok);
    const total = filas.length || 1;
    const pct = (n: number) => `${(100 * n) / total}%`;
    ($("pilltxt") as HTMLSpanElement).textContent = cargar.length ? `Vector → CAD · ${cargar.length} por cargar` : "Vector → CAD";

    if (filas.length === 0) {
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
      ${
        revisar.length
          ? `<div class="sec"><h3>Para revisar <span>No se mandan hasta corregirlos</span></h3>${revisar.map((f) => filaHtml(f, filas.indexOf(f), false)).join("")}</div>`
          : ""
      }
      ${
        cargar.length || cargados.length
          ? `<div class="sec"><h3>Por cargar ${
              cargar.length > 1 && paso === "elegir" ? `<span><button class="enl" id="todos">Tildar todos</button> · <button class="enl" id="ninguno">Ninguno</button></span>` : ""
            }</h3>${[...cargados, ...cargar].map((f) => filaHtml(f, filas.indexOf(f), paso === "elegir" && !f.resultado?.ok)).join("")}</div>`
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

  function validar(): boolean {
    const faltan = elegidas().filter((f) => faltaAutoridad(f.autoridad)).length;
    aviso = faltan ? `A ${faltan === 1 ? "1 vuelo le falta" : `${faltan} vuelos les falta`} la autoridad o el nombre: el CAD los pide en cada vuelo.` : "";
    return !faltan;
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

    guardarMemoria(recordarAutoridades(leerMemoria(), sel.filter((f) => f.resultado?.ok).map((f) => ({ finalidad: f.b.finalidad, autoridad: f.autoridad }))));
    // Los ids salen de la lista del CAD: el mismo criterio que para los que ya estaban.
    const enElCad = await vuelosDelCad().catch(() => [] as VueloEnElCad[]);
    const items = filas
      .map((f) => ({ f, id: f.enElCad ?? (f.resultado?.ok ? yaEstaEnElCad(f.b, enElCad) : null) }))
      .filter((x): x is { f: Fila; id: number } => !!x.id)
      .map((x) => ({ vectorId: x.f.b.vectorId, cadId: x.id }));
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

  void empezar();
})();
