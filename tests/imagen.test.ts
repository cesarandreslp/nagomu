import { describe, expect, it } from "vitest";
import { quitarMetadatos } from "@/lib/imagen";

/**
 * Lo que se prueba: que el bloque con la coordenada GPS no sobreviva.
 *
 * Se arman JPEG y PNG minimos a mano en vez de traer archivos de prueba: lo que importa
 * aqui es la estructura de segmentos, no que la imagen se vea.
 */

/** Segmento `FF marcador largo contenido`. El largo se cuenta a si mismo. */
function segmento(marcador: number, contenido: number[]): number[] {
  const largo = contenido.length + 2;
  return [0xff, marcador, largo >> 8, largo & 0xff, ...contenido];
}

const GPS = [0x47, 0x50, 0x53]; // "GPS": lo que no debe quedar

function jpegConExif(): Uint8Array {
  return Uint8Array.from([
    0xff, 0xd8, // SOI
    ...segmento(0xe1, [0x45, 0x78, 0x69, 0x66, ...GPS]), // APP1 EXIF con GPS
    ...segmento(0xfe, [0x68, 0x6f, 0x6c, 0x61]), // comentario
    ...segmento(0xdb, [0x01, 0x02]), // tabla de cuantizacion: se conserva
    0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0x33, // SOS + datos comprimidos
  ]);
}

function chunkPng(tipo: string, datos: number[]): number[] {
  const largo = datos.length;
  return [
    (largo >> 24) & 0xff,
    (largo >> 16) & 0xff,
    (largo >> 8) & 0xff,
    largo & 0xff,
    ...[...tipo].map((c) => c.charCodeAt(0)),
    ...datos,
    0, 0, 0, 0, // crc de mentiras: nada aqui lo verifica
  ];
}

function pngConExif(): Uint8Array {
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunkPng("IHDR", [0x01, 0x02]),
    ...chunkPng("eXIf", GPS),
    ...chunkPng("IDAT", [0x0a, 0x0b]),
    ...chunkPng("IEND", []),
  ]);
}

function contiene(datos: Uint8Array, aguja: number[]): boolean {
  return [...datos].join(",").includes(aguja.join(","));
}

describe("quitarMetadatos", () => {
  it("borra el EXIF de un JPEG y conserva la imagen", () => {
    const limpio = quitarMetadatos(jpegConExif(), "image/jpeg");
    expect(limpio).not.toBeNull();
    expect(contiene(limpio!, GPS)).toBe(false);
    expect(contiene(limpio!, [0x11, 0x22, 0x33])).toBe(true); // los datos comprimidos siguen
    expect(limpio![0]).toBe(0xff);
    expect(limpio![1]).toBe(0xd8);
  });

  it("conserva los segmentos que no son metadatos", () => {
    const limpio = quitarMetadatos(jpegConExif(), "image/jpeg")!;
    expect(contiene(limpio, [0xff, 0xdb])).toBe(true);
  });

  it("borra el chunk eXIf de un PNG y conserva IHDR e IDAT", () => {
    const limpio = quitarMetadatos(pngConExif(), "image/png");
    expect(limpio).not.toBeNull();
    expect(contiene(limpio!, GPS)).toBe(false);
    expect(contiene(limpio!, [...["IHDR"]].flatMap(() => [0x49, 0x48, 0x44, 0x52]))).toBe(true);
    expect(contiene(limpio!, [0x49, 0x44, 0x41, 0x54])).toBe(true);
  });

  it("rechaza lo que no sabe limpiar en vez de dejarlo pasar", () => {
    expect(quitarMetadatos(jpegConExif(), "image/webp")).toBeNull();
    expect(quitarMetadatos(Uint8Array.from([1, 2, 3]), "image/jpeg")).toBeNull();
    expect(quitarMetadatos(Uint8Array.from([]), "image/png")).toBeNull();
  });

  it("no se cuelga con una cadena de segmentos truncada", () => {
    const truncado = Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0x00]);
    expect(() => quitarMetadatos(truncado, "image/jpeg")).not.toThrow();
  });
});
