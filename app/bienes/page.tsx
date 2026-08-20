import Link from "next/link";
import { redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { Tablero } from "@/app/tablero";
import { listarBienesDe, lugarGeneral, ETIQUETA_SECTOR, ETIQUETA_ESTADO } from "@/lib/bienes";

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
        <div className="cabecera-pagina">
          <div>
            <h1>Caracterizacion de bienes afectados</h1>
            <p className="discreto">
              Todo lo afectado, clasificado por su doliente sectorial (Agricultura, Educación,
              Transporte, Vivienda, Salud, Cultura, Gestión del riesgo…) para que suba al ministerio
              correcto. La direccion es reservada y solo la ves tú, el municipio dueño; el censo
              publico muestra solo cantidades, tipo, punto y lugar.
            </p>
          </div>
          <div className="acciones">
            <Link href="/bienes/nuevo" className="boton">
              Registrar bien afectado
            </Link>
          </div>
        </div>

        {error ? (
          <p className="error" role="alert">
            {ERRORES[error] ?? "No fue posible completar la accion."}
          </p>
        ) : null}

        {bienes.length === 0 ? (
          <p className="vacio">
            Todavia no hay bienes caracterizados. Empieza por{" "}
            <Link href="/bienes/nuevo">registrar el primero</Link>.
          </p>
        ) : (
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr>
                  <th>Bien</th>
                  <th>Doliente (sector)</th>
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
                      {b.esObra ? (
                        <div>
                          <span className="pastilla pastilla-acento">Obra en la cola</span>
                        </div>
                      ) : null}
                    </td>
                    <td>{ETIQUETA_SECTOR[b.sector]}</td>
                    <td>{b.tipoBien}</td>
                    <td>
                      {b.estadoAfectacion ? (
                        <span className="pastilla">{ETIQUETA_ESTADO[b.estadoAfectacion]}</span>
                      ) : (
                        "—"
                      )}
                    </td>
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
