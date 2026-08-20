import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requerirSesion } from "@/lib/auth";
import { Tablero } from "@/app/tablero";
import {
  cambiarEstadoIntervencion,
  registrarVerificacionCalidad,
  solicitarIntervencion,
} from "@/app/actions/intervenciones";
import {
  ETIQUETA_INTERVENCION,
  EXIGEN_MOTIVO,
  cuentaComo,
  estaVencida,
  transicionesPosibles,
} from "@/lib/intervenciones";
import { desdeDecimal, formatearPesos } from "@/lib/dinero";
import type { EstadoIntervencion } from "@/lib/generated/prisma/enums";

const ERRORES: Record<string, string> = {
  permiso: "Solo el municipio dueño autoriza intervenciones sobre sus obras.",
  faltan: "Falta el ejecutor, el alcance, el responsable tecnico o el plazo.",
  fecha: "La fecha no es valida.",
  monto: "El valor equivalente debe ser un numero positivo.",
  transicion: "Ese cambio de estado no es valido, o falta decir por que.",
  resultado: "Escoge el resultado de la verificacion.",
};

const ETIQUETA_RESULTADO: Record<string, string> = {
  CONFORME: "Conforme",
  OBSERVACIONES: "Con observaciones",
  NO_CONFORME: "No conforme",
};

const PESO: Record<string, string> = {
  EJECUTADO: "cuenta como ejecutado: reduce la brecha",
  COMPROMETIDO: "cuenta como comprometido: todavia es una promesa",
  NADA: "no cuenta en la brecha",
};

