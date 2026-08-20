import type { SesionActiva } from "@/lib/auth";

/**
 * Reglas de quien puede editar que (Principio II de la constitucion).
 *
 * Funciones puras sobre datos planos: no consultan la base y se prueban sin
 * infraestructura. Cada Server Action las invoca antes de tocar nada.
 *
 * Para obras, la lectura esta abierta a todo usuario autenticado (FR-024), asi que
 * en esa parte solo viven reglas de escritura.
 *
 * **El registro de damnificados es la excepcion** (spec 006, enmienda 3.0.0): ahi la
 * lectura del detalle tambien se restringe, al municipio dueño. Es dato personal de
 * personas afectadas, no infraestructura publica.
 *
 * Contrato completo y matriz de casos: specs/001-cofinanciacion-obras/contracts/rutas.md
 */

export type Veredicto = { permitido: true } | { permitido: false; motivo: string };

const PERMITIDO: Veredicto = { permitido: true };

function negar(motivo: string): Veredicto {
  return { permitido: false, motivo };
}

/** Cualquier usuario autenticado ve cualquier obra de cualquier municipio (FR-024). */
export function puedeVer(sesion: SesionActiva | null): Veredicto {
  return sesion ? PERMITIDO : negar("Sesion no valida");
}

/** Solo un municipio registra items en su propio inventario (FR-001, FR-025). */
export function puedeCrearItemInventario(sesion: SesionActiva | null): Veredicto {
  if (!sesion) return negar("Sesion no valida");
  if (sesion.nivel !== "MUNICIPIO") {
    return negar("Solo un municipio registra items de su inventario");
  }
  return PERMITIDO;
}

/** Solo el municipio dueño edita la obra, sin importar quien la financie (FR-025). */
export function puedeEditarObra(
  sesion: SesionActiva | null,
  obra: { municipioId: string },
): Veredicto {
  if (!sesion) return negar("Sesion no valida");
  if (sesion.nivel !== "MUNICIPIO" || sesion.entidadId !== obra.municipioId) {
    return negar("Solo el municipio dueño edita esta obra");
  }
  return PERMITIDO;
}

/**
 * Cada entidad edita unicamente sus propios aportes (FR-026). La excepcion es el
 * municipio dueño de la obra, que inscribe por los actores sin usuario propio
 * —empresas, voluntariados, personas naturales, cooperantes—, siempre dejando
 * constancia de que el actor y quien registro son distintos (FR-035).
 */
export function puedeEditarAporte(
  sesion: SesionActiva | null,
  aporte: { actorEntidadId: string | null },
  obra: { municipioId: string },
): Veredicto {
  if (!sesion) return negar("Sesion no valida");

  const esAporteDeUnaEntidad = aporte.actorEntidadId !== null;
  if (esAporteDeUnaEntidad) {
    return sesion.entidadId === aporte.actorEntidadId
      ? PERMITIDO
      : negar("Ninguna entidad puede inscribir ni modificar aportes de otra");
  }

  const esMunicipioDueño = sesion.nivel === "MUNICIPIO" && sesion.entidadId === obra.municipioId;
  return esMunicipioDueño
    ? PERMITIDO
    : negar("Solo el municipio dueño inscribe por actores sin usuario propio");
}

/**
 * Aprobar, verificar, suspender o recibir una intervencion es del municipio dueño,
 * cualquiera sea el actor que la ejecuta y cualquiera sea el nivel que la propone:
 * el municipio autoriza lo que se hace en su territorio (FR-040, FR-043).
 */
export function puedeAutorizarIntervencion(
  sesion: SesionActiva | null,
  obra: { municipioId: string },
): Veredicto {
  if (!sesion) return negar("Sesion no valida");
  if (sesion.nivel !== "MUNICIPIO" || sesion.entidadId !== obra.municipioId) {
    return negar("Solo el municipio dueño autoriza intervenciones sobre sus obras");
  }
  return PERMITIDO;
}

