import { describe, expect, it } from "vitest";
import { firmaBaja, firmaValida, linksDeBaja } from "./baja-mail";

describe("baja del resumen mensual", () => {
  const secreto = "s3cr3to";

  it("la firma de una cuenta vale para esa cuenta y no para otra", () => {
    const t = firmaBaja("u1", secreto);
    expect(firmaValida("u1", t, secreto)).toBe(true);
    expect(firmaValida("u2", t, secreto)).toBe(false);
  });

  it("no vale con otro secreto, vacía o recortada", () => {
    const t = firmaBaja("u1", secreto);
    expect(firmaValida("u1", t, "otro")).toBe(false);
    expect(firmaValida("u1", "", secreto)).toBe(false);
    expect(firmaValida("u1", t.slice(1), secreto)).toBe(false);
    expect(firmaValida("u1", t, "")).toBe(false);
  });

  it("los links llevan la cuenta y la firma, listos para una URL", () => {
    const { pagina, unClick } = linksDeBaja("https://v.ar", "u1", secreto);
    const u = new URL(pagina);
    expect(u.pathname).toBe("/mail/baja");
    expect(firmaValida(u.searchParams.get("u")!, u.searchParams.get("t")!, secreto)).toBe(true);
    expect(new URL(unClick).pathname).toBe("/api/mail/baja");
  });
});
