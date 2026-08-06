import { describe, expect, it } from "vitest";
import {
  alreadyHandled,
  breakdownError,
  isAffirmation,
  pendingFlight,
  proposalSummary,
  type ChatEntry,
} from "./copilot-guards";

/**
 * Estos tests existen porque el copiloto escribe en la bitácora de un piloto.
 * Cada uno cubre una forma concreta de arruinar un registro regulatorio.
 */

describe("isAffirmation", () => {
  it("acepta las confirmaciones que un piloto escribe de verdad", () => {
    for (const yes of ["ok", "Ok", "SI", "sí", "dale", "dale!", "listo", "confirmar", "va", "yes"]) {
      expect(isAffirmation(yes), yes).toBe(true);
    }
  });

  it("rechaza cualquier cosa que no sea un sí limpio", () => {
    for (const no of ["no", "esperá", "cambiá la fecha", "", "   ", "nope"]) {
      expect(isAffirmation(no), no).toBe(false);
    }
  });

  /**
   * El caso que importa. "ok pero la duración es 1.5" contiene "ok", y una
   * comparación por inclusión lo tomaría por un sí — registrando el vuelo con
   * la duración que el piloto estaba corrigiendo.
   */
  it("no confirma cuando el sí viene con una corrección pegada", () => {
    expect(isAffirmation("ok pero la duración es 1.5")).toBe(false);
    expect(isAffirmation("si, pero cambiá la matrícula")).toBe(false);
    expect(isAffirmation("dale igual corregí el destino")).toBe(false);
  });
});

describe("breakdownError", () => {
  it("rechaza un desglose que asigna más horas de las que duró el vuelo", () => {
    const error = breakdownError({ pic_day_loc: 1.5, pic_day_tra: 1.0 }, 1.5);
    expect(error).toBeTruthy();
    expect(error).toContain("2.5");
  });

  it("acepta un desglose que cierra exacto", () => {
    expect(breakdownError({ pic_day_loc: 1.2, pic_night_loc: 0.3 }, 1.5)).toBeNull();
  });

  it("acepta un desglose parcial: asignar de menos es válido", () => {
    expect(breakdownError({ pic_day_loc: 0.5 }, 1.5)).toBeNull();
    expect(breakdownError({}, 1.5)).toBeNull();
  });

  /**
   * IMC, capota y simulador se superponen con el tiempo de vuelo en vez de
   * repartirlo — misma regla que `openingTotals` en summary.ts. Sumarlos haría
   * que un vuelo IFR entero se rechazara por duplicar su propia duración.
   */
  it("no suma IMC, capota ni simulador", () => {
    const error = breakdownError(
      { pic_day_loc: 1.5, imc_pil: 1.5, capota: 1.0, sim_instructor: 2 },
      1.5
    );
    expect(error).toBeNull();
  });

  it("tolera decimales que no cierran redondo", () => {
    expect(breakdownError({ pic_day_loc: 0.7, pic_day_tra: 0.8 }, 1.5)).toBeNull();
  });
});

describe("alreadyHandled", () => {
  const history: ChatEntry[] = [
    { role: "user", content: "hola", id: "wamid.AAA" },
    { role: "assistant", content: "buenas" },
  ];

  it("reconoce un reintento aunque el proceso se haya reiniciado", () => {
    expect(alreadyHandled(history, "wamid.AAA")).toBe(true);
  });

  it("deja pasar un mensaje nuevo", () => {
    expect(alreadyHandled(history, "wamid.BBB")).toBe(false);
  });

  it("no bloquea cuando no hay id", () => {
    expect(alreadyHandled(history, "")).toBe(false);
  });
});

describe("pendingFlight", () => {
  const proposal = { date: "2026-08-06", route: "SADF SADM" };

  it("encuentra la propuesta más reciente", () => {
    const history: ChatEntry[] = [
      { role: "system", pending_flight: { date: "vieja" }, at: Date.now() },
      { role: "system", pending_flight: proposal, at: Date.now() },
    ];
    expect(pendingFlight(history)).toEqual(proposal);
  });

  it("ignora una propuesta vencida", () => {
    const history: ChatEntry[] = [
      { role: "system", pending_flight: proposal, at: Date.now() - 60 * 60 * 1000 },
    ];
    expect(pendingFlight(history)).toBeNull();
  });

  it("devuelve null cuando no hay ninguna", () => {
    expect(pendingFlight([{ role: "user", content: "hola" }])).toBeNull();
  });
});

describe("proposalSummary", () => {
  const proposal = {
    date: "2026-08-06",
    route: "SADF SADM",
    takeoff: "14:00",
    landing: "15:30",
    duration: 1.5,
    landings: 2,
    purpose: "VP",
    pic_day_loc: 1.5,
  };

  it("muestra lo que se va a escribir, para que el piloto confirme eso y no otra cosa", () => {
    const text = proposalSummary(proposal, "LV-S153");
    for (const dato of ["LV-S153", "2026-08-06", "SADF SADM", "14:00", "15:30", "1.5", "VP"]) {
      expect(text, dato).toContain(dato);
    }
  });

  it("avisa cuando el desglose viene vacío en vez de ocultarlo", () => {
    const { pic_day_loc, ...sinDesglose } = proposal;
    expect(proposalSummary(sinDesglose, "LV-S153")).toContain("sin asignar");
  });

  it("nombra el libro sólo cuando el piloto eligió uno", () => {
    expect(proposalSummary(proposal, "LV-S153", "Instrucción")).toContain("Instrucción");
    expect(proposalSummary(proposal, "LV-S153")).not.toContain("*Libro:*");
  });
});
