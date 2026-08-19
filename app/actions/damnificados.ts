"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requerirSesion } from "@/lib/auth";
import { registrarPermitido, registrarRechazo } from "@/lib/audit";
import { puedeGestionarDamnificados, puedeRegistrarDamnificado } from "@/lib/authz";
import { subirFotoHogar } from "@/lib/almacenamiento";
import {
  ACCIONES,
  crearHogar,
  esMotivoSupresion,
  hogarConDocumento,
  otorgarAutorizacion,
} from "@/lib/damnificados";
import { estaHabilitada } from "@/lib/oferta";

/**
 * Acciones del registro municipal de damnificados (spec 006).
 *
 * Tres reglas que valen para todo este archivo:
 *
 * 1. El `municipioId` sale SIEMPRE de la sesion, nunca del formulario. Un campo oculto con
 *    el municipio seria una invitacion a registrar damnificados en territorio ajeno.
 * 2. Lo que se audita es el **hecho**, jamas el dato personal. Si el asiento guardara el
 *    nombre o el documento, la supresion por habeas data no serviria de nada: el dato
 *    seguiria en una tabla que por diseño no se puede borrar.
 * 3. El documento pasa por el candado de `crearHogar`/`otorgarAutorizacion`. Ninguna accion
 *    de aqui escribe `documento` por su cuenta.
 */

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/** Conteo de personas: entero, no negativo y con techo, para que un dedo no meta 999999. */
const TECHO_PERSONAS = 100;

function conteo(formData: FormData, campo: string): number | "invalido" {
  const crudo = texto(formData, campo);
  if (!crudo) return 0;
  const n = Number(crudo);
  if (!Number.isInteger(n) || n < 0 || n > TECHO_PERSONAS) return "invalido";
  return n;
}

type Conteos = {
  personasTotal: number;
  personasNinez: number;
  personasAdultoMayor: number;
  personasDiscapacidad: number;
  hayHeridos: number;
  hayFallecidos: number;
};

function leerConteos(formData: FormData): Conteos | "invalido" {
  const campos = [
    "personasTotal",
    "personasNinez",
    "personasAdultoMayor",
    "personasDiscapacidad",
    "hayHeridos",
    "hayFallecidos",
  ] as const;

  const valores = {} as Conteos;
  for (const campo of campos) {
    const n = conteo(formData, campo);
    if (n === "invalido") return "invalido";
    valores[campo] = n;
  }
  if (valores.personasTotal < 1) return "invalido";
  return valores;
}

/** El inmueble tiene que ser del propio municipio; si no, se ignora en vez de fallar. */
async function inmuebleValido(inmuebleId: string, municipioId: string): Promise<string | null> {
  if (!inmuebleId) return null;
  const item = await prisma.itemInventario.findFirst({
    where: { id: inmuebleId, municipioId },
    select: { id: true },
  });
  return item?.id ?? null;
}

