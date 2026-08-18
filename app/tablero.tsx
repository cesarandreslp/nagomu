import type { ReactNode } from "react";
import { Encabezado } from "@/app/encabezado";
import { Navegacion } from "@/app/navegacion";
import type { NivelTerritorial } from "@/lib/generated/prisma/enums";

/**
 * Marco de las vistas operativas (spec 004 US3): encabezado y barra lateral a la izquierda,
 * el contenido de la pagina a la derecha. Cada pagina lo envuelve pasando su seccion activa.
 */
export function Tablero({
  nombre,
  nivel,
  activo,
  children,
}: {
  nombre: string;
  nivel: NivelTerritorial;
  activo: string;
  children: ReactNode;
}) {
  return (
    <div className="tablero">
      <Navegacion nivel={nivel} activo={activo} />
      <div className="tablero-contenido">
        <Encabezado nombre={nombre} nivel={nivel} />
        {children}
      </div>
    </div>
  );
}
