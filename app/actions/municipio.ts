"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requerirSesion } from "@/lib/auth";
import { puedeReportarCapacidadFiscal } from "@/lib/authz";
import { registrarPermitido, registrarRechazo } from "@/lib/audit";
import { aDecimal, esPositivo, parsearPesos } from "@/lib/dinero";

/**
 * Capacidad fiscal anual del municipio.
 *
 * La digita un funcionario cuando hacienda le dice "esto es lo que hay". Por eso exige
 * fecha y nombre de quien la reporto: sin eso, un dato de hace ocho meses se usa como
 * si fuera de hoy y los plazos calculados sobre el salen mentirosos.
 */
export async function reportarCapacidadFiscal(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();

  const veredicto = puedeReportarCapacidadFiscal(sesion);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: "capacidadFiscal.reportar", objetivoTipo: "EntidadTerritorial" },
      veredicto.motivo,
    );
    redirect("/obras?error=permiso");
  }

  const reportadoPor = String(formData.get("reportadoPor") ?? "").trim();
  const fechaBruta = String(formData.get("fechaReporte") ?? "").trim();

  if (!reportadoPor || !fechaBruta) redirect("/municipio/capacidad?error=faltan");

  const fechaReporte = new Date(fechaBruta);
  if (Number.isNaN(fechaReporte.getTime())) redirect("/municipio/capacidad?error=fecha");

  let montoAnual: bigint;
  try {
    montoAnual = parsearPesos(String(formData.get("montoAnual") ?? ""));
  } catch {
    redirect("/municipio/capacidad?error=monto");
  }
  if (!esPositivo(montoAnual)) redirect("/municipio/capacidad?error=monto");

  const registro = await prisma.capacidadFiscal.create({
    data: {
      municipioId: sesion.entidadId,
      montoAnual: aDecimal(montoAnual),
      fechaReporte,
      reportadoPor,
      registradoPorId: sesion.usuarioId,
    },
  });

  await registrarPermitido(sesion, {
    accion: "capacidadFiscal.reportar",
    objetivoTipo: "CapacidadFiscal",
    objetivoId: registro.id,
    datos: {
      montoAnual: aDecimal(montoAnual),
      fechaReporte: fechaReporte.toISOString().slice(0, 10),
    },
  });

  redirect("/municipio/capacidad");
}
