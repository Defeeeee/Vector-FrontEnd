import { describe, expect, it } from "vitest";
import { armarMensajeNovedades, novedades, type DatosNovedades } from "./novedades-mail";

const base: DatosNovedades = {
  nombre: "Lucía",
  tieneVuelos: false,
  appUrl: "https://vector.fdiaznem.com.ar",
  linkCopiloto: "https://wa.me/12015867983?text=Hola",
  linkBaja: "https://vector.fdiaznem.com.ar/mail/baja?u=u&t=t&m=novedades",
};

describe("el mail de novedades", () => {
  it("saluda por el nombre, y sin nombre no deja un hueco", () => {
    expect(armarMensajeNovedades(base).asunto).toBe("Lucía, esto es lo nuevo en Vector");
    const sin = armarMensajeNovedades({ ...base, nombre: " " });
    expect(sin.asunto).toBe("Lo nuevo en Vector");
    expect(sin.texto.startsWith("Desde que te hiciste la cuenta")).toBe(true);
  });

  it("el botón del final depende de si ya cargó vuelos", () => {
    expect(armarMensajeNovedades(base).html).toContain("Cargar mi primer vuelo");
    const conVuelos = armarMensajeNovedades({ ...base, tieneVuelos: true });
    expect(conVuelos.html).toContain("Abrir mi bitácora");
    expect(conVuelos.html).not.toContain("Cargar mi primer vuelo");
  });

  it("sin link del copiloto, el audio manda al Hangar a dejar el número", () => {
    const n = novedades({ ...base, linkCopiloto: null })[0];
    expect(n.link?.url).toBe("https://vector.fdiaznem.com.ar/dashboard/settings");
    expect(novedades(base)[0].link?.url).toContain("wa.me");
  });

  it("al alumno no le ofrece el importador del libro, y la PPA es su camino", () => {
    const m = armarMensajeNovedades({ ...base, alumno: true });
    expect(m.html).not.toContain("/dashboard/log-flight/import");
    expect(m.texto).not.toContain("libro de papel");
    expect(m.html).toContain("Tu camino a la PPA");
    expect(armarMensajeNovedades(base).html).toContain("/dashboard/log-flight/import");
  });

  it("lleva la baja en el texto y en el HTML", () => {
    const m = armarMensajeNovedades(base);
    expect(m.texto).toContain(base.linkBaja);
    expect(m.html).toContain("No recibirlas más");
    expect(m.html).toContain("m=novedades");
  });

  it("el texto plano cuenta lo mismo que el HTML", () => {
    const m = armarMensajeNovedades(base);
    for (const n of novedades(base)) {
      expect(m.texto).toContain(n.titulo);
      expect(m.html).toContain(n.titulo);
    }
  });

  it("no promete lo que no está decidido", () => {
    const m = armarMensajeNovedades(base);
    for (const palabra of ["gratis", "oficial"]) {
      expect(m.texto.toLowerCase()).not.toContain(palabra);
      expect(m.html.toLowerCase()).not.toContain(palabra);
    }
  });

  it("escapa el nombre", () => {
    expect(armarMensajeNovedades({ ...base, nombre: "<b>x</b>" }).html).not.toContain("<b>x</b>");
  });
});
