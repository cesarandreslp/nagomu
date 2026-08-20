import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { obtenerCuenta } from "@/lib/auth";
import { resumenImpacto, type Scope } from "@/lib/impacto";
import { formatearPesos } from "@/lib/dinero";

/**
 * Raiz publica. Un visitante sin sesion ve la landing institucional; quien ya entro va a su
 * espacio. La landing y su buscador son server-rendered y funcionan sin JavaScript (Principio
 * III). Todas las cifras son agregados: ningun dato personal (Principio IV).
 */
export default async function Inicio({
  searchParams,
}: {
  searchParams: Promise<{ departamento?: string; municipio?: string }>;
}) {
  const cuenta = await obtenerCuenta();
  if (cuenta?.tipo === "VOLUNTARIADO") redirect("/voluntariado");
  if (cuenta?.tipo === "FUNCIONARIO") {
    // Un municipio entra a su situacion —la atencion del siniestro—, no al inventario de
    // obras, que es la portada de la reconstruccion y viene despues (spec 009).
    redirect(cuenta.sesion.nivel === "MUNICIPIO" ? "/municipio" : "/departamento");
  }

  const { departamento, municipio } = await searchParams;

  const [departamentos, municipios] = await Promise.all([
    prisma.entidadTerritorial.findMany({
      where: { nivel: "DEPARTAMENTO" },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.entidadTerritorial.findMany({
      where: { nivel: "MUNICIPIO" },
      select: { id: true, nombre: true, departamento: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
    }),
  ]);

  // El territorio mas especifico y valido gana; un id inexistente cae al nivel superior.
  const muni = municipios.find((m) => m.id === municipio);
  const depto = departamentos.find((d) => d.id === departamento);
  const scope: Scope = muni
    ? { alcance: "MUNICIPIO", municipioId: muni.id }
    : depto
      ? { alcance: "DEPARTAMENTO", departamentoId: depto.id }
      : { alcance: "NACION" };
  const etiquetaScope = muni ? muni.nombre : depto ? depto.nombre : "Nacional";

  const impacto = await resumenImpacto(scope, new Date());

  return (
    <div className="landing">
      <nav className="landing-nav">
        <strong>nagomu</strong>
        <Link href="/login" className="boton-nav">
          Ingresar a la Plataforma
        </Link>
      </nav>

      <section className="hero">
        <h1>Monitoreo tecnico de la reconstruccion nacional</h1>
        <p>
          Fiscalizacion abierta de los recursos de reconstruccion entre la nacion, las gobernaciones
          y los municipios. Consulta el avance por territorio.
        </p>

        {/* Buscador territorial: formulario GET. Funciona sin JavaScript (Principio III). */}
        <form method="GET" action="/" className="buscador">
          <label>
            <span>Departamento</span>
            <select name="departamento" defaultValue={depto?.id ?? ""}>
              <option value="">Todos</option>
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Municipio</span>
            <select name="municipio" defaultValue={muni?.id ?? ""}>
              <option value="">Todos</option>
              {municipios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.departamento?.nombre ?? "—"})
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Consultar</button>
        </form>
      </section>

      <section className="tarjetas" aria-label={`Resumen de impacto: ${etiquetaScope}`}>
        <p className="discreto">Resumen de impacto · {etiquetaScope}</p>
        <div className="tarjetas-fila">
          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Fondos asignados</span>
            <strong className="tarjeta-cifra">{formatearPesos(impacto.fondosAsignados)}</strong>
            <span className="discreto">Aportes comprometidos a las obras del territorio</span>
          </article>

          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Ejecucion general</span>
            <strong className="tarjeta-cifra">{impacto.porcentajeEjecucion}%</strong>
            <div
              className="barra-progreso"
              role="img"
              aria-label={`${impacto.porcentajeEjecucion}% de obras entregadas`}
            >
              <div style={{ width: `${impacto.porcentajeEjecucion}%` }} />
            </div>
            <span className="discreto">
              {impacto.obrasEntregadas} de {impacto.obrasTotal} obras entregadas
            </span>
          </article>

          <article className="tarjeta-impacto">
            <span className="tarjeta-titulo">Alertas de retraso</span>
            <strong className="tarjeta-cifra tarjeta-alerta">{impacto.alertas}</strong>
            <span className="discreto">Obras sin financiacion o capacidad fiscal vencida</span>
          </article>
        </div>

        <p style={{ marginTop: "1.5rem" }}>
          <Link
            href={`/censo${muni ? `?municipio=${muni.id}` : depto ? `?departamento=${depto.id}` : ""}`}
          >
            Ver el censo publico de afectaciones →
          </Link>{" "}
          <span className="discreto">
            Cuantos bienes resultaron afectados y a que sector le toca responder. Sin direcciones y
            sin personas.
          </span>
        </p>
      </section>

      <footer className="landing-footer">
        <div>
          <strong>nagomu</strong>
          <p className="footer-legal">
            Datos abiertos de reconstruccion. Las cifras son agregadas; no se publican datos
            personales de personas afectadas.
          </p>
        </div>
        <ul>
          <li>
            <Link href="/censo">Censo publico de afectaciones</Link>
          </li>
          <li>
            <Link href="/login">Ingresar a la Plataforma</Link>
          </li>
          <li>
            <a href="mailto:denuncias@nagomu.test">Canal de denuncia</a>
          </li>
        </ul>
      </footer>
    </div>
  );
}
