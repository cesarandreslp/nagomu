import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { institucionalidadDe } from "@/lib/instituciones";
import { ETIQUETA_AMBITO, ORDEN_AMBITO, ambitosPara, listarTodosLosFondos } from "@/lib/fondos";

export default async function Fondos() {
  const sesion = await requerirSesion();
  const fondos = await listarTodosLosFondos();
  const disponibles = new Set(ambitosPara(sesion.nivel));
  const institucion = institucionalidadDe(sesion.nivel);

  return (
    <main>
      <p className="discreto">
        <Link href="/obras">← Inventario</Link>
      </p>

      <h1>Fuentes de financiacion</h1>
      <p className="discreto">
        {institucion.rectora} · {institucion.siglaInstancia} ({institucion.instancia}), que
        preside el {institucion.preside.toLowerCase()}. {institucion.norma}.
      </p>
      <p>
        Los fondos marcados como <strong>disponibles</strong> son los que{" "}
        {sesion.entidadNombre} puede declarar como origen de un aporte. Los demas existen y
        se consultan, pero los inscribe la entidad a la que corresponden: un municipio no
        gasta del fondo nacional.
      </p>

      {ORDEN_AMBITO.map((ambito) => {
        const delAmbito = fondos.filter((f) => f.ambito === ambito);
        if (delAmbito.length === 0) return null;

        return (
          <section key={ambito}>
            <h2>
              {ETIQUETA_AMBITO[ambito]}
              {disponibles.has(ambito) ? (
                <span className="discreto"> · disponible para ti</span>
              ) : null}
            </h2>
            <div className="tabla-desplazable">
              <table>
                <thead>
                  <tr>
                    <th>Fondo</th>
                    <th>Administra</th>
                    <th>Norma</th>
                  </tr>
                </thead>
                <tbody>
                  {delAmbito.map((fondo) => (
                    <tr key={fondo.id}>
                      <td>
                        <strong>{fondo.nombre}</strong>
                        {fondo.sigla && !fondo.sigla.includes("-") ? ` (${fondo.sigla})` : ""}
                        <div className="discreto">{fondo.descripcion}</div>
                        {fondo.exigeProyectoAplazado ? (
                          <div className="discreto">
                            Exige declarar que proyecto se aplazo para liberar estos recursos.
                          </div>
                        ) : null}
                      </td>
                      <td className="discreto">{fondo.administrador}</td>
                      <td className="discreto">{fondo.norma ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <h2>De donde salen estos datos</h2>
      <p className="discreto">
        La Ley 1523 de 2012 obliga a que cada nivel tenga su propio fondo de gestion del
        riesgo: el nacional en el articulo 47 y los territoriales en el 54, como cuentas
        especiales con autonomia tecnica y financiera. Los fondos creados por la emergencia
        economica de agosto de 2026 estan anunciados pero su reglamentacion puede cambiar:
        hay que verificarlos antes del piloto. Detalle y fuentes en{" "}
        <code>specs/001-cofinanciacion-obras/instituciones-y-fondos.md</code>.
      </p>
    </main>
  );
}
