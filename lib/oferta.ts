import { prisma } from "@/lib/db";
import type { DestinatarioOferta, EstadoOferta, TipoOferta } from "@/lib/generated/prisma/enums";

/**
 * Oferta institucional para damnificados.
 *
 * A diferencia de `Fondo`, esto no financia obras: son ayudas a personas y hogares.
 * El catalogo existe porque hoy la oferta esta repartida entre ministerios, entidades
 * adscritas, organismos de socorro y bancos, y ni el damnificado ni el funcionario
 * municipal tienen una lista completa de que existe y quien lo certifica.
 */

export function listarOferta() {
  return prisma.ofertaInstitucional.findMany({
    orderBy: [{ estado: "asc" }, { entidad: "asc" }],
  });
}

/**
 * Unica definicion de "esta habilitada".
 *
 * Solo lo VIGENTE puede ofrecerse, tramitarse o vincularse a un hogar. Lo ANUNCIADO
 * se registra para saber que viene, pero no se habilita hasta que haya claridad sobre
 * como se maneja.
 *
 * Vive aqui y en ningun otro lugar a proposito: si cada pantalla decidiera por su
 * cuenta que mostrar como disponible, bastaria que una se equivocara para mandar a
 * una familia a hacer una fila que no existe. En una emergencia eso no es un detalle
 * de interfaz, es una mañana perdida por alguien que duerme en una carpa.
 */
export function estaHabilitada(oferta: { estado: EstadoOferta }): boolean {
  return oferta.estado === "VIGENTE";
}

export function separarPorHabilitacion<T extends { estado: EstadoOferta }>(
  oferta: readonly T[],
): { habilitadas: T[]; noHabilitadas: T[] } {
  return {
    habilitadas: oferta.filter(estaHabilitada),
    noHabilitadas: oferta.filter((o) => !estaHabilitada(o)),
  };
}

/** Agrupa por etapa de la ruta de atencion, de lo inmediato a lo estructural. */
export const ORDEN_TIPO: TipoOferta[] = [
  "ALOJAMIENTO_TEMPORAL",
  "ALIMENTACION_Y_KITS",
  "SALUD",
  "INDEMNIZACION",
  "EVALUACION_TECNICA",
  "VIVIENDA",
  "NIÑEZ_Y_FAMILIA",
  "EMPLEO_E_INGRESOS",
  "SERVICIOS_PUBLICOS",
  "ALIVIO_FINANCIERO",
  "ALIVIO_TRIBUTARIO",
];

export const ETIQUETA_TIPO: Record<TipoOferta, string> = {
  ALOJAMIENTO_TEMPORAL: "Techo inmediato",
  ALIMENTACION_Y_KITS: "Alimentacion y kits",
  SALUD: "Salud",
  INDEMNIZACION: "Indemnizacion",
  EVALUACION_TECNICA: "Evaluacion tecnica",
  VIVIENDA: "Vivienda",
  NIÑEZ_Y_FAMILIA: "Niñez y familia",
  EMPLEO_E_INGRESOS: "Empleo e ingresos",
  SERVICIOS_PUBLICOS: "Servicios publicos",
  ALIVIO_FINANCIERO: "Alivios financieros",
  ALIVIO_TRIBUTARIO: "Alivios tributarios",
};

export const ETIQUETA_DESTINATARIO: Record<DestinatarioOferta, string> = {
  HOGAR: "Hogar damnificado",
  PERSONA: "Persona",
  EMPRESA: "Empresa",
  ENTIDAD_TERRITORIAL: "Entidad territorial",
};

export const ETIQUETA_ESTADO: Record<EstadoOferta, string> = {
  VIGENTE: "Vigente",
  ANUNCIADO: "Anunciado, sin reglamentar",
  CERRADO: "Cerrado",
};
