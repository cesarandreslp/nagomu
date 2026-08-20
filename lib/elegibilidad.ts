import type { DestinatarioOferta, EstadoOferta, TipoOferta } from "@/lib/generated/prisma/enums";
import type { EstadoAfectacion, Sector } from "@/lib/generated/prisma/enums";
import { estaHabilitada, ETIQUETA_TIPO } from "@/lib/oferta";

/**
 * Elegibilidad de un hogar para la oferta institucional (spec 009).
 *
 * **Una caracterizacion, toda la oferta**: un hogar que ya fue caracterizado por su
 * municipio no deberia volver a registrarse en cada secretaria para recibir cada ayuda. Lo
 * que falta para eso no es un formulario mas: es una regla que diga, con lo ya capturado,
 * que le corresponde.
 *
 * La regla es **publica y auditable**, como la de prioridad (`lib/prioridad.ts`), y por las
 * mismas razones:
 *
 * - **Funcion pura, sin base de datos.** Se recalcula a mano con los mismos datos.
 * - **Cada veredicto muestra sus factores**, no solo el resultado. Si a una familia le dicen
 *   que no le corresponde un subsidio, tiene derecho a ver por que.
 * - **No decide, sugiere con argumento.** El funcionario puede apartarse —tiene enfrente a la
 *   familia y el sistema no—, pero apartarse queda registrado en la auditoria con su motivo.
 *   Una regla que no se puede desobedecer seria peor: mandaria a la gente a pelear con el
 *   software en vez de con un funcionario que responde.
 *
 * Lo que esta regla NO hace: decidir montos, sustituir la certificacion de otra entidad, ni
 * inscribir a nadie en el RUD nacional. Dice a que puerta tocar, no abre la puerta.
 */

/** Lo que la regla mira del hogar. Todo sale de lo ya caracterizado; nada se vuelve a pedir. */
export type SituacionHogar = {
  personasTotal: number;
  ninez: number;
  adultoMayor: number;
  discapacidad: number;
  heridos: number;
  fallecidos: number;
  /** Autorizacion de tratamiento otorgada (Ley 1581). */
  autorizado: boolean;
  /** Cuantas necesidades de salud categorizadas tiene registradas. */
  necesidadesSalud: number;
  /** El inmueble afectado que habita, si esta identificado. */
  inmueble: { estadoAfectacion: EstadoAfectacion | null; sector: Sector } | null;
  /** Tipos de ayuda que ya recibio: no se cuenta dos veces lo mismo. */
  yaRecibio: TipoOferta[];
};

export type OfertaEvaluable = {
  tipo: TipoOferta;
  destinatario: DestinatarioOferta;
  estado: EstadoOferta;
  requiereRud: boolean;
};

/** Un factor de la regla: que se miro, si se cumple y por que importa. */
export type Factor = { nombre: string; cumple: boolean; porque: string };

export type Veredicto = {
  elegible: boolean;
  /** Una linea que se le puede decir a la familia. */
  motivo: string;
  factores: Factor[];
};

/** El inmueble quedo inhabitable: perdido o para demoler. */
function inhabitable(hogar: SituacionHogar): boolean {
  const estado = hogar.inmueble?.estadoAfectacion;
  return estado === "DEMOLER" || estado === "PERDIDO";
}

/** El medio de vida del hogar depende del bien afectado. */
function afectaSuSustento(hogar: SituacionHogar): boolean {
  const sector = hogar.inmueble?.sector;
  return sector === "AGROPECUARIO" || sector === "COMERCIO";
}

/**
 * La condicion propia de cada tipo de ayuda, con su explicacion.
 *
 * Deliberadamente simple y en un solo lugar: una regla que un concejal pueda leer completa
 * en una pantalla vale mas que una que acierta un 3% mas y nadie entiende.
 */
