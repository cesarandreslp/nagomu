import { prisma } from "@/lib/db";
import { municipiosVisiblesPara } from "@/lib/authz";
import type { SesionActiva } from "@/lib/auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { Sector, EstadoAfectacion } from "@/lib/generated/prisma/enums";

/**
 * Bien afectado (spec 007). Cada afectacion tiene un SECTOR doliente —el ministerio o
 * secretaria que responde por ella en departamento y nacion— y un TIPO concreto dentro
 * del sector. El sector es una lista fija (los ministerios no se inventan); el tipo es
 * texto libre con sugerencias, porque los tipos concretos si pueden faltar.
 *
 * No se mezcla: un cultivo es Agricultura, una escuela Educacion, un puente Transporte,
 * un muro de contencion Gestion del riesgo, un bien patrimonial Cultura. El reporte sube
 * al doliente correcto.
 *
 * Clasificacion publico/reservado (enmienda 4.0.0): la DIRECCION (`ubicacion`) es
 * reservada y solo la ve el municipio dueño; el punto y el lugar general
 * (corregimiento/vereda) son publicos. El corte publico vive en lib/censo.ts.
 */

/** El doliente de cada sector: a que ministerio/secretaria sube el reporte. */
export const ETIQUETA_SECTOR: Record<Sector, string> = {
  VIVIENDA: "Vivienda (MinVivienda)",
  TRANSPORTE: "Transporte y vías (MinTransporte / INVÍAS)",
  GESTION_RIESGO: "Gestión del riesgo (UNGRD)",
  EDUCACION: "Educación (MinEducación)",
  SALUD: "Salud (MinSalud)",
  AGUA_SANEAMIENTO: "Agua y saneamiento (MinVivienda)",
  AGROPECUARIO: "Agropecuario (MinAgricultura)",
  CULTURA_PATRIMONIO: "Cultura y patrimonio (MinCultura)",
  COMERCIO: "Comercio (MinComercio)",
  DEPORTE_RECREACION: "Deporte y recreación (MinDeporte)",
};

/**
 * Tipos concretos sugeridos por sector. Son solo sugerencias (datalist): el funcionario
 * puede escribir uno que no este aqui. El sector es lo que importa para el rollup.
 */
export const SUGERENCIAS_TIPO: Record<Sector, string[]> = {
  VIVIENDA: ["Vivienda"],
  TRANSPORTE: ["Carretera", "Puente", "Puente colgante", "Vía terciaria"],
  GESTION_RIESGO: ["Muro de contención", "Obra de mitigación", "Gavión"],
  EDUCACION: ["Escuela", "Colegio"],
  SALUD: ["Hospital", "Puesto de salud", "Centro de salud"],
  AGUA_SANEAMIENTO: ["Acueducto", "Alcantarillado", "Bocatoma", "Planta de tratamiento"],
  AGROPECUARIO: [
    "Cultivo",
    "Animales (semovientes)",
    "Estanque acuícola",
    "Alimento animal",
    "Bodega",
    "Corral",
  ],
  CULTURA_PATRIMONIO: ["Bien patrimonial / histórico", "Casa de la cultura", "Biblioteca"],
  COMERCIO: ["Establecimiento comercial", "Local", "Bodega comercial"],
  DEPORTE_RECREACION: ["Escenario deportivo", "Parque", "Polideportivo"],
};

/**
 * Sectores de EDIFICACION: se clasifican por habitabilidad. El resto (vías, muros,
 * acueductos, cultivos, animales) se clasifica por perdida (perdido/parcial).
 */
const SECTORES_EDIFICACION: Sector[] = [
  "VIVIENDA",
  "EDUCACION",
  "SALUD",
  "COMERCIO",
  "CULTURA_PATRIMONIO",
  "DEPORTE_RECREACION",
];

/**
 * Sectores de OBRA PUBLICA: un bien de estos sectores, con categoria, entra a la cola de
 * priorizacion y cofinanciacion (spec 001). Vivienda, comercio y agropecuario NO: se
 * caracterizan (perdida a dimensionar), pero no son obras publicas reconstruibles.
 */
const SECTORES_OBRA: Sector[] = [
  "TRANSPORTE",
  "GESTION_RIESGO",
  "EDUCACION",
  "SALUD",
  "AGUA_SANEAMIENTO",
  "CULTURA_PATRIMONIO",
  "DEPORTE_RECREACION",
];

export const ETIQUETA_ESTADO: Record<EstadoAfectacion, string> = {
  HABITABLE: "Habitable",
  REPARABLE: "Reparable",
  DEMOLER: "A demoler",
  PERDIDO: "Perdido / destruido",
  PARCIAL: "Parcial",
};

const ESTADOS_EDIFICACION: EstadoAfectacion[] = ["HABITABLE", "REPARABLE", "DEMOLER"];
const ESTADOS_PERDIDA: EstadoAfectacion[] = ["PERDIDO", "PARCIAL"];

export function estadosValidosPara(sector: Sector): EstadoAfectacion[] {
  return SECTORES_EDIFICACION.includes(sector) ? ESTADOS_EDIFICACION : ESTADOS_PERDIDA;
}

export function estadoValidoPara(sector: Sector, estado: EstadoAfectacion): boolean {
  return estadosValidosPara(sector).includes(estado);
}

/** Un bien de un sector de obra publica (con categoria) se vuelve Obra con cola. */
export function sectorEsObraPublica(sector: Sector): boolean {
  return SECTORES_OBRA.includes(sector);
}

/** Lugar general publico: corregimiento y/o vereda. Nunca la direccion. */
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
  sector: Sector;
  tipoBien: string;
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
 * Inventario de bienes de un municipio (todos los sectores). Incluye la direccion
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
      sector: true,
      tipoBien: true,
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
    sector: b.sector,
    tipoBien: b.tipoBien,
    estadoAfectacion: b.estadoAfectacion,
    ubicacion: b.ubicacion,
    corregimiento: b.corregimiento,
    vereda: b.vereda,
    tienePunto: b.latitud !== null && b.longitud !== null,
    esObra: b.obra !== null,
    obraId: b.obra?.id ?? null,
  }));
}
