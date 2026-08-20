import { requerirSesion } from "@/lib/auth";
import { Tablero } from "@/app/tablero";
import {
  ETIQUETA_DESTINATARIO,
  ETIQUETA_TIPO,
  ORDEN_TIPO,
  listarOferta,
  separarPorHabilitacion,
} from "@/lib/oferta";
import type { TipoOferta } from "@/lib/generated/prisma/enums";

/**
 * La condicion de cada tipo, en las mismas palabras que usa `lib/elegibilidad.ts`. Se escribe
 * aqui para publicarla: una regla que decide sobre una familia y no se puede leer completa no
 * es una regla, es una caja negra.
 */
const CONDICIONES: [TipoOferta, string][] = [
  [
    "ALOJAMIENTO_TEMPORAL",
    "El inmueble quedo perdido o para demoler, o todavia no se sabe donde vive el hogar.",
  ],
  ["ALIMENTACION_Y_KITS", "Cualquier hogar damnificado caracterizado."],
  ["SALUD", "Hay personas heridas o una necesidad de salud categorizada sin atender."],
  ["INDEMNIZACION", "Hubo personas heridas o fallecidas. Responde a las personas, no al inmueble."],
  [
    "EVALUACION_TECNICA",
    "El inmueble es reparable o su estado no esta definido: falta que un tecnico diga si se puede volver.",
  ],
  ["VIVIENDA", "El inmueble no se puede volver a habitar."],
  ["NIÑEZ_Y_FAMILIA", "Hay niñez en el hogar."],
  [
    "EMPLEO_E_INGRESOS",
    "El bien afectado era agropecuario o de comercio: con el se perdio el ingreso.",
  ],
  ["SERVICIOS_PUBLICOS", "Cualquier hogar damnificado caracterizado."],
  ["ALIVIO_FINANCIERO", "Cualquier hogar damnificado caracterizado."],
  ["ALIVIO_TRIBUTARIO", "Cualquier hogar damnificado caracterizado."],
];

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

        <section className="panel" id="regla">
          <h2>Como se decide que le corresponde a un hogar</h2>
          <p className="discreto">
            La regla es publica y se puede recalcular a mano, igual que la de prioridad de obras. Un
            hogar ya caracterizado <strong>no vuelve a registrarse</strong> para postular: lo que se
            mira es lo que su municipio ya capturó. La regla{" "}
            <strong>sugiere con argumento, no decide</strong>: un funcionario puede asignar una
            ayuda que la regla no marcó, y esa decision queda en la auditoria junto con lo que la
            regla decia.
          </p>

          <h3>Cuatro compuertas, para toda la oferta</h3>
          <ol className="discreto">
            <li>
              <strong>La ayuda esta vigente.</strong> Lo anunciado sin reglamentar no se tramita:
              mandaria a la familia a una fila que no existe.
            </li>
            <li>
              <strong>Va dirigida a hogares o personas.</strong> Lo de empresas y entidades
              territoriales no se le asigna a una familia.
            </li>
            <li>
              <strong>No la ha recibido ya.</strong> No se cuenta dos veces lo mismo.
            </li>
            <li>
              <strong>El registro municipal cuenta como registro.</strong> Estar caracterizado por
              el municipio es lo que habilita a postular.
            </li>
          </ol>

          <h3>Y una condicion propia de cada tipo de ayuda</h3>
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr>
                  <th>Tipo de ayuda</th>
                  <th>Le corresponde cuando…</th>
                </tr>
              </thead>
              <tbody>
                {CONDICIONES.map(([tipo, condicion]) => (
                  <tr key={tipo}>
                    <td>{ETIQUETA_TIPO[tipo]}</td>
                    <td className="discreto">{condicion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="discreto">
            Lo que esta regla <strong>no</strong> hace: decidir montos, sustituir la certificacion
            de otra entidad, ni inscribir a nadie en el registro nacional. Dice a que puerta tocar;
            no abre la puerta.
          </p>
        </section>

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
