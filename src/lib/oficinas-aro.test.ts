import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { oficinaParaSalida, parsearOficinas, primerTelefono, type OficinaUbicada } from "./oficinas-aro";

/**
 * La tabla de oficinas contra el texto de la AIC A 19/2026, **en los dos sentidos**, como
 * el AIP (invariante 12): cada correo y cada teléfono de la tabla aparece en la AIC, y
 * cada oficina de la AIC está en la tabla. Un mail mal tipeado manda el plan de vuelo a
 * ninguna parte, y el piloto cree que lo presentó.
 */
const RAIZ = process.cwd();
const aic = fs.readFileSync(path.join(RAIZ, "src", "data", "aic-oficinas-aro.txt"), "utf8");
const oficinas = parsearOficinas(fs.readFileSync(path.join(RAIZ, "src", "data", "oficinas-aro.tsv"), "utf8"));

describe("oficinas ARO/AIS contra la AIC A 19/2026", () => {
  it("cada fila de la tabla está en la AIC, con su indicativo AFTN y su correo en la misma línea", () => {
    for (const o of oficinas) {
      expect(aic, o.oaci).toContain(`${o.oaci} ${o.aftn} ${o.correo}`);
    }
  });

  it("cada oficina de la AIC está en la tabla", () => {
    const enLaAic = [...aic.matchAll(/^(SA[A-Z]{2}) SA[A-Z]{2}ZPZX [a-z]+@eana\.com\.ar/gm)].map((m) => m[1]);
    expect(enLaAic).toHaveLength(49);
    expect(oficinas.map((o) => o.oaci).sort()).toEqual([...enLaAic].sort());
  });

  it("los teléfonos salen de la AIC", () => {
    const sinEspacios = aic.replace(/\s+/g, "");
    for (const o of oficinas) {
      expect(sinEspacios, o.oaci).toContain(o.telefonos.replace(/\s+/g, ""));
    }
  });

  it("todas tienen un teléfono que se puede marcar", () => {
    for (const o of oficinas) expect(primerTelefono(o.telefonos), o.oaci).not.toBeNull();
  });
});

describe("primerTelefono", () => {
  it("lleva cada forma de la AIC a +54", () => {
    expect(primerTelefono("(+54 11) 45800261")?.marcar).toBe("+541145800261");
    expect(primerTelefono("(54 341) 4513202 - INT / EXT 1120")?.marcar).toBe("+543414513202");
    expect(primerTelefono("(+54 011) 44802444")?.marcar).toBe("+541144802444");
    expect(primerTelefono("(+54 9 351) 2921338")?.marcar).toBe("+5493512921338");
    expect(primerTelefono("Conmutador/Switch (+54 362) 4436291/2/3")?.marcar).toBe("+543624436291");
    expect(primerTelefono("llamar a la torre")).toBeNull();
  });
});

describe("oficinaParaSalida", () => {
  const ubicadas: OficinaUbicada[] = [
    { oaci: "SADF", aftn: "SADFZPZX", correo: "acfdo@eana.com.ar", telefonos: "", fir: "Ezeiza", nombre: "San Fernando", lat: -34.4532, lon: -58.5896 },
    { oaci: "SADM", aftn: "SADMZPZX", correo: "acmor@eana.com.ar", telefonos: "", fir: "Ezeiza", nombre: "Morón", lat: -34.6763, lon: -58.6428 },
    { oaci: "SAZS", aftn: "SAZSZPZX", correo: "acbar@eana.com.ar", telefonos: "", fir: "Ezeiza", nombre: "Bariloche", lat: -41.151, lon: -71.1575 },
  ];

  it("la del aeródromo de salida, si tiene", () => {
    expect(oficinaParaSalida({ codigo: "sadm" }, ubicadas)).toMatchObject({ propia: true, oficina: { oaci: "SADM" } });
  });

  it("si no, la más cercana", () => {
    // Cañuelas: más cerca de Morón que de San Fernando.
    const r = oficinaParaSalida({ codigo: "CNL", lat: -35.0, lon: -58.75 }, ubicadas);
    expect(r).toMatchObject({ propia: false, oficina: { oaci: "SADM" } });
    expect(r?.distanciaNm).toBeGreaterThan(15);
  });

  it("sin oficina y sin coordenadas no adivina", () => {
    expect(oficinaParaSalida({ codigo: "XYZ" }, ubicadas)).toBeNull();
  });
});
