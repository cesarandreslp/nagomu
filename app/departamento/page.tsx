import Link from "next/link";
import { redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { salir } from "@/app/actions/sesion";
import {
  consolidar,
  leerReferencia,
  ordenarPorImpacto,
  ordenarPorPrioridad,
} from "@/lib/departamento";
import { NIVELES } from "@/lib/prioridad";
import { aDecimal, formatearPesos } from "@/lib/dinero";

function plazo(anio: number | null, cubierta: boolean): string {
  if (cubierta) return "cubierta";
  if (anio === null) return "—";
  if (anio === 0) return "este año";
  return `en ${anio} ${anio === 1 ? "año" : "años"}`;
}

export default async function Departamento({
  searchParams,
}: {
  searchParams: Promise<{ orden?: string; referencia?: string }>;
}) {
  const sesion = await requerirSesion();
  if (sesion.nivel === "MUNICIPIO") redirect("/obras");

  const { orden, referencia: refBruta } = await searchParams;
  const referencia = leerReferencia(refBruta);
  const porImpacto = orden === "impacto";

  const { municipios, obras } = await consolidar(sesion, referencia, new Date());
  const ordenadas = porImpacto ? ordenarPorImpacto(obras) : ordenarPorPrioridad(obras);

  const sinCapacidad = municipios.filter((m) => !m.capacidad && m.obras > 0);
  const valorReferencia = aDecimal(referencia);

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
        <h1>Consolidado de {municipios.length} municipios</h1>

        <p>
          <Link href="/fondos">Fuentes de financiacion</Link> ·{" "}
          <Link href="/oferta">Oferta institucional para damnificados</Link>
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
                  <th>Brecha</th>
                  <th>Cierra</th>
                  {porImpacto ? <th>Si aportas {formatearPesos(referencia)}</th> : null}
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((obra, i) => (
                  <tr key={obra.id}>
                    <td>{i + 1}</td>
                    <td>
                      <strong>{obra.nivel}</strong>{" "}
                      <span className="discreto">
                        {NIVELES[obra.nivel as 1 | 2 | 3 | 4 | 5].titulo}
                      </span>
                    </td>
                    <td>
                      <Link href={`/obras/${obra.id}`}>{obra.nombre}</Link>
                      <div className="discreto">
                        {obra.estado.toLowerCase().replace("_", " ")}
                      </div>
                    </td>
                    <td className="discreto">{obra.municipio}</td>
                    <td>
                      {obra.costo === null ? (
                        <span className="discreto">sin costo</span>
                      ) : (
                        formatearPesos(obra.brecha)
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
    </>
  );
}
