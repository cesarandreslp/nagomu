import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { registrarPermitido, registrarRechazo } from "@/lib/audit";
import { puedeVerBienReservado } from "@/lib/authz";

/**
 * Foto de un bien afectado (spec 007 US1).
 *
 * El contenido se transmite desde aqui en vez de redirigir al almacenamiento, igual que la
 * foto del hogar: una URL de almacenamiento que se pueda copiar y pegar deja de estar
 * protegida en cuanto sale de la pantalla. Y el intento de verla desde otro municipio queda
 * auditado, porque el intento tambien es un hecho (Principio I).
 */
export async function GET(peticion: Request, { params }: { params: Promise<{ bienId: string }> }) {
  const { bienId } = await params;
  const sesion = await obtenerSesion();

  if (!sesion) {
    await registrarRechazo(
      null,
      { accion: "bien.foto", objetivoTipo: "ItemInventario", objetivoId: bienId },
      "Sesion no valida",
    );
    return NextResponse.redirect(new URL("/login", peticion.url));
  }

  const bien = await prisma.itemInventario.findUnique({
    where: { id: bienId },
    select: { municipioId: true, fotoRuta: true },
  });
  if (!bien) return new NextResponse("No existe", { status: 404 });

  const veredicto = puedeVerBienReservado(sesion, bien);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: "bien.foto", objetivoTipo: "ItemInventario", objetivoId: bienId },
      veredicto.motivo,
    );
    return new NextResponse("No autorizado", { status: 403 });
  }

  if (!bien.fotoRuta) return new NextResponse("Sin foto", { status: 404 });

  const resultado = await get(bien.fotoRuta, { access: "private" }).catch(() => null);
  if (!resultado) return new NextResponse("El archivo ya no esta disponible", { status: 410 });

  await registrarPermitido(sesion, {
    accion: "bien.foto",
    objetivoTipo: "ItemInventario",
    objetivoId: bienId,
  });

  return new NextResponse(resultado.stream, {
    headers: {
      "Cache-Control": "private, no-cache",
      "Content-Type": resultado.blob.contentType ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
