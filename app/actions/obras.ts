"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requerirSesion } from "@/lib/auth";
import { puedeCrearItemInventario } from "@/lib/authz";
import type { SesionActiva } from "@/lib/auth";
import { registrarPermitido, registrarRechazo } from "@/lib/audit";
import { puedeEditarObra } from "@/lib/authz";
import { ETIQUETA_CATEGORIA, nivelDe } from "@/lib/prioridad";
import { puedeTransicionar } from "@/lib/estados";
import { aDecimal, esPositivo, parsearPesos } from "@/lib/dinero";
import { parsearCoordenada } from "@/lib/geo";
import { ETIQUETA_DOCUMENTO } from "@/lib/documentos";
import { subirDocumento } from "@/lib/almacenamiento";
import { ETIQUETA_SECTOR, estadoValidoPara, sectorEsObraPublica } from "@/lib/bienes";
import { CAMPO_CLAVE, claveValida, esReenvio } from "@/lib/captura";
import type { CategoriaItem, EstadoObra, TipoDocumento } from "@/lib/generated/prisma/enums";
import { Sector, EstadoAfectacion } from "@/lib/generated/prisma/enums";

const CATEGORIAS = Object.keys(ETIQUETA_CATEGORIA) as CategoriaItem[];
const SECTORES = Object.keys(ETIQUETA_SECTOR) as Sector[];
const ESTADOS = Object.values(EstadoAfectacion);

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/**
 * Devuelve null si el campo viene vacio, y el numero si es un entero no negativo.
 * Un valor mal escrito no se convierte en cero en silencio: eso alteraria la
 * prioridad de una obra sin que nadie lo note.
 */
function enteroOpcional(formData: FormData, campo: string): number | null | "invalido" {
  const bruto = texto(formData, campo);
  if (bruto === "") return null;
  if (!/^\d+$/.test(bruto)) return "invalido";
  return Number(bruto);
}

/**
 * Registra un bien afectado (spec 007). Cada bien tiene un SECTOR doliente (a que
 * ministerio/secretaria sube) y un TIPO concreto dentro del sector (texto libre). Solo
 * un bien de un sector de obra publica (con categoria) crea una Obra con su cola de
 * priorizacion (spec 001); vivienda, comercio y agropecuario se caracterizan pero no
 * entran a esa fila.
 *
 * La DIRECCION (`ubicacion`) es reservada (enmienda 4.0.0) y opcional: un bien puede
 * ubicarse solo por su lugar general (corregimiento/vereda) o su punto. Nunca sale en
 * una vista publica (eso lo garantiza lib/censo.ts).
 */
