/**
 * Vector → CAD, en la pestaña del CAD de ANAC: un botón fijo que hace lo mismo que el marcador
 * de `/dashboard/history/cad` (`components/dashboard/MarcadorCad.tsx`): carga el panel de Vector
 * (`/cad/puente.js`, compilado de `src/cad/puente.ts`) adentro de esta página.
 *
 * Por eso la extensión no pide permisos ni hace pedidos propios: los pedidos al CAD los hace el
 * panel desde esta pestaña, con la sesión que el piloto abrió, igual que si cargara a mano. Y el
 * panel se actualiza con cada deploy de Vector sin publicar otra versión de la extensión.
 *
 * Corre en el mundo de la página (`"world": "MAIN"`), no en el aislado de la extensión: un
 * `<script>` agregado desde el mundo aislado queda bajo la CSP de la extensión, que bloquea
 * cualquier script de otro origen (1.0.0, 2026-10-29). El CAD no manda CSP, así que desde la
 * página carga igual que el marcador. Por eso no usa `chrome.*` (no existe acá): el ícono va
 * adentro, como data URL (lo pone `scripts/build-extension.mjs` en `__ICONO__`).
 */
(() => {
  const VECTOR = "https://vector.fdiaznem.com.ar";
  if (document.getElementById("vector-cad-boton")) return;

  const boton = document.createElement("button");
  boton.id = "vector-cad-boton";
  boton.type = "button";
  boton.title = "Pasar tus vuelos de Vector a este CAD";
  boton.innerHTML =
    '<img alt="" width="20" height="20" style="border-radius:6px;display:block"> <span>Pasar con Vector</span>';
  boton.querySelector("img").src = "__ICONO__";
  Object.assign(boton.style, {
    position: "fixed",
    right: "20px",
    bottom: "20px",
    zIndex: "2147483646",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px 10px 10px",
    border: "0",
    borderRadius: "999px",
    background: "#18181b",
    color: "#fff",
    font: "600 14px/1 system-ui, -apple-system, 'Segoe UI', sans-serif",
    boxShadow: "0 8px 24px rgba(0,0,0,.25)",
    cursor: "pointer",
  });

  let cargando = false;
  boton.addEventListener("click", () => {
    if (cargando) return;
    cargando = true;
    boton.style.opacity = "0.6";
    // Lo mismo que el marcador: el script del panel desde Vector, a la página del CAD.
    const s = document.createElement("script");
    s.src = `${VECTOR}/cad/puente.js?t=${Date.now()}`;
    const listo = () => {
      cargando = false;
      boton.style.opacity = "1";
    };
    s.onload = listo;
    s.onerror = () => {
      listo();
      alert("No se pudo cargar el panel de Vector. Revisá tu conexión y probá de nuevo.");
    };
    document.body.appendChild(s);
  });

  document.body.appendChild(boton);
})();
