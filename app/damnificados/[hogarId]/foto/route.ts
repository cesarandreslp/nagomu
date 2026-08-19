import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { registrarPermitido, registrarRechazo } from "@/lib/audit";
import { puedeGestionarDamnificados } from "@/lib/authz";

/**
 * Foto del inmueble de un hogar damnificado.
 *
 * Igual que la descarga de documentos, el contenido se transmite desde aqui en vez de
 * redirigir al almacenamiento. La diferencia con aquella es el ambito: un estudio de obra
 * lo ve cualquier funcionario autenticado; la foto de la vivienda de una familia
 * damnificada, solo su municipio. Y el intento de verla desde otro queda auditado.
 */
export async function GET(
  peticion: Request,
  { params }: { params: Promise<{ hogarId: string }> },
) {
  const { hogarId } = await params;
  const sesion = await obtenerSesion();

  if (!sesion) {
    await registrarRechazo(
      null,
      { accion: "damnificado.foto", objetivoTipo: "HogarDamnificado", objetivoId: hogarId },
      "Sesion no valida",
    );
    return NextResponse.redirect(new URL("/login", peticion.url));
  }

  const hogar = await prisma.hogarDamnificado.findUnique({
    where: { id: hogarId },
    select: { municipioId: true, fotoRuta: true },
  });
  if (!hogar) return new NextResponse("No existe", { status: 404 });

  const veredicto = puedeGestionarDamnificados(sesion, hogar);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: "damnificado.foto", objetivoTipo: "HogarDamnificado", objetivoId: hogarId },
      veredicto.motivo,
    );
    return new NextResponse("No autorizado", { status: 403 });
  }

  if (!hogar.fotoRuta) return new NextResponse("Sin foto", { status: 404 });

  const resultado = await get(hogar.fotoRuta, { access: "private" }).catch(() => null);
  if (!resultado) return new NextResponse("El archivo ya no esta disponible", { status: 410 });

  await registrarPermitido(sesion, {
    accion: "damnificado.foto",
    objetivoTipo: "HogarDamnificado",
    objetivoId: hogarId,
  });

  return new NextResponse(resultado.stream, {
    headers: {
      "Cache-Control": "private, no-cache",
      "Content-Type": resultado.blob.contentType ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
