import { prisma } from "@/lib/db";
import { sumar, desdeDecimal, type Pesos } from "@/lib/dinero";
import { aportesVigentes } from "@/lib/brecha";
import { capacidadVencida } from "@/lib/financiacion";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Resumen de impacto agregado para la landing publica (spec 004 US2).
 *
 * Todo son sumas y conteos: NUNCA datos personales (Principio IV). Se calcula acotado al
 * territorio elegido en el buscador, o nacional por defecto. Reutiliza las libs de dominio.
 */

export type Scope =
  | { alcance: "NACION" }
  | { alcance: "DEPARTAMENTO"; departamentoId: string }
  | { alcance: "MUNICIPIO"; municipioId: string };

export type ResumenImpacto = {
  fondosAsignados: Pesos;
  obrasTotal: number;
  obrasEntregadas: number;
  porcentajeEjecucion: number;
  alertas: number;
};

function filtroObra(scope: Scope): Prisma.ObraWhereInput {
  if (scope.alcance === "MUNICIPIO") return { item: { municipioId: scope.municipioId } };
  if (scope.alcance === "DEPARTAMENTO") {
    return { item: { municipio: { departamentoId: scope.departamentoId } } };
  }
  return {};
}

function filtroMunicipio(scope: Scope): Prisma.EntidadTerritorialWhereInput {
  if (scope.alcance === "MUNICIPIO") return { id: scope.municipioId };
  if (scope.alcance === "DEPARTAMENTO") {
    return { nivel: "MUNICIPIO", departamentoId: scope.departamentoId };
  }
  return { nivel: "MUNICIPIO" };
}

export async function resumenImpacto(
  scope: Scope,
  hoy: Date,
  db: Prisma.TransactionClient = prisma,
): Promise<ResumenImpacto> {
  const obraWhere = filtroObra(scope);

  // Fondos asignados: aportes no anulados de las obras del territorio.
  const aportes = await db.aporte.findMany({
    where: { obra: obraWhere },
    select: { id: true, corrigeId: true, monto: true },
  });
  const fondosAsignados = sumar(...aportesVigentes(aportes).map((a) => desdeDecimal(a.monto)));

  // % de ejecucion: obras ENTREGADA sobre el total, por conteo.
  const obrasTotal = await db.obra.count({ where: obraWhere });
  const obrasEntregadas = await db.obra.count({
    where: { ...obraWhere, estado: "ENTREGADA" },
  });
  const porcentajeEjecucion =
    obrasTotal === 0 ? 0 : Math.round((obrasEntregadas / obrasTotal) * 100);

  // Alertas: obras costeadas sin aporte vigente (proxy de "sin financiacion") + municipios cuya
  // capacidad fiscal esta vencida o no se ha reportado.
  const costeadas = await db.obra.findMany({
    where: { ...obraWhere, estado: "COSTEADO" },
    select: { aportes: { select: { id: true, corrigeId: true } } },
  });
  const costeadasSinAporte = costeadas.filter(
    (o) => aportesVigentes(o.aportes).length === 0,
  ).length;

  const municipios = await db.entidadTerritorial.findMany({
    where: filtroMunicipio(scope),
    select: {
      capacidades: { orderBy: { fechaReporte: "desc" }, take: 1, select: { fechaReporte: true } },
    },
  });
  const municipiosEnRiesgo = municipios.filter((m) => {
    const ultima = m.capacidades[0];
    return !ultima || capacidadVencida(ultima.fechaReporte, hoy);
  }).length;

  return {
    fondosAsignados,
    obrasTotal,
    obrasEntregadas,
    porcentajeEjecucion,
    alertas: costeadasSinAporte + municipiosEnRiesgo,
  };
}
