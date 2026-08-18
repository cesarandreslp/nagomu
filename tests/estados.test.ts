import { describe, expect, it } from "vitest";
import {
  SECUENCIA,
  puedeTransicionar,
  siguienteEstado,
  tieneCifrasDeDinero,
  situacionFinanciacion,
} from "@/lib/estados";
import { CERO } from "@/lib/dinero";
import type { Brecha } from "@/lib/brecha";

const CON_COSTO = { tieneCosto: true };
const SIN_COSTO = { tieneCosto: false };

describe("secuencia", () => {
  it("va de identificado a entregada sin atajos", () => {
    expect(SECUENCIA).toEqual([
      "IDENTIFICADO",
      "EN_ESTUDIOS",
      "COSTEADO",
      "EN_EJECUCION",
      "ENTREGADA",
    ]);
  });

  it("cada estado conoce el que sigue, y el ultimo no tiene siguiente", () => {
    expect(siguienteEstado("IDENTIFICADO")).toBe("EN_ESTUDIOS");
    expect(siguienteEstado("EN_EJECUCION")).toBe("ENTREGADA");
    expect(siguienteEstado("ENTREGADA")).toBeNull();
  });
});

describe("transiciones validas", () => {
  it("avanza un paso por vez", () => {
    expect(puedeTransicionar("IDENTIFICADO", "EN_ESTUDIOS", SIN_COSTO).valida).toBe(true);
    expect(puedeTransicionar("EN_ESTUDIOS", "COSTEADO", CON_COSTO).valida).toBe(true);
    expect(puedeTransicionar("COSTEADO", "EN_EJECUCION", CON_COSTO).valida).toBe(true);
    expect(puedeTransicionar("EN_EJECUCION", "ENTREGADA", CON_COSTO).valida).toBe(true);
  });
});

describe("transiciones rechazadas", () => {
  it("no se salta la etapa de estudios", () => {
    const r = puedeTransicionar("IDENTIFICADO", "COSTEADO", CON_COSTO);
    expect(r.valida).toBe(false);
    if (!r.valida) expect(r.motivo).toContain("En estudios");
  });

  it("no se salta directo a ejecucion", () => {
    expect(puedeTransicionar("IDENTIFICADO", "EN_EJECUCION", CON_COSTO).valida).toBe(false);
    expect(puedeTransicionar("EN_ESTUDIOS", "EN_EJECUCION", CON_COSTO).valida).toBe(false);
  });

  it("no se puede entregar una obra recien identificada", () => {
    expect(puedeTransicionar("IDENTIFICADO", "ENTREGADA", CON_COSTO).valida).toBe(false);
  });

  it("no se retrocede", () => {
    const r = puedeTransicionar("COSTEADO", "EN_ESTUDIOS", CON_COSTO);
    expect(r.valida).toBe(false);
    if (!r.valida) expect(r.motivo).toContain("No se puede volver");
  });

  it("no se transiciona al mismo estado", () => {
    expect(puedeTransicionar("COSTEADO", "COSTEADO", CON_COSTO).valida).toBe(false);
  });
});

describe("costeado exige el valor del estudio", () => {
  it("sin costo registrado no se puede pasar a costeado", () => {
    const r = puedeTransicionar("EN_ESTUDIOS", "COSTEADO", SIN_COSTO);
    expect(r.valida).toBe(false);
    if (!r.valida) expect(r.motivo).toContain("estudio");
  });

  it("con costo registrado si", () => {
    expect(puedeTransicionar("EN_ESTUDIOS", "COSTEADO", CON_COSTO).valida).toBe(true);
  });
});

describe("cuando aparecen las cifras de dinero", () => {
  it("antes de costeado no hay brecha ni plazos que mostrar", () => {
    expect(tieneCifrasDeDinero("IDENTIFICADO")).toBe(false);
    expect(tieneCifrasDeDinero("EN_ESTUDIOS")).toBe(false);
  });

  it("desde costeado en adelante si", () => {
    expect(tieneCifrasDeDinero("COSTEADO")).toBe(true);
    expect(tieneCifrasDeDinero("EN_EJECUCION")).toBe(true);
    expect(tieneCifrasDeDinero("ENTREGADA")).toBe(true);
  });
});

describe("situacion de financiacion (spec 005)", () => {
  const brecha = (p: Partial<Brecha>): Brecha => ({
    costo: 1000n,
    girado: CERO,
    comprometido: CERO,
    brecha: 1000n,
    brechaSinPromesas: 1000n,
    excedente: CERO,
    ...p,
  });

  it("sin costo, pendiente de estudios", () => {
    expect(situacionFinanciacion(brecha({ costo: null }))).toBe("PENDIENTE_ESTUDIOS");
  });

  it("con costo y nada aportado, sin financiar", () => {
    expect(situacionFinanciacion(brecha({ girado: CERO, comprometido: CERO, brecha: 1000n }))).toBe(
      "SIN_FINANCIAR",
    );
  });

  it("aportado algo pero falta, parcial", () => {
    expect(
      situacionFinanciacion(brecha({ girado: 400n, comprometido: CERO, brecha: 600n })),
    ).toBe("PARCIAL");
  });

  it("brecha en cero, financiada (aunque sea con promesas)", () => {
    expect(
      situacionFinanciacion(brecha({ girado: CERO, comprometido: 1000n, brecha: CERO })),
    ).toBe("FINANCIADA");
  });
});
