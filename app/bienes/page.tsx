import Link from "next/link";
import { redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { Tablero } from "@/app/tablero";
import {
  listarBienesDe,
  lugarGeneral,
  ETIQUETA_TIPO_BIEN,
  ETIQUETA_SUBTIPO,
  ETIQUETA_ESTADO,
} from "@/lib/bienes";

const ERRORES: Record<string, string> = {
  permiso: "No tienes permiso para esa accion.",
};

/**
 * Caracterizacion: inventario de TODOS los bienes afectados del municipio (spec 007),
 * no solo las obras. Solo el municipio dueño ve este detalle —incluida la direccion
 * (reservada)—; hacia arriba van agregados (Principio II). El publico ve el censo.
 */
export default async function Bienes({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await requerirSesion();
  if (sesion.nivel !== "MUNICIPIO") redirect("/obras?error=permiso");

  const { error } = await searchParams;
  const bienes = await listarBienesDe(sesion);

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="bienes">
      <main>
        <h1>Caracterizacion de bienes afectados</h1>

        {error ? (
          <p className="error" role="alert">
            {ERRORES[error] ?? "No fue posible completar la accion."}
          </p>
        ) : null}

        <p className="discreto">
          Todo lo afectado: viviendas, comercios, estructuras publicas y el mundo
          agropecuario. La direccion es reservada y solo la ves tú, el municipio dueño;
          el censo publico muestra solo cantidades, tipo, punto y lugar general.
        </p>

        <p>
          <Link href="/bienes/nuevo">Registrar un bien afectado</Link>
        </p>

        {bienes.length === 0 ? (
          <p>Todavia no hay bienes caracterizados.</p>
        ) : (
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr>
                  <th>Bien</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Lugar general</th>
                  <th>Direccion (reservada)</th>
                  <th>Punto</th>
                </tr>
              </thead>
              <tbody>
                {bienes.map((b) => (
                  <tr key={b.id}>
                    <td>
                      {b.esObra && b.obraId ? (
                        <Link href={`/obras/${b.obraId}`}>{b.nombre}</Link>
                      ) : (
                        b.nombre
                      )}
                      {b.esObra ? <div className="discreto">Obra en la cola</div> : null}
                    </td>
                    <td>
                      {ETIQUETA_TIPO_BIEN[b.tipoBien]}
                      {b.subtipoBien ? (
                        <div className="discreto">{ETIQUETA_SUBTIPO[b.subtipoBien]}</div>
                      ) : null}
                    </td>
                    <td>{b.estadoAfectacion ? ETIQUETA_ESTADO[b.estadoAfectacion] : "—"}</td>
                    <td>{lugarGeneral(b) ?? "—"}</td>
                    <td className="discreto">{b.ubicacion || "—"}</td>
                    <td className="discreto">{b.tienePunto ? "en el mapa" : "sin coordenada"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </Tablero>
  );
}
