import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import {
  ETIQUETA_DESTINATARIO,
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  ORDEN_TIPO,
  listarOferta,
} from "@/lib/oferta";

export default async function Oferta() {
  await requerirSesion();
  const oferta = await listarOferta();

  const conRud = oferta.filter((o) => o.requiereRud);
  const anunciadas = oferta.filter((o) => o.estado === "ANUNCIADO");

  return (
    <main>
      <p className="discreto">
        <Link href="/obras">← Inventario</Link> · <Link href="/fondos">Fondos</Link>
      </p>

      <h1>Oferta institucional para damnificados</h1>
      <p>
        Que ofrece cada entidad, quien lo certifica y que se necesita para acceder. Son{" "}
        {oferta.length} ayudas repartidas entre ministerios, entidades adscritas, organismos
        de socorro y el sector financiero.
      </p>

      <h2>Todo empieza en el mismo sitio</h2>
      <p>
        <strong>{conRud.length} de estas ayudas exigen estar inscrito en el Registro Unico
        de Damnificados.</strong>{" "}
        Si un hogar no esta en el RUD, no accede aunque tenga derecho. El censo lo elaboran
        las alcaldias con la UNGRD, las gobernaciones y el Ministerio de Vivienda, y es
        gratuito: nadie debe cobrar por inscribir a nadie.
      </p>

      {anunciadas.length > 0 ? (
        <p className="error">
          {anunciadas.length} medidas estan <strong>anunciadas pero sin reglamentar</strong>.
          Se muestran para saber que vienen, no para mandar a nadie a hacer una fila que
          todavia no existe.
        </p>
      ) : null}

      {ORDEN_TIPO.map((tipo) => {
        const delTipo = oferta.filter((o) => o.tipo === tipo);
        if (delTipo.length === 0) return null;

        return (
          <section key={tipo}>
            <h2>{ETIQUETA_TIPO[tipo]}</h2>
            <div className="tabla-desplazable">
              <table>
                <thead>
                  <tr>
                    <th>Ayuda</th>
                    <th>Para quien</th>
                    <th>Requisito</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {delTipo.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.nombre}</strong>
                        <div className="discreto">{o.entidad}</div>
                        <div className="discreto">{o.descripcion}</div>
                        {o.monto ? <div className="discreto">Monto: {o.monto}</div> : null}
                        {o.canal ? <div className="discreto">Canal: {o.canal}</div> : null}
                      </td>
                      <td className="discreto">{ETIQUETA_DESTINATARIO[o.destinatario]}</td>
                      <td className="discreto">
                        {o.requisito}
                        {o.requiereRud ? (
                          <div>
                            <strong>Exige RUD.</strong>
                          </div>
                        ) : null}
                        {o.certificaEntidad ? <div>Certifica: {o.certificaEntidad}</div> : null}
                      </td>
                      <td className="discreto">{ETIQUETA_ESTADO[o.estado]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <h2>Lo que este catalogo todavia no hace</h2>
      <p className="discreto">
        Esta lista dice que existe. No dice si a una familia concreta le llego. Hacer
        seguimiento hogar por hogar —quien esta en el RUD, quien recibio el kit, a quien le
        certificaron la indemnizacion, quien sigue esperando— es la siguiente funcionalidad,
        y es donde nagomu deja de ser un directorio y empieza a servir de verdad.
      </p>
      <p className="discreto">
        Datos verificados el 16 de agosto de 2026. Fuentes en{" "}
        <code>specs/001-cofinanciacion-obras/instituciones-y-fondos.md</code>. Las medidas de
        la emergencia cambian rapido: verificar antes de usarlas con un ciudadano al frente.
      </p>
    </main>
  );
}
