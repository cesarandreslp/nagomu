import { prisma } from "@/lib/db";
import { requerirVoluntario } from "@/lib/auth";
import { actualizarVoluntariado } from "@/app/actions/voluntariados";
import { Encabezado } from "@/app/encabezado";
import type { EstadoVerificacion } from "@/lib/generated/prisma/enums";

const ERRORES: Record<string, string> = {
  faltan: "El dato de contacto es obligatorio.",
  coordenada:
    "La coordenada necesita latitud y longitud, las dos, dentro de rango (lat -90 a 90, lon -180 a 180).",
};

const ESTADO: Record<EstadoVerificacion, { etiqueta: string; nota: string; clase: string }> = {
  PENDIENTE: {
    etiqueta: "No verificado",
    nota: "Tu municipio de operacion aun no confirma tu registro. Hasta entonces no apareces en el mapa oficial.",
    clase: "error",
  },
  VERIFICADO: {
    etiqueta: "Verificado",
    nota: "Tu municipio confirmo tu registro. Si tienes coordenada, apareces en el mapa.",
    clase: "discreto",
  },
  RECHAZADO: {
    etiqueta: "Rechazado",
    nota: "Tu municipio no confirmo el registro. Contactalo para saber por que.",
    clase: "error",
  },
};

export default async function EspacioVoluntario({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await requerirVoluntario();
  const { error } = await searchParams;

  const actor = await prisma.actor.findUniqueOrThrow({
    where: { id: sesion.actorId },
    select: {
      nombre: true,
      contacto: true,
      direccion: true,
      latitud: true,
      longitud: true,
      estadoVerificacion: true,
      municipioOperacion: { select: { nombre: true } },
    },
  });

  const estado = ESTADO[actor.estadoVerificacion];

  return (
    <>
      <Encabezado nombre={actor.nombre} nivel="VOLUNTARIADO" />

      <main>
        <h1>Tu organizacion</h1>

        <p className={estado.clase} role={estado.clase === "error" ? "alert" : undefined}>
          <strong>{estado.etiqueta}.</strong> {estado.nota}
        </p>

        <p className="discreto">
          Municipio de operacion: {actor.municipioOperacion?.nombre ?? "—"}. El nombre y el
          municipio no se editan aqui: cambian la identidad que el municipio evalua.
        </p>

        {error ? (
          <p className="error" role="alert">
            {ERRORES[error] ?? "Revisa los datos."}
          </p>
        ) : null}

        <form action={actualizarVoluntariado}>
          <label>
            <span>Dato de contacto</span>
            <input
              name="contacto"
              required
              maxLength={200}
              defaultValue={actor.contacto ?? ""}
            />
          </label>

          <fieldset>
            <legend>Ubicacion de tu sede (opcional)</legend>
            <p className="discreto">
              La ubicacion de tu organizacion, no de una persona. La direccion ayuda al
              municipio a ubicarte; las coordenadas son lo que te dibuja en el mapa.
            </p>
            <label>
              <span>Direccion fisica</span>
              <input
                name="direccion"
                maxLength={200}
                defaultValue={actor.direccion ?? ""}
                placeholder="Calle 6 # 14-20, barrio El Centro"
              />
            </label>
            <label>
              <span>Latitud</span>
              <input
                name="latitud"
                inputMode="decimal"
                placeholder="3.9006"
                defaultValue={actor.latitud ?? ""}
              />
            </label>
            <label>
              <span>Longitud</span>
              <input
                name="longitud"
                inputMode="decimal"
                placeholder="-76.2978"
                defaultValue={actor.longitud ?? ""}
              />
            </label>
          </fieldset>

          <button type="submit">Guardar</button>
        </form>
      </main>
    </>
  );
}