export async function registrarHogar(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const veredicto = puedeRegistrarDamnificado(sesion);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: ACCIONES.registrar, objetivoTipo: "HogarDamnificado" },
      veredicto.motivo,
    );
    redirect("/damnificados?error=permiso");
  }

  const responsableNombre = texto(formData, "responsableNombre");
  const documento = texto(formData, "documento");
  const autoriza = formData.get("autorizaTratamiento") === "si";
  const medio = texto(formData, "medioAutorizacion") || "VERBAL";
  const conteos = leerConteos(formData);

  if (!responsableNombre) redirect("/damnificados/nuevo?error=faltan");
  if (conteos === "invalido") redirect("/damnificados/nuevo?error=conteos");

  const inmuebleId = await inmuebleValido(texto(formData, "inmuebleId"), sesion.entidadId);

  // Doble registro de la misma familia: en una emergencia el mismo hogar pasa por dos
  // puestos de atencion y termina contado dos veces. Se avisa, no se bloquea: puede ser
  // legitimo (dos hogares distintos bajo un mismo responsable) y quien decide es el
  // funcionario que tiene a la familia enfrente, no una restriccion de la base.
  const duplicado = documento ? await hogarConDocumento(sesion.entidadId, documento) : null;

  // Si llega documento sin autorizacion, el hogar se registra igual, sin documento. Se
  // prefiere un registro incompleto a dejar por fuera a una familia damnificada.
  const hogar = await crearHogar({
    ...conteos,
    municipioId: sesion.entidadId,
    responsableNombre,
    documento: documento || null,
    inmuebleId,
    registradoPorId: sesion.usuarioId,
    autorizacion: autoriza || documento ? { otorgada: autoriza, medio } : null,
  });

  await registrarPermitido(sesion, {
    accion: ACCIONES.registrar,
    objetivoTipo: "HogarDamnificado",
    objetivoId: hogar.id,
    // Sin nombre ni documento: solo el hecho y su forma.
    datos: {
      personasTotal: conteos.personasTotal,
      conAutorizacion: autoriza,
      conDocumento: autoriza && documento !== "",
      conInmueble: inmuebleId !== null,
    },
  });

  redirect(`/damnificados/${hogar.id}${duplicado ? "?aviso=duplicado" : ""}`);
}

export async function actualizarHogar(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const hogarId = texto(formData, "hogarId");

  const hogar = await prisma.hogarDamnificado.findUnique({
    where: { id: hogarId },
    select: { municipioId: true },
  });
  if (!hogar) redirect("/damnificados?error=noexiste");

  const veredicto = puedeGestionarDamnificados(sesion, hogar);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: ACCIONES.actualizar, objetivoTipo: "HogarDamnificado", objetivoId: hogarId },
      veredicto.motivo,
    );
    redirect("/damnificados?error=permiso");
  }

  const responsableNombre = texto(formData, "responsableNombre");
  const conteos = leerConteos(formData);
  if (!responsableNombre) redirect(`/damnificados/${hogarId}?error=faltan`);
  if (conteos === "invalido") redirect(`/damnificados/${hogarId}?error=conteos`);

  const inmuebleId = await inmuebleValido(texto(formData, "inmuebleId"), sesion.entidadId);

  await prisma.hogarDamnificado.update({
    where: { id: hogarId },
    data: { ...conteos, responsableNombre, inmuebleId },
  });

  await registrarPermitido(sesion, {
    accion: ACCIONES.actualizar,
    objetivoTipo: "HogarDamnificado",
    objetivoId: hogarId,
    datos: { personasTotal: conteos.personasTotal },
  });

  revalidatePath(`/damnificados/${hogarId}`);
  redirect(`/damnificados/${hogarId}`);
}

/**
 * Registra (o revoca) la autorizacion de tratamiento. Al otorgarla se habilita guardar el
 * documento; al revocarla se borra. Ese efecto vive en `otorgarAutorizacion`, no aqui.
 */
export async function registrarAutorizacion(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const hogarId = texto(formData, "hogarId");

  const hogar = await prisma.hogarDamnificado.findUnique({
    where: { id: hogarId },
    select: { municipioId: true },
  });
  if (!hogar) redirect("/damnificados?error=noexiste");

  const veredicto = puedeGestionarDamnificados(sesion, hogar);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: ACCIONES.autorizar, objetivoTipo: "HogarDamnificado", objetivoId: hogarId },
      veredicto.motivo,
    );
    redirect("/damnificados?error=permiso");
  }

  const otorgada = formData.get("autorizaTratamiento") === "si";
  const documento = texto(formData, "documento");

  await otorgarAutorizacion(hogarId, sesion.entidadId, {
    otorgada,
    medio: texto(formData, "medioAutorizacion") || "VERBAL",
    registradoPorId: sesion.usuarioId,
    ...(documento ? { documento } : {}),
  });

  await registrarPermitido(sesion, {
    accion: ACCIONES.autorizar,
    objetivoTipo: "HogarDamnificado",
    objetivoId: hogarId,
    datos: { otorgada },
  });

  revalidatePath(`/damnificados/${hogarId}`);
  redirect(`/damnificados/${hogarId}`);
}

