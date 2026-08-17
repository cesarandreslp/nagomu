import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { registrarPermitido, registrarRechazo } from "@/lib/audit";

/**
 * Descarga de un documento de respaldo.
 *
 * Los blobs se guardan como privados, asi que su contenido se transmite desde aqui en
 * vez de redirigir a una URL del almacenamiento: una URL de blob privado no es
 * accesible por si sola, y aunque lo fuera, redirigir dejaria la descarga fuera del
 * control de la aplicacion.
 *
 * Pasar por aqui es el punto: en un sistema cuya premisa es la auditabilidad, saber
 * quien descargo el estudio que fijo el costo de una obra es parte de lo que se audita.
 */
export async function GET(
  peticion: Request,
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
    return NextResponse.redirect(new URL("/login", peticion.url));
  }

  const documento = await prisma.documento.findUnique({
    where: { id: documentoId },
    select: {
      id: true,
      rutaAlmacenamiento: true,
      tipo: true,
      obraId: true,
      tipoContenido: true,
    },
  });

  if (!documento) return new NextResponse("No existe", { status: 404 });

  const resultado = await get(documento.rutaAlmacenamiento, { access: "private" }).catch(
    () => null,
  );

  if (!resultado) return new NextResponse("El archivo ya no esta disponible", { status: 410 });

  await registrarPermitido(sesion, {
    accion: "documento.descargar",
    objetivoTipo: "Documento",
    objetivoId: documento.id,
    datos: { obraId: documento.obraId, tipo: documento.tipo },
  });

  return new NextResponse(resultado.stream, {
    headers: {
      "Cache-Control": "private, no-cache",
      "Content-Type": resultado.blob.contentType ?? documento.tipoContenido,
      // Sin esto, un navegador podria interpretar un archivo como algo distinto de lo
      // que dice ser, que es como una imagen subida se convierte en un problema.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
