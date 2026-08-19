import { PrismaNeon } from "@prisma/adapter-neon";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/lib/generated/prisma/client";
import {
  agregadosPorMunicipio,
  crearHogar,
  otorgarAutorizacion,
  puedeGuardarDocumento,
} from "@/lib/damnificados";

/**
 * El candado del Principio IV (enmienda constitucional 3.0.0).
 *
 * La enmienda permitio guardar el documento del damnificado con una condicion: que el hogar
 * haya autorizado el tratamiento de sus datos (Ley 1581). Esta prueba existe para que esa
 * condicion no se pueda perder en una refactorizacion futura. Si alguien la ve fallar y le
 * parece un estorbo, lo que hace falta es una enmienda, no cambiar el `expect`.
 *
 * Corre contra base real y en transaccion revertida: no deja hogares de prueba.
 */

const connectionString = process.env["DATABASE_URL"];
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: connectionString! }) });

const DOCUMENTO = "00000000";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("puedeGuardarDocumento", () => {
  it("solo con autorizacion otorgada", () => {
    expect(puedeGuardarDocumento({ otorgada: true })).toBe(true);
    expect(puedeGuardarDocumento({ otorgada: false })).toBe(false);
    expect(puedeGuardarDocumento(null)).toBe(false);
    expect(puedeGuardarDocumento(undefined)).toBe(false);
  });
});

describe.skipIf(!connectionString)("documento ⇒ autorizacion", () => {
  /** Corre el caso dentro de una transaccion que siempre termina revertida. */
  async function enTransaccion(caso: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], ctx: { municipioId: string; usuarioId: string }) => Promise<void>) {
    await prisma
      .$transaction(async (tx) => {
        const municipio = await tx.entidadTerritorial.create({
          data: { nombre: "MUNICIPIO DE PRUEBA — damnificados", nivel: "MUNICIPIO" },
        });
        const usuario = await tx.usuario.findFirstOrThrow({
          where: { entidadId: { not: null } },
          select: { id: true },
        });
        await caso(tx, { municipioId: municipio.id, usuarioId: usuario.id });
        throw new Error("revertir");
      })
      .catch((e: Error) => {
        expect(e.message).toBe("revertir");
      });
  }

  const base = (municipioId: string, registradoPorId: string) => ({
    municipioId,
    registradoPorId,
    responsableNombre: "Responsable de prueba",
    personasTotal: 4,
    personasNinez: 2,
    personasAdultoMayor: 0,
    personasDiscapacidad: 0,
    hayHeridos: 0,
    hayFallecidos: 0,
  });

  it("sin autorizacion el documento NO se guarda, pero el hogar si queda registrado", async () => {
    await enTransaccion(async (tx, ctx) => {
      const { id } = await crearHogar(
        { ...base(ctx.municipioId, ctx.usuarioId), documento: DOCUMENTO },
        tx,
      );
      const hogar = await tx.hogarDamnificado.findUniqueOrThrow({ where: { id } });
      expect(hogar.documento).toBeNull();
      expect(hogar.personasTotal).toBe(4);
    });
  });

  it("con autorizacion negada tampoco", async () => {
    await enTransaccion(async (tx, ctx) => {
      const { id } = await crearHogar(
        {
          ...base(ctx.municipioId, ctx.usuarioId),
          documento: DOCUMENTO,
          autorizacion: { otorgada: false, medio: "VERBAL" },
        },
        tx,
      );
      const hogar = await tx.hogarDamnificado.findUniqueOrThrow({ where: { id } });
      expect(hogar.documento).toBeNull();
    });
  });

  it("con autorizacion otorgada si lo guarda", async () => {
    await enTransaccion(async (tx, ctx) => {
      const { id } = await crearHogar(
        {
          ...base(ctx.municipioId, ctx.usuarioId),
          documento: DOCUMENTO,
          autorizacion: { otorgada: true, medio: "FIRMA" },
        },
        tx,
      );
      const hogar = await tx.hogarDamnificado.findUniqueOrThrow({ where: { id } });
      expect(hogar.documento).toBe(DOCUMENTO);
    });
  });

  it("otorgar la autorizacion despues permite completar el documento", async () => {
    await enTransaccion(async (tx, ctx) => {
      const { id } = await crearHogar(
        { ...base(ctx.municipioId, ctx.usuarioId), documento: DOCUMENTO },
        tx,
      );
      expect((await tx.hogarDamnificado.findUniqueOrThrow({ where: { id } })).documento).toBeNull();

      await otorgarAutorizacion(
        id,
        ctx.municipioId,
        {
          otorgada: true,
          medio: "FIRMA",
          registradoPorId: ctx.usuarioId,
          documento: DOCUMENTO,
        },
        tx,
      );
      expect((await tx.hogarDamnificado.findUniqueOrThrow({ where: { id } })).documento).toBe(
        DOCUMENTO,
      );
    });
  });

  it("revocar la autorizacion borra el documento", async () => {
    await enTransaccion(async (tx, ctx) => {
      const { id } = await crearHogar(
        {
          ...base(ctx.municipioId, ctx.usuarioId),
          documento: DOCUMENTO,
          autorizacion: { otorgada: true, medio: "FIRMA" },
        },
        tx,
      );
      await otorgarAutorizacion(
        id,
        ctx.municipioId,
        { otorgada: false, medio: "VERBAL", registradoPorId: ctx.usuarioId },
        tx,
      );
      expect((await tx.hogarDamnificado.findUniqueOrThrow({ where: { id } })).documento).toBeNull();
    });
  });

  it("no se autoriza sobre un hogar de otro municipio", async () => {
    await enTransaccion(async (tx, ctx) => {
      const { id } = await crearHogar({ ...base(ctx.municipioId, ctx.usuarioId) }, tx);
      const ajeno = await tx.entidadTerritorial.create({
        data: { nombre: "MUNICIPIO DE PRUEBA — ajeno", nivel: "MUNICIPIO" },
      });
      const r = await otorgarAutorizacion(
        id,
        ajeno.id,
        {
          otorgada: true,
          medio: "FIRMA",
          registradoPorId: ctx.usuarioId,
          documento: DOCUMENTO,
        },
        tx,
      );
      expect(r).toBeNull();
      expect((await tx.hogarDamnificado.findUniqueOrThrow({ where: { id } })).documento).toBeNull();
    });
  });
});

