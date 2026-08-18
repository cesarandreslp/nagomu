import type {
  EstadoVerificacion,
  ResultadoVerificacionVoluntariado,
} from "@/lib/generated/prisma/enums";

/**
 * Reglas de verificacion de un voluntariado (spec 003).
 *
 * Modulo puro: no conoce Prisma ni la base, se prueba sin infraestructura. El estado vigente
 * lo lleva `Actor.estadoVerificacion`; cada cambio inserta un asiento inmutable en
 * `VerificacionVoluntariado`. `REVOCADO` no es un estado: es el resultado historico de
 * retirar una verificacion, que deja el estado en `RECHAZADO`.
 */

/** Verbos canonicos que este feature escribe en la auditoria (Principio I). */
export const VERBOS = {
  registrar: "voluntariado.registrar",
  actualizar: "voluntariado.actualizar",
  verificar: "voluntariado.verificar",
  rechazar: "voluntariado.rechazar",
  revocar: "voluntariado.revocar",
} as const;

export type AccionVerificacion = "verificar" | "rechazar" | "revocar";

export type TransicionVerificacion =
  | {
      valida: true;
      estadoNuevo: EstadoVerificacion;
      resultado: ResultadoVerificacionVoluntariado;
      requiereMotivo: boolean;
    }
  | { valida: false; motivo: string };

/**
 * Decide si una accion del municipio es valida sobre el estado actual, y con que resultado
 * queda el asiento. Rechazar y revocar exigen motivo; verificar no.
 */
export function transicionVerificacion(
  actual: EstadoVerificacion,
  accion: AccionVerificacion,
): TransicionVerificacion {
  switch (accion) {
    case "verificar":
      // Se puede verificar algo pendiente o reconsiderar algo rechazado.
      if (actual === "PENDIENTE" || actual === "RECHAZADO") {
        return {
          valida: true,
          estadoNuevo: "VERIFICADO",
          resultado: "VERIFICADO",
          requiereMotivo: false,
        };
      }
      return { valida: false, motivo: "El voluntariado ya esta verificado" };

    case "rechazar":
      // Rechazar es negar una solicitud que aun no se aprobo.
      if (actual === "PENDIENTE") {
        return {
          valida: true,
          estadoNuevo: "RECHAZADO",
          resultado: "RECHAZADO",
          requiereMotivo: true,
        };
      }
      return { valida: false, motivo: "Solo se rechaza un voluntariado pendiente" };

    case "revocar":
      // Revocar es retirar una verificacion ya concedida.
      if (actual === "VERIFICADO") {
        return {
          valida: true,
          estadoNuevo: "RECHAZADO",
          resultado: "REVOCADO",
          requiereMotivo: true,
        };
      }
      return { valida: false, motivo: "Solo se revoca un voluntariado verificado" };
  }
}
