import { afterEach, describe, expect, it } from "vitest";
import { remitente } from "./mailer";

/**
 * El remitente del briefing.
 *
 * `enviarMail` no se testea acá —pega contra Resend—, pero **de qué dirección sale el mail
 * sí es una decisión propia**, y es la que un dominio nuevo hace equivocar: se configura una
 * variable, no se ve nada hasta el día siguiente a las seis de la tarde, y si estaba mal el
 * mail salió del remitente de prueba sin que nadie se entere.
 */

const original = process.env.RESEND_FROM;
afterEach(() => {
  if (original === undefined) delete process.env.RESEND_FROM;
  else process.env.RESEND_FROM = original;
});

describe("remitente", () => {
  it("sin configurar usa el de prueba y no se queja", () => {
    delete process.env.RESEND_FROM;
    expect(remitente()).toEqual({ from: "Vector <onboarding@resend.dev>" });
  });

  it("una dirección configurada se usa tal cual", () => {
    process.env.RESEND_FROM = "Vector <briefing@vector.fdiaznem.com.ar>";
    expect(remitente()).toEqual({ from: "Vector <briefing@vector.fdiaznem.com.ar>" });
  });

  it("una casilla pelada también sirve: Resend acepta las dos formas", () => {
    process.env.RESEND_FROM = "briefing@vector.fdiaznem.com.ar";
    expect(remitente().from).toBe("briefing@vector.fdiaznem.com.ar");
    expect(remitente().aviso).toBeUndefined();
  });

  it("**el dominio pelado avisa, que es el error fácil de cometer**", () => {
    /*
      Verificar `vector.fdiaznem.com.ar` en Resend y después poner eso mismo como remitente
      es el paso en falso natural. Sin arroba no es una dirección: Resend contestaría 422 y
      el motivo quedaría enterrado en el log del barrido del día siguiente.
    */
    process.env.RESEND_FROM = "vector.fdiaznem.com.ar";
    const r = remitente();
    expect(r.from).toBe("Vector <onboarding@resend.dev>");
    expect(r.aviso).toContain("vector.fdiaznem.com.ar");
    expect(r.aviso).toContain("casilla");
  });

  it("vacío o en blanco es lo mismo que no configurado", () => {
    process.env.RESEND_FROM = "   ";
    expect(remitente()).toEqual({ from: "Vector <onboarding@resend.dev>" });
  });
});
