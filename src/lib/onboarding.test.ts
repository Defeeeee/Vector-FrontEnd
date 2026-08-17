import { describe, expect, it } from "vitest";
import { Profile } from "@/types";
import { estadoOnboarding, tieneLicencia } from "./onboarding";

const perfil = (license_type?: string): Profile =>
  ({ id: "u", first_name: "Test", last_name: "Pilot", license_type }) as Profile;

const completo = { profile: perfil("PPA"), tieneCma: true, aeronaves: 1, vuelos: 1 };

describe("tieneLicencia", () => {
  /**
   * El backend crea el perfil con `license_type = "-"`, así que ese valor es
   * "sin cargar" y no una licencia llamada guión. Es el centinela que el overlay
   * usa como gate: si esto se rompe, el alta deja de aparecer.
   */
  it('trata el centinela "-" como falta', () => {
    expect(tieneLicencia(perfil("-"))).toBe(false);
  });

  it("trata el vacío y el whitespace como falta", () => {
    expect(tieneLicencia(perfil(""))).toBe(false);
    expect(tieneLicencia(perfil("   "))).toBe(false);
    expect(tieneLicencia(perfil(undefined))).toBe(false);
    expect(tieneLicencia(null)).toBe(false);
  });

  it("acepta una licencia real", () => {
    expect(tieneLicencia(perfil("PPA"))).toBe(true);
  });
});

describe("estadoOnboarding", () => {
  it("no muestra nada cuando el piloto está operativo", () => {
    const r = estadoOnboarding(completo);
    expect(r.completo).toBe(true);
    expect(r.pendientes).toBe(0);
  });

  /** Los dos escalones que el embudo mostró: 8→4 y 4→1. */
  it("cuenta la aeronave y el primer vuelo como pasos", () => {
    const r = estadoOnboarding({ ...completo, aeronaves: 0, vuelos: 0 });
    expect(r.aeronave).toBe(false);
    expect(r.vuelo).toBe(false);
    expect(r.completo).toBe(false);
    expect(r.pendientes).toBe(2);
  });

  /** El CMA se puede saltear en el wizard: el checklist es donde vuelve a pedirse. */
  it("el CMA salteado queda pendiente", () => {
    const r = estadoOnboarding({ ...completo, tieneCma: false });
    expect(r.cma).toBe(false);
    expect(r.pendientes).toBe(1);
  });

  it("una cuenta recién creada tiene los cuatro pendientes", () => {
    const r = estadoOnboarding({ profile: perfil("-"), tieneCma: false, aeronaves: 0, vuelos: 0 });
    expect(r.pendientes).toBe(4);
    expect(r.completo).toBe(false);
  });

  /**
   * El bug reportado: "a veces me logueo y me dice que no tengo CMA hasta que voy
   * al Hangar", con el CMA cargado. La consulta de documentos fallaba, llegaba
   * `[]`, y `[]` se leía como "no tiene".
   */
  describe("cuando no se pudieron leer los documentos", () => {
    it("el CMA queda en desconocido y no cuenta como pendiente", () => {
      const r = estadoOnboarding({ ...completo, tieneCma: null });
      expect(r.cma).toBe(null);
      expect(r.pendientes).toBe(0);
      expect(r.completo).toBe(true);
    });

    it("no tapa los pasos que sí se pudieron verificar", () => {
      const r = estadoOnboarding({ ...completo, tieneCma: null, vuelos: 0 });
      expect(r.vuelo).toBe(false);
      expect(r.pendientes).toBe(1);
      expect(r.completo).toBe(false);
    });
  });

  /**
   * El 2026-08-17: una request de `/dashboard` perdió siete de sus ocho consultas
   * y el checklist le marcó **tres pasos sin tildar** a un piloto con licencia, 6
   * aeronaves y 41 vuelos cargados. La primera versión de este arreglo sólo
   * contemplaba que fallara la consulta de documentos, porque ése había sido el
   * bug reportado — pero el bug nunca fue "el CMA", es "una lista vacía se lee
   * como una afirmación", y hay cuatro listas.
   */
  describe("cuando falla cualquier otra sección", () => {
    it("sin perfil no afirma que falta la licencia", () => {
      const r = estadoOnboarding({ ...completo, profile: null, perfilDisponible: false });
      expect(r.licencia).toBe(null);
      expect(r.pendientes).toBe(0);
    });

    it("sin aeronaves leídas no afirma que no tiene ninguna", () => {
      const r = estadoOnboarding({ ...completo, aeronaves: null });
      expect(r.aeronave).toBe(null);
      expect(r.pendientes).toBe(0);
    });

    it("sin vuelos leídos no afirma que no voló nunca", () => {
      const r = estadoOnboarding({ ...completo, vuelos: null });
      expect(r.vuelo).toBe(null);
      expect(r.pendientes).toBe(0);
    });

    /** El caso exacto de la captura: sólo llegaron los documentos. */
    it("con sólo los documentos leídos, no marca nada como pendiente", () => {
      const r = estadoOnboarding({
        profile: null, perfilDisponible: false,
        tieneCma: true, aeronaves: null, vuelos: null,
      });
      expect([r.licencia, r.aeronave, r.vuelo]).toEqual([null, null, null]);
      expect(r.cma).toBe(true);
      expect(r.pendientes).toBe(0);
      expect(r.completo).toBe(true);
    });

    /** Con el perfil disponible y sin licencia, sigue siendo un paso pendiente. */
    it("no confunde 'no pude leer' con 'está vacío'", () => {
      const r = estadoOnboarding({ ...completo, profile: perfil("-"), perfilDisponible: true });
      expect(r.licencia).toBe(false);
      expect(r.pendientes).toBe(1);
    });
  });
});
