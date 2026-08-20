import Link from "next/link";
import { redirect } from "next/navigation";
import { Tablero } from "@/app/tablero";
import { prisma } from "@/lib/db";
import { requerirSesion } from "@/lib/auth";
import { registrarRechazo } from "@/lib/audit";
import { puedeGestionarDamnificados } from "@/lib/authz";
import { ACCIONES, ETIQUETA_AYUDA, MOTIVOS_SUPRESION, obtenerHogar } from "@/lib/damnificados";
import {
  actualizarHogar,
  asignarAyuda,
  cambiarEstadoAyuda,
  registrarAutorizacion,
  subirFoto,
  suprimirHogar,
} from "@/app/actions/damnificados";
import { listarOferta, separarPorHabilitacion } from "@/lib/oferta";
import { almacenamientoConfigurado } from "@/lib/almacenamiento";
import { TextoLey1581 } from "@/app/damnificados/autorizacion";

const ERRORES: Record<string, string> = {
  faltan: "Falta el nombre de la persona responsable del hogar.",
  conteos: "Los conteos deben ser numeros enteros; el total debe ser al menos 1.",
  confirmacion: "Para suprimir hay que escribir SUPRIMIR en la casilla de confirmacion.",
  foto: "No se pudo guardar la foto. Debe ser JPG o PNG. El resto del registro quedo intacto.",
  oferta: "Esa ayuda no esta habilitada todavia: no se puede tramitar.",
};

const AVISOS: Record<string, string> = {
  duplicado:
    "Ya hay otro hogar de este municipio registrado con ese mismo documento. Verifique que no sea un doble registro de la misma familia.",
};

/**
 * Ficha del hogar (spec 006 US1).
 *
 * El acceso se corta antes de mostrar nada y el intento queda auditado: entrar a la ficha de
 * un hogar de otro municipio es exactamente el hecho que una auditoria posterior necesita ver.
 */
