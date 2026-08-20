import { describe, expect, it } from "vitest";
import {
  clasificarOferta,
  evaluarElegibilidad,
  type OfertaEvaluable,
  type SituacionHogar,
} from "@/lib/elegibilidad";

/**
 * La regla de elegibilidad es publica y auditable (spec 009), como la de prioridad. Estas
 * pruebas fijan dos cosas: que decide, y —tan importante— que **muestre por que**. Un
 * veredicto sin factores es una opinion; con factores es una regla que una familia puede
 * reclamar y un concejal puede recalcular.
 */

const HOGAR: SituacionHogar = {
  personasTotal: 4,
  ninez: 0,
  adultoMayor: 0,
  discapacidad: 0,
  heridos: 0,
  fallecidos: 0,
  autorizado: true,
  necesidadesSalud: 0,
  inmueble: { estadoAfectacion: "REPARABLE", sector: "VIVIENDA" },
  yaRecibio: [],
};

const OFERTA: OfertaEvaluable = {
  tipo: "ALIMENTACION_Y_KITS",
  destinatario: "HOGAR",
  estado: "VIGENTE",
  requiereRud: true,
};

describe("compuertas que valen para toda la oferta", () => {
  it("lo anunciado sin reglamentar no se puede tramitar", () => {
    const v = evaluarElegibilidad(HOGAR, { ...OFERTA, estado: "ANUNCIADO" });
    expect(v.elegible).toBe(false);
    expect(v.motivo).toContain("fila que no existe");
  });

  it("una ayuda para empresas no se le asigna a un hogar", () => {
    const v = evaluarElegibilidad(HOGAR, { ...OFERTA, destinatario: "EMPRESA" });
    expect(v.elegible).toBe(false);
  });

  it("no se cuenta dos veces la misma ayuda", () => {
    const v = evaluarElegibilidad({ ...HOGAR, yaRecibio: ["ALIMENTACION_Y_KITS"] }, OFERTA);
    expect(v.elegible).toBe(false);
    expect(v.motivo).toContain("ya recibio");
  });

  it("estar caracterizado por el municipio satisface el registro: no hay que inscribirse otra vez", () => {
    const v = evaluarElegibilidad(HOGAR, { ...OFERTA, requiereRud: true });
    const registro = v.factores.find((f) => f.nombre.includes("registro"));
    expect(registro?.cumple).toBe(true);
    expect(registro?.porque).toContain("sin volver a inscribirse");
    expect(v.elegible).toBe(true);
  });
});

