"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requerirSesion, type SesionActiva } from "@/lib/auth";
import { puedeAutorizarIntervencion } from "@/lib/authz";
import { registrarPermitido, registrarRechazo } from "@/lib/audit";
import { aDecimal, esPositivo, parsearPesos } from "@/lib/dinero";
import { puedeTransicionar } from "@/lib/intervenciones";
import type { EstadoIntervencion, ResultadoVerificacion, TipoActor } from "@/lib/generated/prisma/enums";

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/**
 * Toda accion sobre una intervencion es del municipio dueño de la obra, cualquiera sea
 * el actor que la ejecuta y cualquiera sea el nivel que la proponga: el municipio
 * autoriza lo que se hace en su territorio (FR-040, FR-043).
 */
async function intervencionQuePuedeAutorizar(
  sesion: SesionActiva,
  intervencionId: string,
  accion: string,
) {
  const intervencion = await prisma.intervencion.findUnique({
    where: { id: intervencionId },
    select: {
      id: true,
      estado: true,
      obraId: true,
      obra: { select: { item: { select: { municipioId: true } } } },
    },
  });

  if (!intervencion) redirect("/obras?error=noexiste");

  const veredicto = puedeAutorizarIntervencion(sesion, {
    municipioId: intervencion.obra.item.municipioId,
  });

  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion, objetivoTipo: "Intervencion", objetivoId: intervencion.id },
      veredicto.motivo,
    );
    redirect(`/obras/${intervencion.obraId}/intervenciones?error=permiso`);
  }

  return intervencion;
}

/** Alta de la solicitud. La inscribe el municipio dueño, con lo que declaro el tercero. */
export async function solicitarIntervencion(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const obraId = texto(formData, "obraId");

  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    select: { id: true, item: { select: { municipioId: true } } },
  });
  if (!obra) redirect("/obras?error=noexiste");

  const volver = `/obras/${obraId}/intervenciones`;

  const veredicto = puedeAutorizarIntervencion(sesion, {
    municipioId: obra.item.municipioId,
  });
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: "intervencion.solicitar", objetivoTipo: "Obra", objetivoId: obraId },
      veredicto.motivo,
    );
    redirect(`${volver}?error=permiso`);
  }

  const actorNombre = texto(formData, "actorNombre");
  const alcance = texto(formData, "alcance");
  const responsableTecnico = texto(formData, "responsableTecnico");
  const plazoBruto = texto(formData, "plazoComprometido");

  if (!actorNombre || !alcance || !responsableTecnico || !plazoBruto) {
    redirect(`${volver}?error=faltan`);
  }

  const plazoComprometido = new Date(plazoBruto);
  if (Number.isNaN(plazoComprometido.getTime())) redirect(`${volver}?error=fecha`);

  let valorEquivalente: bigint;
  try {
    valorEquivalente = parsearPesos(texto(formData, "valorEquivalente"));
  } catch {
    redirect(`${volver}?error=monto`);
  }
  if (!esPositivo(valorEquivalente)) redirect(`${volver}?error=monto`);

  // Se reutiliza el actor si ya existe: la misma constructora puede intervenir en
  // varias obras, y debe ser una sola fila para poder ver todo lo que ha hecho.
  const tipoActor = (texto(formData, "actorTipo") || "EMPRESA") as TipoActor;
  const actor = await prisma.actor.upsert({
    where: { tipo_nombre: { tipo: tipoActor, nombre: actorNombre } },
    update: {},
    create: { tipo: tipoActor, nombre: actorNombre },
  });

  const intervencion = await prisma.intervencion.create({
    data: {
      obraId,
      actorId: actor.id,
      registradoPorId: sesion.usuarioId,
      alcance,
      valorEquivalente: aDecimal(valorEquivalente),
      plazoComprometido,
      responsableTecnico,
      autorizadaPreviamente: texto(formData, "autorizadaPreviamente") !== "no",
    },
  });

  await registrarPermitido(sesion, {
    accion: "intervencion.solicitar",
    objetivoTipo: "Intervencion",
    objetivoId: intervencion.id,
    datos: {
      obraId,
      valorEquivalente: aDecimal(valorEquivalente),
      autorizadaPreviamente: intervencion.autorizadaPreviamente,
    },
  });

  redirect(volver);
}

/**
 * Cambio de estado: aprobar, rechazar, iniciar, suspender o recibir.
 *
 * Una sola accion para todas las transiciones porque la regla de que se puede y que
 * no vive en `lib/intervenciones.ts`, no repartida en cinco funciones que hay que
 * mantener de acuerdo entre si.
 */
export async function cambiarEstadoIntervencion(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const intervencionId = texto(formData, "intervencionId");
  const estadoNuevo = texto(formData, "estadoNuevo") as EstadoIntervencion;
  const motivo = texto(formData, "motivo") || null;

  const intervencion = await intervencionQuePuedeAutorizar(
    sesion,
    intervencionId,
    "intervencion.cambiarEstado",
  );

  const volver = `/obras/${intervencion.obraId}/intervenciones`;
  const transicion = puedeTransicionar(intervencion.estado, estadoNuevo, motivo);

  if (!transicion.valida) {
    await registrarRechazo(
      sesion,
      {
        accion: "intervencion.cambiarEstado",
        objetivoTipo: "Intervencion",
        objetivoId: intervencionId,
      },
      transicion.motivo,
    );
    redirect(`${volver}?error=transicion`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.cambioEstadoIntervencion.create({
      data: {
        intervencionId,
        estadoAnterior: intervencion.estado,
        estadoNuevo,
        motivo,
        usuarioId: sesion.usuarioId,
      },
    });
    await tx.intervencion.update({
      where: { id: intervencionId },
      data: { estado: estadoNuevo },
    });
  });

  await registrarPermitido(sesion, {
    accion: "intervencion.cambiarEstado",
    objetivoTipo: "Intervencion",
    objetivoId: intervencionId,
    // El motivo no se copia aqui: ya quedo en CambioEstadoIntervencion, que tambien es
    // inmutable. Es texto libre que puede nombrar a una persona, y guardarlo dos veces
    // duplica la exposicion sin agregar informacion.
    datos: { de: intervencion.estado, a: estadoNuevo, conMotivo: motivo !== null },
  });

  redirect(volver);
}

/** Constancia de una revision en terreno. Es lo que separa vigilar de confiar. */
export async function registrarVerificacionCalidad(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const intervencionId = texto(formData, "intervencionId");

  const intervencion = await intervencionQuePuedeAutorizar(
    sesion,
    intervencionId,
    "intervencion.verificar",
  );

  const volver = `/obras/${intervencion.obraId}/intervenciones`;
  const resultado = texto(formData, "resultado") as ResultadoVerificacion;

  if (!["CONFORME", "OBSERVACIONES", "NO_CONFORME"].includes(resultado)) {
    redirect(`${volver}?error=resultado`);
  }

  const fechaBruta = texto(formData, "fecha");
  const fecha = new Date(fechaBruta);
  if (!fechaBruta || Number.isNaN(fecha.getTime())) redirect(`${volver}?error=fecha`);

  const verificacion = await prisma.verificacionCalidad.create({
    data: {
      intervencionId,
      fecha,
      resultado,
      observaciones: texto(formData, "observaciones") || null,
      funcionarioId: sesion.usuarioId,
    },
  });

  await registrarPermitido(sesion, {
    accion: "intervencion.verificar",
    objetivoTipo: "VerificacionCalidad",
    objetivoId: verificacion.id,
    datos: { intervencionId, resultado },
  });

  redirect(volver);
}
