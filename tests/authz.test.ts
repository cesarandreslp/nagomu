import { describe, expect, it } from "vitest";
import {
  municipiosVisiblesPara,
  puedeAutorizarIntervencion,
  puedeCrearItemInventario,
  puedeEditarAporte,
  puedeEditarObra,
  puedeReportarCapacidadFiscal,
  puedeVer,
  puedeVerificarVoluntariado,
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

describe("verificar voluntariado", () => {
  const voluntariadoDeBuga = { municipioOperacionId: BUGA };

  it("solo el municipio de operacion verifica", () => {
    expect(puedeVerificarVoluntariado(buga, voluntariadoDeBuga).permitido).toBe(true);
  });

  it("otro municipio, la gobernacion, la nacion y nadie sin sesion verifican", () => {
    expect(puedeVerificarVoluntariado(sipi, voluntariadoDeBuga).permitido).toBe(false);
    expect(puedeVerificarVoluntariado(valle, voluntariadoDeBuga).permitido).toBe(false);
    expect(puedeVerificarVoluntariado(nacion, voluntariadoDeBuga).permitido).toBe(false);
    expect(puedeVerificarVoluntariado(null, voluntariadoDeBuga).permitido).toBe(false);
  });

  it("un voluntariado sin municipio de operacion no lo verifica nadie", () => {
    expect(puedeVerificarVoluntariado(buga, { municipioOperacionId: null }).permitido).toBe(false);
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

/**
 * Matriz integra del contrato (T082).
 *
 * Recorre cada combinacion de actor por accion, incluidas todas las que deben fallar.
 * Una regla probada solo por el lado permitido no protege de nada: lo que hay que
 * demostrar es que los `No` son `No`.
 */
describe("matriz completa de permisos", () => {
  const obra = { municipioId: BUGA };

  const actores = [
    { nombre: "municipio dueño", sesion: buga },
    { nombre: "otro municipio", sesion: sipi },
    { nombre: "gobernacion del ambito", sesion: valle },
    { nombre: "otra gobernacion", sesion: choco },
    { nombre: "nacion", sesion: nacion },
    { nombre: "sin sesion", sesion: null },
  ];

  // Copiado del contrato en contracts/rutas.md. Si el contrato cambia, esto falla.
  const esperado: Record<string, Record<string, boolean>> = {
    "ver cualquier obra": {
      "municipio dueño": true,
      "otro municipio": true,
      "gobernacion del ambito": true,
      "otra gobernacion": true,
      nacion: true,
      "sin sesion": false,
    },
    "crear item de inventario": {
      "municipio dueño": true,
      "otro municipio": true,
      "gobernacion del ambito": false,
      "otra gobernacion": false,
      nacion: false,
      "sin sesion": false,
    },
    "editar la obra": {
      "municipio dueño": true,
      "otro municipio": false,
      "gobernacion del ambito": false,
      "otra gobernacion": false,
      nacion: false,
      "sin sesion": false,
    },
    "inscribir aporte por un tercero sin usuario": {
      "municipio dueño": true,
      "otro municipio": false,
      "gobernacion del ambito": false,
      "otra gobernacion": false,
      nacion: false,
      "sin sesion": false,
    },
    "autorizar, suspender o recibir una intervencion": {
      "municipio dueño": true,
      "otro municipio": false,
      "gobernacion del ambito": false,
      "otra gobernacion": false,
      nacion: false,
      "sin sesion": false,
    },
    "reportar capacidad fiscal": {
      "municipio dueño": true,
      "otro municipio": true,
      "gobernacion del ambito": false,
      "otra gobernacion": false,
      nacion: false,
      "sin sesion": false,
    },
  };

  const evaluar: Record<string, (s: SesionActiva | null) => boolean> = {
    "ver cualquier obra": (s) => puedeVer(s).permitido,
    "crear item de inventario": (s) => puedeCrearItemInventario(s).permitido,
    "editar la obra": (s) => puedeEditarObra(s, obra).permitido,
    "inscribir aporte por un tercero sin usuario": (s) =>
      puedeEditarAporte(s, { actorEntidadId: null }, obra).permitido,
    "autorizar, suspender o recibir una intervencion": (s) =>
      puedeAutorizarIntervencion(s, obra).permitido,
    "reportar capacidad fiscal": (s) => puedeReportarCapacidadFiscal(s).permitido,
  };

  for (const [accion, porActor] of Object.entries(esperado)) {
    describe(accion, () => {
      for (const { nombre, sesion: s } of actores) {
        const debe = porActor[nombre]!;
        it(`${nombre}: ${debe ? "si" : "no"}`, () => {
          expect(evaluar[accion]!(s)).toBe(debe);
        });
      }
    });
  }

  it("nadie edita el aporte de otra entidad, en ninguna direccion", () => {
    const combinaciones: [SesionActiva, string][] = [
      [buga, VALLE],
      [buga, NACION],
      [valle, BUGA],
      [valle, NACION],
      [nacion, BUGA],
      [nacion, VALLE],
      [sipi, BUGA],
    ];

    for (const [sesion, actorEntidadId] of combinaciones) {
      expect(
        puedeEditarAporte(sesion, { actorEntidadId }, obra).permitido,
        `${sesion.entidadId} sobre aporte de ${actorEntidadId}`,
      ).toBe(false);
    }
  });

  it("cada entidad si edita el suyo", () => {
    for (const s of [buga, sipi, valle, choco, nacion]) {
      expect(puedeEditarAporte(s, { actorEntidadId: s.entidadId }, obra).permitido).toBe(true);
    }
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
