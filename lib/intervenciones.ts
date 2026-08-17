import type { EstadoIntervencion } from "@/lib/generated/prisma/enums";

/**
 * Ciclo de vida de una intervencion de un tercero.
 *
 * Funcion pura, sin base de datos.
 *
 * La regla que sostiene todo: el valor equivalente cuenta como **comprometido** al
 * aprobarse y como **ejecutado** solo cuando el municipio recibe a satisfaccion. Sin
 * ese freno cualquiera declara "yo arregle la escuela", la brecha se cierra sola en
 * pantalla y nadie reviso nada. Y si una verificacion sale mal y se suspende, la
 * brecha se reabre: el sistema no puede dar por resuelto algo que quedo mal hecho.
 */

export const ETIQUETA_INTERVENCION: Record<EstadoIntervencion, string> = {
  SOLICITADA: "Solicitada",
  APROBADA: "Aprobada",
  EN_EJECUCION: "En ejecucion",
  RECIBIDA: "Recibida",
  RECHAZADA: "Rechazada",
  SUSPENDIDA: "Suspendida",
};

const TRANSICIONES: Record<EstadoIntervencion, EstadoIntervencion[]> = {
  SOLICITADA: ["APROBADA", "RECHAZADA"],
  APROBADA: ["EN_EJECUCION", "SUSPENDIDA"],
  EN_EJECUCION: ["RECIBIDA", "SUSPENDIDA"],
  // Una suspension no es el final: se corrige lo observado y se retoma.
  SUSPENDIDA: ["EN_EJECUCION"],
  RECIBIDA: [],
  RECHAZADA: [],
};

/** Estados que obligan a explicar por que. */
export const EXIGEN_MOTIVO: EstadoIntervencion[] = ["RECHAZADA", "SUSPENDIDA"];

export type Transicion = { valida: true } | { valida: false; motivo: string };

export function puedeTransicionar(
  actual: EstadoIntervencion,
  nuevo: EstadoIntervencion,
  motivo: string | null,
): Transicion {
  if (!TRANSICIONES[actual].includes(nuevo)) {
    const posibles = TRANSICIONES[actual];
    return {
      valida: false,
      motivo:
        posibles.length === 0
          ? `Una intervencion ${ETIQUETA_INTERVENCION[actual].toLowerCase()} ya no cambia de estado`
          : `Desde ${ETIQUETA_INTERVENCION[actual]} solo se puede pasar a ${posibles
              .map((e) => ETIQUETA_INTERVENCION[e])
              .join(" o ")}`,
    };
  }

  if (EXIGEN_MOTIVO.includes(nuevo) && !motivo?.trim()) {
    return {
      valida: false,
      motivo: `Pasar a ${ETIQUETA_INTERVENCION[nuevo]} exige decir por que`,
    };
  }

  return { valida: true };
}

export function transicionesPosibles(actual: EstadoIntervencion): EstadoIntervencion[] {
  return TRANSICIONES[actual];
}

/**
 * Cuanto pesa una intervencion sobre la brecha, segun su estado.
 *
 * - Aprobada o en ejecucion: alguien se comprometio a hacerlo, pero todavia no esta.
 * - Recibida: el municipio verifico y lo dio por bueno. Solo aqui cuenta como hecho.
 * - Solicitada, rechazada o suspendida: no cuenta. La suspendida, ademas, reabre la
 *   brecha que ya habia dejado de contar.
 */
export function cuentaComo(
  estado: EstadoIntervencion,
): "EJECUTADO" | "COMPROMETIDO" | "NADA" {
  if (estado === "RECIBIDA") return "EJECUTADO";
  if (estado === "APROBADA" || estado === "EN_EJECUCION") return "COMPROMETIDO";
  return "NADA";
}

/** Una intervencion aprobada cuyo plazo vencio sin recibirse. */
export function estaVencida(
  estado: EstadoIntervencion,
  plazoComprometido: Date,
  hoy: Date,
): boolean {
  if (estado !== "APROBADA" && estado !== "EN_EJECUCION") return false;
  return plazoComprometido.getTime() < hoy.getTime();
}
