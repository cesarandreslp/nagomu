import type { EstadoObra } from "@/lib/generated/prisma/enums";
import { CERO } from "@/lib/dinero";
import type { Brecha } from "@/lib/brecha";

/**
 * Ciclo de vida de una obra.
 *
 * Funcion pura: no consulta la base y se prueba sin infraestructura.
 *
 * El orden no es burocracia. Una obra no puede pasar a costeada sin haber pasado por
 * estudios, porque el costo lo entrega el estudio; y no puede ejecutarse sin costo,
 * porque no habria contra que medir el avance ni cuanto falta.
 */

export const SECUENCIA: EstadoObra[] = [
  "IDENTIFICADO",
  "EN_ESTUDIOS",
  "COSTEADO",
  "EN_EJECUCION",
  "ENTREGADA",
];

export const ETIQUETA_ESTADO: Record<EstadoObra, string> = {
  IDENTIFICADO: "Identificado",
  EN_ESTUDIOS: "En estudios",
  COSTEADO: "Costeado",
  EN_EJECUCION: "En ejecucion",
  ENTREGADA: "Entregada",
};

export type Transicion =
  | { valida: true }
  | { valida: false; motivo: string };

const VALIDA: Transicion = { valida: true };

/** Estado que sigue, o null si ya esta al final. */
export function siguienteEstado(actual: EstadoObra): EstadoObra | null {
  const i = SECUENCIA.indexOf(actual);
  return SECUENCIA[i + 1] ?? null;
}

/**
 * Solo se avanza un paso por vez y solo hacia adelante.
 *
 * No hay marcha atras: una obra que se devuelve no cambia de estado hacia atras
 * borrando lo ocurrido, deja el asiento del cambio y sigue. La historia de una obra
 * publica tiene que poder leerse completa.
 */
export function puedeTransicionar(
  actual: EstadoObra,
  nuevo: EstadoObra,
  contexto: { tieneCosto: boolean },
): Transicion {
  if (actual === nuevo) {
    return { valida: false, motivo: `La obra ya esta en estado ${ETIQUETA_ESTADO[actual]}` };
  }

  const desde = SECUENCIA.indexOf(actual);
  const hasta = SECUENCIA.indexOf(nuevo);

  if (hasta < desde) {
    return {
      valida: false,
      motivo: `No se puede volver de ${ETIQUETA_ESTADO[actual]} a ${ETIQUETA_ESTADO[nuevo]}`,
    };
  }

  if (hasta > desde + 1) {
    const faltante = SECUENCIA[desde + 1]!;
    return {
      valida: false,
      motivo: `Falta pasar por ${ETIQUETA_ESTADO[faltante]} antes de ${ETIQUETA_ESTADO[nuevo]}`,
    };
  }

  if (nuevo === "COSTEADO" && !contexto.tieneCosto) {
    return {
      valida: false,
      motivo: "Para pasar a Costeado hay que registrar el valor que entrego el estudio",
    };
  }

  return VALIDA;
}

/** Desde COSTEADO en adelante hay cifra de dinero y tiene sentido hablar de brecha. */
export function tieneCifrasDeDinero(estado: EstadoObra): boolean {
  return SECUENCIA.indexOf(estado) >= SECUENCIA.indexOf("COSTEADO");
}

/**
 * Etiqueta ciudadana del estado (spec 005). Es solo presentacion: por debajo el estado del
 * modelo no cambia. Traduce el ciclo tecnico a como lo entiende quien no vive en el sistema.
 */
export const ETIQUETA_CIUDADANA: Record<EstadoObra, string> = {
  IDENTIFICADO: "Impactado",
  EN_ESTUDIOS: "En estudio",
  COSTEADO: "Costeado",
  EN_EJECUCION: "En intervencion",
  ENTREGADA: "Beneficiado",
};

export type SituacionFinanciacion =
  | "PENDIENTE_ESTUDIOS"
  | "SIN_FINANCIAR"
  | "PARCIAL"
  | "FINANCIADA";

export const ETIQUETA_FINANCIACION: Record<SituacionFinanciacion, string> = {
  PENDIENTE_ESTUDIOS: "Pendiente de estudios",
  SIN_FINANCIAR: "Sin financiar",
  PARCIAL: "Financiacion parcial",
  FINANCIADA: "Financiada",
};

/**
 * Situacion de financiacion derivada de la brecha ya calculada (spec 001). No recalcula nada
 * distinto: solo la clasifica para mostrarla. Sin costo aun no hay brecha ("pendiente de
 * estudios"); con costo, se mira cuanto se ha aportado.
 */
export function situacionFinanciacion(brecha: Brecha): SituacionFinanciacion {
  if (brecha.costo === null) return "PENDIENTE_ESTUDIOS";
  const aportado = brecha.girado + brecha.comprometido;
  if (aportado <= CERO) return "SIN_FINANCIAR";
  if (brecha.brecha <= CERO) return "FINANCIADA";
  return "PARCIAL";
}
