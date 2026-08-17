import { describe, expect, it } from "vitest";
import {
  CERO,
  aDecimal,
  desdeDecimal,
  esPositivo,
  formatearPesos,
  parsearPesos,
  periodosParaCubrir,
  restar,
  restarSinBajarDeCero,
  sumar,
} from "@/lib/dinero";

describe("parsearPesos", () => {
  it("acepta enteros y decimales simples", () => {
    expect(parsearPesos("3000000000")).toBe(300000000000n);
    expect(parsearPesos("3000000000.50")).toBe(300000000050n);
    expect(parsearPesos("0.05")).toBe(5n);
  });

  it("acepta formato colombiano con separador de miles y coma decimal", () => {
    expect(parsearPesos("3.000.000.000,50")).toBe(300000000050n);
    expect(parsearPesos("$ 3.000.000.000,50")).toBe(300000000050n);
  });

  it("completa un solo decimal a centavos", () => {
    expect(parsearPesos("1,5")).toBe(150n);
  });

  it("rechaza montos invalidos en vez de devolver cero", () => {
    expect(() => parsearPesos("")).toThrow();
    expect(() => parsearPesos("abc")).toThrow();
    expect(() => parsearPesos("1.234.5")).toThrow();
    expect(() => parsearPesos("10.999")).toThrow();
  });
});

describe("precision", () => {
  it("no pierde un centavo sumando montos grandes muchas veces", () => {
    const unCentavo = parsearPesos("0.01");
    let total = CERO;
    for (let i = 0; i < 100_000; i++) total = sumar(total, unCentavo);
    expect(total).toBe(parsearPesos("1000"));
  });

  it("mantiene exactitud donde el punto flotante falla", () => {
    // 0.1 + 0.2 !== 0.3 en punto flotante.
    expect(sumar(parsearPesos("0.10"), parsearPesos("0.20"))).toBe(parsearPesos("0.30"));
  });

  it("sobrevive a montos del orden del billon de pesos", () => {
    const billon = parsearPesos("1000000000000.00");
    expect(aDecimal(sumar(billon, parsearPesos("0.01")))).toBe("1000000000000.01");
  });

  it("hace ida y vuelta contra una columna Decimal sin perder valor", () => {
    const original = parsearPesos("3000000000.07");
    expect(desdeDecimal({ toString: () => aDecimal(original) })).toBe(original);
  });
});

describe("formato", () => {
  it("usa la convencion colombiana", () => {
    expect(formatearPesos(parsearPesos("3000000000.5"))).toBe("$ 3.000.000.000,50");
    expect(formatearPesos(parsearPesos("999"))).toBe("$ 999,00");
    expect(formatearPesos(CERO)).toBe("$ 0,00");
  });

  it("conserva el signo negativo", () => {
    expect(formatearPesos(parsearPesos("-1500.25"))).toBe("-$ 1.500,25");
    expect(aDecimal(parsearPesos("-1500.25"))).toBe("-1500.25");
  });
});

describe("brecha", () => {
  it("resta normalmente", () => {
    expect(restar(parsearPesos("3000"), parsearPesos("200"))).toBe(parsearPesos("2800"));
  });

  it("no deja la brecha en negativo cuando los aportes superan el costo", () => {
    expect(restarSinBajarDeCero(parsearPesos("3000"), parsearPesos("3500"))).toBe(CERO);
  });

  it("reconoce montos positivos", () => {
    expect(esPositivo(parsearPesos("0.01"))).toBe(true);
    expect(esPositivo(CERO)).toBe(false);
  });
});

describe("periodosParaCubrir", () => {
  it("redondea hacia arriba: un año parcial es un año", () => {
    // Brecha de 2.800 millones con capacidad de 500 millones al año.
    const años = periodosParaCubrir(parsearPesos("2800000000"), parsearPesos("500000000"));
    expect(años).toBe(6);
  });

  it("da el numero exacto cuando la division es justa", () => {
    expect(periodosParaCubrir(parsearPesos("1500"), parsearPesos("500"))).toBe(3);
  });

  it("una brecha ya cubierta no necesita periodos", () => {
    expect(periodosParaCubrir(CERO, parsearPesos("500"))).toBe(0);
    expect(periodosParaCubrir(parsearPesos("-10"), parsearPesos("500"))).toBe(0);
  });

  it("devuelve null sin capacidad, en vez de un numero engañoso", () => {
    expect(periodosParaCubrir(parsearPesos("1000"), CERO)).toBeNull();
  });
});
