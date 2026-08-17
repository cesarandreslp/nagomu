import { PrismaNeon } from "@prisma/adapter-neon";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Un actor por tipo y nombre.
 *
 * Se prueba contra la base porque lo que garantiza la unicidad es un indice de
 * Postgres, no el codigo. Sin el, cada aporte de la misma empresa creaba una fila
 * nueva: la lista se llenaba de la misma constructora repetida y era imposible sumar
 * cuanto habia puesto.
 *
 * Cada caso corre dentro de una transaccion revertida, asi que no deja actores de
 * prueba en la base del piloto.
 */

const connectionString = process.env["DATABASE_URL"];
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: connectionString! }),
});

const NOMBRE = "ACTOR DE PRUEBA — unicidad";

afterAll(async () => {
  await prisma.$disconnect();
});

describe.skipIf(!connectionString)("unicidad de actores", () => {
  it("rechaza dos actores con el mismo tipo y nombre", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.actor.create({ data: { tipo: "EMPRESA", nombre: NOMBRE } });
        await tx.actor.create({ data: { tipo: "EMPRESA", nombre: NOMBRE } });
      }),
    ).rejects.toThrow();
  });

  it("el mismo nombre con otro tipo si es otro actor: una fundacion no es una empresa", async () => {
    await prisma
      .$transaction(async (tx) => {
        await tx.actor.create({ data: { tipo: "EMPRESA", nombre: NOMBRE } });
        await tx.actor.create({ data: { tipo: "FUNDACION", nombre: NOMBRE } });
        // Se revierte a proposito: la prueba no debe dejar rastro.
        throw new Error("revertir");
      })
      .catch((e: Error) => {
        expect(e.message).toBe("revertir");
      });
  });

  it("upsert devuelve el existente en vez de crear otro", async () => {
    await prisma
      .$transaction(async (tx) => {
        const primero = await tx.actor.create({ data: { tipo: "ONG", nombre: NOMBRE } });
        const segundo = await tx.actor.upsert({
          where: { tipo_nombre: { tipo: "ONG", nombre: NOMBRE } },
          update: {},
          create: { tipo: "ONG", nombre: NOMBRE },
        });

        expect(segundo.id).toBe(primero.id);
        throw new Error("revertir");
      })
      .catch((e: Error) => {
        expect(e.message).toBe("revertir");
      });
  });
});
