import { prisma } from "@/lib/db";
import type { SesionActiva } from "@/lib/auth";
import {
  transicionVerificacion,
  type AccionVerificacion,
  type TransicionVerificacion,
} from "@/lib/verificacion";
import type { EstadoVerificacion } from "@/lib/generated/prisma/enums";

/**
 * Consultas y escritura de la verificacion de voluntariados (spec 003, US2). El filtro por
 * `municipioOperacionId` es lo que hace que un municipio solo vea y decida sobre los
 * voluntariados de su territorio (Principio II); vive en el servidor, no en la vista.
 */

/** Voluntariados que declararon operar en el municipio del funcionario, con su ultima decision. */
export async function voluntariadosDelMunicipio(sesion: SesionActiva) {
  return prisma.actor.findMany({
    where: { tipo: "VOLUNTARIADO", municipioOperacionId: sesion.entidadId },
    select: {
      id: true,
      nombre: true,
      contacto: true,
      direccion: true,
      latitud: true,
      longitud: true,
      estadoVerificacion: true,
      verificaciones: {
        orderBy: { creadoEn: "desc" },
        select: {
          resultado: true,
          motivo: true,
          creadoEn: true,
          funcionario: { select: { nombre: true } },
        },
      },
    },
    orderBy: [{ estadoVerificacion: "asc" }, { nombre: "asc" }],
  });
}

/**
 * Aplica una decision del municipio: inserta el asiento inmutable y actualiza el estado
 * vigente en una sola transaccion (como Obra/Intervencion). Devuelve la transicion sin lanzar,
 * para que la accion redirija con el error correcto si es invalida o falta motivo.
 */
export async function registrarDecision(args: {
  actorId: string;
  municipioId: string;
  funcionarioId: string;
  estadoActual: EstadoVerificacion;
  accion: AccionVerificacion;
  motivo: string | null;
}): Promise<TransicionVerificacion> {
  const transicion = transicionVerificacion(args.estadoActual, args.accion);
  if (!transicion.valida) return transicion;
  if (transicion.requiereMotivo && !args.motivo) {
    return { valida: false, motivo: "Falta el motivo" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.verificacionVoluntariado.create({
      data: {
        actorId: args.actorId,
        municipioId: args.municipioId,
        funcionarioId: args.funcionarioId,
        resultado: transicion.resultado,
        motivo: args.motivo,
      },
    });
    await tx.actor.update({
      where: { id: args.actorId },
      data: { estadoVerificacion: transicion.estadoNuevo },
    });
  });

  return transicion;
}
