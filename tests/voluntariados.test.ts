import { PrismaNeon } from "@prisma/adapter-neon";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Una cuenta pertenece a EXACTAMENTE una cosa: una entidad territorial (funcionario) o un
 * actor voluntariado (cuenta auto-registrada). Lo garantiza un CHECK de Postgres, no el
 * codigo, asi que se prueba contra la base (Principio II + enmienda 2.0.0).
 *
 * Cada caso corre en una transaccion que termina revertida: no deja usuarios de prueba.
 */

const connectionString = process.env["DATABASE_URL"];
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: connectionString! }),
});

const HASH = "scrypt$65536$8$1$00$00"; // No importa que sea valido: el CHECK no lo mira.

afterAll(async () => {
  await prisma.$disconnect();
});

describe.skipIf(!connectionString)("pertenencia unica de Usuario", () => {
  it("rechaza una cuenta sin entidad ni actor", async () => {
    await expect(
      prisma.usuario.create({
        data: { correo: "huerfano@nagomu.test", nombre: "Sin nada", hashContrasena: HASH },
      }),
    ).rejects.toThrow();
  });

  it("rechaza una cuenta con entidad Y actor a la vez", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const municipio = await tx.entidadTerritorial.findFirstOrThrow({
          where: { nivel: "MUNICIPIO" },
          select: { id: true },
        });
        const actor = await tx.actor.create({
          data: { tipo: "VOLUNTARIADO", nombre: "VOLUNTARIADO DE PRUEBA — pertenencia" },
        });
        await tx.usuario.create({
          data: {
            correo: "doble@nagomu.test",
            nombre: "Doble",
            hashContrasena: HASH,
            entidadId: municipio.id,
            actorId: actor.id,
          },
        });
      }),
    ).rejects.toThrow();
  });
});
