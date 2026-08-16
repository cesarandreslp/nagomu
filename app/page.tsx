import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { salir } from "@/app/actions/sesion";

export default async function Inicio() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  return (
    <>
      <header>
        <div>
          <strong>nagomu</strong>{" "}
          <span className="discreto">
            {sesion.entidadNombre} - {sesion.nivel.toLowerCase()}
          </span>
        </div>
        <form action={salir}>
          <button type="submit">Salir</button>
        </form>
      </header>

      <main>
        <h1>Hola, {sesion.nombre}</h1>
        <p>
          El inventario priorizado de obras llega en la siguiente entrega. Por ahora esto
          confirma que la sesion, los permisos y la auditoria funcionan.
        </p>
      </main>
    </>
  );
}
