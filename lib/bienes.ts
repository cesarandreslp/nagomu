import { prisma } from "@/lib/db";
import { municipiosVisiblesPara } from "@/lib/authz";
import type { SesionActiva } from "@/lib/auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import type {
  TipoBien,
  SubtipoBien,
  EstadoAfectacion,
} from "@/lib/generated/prisma/enums";

/**
 * Bien afectado (spec 007). Generaliza el inventario mas alla de la infraestructura
 * publica: vivienda, comercio, estructura publica y el mundo agropecuario. Solo la
 * estructura publica (con categoria) se vuelve una Obra con cola (spec 001); lo demas
 * se caracteriza pero no entra a la fila de reconstruccion cofinanciable.
 *
 * Clasificacion publico/reservado (enmienda 4.0.0): la DIRECCION (`ubicacion`) es
 * reservada y solo la ve el municipio dueño; el punto y el lugar general
 * (corregimiento/vereda) son publicos. El corte publico vive en lib/censo.ts.
 */

export const ETIQUETA_TIPO_BIEN: Record<TipoBien, string> = {
  VIVIENDA: "Vivienda",
  COMERCIO: "Comercio",
  ESTRUCTURA_PUBLICA: "Estructura publica",
  AGROPECUARIO: "Agropecuario",
};

export const ETIQUETA_SUBTIPO: Record<SubtipoBien, string> = {
  CULTIVO: "Cultivo",
  MAQUINARIA: "Maquinaria",
  BODEGA: "Bodega",
  CORRAL: "Corral",
  ANIMALES: "Animales",
  ESTANQUE: "Estanque / laguna",
  ALIMENTO_ANIMAL: "Alimento animal",
};

export const ETIQUETA_ESTADO: Record<EstadoAfectacion, string> = {
  HABITABLE: "Habitable",
  REPARABLE: "Reparable",
  DEMOLER: "A demoler",
  PERDIDO: "Perdido",
  PARCIAL: "Parcial",
};

/**
 * Estados validos por tipo de bien. Las estructuras se clasifican por habitabilidad;
 * lo productivo (agropecuario), por perdida. Un cultivo no es "habitable" ni una
 * vivienda esta "perdida" en el sentido productivo: mezclarlos haria ilegible el censo.
 */
const ESTADOS_ESTRUCTURA: EstadoAfectacion[] = ["HABITABLE", "REPARABLE", "DEMOLER"];
const ESTADOS_PRODUCTIVO: EstadoAfectacion[] = ["PERDIDO", "PARCIAL"];

export function estadosValidosPara(tipoBien: TipoBien): EstadoAfectacion[] {
  return tipoBien === "AGROPECUARIO" ? ESTADOS_PRODUCTIVO : ESTADOS_ESTRUCTURA;
}

export function estadoValidoPara(tipoBien: TipoBien, estado: EstadoAfectacion): boolean {
  return estadosValidosPara(tipoBien).includes(estado);
}

/** El subtipo solo aplica —y es obligatorio— cuando el bien es agropecuario. */
export function subtipoAplicaA(tipoBien: TipoBien): boolean {
  return tipoBien === "AGROPECUARIO";
}

/** Lugar general publico: vereda dentro de corregimiento, o lo que haya. */
export function lugarGeneral(bien: {
  corregimiento: string | null;
  vereda: string | null;
}): string | null {
  const partes = [bien.corregimiento, bien.vereda].filter(Boolean);
  return partes.length ? partes.join(" · ") : null;
}

export type BienEnLista = {
  id: string;
  nombre: string;
  tipoBien: TipoBien;
  subtipoBien: SubtipoBien | null;
  estadoAfectacion: EstadoAfectacion | null;
  /** RESERVADO: solo se entrega al municipio dueño desde esta consulta. */
  ubicacion: string;
  corregimiento: string | null;
  vereda: string | null;
  tienePunto: boolean;
  esObra: boolean;
  obraId: string | null;
};

/**
 * Inventario de bienes de un municipio (todos los tipos). Incluye la direccion
 * (reservada) porque el que consulta es el municipio dueño; el corte publico es otro
 * (lib/censo.ts). Solo tiene sentido para nivel MUNICIPIO: hacia arriba van agregados.
 */
export async function listarBienesDe(
  sesion: SesionActiva,
  db: Prisma.TransactionClient = prisma,
): Promise<BienEnLista[]> {
  const ambito = municipiosVisiblesPara(sesion);
  if (ambito.alcance !== "PROPIO") return [];

  const bienes = await db.itemInventario.findMany({
    where: { municipioId: ambito.municipioId },
    orderBy: { creadoEn: "desc" },
    select: {
      id: true,
      nombre: true,
      tipoBien: true,
      subtipoBien: true,
      estadoAfectacion: true,
      ubicacion: true,
      corregimiento: true,
      vereda: true,
      latitud: true,
      longitud: true,
      obra: { select: { id: true } },
    },
  });

  return bienes.map((b) => ({
    id: b.id,
    nombre: b.nombre,
    tipoBien: b.tipoBien,
    subtipoBien: b.subtipoBien,
    estadoAfectacion: b.estadoAfectacion,
    ubicacion: b.ubicacion,
    corregimiento: b.corregimiento,
    vereda: b.vereda,
    tienePunto: b.latitud !== null && b.longitud !== null,
    esObra: b.obra !== null,
    obraId: b.obra?.id ?? null,
  }));
}
