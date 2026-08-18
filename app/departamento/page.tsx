import Link from "next/link";
import { redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { Tablero } from "@/app/tablero";
import {
  consolidar,
  leerReferencia,
  ordenarPorImpacto,
  ordenarPorPrioridad,
} from "@/lib/departamento";
import { NIVELES } from "@/lib/prioridad";
import { resumenImpacto } from "@/lib/impacto";
import { ETIQUETA_CIUDADANA, ETIQUETA_FINANCIACION, situacionFinanciacion } from "@/lib/estados";
import { aDecimal, formatearPesos } from "@/lib/dinero";
import type { EstadoObra } from "@/lib/generated/prisma/enums";

function plazo(anio: number | null, cubierta: boolean): string {
  if (cubierta) return "cubierta";
  if (anio === null) return "—";
  if (anio === 0) return "este año";
  return `en ${anio} ${anio === 1 ? "año" : "años"}`;
}

/** Mismo limite que el inventario municipal, y por la misma razon: peso de pagina. */
const POR_PAGINA = 50;

export default async function Departamento({
  searchParams,
}: {
  searchParams: Promise<{ orden?: string; referencia?: string; pagina?: string }>;
}) {
  const sesion = await requerirSesion();
  if (sesion.nivel === "MUNICIPIO") redirect("/obras");

  const { orden, referencia: refBruta, pagina: paginaBruta } = await searchParams;
  const referencia = leerReferencia(refBruta);
  const porImpacto = orden === "impacto";

  const { municipios, obras } = await consolidar(sesion, referencia, new Date());
  const impacto = await resumenImpacto(
    sesion.nivel === "NACION"
      ? { alcance: "NACION" }
      : { alcance: "DEPARTAMENTO", departamentoId: sesion.entidadId },
    new Date(),
  );
  const todas = porImpacto ? ordenarPorImpacto(obras) : ordenarPorPrioridad(obras);

  const paginas = Math.max(1, Math.ceil(todas.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, Number(paginaBruta) || 1), paginas);
  const desde = (pagina - 1) * POR_PAGINA;
  const ordenadas = todas.slice(desde, desde + POR_PAGINA);

  const enlace = (p: number) =>
    `/departamento?${porImpacto ? "orden=impacto&" : ""}pagina=${p}`;

  const sinCapacidad = municipios.filter((m) => !m.capacidad && m.obras > 0);
  const valorReferencia = aDecimal(referencia);

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="departamento">
      <main>
        <h1>Consolidado de {municipios.length} municipios</h1>

        <div className="tarjetas-fila" style={{ margin: "0.5rem 0 1.5rem" }}>
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Fondos asignados</span>
            <strong className="tarjeta-cifra">{formatearPesos(impacto.fondosAsignados)}</strong>
            <span className="discreto">Aportes comprometidos en tu ambito</span>
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

        <p>
          <Link href="/mapa">Ver el mapa del territorio →</Link>
        </p>

        <p>
          {porImpacto ? (
            <>
              <strong>Ordenado por impacto</strong> ·{" "}
              <Link href="/departamento">Ver por prioridad</Link>
            </>
          ) : (
            <>
              <strong>Ordenado por prioridad</strong> ·{" "}
              <Link href="/departamento?orden=impacto">Ver por impacto</Link>
            </>
          )}
        </p>

        <p className="discreto">
          {porImpacto
            ? `Donde rinde mas la misma plata. Se simula el mismo aporte de ${formatearPesos(referencia)} en cada obra y se mide cuantos años adelanta en la cola de su municipio, contando tambien las obras que vienen detras.`
            : "Que es lo mas importante del departamento. El nivel manda sobre el puntaje, igual que en el inventario de cada municipio."}
        </p>

        {porImpacto ? (
          <form method="get">
            <input type="hidden" name="orden" value="impacto" />
            <label>
              <span>Aporte de referencia para comparar</span>
              <input name="referencia" inputMode="decimal" defaultValue={valorReferencia} />
              <span className="discreto">
                El mismo monto en todas: comparar aportes distintos no dice nada, porque la
                obra mas grande siempre parece ahorrar mas.
              </span>
            </label>
            <button type="submit">Recalcular</button>
          </form>
        ) : null}

        {sinCapacidad.length > 0 ? (
          <p className="error">
            {sinCapacidad.length}{" "}
            {sinCapacidad.length === 1 ? "municipio no ha reportado" : "municipios no han reportado"}{" "}
            su capacidad fiscal ({sinCapacidad.map((m) => m.nombre).join(", ")}). Sus obras
            aparecen sin plazos, y no porque no los necesiten.
          </p>
        ) : null}

        {todas.length > POR_PAGINA ? (
          <p className="discreto">
            Mostrando {desde + 1} a {desde + ordenadas.length} de {todas.length} obras.
            {pagina > 1 ? (
              <>
                {" "}
                <Link href={enlace(pagina - 1)}>← Anteriores</Link>
              </>
            ) : null}
            {pagina < paginas ? (
              <>
                {" "}
                <Link href={enlace(pagina + 1)}>Siguientes →</Link>
              </>
            ) : null}
          </p>
        ) : null}

        {obras.length === 0 ? (
          <p>Todavia no hay obras registradas en el ambito.</p>
        ) : (
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nivel</th>
                  <th>Obra</th>
                  <th>Municipio</th>
                  <th>Financiacion</th>
                  <th>Cierra</th>
                  {porImpacto ? <th>Si aportas {formatearPesos(referencia)}</th> : null}
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((obra, i) => (
                  <tr key={obra.id}>
                    <td>{desde + i + 1}</td>
                    <td>
                      <strong>{obra.nivel}</strong>{" "}
                      <span className="discreto">
                        {NIVELES[obra.nivel as 1 | 2 | 3 | 4 | 5].titulo}
                      </span>
                    </td>
                    <td>
                      <Link href={`/obras/${obra.id}`}>{obra.nombre}</Link>
                      <div className="discreto">
                        {ETIQUETA_CIUDADANA[obra.estado as EstadoObra]}
                      </div>
                    </td>
                    <td className="discreto">{obra.municipio}</td>
                    <td>
                      {obra.costo === null ? (
                        <span className="discreto">Pendiente de estudios</span>
                      ) : (
                        <>
                          <div>
                            {ETIQUETA_FINANCIACION[
                              situacionFinanciacion({ costo: obra.costo, brecha: obra.brecha })
                            ]}
                          </div>
                          {obra.brecha > 0n ? (
                            <div className="discreto">Faltan {formatearPesos(obra.brecha)}</div>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td className="discreto">
                      {obra.sinCapacidad && obra.costo !== null
                        ? "sin capacidad reportada"
                        : plazo(obra.anioCierre, obra.cubierta)}
                    </td>
                    {porImpacto ? (
                      <td>
                        {obra.aniosAhorrados > 0 ? (
                          <>
                            <strong>
                              {obra.aniosAhorrados}{" "}
                              {obra.aniosAhorrados === 1 ? "año" : "años"}
                            </strong>
                            <div className="discreto">
                              adelanta {obra.obrasAdelantadas}{" "}
                              {obra.obrasAdelantadas === 1 ? "obra" : "obras"}
                            </div>
                          </>
                        ) : (
                          <span className="discreto">—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="discreto">
          Para aportar a una obra, abrela y registra el aporte de {sesion.entidadNombre}. La
          obra la edita solo su municipio; el aporte lo inscribes tu.
        </p>
      </main>
    </Tablero>
  );
}
