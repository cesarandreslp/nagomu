import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requerirSesion } from "@/lib/auth";
import { puedeVerBienReservado } from "@/lib/authz";
import { Tablero } from "@/app/tablero";
import { subirFotoDeBien } from "@/app/actions/obras";
import { almacenamientoConfigurado } from "@/lib/almacenamiento";
import { ETIQUETA_SECTOR, ETIQUETA_ESTADO, lugarGeneral } from "@/lib/bienes";
import { ETIQUETA_CATEGORIA } from "@/lib/prioridad";

const ERRORES: Record<string, string> = {
  foto: "La foto no se pudo guardar. Solo se aceptan JPG o PNG de hasta 10 MB.",
  permiso: "Solo el municipio dueño ve el detalle de sus bienes.",
};

const AVISOS: Record<string, string> = {
  foto: "Foto guardada sin metadatos: la coordenada del celular no se almacenó.",
};

/**
 * Detalle RESERVADO de un bien afectado (spec 007).
 *
 * Aqui viven los dos campos que el censo publico nunca muestra —la direccion exacta y la
 * foto— y por eso la vista esta acotada al municipio dueño, no a cualquier funcionario
 * autenticado (Principio II y IV).
 *
 * Tambien es donde se ven **las familias que habitan el inmueble** (US2): un sismo no
 * afecta viviendas, afecta a quienes viven en ellas, y en una casa puede vivir mas de una
 * familia. El modelo ya lo permite —varios hogares apuntando al mismo inmueble—; esta
 * pantalla es la que lo hace visible y accionable.
 */
export default async function DetalleDeBien({
  params,
  searchParams,
}: {
  params: Promise<{ bienId: string }>;
  searchParams: Promise<{ error?: string; aviso?: string }>;
}) {
  const { bienId } = await params;
  const { error, aviso } = await searchParams;
  const sesion = await requerirSesion();

  const bien = await prisma.itemInventario.findUnique({
    where: { id: bienId },
    select: {
      id: true,
      municipioId: true,
      nombre: true,
      sector: true,
      tipoBien: true,
      estadoAfectacion: true,
      categoria: true,
      descripcionDano: true,
      ubicacion: true,
      corregimiento: true,
      vereda: true,
      latitud: true,
      longitud: true,
      fotoRuta: true,
      creadoEn: true,
      municipio: { select: { nombre: true } },
      obra: { select: { id: true, estado: true } },
      hogares: {
        select: {
          id: true,
          responsableNombre: true,
          personasTotal: true,
          personasNinez: true,
          personasAdultoMayor: true,
          personasDiscapacidad: true,
          creadoEn: true,
        },
        orderBy: { creadoEn: "asc" },
      },
    },
  });
  if (!bien) notFound();

  const veredicto = puedeVerBienReservado(sesion, bien);
  if (!veredicto.permitido) redirect("/bienes?error=permiso");

  const personas = bien.hogares.reduce((suma, h) => suma + h.personasTotal, 0);

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="bienes">
      <main>
        <Link href="/bienes" className="volver">
          ← Caracterizacion
        </Link>

        <div className="cabecera-pagina">
          <div>
            <h1>{bien.nombre}</h1>
            <p className="discreto">
              {ETIQUETA_SECTOR[bien.sector]} · {bien.tipoBien} · registrado el{" "}
              {bien.creadoEn.toISOString().slice(0, 10)}
            </p>
          </div>
          {bien.obra ? (
            <div className="acciones">
              <Link href={`/obras/${bien.obra.id}`} className="boton boton-secundario">
                Ver la obra en la cola
              </Link>
            </div>
          ) : null}
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

        <section className="panel">
          <h2>Afectacion</h2>
          <dl className="datos">
            <div>
              <dt>Sector doliente</dt>
              <dd>{ETIQUETA_SECTOR[bien.sector]}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{bien.tipoBien}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                {bien.estadoAfectacion ? (
                  <span className="pastilla">{ETIQUETA_ESTADO[bien.estadoAfectacion]}</span>
                ) : (
                  "Sin definir"
                )}
              </dd>
            </div>
            <div>
              <dt>Categoria de obra</dt>
              <dd>{bien.categoria ? ETIQUETA_CATEGORIA[bien.categoria] : "No aplica"}</dd>
            </div>
          </dl>

          <h3>Daño reportado</h3>
          <p>{bien.descripcionDano}</p>
        </section>

        <section className="panel">
          <h2>Ubicacion</h2>
          <p className="discreto">
            La direccion es <strong>reservada</strong>: solo la ve {bien.municipio.nombre}. El lugar
            general y el punto sí aparecen en el censo publico.
          </p>
          <dl className="datos">
            <div>
              <dt>Direccion (reservada)</dt>
              <dd>{bien.ubicacion || "—"}</dd>
            </div>
            <div>
              <dt>Lugar general (publico)</dt>
              <dd>{lugarGeneral(bien) ?? "—"}</dd>
            </div>
            <div>
              <dt>Punto (publico)</dt>
              <dd>
                {bien.latitud !== null && bien.longitud !== null
                  ? `${bien.latitud}, ${bien.longitud}`
                  : "Sin coordenada"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <h2>Foto del bien</h2>
          <p className="discreto">
            Se guarda <strong>sin metadatos</strong>: el EXIF de una foto de celular trae la
            coordenada exacta de donde se tomó, y esa coordenada es tan reservada como la direccion.
            Solo JPG o PNG, que son los formatos cuyos metadatos se saben limpiar.
          </p>

          {bien.fotoRuta ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/bienes/${bien.id}/foto`}
              alt={`Estado de ${bien.nombre}`}
              style={{ maxWidth: "28rem", width: "100%", borderRadius: "6px" }}
            />
          ) : (
            <p className="discreto">Todavia no hay foto.</p>
          )}

          {almacenamientoConfigurado() ? (
            <form action={subirFotoDeBien}>
              <input type="hidden" name="bienId" value={bien.id} />
              <label>
                <span>{bien.fotoRuta ? "Reemplazar la foto" : "Adjuntar una foto"}</span>
                <input type="file" name="foto" accept="image/jpeg,image/png" required />
              </label>
              <button type="submit">Guardar foto</button>
            </form>
          ) : (
            <p className="discreto">El almacenamiento de fotos no esta configurado.</p>
          )}
        </section>

        <section className="panel">
          <h2>Familias que habitan este inmueble</h2>
          <p className="discreto">
            En una vivienda puede vivir mas de una familia, y cada una se atiende por separado.{" "}
            {bien.hogares.length === 0 ? "" : `${personas} personas en total.`}
          </p>

          {bien.hogares.length === 0 ? (
            <p className="vacio">
              Ningun hogar registrado en este inmueble.{" "}
              <Link href="/damnificados/nuevo">Registrar uno</Link>.
            </p>
          ) : (
            <div className="tabla-desplazable">
              <table>
                <thead>
                  <tr>
                    <th>Responsable</th>
                    <th>Personas</th>
                    <th>Niñez</th>
                    <th>Adulto mayor</th>
                    <th>Discapacidad</th>
                  </tr>
                </thead>
                <tbody>
                  {bien.hogares.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <Link href={`/damnificados/${h.id}`}>{h.responsableNombre}</Link>
                      </td>
                      <td>{h.personasTotal}</td>
                      <td>{h.personasNinez}</td>
                      <td>{h.personasAdultoMayor}</td>
                      <td>{h.personasDiscapacidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="acciones">
            <Link href="/damnificados/nuevo" className="boton boton-secundario">
              Registrar otra familia aqui
            </Link>
          </div>
        </section>
      </main>
    </Tablero>
  );
}
