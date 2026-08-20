import Link from "next/link";
import type { NivelTerritorial } from "@/lib/generated/prisma/enums";

/**
 * Barra lateral de navegacion (spec 004 US3). Es una lista de enlaces server-side: funciona
 * sin JavaScript (Principio III). La seccion activa la pasa cada pagina como prop —no se usa
 * `usePathname`— para que el resaltado se resuelva en el servidor sin volver esto un componente
 * de cliente. El ambito filtra que secciones se ofrecen (Principio II).
 */

const TODOS: NivelTerritorial[] = ["MUNICIPIO", "DEPARTAMENTO", "NACION"];

type Item = { id: string; href: string; etiqueta: string; niveles: NivelTerritorial[] };

const ITEMS: Item[] = [
  { id: "obras", href: "/obras", etiqueta: "Inventario", niveles: TODOS },
  // Solo municipio: el detalle con direccion es reservado; el publico ve el censo.
  { id: "bienes", href: "/bienes", etiqueta: "Caracterizacion", niveles: ["MUNICIPIO"] },
  { id: "departamento", href: "/departamento", etiqueta: "Consolidado", niveles: ["DEPARTAMENTO", "NACION"] },
  { id: "mapa", href: "/mapa", etiqueta: "Mapa", niveles: TODOS },
  { id: "fondos", href: "/fondos", etiqueta: "Fuentes de financiacion", niveles: TODOS },
  { id: "oferta", href: "/oferta", etiqueta: "Oferta institucional", niveles: TODOS },
  { id: "capacidad", href: "/municipio/capacidad", etiqueta: "Capacidad fiscal", niveles: ["MUNICIPIO"] },
  { id: "voluntariados", href: "/voluntariados", etiqueta: "Voluntariados", niveles: ["MUNICIPIO"] },
  // Solo municipio: el detalle de damnificados no sube de nivel, hacia arriba van agregados.
  { id: "damnificados", href: "/damnificados", etiqueta: "Damnificados", niveles: ["MUNICIPIO"] },
];

export function Navegacion({ nivel, activo }: { nivel: NivelTerritorial; activo: string }) {
  const items = ITEMS.filter((i) => i.niveles.includes(nivel));

  return (
    <nav className="barra-lateral" aria-label="Secciones">
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <Link
              href={i.href}
              className={i.id === activo ? "activo" : undefined}
              aria-current={i.id === activo ? "page" : undefined}
            >
              {i.etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
