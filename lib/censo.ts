import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { TipoBien, EstadoAfectacion } from "@/lib/generated/prisma/enums";
import { lugarGeneral } from "@/lib/bienes";

/**
 * Censo publico de transparencia (spec 007, US3; enmienda 4.0.0).
 *
 * Corte PUBLICO del inventario: cantidades por tipo de bien y afectacion, los puntos
 * en el mapa y el lugar general. NUNCA la direccion (`ubicacion`), el dueño ni ningun
 * dato de persona. Esa garantia no es una convencion de nombres: la consulta usa un
 * `select` explicito de solo campos publicos (`CAMPOS_PUBLICOS`), y una prueba contra
 * base (tests/censo.test.ts) verifica que el resultado no contiene la direccion.
 *
 * No recibe sesion: alimenta la vista sin login. El filtro por territorio decide QUE
 * se cuenta, no que se puede ver — lo publico es publico en cualquier nivel.
 */

export type AmbitoCenso =
  | { alcance: "TODOS" }
  | { alcance: "DEPARTAMENTO"; departamentoId: string }
  | { alcance: "MUNICIPIO"; municipioId: string };

/** Solo campos publicos. Si alguien agrega aqui `ubicacion`, la prueba de censo falla. */
const CAMPOS_PUBLICOS = {
  tipoBien: true,
  estadoAfectacion: true,
  latitud: true,
  longitud: true,
  corregimiento: true,
  vereda: true,
  municipio: { select: { nombre: true } },
} satisfies Prisma.ItemInventarioSelect;

export type PuntoCenso = {
  tipoBien: TipoBien;
  estadoAfectacion: EstadoAfectacion | null;
  latitud: number;
  longitud: number;
  municipio: string;
  lugar: string | null;
};

export type CensoPublico = {
  total: number;
  porTipo: { tipoBien: TipoBien; total: number }[];
  porEstado: { estadoAfectacion: EstadoAfectacion; total: number }[];
  /** Bienes con coordenada: se dibujan como punto. */
  puntos: PuntoCenso[];
  /** Bienes sin coordenada: se cuentan por lugar general, nunca por direccion. */
  porLugar: { municipio: string; lugar: string | null; total: number }[];
};

function filtroDe(ambito: AmbitoCenso): Prisma.ItemInventarioWhereInput {
  if (ambito.alcance === "MUNICIPIO") return { municipioId: ambito.municipioId };
  if (ambito.alcance === "DEPARTAMENTO") {
    return { municipio: { departamentoId: ambito.departamentoId } };
  }
  return {};
}

export async function censoPublico(
  ambito: AmbitoCenso,
  db: Prisma.TransactionClient = prisma,
): Promise<CensoPublico> {
  const bienes = await db.itemInventario.findMany({
    where: filtroDe(ambito),
    select: CAMPOS_PUBLICOS,
  });

  const porTipo = new Map<TipoBien, number>();
  const porEstado = new Map<EstadoAfectacion, number>();
  const porLugar = new Map<string, { municipio: string; lugar: string | null; total: number }>();
  const puntos: PuntoCenso[] = [];

  for (const b of bienes) {
    porTipo.set(b.tipoBien, (porTipo.get(b.tipoBien) ?? 0) + 1);
    if (b.estadoAfectacion) {
      porEstado.set(b.estadoAfectacion, (porEstado.get(b.estadoAfectacion) ?? 0) + 1);
    }

    const lugar = lugarGeneral(b);
    if (b.latitud !== null && b.longitud !== null) {
      puntos.push({
        tipoBien: b.tipoBien,
        estadoAfectacion: b.estadoAfectacion,
        latitud: b.latitud,
        longitud: b.longitud,
        municipio: b.municipio.nombre,
        lugar,
      });
    } else {
      const clave = `${b.municipio.nombre}||${lugar ?? ""}`;
      const acum = porLugar.get(clave) ?? { municipio: b.municipio.nombre, lugar, total: 0 };
      acum.total += 1;
      porLugar.set(clave, acum);
    }
  }

  return {
    total: bienes.length,
    porTipo: [...porTipo].map(([tipoBien, total]) => ({ tipoBien, total })),
    porEstado: [...porEstado].map(([estadoAfectacion, total]) => ({ estadoAfectacion, total })),
    puntos,
    porLugar: [...porLugar.values()],
  };
}
