import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requerirSesion } from "@/lib/auth";
import { adjuntarDocumento } from "@/app/actions/obras";
import {
  ETIQUETA_DOCUMENTO,
  TAMANO_MAXIMO_BYTES,
  formatearTamano,
} from "@/lib/documentos";
import { almacenamientoConfigurado } from "@/lib/almacenamiento";
import type { TipoDocumento } from "@/lib/generated/prisma/enums";

const ERRORES: Record<string, string> = {
  tipo: "Escoge que clase de documento es.",
  archivo: "Selecciona un archivo.",
  subida: "No fue posible guardar el archivo. Revisa el tipo y el tamaño.",
  permiso: "Solo el municipio dueño puede adjuntar documentos a esta obra.",
};

const TIPOS = Object.keys(ETIQUETA_DOCUMENTO) as TipoDocumento[];

export default async function Documentos({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await requerirSesion();
  const { obraId } = await params;

  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    include: {
      item: { select: { nombre: true, municipioId: true } },
      documentos: {
        orderBy: { creadoEn: "desc" },
        include: { subidoPor: { select: { nombre: true } } },
      },
    },
  });
  if (!obra) notFound();

  const { error } = await searchParams;
  const esDueño = sesion.nivel === "MUNICIPIO" && sesion.entidadId === obra.item.municipioId;
  const hayAlmacenamiento = almacenamientoConfigurado();

  return (
    <main>
      <p className="discreto">
        <Link href={`/obras/${obraId}`}>← {obra.item.nombre}</Link>
      </p>

      <h1>Documentos de respaldo</h1>
      <p className="discreto">
        Fotografias del daño, cotizaciones, estudios, avances y actas. De cada archivo se
        guarda su huella digital, asi que si alguien lo reemplaza despues de presentado, se
        nota.
      </p>

      {error ? (
        <p className="error" role="alert">
          {ERRORES[error] ?? "No fue posible adjuntar el documento."}
        </p>
      ) : null}

      {!hayAlmacenamiento ? (
        <p className="error">
          El almacenamiento de documentos todavia no esta configurado: falta crear el store
          de Vercel Blob en el proyecto. Hasta entonces no se pueden adjuntar archivos.
        </p>
      ) : null}

      {esDueño && hayAlmacenamiento ? (
        <form action={adjuntarDocumento}>
          <input type="hidden" name="obraId" value={obraId} />
          <label>
            <span>Que clase de documento es</span>
            <select name="tipo" required defaultValue="EVIDENCIA_DANO">
              {TIPOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {ETIQUETA_DOCUMENTO[tipo]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Descripcion</span>
            <input name="nombre" maxLength={200} placeholder="Cubierta del ala norte, vista desde el patio" />
          </label>
          <label>
            <span>Archivo</span>
            <input
              type="file"
              name="archivo"
              required
              accept="application/pdf,image/jpeg,image/png,image/webp"
            />
            <span className="discreto">
              PDF, JPG, PNG o WEBP. Maximo {formatearTamano(TAMANO_MAXIMO_BYTES)}. Las
              fotografias deben documentar el daño, no a las personas.
            </span>
          </label>
          <button type="submit">Adjuntar</button>
        </form>
      ) : null}

      {obra.documentos.length === 0 ? (
        <p>Todavia no hay documentos adjuntos.</p>
      ) : (
        <div className="tabla-desplazable">
          <table>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Clase</th>
                <th>Huella SHA-256</th>
                <th>Quien lo aporto</th>
              </tr>
            </thead>
            <tbody>
              {obra.documentos.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/documentos/${d.id}`}>{d.nombre}</Link>
                    <div className="discreto">
                      {d.tipoContenido} · {formatearTamano(d.tamanoBytes)}
                    </div>
                  </td>
                  <td className="discreto">{ETIQUETA_DOCUMENTO[d.tipo]}</td>
                  <td className="discreto">
                    <code>{d.hashSha256.slice(0, 16)}…</code>
                  </td>
                  <td className="discreto">
                    {d.creadoEn.toISOString().slice(0, 10)} · {d.subidoPor.nombre}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="discreto">
        Las descargas quedan registradas en la auditoria: en un sistema cuya premisa es la
        trazabilidad, saber quien consulto el estudio que fijo el costo de una obra es parte
        del punto.
      </p>
    </main>
  );
}
