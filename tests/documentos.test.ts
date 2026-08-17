import { describe, expect, it } from "vitest";
import {
  TAMANO_MAXIMO_BYTES,
  calcularHash,
  formatearTamano,
  rutaDe,
  validarArchivo,
} from "@/lib/documentos";

/**
 * La subida de archivos es una frontera de confianza: lo que entra viene de la maquina
 * de un funcionario. Aqui no se es perezoso.
 */

const archivo = (parcial: Partial<{ size: number; type: string; name: string }> = {}) => ({
  size: 1024,
  type: "application/pdf",
  name: "estudio.pdf",
  ...parcial,
});

describe("validacion de archivos", () => {
  it("acepta PDF e imagenes", () => {
    expect(validarArchivo(archivo({ type: "application/pdf" })).ok).toBe(true);
    expect(validarArchivo(archivo({ type: "image/jpeg" })).ok).toBe(true);
    expect(validarArchivo(archivo({ type: "image/png" })).ok).toBe(true);
    expect(validarArchivo(archivo({ type: "image/webp" })).ok).toBe(true);
  });

  it("rechaza lo que no esta en la lista blanca", () => {
    for (const type of [
      "application/x-msdownload",
      "text/html",
      "application/zip",
      "image/svg+xml",
      "",
    ]) {
      expect(validarArchivo(archivo({ type })).ok, `deberia rechazar ${type}`).toBe(false);
    }
  });

  it("rechaza archivos vacios", () => {
    expect(validarArchivo(archivo({ size: 0 })).ok).toBe(false);
  });

  it("rechaza lo que excede el maximo y dice cuanto pesa", () => {
    const r = validarArchivo(archivo({ size: TAMANO_MAXIMO_BYTES + 1 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain("MB");
  });

  it("acepta justo en el limite", () => {
    expect(validarArchivo(archivo({ size: TAMANO_MAXIMO_BYTES })).ok).toBe(true);
  });
});

describe("huella del contenido", () => {
  it("el mismo contenido da la misma huella", () => {
    expect(calcularHash(Buffer.from("informe"))).toBe(calcularHash(Buffer.from("informe")));
  });

  it("un byte distinto da una huella distinta", () => {
    expect(calcularHash(Buffer.from("informe"))).not.toBe(calcularHash(Buffer.from("informf")));
  });

  it("es un SHA-256 en hexadecimal", () => {
    expect(calcularHash(Buffer.from("x"))).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("ruta de almacenamiento", () => {
  it("no contiene el nombre original del archivo", () => {
    const hash = calcularHash(Buffer.from("contenido"));
    const ruta = rutaDe("obra123", "ESTUDIO", hash, "application/pdf");

    expect(ruta).not.toContain("estudio.pdf");
    expect(ruta).toContain("obra123");
    expect(ruta.endsWith(".pdf")).toBe(true);
  });

  it("el mismo archivo produce la misma ruta, para no duplicarlo", () => {
    const hash = calcularHash(Buffer.from("igual"));
    expect(rutaDe("o1", "ESTUDIO", hash, "image/jpeg")).toBe(
      rutaDe("o1", "ESTUDIO", hash, "image/jpeg"),
    );
  });

  it("separa por tipo de documento", () => {
    const hash = calcularHash(Buffer.from("c"));
    expect(rutaDe("o1", "EVIDENCIA_DANO", hash, "image/jpeg")).toContain("evidencia_dano");
    expect(rutaDe("o1", "ESTUDIO", hash, "application/pdf")).toContain("estudio");
  });
});

describe("formato de tamaño", () => {
  it("usa la unidad que se lee mejor", () => {
    expect(formatearTamano(512)).toBe("512 B");
    expect(formatearTamano(2048)).toBe("2 KB");
    expect(formatearTamano(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
