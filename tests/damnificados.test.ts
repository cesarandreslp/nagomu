import { PrismaNeon } from "@prisma/adapter-neon";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/lib/generated/prisma/client";
import {
  agregadosPorMunicipio,
  crearHogar,
  otorgarAutorizacion,
  puedeGuardarDocumento,
  quitarNecesidadSalud,
  registrarNecesidadSalud,
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
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: connectionString! }),
});

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
  async function enTransaccion(
    caso: (
      tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
      ctx: { municipioId: string; usuarioId: string },
    ) => Promise<void>,
  ) {
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

/**
 * El candado de la necesidad de salud (spec 007 US2, enmienda constitucional 4.0.0).
 *
 * La enmienda permitio UN indicador categorizado con una condicion explicita: autorizacion
 * de tratamiento otorgada. A diferencia del documento —donde el hogar se registra igual, sin
 * el documento— aqui no hay registro parcial: sin autorizacion el dato de salud NO existe en
 * la base de ninguna forma. Estas pruebas existen para que esa diferencia no se pierda.
 */
describe.skipIf(!connectionString)("necesidad de salud ⇒ autorizacion", () => {
  async function enTransaccion(
    caso: (
      tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
      ctx: { municipioId: string; usuarioId: string },
    ) => Promise<void>,
  ) {
    await prisma
      .$transaction(async (tx) => {
        const municipio = await tx.entidadTerritorial.create({
          data: { nombre: "MUNICIPIO DE PRUEBA — salud", nivel: "MUNICIPIO" },
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
    personasTotal: 3,
    personasNinez: 1,
    personasAdultoMayor: 1,
    personasDiscapacidad: 0,
    hayHeridos: 0,
    hayFallecidos: 0,
  });

  it("sin autorizacion NO se guarda, y no queda ninguna fila", async () => {
    await enTransaccion(async (tx, ctx) => {
      const { id } = await crearHogar(base(ctx.municipioId, ctx.usuarioId), tx);

      const resultado = await registrarNecesidadSalud(
        id,
        ctx.municipioId,
        "DIALISIS",
        ctx.usuarioId,
        tx,
      );

      expect(resultado).toEqual({ ok: false, motivo: "sin-autorizacion" });
      expect(await tx.necesidadSalud.count({ where: { hogarId: id } })).toBe(0);
    });
  });

  it("con autorizacion negada tampoco", async () => {
    await enTransaccion(async (tx, ctx) => {
      const { id } = await crearHogar(
        {
          ...base(ctx.municipioId, ctx.usuarioId),
          autorizacion: { otorgada: false, medio: "VERBAL" },
        },
        tx,
      );

      const resultado = await registrarNecesidadSalud(
        id,
        ctx.municipioId,
        "OXIGENO",
        ctx.usuarioId,
        tx,
      );

      expect(resultado.ok).toBe(false);
      expect(await tx.necesidadSalud.count({ where: { hogarId: id } })).toBe(0);
    });
  });

  it("con autorizacion otorgada se guarda solo la categoria", async () => {
    await enTransaccion(async (tx, ctx) => {
      const { id } = await crearHogar(
        {
          ...base(ctx.municipioId, ctx.usuarioId),
          autorizacion: { otorgada: true, medio: "FIRMA" },
        },
        tx,
      );

      const resultado = await registrarNecesidadSalud(
        id,
        ctx.municipioId,
        "EMBARAZO_RIESGO",
        ctx.usuarioId,
        tx,
      );
      expect(resultado.ok).toBe(true);

      const fila = await tx.necesidadSalud.findFirstOrThrow({ where: { hogarId: id } });
      expect(fila.tipo).toBe("EMBARAZO_RIESGO");

      // Lo que NO existe es tan importante como lo que si: la fila no tiene ningun campo
      // donde quepa un diagnostico. Si alguien agrega uno, esto falla.
      const campos = Object.keys(fila).sort();
      expect(campos).toEqual(["creadoEn", "hogarId", "id", "registradoPorId", "tipo"]);
    });
  });

  it("no se registra salud sobre un hogar de otro municipio", async () => {
    await enTransaccion(async (tx, ctx) => {
      const otro = await tx.entidadTerritorial.create({
        data: { nombre: "OTRO MUNICIPIO — salud", nivel: "MUNICIPIO" },
      });
      const { id } = await crearHogar(
        {
          ...base(ctx.municipioId, ctx.usuarioId),
          autorizacion: { otorgada: true, medio: "FIRMA" },
        },
        tx,
      );

      const resultado = await registrarNecesidadSalud(id, otro.id, "DIALISIS", ctx.usuarioId, tx);

      expect(resultado).toEqual({ ok: false, motivo: "no-existe" });
      expect(await tx.necesidadSalud.count({ where: { hogarId: id } })).toBe(0);
    });
  });

  it("quitar una necesidad solo funciona desde su propio municipio", async () => {
    await enTransaccion(async (tx, ctx) => {
      const otro = await tx.entidadTerritorial.create({
        data: { nombre: "OTRO MUNICIPIO — quitar salud", nivel: "MUNICIPIO" },
      });
      const { id } = await crearHogar(
        {
          ...base(ctx.municipioId, ctx.usuarioId),
          autorizacion: { otorgada: true, medio: "FIRMA" },
        },
        tx,
      );
      const creada = await registrarNecesidadSalud(
        id,
        ctx.municipioId,
        "CONDICION_CRONICA",
        ctx.usuarioId,
        tx,
      );
      const necesidadId = creada.ok ? creada.id : "";

      expect(await quitarNecesidadSalud(necesidadId, otro.id, tx)).toBe(false);
      expect(await tx.necesidadSalud.count({ where: { hogarId: id } })).toBe(1);

      expect(await quitarNecesidadSalud(necesidadId, ctx.municipioId, tx)).toBe(true);
      expect(await tx.necesidadSalud.count({ where: { hogarId: id } })).toBe(0);
    });
  });
});
