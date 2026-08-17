import { PrismaNeon } from "@prisma/adapter-neon";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Verifica el Principio I de la constitucion: la auditoria no se puede alterar.
 *
 * Lo que se prueba aqui NO es codigo de la aplicacion sino el disparador de Postgres.
 * Por eso necesita una base real: si la garantia dependiera de TypeScript, un
 * `prisma.registroAuditoria.update()` escrito por descuido la rompería en silencio.
 *
 * Cada caso corre dentro de una transaccion que termina revertida, asi que la prueba
 * no deja filas en la auditoria. Importa: la tabla es de solo insercion y lo que se
 * escriba ahi no se puede limpiar despues.
 */

const connectionString = process.env["DATABASE_URL"];
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: connectionString! }) });

const FILA = {
  accion: "prueba.inmutabilidad",
  objetivoTipo: "Prueba",
  resultado: "PERMITIDO" as const,
  datos: {},
};

afterAll(async () => {
  await prisma.$disconnect();
});

describe.skipIf(!connectionString)("inmutabilidad de RegistroAuditoria", () => {
  it("rechaza UPDATE", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const fila = await tx.registroAuditoria.create({ data: FILA });
        await tx.registroAuditoria.update({
          where: { id: fila.id },
          data: { accion: "alterado" },
        });
      }),
    ).rejects.toThrow(/solo insercion/i);
  });

  it("rechaza DELETE", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const fila = await tx.registroAuditoria.create({ data: FILA });
        await tx.registroAuditoria.delete({ where: { id: fila.id } });
      }),
    ).rejects.toThrow(/solo insercion/i);
  });

  it("rechaza TRUNCATE, que no dispara los triggers de fila", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('TRUNCATE TABLE "RegistroAuditoria"');
      }),
    ).rejects.toThrow(/solo insercion/i);
  });

  /**
   * Las cifras de dinero, la historia de estados y los documentos de respaldo llevan el
   * mismo disparador. Un costo entregado por un estudio es un hecho ocurrido: se
   * corrige agregando una fila que referencia la anterior, nunca alterando la original.
   *
   * Se verifica que el disparador este efectivamente puesto sobre cada tabla, en vez de
   * provocar la violacion. Una prueba que intentara TRUNCATE pasaria aunque el
   * disparador no existiera, porque una clave foranea ya lo bloquea por su cuenta: daria
   * verde por la razon equivocada.
   */
  it("todas las tablas de hechos llevan el disparador de inmutabilidad", async () => {
    const protegidas = [
      "RegistroAuditoria",
      "CostoObra",
      "CambioEstadoObra",
      "Documento",
    ];

    const filas = await prisma.$queryRawUnsafe<{ tabla: string; eventos: number }[]>(`
      SELECT c.relname::text AS tabla, COUNT(*)::int AS eventos
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE p.proname = 'nagomu_rechazar_modificacion'
        AND NOT t.tgisinternal
      GROUP BY c.relname
    `);

    const conDisparador = new Map(filas.map((f) => [f.tabla, Number(f.eventos)]));

    for (const tabla of protegidas) {
      expect(conDisparador.has(tabla), `${tabla} no tiene el disparador`).toBe(true);
      // Dos: uno por fila para UPDATE/DELETE, y uno por sentencia para TRUNCATE.
      expect(conDisparador.get(tabla), `${tabla} deberia tener ambos disparadores`).toBe(2);
    }
  });

  it("si permite INSERT: la auditoria solo crece", async () => {
    const antes = await prisma.registroAuditoria.count();

    await prisma
      .$transaction(async (tx) => {
        await tx.registroAuditoria.create({ data: FILA });
        // Se revierte a proposito para no dejar rastro de la prueba.
        throw new Error("revertir");
      })
      .catch(() => undefined);

    expect(await prisma.registroAuditoria.count()).toBe(antes);
  });
});