function condicionDe(tipo: TipoOferta, hogar: SituacionHogar): Factor {
  switch (tipo) {
    case "ALOJAMIENTO_TEMPORAL":
      return {
        nombre: "Necesita techo",
        cumple: inhabitable(hogar) || hogar.inmueble === null,
        porque:
          "El inmueble quedo perdido o para demoler, o todavia no se ha identificado donde vive el hogar.",
      };
    case "VIVIENDA":
      return {
        nombre: "Perdio la vivienda",
        cumple: inhabitable(hogar),
        porque: "La ayuda de vivienda es para reponer lo que no se puede volver a habitar.",
      };
    case "EVALUACION_TECNICA":
      return {
        nombre: "Falta saber si es habitable",
        cumple:
          hogar.inmueble !== null &&
          (hogar.inmueble.estadoAfectacion === null ||
            hogar.inmueble.estadoAfectacion === "REPARABLE"),
        porque:
          "Hay un inmueble cuyo estado no esta definido, o es reparable: un tecnico tiene que decir si se puede volver.",
      };
    case "SALUD":
      return {
        nombre: "Hay a quien referir a salud",
        cumple: hogar.necesidadesSalud > 0 || hogar.heridos > 0,
        porque:
          "El hogar tiene personas heridas o una necesidad de salud categorizada sin atender.",
      };
    case "INDEMNIZACION":
      return {
        nombre: "Hubo daño a las personas",
        cumple: hogar.fallecidos > 0 || hogar.heridos > 0,
        porque: "La indemnizacion responde a personas heridas o fallecidas, no al inmueble.",
      };
    case "NIÑEZ_Y_FAMILIA":
      return {
        nombre: "Hay niñez en el hogar",
        cumple: hogar.ninez > 0,
        porque: "La oferta de niñez y familia se dirige a hogares con menores de edad.",
      };
    case "EMPLEO_E_INGRESOS":
      return {
        nombre: "Perdio su medio de vida",
        cumple: afectaSuSustento(hogar),
        porque:
          "El bien afectado es agropecuario o de comercio: con el se perdio el ingreso del hogar.",
      };
    // El resto son medidas generales para cualquier hogar damnificado: comer, tener agua y
    // luz, y no ahogarse en cuotas o impuestos mientras se rehace.
    case "ALIMENTACION_Y_KITS":
    case "SERVICIOS_PUBLICOS":
    case "ALIVIO_FINANCIERO":
    case "ALIVIO_TRIBUTARIO":
      return {
        nombre: "Hogar damnificado registrado",
        cumple: hogar.personasTotal > 0,
        porque: "Es una medida general para cualquier hogar damnificado caracterizado.",
      };
  }
}

/**
 * Evalua un hogar contra una ayuda del catalogo. Devuelve el veredicto **y sus factores**:
 * el resultado sin los factores seria una opinion, no una regla.
 */
export function evaluarElegibilidad(hogar: SituacionHogar, oferta: OfertaEvaluable): Veredicto {
  const habilitada: Factor = {
    nombre: "La ayuda esta vigente",
    cumple: estaHabilitada(oferta),
    porque:
      "Lo anunciado pero sin reglamentar no se puede tramitar: mandaria a la familia a una fila que no existe.",
  };

  const paraHogares: Factor = {
    nombre: "Va dirigida a hogares o personas",
    cumple: oferta.destinatario === "HOGAR" || oferta.destinatario === "PERSONA",
    porque: "Una ayuda para empresas o para entidades territoriales no se le asigna a un hogar.",
  };

  const noRepetida: Factor = {
    nombre: "No la ha recibido todavia",
    cumple: !hogar.yaRecibio.includes(oferta.tipo),
    porque: `El hogar ya recibio una ayuda de ${ETIQUETA_TIPO[oferta.tipo].toLowerCase()}.`,
  };

  // El registro municipal ES la caracterizacion: es exactamente el punto de no volver a
  // registrarse en cada entidad. Lo que la regla no puede hacer es inscribir en el RUD
  // nacional, y decirlo es parte de ser honesta.
  const registro: Factor = {
    nombre: oferta.requiereRud ? "Exige registro de damnificados" : "No exige registro previo",
    cumple: true,
    porque: oferta.requiereRud
      ? "El hogar ya esta caracterizado por su municipio: ese registro es el que sirve para postular, sin volver a inscribirse."
      : "No hay requisito de registro previo para esta ayuda.",
  };

  const condicion = condicionDe(oferta.tipo, hogar);
  const factores = [habilitada, paraHogares, noRepetida, registro, condicion];
  const elegible = factores.every((f) => f.cumple);

  // El motivo de un "no" se redacta como negacion: el texto del factor esta escrito en
  // afirmativo ("el hogar tiene heridos") y leerlo como explicacion de un rechazo confunde a
  // quien tiene que explicarselo a la familia.
  const primerFallo = factores.find((f) => !f.cumple);
  return {
    elegible,
    motivo: elegible
      ? condicion.porque
      : primerFallo
        ? `No cumple "${primerFallo.nombre}". La condicion es: ${primerFallo.porque}`
        : "No cumple las condiciones de esta ayuda.",
    factores,
  };
}

/**
 * Separa el catalogo en lo que le corresponde al hogar y lo que no, conservando el motivo
 * de cada descarte. Lo descartado NO se esconde: una lista que solo muestra los "si" no se
 * puede auditar, y el funcionario necesita ver por que quedo fuera algo que el esperaba.
 */
export function clasificarOferta<T extends OfertaEvaluable>(
  hogar: SituacionHogar,
  catalogo: readonly T[],
): {
  corresponden: { oferta: T; veredicto: Veredicto }[];
  noCorresponden: { oferta: T; veredicto: Veredicto }[];
} {
  const evaluadas = catalogo.map((oferta) => ({
    oferta,
    veredicto: evaluarElegibilidad(hogar, oferta),
  }));

  return {
    corresponden: evaluadas.filter((e) => e.veredicto.elegible),
    noCorresponden: evaluadas.filter((e) => !e.veredicto.elegible),
  };
}
