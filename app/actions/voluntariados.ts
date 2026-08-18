"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { crearSesion, hashearContrasena, requerirVoluntario } from "@/lib/auth";
import { registrarPermitido } from "@/lib/audit";
import { parsearCoordenada } from "@/lib/geo";
import { VERBOS } from "@/lib/verificacion";

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
