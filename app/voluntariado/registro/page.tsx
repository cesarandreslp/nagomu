import Link from "next/link";
import { prisma } from "@/lib/db";
import { registrarVoluntariado } from "@/app/actions/voluntariados";

const ERRORES: Record<string, string> = {
  faltan: "Faltan datos: nombre, correo, contrasena, contacto y municipio son obligatorios.",
  contrasena: "La contrasena debe tener al menos 8 caracteres.",
  coordenada:
    "La coordenada necesita latitud y longitud, las dos, dentro de rango (lat -90 a 90, lon -180 a 180).",
  municipio: "Escoge un municipio de operacion de la lista.",
  registro: "No fue posible registrar la organizacion. Revisa los datos e intenta de nuevo.",
};

export default async function RegistroVoluntariado({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const municipios = await prisma.entidadTerritorial.findMany({
    where: { nivel: "MUNICIPIO" },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <main>
      <p className="discreto">
        <Link href="/login">← Entrar</Link>
      </p>
      <h1>Registrar organizacion voluntaria</h1>
      <p className="discreto">
        Crea la cuenta de tu organizacion. Quedaras <strong>no verificado</strong> hasta que el
        municipio donde operas confirme tu registro; solo entonces apareces en el mapa oficial.
        No pedimos datos de personas: solo los de la organizacion.
      </p>

      {error ? (
        <p className="error" role="alert">
          {ERRORES[error] ?? "Revisa los datos."}
        </p>
      ) : null}

      {/* Formulario HTML normal: funciona con JavaScript desactivado (Principio III). */}
      <form action={registrarVoluntariado}>
        <label>
          <span>Nombre de la organizacion</span>
          <input name="nombre" required maxLength={200} placeholder="Brigada La Habana" />
        </label>

        <label>
          <span>Correo (para la cuenta)</span>
          <input type="email" name="correo" autoComplete="username" required />
        </label>

        <label>
          <span>Contrasena</span>
          <input
            type="password"
            name="contrasena"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>

        <label>
          <span>Dato de contacto</span>
          <input name="contacto" required maxLength={200} placeholder="Telefono o correo publico" />
        </label>

        <label>
          <span>Municipio donde operas</span>
          <select name="municipioOperacionId" required defaultValue="">
            <option value="" disabled>
              Escoge uno
            </option>
            {municipios.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
          <span className="discreto">Es quien podra verificar tu organizacion.</span>
        </label>

        <fieldset>
          <legend>Ubicacion de tu sede (opcional)</legend>
          <p className="discreto">
            La ubicacion de tu organizacion, no de una persona. Escribe la direccion si la
            tienes a mano; las coordenadas son lo que te dibuja en el mapa, pero si no las
            conoces, con la direccion basta para que el municipio te ubique.
          </p>
          <label>
            <span>Direccion fisica</span>
            <input
              name="direccion"
              maxLength={200}
              placeholder="Calle 6 # 14-20, barrio El Centro"
            />
          </label>
          <label>
            <span>Latitud</span>
            <input name="latitud" inputMode="decimal" placeholder="3.9006" />
          </label>
          <label>
            <span>Longitud</span>
            <input name="longitud" inputMode="decimal" placeholder="-76.2978" />
          </label>
        </fieldset>

        <button type="submit">Crear cuenta</button>
      </form>
    </main>
  );
}
