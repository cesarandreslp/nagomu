import Link from "next/link";

export const metadata = { title: "Sin conexion · nagomu" };

/**
 * Lo que se muestra cuando se abre una vista que no esta guardada en el dispositivo
 * (spec 008). No es una pagina de error: es el mapa de lo que si se puede hacer sin señal.
 */
export default function SinConexion() {
  return (
    <main className="pagina">
      <div className="panel">
        <h1>Sin conexion</h1>
        <p className="discreto">
          Esta vista necesita red para consultarse. Lo que si funciona sin señal es la captura: lo
          que registres queda guardado en este dispositivo y se envia solo cuando vuelva la
          conexion.
        </p>

        <div className="acciones">
          <Link href="/bienes/nuevo" className="boton">
            Registrar un bien afectado
          </Link>
          <Link href="/damnificados/nuevo" className="boton boton-secundario">
            Registrar un hogar damnificado
          </Link>
        </div>

        <p className="discreto" style={{ marginTop: "1.5rem" }}>
          Si ya volvio la señal, <Link href="/obras">vuelve al inventario</Link>. Los registros
          pendientes se envian en cuanto el telefono recupere datos: no hace falta hacer nada.
        </p>
      </div>
    </main>
  );
}
