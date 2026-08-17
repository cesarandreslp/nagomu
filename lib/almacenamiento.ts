import { head, put } from "@vercel/blob";
import { calcularHash, rutaDe, validarArchivo } from "@/lib/documentos";
import type { TipoDocumento } from "@/lib/generated/prisma/enums";

/**
 * Almacenamiento de documentos de respaldo.
 *
 * Los blobs se guardan como `private`. Los estudios de una obra publica son
 * informacion publica, pero eso no significa que su URL deba andar suelta: pasando la
 * descarga por la aplicacion, queda registrado quien consulto que, la regla de acceso
 * vive en un solo lugar, y el mismo mecanismo sirve cuando lleguen los documentos de
 * hogares damnificados, donde el acceso abierto no seria aceptable.
 */

export type ResultadoSubida =
  | { ok: true; ruta: string; hash: string; tamano: number; tipoContenido: string }
  | { ok: false; motivo: string };

export function almacenamientoConfigurado(): boolean {
  return Boolean(process.env["BLOB_READ_WRITE_TOKEN"]);
}

export async function subirDocumento(
  archivo: File,
  obraId: string,
  tipo: TipoDocumento,
): Promise<ResultadoSubida> {
  const validacion = validarArchivo(archivo);
  if (!validacion.ok) return { ok: false, motivo: validacion.motivo };

  if (!almacenamientoConfigurado()) {
    return {
      ok: false,
      motivo:
        "El almacenamiento de documentos no esta configurado. Falta crear el store de Vercel Blob.",
    };
  }

  const contenido = Buffer.from(await archivo.arrayBuffer());
  const hash = calcularHash(contenido);
  const ruta = rutaDe(obraId, tipo, hash, archivo.type);

  // El mismo archivo subido dos veces produce la misma ruta. Se reutiliza en vez de
  // duplicar: dos registros distintos pueden respaldarse en el mismo documento.
  const existente = await head(ruta).catch(() => null);
  if (!existente) {
    await put(ruta, contenido, {
      access: "private",
      contentType: archivo.type,
      addRandomSuffix: false,
    });
  }

  return { ok: true, ruta, hash, tamano: archivo.size, tipoContenido: archivo.type };
}
