import { describe, expect, it } from "vitest";
import { aCsv, aSpreadsheetML, type Columna } from "@/lib/export";

/**
 * Lo que se prueba aqui es el escape. Un archivo de damnificados va a llevar apellidos con
 * comillas, direcciones con comas y observaciones con saltos de linea: si el escape falla,
 * el archivo que recibe la UNGRD queda con las columnas corridas y los datos de un hogar
 * mezclados con los del siguiente.
 */

type Fila = { nombre: string; personas: number; nota: string };

const COLUMNAS: Columna<Fila>[] = [
  { clave: "nombre", titulo: "Responsable" },
  { clave: "personas", titulo: "Personas" },
  { clave: "nota", titulo: "Observacion" },
];

describe("aCsv", () => {
  it("escribe encabezado y filas simples", () => {
    const csv = aCsv([{ nombre: "Ana", personas: 3, nota: "ok" }], COLUMNAS);
    expect(csv).toBe("Responsable,Personas,Observacion\r\nAna,3,ok");
  });

  it("encierra la celda que trae una coma", () => {
    const csv = aCsv([{ nombre: "Ana, Maria", personas: 1, nota: "" }], COLUMNAS);
    expect(csv.split("\r\n")[1]).toBe('"Ana, Maria",1,');
  });

  it("duplica las comillas internas", () => {
    const csv = aCsv([{ nombre: 'Ana "la mona"', personas: 1, nota: "" }], COLUMNAS);
    expect(csv.split("\r\n")[1]).toBe('"Ana ""la mona""",1,');
  });

  it("encierra la celda con salto de linea sin partir la fila", () => {
    const csv = aCsv([{ nombre: "Ana", personas: 1, nota: "vive\nen el albergue" }], COLUMNAS);
    expect(csv).toBe('Responsable,Personas,Observacion\r\nAna,1,"vive\nen el albergue"');
  });

  it("con cero filas deja solo el encabezado", () => {
    expect(aCsv([], COLUMNAS)).toBe("Responsable,Personas,Observacion");
  });
});

describe("aSpreadsheetML", () => {
  it("escapa los caracteres reservados del XML", () => {
    const xml = aSpreadsheetML(
      [{ nombre: 'Ana & <Pepe> "x"', personas: 2, nota: "" }],
      COLUMNAS,
      "Hogares",
    );
    expect(xml).toContain("Ana &amp; &lt;Pepe&gt; &quot;x&quot;");
    expect(xml).not.toContain("<Pepe>");
  });

  it("marca los numeros como numero para que Excel pueda sumarlos", () => {
    const xml = aSpreadsheetML([{ nombre: "Ana", personas: 4, nota: "" }], COLUMNAS, "Hogares");
    expect(xml).toContain('<Data ss:Type="Number">4</Data>');
  });

  it("con cero filas sigue siendo un libro valido con encabezado", () => {
    const xml = aSpreadsheetML([], COLUMNAS, "Hogares");
    expect(xml).toContain("<Workbook");
    expect(xml).toContain("</Workbook>");
    expect(xml).toContain("Responsable");
    expect((xml.match(/<Row>/g) ?? []).length).toBe(1);
  });

  it("recorta el nombre de hoja al limite de Excel", () => {
    const xml = aSpreadsheetML([], COLUMNAS, "n".repeat(40));
    expect(xml).toContain('ss:Name="' + "n".repeat(31) + '"');
  });
});
