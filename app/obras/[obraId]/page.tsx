import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { Tablero } from "@/app/tablero";
import { costoVigente, obtenerObra } from "@/lib/consultas";
import { ETIQUETA_CATEGORIA, PESOS, calcularPuntaje } from "@/lib/prioridad";
import { ETIQUETA_ESTADO, siguienteEstado } from "@/lib/estados";
import { desdeDecimal, formatearPesos } from "@/lib/dinero";
import { cambiarEstadoObra } from "@/app/actions/obras";
import { Financiacion, leerAporteSimulado } from "./financiacion";

const numero = new Intl.NumberFormat("es-CO");
const decimal = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });

export default async function DetalleObra({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ aporte?: string; error?: string }>;
}) {
  // Cualquier usuario autenticado ve cualquier obra de cualquier municipio (FR-024).
  const sesion = await requerirSesion();

  const { obraId } = await params;
  const simulado = leerAporteSimulado((await searchParams).aporte);
  const obra = await obtenerObra(obraId);
  if (!obra) notFound();

  const { item } = obra;
  const vigente = costoVigente(obra.costos);
  const siguiente = siguienteEstado(obra.estado);
  const esDueño = sesion.nivel === "MUNICIPIO" && sesion.entidadId === item.municipioId;
  const nbi = item.municipio.nbi === null ? null : Number(item.municipio.nbi);
  const puntaje = calcularPuntaje({
    // Una obra siempre tiene categoria (nullable solo por los bienes no-obra, spec 007).
    categoria: item.categoria!,
    personasBeneficiadas: item.personasBeneficiadas,
    mesesFueraDeServicio: item.mesesFueraDeServicio,
    nbi,
  });

  const { factores } = puntaje;

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="obras">
      <main>
        <Link href="/obras" className="volver">
          ← Inventario
        </Link>

        <div className="cabecera-pagina">
          <div>
            <h1>{item.nombre}</h1>
            <p className="discreto">
              {item.municipio.nombre} · {item.ubicacion} · {ETIQUETA_CATEGORIA[item.categoria!]}
            </p>
          </div>
          <span className="pastilla pastilla-acento">
            Nivel {puntaje.nivel} · {puntaje.titulo}
          </span>
        </div>

        <p className="discreto">
          {puntaje.ods.join(", ")} · El nivel manda sobre el puntaje: ninguna obra de nivel inferior
          adelanta a una de nivel superior.
        </p>

        <h2>Como se calculo su puntaje</h2>
        <div className="tabla-desplazable">
          <table>
            <thead>
              <tr>
                <th>Factor</th>
                <th>Dato</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Personas beneficiadas</td>
                <td>
                  {factores.personasBeneficiadas === null
                    ? "sin dato"
                    : numero.format(factores.personasBeneficiadas)}
                </td>
                <td>
                  {factores.personasBeneficiadas === null
                    ? "—"
                    : numero.format(factores.personasBeneficiadas)}
                </td>
              </tr>
              <tr>
                <td>Vulnerabilidad del municipio</td>
                <td>{factores.nbi === null ? "sin dato (neutro)" : `NBI ${factores.nbi}`}</td>
                <td>× {decimal.format(factores.factorVulnerabilidad)}</td>
              </tr>
              <tr>
                <td>Tiempo fuera de servicio</td>
                <td>{factores.mesesFueraDeServicio} meses</td>
                <td>× {decimal.format(factores.factorTiempo)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Puntaje</strong>
                </td>
                <td />
                <td>
                  <strong>
                    {puntaje.incompleto ? "incompleto" : numero.format(Math.round(puntaje.valor!))}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {puntaje.incompleto ? (
          <p className="discreto">
            Falta el numero de personas beneficiadas, asi que esta obra se ubica al final de su
            nivel. No queda excluida de la lista.
          </p>
        ) : null}

        <p className="discreto">
          Pesos vigentes de la formula: vulnerabilidad ×{PESOS.vulnerabilidad}, tiempo ×
          {PESOS.tiempo}, tope del factor de tiempo {PESOS.topeTiempo}. Con estos numeros cualquiera
          puede recalcular el puntaje a mano y llegar al mismo resultado.
        </p>

        <h2>Daño reportado</h2>
        <p>{item.descripcionDano}</p>
        <p className="discreto">
          <Link href={`/obras/${obra.id}/documentos`}>
            Documentos de respaldo ({obra.documentos.length})
          </Link>{" "}
          — evidencia fotografica del daño, cotizaciones, estudios y actas.
        </p>

        <h2>Costo y financiacion</h2>
        <p className="discreto">Estado: {ETIQUETA_ESTADO[obra.estado]}</p>

        {obra.costoEstudios !== null ? (
          <p>
            Cotizacion de los estudios:{" "}
            <strong>{formatearPesos(desdeDecimal(obra.costoEstudios))}</strong>
          </p>
        ) : null}

        {vigente ? (
          <>
            <p>
              Costo de la obra segun el estudio del{" "}
              {vigente.fechaEstudio.toISOString().slice(0, 10)}:{" "}
              <strong>{formatearPesos(desdeDecimal(vigente.valor))}</strong>
            </p>
            <p className="discreto">
              Respaldo: {vigente.referenciaDocumento} · Responsable: {vigente.responsable}
              {obra.costos.length > 1 ? ` · ${obra.costos.length} valores en el historial` : ""}
            </p>

            <Financiacion obraId={obra.id} municipioId={item.municipioId} simulado={simulado} />

            <p>
              <Link href={`/obras/${obra.id}/aportes`}>Aportes</Link> ·{" "}
              <Link href={`/obras/${obra.id}/intervenciones`}>Intervenciones de terceros</Link>
            </p>
          </>
        ) : (
          <p className="discreto">
            <strong>Pendiente de estudios.</strong> El costo de una obra no existe hasta que un
            estudio lo determina, asi que todavia no hay brecha ni plazos que mostrar. La prioridad,
            en cambio, ya esta calculada: no depende del costo.
          </p>
        )}

        {esDueño ? (
          <p>
            <Link href={`/obras/${obra.id}/costo`}>Registrar cotizacion y costo</Link>
          </p>
        ) : null}

        {siguiente && esDueño && !(obra.estado === "EN_ESTUDIOS" && !vigente) ? (
          <form action={cambiarEstadoObra}>
            <input type="hidden" name="obraId" value={obra.id} />
            <input type="hidden" name="estadoNuevo" value={siguiente} />
            <label>
              <span>Motivo del cambio de estado (opcional)</span>
              <input name="motivo" maxLength={200} />
            </label>
            <button type="submit">Pasar a {ETIQUETA_ESTADO[siguiente]}</button>
          </form>
        ) : null}

        <p className="discreto">
          <Link href={`/obras/${obra.id}/historial`}>
            Historial completo, incluidos los intentos rechazados
          </Link>
        </p>

        {obra.cambios.length > 0 ? (
          <>
            <h2>Historia de la obra</h2>
            <div className="tabla-desplazable">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cambio</th>
                    <th>Motivo</th>
                    <th>Quien</th>
                  </tr>
                </thead>
                <tbody>
                  {obra.cambios.map((c) => (
                    <tr key={c.id}>
                      <td className="discreto">{c.creadoEn.toISOString().slice(0, 10)}</td>
                      <td>
                        {ETIQUETA_ESTADO[c.estadoAnterior]} → {ETIQUETA_ESTADO[c.estadoNuevo]}
                      </td>
                      <td className="discreto">{c.motivo ?? "—"}</td>
                      <td className="discreto">{c.usuario.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </main>
    </Tablero>
  );
}
