import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { registrarPermitido, registrarRechazo } from "@/lib/audit";
import { puedeRegistrarDamnificado } from "@/lib/authz";
import { ACCIONES, filasParaExport, COLUMNAS_EXPORT } from "@/lib/damnificados";
import { BOM_EXCEL, aCsv, aSpreadsheetML } from "@/lib/export";

/**
 * Entrega del registro municipal a la UNGRD (spec 006 US3, FR-011).
 *
 * Es un GET y no una Server Action a proposito: una descarga es un GET, funciona sin
 * JavaScript y se puede poner en un enlace (Principio III). El contrato del spec la
 * describia como Server Action; se documenta aqui la desviacion.
 *
 * Solo el municipio dueño y solo su propio registro: el `municipioId` sale de la sesion y
 * no se recibe por parametro. Cada descarga queda auditada, porque este es el momento en
 * que datos personales salen del sistema hacia un archivo que despues viaja por correo.
 */
export async function GET(peticion: Request) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    await registrarRechazo(
      null,
      { accion: ACCIONES.exportar, objetivoTipo: "HogarDamnificado" },
      "Sesion no valida",
    );
    return NextResponse.redirect(new URL("/login", peticion.url));
  }

  const veredicto = puedeRegistrarDamnificado(sesion);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: ACCIONES.exportar, objetivoTipo: "HogarDamnificado" },
      veredicto.motivo,
    );
    return new NextResponse("Solo el municipio exporta su propio registro", { status: 403 });
  }

  const formato = new URL(peticion.url).searchParams.get("formato") === "excel" ? "excel" : "csv";
  const filas = await filasParaExport(sesion.entidadId);

  await registrarPermitido(sesion, {
    accion: ACCIONES.exportar,
    objetivoTipo: "HogarDamnificado",
    // Cuantos, no quienes.
    datos: { formato, hogares: filas.length },
  });

  const fecha = new Date().toISOString().slice(0, 10);
  // La advertencia va en el nombre del archivo y no como linea suelta dentro de el: el
  // archivo puede terminar cargandose en otro sistema, y una linea de texto encima de los
  // encabezados corre las columnas. El nombre viaja con el archivo a donde vaya.
  const nombre = `damnificados-RESERVADO-${fecha}.${formato === "excel" ? "xml" : "csv"}`;

  const cuerpo =
    formato === "excel"
      ? aSpreadsheetML(filas, COLUMNAS_EXPORT, "Damnificados")
      : BOM_EXCEL + aCsv(filas, COLUMNAS_EXPORT);

  return new NextResponse(cuerpo, {
    headers: {
      "Content-Type":
        formato === "excel"
          ? "application/vnd.ms-excel; charset=utf-8"
          : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      // El archivo sale del sistema auditado y entra a un computador que no lo esta. Que
      // al menos quede dicho lo que lleva dentro.
      "X-Tratamiento": "Reservado - datos personales Ley 1581 de 2012",
      "Cache-Control": "private, no-store",
    },
  });
}
