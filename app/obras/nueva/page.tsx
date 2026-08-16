import Link from "next/link";
import { redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { crearItemInventario } from "@/app/actions/obras";
import { ETIQUETA_CATEGORIA, NIVELES, nivelDe } from "@/lib/prioridad";
import type { CategoriaItem } from "@/lib/generated/prisma/enums";

const ERRORES: Record<string, string> = {
  faltan: "Falta el nombre, la ubicacion o la descripcion del daño.",
  categoria: "Escoge una categoria de la lista.",
  numero: "Las personas beneficiadas y los meses deben ser numeros enteros.",
};

// Sin la categoria de nivel 0: la atencion humanitaria recurrente no es una obra y
// se maneja en otra funcionalidad.
const CATEGORIAS = (Object.keys(ETIQUETA_CATEGORIA) as CategoriaItem[]).filter(
  (categoria) => nivelDe(categoria) > 0,
);

export default async function NuevoItem({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await requerirSesion();
  if (sesion.nivel !== "MUNICIPIO") redirect("/obras?error=permiso");

  const { error } = await searchParams;

  return (
    <main>
      <p className="discreto">
        <Link href="/obras">← Inventario</Link>
      </p>
      <h1>Registrar item afectado</h1>
      <p className="discreto">Se registra a nombre de {sesion.entidadNombre}.</p>

      {error ? (
        <p className="error" role="alert">
          {ERRORES[error] ?? "Revisa los datos."}
        </p>
      ) : null}

      <form action={crearItemInventario}>
        <label>
          <span>Nombre del bien afectado</span>
          <input name="nombre" required maxLength={200} placeholder="Teatro Municipal" />
        </label>

        <label>
          <span>Ubicacion</span>
          <input
            name="ubicacion"
            required
            maxLength={200}
            placeholder="Centro, calle 6 con carrera 14"
          />
        </label>

        <label>
          <span>Categoria</span>
          <select name="categoria" required defaultValue="">
            <option value="" disabled>
              Escoge una
            </option>
            {CATEGORIAS.map((categoria) => (
              <option key={categoria} value={categoria}>
                Nivel {nivelDe(categoria)} · {ETIQUETA_CATEGORIA[categoria]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Descripcion del daño</span>
          <textarea name="descripcionDano" required rows={3} maxLength={1000} />
        </label>

        <label>
          <span>Personas beneficiadas</span>
          <input name="personasBeneficiadas" inputMode="numeric" placeholder="800" />
          <span className="discreto">
            Si no lo sabes, dejalo vacio: la obra queda con puntaje incompleto y al final
            de su nivel, pero no desaparece de la lista.
          </span>
        </label>

        <label>
          <span>Meses fuera de servicio</span>
          <input name="mesesFueraDeServicio" inputMode="numeric" placeholder="6" />
        </label>

        <button type="submit">Registrar</button>
      </form>

      <h2>Como se calcula la prioridad</h2>
      <p className="discreto">
        El nivel lo determina la categoria y manda sobre cualquier puntaje. Dentro de un
        nivel, el orden lo da: personas beneficiadas × vulnerabilidad del municipio ×
        tiempo sin servicio.
      </p>
      <div className="tabla-desplazable">
        <table>
          <thead>
            <tr>
              <th>Nivel</th>
              <th>Que entra</th>
              <th>ODS</th>
            </tr>
          </thead>
          <tbody>
            {([1, 2, 3, 4, 5] as const).map((nivel) => (
              <tr key={nivel}>
                <td>{nivel}</td>
                <td>{NIVELES[nivel].titulo}</td>
                <td className="discreto">{NIVELES[nivel].ods.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
