import { describe, expect, it } from "vitest";
import { Flight, PilotDocument } from "@/types";
import { ClassRecency } from "./recency";
import { pilotStatus } from "./pilot-status";

/**
 * El orden de estos casos es el de la norma, del más grave al más leve, y eso
 * importa: si alguien lleva tres años sin volar y además tiene el CMA vencido, lo
 * que necesita saber es que perdió las atribuciones, no que le falta un trámite.
 */

const HOY = new Date("2026-08-06T12:00:00Z");

const doc = (kind: string, expiry: string, name = kind, blocking = "nada"): PilotDocument =>
  ({ id: name, user_id: "u", kind, name, expiry_date: expiry, blocking, alert_days: [], created_at: "", updated_at: "" }) as PilotDocument;

const vuelo = (date: string): Flight =>
  ({ id: date, user_id: "u", date, route: "SADF SADF", landings: 1, duration: 1, takeoff: "", landing: "", purpose: "VP" }) as Flight;

const vigente = (clase = "MONT-T"): ClassRecency =>
  ({ clase, landings: 5, expiresOn: "2027-01-21", status: null, vigente: true });
const noVigente = (clase = "MONT-T"): ClassRecency =>
  ({ clase, landings: 1, expiresOn: "2026-05-01", status: null, vigente: false });

const alDia = [doc("cma", "2027-06-30"), doc("repaso_vuelo", "2027-12-31")];

