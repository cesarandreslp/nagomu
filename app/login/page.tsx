import Link from "next/link";
import { redirect } from "next/navigation";
import { iniciarSesion } from "@/app/actions/sesion";
import { obtenerCuenta } from "@/lib/auth";

const MENSAJES: Record<string, string> = {
  credenciales: "Correo o contrasena incorrectos.",
  faltan: "Escribe el correo y la contrasena.",
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cuenta = await obtenerCuenta();
  if (cuenta) redirect(cuenta.tipo === "VOLUNTARIADO" ? "/voluntariado" : "/");

  const { error } = await searchParams;
  const mensaje = error ? (MENSAJES[error] ?? "No fue posible entrar.") : null;

  return (
    <div className="login-fondo">
      <main className="tarjeta-login">
        <h1>nagomu</h1>
        <p className="discreto">
          Cofinanciacion priorizada de obras de reconstruccion entre municipio, gobernacion y
          nacion.
        </p>

        {mensaje ? (
          <p className="error" role="alert">
            {mensaje}
          </p>
        ) : null}

        {/* Formulario HTML normal: funciona con JavaScript desactivado. */}
        <form action={iniciarSesion}>
          <label>
            <span>Correo</span>
            <input type="email" name="correo" autoComplete="username" required />
          </label>
          <label>
            <span>Contrasena</span>
            <input type="password" name="contrasena" autoComplete="current-password" required />
          </label>
          <button type="submit">Entrar</button>
        </form>

        <p className="discreto">
          ¿Eres un voluntariado? <Link href="/voluntariado/registro">Registra tu organizacion</Link>
          .
        </p>
      </main>
    </div>
  );
}