export async function registrarBien(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();

  const veredicto = puedeCrearItemInventario(sesion);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: "bien.registrar", objetivoTipo: "ItemInventario" },
      veredicto.motivo,
    );
    redirect("/bienes?error=permiso");
  }

  const nombre = texto(formData, "nombre");
  const sector = texto(formData, "sector") as Sector;
  const tipoBien = texto(formData, "tipoBien"); // texto libre (tipo concreto)
  const estadoBruto = texto(formData, "estadoAfectacion");
  const categoria = texto(formData, "categoria") as CategoriaItem;
  const descripcionDano = texto(formData, "descripcionDano");
  const ubicacion = texto(formData, "ubicacion"); // direccion reservada, opcional
  const corregimiento = texto(formData, "corregimiento");
  const vereda = texto(formData, "vereda");
  const personas = enteroOpcional(formData, "personasBeneficiadas");
  const meses = enteroOpcional(formData, "mesesFueraDeServicio");
  const coordenada = parsearCoordenada(texto(formData, "latitud"), texto(formData, "longitud"));
  // Clave del envio capturado en campo (spec 008). Solo la traen los envios de la cola
  // offline; un registro hecho en linea llega sin ella.
  const claveCaptura = claveValida(texto(formData, CAMPO_CLAVE));

  if (!nombre || !descripcionDano || !tipoBien) redirect("/bienes/nuevo?error=faltan");
  if (!SECTORES.includes(sector)) redirect("/bienes/nuevo?error=sector");

  // El estado es opcional, pero si viene tiene que ser coherente con el sector.
  const estadoAfectacion = estadoBruto === "" ? null : (estadoBruto as (typeof ESTADOS)[number]);
  if (estadoAfectacion !== null) {
    if (!ESTADOS.includes(estadoAfectacion) || !estadoValidoPara(sector, estadoAfectacion)) {
      redirect("/bienes/nuevo?error=estado");
    }
  }

  if (personas === "invalido" || meses === "invalido") redirect("/bienes/nuevo?error=numero");
  if (coordenada === "invalido") redirect("/bienes/nuevo?error=coordenada");

  // Un bien de un sector de obra publica se vuelve obra si trae categoria: es lo que lo
  // mete a la cola de priorizacion (spec 001, intacto). El sector debe permitirlo.
  const categoriaValida = CATEGORIAS.includes(categoria);
  const esObra = sectorEsObraPublica(sector) && categoriaValida;
  if (categoriaValida && !sectorEsObraPublica(sector)) redirect("/bienes/nuevo?error=categoria");

  // Reenvio de algo que ya entro: la cola de un dispositivo reintenta cuando no le llego
  // la respuesta, y dos pestañas pueden vaciarla a la vez. Se responde como exito sin
  // volver a crear nada.
  if (claveCaptura) {
    const previo = await prisma.itemInventario.findUnique({
      where: { claveCaptura },
      select: { obra: { select: { id: true } } },
    });
    if (previo) redirect(previo.obra ? `/obras/${previo.obra.id}` : "/bienes");
  }

  // El municipio sale de la sesion y nunca del formulario: si viniera del cliente,
  // cualquiera podria inscribir bienes en territorio ajeno (Principio II).
  const datosItem = {
    municipioId: sesion.entidadId,
    nombre,
    sector,
    tipoBien,
    estadoAfectacion,
    categoria: esObra ? categoria : null,
    descripcionDano,
    ubicacion,
    corregimiento: corregimiento || null,
    vereda: vereda || null,
    personasBeneficiadas: personas,
    mesesFueraDeServicio: meses ?? 0,
    claveCaptura,
    latitud: coordenada?.latitud ?? null,
    longitud: coordenada?.longitud ?? null,
  };

  if (esObra) {
    // La carrera que el pre-chequeo no cubre —dos reenvios simultaneos— la resuelve el
    // indice unico de Postgres; aqui solo se traduce a "ya estaba".
    let obra;
    try {
      obra = await prisma.obra.create({
        data: { item: { create: datosItem } },
        include: { item: true },
      });
    } catch (error) {
      if (!esReenvio(error)) throw error;
      redirect("/bienes");
    }
    await registrarPermitido(sesion, {
      accion: "bien.registrar",
      objetivoTipo: "Obra",
      objetivoId: obra!.id,
      // Sin datos personales ni la direccion: sector doliente, tipo, categoria, nivel.
      datos: {
        nombre,
        sector,
        tipoBien,
        categoria,
        nivel: nivelDe(categoria),
        tieneCoordenada: coordenada !== null,
      },
    });
    redirect(`/obras/${obra!.id}`);
  }

  let item;
  try {
    item = await prisma.itemInventario.create({ data: datosItem });
  } catch (error) {
    if (!esReenvio(error)) throw error;
    redirect("/bienes");
  }
  await registrarPermitido(sesion, {
    accion: "bien.registrar",
    objetivoTipo: "ItemInventario",
    objetivoId: item!.id,
    // Sin datos personales ni la direccion (Principio IV): sector, tipo y afectacion.
    datos: { nombre, sector, tipoBien, estadoAfectacion, tieneCoordenada: coordenada !== null },
  });
  redirect("/bienes");
}

/**
 * Adjunta un documento de respaldo a una obra: evidencia fotografica del daño,
 * cotizacion, estudio, avance o acta.
 *
 * La evidencia del daño suele ser lo primero que existe. Una brigada la toma el mismo
 * dia, antes de que haya estudio, cotizacion o presupuesto, y es lo que sostiene todo
 * lo que viene despues.
 */
