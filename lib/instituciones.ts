import type { NivelTerritorial } from "@/lib/generated/prisma/enums";

/**
 * Institucionalidad del Sistema Nacional de Gestion del Riesgo de Desastres
 * (Ley 1523 de 2012).
 *
 * No se almacena en la base porque no es un dato del proyecto sino una consecuencia
 * de la ley: dado el nivel de una entidad, su instancia de coordinacion y su entidad
 * rectora estan determinadas. Guardarlo seria duplicar algo que ya se sabe y abrir la
 * puerta a que una fila diga que el consejo de Buga es el CDGRD.
 */

export type Institucionalidad = {
  /** Instancia colegiada que decide en ese nivel. */
  instancia: string;
  siglaInstancia: string;
  /** Quien la preside, segun la Ley 1523. */
  preside: string;
  /** Entidad rectora del nivel. */
  rectora: string;
  norma: string;
};

const POR_NIVEL: Record<NivelTerritorial, Institucionalidad> = {
  MUNICIPIO: {
    instancia: "Consejo Municipal de Gestion del Riesgo de Desastres",
    siglaInstancia: "CMGRD",
    preside: "Alcalde",
    rectora: "Alcaldia municipal",
    norma: "Ley 1523 de 2012, art. 27 y 28",
  },
  DEPARTAMENTO: {
    instancia: "Consejo Departamental de Gestion del Riesgo de Desastres",
    siglaInstancia: "CDGRD",
    preside: "Gobernador",
    rectora: "Gobernacion departamental",
    norma: "Ley 1523 de 2012, art. 27 y 28",
  },
  NACION: {
    instancia: "Consejo Nacional de Gestion del Riesgo de Desastres",
    siglaInstancia: "CNGRD",
    preside: "Presidente de la Republica",
    rectora: "Unidad Nacional para la Gestion del Riesgo de Desastres (UNGRD)",
    norma: "Ley 1523 de 2012, art. 15 a 19",
  },
};

export function institucionalidadDe(nivel: NivelTerritorial): Institucionalidad {
  return POR_NIVEL[nivel];
}

/**
 * El municipio es el primer respondiente: atiende con recursos propios y solo
 * escala lo que excede su capacidad. Esa es la regla de la que nace nagomu.
 */
export const ORDEN_DE_RESPUESTA: NivelTerritorial[] = ["MUNICIPIO", "DEPARTAMENTO", "NACION"];
