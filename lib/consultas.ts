import { prisma } from "@/lib/db";
import { municipiosVisiblesPara } from "@/lib/authz";
import { priorizar, type Priorizada, type Priorizable } from "@/lib/prioridad";
import type { SesionActiva } from "@/lib/auth";
import type { EstadoObra } from "@/lib/generated/prisma/enums";

/**
 * Lectura de obras. Traduce el ambito del usuario a un filtro de base de datos y
 * entrega la lista ya priorizada.
 *
 * La lectura esta abierta a todo usuario autenticado (FR-024): el ambito de aqui
 * decide que se muestra por defecto, no que se puede ver. El detalle de una obra
 * concreta es accesible desde cualquier nivel.
 */

export type ObraEnLista = Priorizable & {
  nombre: string;
  ubicacion: string;
  estado: EstadoObra;
  municipio: string;
};

export async function listarObrasDe(sesion: SesionActiva): Promise<Priorizada<ObraEnLista>[]> {
  const ambito = municipiosVisiblesPara(sesion);

  const filtro =
    ambito.alcance === "PROPIO"
      ? { municipioId: ambito.municipioId }
      : ambito.alcance === "DEPARTAMENTO"
        ? { municipio: { departamentoId: ambito.departamentoId } }
        : {};

  const obras = await prisma.obra.findMany({
    where: { item: filtro },
    include: { item: { include: { municipio: { select: { nombre: true, nbi: true } } } } },
  });

  return priorizar(
    obras.map((obra) => ({
      id: obra.id,
      nombre: obra.item.nombre,
      ubicacion: obra.item.ubicacion,
      estado: obra.estado,
      municipio: obra.item.municipio.nombre,
      // Una obra siempre tiene categoria (es lo que la mete a la cola); el campo es
      // nullable a nivel de item porque los demas bienes no la llevan (spec 007).
      categoria: obra.item.categoria!,
      personasBeneficiadas: obra.item.personasBeneficiadas,
      mesesFueraDeServicio: obra.item.mesesFueraDeServicio,
      nbi: obra.item.municipio.nbi === null ? null : Number(obra.item.municipio.nbi),
      // El costo solo existe cuando un estudio lo determina, y eso llega en la
      // siguiente entrega. Hasta entonces no hay desempate por costo.
      costoPorBeneficiado: null,
      creadoEn: obra.creadoEn,
    })),
  );
}

/**
 * Punto para el mapa: lo minimo para dibujar un marcador y enlazar a la obra. Es una
 * consulta aparte de la priorizacion a proposito: el mapa no necesita puntaje ni cola,
 * y meter la geo en ese pipeline solo lo enredaria.
 */
export type PuntoMapa = {
  id: string;
  nombre: string;
  estado: EstadoObra;
  municipio: string;
  latitud: number;
  longitud: number;
};

/**
 * Items del ambito del usuario que TIENEN coordenada. Los que no la tienen no salen
 * aqui (pero siguen en la lista de /obras). El filtro por ambito se aplica en el
 * servidor (Principio II): un municipio solo ve sus puntos.
 */
export async function listarPuntosMapa(sesion: SesionActiva): Promise<PuntoMapa[]> {
  const ambito = municipiosVisiblesPara(sesion);

  const filtroItem =
    ambito.alcance === "PROPIO"
      ? { municipioId: ambito.municipioId }
      : ambito.alcance === "DEPARTAMENTO"
        ? { municipio: { departamentoId: ambito.departamentoId } }
        : {};

  const obras = await prisma.obra.findMany({
    where: { item: { ...filtroItem, latitud: { not: null }, longitud: { not: null } } },
    select: {
      id: true,
      estado: true,
      item: {
        select: {
          nombre: true,
          latitud: true,
          longitud: true,
          municipio: { select: { nombre: true } },
        },
      },
    },
  });

  return obras.map((obra) => ({
    id: obra.id,
    nombre: obra.item.nombre,
    estado: obra.estado,
    municipio: obra.item.municipio.nombre,
    latitud: obra.item.latitud!,
    longitud: obra.item.longitud!,
  }));
}

export async function obtenerObra(obraId: string) {
  return prisma.obra.findUnique({
    where: { id: obraId },
    include: {
      item: { include: { municipio: { select: { nombre: true, nbi: true } } } },
      costos: {
        orderBy: { creadoEn: "desc" },
        include: { registradoPor: { select: { nombre: true } } },
      },
      cambios: {
        orderBy: { creadoEn: "desc" },
        include: { usuario: { select: { nombre: true } } },
      },
      documentos: { select: { id: true } },
    },
  });
}

/**
 * El costo vigente es el mas reciente que nadie haya corregido. Los anteriores no
 * desaparecen: quedan en el historial, que es lo que permite ver que un estudio
 * posterior cambio la cifra y por cuanto.
 */
export function costoVigente<T extends { id: string; corrigeId: string | null }>(
  costos: readonly T[],
): T | null {
  const corregidos = new Set(costos.map((c) => c.corrigeId).filter(Boolean));
  return costos.find((c) => !corregidos.has(c.id)) ?? null;
}
