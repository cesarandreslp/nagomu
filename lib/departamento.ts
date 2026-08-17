import { prisma } from "@/lib/db";
import { municipiosVisiblesPara } from "@/lib/authz";
import { colaDelMunicipio } from "@/lib/financiacion";
import { impactoDeAportar } from "@/lib/cola";
import { CERO, parsearPesos, type Pesos } from "@/lib/dinero";
import { nivelDe } from "@/lib/prioridad";
import type { SesionActiva } from "@/lib/auth";

/**
 * Consolidado de las obras de varios municipios, para quien coordina desde arriba.
 *
 * Dos preguntas distintas, dos ordenamientos:
 *
 * - **Por prioridad**: que es lo mas importante del departamento. Responde a la
 *   obligacion de atender primero lo que salva vidas.
 * - **Por impacto**: donde rinde mas la misma plata. Responde a la pregunta que de
 *   verdad se hace quien tiene un presupuesto limitado y varios municipios pidiendo.
 *
 * No son la misma lista y no deben serlo. La primera dice que se debe hacer; la
 * segunda, donde el mismo aporte destraba mas fila.
 */

/**
 * Monto de referencia para comparar impacto. Fijo a proposito: comparar obras con
 * montos distintos no dice nada, porque la mas grande siempre "ahorraria" mas años.
 * Con la misma cifra en todas, la comparacion es honesta.
 */
export const APORTE_DE_REFERENCIA: Pesos = parsearPesos("1000000000");

export function leerReferencia(valor: string | undefined): Pesos {
  if (!valor) return APORTE_DE_REFERENCIA;
  try {
    const monto = parsearPesos(valor);
    return monto > CERO ? monto : APORTE_DE_REFERENCIA;
  } catch {
    return APORTE_DE_REFERENCIA;
  }
}

export type ObraConsolidada = {
  id: string;
  nombre: string;
  municipio: string;
  municipioId: string;
  nivel: number;
  puntaje: number | null;
  incompleto: boolean;
  estado: string;
  costo: Pesos | null;
  brecha: Pesos;
  anioInicio: number | null;
  anioCierre: number | null;
  cubierta: boolean;
  /** Cuantas obras del municipio adelantaria un aporte de referencia sobre esta. */
  obrasAdelantadas: number;
  /** Años ahorrados sumando todas las obras del municipio. */
  aniosAhorrados: number;
  sinCapacidad: boolean;
};

export async function consolidar(sesion: SesionActiva, referencia: Pesos, hoy: Date) {
  const ambito = municipiosVisiblesPara(sesion);

  const municipios = await prisma.entidadTerritorial.findMany({
    where:
      ambito.alcance === "DEPARTAMENTO"
        ? { nivel: "MUNICIPIO", departamentoId: ambito.departamentoId }
        : ambito.alcance === "TODOS"
          ? { nivel: "MUNICIPIO" }
          : { id: ambito.municipioId },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  // ponytail: una consulta por municipio. Con decenas de municipios en el piloto es
  // despreciable; si el consolidado nacional llega a cientos, conviene una sola
  // consulta y proyectar en memoria.
  const porMunicipio = await Promise.all(
    municipios.map(async (m) => ({ municipio: m, datos: await colaDelMunicipio(m.id, hoy) })),
  );

  const obras: ObraConsolidada[] = [];

  for (const { municipio, datos } of porMunicipio) {
    for (const obra of datos.obras) {
      const impacto =
        obra.brecha.costo !== null && datos.montoAnual > CERO
          ? impactoDeAportar(datos.enCola, datos.montoAnual, obra.id, referencia)
          : { obrasAdelantadas: 0, aniosAhorradosEnTotal: 0 };

      obras.push({
        id: obra.id,
        nombre: obra.nombre,
        municipio: municipio.nombre,
        municipioId: municipio.id,
        nivel: nivelDe(obra.categoria),
        puntaje: obra.puntaje.valor,
        incompleto: obra.puntaje.incompleto,
        estado: String(obra.estado),
        costo: obra.brecha.costo,
        brecha: obra.brecha.brecha,
        anioInicio: obra.cola?.anioInicio ?? null,
        anioCierre: obra.cola?.anioCierre ?? null,
        cubierta: obra.cola?.cubierta ?? false,
        obrasAdelantadas: impacto.obrasAdelantadas,
        aniosAhorrados: impacto.aniosAhorradosEnTotal,
        sinCapacidad: datos.capacidad === null,
      });
    }
  }

  return {
    municipios: porMunicipio.map(({ municipio, datos }) => ({
      id: municipio.id,
      nombre: municipio.nombre,
      obras: datos.obras.length,
      capacidad: datos.capacidad,
      vencida: datos.vencida,
    })),
    obras,
  };
}

/** Nivel primero, luego puntaje. La misma regla del inventario municipal. */
export function ordenarPorPrioridad(obras: readonly ObraConsolidada[]): ObraConsolidada[] {
  return [...obras].sort((a, b) => {
    if (a.nivel !== b.nivel) return a.nivel - b.nivel;
    if (a.incompleto !== b.incompleto) return a.incompleto ? 1 : -1;
    if (a.puntaje !== null && b.puntaje !== null && a.puntaje !== b.puntaje) {
      return b.puntaje - a.puntaje;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * Donde el mismo aporte destraba mas fila. Empata por prioridad, para que entre dos
 * obras de igual impacto gane la mas urgente.
 */
export function ordenarPorImpacto(obras: readonly ObraConsolidada[]): ObraConsolidada[] {
  return [...obras].sort((a, b) => {
    if (a.aniosAhorrados !== b.aniosAhorrados) return b.aniosAhorrados - a.aniosAhorrados;
    if (a.obrasAdelantadas !== b.obrasAdelantadas) return b.obrasAdelantadas - a.obrasAdelantadas;
    if (a.nivel !== b.nivel) return a.nivel - b.nivel;
    return a.id.localeCompare(b.id);
  });
}