/**
 * Verificar, rechazar o revocar a un voluntariado es del municipio donde ese voluntariado
 * declaro operar, y de nadie mas: ni otro municipio, ni la gobernacion, ni la nacion. Es
 * quien conoce el terreno y responde por dejarlo pasar como oficial (spec 003, Principio II).
 */
export function puedeVerificarVoluntariado(
  sesion: SesionActiva | null,
  voluntariado: { municipioOperacionId: string | null },
): Veredicto {
  if (!sesion) return negar("Sesion no valida");
  if (sesion.nivel !== "MUNICIPIO" || sesion.entidadId !== voluntariado.municipioOperacionId) {
    return negar("Solo el municipio de operacion verifica a este voluntariado");
  }
  return PERMITIDO;
}

/** Solo un municipio reporta su propia capacidad fiscal (FR-019). */
export function puedeReportarCapacidadFiscal(sesion: SesionActiva | null): Veredicto {
  if (!sesion) return negar("Sesion no valida");
  if (sesion.nivel !== "MUNICIPIO") {
    return negar("Solo un municipio reporta su capacidad fiscal");
  }
  return PERMITIDO;
}

/**
 * Detalle RESERVADO de un bien afectado (spec 007, enmienda 4.0.0).
 *
 * El listado publico y el censo muestran cantidades, tipo, punto y lugar general. Este
 * detalle muestra ademas la DIRECCION exacta y la foto, que son reservadas: solo el
 * municipio dueño. La gobernacion y la nacion ven el bien en sus agregados y en el censo,
 * nunca la direccion (Principio II y IV).
 */
export function puedeVerBienReservado(
  sesion: SesionActiva | null,
  bien: { municipioId: string },
): Veredicto {
  if (!sesion) return negar("Sesion no valida");
  if (sesion.nivel !== "MUNICIPIO" || sesion.entidadId !== bien.municipioId) {
    return negar("Solo el municipio dueño ve la direccion y la foto de sus bienes");
  }
  return PERMITIDO;
}

/**
 * Registro municipal de damnificados (spec 006, enmienda constitucional 3.0.0).
 *
 * A diferencia de las obras, aqui **la lectura del detalle tambien se restringe**: son
 * datos personales de personas afectadas. Solo el municipio dueño, y solo el suyo.
 * Ni la gobernacion ni la nacion alcanzan el detalle — hacia arriba van agregados.
 */
export function puedeGestionarDamnificados(
  sesion: SesionActiva | null,
  hogar: { municipioId: string },
): Veredicto {
  if (!sesion) return negar("Sesion no valida");
  if (sesion.nivel !== "MUNICIPIO" || sesion.entidadId !== hogar.municipioId) {
    return negar("Solo el municipio dueño accede al registro de sus damnificados");
  }
  return PERMITIDO;
}

/** Registrar un hogar nuevo: cualquier municipio, siempre en su propio territorio. */
export function puedeRegistrarDamnificado(sesion: SesionActiva | null): Veredicto {
  if (!sesion) return negar("Sesion no valida");
  if (sesion.nivel !== "MUNICIPIO") {
    return negar("Solo un municipio registra damnificados de su territorio");
  }
  return PERMITIDO;
}

/**
 * Conteos agregados: los ve cualquier funcionario dentro de su ambito. Nunca incluyen
 * nombre ni documento, asi que no exponen a nadie.
 */
export function puedeVerAgregadosDamnificados(sesion: SesionActiva | null): Veredicto {
  return sesion ? PERMITIDO : negar("Sesion no valida");
}

/** Ambito de consolidacion: la gobernacion ve sus municipios; la nacion, todo. */
export function municipiosVisiblesPara(
  sesion: SesionActiva,
):
  | { alcance: "TODOS" }
  | { alcance: "DEPARTAMENTO"; departamentoId: string }
  | { alcance: "PROPIO"; municipioId: string } {
  if (sesion.nivel === "NACION") return { alcance: "TODOS" };
  if (sesion.nivel === "DEPARTAMENTO") {
    return { alcance: "DEPARTAMENTO", departamentoId: sesion.entidadId };
  }
  return { alcance: "PROPIO", municipioId: sesion.entidadId };
}
