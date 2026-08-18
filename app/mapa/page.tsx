import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { listarPuntosMapa } from "@/lib/consultas";
import { salir } from "@/app/actions/sesion";
import MapaCliente from "./mapa-cliente";
import type { EstadoObra } from "@/lib/generated/prisma/enums";

// Mismo criterio de color que el mapa, pero aqui como texto: la leyenda tambien tiene
// que leerse sin el mapa (Principio III).
const ESTADOS: { estado: EstadoObra; etiqueta: string; color: string }[] = [
  { estado: "IDENTIFICADO", etiqueta: "Identificado", color: "#6b7280" },
  { estado: "EN_ESTUDIOS", etiqueta: "En estudios", color: "#d97706" },
  { estado: "COSTEADO", etiqueta: "Costeado", color: "#2563eb" },
  { estado: "EN_EJECUCION", etiqueta: "En ejecucion", color: "#ea580c" },
  { estado: "ENTREGADA", etiqueta: "Entregada", color: "#16a34a" },
];

const ETIQUETA_ESTADO = Object.fromEntries(
  ESTADOS.map((e) => [e.estado, e.etiqueta]),
) as Record<EstadoObra, string>;

export default async function Mapa() {
  const sesion = await requerirSesion();
  const puntos = await listarPuntosMapa(sesion);

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
        <p className="discreto">
          <Link href="/obras">← Inventario</Link>
        </p>
        <h1>Mapa del inventario</h1>

        <p className="discreto">
          Vista complementaria. Solo aparecen los items que tienen coordenada registrada;
          los demas siguen en el <Link href="/obras">inventario</Link>. El color indica el
          estado de la obra.
        </p>

        <ul className="leyenda">
          {ESTADOS.map((e) => (
            <li key={e.estado}>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: e.color,
                  marginRight: 6,
                  verticalAlign: "middle",
                }}
              />
              {e.etiqueta}
            </li>
          ))}
        </ul>

        {puntos.length === 0 ? (
          <p>
            Ningun item de tu ambito tiene coordenada todavia. Agregala al{" "}
            <Link href="/obras/nueva">registrar un item</Link> y aparecera aqui.
          </p>
        ) : (
          <>
            <MapaCliente puntos={puntos} />

            {/* Vista esencial: la misma informacion del mapa, sin depender de JavaScript. */}
            <h2>Items con coordenada ({puntos.length})</h2>
            <div className="tabla-desplazable">
              <table>
                <thead>
                  <tr>
                    <th>Obra</th>
                    <th>Municipio</th>
                    <th>Estado</th>
                    <th>Coordenada</th>
                  </tr>
                </thead>
                <tbody>
                  {puntos.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/obras/${p.id}`}>{p.nombre}</Link>
                      </td>
                      <td>{p.municipio}</td>
                      <td className="discreto">{ETIQUETA_ESTADO[p.estado]}</td>
                      <td className="discreto">
                        {p.latitud.toFixed(5)}, {p.longitud.toFixed(5)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
