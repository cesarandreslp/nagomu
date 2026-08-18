import { salir } from "@/app/actions/sesion";
import type { NivelTerritorial } from "@/lib/generated/prisma/enums";

/**
 * Encabezado comun de las vistas autenticadas: logo, identidad con su nivel territorial
 * (punto de color segun la gradacion, spec 004) y el boton de salir. Antes estaba copiado en
 * cada pagina; vive aqui una sola vez.
 */

const ETIQUETA: Record<NivelTerritorial, string> = {
  NACION: "nacion",
  DEPARTAMENTO: "departamento",
  MUNICIPIO: "municipio",
};

export function Encabezado({
  nombre,
  nivel,
}: {
  nombre: string;
  /** El nivel territorial del funcionario, o "VOLUNTARIADO" para una cuenta sin ambito. */
  nivel: NivelTerritorial | "VOLUNTARIADO";
}) {
  const esVoluntariado = nivel === "VOLUNTARIADO";

  return (
    <header>
      <div>
        <strong>nagomu</strong>{" "}
        <span className="discreto">
          {esVoluntariado ? null : (
            <span className={`nivel nivel-${nivel}`} aria-hidden="true" />
          )}
          {nombre} · {esVoluntariado ? "voluntariado" : ETIQUETA[nivel]}
        </span>
      </div>
      <form action={salir}>
        <button type="submit">Salir</button>
      </form>
    </header>
  );
}
