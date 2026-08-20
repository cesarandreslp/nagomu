import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { listarObrasDe } from "@/lib/consultas";
import { colaDelMunicipio } from "@/lib/financiacion";
import { resumenImpacto } from "@/lib/impacto";
import { Tablero } from "@/app/tablero";
import { ETIQUETA_CATEGORIA } from "@/lib/prioridad";
import {
  ETIQUETA_CIUDADANA,
  ETIQUETA_FINANCIACION,
  situacionFinanciacion,
} from "@/lib/estados";
import { formatearPesos } from "@/lib/dinero";

const ERRORES: Record<string, string> = {
  permiso: "No tienes permiso para esa accion en esta obra.",
  noexiste: "Esa obra no existe.",
  transicion: "Ese cambio de estado no es valido para la obra.",
};

const numero = new Intl.NumberFormat("es-CO");

function plazo(anio: number | null): string {
  if (anio === null) return "—";
  if (anio === 0) return "este año";
  return `en ${anio} ${anio === 1 ? "año" : "años"}`;
}

/**
 * Cuantas filas por pagina.
 *
 * No es una preferencia de presentacion: con 500 obras la pagina pesaba 785 KB, que en
 * 3G son unos dieciseis segundos, y el criterio de exito son tres. Nadie lee 500 filas
 * de corrido; lo que importa es la cabeza de la fila.
 */
const POR_PAGINA = 50;

