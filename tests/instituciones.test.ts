import { describe, expect, it } from "vitest";
import { ORDEN_DE_RESPUESTA, institucionalidadDe } from "@/lib/instituciones";
import { ambitosPara } from "@/lib/fondos";

describe("institucionalidad por nivel", () => {
  it("cada nivel tiene su consejo de gestion del riesgo", () => {
    expect(institucionalidadDe("MUNICIPIO").siglaInstancia).toBe("CMGRD");
    expect(institucionalidadDe("DEPARTAMENTO").siglaInstancia).toBe("CDGRD");
    expect(institucionalidadDe("NACION").siglaInstancia).toBe("CNGRD");
  });

  it("la entidad rectora nacional es la UNGRD", () => {
    expect(institucionalidadDe("NACION").rectora).toContain("UNGRD");
  });

  it("el municipio responde primero", () => {
    expect(ORDEN_DE_RESPUESTA[0]).toBe("MUNICIPIO");
    expect(ORDEN_DE_RESPUESTA).toEqual(["MUNICIPIO", "DEPARTAMENTO", "NACION"]);
  });
});

describe("que fondos puede usar cada nivel", () => {
  it("cada nivel accede a los de su ambito", () => {
    expect(ambitosPara("MUNICIPIO")).toContain("MUNICIPAL");
    expect(ambitosPara("DEPARTAMENTO")).toContain("DEPARTAMENTAL");
    expect(ambitosPara("NACION")).toContain("NACIONAL");
  });

  it("un municipio no puede declarar que gasta del fondo nacional", () => {
    expect(ambitosPara("MUNICIPIO")).not.toContain("NACIONAL");
    expect(ambitosPara("MUNICIPIO")).not.toContain("DEPARTAMENTAL");
  });

  it("la nacion tampoco se atribuye fondos territoriales", () => {
    expect(ambitosPara("NACION")).not.toContain("MUNICIPAL");
    expect(ambitosPara("NACION")).not.toContain("DEPARTAMENTAL");
  });

  it("cualquier nivel puede recibir cooperacion o donacion externa", () => {
    for (const nivel of ORDEN_DE_RESPUESTA) {
      expect(ambitosPara(nivel)).toContain("EXTERNO");
    }
  });
});
