/**
 * Exportacion a CSV y a Excel sin dependencia nueva (research D2, Principio V).
 *
 * SpreadsheetML 2003 es XML plano que Excel abre de forma nativa: nos ahorra meter una
 * libreria de xlsx para lo unico que necesitamos, que es entregarle un archivo a la UNGRD.
 *
 * Funciones puras sobre datos ya filtrados: **no consultan la base ni saben de sesiones**.
 * Quien las llama es el responsable de haber acotado las filas al ambito del usuario.
 */

export type Columna<F> = { clave: keyof F & string; titulo: string };

/**
 * Excel asume la codificacion local si el CSV no trae marca de orden de bytes, y los
 * nombres colombianos salen con la tilde rota. Quien sirva el archivo antepone esto.
 */
export const BOM_EXCEL = "﻿";

function texto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor);
}

function celdaCsv(valor: unknown): string {
  const s = texto(valor);
  // Una celda con coma, comilla o salto de linea corre el separador y desalinea todo el
  // archivo: se encierra en comillas y las comillas internas se duplican (RFC 4180).
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function aCsv<F>(filas: readonly F[], columnas: readonly Columna<F>[]): string {
  const lineas = [columnas.map((c) => celdaCsv(c.titulo)).join(",")];
  for (const fila of filas) {
    lineas.push(columnas.map((c) => celdaCsv(fila[c.clave])).join(","));
  }
  // CRLF: es lo que dice RFC 4180 y lo que Excel en Windows espera.
  return lineas.join("\r\n");
}

function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function celdaXml(valor: unknown): string {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return '<Cell><Data ss:Type="Number">' + valor + "</Data></Cell>";
  }
  return '<Cell><Data ss:Type="String">' + escaparXml(texto(valor)) + "</Data></Cell>";
}

export function aSpreadsheetML<F>(
  filas: readonly F[],
  columnas: readonly Columna<F>[],
  hoja: string,
): string {
  const encabezado = columnas.map((c) => celdaXml(c.titulo)).join("");
  const cuerpo = filas
    .map((fila) => "<Row>" + columnas.map((c) => celdaXml(fila[c.clave])).join("") + "</Row>")
    .join("");

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"' +
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
    '<Worksheet ss:Name="' +
    escaparXml(hoja.slice(0, 31)) +
    '"><Table>' +
    "<Row>" +
    encabezado +
    "</Row>" +
    cuerpo +
    "</Table></Worksheet>\n</Workbook>"
  );
}
