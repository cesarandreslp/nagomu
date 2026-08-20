import { head, put } from "@vercel/blob";

import { TIPOS_PERMITIDOS, calcularHash, rutaDe, validarArchivo } from "@/lib/documentos";
import { quitarMetadatos } from "@/lib/imagen";
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

/**
 * Foto del inmueble de un hogar damnificado (spec 006).
 *
 * Camino aparte del de los documentos de obra, y mas estricto, porque lo que se guarda es
 * la casa de una familia y no una obra publica:
 *
 * - solo JPEG y PNG, que son los dos formatos cuyos metadatos se saben limpiar;
 * - los metadatos se quitan **antes** de subir (lib/imagen.ts), de modo que la coordenada
 *   GPS del telefono no llega nunca al almacenamiento;
 * - el hash se calcula sobre la imagen ya limpia: es lo unico que existe despues.
 */
export async function subirFotoHogar(archivo: File, hogarId: string): Promise<ResultadoSubida> {
  return subirFotoPrivada(archivo, `damnificados/${hogarId}`);
}

/**
 * Foto de un bien afectado (spec 007 US1). Mismas reglas que la del hogar —solo JPG/PNG,
 * metadatos fuera antes de subir, hash sobre la imagen ya limpia— porque el riesgo es el
 * mismo: la foto de una vivienda dañada trae en el EXIF la coordenada exacta de una
 * familia, y esa coordenada es reservada (Principio IV).
 */
export async function subirFotoBien(archivo: File, bienId: string): Promise<ResultadoSubida> {
  return subirFotoPrivada(archivo, `bienes/${bienId}`);
}

async function subirFotoPrivada(archivo: File, carpeta: string): Promise<ResultadoSubida> {
  const validacion = validarArchivo(archivo);
  if (!validacion.ok) return { ok: false, motivo: validacion.motivo };

  if (!almacenamientoConfigurado()) {
    return { ok: false, motivo: "El almacenamiento de fotos no esta configurado." };
  }

  const original = new Uint8Array(await archivo.arrayBuffer());
  const limpia = quitarMetadatos(original, archivo.type);
  if (!limpia) {
    return {
      ok: false,
      motivo: "Solo se aceptan fotos JPG o PNG: son las que se pueden guardar sin la ubicacion.",
    };
  }

  const contenido = Buffer.from(limpia);
  const hash = calcularHash(contenido);
  // Misma politica que `rutaDe`: la ruta no lleva el nombre original del archivo, porque
  // ahi es donde los funcionarios ponen nombres de personas sin darse cuenta.
  const extension = TIPOS_PERMITIDOS[archivo.type] ?? "bin";
  const ruta = `${carpeta}/${hash.slice(0, 32)}.${extension}`;

  const existente = await head(ruta).catch(() => null);
  if (!existente) {
    await put(ruta, contenido, {
      access: "private",
      contentType: archivo.type,
      addRandomSuffix: false,
    });
  }

  return { ok: true, ruta, hash, tamano: contenido.byteLength, tipoContenido: archivo.type };
}