/**
 * 🔒 La frontera de la que no sale nada personal (spec 006 US3, SC-003).
 *
 * Los agregados son lo unico que sube del municipio a la gobernacion y a la nacion. Esta
 * prueba recorre el resultado completo buscando cualquier rastro del nombre o del documento
 * que se registraron. Si alguien agrega un campo personal al `select` de
 * `agregadosPorMunicipio` —aunque sea "solo para depurar"— esto falla.
 */
describe.skipIf(!connectionString)("los agregados no llevan datos personales", () => {
  const CAMPOS_PROHIBIDOS = ["responsableNombre", "documento", "nombre", "cedula"];

  it("ni para la nacion, que es quien mas alcance tiene", async () => {
    const filas = await agregadosPorMunicipio({ alcance: "TODOS" });
    const texto = JSON.stringify(filas);

    for (const campo of CAMPOS_PROHIBIDOS) {
      expect(texto).not.toContain(`"${campo}"`);
    }
    // El nombre y el documento que este archivo registra tampoco pueden asomarse.
    expect(texto).not.toContain("Responsable de prueba");
    expect(texto).not.toContain(DOCUMENTO);
  });

  it("las filas solo traen cifras y el municipio al que pertenecen", async () => {
    const filas = await agregadosPorMunicipio({ alcance: "TODOS" });
    const permitidas = new Set([
      "municipioId",
      "municipio",
      "hogares",
      "personas",
      "ninez",
      "adultoMayor",
      "discapacidad",
      "hogaresConHeridos",
      "hogaresConFallecidos",
      "hogaresAtendidos",
      "hogaresSinAyuda",
    ]);
    for (const fila of filas) {
      for (const clave of Object.keys(fila)) expect(permitidas.has(clave)).toBe(true);
    }
  });
});
