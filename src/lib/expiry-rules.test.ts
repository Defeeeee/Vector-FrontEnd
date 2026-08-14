import { describe, expect, it } from "vitest";
import type { PilotDocument } from "@/types";
import { ayudaRegla, descripcionRegla, modoDe, vencimientoDerivado } from "./expiry-rules";

const doc = (over: Partial<PilotDocument> = {}): PilotDocument =>
  ({
    id: "d1",
    user_id: "u",
    kind: "otro",
    blocking: "nada",
    name: "Autorización del instructor",
    expiry_date: null,
    expiry_rule: "fijo",
    alert_days: [],
    created_at: "",
    updated_at: "",
    ...over,
  }) as PilotDocument;

describe("vencimientoDerivado", () => {
  it("suma los días al último vuelo", () => {
    expect(vencimientoDerivado("2026-08-01", 60)).toBe("2026-09-30");
  });

  /**
   * Sin ancla no hay fecha, y `null` significa "no vence" desde la migración 007.
   * Una cuenta que arranca con el último vuelo, sin ningún vuelo, no arrancó.
   */
  it("sin último vuelo devuelve null", () => {
    expect(vencimientoDerivado(null, 60)).toBe(null);
    expect(vencimientoDerivado(undefined, 60)).toBe(null);
  });

  it("sin offset no inventa una fecha", () => {
    expect(vencimientoDerivado("2026-08-01", null)).toBe(null);
    expect(vencimientoDerivado("2026-08-01", 0)).toBe(null);
  });

  /**
   * `sumarDias` trabaja en UTC a propósito. Con un `Date` local, el 1 de agosto a
   * las 00:00 en Argentina es el 31 de julio en UTC y la cuenta se corre un día.
   */
  it("cruza el fin de año y el bisiesto sin correrse un día", () => {
    expect(vencimientoDerivado("2023-12-20", 90)).toBe("2024-03-19");
    expect(vencimientoDerivado("2024-02-28", 1)).toBe("2024-02-29");
  });

  /** El backend manda `expiry_date` como "YYYY-MM-DD", pero un timestamp no debería romper. */
  it("tolera un ISO con hora", () => {
    expect(vencimientoDerivado("2026-08-01T12:00:00Z", 1)).toBe("2026-08-02");
  });
});

describe("modoDe", () => {
  it("una regla derivada es su propio modo", () => {
    expect(modoDe(doc({ expiry_rule: "ultimo_vuelo", expiry_offset_days: 60 }))).toBe("ultimo_vuelo");
  });

  it("con fecha y sin regla es fecha fija", () => {
    expect(modoDe(doc({ expiry_date: "2027-01-01" }))).toBe("fecha");
  });

  it("sin fecha y sin regla es no vence", () => {
    expect(modoDe(doc())).toBe("no_vence");
  });

  /** Un documento nuevo arranca pidiendo una fecha, que es el caso normal. */
  it("sin documento arranca en fecha", () => {
    expect(modoDe(undefined)).toBe("fecha");
  });

  /**
   * Un backend sin la migración 011 no manda `expiry_rule`. Ausente tiene que
   * leerse como 'fijo', que es lo que eran todas las filas antes.
   */
  it("sin expiry_rule se comporta como fijo", () => {
    const viejo = { ...doc({ expiry_date: "2027-01-01" }) } as Partial<PilotDocument>;
    delete viejo.expiry_rule;
    expect(modoDe(viejo as PilotDocument)).toBe("fecha");
  });
});

describe("descripcionRegla", () => {
  it("describe la regla derivada", () => {
    expect(descripcionRegla(doc({ expiry_rule: "ultimo_vuelo", expiry_offset_days: 60 })))
      .toBe("60 días después de tu último vuelo");
  });

  it("no pluraliza un solo día", () => {
    expect(descripcionRegla(doc({ expiry_rule: "ultimo_vuelo", expiry_offset_days: 1 })))
      .toBe("1 día después de tu último vuelo");
  });

  /** Un vencimiento fijo es la fecha y nada más: una leyenda ahí es ruido. */
  it("no dice nada de un vencimiento fijo", () => {
    expect(descripcionRegla(doc({ expiry_date: "2027-01-01" }))).toBe(null);
  });

  it("no dice nada de una regla sin offset", () => {
    expect(descripcionRegla(doc({ expiry_rule: "ultimo_vuelo" }))).toBe(null);
  });
});

describe("ayudaRegla", () => {
  it("dice que volar corre la fecha hacia adelante", () => {
    const texto = ayudaRegla(60, "2026-08-01");
    expect(texto).toContain("2026-09-30");
    expect(texto).toMatch(/corre hacia adelante/);
  });

  it("sin vuelos explica que la cuenta no empezó", () => {
    expect(ayudaRegla(60, null)).toMatch(/no empezó/);
  });
});