describe("condicion propia de cada tipo", () => {
  it("techo inmediato: cuando el inmueble quedo inhabitable", () => {
    const perdido: SituacionHogar = {
      ...HOGAR,
      inmueble: { estadoAfectacion: "PERDIDO", sector: "VIVIENDA" },
    };
    expect(evaluarElegibilidad(perdido, { ...OFERTA, tipo: "ALOJAMIENTO_TEMPORAL" }).elegible).toBe(
      true,
    );
    // Reparable no da techo de emergencia: la casa se puede volver a habitar.
    expect(evaluarElegibilidad(HOGAR, { ...OFERTA, tipo: "ALOJAMIENTO_TEMPORAL" }).elegible).toBe(
      false,
    );
  });

  it("techo inmediato tambien cuando no se sabe donde vive", () => {
    const sinInmueble: SituacionHogar = { ...HOGAR, inmueble: null };
    expect(
      evaluarElegibilidad(sinInmueble, { ...OFERTA, tipo: "ALOJAMIENTO_TEMPORAL" }).elegible,
    ).toBe(true);
  });

  it("salud: con necesidad categorizada o con heridos, no por tener casa dañada", () => {
    expect(evaluarElegibilidad(HOGAR, { ...OFERTA, tipo: "SALUD" }).elegible).toBe(false);
    expect(
      evaluarElegibilidad({ ...HOGAR, necesidadesSalud: 1 }, { ...OFERTA, tipo: "SALUD" }).elegible,
    ).toBe(true);
    expect(
      evaluarElegibilidad({ ...HOGAR, heridos: 2 }, { ...OFERTA, tipo: "SALUD" }).elegible,
    ).toBe(true);
  });

  it("indemnizacion: responde a las personas, no al inmueble", () => {
    const casaPerdida: SituacionHogar = {
      ...HOGAR,
      inmueble: { estadoAfectacion: "PERDIDO", sector: "VIVIENDA" },
    };
    expect(evaluarElegibilidad(casaPerdida, { ...OFERTA, tipo: "INDEMNIZACION" }).elegible).toBe(
      false,
    );
    expect(
      evaluarElegibilidad({ ...HOGAR, fallecidos: 1 }, { ...OFERTA, tipo: "INDEMNIZACION" })
        .elegible,
    ).toBe(true);
  });

  it("niñez y familia: solo si hay menores", () => {
    expect(evaluarElegibilidad(HOGAR, { ...OFERTA, tipo: "NIÑEZ_Y_FAMILIA" }).elegible).toBe(false);
    expect(
      evaluarElegibilidad({ ...HOGAR, ninez: 2 }, { ...OFERTA, tipo: "NIÑEZ_Y_FAMILIA" }).elegible,
    ).toBe(true);
  });

  it("empleo e ingresos: cuando el bien afectado era el sustento", () => {
    const cultivo: SituacionHogar = {
      ...HOGAR,
      inmueble: { estadoAfectacion: "PERDIDO", sector: "AGROPECUARIO" },
    };
    expect(evaluarElegibilidad(cultivo, { ...OFERTA, tipo: "EMPLEO_E_INGRESOS" }).elegible).toBe(
      true,
    );
    expect(evaluarElegibilidad(HOGAR, { ...OFERTA, tipo: "EMPLEO_E_INGRESOS" }).elegible).toBe(
      false,
    );
  });

  it("evaluacion tecnica: cuando falta saber si se puede volver", () => {
    const sinDefinir: SituacionHogar = {
      ...HOGAR,
      inmueble: { estadoAfectacion: null, sector: "VIVIENDA" },
    };
    expect(
      evaluarElegibilidad(sinDefinir, { ...OFERTA, tipo: "EVALUACION_TECNICA" }).elegible,
    ).toBe(true);
    const perdido: SituacionHogar = {
      ...HOGAR,
      inmueble: { estadoAfectacion: "PERDIDO", sector: "VIVIENDA" },
    };
    // Lo que ya se perdio no necesita que un tecnico diga si es habitable.
    expect(evaluarElegibilidad(perdido, { ...OFERTA, tipo: "EVALUACION_TECNICA" }).elegible).toBe(
      false,
    );
  });

  it("las medidas generales alcanzan a cualquier hogar damnificado", () => {
    for (const tipo of [
      "ALIMENTACION_Y_KITS",
      "SERVICIOS_PUBLICOS",
      "ALIVIO_TRIBUTARIO",
    ] as const) {
      expect(evaluarElegibilidad(HOGAR, { ...OFERTA, tipo }).elegible).toBe(true);
    }
  });
});

describe("cada veredicto se puede explicar", () => {
  it("siempre trae factores, cumpla o no", () => {
    const si = evaluarElegibilidad(HOGAR, OFERTA);
    const no = evaluarElegibilidad(HOGAR, { ...OFERTA, tipo: "SALUD" });

    for (const v of [si, no]) {
      expect(v.factores.length).toBeGreaterThanOrEqual(5);
      expect(v.factores.every((f) => f.porque.length > 0)).toBe(true);
      expect(v.motivo.length).toBeGreaterThan(0);
    }
  });
});

describe("clasificarOferta", () => {
  const catalogo: OfertaEvaluable[] = [
    { tipo: "ALIMENTACION_Y_KITS", destinatario: "HOGAR", estado: "VIGENTE", requiereRud: true },
    { tipo: "SALUD", destinatario: "HOGAR", estado: "VIGENTE", requiereRud: false },
    { tipo: "VIVIENDA", destinatario: "HOGAR", estado: "ANUNCIADO", requiereRud: true },
  ];

  it("separa lo que corresponde de lo que no, sin esconder lo descartado", () => {
    const { corresponden, noCorresponden } = clasificarOferta(HOGAR, catalogo);

    expect(corresponden.map((c) => c.oferta.tipo)).toEqual(["ALIMENTACION_Y_KITS"]);
    expect(noCorresponden).toHaveLength(2);
    // Lo descartado conserva su motivo: es lo que permite reclamar.
    expect(noCorresponden.every((n) => n.veredicto.motivo.length > 0)).toBe(true);
  });

  it("no pierde ninguna ayuda del catalogo", () => {
    const { corresponden, noCorresponden } = clasificarOferta(HOGAR, catalogo);
    expect(corresponden.length + noCorresponden.length).toBe(catalogo.length);
  });
});
