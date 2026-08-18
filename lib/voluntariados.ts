import { prisma } from "@/lib/db";
import { municipiosVisiblesPara } from "@/lib/authz";
import type { SesionActiva } from "@/lib/auth";
import {
  transicionVerificacion,
  type AccionVerificacion,
  type TransicionVerificacion,
} from "@/lib/verificacion";
import type { EstadoVerificacion } from "@/lib/generated/prisma/enums";

/** Punto de un voluntariado verificado para el mapa (spec 003, US3). */
export type PuntoVoluntariado = {
  id: string;
  nombre: string;
  municipio: string;
  latitud: number;
  longitud: number;
};

/**
 * Voluntariados que aparecen en el mapa: VERIFICADOS, con coordenada, dentro del ambito del
 * usuario que mira (un municipio ve los suyos; la gobernacion, los de su departamento). Un
 * pendiente, rechazado o sin coordenada NO sale: no es oficial (Principio II + regla de US3).
 */
export async function listarPuntosVoluntariados(sesion: SesionActiva): Promise<PuntoVoluntariado[]> {
  const ambito = municipiosVisiblesPara(sesion);

  const filtroMunicipio =
    ambito.alcance === "PROPIO"
      ? { municipioOperacionId: ambito.municipioId }
      : ambito.alcance === "DEPARTAMENTO"
        ? { municipioOperacion: { departamentoId: ambito.departamentoId } }
        : {};

  const actores = await prisma.actor.findMany({
    where: {
      tipo: "VOLUNTARIADO",
      estadoVerificacion: "VERIFICADO",
      latitud: { not: null },
      longitud: { not: null },
      ...filtroMunicipio,
    },
    select: {
      id: true,
      nombre: true,
      latitud: true,
      longitud: true,
      municipioOperacion: { select: { nombre: true } },
    },
  });

  return actores.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    municipio: a.municipioOperacion?.nombre ?? "—",
    latitud: a.latitud!,
    longitud: a.longitud!,
  }));
}

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
