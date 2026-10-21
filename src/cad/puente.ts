/**
 * El puente entre Vector y el CAD de ANAC: corre adentro de la pestaña del CAD, con la
 * sesión del piloto, cuando toca el marcador "Vector → CAD" (`/dashboard/history/cad`).
 *
 * 1. Abre una ventanita de Vector (`/cad/conector`), que tiene la sesión de Vector y le
 *    pasa los vuelos que faltan, ya armados (`lib/cad.ts`), por `postMessage`.
 * 2. Lee del CAD las listas (finalidades, aeródromos, autoridades) y los vuelos que ya
 *    tiene, y muestra un panel con cada vuelo: nuevo, ya está, o para revisar.
 * 3. Al confirmar, crea cada vuelo con la misma API que usa el formulario del CAD. Quedan
 *    "Pendiente de DDJJ": **la declaración jurada la hace el piloto**, en otra pantalla.
 * 4. Le avisa a la ventanita cuáles quedaron, para marcarlos en Vector.
 *
 * Vector nunca ve la contraseña de ANAC, y el CAD nunca ve la sesión de Vector. Los
 * mensajes sólo se aceptan de la ventanita que abrió este script, desde el origen de Vector.
 *
 * Lo compila `scripts/build-puente.mjs` a `public/cad/puente.js`.
 */
import {
  payloadCad,
  resolverFinalidad,
  resolverLugar,
  yaEstaEnElCad,
  type BorradorCad,
  type ItemCad,
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
  resultado?: { ok: boolean; texto: string };
}

const API = "/foliadoweb/api/VueloTripulante/";
const CLAVE_AUTORIDAD = "vector-cad-autoridad";

