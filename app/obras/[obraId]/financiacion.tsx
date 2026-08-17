import Link from "next/link";
import { colaDelMunicipio } from "@/lib/financiacion";
import { explicarDesplazamiento, proyectarConAportes } from "@/lib/cola";
import { CERO, aDecimal, formatearPesos, parsearPesos, type Pesos } from "@/lib/dinero";

/**
 * Brecha, lugar en la cola y escenarios de plazo de una obra.
 *
 * Los tres escenarios se calculan en el servidor y se renderizan juntos; la simulacion
 * libre es un formulario GET que recarga la pagina con el monto en la URL. Nada de esto
 * necesita JavaScript en el navegador (Principio III), y de paso el resultado queda en
 * una direccion que se puede mandar por correo a la gobernacion, que es justo el uso
 * real de esta pantalla.
 */

function plazo(anio: number | null, cubierta: boolean): string {
  if (cubierta) return "cubierta";
  if (anio === null) return "sin financiacion previsible";
  if (anio === 0) return "este año";
  return `en ${anio} ${anio === 1 ? "año" : "años"}`;
}

export async function Financiacion({
  obraId,
  municipioId,
  simulado,
}: {
  obraId: string;
  municipioId: string;
  simulado: Pesos | null;
}) {
  const datos = await colaDelMunicipio(municipioId, new Date());
  const obra = datos.obras.find((o) => o.id === obraId);
  if (!obra || obra.brecha.costo === null) return null;

  // El costo ya se verifico arriba; esto le da el tipo a TypeScript sin repetir la
  // comprobacion en cada uso.
  const brecha = { ...obra.brecha, costo: obra.brecha.costo };
  const cola = obra.cola;

  const desplazamiento = explicarDesplazamiento(datos.enCola, datos.montoAnual, obraId);
  const nombrePorId = new Map(datos.obras.map((o) => [o.id, o.nombre]));

  // Fuera del JSX a proposito: el analizador estatico de las reglas de accesibilidad
  // no sabe evaluar expresiones con BigInt y se cae al intentarlo.
  const valorSimulado = simulado === null ? "" : aDecimal(simulado);

  const mitad = brecha.brecha / 2n;
  const escenarios = [
    { nombre: "Solo el municipio", aporte: CERO },
    { nombre: "Si alguien cubre la mitad", aporte: mitad },
    { nombre: "Si alguien cubre toda la brecha", aporte: brecha.brecha },
    ...(simulado ? [{ nombre: `Con un aporte de ${formatearPesos(simulado)}`, aporte: simulado }] : []),
  ].map((e) => {
    const proyeccion = proyectarConAportes(datos.enCola, datos.montoAnual, {
      [obraId]: e.aporte,
    });
    const posicion = proyeccion.posiciones.find((p) => p.id === obraId);
    return { ...e, posicion };
  });

  return (
    <>
      <div className="tabla-desplazable">
        <table>
          <tbody>
            <tr>
              <td>Costo de la obra</td>
              <td>
                <strong>{formatearPesos(brecha.costo)}</strong>
              </td>
            </tr>
            <tr>
              <td>Girado o ejecutado</td>
              <td>{formatearPesos(brecha.girado)}</td>
            </tr>
            <tr>
              <td>Comprometido, todavia sin girar</td>
              <td>{formatearPesos(brecha.comprometido)}</td>
            </tr>
            <tr>
              <td>
                <strong>Brecha</strong>
              </td>
              <td>
                <strong>{formatearPesos(brecha.brecha)}</strong>
              </td>
            </tr>
            {brecha.comprometido > CERO ? (
              <tr>
                <td className="discreto">Brecha si ninguna promesa se cumple</td>
                <td className="discreto">{formatearPesos(brecha.brechaSinPromesas)}</td>
              </tr>
            ) : null}
            {brecha.excedente > CERO ? (
              <tr>
                <td className="discreto">Aportado de mas</td>
                <td className="discreto">{formatearPesos(brecha.excedente)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {!datos.capacidad ? (
        <p className="error">
          Sin capacidad fiscal reportada no se pueden proyectar plazos. Prefiere no decir
          nada a decir un numero inventado.{" "}
          <Link href="/municipio/capacidad">Reportarla</Link>.
        </p>
      ) : (
        <>
          <p className="discreto">
            Posicion {cola?.posicion} en la cola de financiacion del municipio, con una
            capacidad de {formatearPesos(datos.montoAnual)} al año reportada el{" "}
            {datos.capacidad.fechaReporte.toISOString().slice(0, 10)}.
            {datos.vencida ? " El dato tiene mas de un año: los plazos son poco confiables." : ""}
          </p>

          <h3>Que pasa si alguien se suma</h3>
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr>
                  <th>Escenario</th>
                  <th>Empieza</th>
                  <th>Cierra</th>
                </tr>
              </thead>
              <tbody>
                {escenarios.map((e) => (
                  <tr key={e.nombre}>
                    <td>{e.nombre}</td>
                    <td className="discreto">
                      {plazo(e.posicion?.anioInicio ?? null, e.posicion?.cubierta ?? false)}
                    </td>
                    <td className="discreto">
                      {plazo(e.posicion?.anioCierre ?? null, e.posicion?.cubierta ?? false)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="discreto">
            Un aporte a una obra que va antes en la fila adelanta tambien a las que vienen
            detras, sin darles un peso: la capacidad que aquella deja de consumir queda
            libre para las siguientes.
          </p>

          {/* Formulario GET: sin JavaScript, y el resultado queda en una URL compartible. */}
          <form method="get">
            <label>
              <span>Simular otro aporte</span>
              <input
                name="aporte"
                inputMode="decimal"
                placeholder="700000000"
                defaultValue={valorSimulado}
              />
            </label>
            <button type="submit">Calcular</button>
          </form>
        </>
      )}

      {desplazamiento ? (
        <p className="error">
          Esta obra se retraso {desplazamiento.anios}{" "}
          {desplazamiento.anios === 1 ? "año" : "años"} porque{" "}
          {desplazamiento.desplazadaPor.length === 1 ? "entro" : "entraron"} despues al
          inventario, con mayor prioridad:{" "}
          {desplazamiento.desplazadaPor
            .map((id) => nombrePorId.get(id) ?? id)
            .join(", ")}
          .
        </p>
      ) : null}
    </>
  );
}

export function leerAporteSimulado(valor: string | undefined): Pesos | null {
  if (!valor) return null;
  try {
    const monto = parsearPesos(valor);
    return monto > CERO ? monto : null;
  } catch {
    return null;
  }
}
