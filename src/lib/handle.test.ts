import { describe, expect, it } from "vitest";
import { conArroba, normalizarHandle, problemaDelHandle, rutaPerfil, urlPerfil } from "./handle";

/**
 * Los mismos casos que `test_social.py` del backend. Si un lado acepta lo que el otro
 * rechaza, el piloto se entera recién al guardar.
 */
describe("problemaDelHandle", () => {
  it.each(["fede.dn", "piloto_01", "abc", "a".repeat(20), "  @Fede.DN "])("acepta %j", (h) => {
    expect(problemaDelHandle(h)).toBeNull();
  });

  it.each([
    ["ab", "al menos 3"],
    ["a".repeat(21), "como mucho 20"],
    ["fedé", "sin acento"],
    ["fe de", "sin acento"],
    ["fe-de", "sin acento"],
    ["_fede", "empezar y terminar"],
    ["fede.", "empezar y terminar"],
    ["fe..de", "dos puntos"],
    ["vector", "reservado"],
    ["@ANAC", "reservado"],
    ["", "al menos 3"],
  ])("rechaza %j", (h, motivo) => {
    expect(problemaDelHandle(h)).toContain(motivo);
  });
});

describe("cómo se muestra y adónde lleva", () => {
  it("normaliza igual que el backend", () => {
    expect(normalizarHandle("  @@Fede.DN ")).toBe("fede.dn");
    expect(normalizarHandle(undefined)).toBe("");
  });

  it("en la interfaz lleva arroba", () => {
    expect(conArroba("Fede.DN")).toBe("@fede.dn");
    expect(conArroba("@fede")).toBe("@fede");
  });

  it("en la URL va sin arroba, bajo /u", () => {
    expect(rutaPerfil("@Fede.DN")).toBe("/u/fede.dn");
    expect(urlPerfil("fede", "https://vector.fdiaznem.com.ar/")).toBe("https://vector.fdiaznem.com.ar/u/fede");
  });
});
