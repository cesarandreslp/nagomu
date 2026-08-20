import { requerirSesion } from "@/lib/auth";
import { Tablero } from "@/app/tablero";
import {
  ETIQUETA_DESTINATARIO,
  ETIQUETA_TIPO,
  ORDEN_TIPO,
  listarOferta,
  separarPorHabilitacion,
} from "@/lib/oferta";

export default async function Oferta() {
  const sesion = await requerirSesion();
  const { habilitadas, noHabilitadas } = separarPorHabilitacion(await listarOferta());
  const conRud = habilitadas.filter((o) => o.requiereRud);

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="oferta">
      <main>
        <div className="cabecera-pagina">
          <div>
            <h1>Oferta institucional para damnificados</h1>
            <p className="discreto">
              Que ofrece cada entidad, quien lo certifica y que se necesita para acceder. Solo
              aparece aqui arriba lo que <strong>ya se puede tramitar hoy</strong>.
            </p>
          </div>
        </div>

        <div className="panel">
          <h2>Todo empieza en el mismo sitio</h2>
          <p>
            <strong>
              {conRud.length} de estas ayudas exigen estar inscrito en el Registro Unico de
              Damnificados.
            </strong>{" "}
            Si un hogar no esta en el RUD, no accede aunque tenga derecho. El censo lo elaboran las
            alcaldias con la UNGRD, las gobernaciones y el Ministerio de Vivienda, y es gratuito:
            nadie debe cobrar por inscribir a nadie.
          </p>
        </div>

        {ORDEN_TIPO.map((tipo) => {
          const delTipo = habilitadas.filter((o) => o.tipo === tipo);
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        {noHabilitadas.length > 0 ? (
          <section>
            <hr />
            <h2>Anunciadas, todavia no disponibles</h2>
            <p className="error">
              Estas {noHabilitadas.length} medidas se anunciaron pero aun no estan reglamentadas.{" "}
              <strong>No las ofrezcas ni las tramites.</strong> Se registran aqui para saber que
              vienen y poder preguntar por ellas, no para remitir a nadie.
            </p>
            <div className="tabla-desplazable">
              <table>
                <thead>
                  <tr>
                    <th>Medida</th>
                    <th>Entidad</th>
                    <th>Falta</th>
                  </tr>
                </thead>
                <tbody>
                  {noHabilitadas.map((o) => (
                    <tr key={o.id}>
                      <td>
                        {o.nombre}
                        <div className="discreto">{o.descripcion}</div>
                      </td>
                      <td className="discreto">{o.entidad}</td>
                      <td className="discreto">{o.requisito}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <h2>Lo que este catalogo todavia no hace</h2>
        <p className="discreto">
          Esta lista dice que existe. No dice si a una familia concreta le llego. Hacer seguimiento
          hogar por hogar —quien esta en el RUD, quien recibio el kit, a quien le certificaron la
          indemnizacion, quien sigue esperando— es la siguiente funcionalidad, y es donde nagomu
          deja de ser un directorio y empieza a servir de verdad.
        </p>
        <p className="discreto">
          Datos verificados el 16 de agosto de 2026. Fuentes en{" "}
          <code>specs/001-cofinanciacion-obras/instituciones-y-fondos.md</code>. Las medidas de la
          emergencia cambian rapido: verificar antes de usarlas con un ciudadano al frente.
        </p>
      </main>
    </Tablero>
  );
}
