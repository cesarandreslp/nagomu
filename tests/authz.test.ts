import { describe, expect, it } from "vitest";
import {
  municipiosVisiblesPara,
  puedeAutorizarIntervencion,
  puedeCrearItemInventario,
  puedeEditarAporte,
  puedeEditarObra,
  puedeReportarCapacidadFiscal,
  puedeVer,
} from "@/lib/authz";
import type { SesionActiva } from "@/lib/auth";

/**
 * Matriz de permisos del contrato: specs/001-cofinanciacion-obras/contracts/rutas.md
 *
 * La constitucion exige pruebas sobre las rutas de permisos (Principio II). Esta suite
 * crece con cada historia; se completa en T082.
 *
 * Importa tanto lo que debe pasar como lo que debe fallar: una regla que solo se prueba
 * por el lado permitido no protege de nada.
 */

const BUGA = "ent-buga";
const SIPI = "ent-sipi";
const VALLE = "ent-valle";
const CHOCO = "ent-choco";
const NACION = "ent-nacion";

function sesion(parcial: Partial<SesionActiva> & Pick<SesionActiva, "entidadId" | "nivel">): SesionActiva {
  return {
    usuarioId: `usr-${parcial.entidadId}`,
    nombre: "Funcionario",
    entidadNombre: parcial.entidadId,
    departamentoId: null,
    ...parcial,
  };
}

const buga = sesion({ entidadId: BUGA, nivel: "MUNICIPIO", departamentoId: VALLE });
const sipi = sesion({ entidadId: SIPI, nivel: "MUNICIPIO", departamentoId: CHOCO });
const valle = sesion({ entidadId: VALLE, nivel: "DEPARTAMENTO" });
const choco = sesion({ entidadId: CHOCO, nivel: "DEPARTAMENTO" });
const nacion = sesion({ entidadId: NACION, nivel: "NACION" });

const obraDeBuga = { municipioId: BUGA };

describe("ver", () => {
  it("cualquier usuario autenticado ve cualquier obra, sea de quien sea", () => {
    for (const s of [buga, sipi, valle, choco, nacion]) {
      expect(puedeVer(s).permitido).toBe(true);
    }
  });

  it("sin sesion no se ve nada", () => {
    expect(puedeVer(null).permitido).toBe(false);
  });
});

describe("crear item de inventario", () => {
  it("solo los municipios registran", () => {
    expect(puedeCrearItemInventario(buga).permitido).toBe(true);
    expect(puedeCrearItemInventario(sipi).permitido).toBe(true);
  });

  it("gobernacion y nacion no registran items", () => {
    expect(puedeCrearItemInventario(valle).permitido).toBe(false);
    expect(puedeCrearItemInventario(nacion).permitido).toBe(false);
    expect(puedeCrearItemInventario(null).permitido).toBe(false);
  });
});

describe("editar obra", () => {
  it("solo el municipio dueño", () => {
    expect(puedeEditarObra(buga, obraDeBuga).permitido).toBe(true);
  });

  it("otro municipio no puede, aunque sea del mismo departamento", () => {
    const otroDelValle = sesion({
      entidadId: "ent-tulua",
      nivel: "MUNICIPIO",
      departamentoId: VALLE,
    });
    expect(puedeEditarObra(otroDelValle, obraDeBuga).permitido).toBe(false);
    expect(puedeEditarObra(sipi, obraDeBuga).permitido).toBe(false);
  });

  it("ni la gobernacion de su departamento ni la nacion editan la obra", () => {
    expect(puedeEditarObra(valle, obraDeBuga).permitido).toBe(false);
    expect(puedeEditarObra(nacion, obraDeBuga).permitido).toBe(false);
  });
});

describe("aportes", () => {
  it("cada entidad inscribe su propio aporte", () => {
    expect(puedeEditarAporte(valle, { actorEntidadId: VALLE }, obraDeBuga).permitido).toBe(true);
    expect(puedeEditarAporte(nacion, { actorEntidadId: NACION }, obraDeBuga).permitido).toBe(
      true,
    );
    expect(puedeEditarAporte(buga, { actorEntidadId: BUGA }, obraDeBuga).permitido).toBe(true);
  });

  it("ninguna entidad toca el aporte de otra, ni hacia arriba ni hacia abajo", () => {
    expect(puedeEditarAporte(buga, { actorEntidadId: VALLE }, obraDeBuga).permitido).toBe(false);
    expect(puedeEditarAporte(valle, { actorEntidadId: BUGA }, obraDeBuga).permitido).toBe(false);
    expect(puedeEditarAporte(nacion, { actorEntidadId: VALLE }, obraDeBuga).permitido).toBe(
      false,
    );
  });

  it("el municipio dueño inscribe por actores sin usuario propio", () => {
    expect(puedeEditarAporte(buga, { actorEntidadId: null }, obraDeBuga).permitido).toBe(true);
  });

  it("nadie mas inscribe por esos actores", () => {
    expect(puedeEditarAporte(valle, { actorEntidadId: null }, obraDeBuga).permitido).toBe(false);
    expect(puedeEditarAporte(nacion, { actorEntidadId: null }, obraDeBuga).permitido).toBe(
      false,
    );
    expect(puedeEditarAporte(sipi, { actorEntidadId: null }, obraDeBuga).permitido).toBe(false);
  });
});

describe("intervenciones", () => {
  it("el municipio dueño autoriza lo que pasa en su territorio", () => {
    expect(puedeAutorizarIntervencion(buga, obraDeBuga).permitido).toBe(true);
  });

  it("ni la gobernacion ni la nacion autorizan sobre obra ajena", () => {
    expect(puedeAutorizarIntervencion(valle, obraDeBuga).permitido).toBe(false);
    expect(puedeAutorizarIntervencion(nacion, obraDeBuga).permitido).toBe(false);
    expect(puedeAutorizarIntervencion(sipi, obraDeBuga).permitido).toBe(false);
  });
});

describe("capacidad fiscal", () => {
  it("solo un municipio reporta la suya", () => {
    expect(puedeReportarCapacidadFiscal(buga).permitido).toBe(true);
    expect(puedeReportarCapacidadFiscal(valle).permitido).toBe(false);
    expect(puedeReportarCapacidadFiscal(nacion).permitido).toBe(false);
  });
});

describe("ambito de consolidacion", () => {
  it("el municipio ve lo suyo", () => {
    expect(municipiosVisiblesPara(buga)).toEqual({ alcance: "PROPIO", municipioId: BUGA });
  });

  it("la gobernacion ve su departamento", () => {
    expect(municipiosVisiblesPara(valle)).toEqual({
      alcance: "DEPARTAMENTO",
      departamentoId: VALLE,
    });
  });

  it("la nacion ve todo", () => {
    expect(municipiosVisiblesPara(nacion)).toEqual({ alcance: "TODOS" });
  });
});

describe("los rechazos explican por que", () => {
  it("cada negativa trae un motivo utilizable en la auditoria", () => {
    const veredicto = puedeEditarObra(sipi, obraDeBuga);
    expect(veredicto.permitido).toBe(false);
    if (!veredicto.permitido) {
      expect(veredicto.motivo.length).toBeGreaterThan(10);
    }
  });
});