export async function adjuntarDocumento(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const obraId = texto(formData, "obraId");
  await obraQuePuedeEditar(sesion, obraId, "documento.adjuntar");

  const tipo = texto(formData, "tipo") as TipoDocumento;
  if (!(tipo in ETIQUETA_DOCUMENTO)) redirect(`/obras/${obraId}/documentos?error=tipo`);

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    redirect(`/obras/${obraId}/documentos?error=archivo`);
  }

  const subida = await subirDocumento(archivo, obraId, tipo);
  if (!subida.ok) {
    await registrarRechazo(
      sesion,
      { accion: "documento.adjuntar", objetivoTipo: "Obra", objetivoId: obraId },
      subida.motivo,
    );
    redirect(`/obras/${obraId}/documentos?error=subida`);
  }

  const documento = await prisma.documento.create({
    data: {
      obraId,
      tipo,
      // El nombre lo escribe el funcionario; el del archivo puede traer datos que no
      // deberian quedar registrados.
      nombre: texto(formData, "nombre") || ETIQUETA_DOCUMENTO[tipo],
      rutaAlmacenamiento: subida.ruta,
      hashSha256: subida.hash,
      tamanoBytes: subida.tamano,
      tipoContenido: subida.tipoContenido,
      subidoPorId: sesion.usuarioId,
    },
  });

  await registrarPermitido(sesion, {
    accion: "documento.adjuntar",
    objetivoTipo: "Documento",
    objetivoId: documento.id,
    datos: { obraId, tipo, hash: subida.hash, bytes: subida.tamano },
  });

  redirect(`/obras/${obraId}/documentos`);
}

/**
 * Verifica que quien actua sea el municipio dueño de la obra. Devuelve la obra con lo
 * necesario para decidir, o corta con un redirect dejando el intento auditado.
 */
async function obraQuePuedeEditar(sesion: SesionActiva, obraId: string, accion: string) {
  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    select: {
      id: true,
      estado: true,
      costoEstudios: true,
      item: { select: { municipioId: true, nombre: true } },
      _count: { select: { costos: true } },
    },
  });

  if (!obra) redirect("/obras?error=noexiste");

  const veredicto = puedeEditarObra(sesion, { municipioId: obra.item.municipioId });
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion, objetivoTipo: "Obra", objetivoId: obra.id },
      veredicto.motivo,
    );
    redirect(`/obras/${obra.id}?error=permiso`);
  }

  return obra;
}

/** Cotizacion de los estudios. Se conoce antes que el costo de la obra. */
export async function registrarCotizacionEstudios(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const obraId = texto(formData, "obraId");
  const obra = await obraQuePuedeEditar(sesion, obraId, "obra.cotizarEstudios");

  let monto: bigint;
  try {
    monto = parsearPesos(texto(formData, "costoEstudios"));
  } catch {
    redirect(`/obras/${obraId}/costo?error=monto`);
  }
  if (!esPositivo(monto)) redirect(`/obras/${obraId}/costo?error=monto`);

  const transicion = puedeTransicionar(obra.estado, "EN_ESTUDIOS", {
    tieneCosto: obra._count.costos > 0,
  });

  await prisma.$transaction(async (tx) => {
    await tx.obra.update({
      where: { id: obraId },
      data: { costoEstudios: aDecimal(monto) },
    });

    // Si la obra ya paso de estudios, se registra la cotizacion sin mover el estado.
    if (transicion.valida) {
      await tx.cambioEstadoObra.create({
        data: {
          obraId,
          estadoAnterior: obra.estado,
          estadoNuevo: "EN_ESTUDIOS",
          motivo: "Se registro la cotizacion de los estudios",
          usuarioId: sesion.usuarioId,
        },
      });
      await tx.obra.update({ where: { id: obraId }, data: { estado: "EN_ESTUDIOS" } });
    }
  });

  await registrarPermitido(sesion, {
    accion: "obra.cotizarEstudios",
    objetivoTipo: "Obra",
    objetivoId: obraId,
    datos: {
      costoEstudios: aDecimal(monto),
      estado: transicion.valida ? "EN_ESTUDIOS" : obra.estado,
    },
  });

  redirect(`/obras/${obraId}`);
}

