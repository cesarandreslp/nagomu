import { createHash } from "node:crypto";
import type { TipoDocumento } from "@/lib/generated/prisma/enums";

/**
 * Documentos de respaldo: validacion, huella e identidad.
 *
 * La validacion vive en funciones puras, probables sin red ni almacenamiento. Es una
 * frontera de confianza: lo que entra por aqui lo sube un funcionario desde su
 * maquina, y aqui no se es perezoso.
 */

export const ETIQUETA_DOCUMENTO: Record<TipoDocumento, string> = {
  EVIDENCIA_DANO: "Evidencia fotografica del daño",
  COTIZACION_ESTUDIOS: "Cotizacion de los estudios",
  ESTUDIO: "Estudio tecnico",
  AVANCE_OBRA: "Registro fotografico de avance",
  ACTA_RECIBO: "Acta de recibo",
  OTRO: "Otro documento",
};

/**
 * Tipos permitidos. Lista blanca, nunca lista negra: una lista negra deja pasar todo
 * lo que nadie penso en prohibir.
 */
export const TIPOS_PERMITIDOS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** 25 MB. Un estudio estructural con planos pesa; una foto de celular tambien. */
export const TAMANO_MAXIMO_BYTES = 25 * 1024 * 1024;

export type Validacion = { ok: true } | { ok: false; motivo: string };

export function validarArchivo(archivo: {
  size: number;
  type: string;
  name: string;
}): Validacion {
  if (archivo.size === 0) return { ok: false, motivo: "El archivo esta vacio" };

  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    const mb = Math.round(archivo.size / 1024 / 1024);
    return {
      ok: false,
      motivo: `El archivo pesa ${mb} MB y el maximo son ${TAMANO_MAXIMO_BYTES / 1024 / 1024} MB`,
    };
  }

  if (!(archivo.type in TIPOS_PERMITIDOS)) {
    return {
      ok: false,
      motivo: `Tipo de archivo no permitido (${archivo.type || "desconocido"}). Se aceptan PDF, JPG, PNG y WEBP`,
    };
  }

  return { ok: true };
}

/**
 * Huella del contenido.
 *
 * Una URL se puede repuntar a otro archivo sin que nadie lo note. Con el hash
 * guardado, sustituir el documento despues de haberlo presentado es detectable:
 * basta volver a calcularlo sobre lo que hay y comparar.
 */
export function calcularHash(contenido: Buffer | Uint8Array): string {
  return createHash("sha256").update(contenido).digest("hex");
}

/**
 * Ruta en el almacenamiento. No lleva el nombre original del archivo: los
 * funcionarios nombran archivos con datos que no deberian viajar en una ruta
 * ("estudio_casa_señora_martha.pdf"), y las rutas terminan en registros y en URLs.
 */
export function rutaDe(obraId: string, tipo: TipoDocumento, hash: string, mime: string): string {
  const extension = TIPOS_PERMITIDOS[mime] ?? "bin";
  return `obras/${obraId}/${tipo.toLowerCase()}/${hash.slice(0, 32)}.${extension}`;
}

/** Para mostrar tamaños sin que nadie tenga que dividir por 1024 mentalmente. */
export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
