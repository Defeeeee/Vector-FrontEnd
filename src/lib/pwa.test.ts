import { describe, expect, it } from "vitest";
import {
  CACHES_PERSONALES,
  CACHES_SIN_VERSION,
  CACHE_DATOS,
  CACHE_METEO,
  CACHE_PAGINAS,
  PREFIJO_SHELL,
  cachesABorrar,
  paginaCacheable,
} from "./pwa";

/**
 * Las dos decisiones de la PWA que se pueden testear sin navegador.
 *
 * El service worker no se puede montar acá, así que estas dos funciones son la
 * frontera: **lo que decide se testea, lo que ejecuta no**. Si alguna vez hay que
 * mover una regla adentro del `sw.ts`, es señal de que la regla está mal ubicada.
 */

describe("cachesABorrar", () => {
  it("se lleva el shell de las versiones viejas", () => {
    const borrar = cachesABorrar(
      [`${PREFIJO_SHELL}2.13.0`, `${PREFIJO_SHELL}2.14.0`],
      `${PREFIJO_SHELL}2.14.0`
    );
    expect(borrar).toEqual([`${PREFIJO_SHELL}2.13.0`]);
  });

  it("**no toca los caches sin versión: un deploy no puede borrar la bitácora offline**", () => {
    /*
      Es el test que justifica que esta función exista en vez de un filtro en línea
      adentro del `activate`. La línea que uno escribe sin pensar —"borrá todo lo que
      no sea el cache actual"— pasaría los otros dos tests de este archivo y se
      llevaría puesto, en cada deploy, todo lo que el piloto tiene guardado para ver
      sin señal.
    */
    const borrar = cachesABorrar(
      [`${PREFIJO_SHELL}2.13.0`, CACHE_PAGINAS, CACHE_DATOS, CACHE_METEO],
      `${PREFIJO_SHELL}2.14.0`
    );
    expect(borrar).toEqual([`${PREFIJO_SHELL}2.13.0`]);
    for (const cache of CACHES_SIN_VERSION) expect(borrar).not.toContain(cache);
  });

  it("no borra caches ajenos", () => {
    // El origen es nuestro, pero barrer lo que no reconocemos es la clase de
    // limpieza que después nadie sabe explicar.
    expect(cachesABorrar(["algo-de-otra-app", "workbox-precache"], `${PREFIJO_SHELL}1.0.0`)).toEqual([]);
  });

  it("sin nada que borrar devuelve una lista vacía, no null", () => {
    expect(cachesABorrar([], `${PREFIJO_SHELL}1.0.0`)).toEqual([]);
    expect(cachesABorrar([`${PREFIJO_SHELL}1.0.0`], `${PREFIJO_SHELL}1.0.0`)).toEqual([]);
  });

  it("los caches personales son un subconjunto de los que existen sin versión", () => {
    // Si alguien agrega un cache personal y se olvida de declararlo, el borrado al
    // cerrar sesión lo dejaría vivo con datos del piloto adentro.
    for (const cache of CACHES_PERSONALES) expect(CACHES_SIN_VERSION).toContain(cache);
  });

  it("el cache de datos aeronáuticos **no** es personal", () => {
    // Borrarlo al cerrar sesión sólo empeoraría el próximo vuelo: son datos
    // públicos del AIP, iguales para cualquiera.
    expect(CACHES_PERSONALES).not.toContain(CACHE_DATOS);
  });
});

describe("paginaCacheable", () => {
  it("las pantallas de lectura sí", () => {
    for (const p of [
      "/dashboard",
      "/dashboard/history",
      "/dashboard/planificador",
      "/dashboard/tools",
    ]) {
      expect(paginaCacheable(p)).toBe(true);
    }
  });

  it("**las de escritura y las de sesión no**", () => {
    /*
      Una foto vieja de un formulario de alta no sirve para nada, y una del login
      confunde. `audit` queda afuera por algo más fuerte: su resultado es un
      veredicto sobre la libreta, y un veredicto guardado puede haber dejado de ser
      cierto.
    */
    for (const p of [
      "/dashboard/log-flight",
      "/dashboard/log-flight/import",
      "/dashboard/settings",
      "/dashboard/audit",
      "/login",
      "/",
    ]) {
      expect(paginaCacheable(p)).toBe(false);
    }
  });

  it("la barra final no cambia la respuesta", () => {
    expect(paginaCacheable("/dashboard/history/")).toBe(true);
    expect(paginaCacheable("/")).toBe(false);
  });

  it("una ruta desconocida no se cachea", () => {
    // Lista blanca y no lista negra: una pantalla nueva no entra sola al cache sin
    // que alguien haya decidido que puede.
    expect(paginaCacheable("/dashboard/pantalla-que-no-existe-todavia")).toBe(false);
  });
});
