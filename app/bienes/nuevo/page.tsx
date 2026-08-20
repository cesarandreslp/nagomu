import Link from "next/link";
import { redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { Tablero } from "@/app/tablero";
import { rutaCaptura } from "@/lib/captura";
import { ETIQUETA_SECTOR, ETIQUETA_ESTADO, SUGERENCIAS_TIPO } from "@/lib/bienes";
import { ETIQUETA_CATEGORIA, nivelDe } from "@/lib/prioridad";
import { Sector, CategoriaItem } from "@/lib/generated/prisma/enums";

const ERRORES: Record<string, string> = {
  faltan: "Falta el nombre, el tipo o la descripcion del daño.",
  sector: "Escoge el sector doliente.",
  estado: "El estado no corresponde al tipo de bien (edificacion vs. perdida).",
  categoria: "La categoria de obra solo aplica a bienes de interes publico (obra publica).",
  numero: "Las personas beneficiadas y los meses deben ser numeros enteros.",
  coordenada:
    "La coordenada necesita latitud y longitud, las dos, dentro de rango (lat -90 a 90, lon -180 a 180).",
};

const SECTORES = Object.keys(ETIQUETA_SECTOR) as Sector[];
// Sugerencias de tipo de todos los sectores, sin repetir: alimentan el datalist.
const SUGERENCIAS = [...new Set(Object.values(SUGERENCIAS_TIPO).flat())];
// Sin la categoria de nivel 0: la atencion humanitaria recurrente no es una obra.
const CATEGORIAS = (Object.keys(ETIQUETA_CATEGORIA) as CategoriaItem[]).filter(
  (c) => nivelDe(c) > 0,
);
const ESTADOS_EDIFICACION = ["HABITABLE", "REPARABLE", "DEMOLER"] as const;
const ESTADOS_PERDIDA = ["PERDIDO", "PARCIAL"] as const;

export default async function NuevoBien({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await requerirSesion();
  if (sesion.nivel !== "MUNICIPIO") redirect("/bienes?error=permiso");

  const { error } = await searchParams;

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="bienes">
      <main>
        <Link href="/bienes" className="volver">
          ← Caracterizacion
        </Link>

        <div className="cabecera-pagina">
          <div>
            <h1>Registrar bien afectado</h1>
            <p className="discreto">
              Se registra a nombre de {sesion.entidadNombre}. Sin señal el registro queda guardado
              en este dispositivo y se envia solo cuando vuelva la conexion.
            </p>
          </div>
        </div>

        {error ? (
          <p className="error" role="alert">
            {ERRORES[error] ?? "Revisa los datos."}
          </p>
        ) : null}

        {/* POST a una URL estable, no a una Server Action: es lo que permite reenviar
            horas despues lo capturado sin señal (spec 008). Sin JavaScript envia igual. */}
        <form
          method="post"
          action={rutaCaptura("bien")}
          data-captura="Bien afectado"
          data-captura-vuelve="/bienes"
        >
          <section className="panel">
            <h2>Que se afecto</h2>

            <div className="campos">
              <label className="campo-ancho">
                <span>Nombre del bien afectado</span>
                <input name="nombre" required maxLength={200} placeholder="Escuela El Placer" />
              </label>

              <label>
                <span>Sector doliente</span>
                <select name="sector" required defaultValue="">
                  <option value="" disabled>
                    Escoge el doliente
                  </option>
                  {SECTORES.map((s) => (
                    <option key={s} value={s}>
                      {ETIQUETA_SECTOR[s]}
                    </option>
                  ))}
                </select>
                <span className="discreto">
                  Determina a qué ministerio/secretaría sube el reporte en departamento y nación.
                </span>
              </label>

              <label>
                <span>Tipo concreto</span>
                <input
                  name="tipoBien"
                  required
                  maxLength={80}
                  list="tipos-sugeridos"
                  placeholder="Escuela, puente, cultivo, muro de contención…"
                />
                <datalist id="tipos-sugeridos">
                  {SUGERENCIAS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <span className="discreto">
                  Escoge una sugerencia o escribe el tipo que falte: la lista no es cerrada.
                </span>
              </label>

              <label>
                <span>Estado de la afectacion (opcional)</span>
                <select name="estadoAfectacion" defaultValue="">
                  <option value="">Sin definir</option>
                  <optgroup label="Edificaciones (vivienda, escuela, salud, comercio, cultura, deporte)">
                    {ESTADOS_EDIFICACION.map((e) => (
                      <option key={e} value={e}>
                        {ETIQUETA_ESTADO[e]}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Infraestructura y agropecuario (vías, muros, acueductos, cultivos, animales)">
                    {ESTADOS_PERDIDA.map((e) => (
                      <option key={e} value={e}>
                        {ETIQUETA_ESTADO[e]}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>

              <label>
                <span>Categoria de obra (solo bienes de interés público)</span>
                <select name="categoria" defaultValue="">
                  <option value="">No aplica</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      Nivel {nivelDe(c)} · {ETIQUETA_CATEGORIA[c]}
                    </option>
                  ))}
                </select>
                <span className="discreto">
                  Un bien de interés público (escuela, hospital, vía, acueducto, muro…) con
                  categoría entra a la cola de obras (spec 001). Una vivienda, un comercio o un
                  cultivo se caracteriza, pero no es una obra cofinanciable.
                </span>
              </label>

              <label className="campo-ancho">
                <span>Descripcion del daño</span>
                <textarea name="descripcionDano" required rows={3} maxLength={1000} />
              </label>
            </div>
          </section>

          <section className="panel">
            <h2>Ubicacion</h2>
            <p className="discreto">
              La direccion es <strong>reservada</strong>: nunca aparece en el censo publico. El
              corregimiento/vereda (lugar general) y el punto sí son publicos. Si no hay coordenada,
              el bien queda ubicado por su lugar general.
            </p>

            <div className="campos">
              <label className="campo-ancho">
                <span>Direccion exacta (reservada, opcional)</span>
                <input
                  name="ubicacion"
                  maxLength={200}
                  placeholder="Vereda La Union, finca El Recuerdo"
                />
              </label>
              <label>
                <span>Corregimiento</span>
                <input name="corregimiento" maxLength={120} placeholder="El Placer" />
              </label>
              <label>
                <span>Vereda</span>
                <input name="vereda" maxLength={120} placeholder="La Union" />
              </label>
              <label>
                <span>Latitud (opcional)</span>
                <input name="latitud" inputMode="decimal" placeholder="3.9006" />
              </label>
              <label>
                <span>Longitud (opcional)</span>
                <input name="longitud" inputMode="decimal" placeholder="-76.2978" />
              </label>
            </div>
          </section>

          <section className="panel">
            <h2>Datos de priorizacion</h2>
            <p className="discreto">
              Solo pesan si el bien entra a la cola de obras. Un dato mal escrito altera el puntaje,
              asi que se deja vacio antes que a ojo.
            </p>

            <div className="campos">
              <label>
                <span>Personas beneficiadas</span>
                <input name="personasBeneficiadas" inputMode="numeric" placeholder="800" />
              </label>
              <label>
                <span>Meses fuera de servicio</span>
                <input name="mesesFueraDeServicio" inputMode="numeric" placeholder="6" />
              </label>
            </div>
          </section>

          <div className="acciones">
            <button type="submit">Registrar</button>
            <Link href="/bienes" className="boton boton-secundario">
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </Tablero>
  );
}
