import { describe, expect, it } from "vitest";
import { parsearPesos } from "@/lib/dinero";
import {
  APORTE_DE_REFERENCIA,
  leerReferencia,
  ordenarPorImpacto,
  ordenarPorPrioridad,
  type ObraConsolidada,
} from "@/lib/departamento";

const obra = (parcial: Partial<ObraConsolidada> & { id: string }): ObraConsolidada => ({
  nombre: parcial.id,
  municipio: "Buga",
  municipioId: "m1",
  nivel: 3,
  puntaje: 100,
  incompleto: false,
  estado: "COSTEADO",
  costo: parsearPesos("1000"),
  brecha: parsearPesos("1000"),
  anioInicio: 0,
  anioCierre: 1,
  cubierta: false,
  obrasAdelantadas: 0,
  aniosAhorrados: 0,
  sinCapacidad: false,
  ...parcial,
});

describe("orden por prioridad", () => {
  it("el nivel manda, tambien entre municipios distintos", () => {
    const orden = ordenarPorPrioridad([
      obra({ id: "teatro-cali", nivel: 5, puntaje: 90000, municipio: "Cali" }),
      obra({ id: "escuela-sipi", nivel: 3, puntaje: 200, municipio: "Sipi" }),
      obra({ id: "muro-sipi", nivel: 1, puntaje: 50, municipio: "Sipi" }),
    ]);

    expect(orden.map((o) => o.id)).toEqual(["muro-sipi", "escuela-sipi", "teatro-cali"]);
  });

  it("dentro del nivel gana el puntaje mas alto", () => {
    const orden = ordenarPorPrioridad([
      obra({ id: "chica", puntaje: 100 }),
      obra({ id: "grande", puntaje: 900 }),
    ]);

    expect(orden[0]!.id).toBe("grande");
  });

  it("las de puntaje incompleto van al final de su nivel", () => {
    const orden = ordenarPorPrioridad([
      obra({ id: "sin-dato", puntaje: null, incompleto: true }),
      obra({ id: "con-dato", puntaje: 10 }),
    ]);

    expect(orden.map((o) => o.id)).toEqual(["con-dato", "sin-dato"]);
  });
});

describe("orden por impacto", () => {
  it("primero donde el mismo aporte ahorra mas años", () => {
    const orden = ordenarPorImpacto([
      obra({ id: "poco", aniosAhorrados: 1 }),
      obra({ id: "mucho", aniosAhorrados: 7 }),
      obra({ id: "nada", aniosAhorrados: 0 }),
    ]);

    expect(orden.map((o) => o.id)).toEqual(["mucho", "poco", "nada"]);
  });

  it("con igual ahorro gana la que adelanta mas obras", () => {
    const orden = ordenarPorImpacto([
      obra({ id: "una", aniosAhorrados: 3, obrasAdelantadas: 1 }),
      obra({ id: "varias", aniosAhorrados: 3, obrasAdelantadas: 4 }),
    ]);

    expect(orden[0]!.id).toBe("varias");
  });

  it("con todo igual desempata la prioridad: entre dos iguales gana la mas urgente", () => {
    const orden = ordenarPorImpacto([
      obra({ id: "teatro", nivel: 5, aniosAhorrados: 2, obrasAdelantadas: 1 }),
      obra({ id: "muro", nivel: 1, aniosAhorrados: 2, obrasAdelantadas: 1 }),
    ]);

    expect(orden[0]!.id).toBe("muro");
  });

  it("no es el mismo orden que por prioridad: son preguntas distintas", () => {
    const obras = [
      obra({ id: "muro", nivel: 1, aniosAhorrados: 1 }),
      obra({ id: "teatro", nivel: 5, aniosAhorrados: 9 }),
    ];

    expect(ordenarPorPrioridad(obras)[0]!.id).toBe("muro");
    expect(ordenarPorImpacto(obras)[0]!.id).toBe("teatro");
  });
});

describe("aporte de referencia", () => {
  it("usa el valor por defecto si no viene nada o viene basura", () => {
    expect(leerReferencia(undefined)).toBe(APORTE_DE_REFERENCIA);
    expect(leerReferencia("")).toBe(APORTE_DE_REFERENCIA);
    expect(leerReferencia("abc")).toBe(APORTE_DE_REFERENCIA);
    expect(leerReferencia("0")).toBe(APORTE_DE_REFERENCIA);
    expect(leerReferencia("-500")).toBe(APORTE_DE_REFERENCIA);
  });

  it("acepta un monto valido", () => {
    expect(leerReferencia("2000000000")).toBe(parsearPesos("2000000000"));
  });
});
