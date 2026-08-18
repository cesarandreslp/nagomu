import { PrismaNeon } from "@prisma/adapter-neon";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { resumenImpacto } from "@/lib/impacto";
import { desdeDecimal } from "@/lib/dinero";

/**
 * Agregados de impacto de la landing (spec 004 US2). Son cifras publicas de fiscalizacion:
 * una suma mal hecha engaña, asi que se prueban contra la base. Cada caso corre en una
 * transaccion revertida y no deja rastro.
 */

const connectionString = process.env["DATABASE_URL"];
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: connectionString! }),
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe.skipIf(!connectionString)("resumenImpacto", () => {
  it("suma solo los aportes no anulados y calcula ejecucion y alertas", async () => {
    await prisma
      .$transaction(async (tx) => {
        const municipio = await tx.entidadTerritorial.create({
          data: { nombre: "MUNICIPIO DE PRUEBA — impacto", nivel: "MUNICIPIO" },
        });
        const actor = await tx.actor.findFirstOrThrow({ select: { id: true } });
        const fondo = await tx.fondo.findFirstOrThrow({ select: { id: true } });
        const usuario = await tx.usuario.findFirstOrThrow({
          where: { entidadId: { not: null } },
          select: { id: true },
        });

        const item = (nombre: string) => ({
          municipioId: municipio.id,
          nombre,
          ubicacion: "x",
          categoria: "EDUCACION" as const,
          descripcionDano: "x",
        });

        // Una obra entregada y una costeada sin aporte (cuenta como alerta).
        const entregada = await tx.obra.create({
          data: { estado: "ENTREGADA", item: { create: item("Entregada") } },
        });
        await tx.obra.create({
          data: { estado: "COSTEADO", item: { create: item("Costeada sin aporte") } },
        });

        // Aporte de 1.000.000 corregido a 500.000: solo el vigente debe sumar.
        const original = await tx.aporte.create({
          data: {
            obraId: entregada.id,
            actorId: actor.id,
            fondoId: fondo.id,
            registradoPorId: usuario.id,
            monto: "1000000.00",
            fecha: new Date("2026-01-01"),
            estado: "COMPROMETIDO",
          },
        });
        await tx.aporte.create({
          data: {
            obraId: entregada.id,
            actorId: actor.id,
            fondoId: fondo.id,
            registradoPorId: usuario.id,
            monto: "500000.00",
            fecha: new Date("2026-02-01"),
            estado: "COMPROMETIDO",
            corrigeId: original.id,
          },
        });

        const r = await resumenImpacto(
          { alcance: "MUNICIPIO", municipioId: municipio.id },
          new Date(),
          tx,
        );

        // Fondos: solo el aporte vigente (500.000), no el corregido.
        expect(r.fondosAsignados).toBe(desdeDecimal("500000.00"));
        // Ejecucion: 1 entregada de 2 obras = 50%.
        expect(r.obrasTotal).toBe(2);
        expect(r.obrasEntregadas).toBe(1);
        expect(r.porcentajeEjecucion).toBe(50);
        // Alertas: la costeada sin aporte + el municipio sin capacidad reportada.
        expect(r.alertas).toBe(2);

        throw new Error("revertir");
      })
      .catch((e: Error) => {
        expect(e.message).toBe("revertir");
      });
  });

  it("sin obras, la ejecucion es 0% y no divide por cero", async () => {
    await prisma
      .$transaction(async (tx) => {
        const municipio = await tx.entidadTerritorial.create({
          data: { nombre: "MUNICIPIO DE PRUEBA — vacio", nivel: "MUNICIPIO" },
        });
        const r = await resumenImpacto(
          { alcance: "MUNICIPIO", municipioId: municipio.id },
          new Date(),
          tx,
        );
        expect(r.obrasTotal).toBe(0);
        expect(r.porcentajeEjecucion).toBe(0);
        throw new Error("revertir");
      })
      .catch((e: Error) => {
        expect(e.message).toBe("revertir");
      });
  });
});
