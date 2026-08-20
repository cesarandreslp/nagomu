import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { Sector } from "@/lib/generated/prisma/enums";

/**
 * Situacion del municipio durante la atencion (spec 009).
 *
 * La portada de un municipio no es su inventario de obras: eso es lo que viene despues, con
 * la reconstruccion. Mientras se atiende el siniestro lo que importa es a cuanta gente hay
 * que atender, que se dañó, y —sobre todo— **que falta por hacer**.
 *
 * El orden de esta pantalla es el mismo de la regla de prioridad del proyecto: primero las
 * personas, despues los bienes, despues la plata. Un tablero que abre con cifras de dinero
 * mientras hay familias sin ubicar esta diciendo lo que le importa.
 *
 * `pendientesDe` es una funcion pura: recibe cifras y devuelve la lista de lo que falta.
 * Se prueba sin base de datos, y es la parte que decide que ve un alcalde al entrar.
 */

export type CifrasSituacion = {
  hogares: number;
  personas: number;
  ninez: number;
  adultoMayor: number;
  discapacidad: number;
  heridos: number;
  fallecidos: number;
  /** Sin autorizacion de tratamiento: bloquea documento y necesidad de salud (Principio IV). */
  hogaresSinAutorizacion: number;
  /** Todavia no tienen ninguna ayuda asignada. */
  hogaresSinAyuda: number;
  necesidadesSalud: number;
  ayudasPendientes: number;
  bienes: number;
  bienesSinCoordenada: number;
  bienesSinFoto: number;
  aDemoler: number;
  perdidos: number;
  porSector: { sector: Sector; total: number }[];
  obras: number;
  obrasSinCosto: number;
};

export type Urgencia = "alta" | "media" | "baja";

export type Pendiente = {
  id: string;
  titulo: string;
  detalle: string;
  cantidad: number;
  href: string;
  urgencia: Urgencia;
};

const ORDEN: Record<Urgencia, number> = { alta: 0, media: 1, baja: 2 };

/**
 * Lo que falta por hacer, en orden de urgencia. Solo aparece lo que tiene cantidad: un
 * tablero que enumera ceros entrena a la gente para no leerlo.
 */
export function pendientesDe(cifras: CifrasSituacion): Pendiente[] {
  const posibles: Pendiente[] = [
    {
      id: "salud",
      titulo: "Personas por referir a salud",
      detalle:
        "Necesidades de salud registradas. Nagomu refiere, no atiende: cada una tiene que llegar a la entidad de salud.",
      cantidad: cifras.necesidadesSalud,
      href: "/damnificados",
      urgencia: "alta",
    },
    {
      id: "sin-autorizacion",
      titulo: "Hogares sin autorizacion de tratamiento",
      detalle:
        "Sin ella no se guarda el documento ni la necesidad de salud. El hogar se atiende igual, pero queda a medio caracterizar.",
      cantidad: cifras.hogaresSinAutorizacion,
      href: "/damnificados",
      urgencia: "alta",
    },
    {
      id: "sin-ayuda",
      titulo: "Hogares sin ninguna ayuda asignada",
      detalle: "Estan registrados y todavia no les corresponde nada de la oferta institucional.",
      cantidad: cifras.hogaresSinAyuda,
      href: "/damnificados",
      urgencia: "alta",
    },
    {
      id: "ayudas-pendientes",
      titulo: "Ayudas asignadas sin entregar",
      detalle: "Ya tienen destinatario. Lo que falta es que lleguen.",
      cantidad: cifras.ayudasPendientes,
      href: "/damnificados",
      urgencia: "media",
    },
    {
      id: "sin-coordenada",
      titulo: "Bienes sin coordenada",
      detalle:
        "No se dibujan en el mapa ni en el censo publico: quedan ubicados solo por su lugar general.",
      cantidad: cifras.bienesSinCoordenada,
      href: "/bienes",
      urgencia: "media",
    },
    {
      id: "sin-foto",
      titulo: "Bienes sin foto",
      detalle:
        "La evidencia del daño suele ser lo primero que existe, y es lo que sostiene el estudio y la cofinanciacion que vienen despues.",
      cantidad: cifras.bienesSinFoto,
      href: "/bienes",
      urgencia: "baja",
    },
    {
      id: "sin-costo",
      titulo: "Obras sin costo de estudio",
      detalle:
        "Sin estudio no hay costo, y sin costo no hay brecha ni plazos que mostrarle a una gobernacion.",
      cantidad: cifras.obrasSinCosto,
      href: "/obras",
      urgencia: "baja",
    },
  ];

  return posibles
    .filter((p) => p.cantidad > 0)
    .sort((a, b) => ORDEN[a.urgencia] - ORDEN[b.urgencia] || b.cantidad - a.cantidad);
}

/** Cifras del municipio. Cuenta en la base; no trae filas para contarlas en memoria. */
export async function situacionDe(
  municipioId: string,
  db: Prisma.TransactionClient = prisma,
): Promise<CifrasSituacion> {
  const [
    personas,
    hogares,
    hogaresSinAutorizacion,
    hogaresSinAyuda,
    necesidadesSalud,
    ayudasPendientes,
    bienes,
    bienesSinCoordenada,
    bienesSinFoto,
    aDemoler,
    perdidos,
    porSectorBruto,
    obras,
    obrasSinCosto,
  ] = await Promise.all([
    db.hogarDamnificado.aggregate({
      where: { municipioId },
      _sum: {
        personasTotal: true,
        personasNinez: true,
        personasAdultoMayor: true,
        personasDiscapacidad: true,
        hayHeridos: true,
        hayFallecidos: true,
      },
    }),
    db.hogarDamnificado.count({ where: { municipioId } }),
    db.hogarDamnificado.count({
      where: { municipioId, OR: [{ autorizacion: null }, { autorizacion: { otorgada: false } }] },
    }),
    db.hogarDamnificado.count({ where: { municipioId, ayudas: { none: {} } } }),
    db.necesidadSalud.count({ where: { hogar: { municipioId } } }),
    db.ayudaAHogar.count({ where: { hogar: { municipioId }, estado: "PENDIENTE" } }),
    db.itemInventario.count({ where: { municipioId } }),
    db.itemInventario.count({ where: { municipioId, latitud: null } }),
    db.itemInventario.count({ where: { municipioId, fotoRuta: null } }),
    db.itemInventario.count({ where: { municipioId, estadoAfectacion: "DEMOLER" } }),
    db.itemInventario.count({ where: { municipioId, estadoAfectacion: "PERDIDO" } }),
    db.itemInventario.groupBy({
      by: ["sector"],
      where: { municipioId },
      _count: { _all: true },
    }),
    db.obra.count({ where: { item: { municipioId } } }),
    db.obra.count({ where: { item: { municipioId }, costos: { none: {} } } }),
  ]);

  return {
    hogares,
    personas: personas._sum.personasTotal ?? 0,
    ninez: personas._sum.personasNinez ?? 0,
    adultoMayor: personas._sum.personasAdultoMayor ?? 0,
    discapacidad: personas._sum.personasDiscapacidad ?? 0,
    heridos: personas._sum.hayHeridos ?? 0,
    fallecidos: personas._sum.hayFallecidos ?? 0,
    hogaresSinAutorizacion,
    hogaresSinAyuda,
    necesidadesSalud,
    ayudasPendientes,
    bienes,
    bienesSinCoordenada,
    bienesSinFoto,
    aDemoler,
    perdidos,
    porSector: porSectorBruto
      .map((f) => ({ sector: f.sector, total: f._count._all }))
      .sort((a, b) => b.total - a.total),
    obras,
    obrasSinCosto,
  };
}
