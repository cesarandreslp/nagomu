import { NextResponse } from "next/server";
import { head } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { registrarPermitido, registrarRechazo } from "@/lib/audit";

/**
 * Descarga de un documento de respaldo.
 *
 * Pasa por aqui y no por la URL del almacenamiento para que quede registrado quien
 * consulto que. En un sistema cuya premisa es la auditabilidad, saber quien descargo
 * el estudio que fijo el costo de una obra es parte del punto.
 */
export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ documentoId: string }> },
) {
  const { documentoId } = await params;
  const sesion = await obtenerSesion();

  if (!sesion) {
    await registrarRechazo(
      null,
      { accion: "documento.descargar", objetivoTipo: "Documento", objetivoId: documentoId },
      "Sesion no valida",
    );
    return NextResponse.redirect(new URL("/login", _peticion.url));
  }

  const documento = await prisma.documento.findUnique({
    where: { id: documentoId },
    select: { id: true, rutaAlmacenamiento: true, tipo: true, obraId: true, nombre: true },
  });

  if (!documento) return new NextResponse("No existe", { status: 404 });

  await registrarPermitido(sesion, {
    accion: "documento.descargar",
    objetivoTipo: "Documento",
    objetivoId: documento.id,
    datos: { obraId: documento.obraId, tipo: documento.tipo },
  });

  const blob = await head(documento.rutaAlmacenamiento).catch(() => null);
  if (!blob) return new NextResponse("El archivo ya no esta disponible", { status: 410 });

  return NextResponse.redirect(blob.downloadUrl);
}
