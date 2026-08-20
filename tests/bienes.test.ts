import { PrismaNeon } from "@prisma/adapter-neon";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/lib/generated/prisma/client";
import {
  estadoValidoPara,
  estadosValidosPara,
  subtipoAplicaA,
  listarBienesDe,
} from "@/lib/bienes";
import type { SesionActiva } from "@/lib/auth";

/**
 * Bien afectado generalizado (spec 007, US1).
 *
 * Dos cosas se cuidan aqui: (1) el estado de afectacion es coherente con el tipo de
 * bien —una vivienda se clasifica por habitabilidad, un cultivo por perdida—; (2) solo
 * la estructura publica se vuelve una Obra con cola (spec 001), y un municipio no ve el
 * inventario de otro (Principio II).
 *
 * La parte de base corre en transaccion revertida: no deja bienes de prueba.
 */

const connectionString = process.env["DATABASE_URL"];
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: connectionString! }) });

afterAll(async () => {
  await prisma.$disconnect();
});

describe("estado coherente con el tipo de bien", () => {
  it("las estructuras se clasifican por habitabilidad", () => {
    for (const tipo of ["VIVIENDA", "COMERCIO", "ESTRUCTURA_PUBLICA"] as const) {
      expect(estadosValidosPara(tipo)).toEqual(["HABITABLE", "REPARABLE", "DEMOLER"]);
      expect(estadoValidoPara(tipo, "DEMOLER")).toBe(true);
      expect(estadoValidoPara(tipo, "PERDIDO")).toBe(false);
    }
  });

  it("lo agropecuario se clasifica por perdida", () => {
    expect(estadosValidosPara("AGROPECUARIO")).toEqual(["PERDIDO", "PARCIAL"]);
    expect(estadoValidoPara("AGROPECUARIO", "PARCIAL")).toBe(true);
    expect(estadoValidoPara("AGROPECUARIO", "HABITABLE")).toBe(false);
  });

  it("el subtipo solo aplica al agropecuario", () => {
    expect(subtipoAplicaA("AGROPECUARIO")).toBe(true);
    expect(subtipoAplicaA("VIVIENDA")).toBe(false);
    expect(subtipoAplicaA("ESTRUCTURA_PUBLICA")).toBe(false);
  });
});

describe.skipIf(!connectionString)("bienes contra base", () => {
  async function enTransaccion(
    caso: (
      tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
      ctx: { municipioId: string; otroMunicipioId: string },
    ) => Promise<void>,
  ) {
    await prisma
      .$transaction(async (tx) => {
        const municipio = await tx.entidadTerritorial.create({
          data: { nombre: "MUNICIPIO DE PRUEBA — bienes A", nivel: "MUNICIPIO" },
        });
        const otro = await tx.entidadTerritorial.create({
          data: { nombre: "MUNICIPIO DE PRUEBA — bienes B", nivel: "MUNICIPIO" },
        });
        await caso(tx, { municipioId: municipio.id, otroMunicipioId: otro.id });
        throw new Error("revertir");
      })
      .catch((e: Error) => {
        expect(e.message).toBe("revertir");
      });
  }

  it("la estructura publica lleva obra; el agropecuario no y no tiene categoria", async () => {
    await enTransaccion(async (tx, ctx) => {
      const obra = await tx.obra.create({
        data: {
          item: {
            create: {
              municipioId: ctx.municipioId,
              nombre: "Escuela El Placer",
              tipoBien: "ESTRUCTURA_PUBLICA",
              estadoAfectacion: "DEMOLER",
              categoria: "EDUCACION",
              descripcionDano: "x",
              ubicacion: "x",
            },
          },
        },
        include: { item: true },
      });
      expect(obra.item.categoria).toBe("EDUCACION");

      const cultivo = await tx.itemInventario.create({
        data: {
          municipioId: ctx.municipioId,
          nombre: "Cultivo de platano",
          tipoBien: "AGROPECUARIO",
          subtipoBien: "CULTIVO",
          estadoAfectacion: "PERDIDO",
          descripcionDano: "x",
          ubicacion: "",
          vereda: "La Union",
        },
        include: { obra: true },
      });
      expect(cultivo.categoria).toBeNull();
      expect(cultivo.obra).toBeNull();
    });
  });

  it("un municipio solo ve sus propios bienes (Principio II)", async () => {
    await enTransaccion(async (tx, ctx) => {
      await tx.itemInventario.create({
        data: {
          municipioId: ctx.municipioId,
          nombre: "Bien de A",
          tipoBien: "VIVIENDA",
          descripcionDano: "x",
          ubicacion: "calle secreta de A",
        },
      });
      await tx.itemInventario.create({
        data: {
          municipioId: ctx.otroMunicipioId,
          nombre: "Bien de B",
          tipoBien: "COMERCIO",
          descripcionDano: "x",
          ubicacion: "calle secreta de B",
        },
      });

      const sesionA = sesionMunicipio(ctx.municipioId);
      const bienes = await listarBienesDe(sesionA, tx);

      expect(bienes.map((b) => b.nombre)).toEqual(["Bien de A"]);
    });
  });
});

function sesionMunicipio(entidadId: string): SesionActiva {
  return {
    usuarioId: "u",
    nombre: "Funcionario",
    entidadId,
    entidadNombre: "Municipio",
    nivel: "MUNICIPIO",
    departamentoId: null,
  };
}
