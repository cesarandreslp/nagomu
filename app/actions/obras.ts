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
import type { CategoriaItem, EstadoObra } from "@/lib/generated/prisma/enums";

const CATEGORIAS = Object.keys(ETIQUETA_CATEGORIA) as CategoriaItem[];

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

export async function crearItemInventario(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();

  const veredicto = puedeCrearItemInventario(sesion);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: "item.crear", objetivoTipo: "ItemInventario" },
      veredicto.motivo,
    );
    redirect("/obras?error=permiso");
  }

  const nombre = texto(formData, "nombre");
  const ubicacion = texto(formData, "ubicacion");
  const categoria = texto(formData, "categoria") as CategoriaItem;
  const descripcionDano = texto(formData, "descripcionDano");
  const personas = enteroOpcional(formData, "personasBeneficiadas");
  const meses = enteroOpcional(formData, "mesesFueraDeServicio");

  if (!nombre || !ubicacion || !descripcionDano) redirect("/obras/nueva?error=faltan");
  if (!CATEGORIAS.includes(categoria)) redirect("/obras/nueva?error=categoria");
  if (personas === "invalido" || meses === "invalido") redirect("/obras/nueva?error=numero");

  // El municipio sale de la sesion y nunca del formulario: si viniera del cliente,
  // cualquiera podria inscribir obras en territorio ajeno (Principio II).
  const obra = await prisma.obra.create({
    data: {
      item: {
        create: {
          municipioId: sesion.entidadId,
          nombre,
          ubicacion,
          categoria,
          descripcionDano,
          personasBeneficiadas: personas,
          mesesFueraDeServicio: meses ?? 0,
        },
      },
    },
    include: { item: true },
  });

  await registrarPermitido(sesion, {
    accion: "item.crear",
    objetivoTipo: "Obra",
    objetivoId: obra.id,
    // Sin datos personales: nombre del bien, categoria y nivel resultante.
    datos: {
      nombre,
      categoria,
      nivel: nivelDe(categoria),
      personasBeneficiadas: personas,
      mesesFueraDeServicio: meses ?? 0,
    },
  });

  redirect(`/obras/${obra.id}`);
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
    datos: { costoEstudios: aDecimal(monto), estado: transicion.valida ? "EN_ESTUDIOS" : obra.estado },
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
