import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { obtenerObra } from "@/lib/consultas";
import { registrarCostoDeEstudio, registrarCotizacionEstudios } from "@/app/actions/obras";
import { ETIQUETA_ESTADO } from "@/lib/estados";
import { desdeDecimal, formatearPesos } from "@/lib/dinero";

const ERRORES: Record<string, string> = {
  monto: "El monto debe ser un numero positivo. Ejemplo: 3000000000 o 3.000.000.000,00",
  faltan: "Falta la fecha del estudio, el responsable o la referencia del documento.",
  fecha: "La fecha del estudio no es valida.",
  etapa: "Antes de registrar el costo hay que pasar por la etapa de estudios.",
  permiso: "Solo el municipio dueño puede registrar el costo de esta obra.",
};

export default async function Costo({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await requerirSesion();
  const { obraId } = await params;
  const obra = await obtenerObra(obraId);
  if (!obra) notFound();

  if (sesion.nivel !== "MUNICIPIO" || sesion.entidadId !== obra.item.municipioId) {
    redirect(`/obras/${obraId}?error=permiso`);
  }

  const { error } = await searchParams;
  const yaTieneCotizacion = obra.costoEstudios !== null;

  return (
    <main>
      <p className="discreto">
        <Link href={`/obras/${obraId}`}>← {obra.item.nombre}</Link>
      </p>

      <h1>Costo de la obra</h1>
      <p className="discreto">
        Estado actual: {ETIQUETA_ESTADO[obra.estado]}. El costo de una obra no existe hasta
        que un estudio lo determina; la cotizacion de los estudios, en cambio, se conoce
        antes. Son dos cifras distintas.
      </p>

      {error ? (
        <p className="error" role="alert">
          {ERRORES[error] ?? "Revisa los datos."}
        </p>
      ) : null}

      <h2>1. Cotizacion de los estudios</h2>
      {yaTieneCotizacion ? (
        <p>
          Registrada: <strong>{formatearPesos(desdeDecimal(obra.costoEstudios!))}</strong>
        </p>
      ) : (
        <p className="discreto">Sin registrar. Al registrarla, la obra pasa a En estudios.</p>
      )}

      <form action={registrarCotizacionEstudios}>
        <input type="hidden" name="obraId" value={obraId} />
        <label>
          <span>Valor cotizado de los estudios</span>
          <input name="costoEstudios" inputMode="decimal" placeholder="200000000" required />
        </label>
        <button type="submit">
          {yaTieneCotizacion ? "Actualizar cotizacion" : "Registrar cotizacion"}
        </button>
      </form>

      <h2>2. Valor que entrego el estudio</h2>
      {obra.estado === "IDENTIFICADO" ? (
        <p className="discreto">
          Todavia no. Primero hay que registrar la cotizacion de los estudios: el valor de la
          obra sale del estudio, no de una estimacion.
        </p>
      ) : (
        <form action={registrarCostoDeEstudio}>
          <input type="hidden" name="obraId" value={obraId} />
          <label>
            <span>Valor de la obra segun el estudio</span>
            <input name="valor" inputMode="decimal" placeholder="3000000000" required />
          </label>
          <label>
            <span>Fecha del estudio</span>
            <input type="date" name="fechaEstudio" required />
          </label>
          <label>
            <span>Responsable del estudio</span>
            <input name="responsable" required maxLength={200} placeholder="Firma o profesional que lo elaboro" />
          </label>
          <label>
            <span>Referencia del documento de respaldo</span>
            <input
              name="referenciaDocumento"
              required
              maxLength={200}
              placeholder="Numero de contrato, radicado o informe"
            />
            <span className="discreto">
              Sin respaldo documental la cifra no es auditable, y esta obra va a repartir
              plata publica.
            </span>
          </label>
          <button type="submit">Registrar valor del estudio</button>
        </form>
      )}

      {obra.costos.length > 0 ? (
        <>
          <h2>Historial de costos</h2>
          <p className="discreto">
            Un estudio posterior puede cambiar la cifra. El valor anterior no se borra: queda
            aqui, y asi se puede ver que cambio y por cuanto.
          </p>
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr>
                  <th>Valor</th>
                  <th>Fecha del estudio</th>
                  <th>Responsable</th>
                  <th>Respaldo</th>
                  <th>Registro</th>
                </tr>
              </thead>
              <tbody>
                {obra.costos.map((costo) => (
                  <tr key={costo.id}>
                    <td>{formatearPesos(desdeDecimal(costo.valor))}</td>
                    <td>{costo.fechaEstudio.toISOString().slice(0, 10)}</td>
                    <td className="discreto">{costo.responsable}</td>
                    <td className="discreto">{costo.referenciaDocumento}</td>
                    <td className="discreto">
                      {costo.creadoEn.toISOString().slice(0, 10)} · {costo.registradoPor.nombre}
                      {costo.corrigeId ? " · corrige uno anterior" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  );
}
