import { prisma } from "@/lib/db";
import type { SesionActiva } from "@/lib/auth";
import type { NivelTerritorial } from "@/lib/generated/prisma/enums";

/**
 * Registro append-only (Principio I de la constitucion).
 *
 * Se anota tanto lo permitido como lo rechazado: un intento de una entidad de tocar
 * datos de otra es exactamente el hecho que una auditoria posterior necesita ver.
 *
 * La tabla tiene un disparador que rechaza UPDATE y DELETE, asi que esta funcion es
 * el unico camino por el que la auditoria puede crecer.
 */

/**
 * Lo minimo que la auditoria necesita saber de quien actua. Se acepta una sesion
 * completa, pero tambien un actor recien identificado que aun no tiene sesion (el
 * caso del inicio de sesion mismo), o `null` en acciones del sistema.
 */
export type ActorAuditoria = Pick<SesionActiva, "usuarioId" | "entidadId" | "nivel"> | null;

export type Anotacion = {
  /** Verbo canonico: `obra.crear`, `aporte.registrar`, `intervencion.aprobar`. */
  accion: string;
  objetivoTipo: string;
  objetivoId?: string | null;
  /** Instantanea de lo relevante. NUNCA datos personales (Principio IV). */
  datos?: Record<string, unknown>;
};

async function anotar(
  actor: ActorAuditoria,
  anotacion: Anotacion,
  resultado: "PERMITIDO" | "RECHAZADO",
  motivoRechazo?: string,
): Promise<void> {
  await prisma.registroAuditoria.create({
    data: {
      usuarioId: actor?.usuarioId ?? null,
      entidadId: actor?.entidadId ?? null,
      nivel: (actor?.nivel ?? null) as NivelTerritorial | null,
      accion: anotacion.accion,
      objetivoTipo: anotacion.objetivoTipo,
      objetivoId: anotacion.objetivoId ?? null,
      resultado,
      motivoRechazo: motivoRechazo ?? null,
      datos: (anotacion.datos ?? {}) as object,
    },
  });
}

export function registrarPermitido(
  actor: ActorAuditoria,
  anotacion: Anotacion,
): Promise<void> {
  return anotar(actor, anotacion, "PERMITIDO");
}

export function registrarRechazo(
  actor: ActorAuditoria,
  anotacion: Anotacion,
  motivo: string,
): Promise<void> {
  return anotar(actor, anotacion, "RECHAZADO", motivo);
}
