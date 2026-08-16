import type { SesionActiva } from "@/lib/auth";

/**
 * Reglas de quien puede editar que (Principio II de la constitucion).
 *
 * Funciones puras sobre datos planos: no consultan la base y se prueban sin
 * infraestructura. Cada Server Action las invoca antes de tocar nada.
 *
 * La lectura esta abierta a todo usuario autenticado (FR-024), asi que aqui solo
 * viven reglas de escritura. Cuando eso cambie, la restriccion de lectura debe
 * resolverse tambien en el servidor, nunca en la interfaz.
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

/** Solo un municipio reporta su propia capacidad fiscal (FR-019). */
export function puedeReportarCapacidadFiscal(sesion: SesionActiva | null): Veredicto {
  if (!sesion) return negar("Sesion no valida");
  if (sesion.nivel !== "MUNICIPIO") {
    return negar("Solo un municipio reporta su capacidad fiscal");
  }
  return PERMITIDO;
}

/** Ambito de consolidacion: la gobernacion ve sus municipios; la nacion, todo. */
export function municipiosVisiblesPara(
  sesion: SesionActiva,
): { alcance: "TODOS" } | { alcance: "DEPARTAMENTO"; departamentoId: string } | { alcance: "PROPIO"; municipioId: string } {
  if (sesion.nivel === "NACION") return { alcance: "TODOS" };
  if (sesion.nivel === "DEPARTAMENTO") {
    return { alcance: "DEPARTAMENTO", departamentoId: sesion.entidadId };
  }
  return { alcance: "PROPIO", municipioId: sesion.entidadId };
}
