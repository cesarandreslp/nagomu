import Link from "next/link";
import type { NivelTerritorial } from "@/lib/generated/prisma/enums";

/**
 * Barra lateral de navegacion (spec 004 US3). Es una lista de enlaces server-side: funciona
 * sin JavaScript (Principio III). La seccion activa la pasa cada pagina como prop —no se usa
 * `usePathname`— para que el resaltado se resuelva en el servidor sin volver esto un componente
 * de cliente. El ambito filtra que secciones se ofrecen (Principio II).
 *
 * Los iconos son trazos SVG en linea: no hay libreria de iconos ni peticiones extra. En
 * pantalla angosta se ocultan por CSS y queda solo la etiqueta.
 */

const TODOS: NivelTerritorial[] = ["MUNICIPIO", "DEPARTAMENTO", "NACION"];

/** Trazos de 24x24, `stroke="currentColor"`: heredan el color del enlace. */
const ICONOS: Record<string, string> = {
  obras: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6",
  bienes: "M3 7h18M3 12h18M3 17h10M17 17l2 2 4-4",
  departamento: "M3 3v18h18M7 15l4-4 3 3 5-6",
  mapa: "M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15M15 6v15",
  fondos: "M12 3v18M8 7h6a3 3 0 0 1 0 6H8m0 0h7",
  oferta:
    "M20 7H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  capacidad: "M3 20h18M6 16v-5M11 16V7M16 16v-8M21 16v-3",
  voluntariados:
    "M17 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 8v6M22 11h-6",
  damnificados:
    "M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1z",
};

function Icono({ id }: { id: string }) {
  const trazo = ICONOS[id];
  if (!trazo) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={trazo} />
    </svg>
  );
}

type Item = { id: string; href: string; etiqueta: string; niveles: NivelTerritorial[] };

const ITEMS: Item[] = [
  { id: "obras", href: "/obras", etiqueta: "Inventario", niveles: TODOS },
  // Solo municipio: el detalle con direccion es reservado; el publico ve el censo.
  { id: "bienes", href: "/bienes", etiqueta: "Caracterizacion", niveles: ["MUNICIPIO"] },
  {
    id: "departamento",
    href: "/departamento",
    etiqueta: "Consolidado",
    niveles: ["DEPARTAMENTO", "NACION"],
  },
  { id: "mapa", href: "/mapa", etiqueta: "Mapa", niveles: TODOS },
  { id: "fondos", href: "/fondos", etiqueta: "Fuentes de financiacion", niveles: TODOS },
  { id: "oferta", href: "/oferta", etiqueta: "Oferta institucional", niveles: TODOS },
  {
    id: "capacidad",
    href: "/municipio/capacidad",
    etiqueta: "Capacidad fiscal",
    niveles: ["MUNICIPIO"],
  },
  {
    id: "voluntariados",
    href: "/voluntariados",
    etiqueta: "Voluntariados",
    niveles: ["MUNICIPIO"],
  },
  // Solo municipio: el detalle de damnificados no sube de nivel, hacia arriba van agregados.
  { id: "damnificados", href: "/damnificados", etiqueta: "Damnificados", niveles: ["MUNICIPIO"] },
];

export function Navegacion({ nivel, activo }: { nivel: NivelTerritorial; activo: string }) {
  const items = ITEMS.filter((i) => i.niveles.includes(nivel));

  return (
    <nav className="barra-lateral" aria-label="Secciones">
      <Link href="/obras" className="marca">
        nagomu <span>{nivel.toLowerCase()}</span>
      </Link>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <Link
              href={i.href}
              className={i.id === activo ? "activo" : undefined}
              aria-current={i.id === activo ? "page" : undefined}
            >
              <Icono id={i.id} />
              {i.etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
