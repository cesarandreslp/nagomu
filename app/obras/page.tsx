import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { listarObrasDe } from "@/lib/consultas";
import { salir } from "@/app/actions/sesion";
import { ETIQUETA_CATEGORIA } from "@/lib/prioridad";

const ERRORES: Record<string, string> = {
  permiso: "Solo un municipio puede registrar items en su inventario.",
};

const numero = new Intl.NumberFormat("es-CO");

export default async function Obras({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await requerirSesion();
  const obras = await listarObrasDe(sesion);
  const { error } = await searchParams;
  const esMunicipio = sesion.nivel === "MUNICIPIO";

  return (
    <>
      <header>
        <div>
          <strong>nagomu</strong>{" "}
          <span className="discreto">
            {sesion.entidadNombre} · {sesion.nivel.toLowerCase()}
          </span>
        </div>
        <form action={salir}>
          <button type="submit">Salir</button>
        </form>
      </header>

      <main>
        <h1>Inventario priorizado</h1>

        {error ? (
          <p className="error" role="alert">
            {ERRORES[error] ?? "No fue posible completar la accion."}
          </p>
        ) : null}

        <p className="discreto">
          El orden lo decide el nivel de prioridad y, dentro de cada nivel, un puntaje
          publico. Ninguna obra de un nivel inferior puede adelantar a una de nivel
          superior: un teatro nunca pasa por encima de una escuela.
        </p>

        <p>
          <Link href="/fondos">Fuentes de financiacion</Link> ·{" "}
          <Link href="/oferta">Oferta institucional para damnificados</Link>
        </p>

        {esMunicipio ? (
          <p>
            <Link href="/obras/nueva">Registrar un item afectado</Link>
          </p>
        ) : (
          <p className="discreto">
            Consulta de las obras de tu ambito. El registro y la edicion los hace el
            municipio dueño.
          </p>
        )}

        {obras.length === 0 ? (
          <p>Todavia no hay items registrados.</p>
        ) : (
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nivel</th>
                  <th>Obra</th>
                  {!esMunicipio ? <th>Municipio</th> : null}
                  <th>Beneficiados</th>
                  <th>Puntaje</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {obras.map((obra) => (
                  <tr key={obra.id}>
                    <td>{obra.posicion}</td>
                    <td>
                      <strong>{obra.puntaje.nivel}</strong>{" "}
                      <span className="discreto">{obra.puntaje.titulo}</span>
                    </td>
                    <td>
                      <Link href={`/obras/${obra.id}`}>{obra.nombre}</Link>
                      <div className="discreto">
                        {obra.ubicacion} · {ETIQUETA_CATEGORIA[obra.categoria]}
                      </div>
                    </td>
                    {!esMunicipio ? <td>{obra.municipio}</td> : null}
                    <td>
                      {obra.personasBeneficiadas === null
                        ? "sin dato"
                        : numero.format(obra.personasBeneficiadas)}
                    </td>
                    <td>
                      {obra.puntaje.incompleto ? (
                        <span className="discreto">incompleto</span>
                      ) : (
                        numero.format(Math.round(obra.puntaje.valor!))
                      )}
                    </td>
                    <td className="discreto">{obra.estado.toLowerCase().replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
