import Link from "next/link";
import { redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { registrarBien } from "@/app/actions/obras";
import {
  ETIQUETA_TIPO_BIEN,
  ETIQUETA_SUBTIPO,
  ETIQUETA_ESTADO,
  estadosValidosPara,
} from "@/lib/bienes";
import { ETIQUETA_CATEGORIA, nivelDe } from "@/lib/prioridad";
import { TipoBien, SubtipoBien, CategoriaItem } from "@/lib/generated/prisma/enums";

const ERRORES: Record<string, string> = {
  faltan: "Falta el nombre o la descripcion del daño.",
  tipo: "Escoge el tipo de bien.",
  subtipo: "El subtipo es obligatorio para el bien agropecuario, y solo aplica ahi.",
  estado: "El estado no corresponde al tipo de bien.",
  categoria: "Una estructura publica necesita categoria: es lo que la mete a la cola de obras.",
  numero: "Las personas beneficiadas y los meses deben ser numeros enteros.",
  coordenada:
    "La coordenada necesita latitud y longitud, las dos, dentro de rango (lat -90 a 90, lon -180 a 180).",
};

const TIPOS = Object.values(TipoBien);
const SUBTIPOS = Object.values(SubtipoBien);
// Sin la categoria de nivel 0: la atencion humanitaria recurrente no es una obra.
const CATEGORIAS = (Object.keys(ETIQUETA_CATEGORIA) as CategoriaItem[]).filter(
  (c) => nivelDe(c) > 0,
);

export default async function NuevoBien({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await requerirSesion();
  if (sesion.nivel !== "MUNICIPIO") redirect("/bienes?error=permiso");

  const { error } = await searchParams;

  return (
    <main>
      <p className="discreto">
        <Link href="/bienes">← Caracterizacion</Link>
      </p>
      <h1>Registrar bien afectado</h1>
      <p className="discreto">Se registra a nombre de {sesion.entidadNombre}.</p>

      {error ? (
        <p className="error" role="alert">
          {ERRORES[error] ?? "Revisa los datos."}
        </p>
      ) : null}

      <form action={registrarBien}>
        <label>
          <span>Nombre del bien afectado</span>
          <input name="nombre" required maxLength={200} placeholder="Cultivo de platano, vereda La Union" />
        </label>

        <label>
          <span>Tipo de bien</span>
          <select name="tipoBien" required defaultValue="">
            <option value="" disabled>
              Escoge uno
            </option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_BIEN[t]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Subtipo (solo para agropecuario)</span>
          <select name="subtipoBien" defaultValue="">
            <option value="">No aplica</option>
            {SUBTIPOS.map((s) => (
              <option key={s} value={s}>
                {ETIQUETA_SUBTIPO[s]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Estado de la afectacion (opcional)</span>
          <select name="estadoAfectacion" defaultValue="">
            <option value="">Sin definir</option>
            <optgroup label="Estructuras (vivienda, comercio, estructura publica)">
              {estadosValidosPara("VIVIENDA").map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO[e]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Agropecuario">
              {estadosValidosPara("AGROPECUARIO").map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO[e]}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label>
          <span>Categoria (solo estructura publica)</span>
          <select name="categoria" defaultValue="">
            <option value="">No aplica</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                Nivel {nivelDe(c)} · {ETIQUETA_CATEGORIA[c]}
              </option>
            ))}
          </select>
          <span className="discreto">
            Una estructura publica con categoria entra a la cola de obras (spec 001). Un
            cultivo o un animal se caracteriza, pero no es una obra cofinanciable.
          </span>
        </label>

        <label>
          <span>Descripcion del daño</span>
          <textarea name="descripcionDano" required rows={3} maxLength={1000} />
        </label>

        <fieldset>
          <legend>Ubicacion</legend>
          <p className="discreto">
            La direccion es <strong>reservada</strong>: nunca aparece en el censo publico.
            El corregimiento/vereda (lugar general) y el punto sí son publicos. Si no hay
            coordenada, el bien queda ubicado por su lugar general.
          </p>
          <label>
            <span>Direccion exacta (reservada, opcional)</span>
            <input name="ubicacion" maxLength={200} placeholder="Vereda La Union, finca El Recuerdo" />
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
        </fieldset>

        <label>
          <span>Personas beneficiadas (para obras)</span>
          <input name="personasBeneficiadas" inputMode="numeric" placeholder="800" />
        </label>

        <label>
          <span>Meses fuera de servicio (para obras)</span>
          <input name="mesesFueraDeServicio" inputMode="numeric" placeholder="6" />
        </label>

        <button type="submit">Registrar</button>
      </form>
    </main>
  );
}
