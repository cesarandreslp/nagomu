"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { crearSesion, hashearContrasena, requerirSesion, requerirVoluntario } from "@/lib/auth";
import { registrarPermitido, registrarRechazo } from "@/lib/audit";
import { puedeVerificarVoluntariado } from "@/lib/authz";
import { parsearCoordenada } from "@/lib/geo";
import { VERBOS, type AccionVerificacion } from "@/lib/verificacion";
import { registrarDecision } from "@/lib/voluntariados";

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

const LARGO_MINIMO_CONTRASENA = 8;

/**
 * Auto-registro de un voluntariado (ruta publica, sin sesion). Crea un Actor VOLUNTARIADO
 * en estado PENDIENTE y la cuenta que lo controla, inicia sesion y lo lleva a su espacio.
 *
 * ponytail: sin limite de tasa ni CAPTCHA en esta version. El control anti-suplantacion real
 * es la verificacion del municipio (un registro sin verificar no aparece como oficial), asi
 * que el spam de registros no engaña a nadie. Añadir limite por IP si el piloto lo muestra.
 */
export async function registrarVoluntariado(formData: FormData): Promise<void> {
  const nombre = texto(formData, "nombre");
  const correo = texto(formData, "correo").toLowerCase();
  const contrasena = String(formData.get("contrasena") ?? "");
  const contacto = texto(formData, "contacto");
  const direccion = texto(formData, "direccion");
  const municipioOperacionId = texto(formData, "municipioOperacionId");
  const coordenada = parsearCoordenada(texto(formData, "latitud"), texto(formData, "longitud"));

  if (!nombre || !correo || !contacto || !municipioOperacionId || !contrasena) {
    redirect("/voluntariado/registro?error=faltan");
  }
  if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
    redirect("/voluntariado/registro?error=contrasena");
  }
  if (coordenada === "invalido") redirect("/voluntariado/registro?error=coordenada");

  const municipio = await prisma.entidadTerritorial.findUnique({
    where: { id: municipioOperacionId },
    select: { nivel: true },
  });
  if (!municipio || municipio.nivel !== "MUNICIPIO") {
    redirect("/voluntariado/registro?error=municipio");
  }

  // Anti-enumeracion (research D6): correo en uso o nombre ya reclamado por otra cuenta
  // devuelven el MISMO error generico, sin revelar cual de los dos fue.
  const correoExiste = await prisma.usuario.findUnique({
    where: { correo },
    select: { id: true },
  });
  if (correoExiste) redirect("/voluntariado/registro?error=registro");

  const actorExistente = await prisma.actor.findUnique({
    where: { tipo_nombre: { tipo: "VOLUNTARIADO", nombre } },
    select: { id: true, cuenta: { select: { id: true } } },
  });
  if (actorExistente?.cuenta) redirect("/voluntariado/registro?error=registro");

  const hash = await hashearContrasena(contrasena);
  const ubicacion = {
    direccion: direccion || null,
    latitud: coordenada?.latitud ?? null,
    longitud: coordenada?.longitud ?? null,
  };

  let usuarioId: string;
  try {
    const usuario = await prisma.$transaction(async (tx) => {
      // Reclama un actor VOLUNTARIADO sin cuenta si existe con ese nombre; si no, crea uno.
      // En ambos casos nace/queda PENDIENTE: reclamar no otorga verificacion.
      const actorId = actorExistente
        ? (
            await tx.actor.update({
              where: { id: actorExistente.id },
              data: { contacto, municipioOperacionId, estadoVerificacion: "PENDIENTE", ...ubicacion },
              select: { id: true },
            })
          ).id
        : (
            await tx.actor.create({
              data: { tipo: "VOLUNTARIADO", nombre, contacto, municipioOperacionId, ...ubicacion },
              select: { id: true },
            })
          ).id;

      return tx.usuario.create({
        data: { correo, nombre, hashContrasena: hash, actorId },
        select: { id: true },
      });
    });
    usuarioId = usuario.id;
  } catch {
    // Choque de unicidad en una carrera (correo, nombre o actor ya tomado): mismo generico.
    redirect("/voluntariado/registro?error=registro");
  }

  await crearSesion(usuarioId);
  await registrarPermitido(
    { usuarioId },
    {
      accion: VERBOS.registrar,
      objetivoTipo: "Actor",
      // Sin datos personales: municipio y si trajo coordenada.
      datos: { municipioOperacionId, tieneCoordenada: coordenada !== null },
    },
  );

  redirect("/voluntariado");
}