describe("pilotStatus", () => {
  it("está vigente cuando se cumplen las cuatro condiciones", () => {
    const r = pilotStatus(alDia, [vigente()], [vuelo("2026-08-01")], HOY);
    expect(r.estado).toBe("vigente");
    expect(r.puede).toContain("pasajeros");
    expect(r.seccion).toBe("61.060(a)(1)");
  });

  /**
   * 61.140(c)(2)(i): con el repaso vigente se puede auto-reentrenar volando solo.
   * Es la diferencia que un sí/no perdería.
   */
  it("sin experiencia reciente deja volar solo, no con pasajeros", () => {
    const r = pilotStatus(alDia, [noVigente()], [vuelo("2026-08-01")], HOY);
    expect(r.estado).toBe("sin_recencia");
    expect(r.puede).toContain("solo");
    expect(r.puede).toContain("no llevar pasajeros");
    expect(r.paraVolver).toContain("sin personas a bordo");
    expect(r.seccion).toBe("61.140(c)(2)(i)");
  });

  it("nombra la clase en la que falta recencia", () => {
    const r = pilotStatus(alDia, [vigente("MONT-T"), noVigente("MULT-T")], [vuelo("2026-08-01")], HOY);
    expect(r.estado).toBe("sin_recencia");
    expect(r.detalle).toContain("MULT-T");
    expect(r.detalle).not.toContain("MONT-T");
  });

  /** 61.135: sin repaso no se puede actuar como piloto al mando. */
  it("con el repaso vencido no se puede ser PIC", () => {
    const r = pilotStatus(
      [doc("cma", "2027-06-30"), doc("repaso_vuelo", "2026-01-01")],
      [vigente()], [vuelo("2026-08-01")], HOY
    );
    expect(r.estado).toBe("repaso_vencido");
    expect(r.paraVolver).toContain("instructor");
    expect(r.seccion).toBe("61.135");
  });

  /** No tenerlo cargado no es lo mismo que tenerlo vencido, y el texto lo dice. */
  it("distingue no tener repaso de tenerlo vencido", () => {
    const r = pilotStatus([doc("cma", "2027-06-30")], [vigente()], [vuelo("2026-08-01")], HOY);
    expect(r.estado).toBe("repaso_vencido");
    expect(r.detalle).toContain("No tenés un repaso");
  });

  it("el CMA vencido bloquea todo", () => {
    const r = pilotStatus(
      [doc("cma", "2026-01-01", "Certificado Médico"), doc("repaso_vuelo", "2027-12-31")],
      [vigente()], [vuelo("2026-08-01")], HOY
    );
    expect(r.estado).toBe("documento_vencido");
    expect(r.seccion).toBe("61.060(a)(1)(i)");
    expect(r.detalle).toContain("Certificado Médico");
  });

  /**
   * El seguro y la aeronavegabilidad son de la aeronave, no del piloto.
   * 61.060(a)(1) habla de la licencia.
   */
  it("no bloquea por documentos de la aeronave", () => {
    const r = pilotStatus(
      [...alDia, doc("seguro", "2020-01-01"), doc("aeronavegabilidad", "2020-01-01")],
      [vigente()], [vuelo("2026-08-01")], HOY
    );
    expect(r.estado).toBe("vigente");
  });

  /**
   * Un documento que el piloto marcó como bloqueante. No es RAAC —una cuota de
   * aeroclub no está en la 61— pero si él dice que sin eso no vuela, no vuela.
   */
  it("un documento marcado como bloqueante de vuelo impide volar", () => {
    const r = pilotStatus(
      [...alDia, doc("otro", "2026-01-01", "Cuota del aeroclub", "vuelo")],
      [vigente()], [vuelo("2026-08-01")], HOY
    );
    expect(r.estado).toBe("documento_vencido");
    expect(r.puede).toBe("No podés volar.");
    expect(r.detalle).toContain("Cuota del aeroclub");
  });

  it("uno marcado como bloqueante de pasajeros deja volar solo", () => {
    const r = pilotStatus(
      [...alDia, doc("otro", "2026-01-01", "Autorización del instructor", "pasajeros")],
      [vigente()], [vuelo("2026-08-01")], HOY
    );
    expect(r.estado).toBe("sin_recencia");
    expect(r.puede).toContain("solo");
    expect(r.detalle).toContain("Autorización del instructor");
  });

  /**
   * El nivel intermedio: no podés volar solo, pero sí con instructor — y ese
   * vuelo es el que lo renueva. Es la misma semántica que el repaso de 61.135.
   */
  it("uno marcado como bloqueante de vuelo solo obliga a volar con instructor", () => {
    const r = pilotStatus(
      [...alDia, doc("otro", "2026-01-01", "Adaptación a la aeronave", "solo")],
      [vigente()], [vuelo("2026-08-01")], HOY
    );
    expect(r.puede).toBe("Sólo podés volar con instructor.");
    expect(r.paraVolver).toContain("vuelo con instructor");
    expect(r.detalle).toContain("Adaptación a la aeronave");
  });

  /** Si faltan los dos, se nombra primero el que exige la norma. */
  it("el repaso vencido se nombra antes que un bloqueante propio de vuelo solo", () => {
    const r = pilotStatus(
      [doc("cma", "2027-06-30"), doc("repaso_vuelo", "2026-01-01"),
       doc("otro", "2026-01-01", "Adaptación", "solo")],
      [vigente()], [vuelo("2026-08-01")], HOY
    );
    expect(r.seccion).toBe("61.135");
  });

  /** La escalera respeta su orden: lo más restrictivo gana. */
  it("bloquear el vuelo gana sobre bloquear el vuelo solo", () => {
    const r = pilotStatus(
      [...alDia, doc("otro", "2026-01-01", "Solo", "solo"), doc("otro", "2026-01-01", "Todo", "vuelo")],
      [vigente()], [vuelo("2026-08-01")], HOY
    );
    expect(r.puede).toBe("No podés volar.");
  });

  /** El default no cambia nada: un documento no bloquea salvo que se lo pidan. */
  it("un documento vencido sin marcar no bloquea", () => {
    const r = pilotStatus(
      [...alDia, doc("otro", "2020-01-01", "Curso viejo")],
      [vigente()], [vuelo("2026-08-01")], HOY
    );
    expect(r.estado).toBe("vigente");
  });

  it("uno marcado pero vigente tampoco bloquea", () => {
    const r = pilotStatus(
      [...alDia, doc("otro", "2027-12-31", "Cuota", "vuelo")],
      [vigente()], [vuelo("2026-08-01")], HOY
    );
    expect(r.estado).toBe("vigente");
  });

  /** Lo de la norma pesa más que un requisito propio. */
  it("el CMA vencido gana sobre un bloqueante propio", () => {
    const r = pilotStatus(
      [doc("cma", "2026-01-01", "CMA"), doc("repaso_vuelo", "2027-12-31"),
       doc("otro", "2026-01-01", "Cuota", "vuelo")],
      [vigente()], [vuelo("2026-08-01")], HOY
    );
    expect(r.detalle).toContain("CMA");
  });

  /** 61.060(a)(2) — el peor estado gana sobre cualquier otro. */
  it("la inactividad de más de 24 meses gana sobre el resto", () => {
    const r = pilotStatus(
      [doc("cma", "2020-01-01"), doc("repaso_vuelo", "2020-01-01")],
      [noVigente()], [vuelo("2023-01-15")], HOY
    );
    expect(r.estado).toBe("inactividad_prolongada");
    expect(r.paraVolver).toContain("examen de pericia");
    expect(r.seccion).toBe("61.060(a)(2)");
  });

  it("24 meses justos todavía no es inactividad prolongada", () => {
    const r = pilotStatus(alDia, [vigente()], [vuelo("2024-08-06")], HOY);
    expect(r.estado).not.toBe("inactividad_prolongada");
  });

  it("sin vuelos no inventa inactividad", () => {
    const r = pilotStatus(alDia, [], [], HOY);
    expect(r.estado).toBe("vigente");
  });

  /**
   * El CMA se puede saltear en el onboarding, así que "no está cargado" es un
   * estado real y no un caso de laboratorio. Antes de esto la función devolvía
   * `vigente`: le afirmaba a un piloto que podía volar sin saber nada de su
   * certificado médico.
   */
  describe("documento faltante", () => {
    it("sin CMA cargado no afirma que pueda volar", () => {
      const r = pilotStatus([doc("repaso_vuelo", "2027-12-31")], [vigente()], [vuelo("2026-08-01")], HOY);
      expect(r.estado).toBe("documento_faltante");
      expect(r.seccion).toBe("61.060(a)(1)(i)");
      expect(r.paraVolver).toContain("certificado médico");
    });

    /** Ni "podés" ni "no podés": Vector no lo sabe, y lo dice. */
    it("distingue no saber de no poder", () => {
      const r = pilotStatus([], [vigente()], [], HOY);
      expect(r.estado).toBe("documento_faltante");
      expect(r.detalle).toContain("no lo sabe");
    });

    /** De un CMA vencido sí sabemos algo, y es peor que no tenerlo cargado. */
    it("un CMA vencido gana sobre uno faltante", () => {
      const r = pilotStatus([doc("cma", "2020-01-01")], [vigente()], [vuelo("2026-08-01")], HOY);
      expect(r.estado).toBe("documento_vencido");
    });

    /**
     * La regresión que este estado podía causar: ningún piloto real tiene
     * cargados `licencia` ni `habilitacion` como documento —el tipo de licencia
     * vive en `profiles.license_type`—, así que exigirlos mandaría a todos a
     * "no podemos confirmar" y el estado no significaría nada.
     */
    it("no se dispara por licencia o habilitación sin cargar", () => {
      const r = pilotStatus(alDia, [vigente()], [vuelo("2026-08-01")], HOY);
      expect(r.estado).toBe("vigente");
    });

    it("con el CMA cargado sigue evaluando el resto", () => {
      const r = pilotStatus([doc("cma", "2027-06-30")], [vigente()], [vuelo("2026-08-01")], HOY);
      expect(r.estado).toBe("repaso_vencido");
    });
  });
});
