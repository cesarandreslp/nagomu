import Link from "next/link";
import { redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { Tablero } from "@/app/tablero";
import { pendientesDe, situacionDe } from "@/lib/situacion";
import { resumenImpacto } from "@/lib/impacto";
import { colaDelMunicipio } from "@/lib/financiacion";
import { ETIQUETA_SECTOR } from "@/lib/bienes";
import { formatearPesos } from "@/lib/dinero";

const numero = new Intl.NumberFormat("es-CO");

/**
 * Situacion del municipio (spec 009): la portada de quien esta atendiendo el siniestro.
 *
 * Antes, al entrar, un municipio aterrizaba en el inventario priorizado de obras. Eso es la
 * portada de la reconstruccion —que viene despues— y no la de la atencion. Aqui manda el
 * mismo orden que la regla de prioridad del proyecto: primero las personas, despues los
 * bienes, despues la plata. Y arriba de todo, lo que falta por hacer.
 */
export default async function Situacion() {
  const sesion = await requerirSesion();
  if (sesion.nivel !== "MUNICIPIO") redirect("/departamento");

  const ahora = new Date();
  const [cifras, impacto, cola] = await Promise.all([
    situacionDe(sesion.entidadId),
    resumenImpacto({ alcance: "MUNICIPIO", municipioId: sesion.entidadId }, ahora),
    colaDelMunicipio(sesion.entidadId, ahora),
  ]);

  const pendientes = pendientesDe(cifras);
  const sinRegistro = cifras.hogares === 0 && cifras.bienes === 0;

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="situacion">
      <main>
        <div className="cabecera-pagina">
          <div>
            <h1>Situacion de {sesion.entidadNombre}</h1>
            <p className="discreto">
              Lo que hay que atender hoy. Las personas primero, despues lo que se dañó, despues con
              que se paga. Todo lo de esta pantalla es de tu municipio y no sale de aqui: hacia la
              gobernacion y la nacion suben agregados, nunca el detalle.
            </p>
          </div>
          <div className="acciones">
            <Link href="/damnificados/nuevo" className="boton">
              Registrar hogar
            </Link>
            <Link href="/bienes/nuevo" className="boton boton-secundario">
              Registrar bien afectado
            </Link>
          </div>
        </div>

        {sinRegistro ? (
          <p className="vacio">
            Todavia no hay nada caracterizado en {sesion.entidadNombre}. La atencion empieza por
            ahi: <Link href="/damnificados/nuevo">registrar un hogar</Link> o{" "}
            <Link href="/bienes/nuevo">un bien afectado</Link>. Los dos formularios funcionan sin
            señal.
          </p>
        ) : null}

        <h2>Personas</h2>
        <div className="tarjetas-fila">
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Personas damnificadas</span>
            <strong className="tarjeta-cifra">{numero.format(cifras.personas)}</strong>
            <span className="discreto">
              En {numero.format(cifras.hogares)} {cifras.hogares === 1 ? "hogar" : "hogares"}
            </span>
          </article>
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Requieren atencion especial</span>
            <strong className="tarjeta-cifra">
              {numero.format(cifras.ninez + cifras.adultoMayor + cifras.discapacidad)}
            </strong>
            <span className="discreto">
              {numero.format(cifras.ninez)} niñez · {numero.format(cifras.adultoMayor)} adulto mayor
              · {numero.format(cifras.discapacidad)} discapacidad
            </span>
          </article>
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Heridos y fallecidos</span>
            <strong className={`tarjeta-cifra${cifras.fallecidos > 0 ? " tarjeta-alerta" : ""}`}>
              {numero.format(cifras.heridos)} · {numero.format(cifras.fallecidos)}
            </strong>
            <span className="discreto">
              Los atiende salud. Nagomu solo cuenta, para saber donde hay urgencia.
            </span>
          </article>
        </div>

        {pendientes.length > 0 ? (
          <>
            <h2>Lo que falta por hacer</h2>
            <p className="discreto">
              En orden de urgencia. Lo que ya esta al dia no aparece: un tablero que enumera ceros
              entrena a la gente para no leerlo.
            </p>
            <div className="tabla-desplazable">
              <table>
                <thead>
                  <tr>
                    <th>Pendiente</th>
                    <th>Cuantos</th>
                    <th>Por que importa</th>
                    <th>Ir</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span
                          className={
                            p.urgencia === "alta"
                              ? "pastilla pastilla-alerta"
                              : p.urgencia === "media"
                                ? "pastilla pastilla-aviso"
                                : "pastilla"
                          }
                        >
                          {p.titulo}
                        </span>
                      </td>
                      <td>
                        <strong>{numero.format(p.cantidad)}</strong>
                      </td>
                      <td className="discreto">{p.detalle}</td>
                      <td>
                        <Link href={p.href}>Abrir</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        <h2>Lo afectado</h2>
        <div className="tarjetas-fila">
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Bienes caracterizados</span>
            <strong className="tarjeta-cifra">{numero.format(cifras.bienes)}</strong>
            <span className="discreto">
              {numero.format(cifras.obras)} entraron a la cola de obras
            </span>
          </article>
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Perdidos o a demoler</span>
            <strong className="tarjeta-cifra tarjeta-alerta">
              {numero.format(cifras.aDemoler + cifras.perdidos)}
            </strong>
            <span className="discreto">
              {numero.format(cifras.aDemoler)} a demoler · {numero.format(cifras.perdidos)} perdidos
            </span>
          </article>
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Sectores dolientes</span>
            <strong className="tarjeta-cifra">{cifras.porSector.length}</strong>
            <span className="discreto">A cuantos ministerios o secretarias hay que reportar</span>
          </article>
        </div>

        {cifras.porSector.length > 0 ? (
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr>
                  <th>Sector doliente</th>
                  <th>Bienes afectados</th>
                </tr>
              </thead>
              <tbody>
                {cifras.porSector.map((s) => (
                  <tr key={s.sector}>
                    <td>{ETIQUETA_SECTOR[s.sector]}</td>
                    <td>{numero.format(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <h2>Con que se paga</h2>
        <div className="tarjetas-fila">
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Fondos asignados</span>
            <strong className="tarjeta-cifra">{formatearPesos(impacto.fondosAsignados)}</strong>
            <span className="discreto">Aportes comprometidos a tus obras</span>
          </article>
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Capacidad fiscal anual</span>
            <strong className="tarjeta-cifra">
              {cola.capacidad ? formatearPesos(cola.montoAnual) : "sin reportar"}
            </strong>
            <span className="discreto">
              {cola.capacidad ? (
                cola.vencida ? (
                  <>
                    Reportada hace mas de un año:{" "}
                    <Link href="/municipio/capacidad">actualizar</Link>
                  </>
                ) : (
                  "Con esto se proyectan los plazos de la cola"
                )
              ) : (
                <Link href="/municipio/capacidad">
                  Reportarla convierte la lista en una fila con años
                </Link>
              )}
            </span>
          </article>
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Alertas</span>
            <strong className="tarjeta-cifra tarjeta-alerta">{impacto.alertas}</strong>
            <span className="discreto">Obras sin financiacion o capacidad vencida</span>
          </article>
        </div>

        <p className="discreto" style={{ marginTop: "1.5rem" }}>
          El detalle de cada cosa esta en su seccion: <Link href="/damnificados">damnificados</Link>
          , <Link href="/bienes">caracterizacion</Link>,{" "}
          <Link href="/obras">inventario priorizado</Link> y <Link href="/mapa">mapa</Link>. Lo que
          el publico ve de todo esto —sin direcciones ni personas— esta en el{" "}
          <Link href="/censo">censo publico</Link>.
        </p>
      </main>
    </Tablero>
  );
}
