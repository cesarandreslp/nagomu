import { redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { voluntariadosDelMunicipio } from "@/lib/voluntariados";
import {
  verificarVoluntariado,
  rechazarVoluntariado,
  revocarVoluntariado,
} from "@/app/actions/voluntariados";
import { Tablero } from "@/app/tablero";
import type { EstadoVerificacion, ResultadoVerificacionVoluntariado } from "@/lib/generated/prisma/enums";

const ERRORES: Record<string, string> = {
  permiso: "Solo el municipio de operacion decide sobre ese voluntariado.",
  motivo: "Rechazar o revocar exige un motivo.",
  transicion: "Esa decision no es valida para el estado actual del voluntariado.",
  noexiste: "Ese voluntariado no existe.",
};

const ETIQUETA_ESTADO: Record<EstadoVerificacion, string> = {
  PENDIENTE: "Pendiente",
  VERIFICADO: "Verificado",
  RECHAZADO: "Rechazado",
};

const ETIQUETA_RESULTADO: Record<ResultadoVerificacionVoluntariado, string> = {
  VERIFICADO: "Verificado",
  RECHAZADO: "Rechazado",
  REVOCADO: "Revocado",
};

function fecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function Voluntariados({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await requerirSesion();
  if (sesion.nivel !== "MUNICIPIO") redirect("/obras?error=permiso");

  const { error } = await searchParams;
  const voluntariados = await voluntariadosDelMunicipio(sesion);

  return (
    <Tablero nombre={sesion.entidadNombre} nivel={sesion.nivel} activo="voluntariados">
      <main>
        <h1>Voluntariados de tu municipio</h1>
        <p className="discreto">
          Organizaciones que declararon operar en {sesion.entidadNombre}. Un voluntariado no
          aparece como oficial ni en el mapa hasta que lo verificas. Rechazar y revocar exigen
          un motivo, y toda decision queda registrada.
        </p>

        {error ? (
          <p className="error" role="alert">
            {ERRORES[error] ?? "No fue posible completar la accion."}
          </p>
        ) : null}

        {voluntariados.length === 0 ? (
          <p>Todavia ningun voluntariado declaro operar en tu municipio.</p>
        ) : (
          voluntariados.map((v) => (
            <section key={v.id} className="tarjeta">
              <h2>
                {v.nombre}{" "}
                <span className="discreto">· {ETIQUETA_ESTADO[v.estadoVerificacion]}</span>
              </h2>
              <p className="discreto">
                Contacto: {v.contacto ?? "—"}
                {v.direccion ? ` · ${v.direccion}` : ""}
                {v.latitud !== null && v.longitud !== null
                  ? ` · ${v.latitud.toFixed(5)}, ${v.longitud.toFixed(5)} (en el mapa si esta verificado)`
                  : " · sin coordenada (no se dibuja en el mapa)"}
              </p>

              {/* Acciones segun el estado. Formularios normales: funcionan sin JavaScript. */}
              <div className="acciones">
                {v.estadoVerificacion === "PENDIENTE" ? (
                  <>
                    <form action={verificarVoluntariado}>
                      <input type="hidden" name="actorId" value={v.id} />
                      <button type="submit">Verificar</button>
                    </form>
                    <form action={rechazarVoluntariado}>
                      <input type="hidden" name="actorId" value={v.id} />
                      <input name="motivo" required placeholder="Motivo del rechazo" maxLength={300} />
                      <button type="submit">Rechazar</button>
                    </form>
                  </>
                ) : null}

                {v.estadoVerificacion === "VERIFICADO" ? (
                  <form action={revocarVoluntariado}>
                    <input type="hidden" name="actorId" value={v.id} />
                    <input name="motivo" required placeholder="Motivo de la revocacion" maxLength={300} />
                    <button type="submit">Revocar verificacion</button>
                  </form>
                ) : null}

                {v.estadoVerificacion === "RECHAZADO" ? (
                  <form action={verificarVoluntariado}>
                    <input type="hidden" name="actorId" value={v.id} />
                    <button type="submit">Reconsiderar y verificar</button>
                  </form>
                ) : null}
              </div>

              {v.verificaciones.length > 0 ? (
                <details>
                  <summary className="discreto">Historial ({v.verificaciones.length})</summary>
                  <ul>
                    {v.verificaciones.map((h, i) => (
                      <li key={i} className="discreto">
                        {fecha(h.creadoEn)} · {ETIQUETA_RESULTADO[h.resultado]} · {h.funcionario.nombre}
                        {h.motivo ? ` — ${h.motivo}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </section>
          ))
        )}
      </main>
    </Tablero>
  );
}
