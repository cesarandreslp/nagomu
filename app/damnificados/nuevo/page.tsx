import Link from "next/link";
import { redirect } from "next/navigation";
import { Tablero } from "@/app/tablero";
import { prisma } from "@/lib/db";
import { requerirSesion } from "@/lib/auth";
import { rutaCaptura } from "@/lib/captura";
import { TextoLey1581 } from "@/app/damnificados/autorizacion";

const ERRORES: Record<string, string> = {
  faltan: "Falta el nombre de la persona responsable del hogar.",
  conteos: "Los conteos deben ser numeros enteros; el total debe ser al menos 1.",
  permiso: "Solo el municipio registra damnificados de su territorio.",
};

/**
 * Registro de un hogar damnificado (spec 006 US1).
 *
 * Formulario server-rendered que funciona sin JavaScript (Principio III): en una emergencia
 * el funcionario puede estar con un equipo viejo o con una conexion que apenas carga texto.
 *
 * El bloque de autorizacion no es un tramite decorativo: mientras no este marcado, el
 * documento que se escriba arriba no se guarda. Eso lo aplica el servidor.
 */
export default async function NuevoHogar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await requerirSesion();
  if (sesion.nivel !== "MUNICIPIO") redirect("/obras?error=permiso");

  const { error } = await searchParams;

  const inmuebles = await prisma.itemInventario.findMany({
    where: { municipioId: sesion.entidadId },
    select: { id: true, nombre: true, ubicacion: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="damnificados">
      <main>
        <Link href="/damnificados" className="volver">
          ← Damnificados
        </Link>

        <div className="cabecera-pagina">
          <div>
            <h1>Registrar hogar damnificado</h1>
            <p className="discreto">
              Se registra el hogar, no cada persona: quien responde por el, cuantos son y que
              condiciones tienen. Con eso alcanza para saber a quien hay que atender primero. Sin
              señal el registro queda en este dispositivo y se envia al recuperar la conexion.
            </p>
          </div>
        </div>

        {error ? (
          <p className="error" role="alert">
            {ERRORES[error] ?? "Revisa los datos."}
          </p>
        ) : null}

        {/* POST a una URL estable (spec 008): lo capturado sin señal se puede reenviar
            aunque entre medio haya un despliegue. Sin JavaScript envia igual. */}
        <form
          method="post"
          action={rutaCaptura("hogar")}
          data-captura="Hogar damnificado"
          data-captura-vuelve="/damnificados"
        >
          <section className="panel">
            <h2>Responsable del hogar</h2>
            <div className="campos">
              <label>
                <span>Nombre de la persona responsable</span>
                <input name="responsableNombre" required maxLength={200} />
              </label>

              <label>
                <span>Documento de identidad (opcional)</span>
                <input name="documento" maxLength={20} inputMode="numeric" autoComplete="off" />
              </label>
            </div>

            <TextoLey1581 />
          </section>

          <section className="panel">
            <h2>Composicion del hogar</h2>
            <div className="campos">
              <label>
                <span>Personas en total</span>
                <input
                  name="personasTotal"
                  type="number"
                  min={1}
                  max={100}
                  required
                  defaultValue={1}
                />
              </label>
              <label>
                <span>Cuantas son niños, niñas o adolescentes</span>
                <input name="personasNinez" type="number" min={0} max={100} defaultValue={0} />
              </label>
              <label>
                <span>Cuantas son adultos mayores</span>
                <input
                  name="personasAdultoMayor"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={0}
                />
              </label>
              <label>
                <span>Cuantas tienen alguna discapacidad</span>
                <input
                  name="personasDiscapacidad"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={0}
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <h2>Situacion</h2>
            <p className="discreto">
              Solo el numero, para saber donde hay urgencia. Nagomu no registra diagnosticos,
              lesiones ni ninguna informacion de salud.
            </p>
            <div className="campos">
              <label>
                <span>Personas heridas</span>
                <input name="hayHeridos" type="number" min={0} max={100} defaultValue={0} />
              </label>
              <label>
                <span>Personas fallecidas</span>
                <input name="hayFallecidos" type="number" min={0} max={100} defaultValue={0} />
              </label>
            </div>
          </section>

          <section className="panel">
            <h2>Inmueble afectado</h2>
            <label>
              <span>Inmueble del inventario (opcional)</span>
              <select name="inmuebleId" defaultValue="">
                <option value="">Sin identificar todavia</option>
                {inmuebles.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} — {i.ubicacion}
                  </option>
                ))}
              </select>
            </label>
            {inmuebles.length === 0 ? (
              <p className="discreto">
                El municipio todavia no tiene items en el inventario. El hogar se registra igual; el
                inmueble se puede asociar despues.
              </p>
            ) : null}
          </section>

          <div className="acciones">
            <button type="submit">Registrar hogar</button>
            <Link href="/damnificados" className="boton boton-secundario">
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </Tablero>
  );
}