/**
 * Supresion por habeas data (Ley 1581, research D4).
 *
 * Borra lo que identifica a la familia —nombre y documento— y conserva el hogar como
 * cifra: cuantas personas, cuanta niñez, que ayudas recibio. Asi el municipio no pierde
 * la estadistica de la emergencia y la familia deja de estar identificada.
 *
 * El asiento de auditoria registra el hecho de la supresion. **No conserva lo borrado**:
 * un "valor anterior" en la auditoria haria de la supresion un teatro, porque el dato
 * seguiria ahi y en una tabla que ni siquiera se puede editar.
 */
export async function suprimirHogar(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const hogarId = texto(formData, "hogarId");
  // Lista cerrada, nunca texto libre: este asiento no se puede borrar despues, y un motivo
  // escrito a mano es la via mas facil para que el dato suprimido sobreviva en la auditoria.
  const motivoCrudo = texto(formData, "motivo");
  const motivo = esMotivoSupresion(motivoCrudo) ? motivoCrudo : "SOLICITUD_TITULAR";

  const hogar = await prisma.hogarDamnificado.findUnique({
    where: { id: hogarId },
    select: { municipioId: true },
  });
  if (!hogar) redirect("/damnificados?error=noexiste");

  const veredicto = puedeGestionarDamnificados(sesion, hogar);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: ACCIONES.suprimir, objetivoTipo: "HogarDamnificado", objetivoId: hogarId },
      veredicto.motivo,
    );
    redirect("/damnificados?error=permiso");
  }

  // Borrar es irreversible: se exige que el funcionario lo escriba, no solo que haga clic.
  if (texto(formData, "confirmacion").toUpperCase() !== "SUPRIMIR") {
    redirect(`/damnificados/${hogarId}?error=confirmacion`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.hogarDamnificado.update({
      where: { id: hogarId },
      data: { responsableNombre: "(suprimido a solicitud del titular)", documento: null },
    });
    await tx.autorizacionTratamiento.deleteMany({ where: { hogarId } });
  });

  await registrarPermitido(sesion, {
    accion: ACCIONES.suprimir,
    objetivoTipo: "HogarDamnificado",
    objetivoId: hogarId,
    datos: { motivo },
  });

  revalidatePath("/damnificados");
  redirect("/damnificados?aviso=suprimido");
}

/**
 * Foto del inmueble afectado (mejora progresiva, research D5).
 *
 * Va aparte del registro del hogar a proposito: si la subida falla —sin almacenamiento
 * configurado, sin señal, formato raro— el hogar ya quedo registrado y la atencion no se
 * detiene por una foto. Lo que se guarda es la imagen sin metadatos; de eso se encarga
 * `subirFotoHogar`.
 */
export async function subirFoto(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const hogarId = texto(formData, "hogarId");

  const hogar = await prisma.hogarDamnificado.findUnique({
    where: { id: hogarId },
    select: { municipioId: true },
  });
  if (!hogar) redirect("/damnificados?error=noexiste");

  const veredicto = puedeGestionarDamnificados(sesion, hogar);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: ACCIONES.actualizar, objetivoTipo: "HogarDamnificado", objetivoId: hogarId },
      veredicto.motivo,
    );
    redirect("/damnificados?error=permiso");
  }

  const archivo = formData.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0) {
    redirect(`/damnificados/${hogarId}?error=foto`);
  }

  const subida = await subirFotoHogar(archivo, hogarId);
  if (!subida.ok) redirect(`/damnificados/${hogarId}?error=foto`);

  await prisma.hogarDamnificado.update({
    where: { id: hogarId },
    data: { fotoRuta: subida.ruta },
  });

  await registrarPermitido(sesion, {
    accion: ACCIONES.actualizar,
    objetivoTipo: "HogarDamnificado",
    objetivoId: hogarId,
    datos: { foto: true, tamano: subida.tamano },
  });

  revalidatePath(`/damnificados/${hogarId}`);
  redirect(`/damnificados/${hogarId}`);
}

