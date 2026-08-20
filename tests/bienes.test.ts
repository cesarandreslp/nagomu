import { PrismaNeon } from "@prisma/adapter-neon";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/lib/generated/prisma/client";
import {
  estadoValidoPara,
  estadosValidosPara,
  sectorEsObraPublica,
  listarBienesDe,
} from "@/lib/bienes";
import type { SesionActiva } from "@/lib/auth";

/**
 * Bien afectado por sector doliente (spec 007, US1).
 *
 * Tres cosas se cuidan: (1) el estado es coherente con el sector —una edificacion se
 * clasifica por habitabilidad, una via o un cultivo por perdida—; (2) solo un bien de
 * un sector de obra publica se vuelve Obra con cola (spec 001), y vivienda/comercio/
 * agropecuario no; (3) un municipio no ve el inventario de otro (Principio II).
 *
 * La parte de base corre en transaccion revertida: no deja bienes de prueba.
 */

const connectionString = process.env["DATABASE_URL"];
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: connectionString! }) });

afterAll(async () => {
  await prisma.$disconnect();
});

describe("estado coherente con el sector", () => {
  it("las edificaciones se clasifican por habitabilidad", () => {
    for (const s of ["VIVIENDA", "EDUCACION", "SALUD", "COMERCIO"] as const) {
      expect(estadosValidosPara(s)).toEqual(["HABITABLE", "REPARABLE", "DEMOLER"]);
      expect(estadoValidoPara(s, "DEMOLER")).toBe(true);
      expect(estadoValidoPara(s, "PERDIDO")).toBe(false);
    }
  });

  it("infraestructura y agropecuario se clasifican por perdida", () => {
    for (const s of ["TRANSPORTE", "GESTION_RIESGO", "AGUA_SANEAMIENTO", "AGROPECUARIO"] as const) {
      expect(estadosValidosPara(s)).toEqual(["PERDIDO", "PARCIAL"]);
      expect(estadoValidoPara(s, "PARCIAL")).toBe(true);
      expect(estadoValidoPara(s, "HABITABLE")).toBe(false);
    }
  });

  it("solo los sectores de obra publica pueden volverse Obra", () => {
    expect(sectorEsObraPublica("EDUCACION")).toBe(true);
    expect(sectorEsObraPublica("TRANSPORTE")).toBe(true);
    expect(sectorEsObraPublica("GESTION_RIESGO")).toBe(true);
    expect(sectorEsObraPublica("VIVIENDA")).toBe(false);
    expect(sectorEsObraPublica("COMERCIO")).toBe(false);
    expect(sectorEsObraPublica("AGROPECUARIO")).toBe(false);
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

  it("una escuela (Educacion) lleva obra; un cultivo (Agropecuario) no y no tiene categoria", async () => {
    await enTransaccion(async (tx, ctx) => {
      const obra = await tx.obra.create({
        data: {
          item: {
            create: {
              municipioId: ctx.municipioId,
              nombre: "Escuela El Placer",
              sector: "EDUCACION",
              tipoBien: "Escuela",
              estadoAfectacion: "DEMOLER",
              categoria: "EDUCACION",
              descripcionDano: "x",
              ubicacion: "x",
            },
          },
        },
        include: { item: true },
      });
      expect(obra.item.sector).toBe("EDUCACION");
      expect(obra.item.categoria).toBe("EDUCACION");

      const cultivo = await tx.itemInventario.create({
        data: {
          municipioId: ctx.municipioId,
          nombre: "Cultivo de platano",
          sector: "AGROPECUARIO",
          tipoBien: "Cultivo",
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
          sector: "VIVIENDA",
          tipoBien: "Vivienda",
          descripcionDano: "x",
          ubicacion: "calle secreta de A",
        },
      });
      await tx.itemInventario.create({
        data: {
          municipioId: ctx.otroMunicipioId,
          nombre: "Bien de B",
          sector: "COMERCIO",
          tipoBien: "Local",
          descripcionDano: "x",
          ubicacion: "calle secreta de B",
        },
      });

      const sesionA = sesionMunicipio(ctx.municipioId);
      const bienes = await listarBienesDe(sesionA, tx);

      expect(bienes.map((b) => b.nombre)).toEqual(["Bien de A"]);
      expect(bienes[0]!.sector).toBe("VIVIENDA");
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
