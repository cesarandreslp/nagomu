import { describe, expect, it } from "vitest";
import type { CategoriaItem } from "@/lib/generated/prisma/enums";
import { PESOS, calcularPuntaje, nivelDe, priorizar, type Priorizable } from "@/lib/prioridad";

const FECHA = new Date("2026-08-01T00:00:00Z");

function obra(parcial: Partial<Priorizable> & { id: string; categoria: CategoriaItem }): Priorizable {
  return {
    personasBeneficiadas: 100,
    mesesFueraDeServicio: 0,
    nbi: null,
    costoPorBeneficiado: null,
    creadoEn: FECHA,
    ...parcial,
  };
}

describe("nivel por categoria", () => {
  it("mapea cada categoria a su nivel", () => {
    expect(nivelDe("MITIGACION_RIESGO")).toBe(1);
    expect(nivelDe("ESTRUCTURA_EN_RIESGO")).toBe(1);
    expect(nivelDe("SALUD")).toBe(2);
    expect(nivelDe("EDUCACION")).toBe(3);
    expect(nivelDe("PRODUCTIVO")).toBe(4);
    expect(nivelDe("CULTURAL")).toBe(5);
  });
});

describe("el nivel manda sobre el puntaje", () => {
  it("el muro de contencion va antes que la escuela, y la escuela antes que el teatro", () => {
    const orden = priorizar([
      obra({ id: "teatro", categoria: "CULTURAL", personasBeneficiadas: 5000 }),
      obra({ id: "escuela", categoria: "EDUCACION", personasBeneficiadas: 800 }),
      obra({ id: "muro", categoria: "MITIGACION_RIESGO", personasBeneficiadas: 300 }),
    ]);

    expect(orden.map((o) => o.id)).toEqual(["muro", "escuela", "teatro"]);
  });

  it("el teatro no adelanta a la escuela ni beneficiando a cien veces mas gente", () => {
    const orden = priorizar([
      obra({ id: "teatro", categoria: "CULTURAL", personasBeneficiadas: 100000 }),
      obra({ id: "escuela", categoria: "EDUCACION", personasBeneficiadas: 1 }),
    ]);

    expect(orden[0]!.id).toBe("escuela");
  });
});

describe("puntaje dentro de un nivel", () => {
  it("ordena por personas beneficiadas cuando todo lo demas es igual", () => {
    const orden = priorizar([
      obra({ id: "pequena", categoria: "EDUCACION", personasBeneficiadas: 120 }),
      obra({ id: "grande", categoria: "EDUCACION", personasBeneficiadas: 800 }),
    ]);

    expect(orden.map((o) => o.id)).toEqual(["grande", "pequena"]);
  });

  it("la vulnerabilidad del municipio pesa: Sipi adelanta a Buga con menos gente", () => {
    const orden = priorizar([
      obra({ id: "buga", categoria: "EDUCACION", personasBeneficiadas: 700, nbi: 12.5 }),
      obra({ id: "sipi", categoria: "EDUCACION", personasBeneficiadas: 500, nbi: 78.9 }),
    ]);

    expect(orden[0]!.id).toBe("sipi");
  });

  it("el tiempo sin servicio pesa", () => {
    const orden = priorizar([
      obra({ id: "reciente", categoria: "EDUCACION", personasBeneficiadas: 500 }),
      obra({
        id: "antigua",
        categoria: "EDUCACION",
        personasBeneficiadas: 400,
        mesesFueraDeServicio: 24,
      }),
    ]);

    expect(orden[0]!.id).toBe("antigua");
  });

  it("el factor de tiempo tiene tope, para que la antiguedad no desplace a la urgencia", () => {
    const diezAnios = calcularPuntaje({
      categoria: "EDUCACION",
      personasBeneficiadas: 100,
      mesesFueraDeServicio: 120,
      nbi: null,
    });

    expect(diezAnios.factores.factorTiempo).toBe(PESOS.topeTiempo);
  });
});

describe("datos faltantes", () => {
  it("sin personas beneficiadas queda incompleta y al final de su nivel, no fuera", () => {
    const orden = priorizar([
      obra({ id: "sin-dato", categoria: "EDUCACION", personasBeneficiadas: null }),
      obra({ id: "con-dato", categoria: "EDUCACION", personasBeneficiadas: 10 }),
      obra({ id: "muro", categoria: "MITIGACION_RIESGO", personasBeneficiadas: 5 }),
    ]);

    expect(orden.map((o) => o.id)).toEqual(["muro", "con-dato", "sin-dato"]);
    expect(orden[2]!.puntaje.incompleto).toBe(true);
    expect(orden[2]!.puntaje.valor).toBeNull();
  });

  it("sin NBI el factor de vulnerabilidad es neutro", () => {
    const p = calcularPuntaje({
      categoria: "EDUCACION",
      personasBeneficiadas: 100,
      mesesFueraDeServicio: 0,
      nbi: null,
    });

    expect(p.factores.factorVulnerabilidad).toBe(1);
    expect(p.valor).toBe(100);
  });
});

describe("desempate", () => {
  it("con puntajes iguales gana el menor costo por beneficiado", () => {
    const orden = priorizar([
      obra({ id: "cara", categoria: "EDUCACION", costoPorBeneficiado: 900 }),
      obra({ id: "barata", categoria: "EDUCACION", costoPorBeneficiado: 300 }),
    ]);

    expect(orden.map((o) => o.id)).toEqual(["barata", "cara"]);
  });

  it("es determinista: el mismo conjunto da el mismo orden siempre", () => {
    const items = [
      obra({ id: "b", categoria: "EDUCACION", creadoEn: new Date("2026-08-02T00:00:00Z") }),
      obra({ id: "a", categoria: "EDUCACION", creadoEn: new Date("2026-08-01T00:00:00Z") }),
      obra({ id: "c", categoria: "EDUCACION", creadoEn: new Date("2026-08-03T00:00:00Z") }),
    ];

    const primera = priorizar(items).map((o) => o.id);
    const segunda = priorizar([...items].reverse()).map((o) => o.id);

    expect(primera).toEqual(["a", "b", "c"]);
    expect(segunda).toEqual(primera);
  });
});

describe("reproducibilidad a mano", () => {
  it("expone cada factor con su valor, no solo el resultado", () => {
    const p = calcularPuntaje({
      categoria: "EDUCACION",
      personasBeneficiadas: 500,
      mesesFueraDeServicio: 6,
      nbi: 78.9,
    });

    // 500 x (1 + 0,789) x (1 + 6/12) = 500 x 1,789 x 1,5 = 1341,75
    expect(p.factores.factorVulnerabilidad).toBeCloseTo(1.789, 3);
    expect(p.factores.factorTiempo).toBeCloseTo(1.5, 3);
    expect(p.valor).toBeCloseTo(1341.75, 2);
    expect(p.nivel).toBe(3);
    expect(p.ods).toContain("ODS 4");
  });
});