(function () {
  const script = document.currentScript as HTMLScriptElement | null;
  const VECTOR = script?.src ? new URL(script.src).origin : "https://vector.fdiaznem.com.ar";
  const w = window as unknown as { __vectorCad?: { mostrar: () => void } };

  if (location.origin !== __CAD_ORIGEN__) {
    alert(`Tocá el marcador de Vector en la pestaña del CAD (${__CAD_ORIGEN__.replace("https://", "")}), adentro de "Registro horas vuelo".`);
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
  raiz.innerHTML = `<style>
    :host { all: initial; }
    .p { width: min(560px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto; background: #fff; color: #18181b;
      border: 1px solid #e4e4e7; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,.25); font: 14px/1.45 -apple-system, "Segoe UI", Roboto, sans-serif; }
    .cab { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #f4f4f5; position: sticky; top: 0; background: #fff; }
    .cab b { font-size: 15px; } .x { border: 0; background: none; font-size: 20px; cursor: pointer; color: #71717a; }
    .c { padding: 14px 18px; } .gris { color: #71717a; font-size: 12px; } .err { color: #b91c1c; } .ok { color: #047857; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; } td { padding: 7px 4px; border-top: 1px solid #f4f4f5; vertical-align: top; }
    .m { font-family: ui-monospace, Menlo, monospace; } .chip { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .nuevo { background: #eff6ff; color: #1d4ed8; } .esta { background: #ecfdf5; color: #047857; } .rev { background: #fffbeb; color: #b45309; }
    label { display: block; font-size: 12px; font-weight: 600; margin: 10px 0 4px; } select, input[type=text] { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #d4d4d8; border-radius: 10px; font: inherit; }
    .bots { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; } button.b { border: 0; border-radius: 999px; padding: 10px 16px; font: 600 13px inherit; cursor: pointer; }
    .neg { background: #18181b; color: #fff; } .sec { background: #f4f4f5; color: #18181b; } button.b:disabled { opacity: .4; cursor: default; }
    pre { background: #f4f4f5; border-radius: 10px; padding: 10px; font-size: 11px; overflow: auto; max-height: 260px; }
  </style><div class="p"><div class="cab"><b>Vector → CAD</b><button class="x" title="Cerrar">×</button></div><div class="c" id="c"></div></div>`;
  const c = raiz.getElementById("c") as HTMLDivElement;
  (raiz.querySelector(".x") as HTMLButtonElement).onclick = () => (host.style.display = "none");
  w.__vectorCad = { mostrar: () => (host.style.display = "") };

  const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
  const mostrar = (html: string) => (c.innerHTML = html);

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

  function abrirVector() {
    ventana = window.open(`${VECTOR}/cad/conector`, "vector-cad", "popup,width=460,height=620");
    return ventana;
  }

  async function pedirVuelos(): Promise<{ borradores: BorradorCad[] } | null> {
    if (!ventana || ventana.closed) abrirVector();
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

  /* -------------------------------------------------------------- el flujo -- */

  let filas: Fila[] = [];
  let autoridades: ItemCad[] = [];
  // Lo que el piloto eligió en el panel: sobrevive a cada redibujo.
  let autoridad = autoridadGuardada();

  async function empezar() {
    mostrar(`<p>Buscando tus vuelos en Vector…</p><p class="gris">Se abre una ventanita de Vector: dejala abierta. Si no aparece, permití las ventanas emergentes de este sitio.</p>
      <div class="bots"><button class="b sec" id="abrir">Abrir Vector</button></div>`);
    (raiz.getElementById("abrir") as HTMLButtonElement).onclick = () => void empezar();
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
        mostrar(`<p class="err">No pudimos hablar con Vector.</p><p class="gris">Fijate que la ventanita de Vector esté abierta y con tu sesión iniciada, y volvé a tocar el marcador.</p>
          <div class="bots"><button class="b neg" id="abrir">Abrir Vector</button></div>`);
        (raiz.getElementById("abrir") as HTMLButtonElement).onclick = () => void empezar();
        return;
      }
      autoridades = auts;
      // Lo anterior al primer vuelo que ya está en el CAD probablemente se folió en papel.
      const corte = enElCad.reduce<string | null>((min, v) => (!min || v.fechaSalida < min ? v.fechaSalida : min), null);
      filas = vector.borradores.map((b) => armarFila(b, enElCad, finalidades, b.tipoVueloID === 1 ? lugaresLocal : lugaresTravesia, corte));
      dibujar();
    } catch (e) {
      const sesion = e instanceof Error && e.message === "sesion";
      mostrar(`<p class="err">${sesion ? "El CAD no tiene tu sesión iniciada." : esc(e instanceof Error ? e.message : e)}</p>
        <p class="gris">Entrá al CAD, abrí "Registro horas vuelo" y volvé a tocar el marcador.</p>`);
    }
  }

  function armarFila(b: BorradorCad, enElCad: VueloEnElCad[], finalidades: ItemCad[], lista: ItemCad[], corte: string | null): Fila {
    const anterior = !!corte && b.fechaHoraSalida.slice(0, 19) < corte.slice(0, 19);
    if (b.problema) return { b, enElCad: null, problema: b.problema, ids: null, elegido: false, anterior };
    const id = yaEstaEnElCad(b, enElCad);
    if (id) return { b, enElCad: id, problema: null, ids: null, elegido: false, anterior };
    const finalidadID = resolverFinalidad(b.finalidad, finalidades);
    const origenID = resolverLugar(b.origen, lista);
    const destinoID = b.tipoVueloID === 1 ? origenID : resolverLugar(b.destino, lista);
    let problema: string | null = null;
    if (!finalidadID) problema = `El CAD no tiene la finalidad "${b.finalidad}".`;
    else if (!origenID) problema = `No encontramos ${b.origen.codigo} en la lista de aeródromos del CAD.`;
    else if (!destinoID) problema = `No encontramos ${b.destino.codigo} en la lista de aeródromos del CAD.`;
    return {
      b,
      enElCad: null,
      problema,
      ids: problema ? null : { finalidadID: finalidadID!, origenID: origenID!, destinoID: destinoID! },
      elegido: !problema && !anterior,
      anterior,
    };
  }

  function autoridadGuardada(): { id: string; nombre: string } {
    try {
      const g = JSON.parse(localStorage.getItem(CLAVE_AUTORIDAD) ?? "") as { id?: string; nombre?: string };
      return { id: g.id ?? "", nombre: g.nombre ?? "" };
    } catch {
      return { id: "", nombre: "" };
    }
  }

  function dibujar() {
    const nuevos = filas.filter((f) => f.ids && !f.enElCad && !f.resultado?.ok);
    const cargados = filas.filter((f) => f.resultado?.ok);
    const estan = filas.filter((f) => f.enElCad);
    const revisar = filas.filter((f) => f.problema);
    const guardada = autoridad;
    const filasHtml = filas
      .map((f, i) => {
        const estado = f.resultado
          ? `<span class="${f.resultado.ok ? "ok" : "err"}">${esc(f.resultado.texto)}</span>`
          : f.enElCad
            ? `<span class="chip esta">Ya está</span>`
            : f.problema
              ? `<span class="chip rev">Revisar</span><div class="gris">${esc(f.problema)}</div>`
              : `<span class="chip nuevo">Nuevo</span>${f.anterior ? `<div class="gris">Anterior a tus vuelos en el CAD: ¿ya estaba foliado?</div>` : ""}`;
        const caja = f.ids && !f.enElCad && !f.resultado?.ok ? `<input type="checkbox" data-i="${i}" ${f.elegido ? "checked" : ""}>` : "";
        return `<tr><td>${caja}</td><td class="m">${esc(f.b.fecha)}</td><td class="m">${esc(f.b.ruta)}<div class="gris">${esc(f.b.matricula)} · ${f.b.horas.toFixed(1)} h · ${esc(f.b.finalidad)}</div></td><td>${estado}</td></tr>`;
      })
      .join("");
    const elegidos = filas.filter((f) => f.elegido && f.ids && !f.enElCad && !f.resultado?.ok).length;
    mostrar(`
      <p><b>${nuevos.length}</b> para cargar · <b>${estan.length + cargados.length}</b> ya están · <b>${revisar.length}</b> para revisar</p>
      <p class="gris">Quedan "Pendiente de DDJJ". La declaración jurada la hacés vos, en "DDJJ de Horas de vuelo".</p>
      <label>Autoridad certificante</label>
      <select id="aut"><option value="">Elegí…</option>${autoridades
        .map((a) => `<option value="${esc(a.key)}" ${a.key === guardada.id ? "selected" : ""}>${esc(a.value)}</option>`)
        .join("")}</select>
      <label>Nombre y apellido de la autoridad certificante</label>
      <input type="text" id="autn" value="${esc(guardada.nombre)}" placeholder="Como lo cargás en el CAD">
      <div class="bots">
        <button class="b neg" id="cargar" ${elegidos ? "" : "disabled"}>Cargar ${elegidos} ${elegidos === 1 ? "vuelo" : "vuelos"}</button>
        <button class="b sec" id="probar" ${elegidos ? "" : "disabled"}>Ver lo que se manda</button>
        ${estan.length ? `<button class="b sec" id="anotar">Anotar en Vector ${estan.length === 1 ? "el que ya está" : `los ${estan.length} que ya están`}</button>` : ""}
      </div>
      ${nuevos.length > 1 ? `<p class="gris"><a href="#" id="todos">Tildar todos</a> · <a href="#" id="ninguno">Ninguno</a></p>` : ""}
      <div id="salida"></div>
      <table>${filasHtml}</table>`);
    (raiz.getElementById("aut") as HTMLSelectElement).onchange = (e) => (autoridad = { ...autoridad, id: (e.target as HTMLSelectElement).value });
    (raiz.getElementById("autn") as HTMLInputElement).oninput = (e) => (autoridad = { ...autoridad, nombre: (e.target as HTMLInputElement).value });
    raiz.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((cb) => {
      cb.onchange = () => {
        filas[Number(cb.dataset.i)].elegido = cb.checked;
        dibujar();
      };
    });
    const tildar = (si: boolean) => (e: Event) => {
      e.preventDefault();
      for (const f of filas) if (f.ids && !f.enElCad && !f.resultado?.ok) f.elegido = si;
      dibujar();
    };
    raiz.getElementById("todos")?.addEventListener("click", tildar(true));
    raiz.getElementById("ninguno")?.addEventListener("click", tildar(false));
    (raiz.getElementById("cargar") as HTMLButtonElement | null)?.addEventListener("click", () => void cargar(false));
    (raiz.getElementById("probar") as HTMLButtonElement | null)?.addEventListener("click", () => void cargar(true));
    (raiz.getElementById("anotar") as HTMLButtonElement | null)?.addEventListener("click", () => void anotarLosQueEstan());
  }

  function leerAutoridad(): { id: string; nombre: string } | null {
    const id = (raiz.getElementById("aut") as HTMLSelectElement).value;
    const nombre = (raiz.getElementById("autn") as HTMLInputElement).value.trim().toUpperCase();
    const salida = raiz.getElementById("salida") as HTMLDivElement;
    if (!id || !nombre) {
      salida.innerHTML = `<p class="err">Elegí la autoridad certificante y escribí su nombre: el CAD los pide en cada vuelo.</p>`;
      return null;
    }
    try {
      localStorage.setItem(CLAVE_AUTORIDAD, JSON.stringify({ id, nombre }));
    } catch {
      /* sin almacenamiento, se pide de nuevo la próxima */
    }
    return { id, nombre };
  }

  async function cargar(soloProbar: boolean) {
    const aut = leerAutoridad();
    if (!aut) return;
    const elegidas = filas.filter((f) => f.elegido && f.ids && !f.enElCad && !f.resultado?.ok);
    const payloads = elegidas.map((f) => payloadCad(f.b, { ...f.ids!, autoridadID: aut.id, autoridadNombre: aut.nombre }));
    const salida = raiz.getElementById("salida") as HTMLDivElement;
    if (soloProbar) {
      salida.innerHTML = `<p class="gris">Esto es lo que se mandaría a "Crear" del CAD (${payloads.length}). No se mandó nada.</p><pre>${esc(JSON.stringify(payloads.slice(0, 3), null, 2))}${payloads.length > 3 ? "\n…" : ""}</pre>`;
      return;
    }
    if (!confirm(`Vas a cargar ${payloads.length} ${payloads.length === 1 ? "vuelo" : "vuelos"} en el CAD. Quedan "Pendiente de DDJJ": la declaración jurada la hacés vos después. ¿Seguimos?`)) return;

    for (let k = 0; k < elegidas.length; k++) {
      salida.innerHTML = `<p>Cargando ${k + 1} de ${elegidas.length}…</p>`;
      try {
        const r = await fetch(API + "Create", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payloads[k]),
        });
        if (r.ok) elegidas[k].resultado = { ok: true, texto: "Cargado" };
        else {
          const cuerpo = await r.json().catch(() => ({}) as Record<string, string>);
          elegidas[k].resultado = { ok: false, texto: `El CAD no lo aceptó: ${cuerpo.message || cuerpo.exceptionMessage || r.status}` };
        }
      } catch (e) {
        elegidas[k].resultado = { ok: false, texto: `No se pudo mandar: ${e instanceof Error ? e.message : e}` };
      }
    }

    // Los ids salen de la lista del CAD: el mismo criterio que para los que ya estaban.
    const enElCad = await vuelosDelCad().catch(() => [] as VueloEnElCad[]);
    const items = filas
      .map((f) => ({ f, id: f.enElCad ?? (f.resultado?.ok ? yaEstaEnElCad(f.b, enElCad) : null) }))
      .filter((x): x is { f: Fila; id: number } => !!x.id)
      .map((x) => ({ vectorId: x.f.b.vectorId, cadId: x.id }));
    const marcados = await marcarEnVector(items);
    const cargados = elegidas.filter((f) => f.resultado?.ok).length;
    dibujar();
    (raiz.getElementById("salida") as HTMLDivElement).innerHTML =
      `<p class="ok">Listo: ${cargados} de ${elegidas.length} cargados en el CAD.</p>` +
      (marcados === null ? `<p class="err">No pudimos avisarle a Vector: la próxima vez van a aparecer como "Ya está".</p>` : "") +
      `<p class="gris">Recargá la página del CAD para verlos en "Libro de vuelo".</p><div class="bots"><button class="b sec" id="recargar">Recargar el CAD</button></div>`;
    (raiz.getElementById("recargar") as HTMLButtonElement).onclick = () => location.reload();
  }

  async function anotarLosQueEstan() {
    const items = filas.filter((f) => f.enElCad).map((f) => ({ vectorId: f.b.vectorId, cadId: f.enElCad! }));
    const marcados = await marcarEnVector(items);
    (raiz.getElementById("salida") as HTMLDivElement).innerHTML =
      marcados === null ? `<p class="err">No pudimos hablar con Vector.</p>` : `<p class="ok">Anotados en Vector: ${marcados}.</p>`;
  }

  void empezar();
})();