/**
 * Comprobacion comun de las acciones sobre un hogar: existe, es de este municipio, y si no
 * lo es queda constancia del intento. Devuelve el hogar o corta la ejecucion.
 */
async function exigirHogarPropio(
  sesion: Awaited<ReturnType<typeof requerirSesion>>,
  hogarId: string,
  accion: string,
) {
  const hogar = await prisma.hogarDamnificado.findUnique({
    where: { id: hogarId },
    select: { municipioId: true },
  });
  if (!hogar) redirect("/damnificados?error=noexiste");

  const veredicto = puedeGestionarDamnificados(sesion, hogar);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion, objetivoTipo: "HogarDamnificado", objetivoId: hogarId },
      veredicto.motivo,
    );
    redirect("/damnificados?error=permiso");
  }
  return hogar;
}

/**
 * Asigna una ayuda del catalogo a un hogar (spec 006 US2).
 *
 * Solo se aceptan ofertas **habilitadas** (`estaHabilitada` de lib/oferta.ts). Una medida
 * anunciada pero sin reglamentar no se puede tramitar, y anotarla como asignada mandaria a
 * la familia a hacer una fila que no existe. La comprobacion se repite aqui aunque la
 * pantalla ya filtre: la pantalla es una sugerencia, el servidor es la regla.
 */
export async function asignarAyuda(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const hogarId = texto(formData, "hogarId");
  const ofertaId = texto(formData, "ofertaId");
  await exigirHogarPropio(sesion, hogarId, ACCIONES.ayuda);

  const oferta = await prisma.ofertaInstitucional.findUnique({
    where: { id: ofertaId },
    select: { id: true, estado: true, tipo: true },
  });
  if (!oferta || !estaHabilitada(oferta)) {
    redirect(`/damnificados/${hogarId}?error=oferta`);
  }

  const entregada = formData.get("estado") === "ENTREGADA";

  await prisma.ayudaAHogar.create({
    data: {
      hogarId,
      ofertaId: oferta.id,
      estado: entregada ? "ENTREGADA" : "PENDIENTE",
      fecha: entregada ? new Date() : null,
      registradoPorId: sesion.usuarioId,
    },
  });

  await registrarPermitido(sesion, {
    accion: ACCIONES.ayuda,
    objetivoTipo: "HogarDamnificado",
    objetivoId: hogarId,
    datos: { ofertaId: oferta.id, tipo: oferta.tipo, entregada },
  });

  revalidatePath(`/damnificados/${hogarId}`);
  redirect(`/damnificados/${hogarId}`);
}

/** Marca una ayuda pendiente como entregada (o la devuelve a pendiente si fue un error). */
export async function cambiarEstadoAyuda(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const ayudaId = texto(formData, "ayudaId");

  const ayuda = await prisma.ayudaAHogar.findUnique({
    where: { id: ayudaId },
    select: { hogarId: true },
  });
  if (!ayuda) redirect("/damnificados?error=noexiste");
  await exigirHogarPropio(sesion, ayuda.hogarId, ACCIONES.ayuda);

  const entregada = formData.get("estado") === "ENTREGADA";

  await prisma.ayudaAHogar.update({
    where: { id: ayudaId },
    data: { estado: entregada ? "ENTREGADA" : "PENDIENTE", fecha: entregada ? new Date() : null },
  });

  await registrarPermitido(sesion, {
    accion: ACCIONES.ayuda,
    objetivoTipo: "AyudaAHogar",
    objetivoId: ayudaId,
    datos: { entregada },
  });

  revalidatePath(`/damnificados/${ayuda.hogarId}`);
  redirect(`/damnificados/${ayuda.hogarId}`);
}
