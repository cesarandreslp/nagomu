import Link from "next/link";
import { prisma } from "@/lib/db";
import { censoPublico, type AmbitoCenso } from "@/lib/censo";
import { ETIQUETA_SECTOR, ETIQUETA_ESTADO } from "@/lib/bienes";

export const metadata = {
  title: "Censo publico de afectaciones · nagomu",
  description:
    "Cuantas afectaciones hay, de que sector y en que lugar. Sin direcciones y sin personas.",
};

/**
 * Censo publico de afectaciones (spec 007 US3, enmienda 4.0.0).
 *
 * Se consulta SIN sesion: es la cara de transparencia del censo. Lo que muestra son
 * cantidades por sector doliente y por estado de la afectacion, los puntos con coordenada y
 * el lugar general (corregimiento/vereda) de los que no la tienen. Lo que NO muestra —y no
 * por convencion sino porque `lib/censo.ts` selecciona campo por campo, con una prueba que
 * lo vigila— es la direccion exacta, el dueño, y cualquier dato de una persona.
 *
 * Server-rendered y con buscador por formulario GET: funciona sin JavaScript (Principio III).
 */
export default async function Censo({
  searchParams,
}: {
  searchParams: Promise<{ departamento?: string; municipio?: string }>;
}) {
  const { departamento, municipio } = await searchParams;

  const [departamentos, municipios] = await Promise.all([
    prisma.entidadTerritorial.findMany({
      where: { nivel: "DEPARTAMENTO" },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.entidadTerritorial.findMany({
      where: { nivel: "MUNICIPIO" },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  // El territorio mas especifico y valido gana; un id inexistente cae al nivel superior.
  const muni = municipios.find((m) => m.id === municipio);
  const depto = departamentos.find((d) => d.id === departamento);
  const ambito: AmbitoCenso = muni
    ? { alcance: "MUNICIPIO", municipioId: muni.id }
    : depto
      ? { alcance: "DEPARTAMENTO", departamentoId: depto.id }
      : { alcance: "TODOS" };
  const etiqueta = muni ? muni.nombre : depto ? depto.nombre : "todo el pais";

  const censo = await censoPublico(ambito);
  const porSector = [...censo.porSector].sort((a, b) => b.total - a.total);
  const porEstado = [...censo.porEstado].sort((a, b) => b.total - a.total);
  const porLugar = [...censo.porLugar].sort((a, b) => b.total - a.total);

  return (
    <div>
      <nav className="landing-nav">
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <strong>nagomu</strong>
        </Link>
        <Link href="/login" className="boton-nav">
          Ingresar a la Plataforma
        </Link>
      </nav>

      <main className="pagina">
        <div className="cabecera-pagina">
          <div>
            <h1>Censo publico de afectaciones</h1>
            <p className="discreto">
              Cuantos bienes resultaron afectados en {etiqueta}, a que sector le corresponde
              responder por cada uno, y donde estan. <strong>No hay direcciones ni personas</strong>
              : de un bien se publica su punto en el mapa y su lugar general —corregimiento o
              vereda—, nunca la direccion exacta ni de quien es.
            </p>
          </div>
        </div>

        {/* Buscador territorial: formulario GET, sin JavaScript. */}
        <form method="GET" action="/censo" className="panel">
          <div className="campos">
            <label>
              <span>Departamento</span>
              <select name="departamento" defaultValue={depto?.id ?? ""}>
                <option value="">Todos</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Municipio</span>
              <select name="municipio" defaultValue={muni?.id ?? ""}>
                <option value="">Todos</option>
                {municipios.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="acciones">
            <button type="submit">Consultar</button>
          </div>
        </form>

        <div className="tarjetas-fila">
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Bienes afectados</span>
            <strong className="tarjeta-cifra">{censo.total}</strong>
            <span className="discreto">Caracterizados en {etiqueta}</span>
          </article>
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Ubicados en el mapa</span>
            <strong className="tarjeta-cifra">{censo.puntos.length}</strong>
            <span className="discreto">Con coordenada publica</span>
          </article>
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Sectores con afectacion</span>
            <strong className="tarjeta-cifra">{porSector.length}</strong>
            <span className="discreto">Ministerios o secretarias dolientes</span>
          </article>
        </div>

        {censo.total === 0 ? (
          <p className="vacio" style={{ marginTop: "1.5rem" }}>
            Todavia no hay afectaciones caracterizadas en {etiqueta}.
          </p>
        ) : (
          <>
            <h2>Por sector doliente</h2>
            <p className="discreto">
              A quien le corresponde responder por cada afectacion. Es lo que permite que un reporte
              suba al ministerio correcto en vez de a una bolsa comun.
            </p>
            <div className="tabla-desplazable">
              <table>
                <thead>
                  <tr>
                    <th>Sector</th>
                    <th>Bienes afectados</th>
                  </tr>
                </thead>
                <tbody>
                  {porSector.map((s) => (
                    <tr key={s.sector}>
                      <td>{ETIQUETA_SECTOR[s.sector]}</td>
                      <td>{s.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {porEstado.length > 0 ? (
              <>
                <h2>Por estado de la afectacion</h2>
                <div className="tabla-desplazable">
                  <table>
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Bienes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {porEstado.map((e) => (
                        <tr key={e.estadoAfectacion}>
                          <td>{ETIQUETA_ESTADO[e.estadoAfectacion]}</td>
                          <td>{e.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            {porLugar.length > 0 ? (
              <>
                <h2>Por lugar general</h2>
                <p className="discreto">
                  Los bienes sin coordenada se cuentan por corregimiento o vereda. Nunca por
                  direccion: esa es reservada.
                </p>
                <div className="tabla-desplazable">
                  <table>
                    <thead>
                      <tr>
                        <th>Municipio</th>
                        <th>Lugar</th>
                        <th>Bienes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {porLugar.map((l) => (
                        <tr key={`${l.municipio}-${l.lugar ?? ""}`}>
                          <td>{l.municipio}</td>
                          <td>{l.lugar ?? "Sin lugar declarado"}</td>
                          <td>{l.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            {censo.puntos.length > 0 ? (
              <>
                <h2>Bienes ubicados en el mapa</h2>
                <div className="tabla-desplazable">
                  <table>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Sector</th>
                        <th>Estado</th>
                        <th>Municipio</th>
                        <th>Lugar</th>
                        <th>Punto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {censo.puntos.map((p, i) => (
                        <tr key={`${p.latitud}-${p.longitud}-${i}`}>
                          <td>{p.tipoBien}</td>
                          <td>{ETIQUETA_SECTOR[p.sector]}</td>
                          <td>
                            {p.estadoAfectacion ? (
                              <span className="pastilla">
                                {ETIQUETA_ESTADO[p.estadoAfectacion]}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>{p.municipio}</td>
                          <td>{p.lugar ?? "—"}</td>
                          <td className="discreto">
                            {p.latitud}, {p.longitud}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </>
        )}

        <p className="discreto" style={{ marginTop: "2rem" }}>
          Este censo se alimenta de lo que caracteriza cada municipio. Lo reservado —la direccion
          exacta, el dueño, los datos de las familias— no sale de su municipio, ni siquiera hacia la
          gobernacion o la nacion, que ven agregados como estos.
        </p>
      </main>
    </div>
  );
}
