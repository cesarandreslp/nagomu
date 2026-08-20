import { PrismaNeon } from "@prisma/adapter-neon";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { censoPublico } from "@/lib/censo";

/**
 * El candado del Principio IV (enmienda constitucional 4.0.0): una consulta PUBLICA
 * NUNCA expone un campo reservado.
 *
 * La direccion exacta (`ubicacion`) señala directo al hogar; el punto y el lugar
 * general son transparencia. Esta prueba existe para que esa separacion no se pueda
 * perder en una refactorizacion: si alguien agrega `ubicacion` (o cualquier dato de
 * persona) al `select` publico de lib/censo.ts, el censo empezaria a contener la
 * direccion de prueba y esta prueba fallaria. Si la ve fallar y le estorba, lo que hace
 * falta es una enmienda, no cambiar el `expect`.
 *
 * Corre contra base real en transaccion revertida: no deja bienes de prueba.
 */

const connectionString = process.env["DATABASE_URL"];
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: connectionString! }) });

const DIRECCION_SECRETA = "CALLE 6 CON CARRERA 14, CASA DEL RESPONSABLE — reservada";

afterAll(async () => {
  await prisma.$disconnect();
});

describe.skipIf(!connectionString)("el censo publico nunca expone lo reservado", () => {
  async function enTransaccion(
    caso: (
      tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
      ctx: { municipioId: string },
    ) => Promise<void>,
  ) {
    await prisma
      .$transaction(async (tx) => {
        const municipio = await tx.entidadTerritorial.create({
          data: { nombre: "MUNICIPIO DE PRUEBA — censo", nivel: "MUNICIPIO" },
        });
        await caso(tx, { municipioId: municipio.id });
        throw new Error("revertir");
      })
      .catch((e: Error) => {
        expect(e.message).toBe("revertir");
      });
  }

  it("no incluye la direccion ni una clave 'ubicacion'", async () => {
    await enTransaccion(async (tx, ctx) => {
      await tx.itemInventario.create({
        data: {
          municipioId: ctx.municipioId,
          nombre: "Vivienda afectada",
          sector: "VIVIENDA",
          tipoBien: "Vivienda",
          estadoAfectacion: "DEMOLER",
          descripcionDano: "x",
          ubicacion: DIRECCION_SECRETA,
          corregimiento: "El Placer",
          vereda: "La Union",
          latitud: 3.9,
          longitud: -76.2,
        },
      });

      const censo = await censoPublico({ alcance: "MUNICIPIO", municipioId: ctx.municipioId }, tx);
      const serializado = JSON.stringify(censo);

      expect(serializado).not.toContain(DIRECCION_SECRETA);
      expect(serializado).not.toContain("ubicacion");
      expect(censo.total).toBe(1);
      expect(censo.porSector).toContainEqual({ sector: "VIVIENDA", total: 1 });
    });
  });

  it("un bien sin coordenada se cuenta por lugar general, no como punto", async () => {
    await enTransaccion(async (tx, ctx) => {
      await tx.itemInventario.create({
        data: {
          municipioId: ctx.municipioId,
          nombre: "Cultivo sin coordenada",
          sector: "AGROPECUARIO",
          tipoBien: "Cultivo",
          estadoAfectacion: "PERDIDO",
          descripcionDano: "x",
          ubicacion: DIRECCION_SECRETA,
          corregimiento: "El Placer",
          vereda: "La Union",
        },
      });

      const censo = await censoPublico({ alcance: "MUNICIPIO", municipioId: ctx.municipioId }, tx);

      expect(censo.puntos).toHaveLength(0);
      expect(censo.porLugar).toHaveLength(1);
      expect(censo.porLugar[0]!.lugar).toBe("El Placer · La Union");
      expect(censo.porLugar[0]!.total).toBe(1);
      expect(JSON.stringify(censo)).not.toContain(DIRECCION_SECRETA);
    });
  });
});
