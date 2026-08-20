import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requerirSesion } from "@/lib/auth";
import { Tablero } from "@/app/tablero";

/**
 * Auditoria legible de una obra.
 *
 * Reune todo lo que ocurrio sobre ella, incluidos los intentos rechazados. Un registro
 * de auditoria que solo un administrador de base de datos puede leer no sirve para
 * rendir cuentas: la idea es que un concejal o un periodista abra esta pagina y
 * entienda quien hizo que y cuando.
 */

const ETIQUETA_ACCION: Record<string, string> = {
  "item.crear": "Registro del item en el inventario",
  "obra.cotizarEstudios": "Cotizacion de los estudios",
  "obra.registrarCosto": "Costo entregado por un estudio",
  "obra.cambiarEstado": "Cambio de estado de la obra",
  "aporte.registrar": "Aporte inscrito",
  "aporte.corregir": "Correccion de un aporte",
  "documento.adjuntar": "Documento de respaldo adjuntado",
  "documento.descargar": "Descarga de un documento",
  "intervencion.solicitar": "Solicitud de intervencion de un tercero",
  "intervencion.cambiarEstado": "Cambio de estado de una intervencion",
  "intervencion.verificar": "Verificacion de calidad",
};

export default async function Historial({ params }: { params: Promise<{ obraId: string }> }) {
  const sesion = await requerirSesion();
  const { obraId } = await params;

  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    select: {
      id: true,
      item: { select: { nombre: true } },
      intervenciones: { select: { id: true } },
      aportes: { select: { id: true } },
      documentos: { select: { id: true } },
    },
  });
  if (!obra) notFound();

  // La auditoria referencia objetivos de varios tipos; se reunen los ids que
  // pertenecen a esta obra para traer su historia completa y no solo la de la obra.
  const objetivos = [
    obra.id,
    ...obra.intervenciones.map((i) => i.id),
    ...obra.aportes.map((a) => a.id),
    ...obra.documentos.map((d) => d.id),
  ];

  const registros = await prisma.registroAuditoria.findMany({
    where: { objetivoId: { in: objetivos } },
    orderBy: { creadoEn: "desc" },
    include: {
      usuario: { select: { nombre: true } },
      entidad: { select: { nombre: true } },
    },
  });

  const rechazos = registros.filter((r) => r.resultado === "RECHAZADO").length;

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="obras">
      <main>
        <Link href={`/obras/${obraId}`} className="volver">
          ← {obra.item.nombre}
        </Link>

        <h1>Historial completo</h1>
        <p className="discreto">
          {registros.length} {registros.length === 1 ? "hecho registrado" : "hechos registrados"}
          {rechazos > 0
            ? `, de los cuales ${rechazos} ${rechazos === 1 ? "fue un intento rechazado" : "fueron intentos rechazados"}`
            : ""}
          . Nada de esto se puede editar ni borrar: la base de datos lo impide, no el codigo.
        </p>

        {registros.length === 0 ? (
          <p>Todavia no hay movimientos.</p>
        ) : (
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr>
                  <th>Cuando</th>
                  <th>Que paso</th>
                  <th>Quien</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id}>
                    <td className="discreto">
                      {r.creadoEn.toISOString().slice(0, 10)}{" "}
                      {r.creadoEn.toISOString().slice(11, 16)}
                    </td>
                    <td>
                      {ETIQUETA_ACCION[r.accion] ?? r.accion}
                      {r.motivoRechazo ? <div className="discreto">{r.motivoRechazo}</div> : null}
                    </td>
                    <td className="discreto">
                      {r.usuario?.nombre ?? "(sin identificar)"}
                      {r.entidad ? <div>{r.entidad.nombre}</div> : null}
                    </td>
                    <td className="discreto">
                      {r.resultado === "PERMITIDO" ? "Permitido" : "Rechazado"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </Tablero>
  );
}
