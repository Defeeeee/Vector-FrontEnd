import { describe, expect, it } from "vitest";
import { demoraDesdeHoraLocal, dofDeDemora, eobtVigente, revisarDemora, type Demora } from "./demora-plan";
import { formularioVacio, normalizar } from "./formulario-plan";

// Sale el 20/10 a las 15:30 hora argentina = 1830 UTC.
const PLAN = normalizar({ ...formularioVacio(), fechaLocal: "2026-10-20", horaLocal: "15:30" });

describe("la demora (AIP ENR 1.10, punto 7)", () => {
  it("la EOBT vigente es la del plan, o la de la última demora", () => {
    expect(eobtVigente(PLAN, [])).toEqual({ dof: "2026-10-20", eobt: "1830" });
    expect(eobtVigente(PLAN, [{ dof: "2026-10-20", eobt: "1930" }])).toEqual({ dof: "2026-10-20", eobt: "1930" });
    expect(eobtVigente(formularioVacio(), [])).toBeNull();
  });

  it("la nueva hora, en hora argentina, pasa a UTC el mismo día", () => {
    expect(demoraDesdeHoraLocal(PLAN, [], "16:30")).toEqual({ dof: "2026-10-20", eobt: "1930" });
  });

  it("una hora más temprana es al día siguiente", () => {
    const tarde = normalizar({ ...formularioVacio(), fechaLocal: "2026-10-20", horaLocal: "23:00" });
    // 00:30 del 21 en Argentina = 0330 UTC del 21.
    expect(demoraDesdeHoraLocal(tarde, [], "00:30")).toEqual({ dof: "2026-10-21", eobt: "0330" });
  });

  it("de una demora a la siguiente, parte de la última", () => {
    expect(demoraDesdeHoraLocal(PLAN, [{ dof: "2026-10-20", eobt: "1930" }], "17:00")).toEqual({ dof: "2026-10-20", eobt: "2000" });
  });

  it("la cuarta demora no se puede (7.3)", () => {
    const tres: Demora[] = [
      { dof: "2026-10-20", eobt: "1900" },
      { dof: "2026-10-20", eobt: "1930" },
      { dof: "2026-10-20", eobt: "2000" },
    ];
    expect(revisarDemora(PLAN, tres, "2026-10-20T12:00:00Z").error).toMatch(/tres demoras/);
  });

  it("con menos de 30 minutos a la salida, avisa que corresponde un plan nuevo (7.2)", () => {
    expect(revisarDemora(PLAN, [], "2026-10-20T18:10:00Z")).toMatchObject({ error: null, aviso: expect.stringMatching(/plan nuevo/) });
    expect(revisarDemora(PLAN, [], "2026-10-20T17:50:00Z")).toEqual({ error: null, aviso: null });
  });

  it("la fecha de la demora como DOF/", () => {
    expect(dofDeDemora({ dof: "2026-10-21", eobt: "0330" })).toBe("261021");
  });
});