/**
 * El voluntariado edita SU propio registro. Opera siempre sobre `sesion.actorId`: nunca
 * recibe un id de actor del formulario, asi que no hay forma de tocar el registro de otro.
 */
export async function actualizarVoluntariado(formData: FormData): Promise<void> {
  const sesion = await requerirVoluntario();

  const contacto = texto(formData, "contacto");
  const direccion = texto(formData, "direccion");
  const coordenada = parsearCoordenada(texto(formData, "latitud"), texto(formData, "longitud"));

  if (!contacto) redirect("/voluntariado?error=faltan");
  if (coordenada === "invalido") redirect("/voluntariado?error=coordenada");

  await prisma.actor.update({
    where: { id: sesion.actorId },
    data: {
      contacto,
      direccion: direccion || null,
      latitud: coordenada?.latitud ?? null,
      longitud: coordenada?.longitud ?? null,
    },
  });

  await registrarPermitido(
    { usuarioId: sesion.usuarioId },
    { accion: VERBOS.actualizar, objetivoTipo: "Actor", objetivoId: sesion.actorId },
  );

  redirect("/voluntariado");
}

/**
 * Decision del municipio sobre un voluntariado: verificar, rechazar o revocar. Las tres
 * comparten el flujo —autorizar por municipio de operacion, aplicar la transicion, auditar—
 * asi que viven en un solo sitio y se exponen como tres acciones.
 */
async function decidir(formData: FormData, accion: AccionVerificacion): Promise<void> {
  const sesion = await requerirSesion();
  const actorId = texto(formData, "actorId");
  const motivo = texto(formData, "motivo") || null;

  const actor = await prisma.actor.findUnique({
    where: { id: actorId },
    select: { tipo: true, estadoVerificacion: true, municipioOperacionId: true },
  });
  if (!actor || actor.tipo !== "VOLUNTARIADO") redirect("/voluntariados?error=noexiste");

  const veredicto = puedeVerificarVoluntariado(sesion, {
    municipioOperacionId: actor.municipioOperacionId,
  });
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: VERBOS[accion], objetivoTipo: "Actor", objetivoId: actorId },
      veredicto.motivo,
    );
    redirect("/voluntariados?error=permiso");
  }

  // Rechazar y revocar exigen motivo; verificar no. Se corta aqui con un error claro antes
  // de tocar nada.
  if ((accion === "rechazar" || accion === "revocar") && !motivo) {
    redirect("/voluntariados?error=motivo");
  }

  const resultado = await registrarDecision({
    actorId,
    municipioId: sesion.entidadId,
    funcionarioId: sesion.usuarioId,
    estadoActual: actor.estadoVerificacion,
    accion,
    motivo,
  });

  if (!resultado.valida) {
    await registrarRechazo(
      sesion,
      { accion: VERBOS[accion], objetivoTipo: "Actor", objetivoId: actorId },
      resultado.motivo,
    );
    redirect("/voluntariados?error=transicion");
  }

  await registrarPermitido(sesion, {
    accion: VERBOS[accion],
    objetivoTipo: "Actor",
    objetivoId: actorId,
    datos: { resultado: resultado.resultado },
  });

  redirect("/voluntariados");
}

export async function verificarVoluntariado(formData: FormData): Promise<void> {
  return decidir(formData, "verificar");
}

export async function rechazarVoluntariado(formData: FormData): Promise<void> {
  return decidir(formData, "rechazar");
}

export async function revocarVoluntariado(formData: FormData): Promise<void> {
  return decidir(formData, "revocar");
}
