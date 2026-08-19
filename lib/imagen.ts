/**
 * Limpieza de metadatos de imagenes (Principio IV).
 *
 * Una foto tomada con celular trae en sus metadatos la coordenada GPS exacta donde se
 * tomo, la fecha, el modelo del telefono y a veces hasta el numero de serie. Guardar la
 * foto de la vivienda de una familia damnificada tal como sale del telefono equivale a
 * guardar la ubicacion precisa de donde duerme esa familia, sin que nadie lo haya
 * decidido ni lo vea en pantalla.
 *
 * Aqui se quita antes de que el archivo llegue al almacenamiento. Sin dependencias: son
 * dos formatos y en ambos los metadatos viven en bloques que se pueden saltar.
 */

const JPEG_SOI = 0xd8;
const JPEG_SOS = 0xda;

/**
 * JPEG: cadena de segmentos `FF marcador largo …`. Se descartan los APPn (0xE0–0xEF, donde
 * viven EXIF, GPS y XMP) y los comentarios (0xFE). Al llegar a SOS empieza la imagen
 * comprimida y se copia el resto tal cual.
 */
function limpiarJpeg(datos: Uint8Array): Uint8Array {
  const salida: number[] = [0xff, JPEG_SOI];
  let i = 2;

  while (i + 3 < datos.length) {
    if (datos[i] !== 0xff) break; // Estructura inesperada: se corta y se devuelve lo copiado.
    const marcador = datos[i + 1]!;

    if (marcador === JPEG_SOS) {
      for (let j = i; j < datos.length; j++) salida.push(datos[j]!);
      return Uint8Array.from(salida);
    }

    const largo = (datos[i + 2]! << 8) | datos[i + 3]!;
    const descartable = (marcador >= 0xe0 && marcador <= 0xef) || marcador === 0xfe;
    if (!descartable) {
      for (let j = i; j < i + 2 + largo && j < datos.length; j++) salida.push(datos[j]!);
    }
    i += 2 + largo;
  }

  return Uint8Array.from(salida);
}

/** Bloques de PNG que solo llevan metadatos. El resto de la imagen no los necesita. */
const CHUNKS_PNG_A_QUITAR = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);

/** PNG: secuencia de chunks `largo tipo datos crc`. Se saltan los que solo son metadatos. */
function limpiarPng(datos: Uint8Array): Uint8Array {
  const salida: number[] = [];
  for (let j = 0; j < 8; j++) salida.push(datos[j]!); // firma
  let i = 8;

  while (i + 8 <= datos.length) {
    const largo =
      (datos[i]! << 24) | (datos[i + 1]! << 16) | (datos[i + 2]! << 8) | datos[i + 3]!;
    const tipo = String.fromCharCode(datos[i + 4]!, datos[i + 5]!, datos[i + 6]!, datos[i + 7]!);
    const fin = i + 12 + largo;
    if (largo < 0 || fin > datos.length) break;

    if (!CHUNKS_PNG_A_QUITAR.has(tipo)) {
      for (let j = i; j < fin; j++) salida.push(datos[j]!);
    }
    i = fin;
    if (tipo === "IEND") break;
  }

  return Uint8Array.from(salida);
}

/**
 * Devuelve la imagen sin metadatos, o `null` si el formato no se sabe limpiar.
 *
 * `null` significa "no subir": es preferible quedarse sin la foto a guardar una que
 * carga la ubicacion de una familia. Por eso solo se aceptan JPEG y PNG aqui, aunque el
 * resto del sistema admita mas formatos: aquello son planos y cotizaciones de una obra
 * publica, esto es la casa de alguien.
 */
export function quitarMetadatos(datos: Uint8Array, mime: string): Uint8Array | null {
  if (mime === "image/jpeg" && datos[0] === 0xff && datos[1] === JPEG_SOI) {
    return limpiarJpeg(datos);
  }
  if (mime === "image/png" && datos[0] === 0x89 && datos[1] === 0x50) {
    return limpiarPng(datos);
  }
  return null;
}