export default async function FichaHogar({
  params,
  searchParams,
}: {
  params: Promise<{ hogarId: string }>;
  searchParams: Promise<{ error?: string; aviso?: string }>;
}) {
  const sesion = await requerirSesion();
  const { hogarId } = await params;
  const { error, aviso } = await searchParams;

  const duenio = await prisma.hogarDamnificado.findUnique({
    where: { id: hogarId },
    select: { municipioId: true },
  });
  if (!duenio) redirect("/damnificados?error=noexiste");

  const veredicto = puedeGestionarDamnificados(sesion, duenio);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: ACCIONES.actualizar, objetivoTipo: "HogarDamnificado", objetivoId: hogarId },
      veredicto.motivo,
    );
    redirect("/damnificados?error=permiso");
  }

  const hogar = await obtenerHogar(hogarId, sesion.entidadId);
  if (!hogar) redirect("/damnificados?error=noexiste");

  const inmuebles = await prisma.itemInventario.findMany({
    where: { municipioId: sesion.entidadId },
    select: { id: true, nombre: true, ubicacion: true },
    orderBy: { nombre: "asc" },
  });

  const autorizado = hogar.autorizacion?.otorgada === true;

  // Solo lo habilitado se puede asignar. Lo anunciado existe en el catalogo, pero mandar a
  // una familia a reclamarlo seria mandarla a una fila que no existe (lib/oferta.ts).
  const { habilitadas } = separarPorHabilitacion(await listarOferta());

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="damnificados">
      <main>
        <Link href="/damnificados" className="volver">
          ← Damnificados
        </Link>

        <div className="cabecera-pagina">
          <div>
            <h1>{hogar.responsableNombre}</h1>
            <p className="discreto">
              Registrado el {hogar.creadoEn.toISOString().slice(0, 10)} · {hogar.personasTotal}{" "}
              {hogar.personasTotal === 1 ? "persona" : "personas"}
            </p>
          </div>
          <span className={autorizado ? "pastilla pastilla-exito" : "pastilla"}>
            {autorizado ? "Datos autorizados" : "Sin autorizacion"}
          </span>
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

        <h2>Autorizacion de datos</h2>
        {autorizado ? (
          <p>
            Autorizada el {hogar.autorizacion?.fecha.toISOString().slice(0, 10)} (
            {hogar.autorizacion?.medio.toLowerCase()}). Documento en el registro:{" "}
            <strong>{hogar.documento ?? "no se registro"}</strong>.
          </p>
        ) : (
          <p className="discreto">
            Sin autorizacion. El documento no se guarda mientras siga asi, y el hogar se atiende
            igual.
          </p>
        )}

        <form action={registrarAutorizacion}>
          <input type="hidden" name="hogarId" value={hogar.id} />
          <TextoLey1581 otorgada={autorizado} />
          <label>
            <span>Documento de identidad</span>
            <input
              name="documento"
              maxLength={20}
              inputMode="numeric"
              autoComplete="off"
              defaultValue={hogar.documento ?? ""}
            />
          </label>
          <button type="submit">Guardar autorizacion</button>
        </form>

        <h2>Ayudas</h2>
        {hogar.ayudas.length === 0 ? (
          <p className="discreto">Todavia no se le ha asignado ninguna ayuda a este hogar.</p>
        ) : (
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr>
                  <th>Ayuda</th>
                  <th>Entidad</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Cambiar</th>
                </tr>
              </thead>
              <tbody>
                {hogar.ayudas.map((a) => (
                  <tr key={a.id}>
                    <td>{a.oferta.nombre}</td>
                    <td className="discreto">{a.oferta.entidad}</td>
                    <td>{ETIQUETA_AYUDA[a.estado]}</td>
                    <td className="discreto">{a.fecha?.toISOString().slice(0, 10) ?? "—"}</td>
                    <td>
                      <form action={cambiarEstadoAyuda}>
                        <input type="hidden" name="ayudaId" value={a.id} />
                        <input
                          type="hidden"
                          name="estado"
                          value={a.estado === "ENTREGADA" ? "PENDIENTE" : "ENTREGADA"}
                        />
                        <button type="submit">
                          {a.estado === "ENTREGADA" ? "Volver a pendiente" : "Marcar entregada"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3>Asignar una ayuda</h3>
        {habilitadas.length === 0 ? (
          <p className="discreto">
            No hay ninguna ayuda habilitada en el catalogo todavia. Las que estan anunciadas no se
            pueden tramitar hasta que se reglamenten.
          </p>
        ) : (
          <form action={asignarAyuda}>
            <input type="hidden" name="hogarId" value={hogar.id} />
            <label>
              <span>Ayuda del catalogo</span>
              <select name="ofertaId" required defaultValue="">
                <option value="" disabled>
                  Elija una ayuda
                </option>
                {habilitadas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre} — {o.entidad}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Estado</span>
              <select name="estado" defaultValue="PENDIENTE">
                <option value="PENDIENTE">Pendiente: se tramito, no ha llegado</option>
                <option value="ENTREGADA">Entregada: ya la recibio el hogar</option>
              </select>
            </label>
            <button type="submit">Asignar</button>
          </form>
        )}

        <h2>Foto del inmueble</h2>
        {hogar.fotoRuta ? (
          <p>
            {/* Sin <img>: la foto no se precarga en la pantalla del funcionario, que puede
                estar mostrandosela a otra persona. Se abre cuando se decide abrirla. */}
            <a href={`/damnificados/${hogar.id}/foto`}>Ver la foto registrada</a>
          </p>
        ) : (
          <p className="discreto">Sin foto. No hace falta: el registro esta completo sin ella.</p>
        )}
        {almacenamientoConfigurado() ? (
          <form action={subirFoto}>
            <input type="hidden" name="hogarId" value={hogar.id} />
            <label>
              <span>Subir una foto (JPG o PNG)</span>
              <input type="file" name="foto" accept="image/jpeg,image/png" />
            </label>
            <p className="discreto">
              Se guarda sin los metadatos del telefono: la ubicacion GPS que traen las fotos no se
              almacena.
            </p>
            <button type="submit">Guardar foto</button>
          </form>
        ) : null}

        <h2>Corregir datos del hogar</h2>
        <form action={actualizarHogar}>
          <input type="hidden" name="hogarId" value={hogar.id} />
          <label>
            <span>Nombre de la persona responsable</span>
            <input
              name="responsableNombre"
              required
              maxLength={200}
              defaultValue={hogar.responsableNombre}
            />
          </label>
          <label>
            <span>Personas en total</span>
            <input
              name="personasTotal"
              type="number"
              min={1}
              max={100}
              required
              defaultValue={hogar.personasTotal}
            />
          </label>
          <label>
            <span>Niñez</span>
            <input
              name="personasNinez"
              type="number"
              min={0}
              max={100}
              defaultValue={hogar.personasNinez}
            />
          </label>
          <label>
            <span>Adultos mayores</span>
            <input
              name="personasAdultoMayor"
              type="number"
              min={0}
              max={100}
              defaultValue={hogar.personasAdultoMayor}
            />
          </label>
          <label>
            <span>Personas con discapacidad</span>
            <input
              name="personasDiscapacidad"
              type="number"
              min={0}
              max={100}
              defaultValue={hogar.personasDiscapacidad}
            />
          </label>
          <label>
            <span>Personas heridas</span>
            <input
              name="hayHeridos"
              type="number"
              min={0}
              max={100}
              defaultValue={hogar.hayHeridos}
            />
          </label>
          <label>
            <span>Personas fallecidas</span>
            <input
              name="hayFallecidos"
              type="number"
              min={0}
              max={100}
              defaultValue={hogar.hayFallecidos}
            />
          </label>
          <label>
            <span>Inmueble afectado</span>
            <select name="inmuebleId" defaultValue={hogar.inmuebleId ?? ""}>
              <option value="">Sin identificar todavia</option>
              {inmuebles.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre} — {i.ubicacion}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Guardar cambios</button>
        </form>

        <h2>Supresion a solicitud del titular</h2>
        <p className="discreto">
          Si la familia pide que se eliminen sus datos (habeas data, Ley 1581), esto borra el nombre
          y el documento. El hogar sigue contando en las cifras de la emergencia y las ayudas ya
          entregadas no se pierden. No se puede deshacer.
        </p>
        <form action={suprimirHogar}>
          <input type="hidden" name="hogarId" value={hogar.id} />
          <label>
            <span>Motivo</span>
            {/* Lista cerrada: el motivo queda en un asiento que no se puede borrar, y un
                campo abierto terminaria conservando ahi lo que se esta suprimiendo. */}
            <select name="motivo" defaultValue="SOLICITUD_TITULAR">
              {Object.entries(MOTIVOS_SUPRESION).map(([clave, etiqueta]) => (
                <option key={clave} value={clave}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Escriba SUPRIMIR para confirmar</span>
            <input name="confirmacion" required autoComplete="off" />
          </label>
          <button type="submit">Suprimir nombre y documento</button>
        </form>
      </main>
    </Tablero>
  );
}