export default async function Obras({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; pagina?: string }>;
}) {
  const sesion = await requerirSesion();
  const { error, pagina: paginaBruta } = await searchParams;
  const esMunicipio = sesion.nivel === "MUNICIPIO";

  const datos = esMunicipio ? await colaDelMunicipio(sesion.entidadId, new Date()) : null;
  const impacto = esMunicipio
    ? await resumenImpacto({ alcance: "MUNICIPIO", municipioId: sesion.entidadId }, new Date())
    : null;
  const todas = datos ? datos.obras : await listarObrasDe(sesion);

  const paginas = Math.max(1, Math.ceil(todas.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, Number(paginaBruta) || 1), paginas);
  const desde = (pagina - 1) * POR_PAGINA;
  const obras = todas.slice(desde, desde + POR_PAGINA);

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="obras">
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

        {impacto ? (
          <div className="tarjetas-fila" style={{ marginBottom: "1.5rem" }}>
            <article className="tarjeta-impacto">
              <span className="tarjeta-titulo">Fondos asignados</span>
              <strong className="tarjeta-cifra">{formatearPesos(impacto.fondosAsignados)}</strong>
              <span className="discreto">Aportes comprometidos a tus obras</span>
            </article>
            <article className="tarjeta-impacto">
              <span className="tarjeta-titulo">Ejecucion</span>
              <strong className="tarjeta-cifra">{impacto.porcentajeEjecucion}%</strong>
              <div
                className="barra-progreso"
                role="img"
                aria-label={`${impacto.porcentajeEjecucion}% de obras beneficiadas`}
              >
                <div style={{ width: `${impacto.porcentajeEjecucion}%` }} />
              </div>
              <span className="discreto">
                {impacto.obrasEntregadas} de {impacto.obrasTotal} beneficiadas
              </span>
            </article>
            <article className="tarjeta-impacto">
              <span className="tarjeta-titulo">Alertas</span>
              <strong className="tarjeta-cifra tarjeta-alerta">{impacto.alertas}</strong>
              <span className="discreto">Obras sin financiacion o capacidad vencida</span>
            </article>
          </div>
        ) : null}

        {esMunicipio ? (
          <p>
            <Link href="/mapa">Ver el mapa de tu territorio →</Link>
          </p>
        ) : null}

        {datos && !datos.capacidad ? (
          <p className="error">
            Sin capacidad fiscal reportada no se proyectan plazos.{" "}
            <Link href="/municipio/capacidad">Reportarla</Link> es lo que convierte esta
            lista en una fila con años.
          </p>
        ) : null}

        {datos?.vencida ? (
          <p className="error">
            La capacidad fiscal se reporto hace mas de un año (
            {datos.capacidad!.fechaReporte.toISOString().slice(0, 10)}). Los plazos de abajo
            son poco confiables hasta que se actualice.
          </p>
        ) : null}

        {datos?.proyeccion.bloqueada && datos.capacidad ? (
          <p className="error">
            La cola esta bloqueada: con {formatearPesos(datos.montoAnual)} al año no alcanza
            a financiarse todo lo pendiente dentro del horizonte de proyeccion.
          </p>
        ) : null}

        {esMunicipio ? (
          <p>
            <Link href="/bienes/nuevo">Registrar un bien afectado</Link>
            {" · "}
            <Link href="/bienes">Ver la caracterizacion completa</Link>
          </p>
        ) : (
          <p className="discreto">
            Consulta de las obras de tu ambito. El registro y la edicion los hace el
            municipio dueño.
          </p>
        )}

        {todas.length > POR_PAGINA ? (
          <p className="discreto">
            Mostrando {desde + 1} a {desde + obras.length} de {todas.length} obras.
            {pagina > 1 ? (
              <>
                {" "}
                <Link href={`/obras?pagina=${pagina - 1}`}>← Anteriores</Link>
              </>
            ) : null}
            {pagina < paginas ? (
              <>
                {" "}
                <Link href={`/obras?pagina=${pagina + 1}`}>Siguientes →</Link>
              </>
            ) : null}
          </p>
        ) : null}

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
                  <th>Puntaje</th>
                  {datos ? <th>Financiacion</th> : null}
                  {datos ? <th>Empieza</th> : null}
                  {datos ? <th>Cierra</th> : null}
                  {!datos ? <th>Estado</th> : null}
                </tr>
              </thead>
              <tbody>
                {obras.map((obra) => {
                  const cola = "cola" in obra ? obra.cola : null;
                  const brecha = "brecha" in obra ? obra.brecha : null;
                  const cofinanciadores = "cofinanciadores" in obra ? obra.cofinanciadores : [];

                  return (
                    <tr key={obra.id}>
                      <td>{obra.posicion}</td>
                      <td>
                        <strong>{obra.puntaje.nivel}</strong>{" "}
                        <span className="discreto">{obra.puntaje.titulo}</span>
                      </td>
                      <td>
                        <Link href={`/obras/${obra.id}`}>{obra.nombre}</Link>
                        <div className="discreto">
                          {ETIQUETA_CATEGORIA[obra.categoria]}
                          {"estado" in obra ? ` · ${ETIQUETA_CIUDADANA[obra.estado]}` : ""}
                        </div>
                      </td>
                      {!esMunicipio && "municipio" in obra ? <td>{obra.municipio}</td> : null}
                      <td>
                        {obra.puntaje.incompleto ? (
                          <span className="discreto">incompleto</span>
                        ) : (
                          numero.format(Math.round(obra.puntaje.valor!))
                        )}
                      </td>
                      {datos ? (
                        <td>
                          {brecha?.costo === null ? (
                            <span className="discreto">Pendiente de estudios</span>
                          ) : (
                            <>
                              <div>{ETIQUETA_FINANCIACION[situacionFinanciacion(brecha!)]}</div>
                              {brecha!.brecha > 0n ? (
                                <div className="discreto">
                                  Faltan {formatearPesos(brecha!.brecha)}
                                </div>
                              ) : null}
                              {cofinanciadores.length > 0 ? (
                                <div className="discreto">
                                  {cofinanciadores.length >= 2 ? "Cofinancian: " : "Financia: "}
                                  {cofinanciadores.map((c) => c.nombre).join(", ")}
                                </div>
                              ) : null}
                            </>
                          )}
                        </td>
                      ) : null}
                      {datos ? (
                        <td className="discreto">
                          {cola?.cubierta ? "cubierta" : plazo(cola?.anioInicio ?? null)}
                        </td>
                      ) : null}
                      {datos ? (
                        <td className="discreto">
                          {cola?.cubierta
                            ? "—"
                            : cola?.anioCierre === null && cola
                              ? "sin financiacion previsible"
                              : plazo(cola?.anioCierre ?? null)}
                        </td>
                      ) : null}
                      {!datos && "estado" in obra ? (
                        <td className="discreto">{ETIQUETA_CIUDADANA[obra.estado]}</td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </Tablero>
  );
}