/**
 * El costo de la obra lo determina el estudio, no una estimacion. Por eso exige fecha,
 * responsable y documento de respaldo: una cifra sin respaldo no es auditable.
 */
export async function registrarCostoDeEstudio(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const obraId = texto(formData, "obraId");
  const obra = await obraQuePuedeEditar(sesion, obraId, "obra.registrarCosto");

  const referenciaDocumento = texto(formData, "referenciaDocumento");
  const responsable = texto(formData, "responsable");
  const fechaBruta = texto(formData, "fechaEstudio");

  if (!referenciaDocumento || !responsable || !fechaBruta) {
    redirect(`/obras/${obraId}/costo?error=faltan`);
  }

  const fechaEstudio = new Date(fechaBruta);
  if (Number.isNaN(fechaEstudio.getTime())) redirect(`/obras/${obraId}/costo?error=fecha`);

  let valor: bigint;
  try {
    valor = parsearPesos(texto(formData, "valor"));
  } catch {
    redirect(`/obras/${obraId}/costo?error=monto`);
  }
  if (!esPositivo(valor)) redirect(`/obras/${obraId}/costo?error=monto`);

  // La obra tiene que haber pasado por estudios: el costo lo entrega un estudio.
  if (obra.estado === "IDENTIFICADO") {
    await registrarRechazo(
      sesion,
      { accion: "obra.registrarCosto", objetivoTipo: "Obra", objetivoId: obraId },
      "Falta pasar por En estudios antes de registrar el costo",
    );
    redirect(`/obras/${obraId}/costo?error=etapa`);
  }

  const corrigeId = texto(formData, "corrigeId") || null;

  await prisma.$transaction(async (tx) => {
    await tx.costoObra.create({
      data: {
        obraId,
        valor: aDecimal(valor),
        fechaEstudio,
        referenciaDocumento,
        responsable,
        registradoPorId: sesion.usuarioId,
        corrigeId,
      },
    });

    if (obra.estado === "EN_ESTUDIOS") {
      await tx.cambioEstadoObra.create({
        data: {
          obraId,
          estadoAnterior: obra.estado,
          estadoNuevo: "COSTEADO",
          motivo: "El estudio entrego el valor de la obra",
          usuarioId: sesion.usuarioId,
        },
      });
      await tx.obra.update({ where: { id: obraId }, data: { estado: "COSTEADO" } });
    }
  });

  await registrarPermitido(sesion, {
    accion: "obra.registrarCosto",
    objetivoTipo: "Obra",
    objetivoId: obraId,
    datos: {
      valor: aDecimal(valor),
      fechaEstudio: fechaEstudio.toISOString().slice(0, 10),
      referenciaDocumento,
      corrige: corrigeId,
    },
  });

  redirect(`/obras/${obraId}`);
}

/** Avance explicito de estado, para las etapas que no dispara otro registro. */
export async function cambiarEstadoObra(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();
  const obraId = texto(formData, "obraId");
  const obra = await obraQuePuedeEditar(sesion, obraId, "obra.cambiarEstado");

  const estadoNuevo = texto(formData, "estadoNuevo") as EstadoObra;
  const motivo = texto(formData, "motivo") || null;

  const transicion = puedeTransicionar(obra.estado, estadoNuevo, {
    tieneCosto: obra._count.costos > 0,
  });

  if (!transicion.valida) {
    await registrarRechazo(
      sesion,
      { accion: "obra.cambiarEstado", objetivoTipo: "Obra", objetivoId: obraId },
      transicion.motivo,
    );
    redirect(`/obras/${obraId}?error=transicion`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.cambioEstadoObra.create({
      data: {
        obraId,
        estadoAnterior: obra.estado,
        estadoNuevo,
        motivo,
        usuarioId: sesion.usuarioId,
      },
    });
    await tx.obra.update({ where: { id: obraId }, data: { estado: estadoNuevo } });
  });

  await registrarPermitido(sesion, {
    accion: "obra.cambiarEstado",
    objetivoTipo: "Obra",
    objetivoId: obraId,
    datos: { de: obra.estado, a: estadoNuevo },
  });

  redirect(`/obras/${obraId}`);
}
