import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requerirSesion } from "@/lib/auth";
import { Tablero } from "@/app/tablero";
import { registrarAporte } from "@/app/actions/aportes";
import { listarFondosPara } from "@/lib/fondos";
import { desdeDecimal, formatearPesos } from "@/lib/dinero";
import { aportesVigentes } from "@/lib/brecha";
import { ETIQUETA_ESTADO } from "@/lib/estados";

const ERRORES: Record<string, string> = {
  sincosto: "No se puede aportar a una obra sin costo determinado por un estudio.",
  permiso: "Ninguna entidad puede inscribir ni modificar aportes de otra.",
  fondo: "Escoge un fondo vigente.",
  ambito: "Ese fondo no corresponde al ambito de quien aporta.",
  proyecto: "Ese fondo exige declarar que proyecto se aplazo para liberar los recursos.",
  estado: "Escoge el estado del aporte.",
  fecha: "La fecha no es valida.",
  monto: "El monto debe ser un numero positivo.",
  actor: "No se pudo identificar al aportante.",
};

const ETIQUETA_APORTE: Record<string, string> = {
  COMPROMETIDO: "Comprometido",
  GIRADO: "Girado",
  EJECUTADO: "Ejecutado",
};

export default async function Aportes({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await requerirSesion();
  const { obraId } = await params;

  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    include: {
      item: { select: { nombre: true, municipioId: true } },
      aportes: {
        orderBy: { creadoEn: "desc" },
        include: {
          actor: { select: { nombre: true, tipo: true } },
          fondo: { select: { nombre: true, sigla: true, ambito: true } },
          registradoPor: { select: { nombre: true } },
        },
      },
    },
  });
  if (!obra) notFound();

  const { error } = await searchParams;
  const fondos = await listarFondosPara(sesion.nivel);
  const esDueño = sesion.nivel === "MUNICIPIO" && sesion.entidadId === obra.item.municipioId;
  const sinCosto = obra.estado === "IDENTIFICADO" || obra.estado === "EN_ESTUDIOS";
  const vigentes = new Set(aportesVigentes(obra.aportes).map((a) => a.id));

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="obras">
      <main>
        <Link href={`/obras/${obraId}`} className="volver">
          ← {obra.item.nombre}
        </Link>

        <h1>Aportes</h1>
        <p className="discreto">Estado de la obra: {ETIQUETA_ESTADO[obra.estado]}</p>

        {error ? (
          <p className="error" role="alert">
            {ERRORES[error] ?? "No fue posible registrar el aporte."}
          </p>
        ) : null}

        {sinCosto ? (
          <p className="error">
            Esta obra todavia no tiene costo determinado por un estudio. Sin costo no hay brecha
            contra la cual medir un aporte.
          </p>
        ) : (
          <>
            <h2>Registrar aporte de {sesion.entidadNombre}</h2>
            <form action={registrarAporte}>
              <input type="hidden" name="obraId" value={obraId} />

              <label>
                <span>Monto</span>
                <input name="monto" inputMode="decimal" placeholder="200000000" required />
              </label>

              <label>
                <span>Fondo del que salen los recursos</span>
                <select name="fondoId" required defaultValue="">
                  <option value="" disabled>
                    Escoge un fondo
                  </option>
                  {fondos.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                      {f.exigeProyectoAplazado ? " (exige proyecto aplazado)" : ""}
                    </option>
                  ))}
                </select>
                <span className="discreto">
                  Solo aparecen los fondos del ambito de {sesion.entidadNombre} y los externos.
                </span>
              </label>

              <label>
                <span>Proyecto aplazado</span>
                <input
                  name="proyectoAplazado"
                  maxLength={300}
                  placeholder="Pavimentacion de la via a El Placer"
                />
                <span className="discreto">
                  Obligatorio si el fondo es un traslado presupuestal. Es el costo de oportunidad de
                  esta obra, y merece quedar escrito.
                </span>
              </label>

              <label>
                <span>Estado</span>
                <select name="estado" required defaultValue="COMPROMETIDO">
                  <option value="COMPROMETIDO">Comprometido — se prometio</option>
                  <option value="GIRADO">Girado — la plata salio</option>
                  <option value="EJECUTADO">Ejecutado — la plata se gasto</option>
                </select>
              </label>

              <label>
                <span>Fecha</span>
                <input type="date" name="fecha" required />
              </label>

              {esDueño ? (
                <>
                  <label>
                    <span>Aportante distinto de {sesion.entidadNombre}</span>
                    <input
                      name="actorNombre"
                      maxLength={200}
                      placeholder="Dejar vacio si aporta el municipio"
                    />
                    <span className="discreto">
                      Para inscribir por una empresa, fundacion, voluntariado o cooperante sin
                      usuario propio. Queda registrado que el actor y quien digito son distintos.
                    </span>
                  </label>
                  <label>
                    <span>Tipo de aportante</span>
                    <select name="actorTipo" defaultValue="EMPRESA">
                      <option value="EMPRESA">Empresa</option>
                      <option value="FUNDACION">Fundacion</option>
                      <option value="ONG">ONG</option>
                      <option value="VOLUNTARIADO">Voluntariado</option>
                      <option value="PERSONA_NATURAL">Persona natural</option>
                      <option value="COOPERANTE_INTERNACIONAL">Cooperante internacional</option>
                    </select>
                  </label>
                </>
              ) : null}

              <button type="submit">Registrar aporte</button>
            </form>
          </>
        )}

        {obra.aportes.length > 0 ? (
          <>
            <h2>Aportes registrados</h2>
            <div className="tabla-desplazable">
              <table>
                <thead>
                  <tr>
                    <th>Monto</th>
                    <th>Aportante</th>
                    <th>Fondo</th>
                    <th>Estado</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {obra.aportes.map((a) => (
                    <tr key={a.id}>
                      <td>
                        {formatearPesos(desdeDecimal(a.monto))}
                        {!vigentes.has(a.id) ? (
                          <div className="discreto">corregido por otro registro</div>
                        ) : null}
                      </td>
                      <td>
                        {a.actor.nombre}
                        <div className="discreto">
                          {a.actor.tipo.toLowerCase().replace(/_/g, " ")}
                        </div>
                      </td>
                      <td className="discreto">
                        {a.fondo.sigla ?? a.fondo.nombre}
                        {a.proyectoAplazado ? <div>Se aplazo: {a.proyectoAplazado}</div> : null}
                      </td>
                      <td className="discreto">{ETIQUETA_APORTE[a.estado]}</td>
                      <td className="discreto">
                        {a.fecha.toISOString().slice(0, 10)} · {a.registradoPor.nombre}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="discreto">
              Un aporte no se edita: se registra otro que corrige al anterior, y el original sigue
              visible. Cambiar de comprometido a girado tambien es un registro nuevo.
            </p>
          </>
        ) : null}
      </main>
    </Tablero>
  );
}
