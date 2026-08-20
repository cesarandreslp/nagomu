import Link from "next/link";
import { redirect } from "next/navigation";
import { Tablero } from "@/app/tablero";
import { requerirSesion } from "@/lib/auth";
import { contarHogaresDe, listarHogaresDe, resumenAyudas } from "@/lib/damnificados";
import { ETIQUETA_TIPO, ORDEN_TIPO } from "@/lib/oferta";

const ERRORES: Record<string, string> = {
  permiso: "Ese hogar no es de su municipio.",
  noexiste: "El hogar no existe o ya fue suprimido.",
};

const AVISOS: Record<string, string> = {
  suprimido: "Se suprimieron el nombre y el documento del hogar. Las cifras se conservan.",
};

/** Igual que en /obras: 50 filas por pagina para que la pagina siga siendo liviana. */
const POR_PAGINA = 50;

/**
 * Registro municipal de damnificados (spec 006 US1).
 *
 * Solo lista los hogares del municipio de la sesion. El filtro va en la consulta, no en la
 * pantalla: aqui no se recibe ningun municipio por parametro que se pueda cambiar a mano.
 */
export default async function Damnificados({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; aviso?: string; pagina?: string }>;
}) {
  const sesion = await requerirSesion();
  if (sesion.nivel !== "MUNICIPIO") redirect("/obras?error=permiso");

  const { error, aviso, pagina: paginaBruta } = await searchParams;

  const total = await contarHogaresDe(sesion.entidadId);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(Math.max(1, Number(paginaBruta) || 1), paginas);
  const hogares = await listarHogaresDe(sesion.entidadId, (pagina - 1) * POR_PAGINA, POR_PAGINA);

  const personas = hogares.reduce((suma, h) => suma + h.personasTotal, 0);

  // Agregado por tipo de ayuda: cuenta hogares, no personas, y no toca ningun campo
  // personal. Es la misma cifra que puede subir de nivel sin exponer a nadie.
  const resumen = await resumenAyudas(sesion.entidadId);
  const porTipo = new Map(resumen.map((r) => [r.tipo, r]));

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="damnificados">
      <main>
        <div className="cabecera-pagina">
          <div>
            <h1>Damnificados de {sesion.entidadNombre}</h1>
            <p className="discreto">
              El registro es del municipio y no sale de aqui: la gobernacion y la nacion ven cuantos
              hogares hay y que les falta, nunca quienes son.
            </p>
          </div>
          <div className="acciones">
            <Link href="/damnificados/nuevo" className="boton">
              Registrar hogar
            </Link>
          </div>
        </div>

        {error ? (
          <p className="error" role="alert">
            {ERRORES[error] ?? "Revisa los datos."}
          </p>
        ) : null}
        {aviso && AVISOS[aviso] ? (
          <p className="exito" role="status">
            {AVISOS[aviso]}
          </p>
        ) : null}

        {total > 0 ? (
          <p className="discreto">
            Entregar el registro a la UNGRD:{" "}
            {/* Enlaces, no botones: una descarga es un GET y asi funciona sin JavaScript.
                Y <a>, no <Link>: al otro lado no hay una pagina sino un manejador que
                devuelve un archivo, y la navegacion de cliente se lo tragaria en vez de
                descargarlo. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/damnificados/export?formato=csv">descargar CSV</a> ·{" "}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/damnificados/export?formato=excel">descargar Excel</a>. El archivo lleva datos
            personales: una vez descargado sale de nagomu y su cuidado queda en manos de quien lo
            tenga (Ley 1581 de 2012). La descarga queda registrada.
          </p>
        ) : null}

        {total === 0 ? (
          <p className="discreto">
            Todavia no hay hogares registrados. El primero se registra con el enlace de arriba, con
            lo minimo que se sepa: siempre se puede completar despues.
          </p>
        ) : (
          <>
            <p>
              {total} {total === 1 ? "hogar registrado" : "hogares registrados"}
              {hogares.length > 0 ? ` · ${personas} personas en esta pagina` : null}
            </p>

            {resumen.length > 0 ? (
              <>
                <h2>Atencion por tipo de ayuda</h2>
                <div className="tabla-desplazable">
                  <table>
                    <thead>
                      <tr>
                        <th>Tipo de ayuda</th>
                        <th>Hogares atendidos</th>
                        <th>Hogares pendientes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ORDEN_TIPO.filter((t) => porTipo.has(t)).map((t) => (
                        <tr key={t}>
                          <td>{ETIQUETA_TIPO[t]}</td>
                          <td>{porTipo.get(t)?.hogaresAtendidos ?? 0}</td>
                          <td>{porTipo.get(t)?.hogaresPendientes ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h2>Hogares</h2>
              </>
            ) : null}

            <div className="tabla-desplazable">
              <table>
                <thead>
                  <tr>
                    <th>Responsable</th>
                    <th>Personas</th>
                    <th>Niñez</th>
                    <th>Adulto mayor</th>
                    <th>Discapacidad</th>
                    <th>Heridos</th>
                    <th>Fallecidos</th>
                    <th>Inmueble</th>
                    <th>Ayudas</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {hogares.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <Link href={`/damnificados/${h.id}`}>{h.responsableNombre}</Link>
                      </td>
                      <td>{h.personasTotal}</td>
                      <td>{h.personasNinez}</td>
                      <td>{h.personasAdultoMayor}</td>
                      <td>{h.personasDiscapacidad}</td>
                      <td>{h.hayHeridos}</td>
                      <td>{h.hayFallecidos}</td>
                      <td className="discreto">{h.inmueble?.nombre ?? "Sin identificar"}</td>
                      <td>{h._count.ayudas}</td>
                      <td className="discreto">{h.creadoEn.toISOString().slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {paginas > 1 ? (
              <nav aria-label="Paginacion">
                {pagina > 1 ? (
                  <Link href={`/damnificados?pagina=${pagina - 1}`}>← Anteriores</Link>
                ) : null}{" "}
                <span className="discreto">
                  Pagina {pagina} de {paginas}
                </span>{" "}
                {pagina < paginas ? (
                  <Link href={`/damnificados?pagina=${pagina + 1}`}>Siguientes →</Link>
                ) : null}
              </nav>
            ) : null}
          </>
        )}
      </main>
    </Tablero>
  );
}
