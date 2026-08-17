"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requerirSesion } from "@/lib/auth";
import { puedeEditarAporte } from "@/lib/authz";
import { ambitosPara } from "@/lib/fondos";
import { registrarPermitido, registrarRechazo } from "@/lib/audit";
import { aDecimal, esPositivo, parsearPesos } from "@/lib/dinero";
import type { EstadoAporte, TipoActor } from "@/lib/generated/prisma/enums";

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

const ESTADOS: EstadoAporte[] = ["COMPROMETIDO", "GIRADO", "EJECUTADO"];

/**
 * Inscribe un aporte sobre una obra.
 *
 * Tres reglas que no se relajan:
 * - Solo se aporta a una obra costeada. Sin costo no hay brecha contra la cual medir,
 *   y un aporte sin referencia no significa nada.
 * - El fondo tiene que ser del ambito de quien aporta. Un municipio no gasta del fondo
 *   nacional, por mucho que la interfaz se lo permitiera.
 * - Nadie inscribe plata ajena. La excepcion es el municipio dueño registrando por un
 *   actor sin usuario propio, y ahi queda constancia de que el actor y quien digito son
 *   distintos.
 */
export async function registrarAporte(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const obraId = texto(formData, "obraId");

  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    select: { id: true, estado: true, item: { select: { municipioId: true } } },
  });
  if (!obra) redirect("/obras?error=noexiste");

  const volver = `/obras/${obraId}/aportes`;

  if (obra.estado === "IDENTIFICADO" || obra.estado === "EN_ESTUDIOS") {
    await registrarRechazo(
      sesion,
      { accion: "aporte.registrar", objetivoTipo: "Obra", objetivoId: obraId },
      "La obra todavia no tiene costo determinado por un estudio",
    );
    redirect(`${volver}?error=sincosto`);
  }

  // El actor propio es la entidad de la sesion. Si el municipio dueño inscribe por un
  // tercero, llega el nombre y el tipo del actor.
  const nombreTercero = texto(formData, "actorNombre");
  const esTercero = nombreTercero.length > 0;

  const actorPropio = await prisma.actor.findUnique({ where: { entidadId: sesion.entidadId } });

  const veredicto = puedeEditarAporte(
    sesion,
    { actorEntidadId: esTercero ? null : sesion.entidadId },
    { municipioId: obra.item.municipioId },
  );

  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: "aporte.registrar", objetivoTipo: "Obra", objetivoId: obraId },
      veredicto.motivo,
    );
    redirect(`${volver}?error=permiso`);
  }

  const fondoId = texto(formData, "fondoId");
  const fondo = await prisma.fondo.findUnique({ where: { id: fondoId } });
  if (!fondo || !fondo.vigente) redirect(`${volver}?error=fondo`);

  // El ambito del fondo se valida contra el nivel de quien aporta, no contra quien
  // digita: si Buga inscribe una donacion de una fundacion, el fondo valido es externo.
  const nivelAportante = esTercero ? null : sesion.nivel;
  const ambitosValidos = nivelAportante ? ambitosPara(nivelAportante) : ["EXTERNO" as const];

  if (!ambitosValidos.includes(fondo.ambito)) {
    await registrarRechazo(
      sesion,
      { accion: "aporte.registrar", objetivoTipo: "Obra", objetivoId: obraId },
      `El fondo ${fondo.nombre} es de ambito ${fondo.ambito} y no corresponde a quien aporta`,
    );
    redirect(`${volver}?error=ambito`);
  }

  const proyectoAplazado = texto(formData, "proyectoAplazado");
  if (fondo.exigeProyectoAplazado && !proyectoAplazado) {
    redirect(`${volver}?error=proyecto`);
  }

  const estado = texto(formData, "estado") as EstadoAporte;
  if (!ESTADOS.includes(estado)) redirect(`${volver}?error=estado`);

  const fechaBruta = texto(formData, "fecha");
  const fecha = new Date(fechaBruta);
  if (!fechaBruta || Number.isNaN(fecha.getTime())) redirect(`${volver}?error=fecha`);

  let monto: bigint;
  try {
    monto = parsearPesos(texto(formData, "monto"));
  } catch {
    redirect(`${volver}?error=monto`);
  }
  if (!esPositivo(monto)) redirect(`${volver}?error=monto`);

  // Un actor sin usuario propio se reutiliza si ya existe. Crear uno nuevo en cada
  // aporte llenaria la lista de la misma empresa repetida y haria imposible sumar
  // cuanto ha puesto.
  const actorId = esTercero
    ? (
        await prisma.actor.upsert({
          where: {
            tipo_nombre: {
              tipo: (texto(formData, "actorTipo") || "EMPRESA") as TipoActor,
              nombre: nombreTercero,
            },
          },
          update: {},
          create: {
            tipo: (texto(formData, "actorTipo") || "EMPRESA") as TipoActor,
            nombre: nombreTercero,
          },
        })
      ).id
    : actorPropio?.id;

  if (!actorId) redirect(`${volver}?error=actor`);

  const corrigeId = texto(formData, "corrigeId") || null;

  const aporte = await prisma.aporte.create({
    data: {
      obraId,
      actorId,
      fondoId,
      registradoPorId: sesion.usuarioId,
      monto: aDecimal(monto),
      fecha,
      estado,
      proyectoAplazado: proyectoAplazado || null,
      corrigeId,
    },
  });

  await registrarPermitido(sesion, {
    accion: corrigeId ? "aporte.corregir" : "aporte.registrar",
    objetivoTipo: "Aporte",
    objetivoId: aporte.id,
    datos: {
      obraId,
      monto: aDecimal(monto),
      estado,
      fondo: fondo.sigla ?? fondo.nombre,
      porTercero: esTercero,
      corrige: corrigeId,
    },
  });

  redirect(`/obras/${obraId}`);
}
