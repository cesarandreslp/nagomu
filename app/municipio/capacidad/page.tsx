import { Tablero } from "@/app/tablero";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requerirSesion } from "@/lib/auth";
import { reportarCapacidadFiscal } from "@/app/actions/municipio";
import { desdeDecimal, formatearPesos } from "@/lib/dinero";
import { capacidadVencida } from "@/lib/financiacion";

const ERRORES: Record<string, string> = {
  faltan: "Falta la fecha o el nombre de quien reporto el dato.",
  fecha: "La fecha del reporte no es valida.",
  monto: "El monto debe ser un numero positivo.",
};

export default async function Capacidad({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await requerirSesion();
  if (sesion.nivel !== "MUNICIPIO") redirect("/obras?error=permiso");

  const { error } = await searchParams;
  const serie = await prisma.capacidadFiscal.findMany({
    where: { municipioId: sesion.entidadId },
    orderBy: { fechaReporte: "desc" },
    include: { registradoPor: { select: { nombre: true } } },
  });

  const vigente = serie[0];
  const vencida = vigente ? capacidadVencida(vigente.fechaReporte, new Date()) : false;

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="capacidad">
      <main>
        <div className="cabecera-pagina">
          <div>
            <h1>Capacidad fiscal de {sesion.entidadNombre}</h1>
            <p className="discreto">
              Cuanta plata propia puede destinar el municipio al año. Es el dato con el que se
              proyecta en que año le toca a cada obra, asi que envejece: un reporte de hace ocho
              meses ya no significa lo mismo.
            </p>
          </div>
        </div>

        {error ? (
          <p className="error" role="alert">
            {ERRORES[error] ?? "Revisa los datos."}
          </p>
        ) : null}

        {vigente ? (
          <p>
            Vigente: <strong>{formatearPesos(desdeDecimal(vigente.montoAnual))}</strong> al año,
            reportada el {vigente.fechaReporte.toISOString().slice(0, 10)} por{" "}
            {vigente.reportadoPor}.
          </p>
        ) : (
          <p className="discreto">
            Sin reportar. Mientras falte, el sistema no proyecta plazos: prefiere no decir nada a
            decir un numero inventado.
          </p>
        )}

        {vencida ? (
          <p className="error">
            El dato tiene mas de un año. Los plazos calculados con el son poco confiables.
          </p>
        ) : null}

        <h2>Reportar capacidad</h2>
        <form action={reportarCapacidadFiscal}>
          <label>
            <span>Monto anual disponible</span>
            <input name="montoAnual" inputMode="decimal" placeholder="500000000" required />
          </label>
          <label>
            <span>Fecha del reporte</span>
            <input type="date" name="fechaReporte" required />
          </label>
          <label>
            <span>Quien lo reporto</span>
            <input
              name="reportadoPor"
              required
              maxLength={200}
              placeholder="Secretaria de Hacienda municipal"
            />
          </label>
          <button type="submit">Registrar</button>
        </form>

        {serie.length > 0 ? (
          <>
            <h2>Serie historica</h2>
            <p className="discreto">
              No se corrige un reporte: se registra otro. Asi queda claro con que cifra se
              proyectaron los plazos que alguien vio en su momento.
            </p>
            <div className="tabla-desplazable">
              <table>
                <thead>
                  <tr>
                    <th>Monto anual</th>
                    <th>Fecha del reporte</th>
                    <th>Quien lo reporto</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {serie.map((c) => (
                    <tr key={c.id}>
                      <td>{formatearPesos(desdeDecimal(c.montoAnual))}</td>
                      <td>{c.fechaReporte.toISOString().slice(0, 10)}</td>
                      <td className="discreto">{c.reportadoPor}</td>
                      <td className="discreto">
                        {c.creadoEn.toISOString().slice(0, 10)} · {c.registradoPor.nombre}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </main>
    </Tablero>
  );
}
