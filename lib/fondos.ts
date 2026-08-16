import { prisma } from "@/lib/db";
import type { AmbitoFondo, NivelTerritorial } from "@/lib/generated/prisma/enums";

/**
 * Que fondos puede usar cada nivel.
 *
 * Un municipio no puede declarar que gasta del FNGRD: ese fondo lo administra la
 * UNGRD y su aporte lo inscribe la nacion. Lo que si puede recibir cualquier nivel
 * es cooperacion o donacion externa, que no pertenece a ninguna escala del Estado
 * colombiano.
 *
 * La funcion es pura para poder probarla sin base de datos; la consulta va aparte.
 */
export function ambitosPara(nivel: NivelTerritorial): AmbitoFondo[] {
  const propio: Record<NivelTerritorial, AmbitoFondo> = {
    MUNICIPIO: "MUNICIPAL",
    DEPARTAMENTO: "DEPARTAMENTAL",
    NACION: "NACIONAL",
  };
  return [propio[nivel], "EXTERNO"];
}

export function listarFondosPara(nivel: NivelTerritorial) {
  return prisma.fondo.findMany({
    where: { vigente: true, ambito: { in: ambitosPara(nivel) } },
    orderBy: [{ ambito: "asc" }, { nombre: "asc" }],
  });
}

export function listarTodosLosFondos() {
  return prisma.fondo.findMany({
    where: { vigente: true },
    orderBy: [{ ambito: "asc" }, { nombre: "asc" }],
  });
}

export const ETIQUETA_AMBITO: Record<AmbitoFondo, string> = {
  MUNICIPAL: "Municipal",
  DEPARTAMENTAL: "Departamental",
  NACIONAL: "Nacional",
  EXTERNO: "Externo",
};

/** Orden de presentacion: de abajo hacia arriba, como escala la respuesta. */
export const ORDEN_AMBITO: AmbitoFondo[] = [
  "MUNICIPAL",
  "DEPARTAMENTAL",
  "NACIONAL",
  "EXTERNO",
];