export default async function Intervenciones({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await requerirSesion();
  const { obraId } = await params;
  const hoy = new Date();

  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    include: {
      item: { select: { nombre: true, municipioId: true } },
      intervenciones: {
        orderBy: { creadoEn: "desc" },
        include: {
          actor: { select: { nombre: true, tipo: true } },
          registradoPor: { select: { nombre: true } },
          verificaciones: {
            orderBy: { fecha: "desc" },
            include: { funcionario: { select: { nombre: true } } },
          },
          cambios: {
            orderBy: { creadoEn: "desc" },
            include: { usuario: { select: { nombre: true } } },
          },
        },
      },
    },
  });
  if (!obra) notFound();

  const { error } = await searchParams;
  const esDueño = sesion.nivel === "MUNICIPIO" && sesion.entidadId === obra.item.municipioId;

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="obras">
      <main>
        <Link href={`/obras/${obraId}`} className="volver">
          ← {obra.item.nombre}
        </Link>

        <h1>Intervenciones de terceros</h1>
        <p className="discreto">
          Cuando una empresa, fundacion, voluntariado o persona ejecuta parte de la obra por su
          cuenta. Es el mecanismo de obras por impuestos y de cualquier ayuda en especie: no entra
          plata a una caja, deja de haber alcance que financiar.
        </p>
        <p className="discreto">
          <strong>
            El valor solo cuenta como ejecutado cuando el municipio recibe a satisfaccion.
          </strong>{" "}
          Sin ese freno cualquiera declara que arreglo la escuela, la brecha se cierra sola en
          pantalla y nadie reviso nada. Si una verificacion sale mal y se suspende, la brecha se
          reabre.
        </p>

        {error ? (
          <p className="error" role="alert">
            {ERRORES[error] ?? "No fue posible completar la accion."}
          </p>
        ) : null}

        {esDueño ? (
          <>
            <h2>Registrar solicitud</h2>
            <form action={solicitarIntervencion}>
              <input type="hidden" name="obraId" value={obraId} />
              <label>
                <span>Quien ejecuta</span>
                <input
                  name="actorNombre"
                  required
                  maxLength={200}
                  placeholder="Constructora del Valle SAS"
                />
              </label>
              <label>
                <span>Tipo de ejecutor</span>
                <select name="actorTipo" defaultValue="EMPRESA">
                  <option value="EMPRESA">Empresa</option>
                  <option value="FUNDACION">Fundacion</option>
                  <option value="ONG">ONG</option>
                  <option value="VOLUNTARIADO">Voluntariado</option>
                  <option value="PERSONA_NATURAL">Persona natural</option>
                  <option value="COOPERANTE_INTERNACIONAL">Cooperante internacional</option>
                </select>
              </label>
              <label>
                <span>Alcance que cubre</span>
                <textarea
                  name="alcance"
                  required
                  rows={3}
                  maxLength={1000}
                  placeholder="Reconstruccion de la cubierta del bloque de aulas"
                />
              </label>
              <label>
                <span>Valor equivalente</span>
                <input
                  name="valorEquivalente"
                  inputMode="decimal"
                  required
                  placeholder="400000000"
                />
                <span className="discreto">
                  Cuanto deja de haber que financiar si se ejecuta. Es lo que se descuenta de la
                  brecha, asi que merece el mismo cuidado que un contrato.
                </span>
              </label>
              <label>
                <span>Plazo comprometido</span>
                <input type="date" name="plazoComprometido" required />
              </label>
              <label>
                <span>Responsable tecnico</span>
                <input name="responsableTecnico" required maxLength={200} />
              </label>
              <label>
                <span>Autorizacion</span>
                <select name="autorizadaPreviamente" defaultValue="si">
                  <option value="si">Se solicito antes de ejecutar</option>
                  <option value="no">Ya se ejecuto sin autorizacion previa</option>
                </select>
                <span className="discreto">
                  Un tercero que arreglo el puente sin pedir permiso se puede registrar despues,
                  pero queda marcado. Ni se premia ni se borra.
                </span>
              </label>
              <button type="submit">Registrar solicitud</button>
            </form>
          </>
        ) : null}

        {obra.intervenciones.length === 0 ? (
          <p>Todavia no hay intervenciones registradas.</p>
        ) : (
          obra.intervenciones.map((i) => {
            const peso = cuentaComo(i.estado);
            const vencida = estaVencida(i.estado, i.plazoComprometido, hoy);
            const posibles = transicionesPosibles(i.estado);

            return (
              <section key={i.id}>
                <h2>
                  {i.actor.nombre} · {ETIQUETA_INTERVENCION[i.estado]}
                </h2>
                <p className="discreto">
                  {formatearPesos(desdeDecimal(i.valorEquivalente))} — {PESO[peso]}
                </p>
                <p>{i.alcance}</p>
                <p className="discreto">
                  Responsable tecnico: {i.responsableTecnico} · Plazo:{" "}
                  {i.plazoComprometido.toISOString().slice(0, 10)} · Inscrita por{" "}
                  {i.registradoPor.nombre}
                </p>

                {!i.autorizadaPreviamente ? (
                  <p className="error">
                    Se ejecuto sin autorizacion previa. Se registro despues de ocurrida.
                  </p>
                ) : null}

                {vencida ? (
                  <p className="error">
                    El plazo comprometido vencio y la intervencion no se ha recibido. No se cierra
                    sola: la decision es del municipio.
                  </p>
                ) : null}

                {esDueño && posibles.length > 0 ? (
                  <form action={cambiarEstadoIntervencion}>
                    <input type="hidden" name="intervencionId" value={i.id} />
                    <label>
                      <span>Pasar a</span>
                      <select name="estadoNuevo" defaultValue={posibles[0]}>
                        {posibles.map((e: EstadoIntervencion) => (
                          <option key={e} value={e}>
                            {ETIQUETA_INTERVENCION[e]}
                            {EXIGEN_MOTIVO.includes(e) ? " (exige motivo)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Motivo</span>
                      <input name="motivo" maxLength={300} />
                    </label>
                    <button type="submit">Cambiar estado</button>
                  </form>
                ) : null}

                {esDueño && (i.estado === "EN_EJECUCION" || i.estado === "APROBADA") ? (
                  <form action={registrarVerificacionCalidad}>
                    <input type="hidden" name="intervencionId" value={i.id} />
                    <label>
                      <span>Verificacion de calidad</span>
                      <select name="resultado" defaultValue="CONFORME">
                        <option value="CONFORME">Conforme</option>
                        <option value="OBSERVACIONES">Con observaciones</option>
                        <option value="NO_CONFORME">No conforme</option>
                      </select>
                    </label>
                    <label>
                      <span>Fecha de la visita</span>
                      <input type="date" name="fecha" required />
                    </label>
                    <label>
                      <span>Observaciones</span>
                      <input name="observaciones" maxLength={500} />
                    </label>
                    <button type="submit">Registrar verificacion</button>
                  </form>
                ) : null}

                {i.verificaciones.length > 0 ? (
                  <div className="tabla-desplazable">
                    <table>
                      <thead>
                        <tr>
                          <th>Verificacion</th>
                          <th>Resultado</th>
                          <th>Observaciones</th>
                          <th>Funcionario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {i.verificaciones.map((v) => (
                          <tr key={v.id}>
                            <td>{v.fecha.toISOString().slice(0, 10)}</td>
                            <td>{ETIQUETA_RESULTADO[v.resultado]}</td>
                            <td className="discreto">{v.observaciones ?? "—"}</td>
                            <td className="discreto">{v.funcionario.nombre}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {i.cambios.length > 0 ? (
                  <p className="discreto">
                    {i.cambios.map((c) => (
                      <span key={c.id}>
                        {c.creadoEn.toISOString().slice(0, 10)}:{" "}
                        {ETIQUETA_INTERVENCION[c.estadoAnterior]} →{" "}
                        {ETIQUETA_INTERVENCION[c.estadoNuevo]}
                        {c.motivo ? ` (${c.motivo})` : ""} · {c.usuario.nombre}
                        <br />
                      </span>
                    ))}
                  </p>
                ) : null}
              </section>
            );
          })
        )}
      </main>
    </Tablero>
  );
}
