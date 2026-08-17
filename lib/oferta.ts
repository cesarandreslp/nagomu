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
