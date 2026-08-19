import { prisma } from "@/lib/db";
import type { municipiosVisiblesPara } from "@/lib/authz";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { EstadoAyudaHogar, TipoOferta } from "@/lib/generated/prisma/enums";
import type { Columna } from "@/lib/export";

/**
 * Registro municipal de damnificados (spec 006).
 *
 * Es el area mas sensible del sistema. La enmienda constitucional 3.0.0 abrio la puerta
 * al documento del damnificado, pero con candados: unidad hogar, minimo de datos, nada
 * clinico, documento **solo** con autorizacion de tratamiento (Ley 1581), detalle acotado
 * al municipio dueño, y derecho de supresion.
 *
 * Toda consulta de detalle recibe el `municipioId` de la sesion y filtra por el en el
 * servidor. No existe aqui una consulta de detalle sin ambito: si alguna vez hiciera falta
 * una, es senal de que algo se esta saltando el Principio II.
 */

/**
 * Verbos de auditoria del feature. Se registran con el **hecho**, nunca con el dato
 * personal: si el asiento guardara el documento, suprimir el hogar no serviria de nada
 * porque el dato seguiria ahi.
 */
export const ACCIONES = {
  registrar: "damnificado.registrar",
  actualizar: "damnificado.actualizar",
  autorizar: "damnificado.autorizar",
  ayuda: "damnificado.ayuda",
  suprimir: "damnificado.suprimir",
  exportar: "damnificado.exportar",
} as const;

/**
 * 🔒 Motivos de supresion, en lista cerrada y no en texto libre.
 *
 * El asiento de auditoria de una supresion es append-only: lo que se escriba ahi no se
 * puede borrar nunca. Con un campo abierto, un funcionario bien intencionado escribe "la
 * señora Marta Ospina, cedula 31234567, pidio que la borraramos" y deja el dato grabado
 * para siempre en el mismo acto de eliminarlo. Con una lista cerrada, el motivo queda
 * registrado y no puede llevar a nadie adentro.
 */
export const MOTIVOS_SUPRESION = {
  SOLICITUD_TITULAR: "El titular solicito la supresion de sus datos",
  ERROR_REGISTRO: "El registro fue un error",
  DUPLICADO: "El hogar estaba registrado dos veces",
} as const;

export type MotivoSupresion = keyof typeof MOTIVOS_SUPRESION;

export function esMotivoSupresion(valor: string): valor is MotivoSupresion {
  return valor in MOTIVOS_SUPRESION;
}

export const ETIQUETA_AYUDA: Record<EstadoAyudaHogar, string> = {
  PENDIENTE: "Pendiente",
  ENTREGADA: "Entregada",
};

/**
 * Candado del Principio IV (enmienda 3.0.0, research D1).
 *
 * El documento del damnificado solo se guarda si el hogar autorizo el tratamiento de sus
 * datos (Ley 1581). Funcion pura y unica definicion de la regla: cualquier camino que
 * escriba `documento` pasa por aqui, para que no dependa de que cada formulario se acuerde.
 */
export function puedeGuardarDocumento(
  autorizacion: { otorgada: boolean } | null | undefined,
): boolean {
  return autorizacion?.otorgada === true;
}

/** Los hogares del municipio. Sin `documento`: el listado no necesita identificar a nadie. */
export function listarHogaresDe(municipioId: string, saltar = 0, tomar = 50) {
  return prisma.hogarDamnificado.findMany({
    where: { municipioId },
    select: {
      id: true,
      responsableNombre: true,
      personasTotal: true,
      personasNinez: true,
      personasAdultoMayor: true,
      personasDiscapacidad: true,
      hayHeridos: true,
      hayFallecidos: true,
      creadoEn: true,
      inmueble: { select: { id: true, nombre: true } },
      autorizacion: { select: { otorgada: true } },
      _count: { select: { ayudas: true } },
    },
    orderBy: { creadoEn: "desc" },
    skip: saltar,
    take: tomar,
  });
}

export function contarHogaresDe(municipioId: string) {
  return prisma.hogarDamnificado.count({ where: { municipioId } });
}

/**
 * La ficha del hogar. El `municipioId` va en el `where`, no en una comprobacion posterior:
 * un hogar de otro municipio no se lee y luego se descarta, sencillamente no se lee.
 */
export function obtenerHogar(hogarId: string, municipioId: string) {
  return prisma.hogarDamnificado.findFirst({
    where: { id: hogarId, municipioId },
    include: {
      inmueble: { select: { id: true, nombre: true, ubicacion: true } },
      autorizacion: true,
      ayudas: {
        include: { oferta: { select: { id: true, nombre: true, entidad: true, tipo: true } } },
        orderBy: { creadoEn: "asc" },
      },
    },
  });
}

/** Otro hogar del mismo municipio con ese documento (T019: avisar del doble registro). */
export async function hogarConDocumento(municipioId: string, documento: string, excluirId?: string) {
  return prisma.hogarDamnificado.findFirst({
    where: { municipioId, documento, ...(excluirId ? { id: { not: excluirId } } : {}) },
    select: { id: true, responsableNombre: true },
  });
}

export type DatosHogar = {
  municipioId: string;
  responsableNombre: string;
  documento?: string | null;
  inmuebleId?: string | null;
  personasTotal: number;
  personasNinez: number;
  personasAdultoMayor: number;
  personasDiscapacidad: number;
  hayHeridos: number;
  hayFallecidos: number;
  registradoPorId: string;
  /** Lo que el hogar autorizo, si lo autorizo. Sin esto el documento no se escribe. */
  autorizacion?: { otorgada: boolean; medio: string } | null;
};

/**
 * Unico camino que escribe un hogar. 🔒 Aqui se aplica el candado: si no hay autorizacion
 * otorgada, el documento **no se guarda**, aunque venga en los datos. Deliberadamente no se
 * lanza un error: el registro del hogar sigue siendo util sin el documento, y en una
 * emergencia negarse a registrar a una familia por un campo administrativo es peor que no
 * tener el numero de cedula.
 */
export function crearHogar(datos: DatosHogar, db: Prisma.TransactionClient = prisma) {
  const conservaDocumento = puedeGuardarDocumento(datos.autorizacion);
  return db.hogarDamnificado.create({
    data: {
      municipioId: datos.municipioId,
      responsableNombre: datos.responsableNombre,
      documento: conservaDocumento ? (datos.documento ?? null) : null,
      inmuebleId: datos.inmuebleId ?? null,
      personasTotal: datos.personasTotal,
      personasNinez: datos.personasNinez,
      personasAdultoMayor: datos.personasAdultoMayor,
      personasDiscapacidad: datos.personasDiscapacidad,
      hayHeridos: datos.hayHeridos,
      hayFallecidos: datos.hayFallecidos,
      registradoPorId: datos.registradoPorId,
      autorizacion: datos.autorizacion
        ? {
            create: {
              otorgada: datos.autorizacion.otorgada,
              medio: datos.autorizacion.medio,
              fecha: new Date(),
              registradoPorId: datos.registradoPorId,
            },
          }
        : undefined,
    },
    select: { id: true },
  });
}

/**
 * Registra la autorizacion de tratamiento y, si se otorga, deja guardar el documento que
 * antes no se podia. El `municipioId` va en el `where`: nadie autoriza sobre hogar ajeno.
 */
export async function otorgarAutorizacion(
  hogarId: string,
  municipioId: string,
  datos: { otorgada: boolean; medio: string; registradoPorId: string; documento?: string | null },
  db: Prisma.TransactionClient = prisma,
) {
  const hogar = await db.hogarDamnificado.findFirst({
    where: { id: hogarId, municipioId },
    select: { id: true },
  });
  if (!hogar) return null;

  await db.autorizacionTratamiento.upsert({
    where: { hogarId },
    create: {
      hogarId,
      otorgada: datos.otorgada,
      medio: datos.medio,
      fecha: new Date(),
      registradoPorId: datos.registradoPorId,
    },
    update: { otorgada: datos.otorgada, medio: datos.medio, fecha: new Date() },
  });

  // Revocar tambien pasa por aqui: si la autorizacion deja de estar otorgada, el documento
  // se borra. Guardarlo "por si acaso" seria justo lo que el Principio IV prohibe.
  const documento = puedeGuardarDocumento({ otorgada: datos.otorgada })
    ? (datos.documento ?? undefined)
    : null;

  return db.hogarDamnificado.update({
    where: { id: hogarId },
    data: documento === undefined ? {} : { documento },
    select: { id: true, documento: true },
  });
}

/**
 * Ayudas de un hogar. Devuelve tambien las que estan pendientes: en la ficha importa
 * tanto lo que llego como lo que se prometio y no ha llegado.
 */
export function ayudasDeHogar(hogarId: string) {
  return prisma.ayudaAHogar.findMany({
    where: { hogarId },
    include: { oferta: { select: { id: true, nombre: true, entidad: true, tipo: true } } },
    orderBy: { creadoEn: "asc" },
  });
}

/**
 * Atencion del municipio por tipo de ayuda: cuantos hogares tienen algo entregado y
 * cuantos siguen esperando. Agrega sobre hogares, no sobre personas, y no selecciona
 * ningun campo personal: esta cifra es la que puede subir de nivel.
 */
export async function resumenAyudas(municipioId: string) {
  const filas = await prisma.ayudaAHogar.findMany({
    where: { hogar: { municipioId } },
    select: { hogarId: true, estado: true, oferta: { select: { tipo: true } } },
  });

  const porTipo = new Map<TipoOferta, { entregadas: Set<string>; pendientes: Set<string> }>();
  for (const fila of filas) {
    const tipo = fila.oferta.tipo;
    const acumulado = porTipo.get(tipo) ?? { entregadas: new Set(), pendientes: new Set() };
    (fila.estado === "ENTREGADA" ? acumulado.entregadas : acumulado.pendientes).add(fila.hogarId);
    porTipo.set(tipo, acumulado);
  }

  // Un hogar que ya recibio algo de un tipo no cuenta como pendiente en ese mismo tipo:
  // lo que interesa saber es a quien todavia no le ha llegado nada.
  return [...porTipo.entries()].map(([tipo, a]) => ({
    tipo,
    hogaresAtendidos: a.entregadas.size,
    hogaresPendientes: [...a.pendientes].filter((h) => !a.entregadas.has(h)).length,
  }));
}

export type AmbitoMunicipios = ReturnType<typeof municipiosVisiblesPara>;

/**
 * 🔒 Cifras por municipio para los niveles superiores (spec 006 US3).
 *
 * Este es el unico camino por el que la informacion de damnificados sale del municipio, y
 * por eso el `select` de abajo es deliberadamente corto: **ni `responsableNombre` ni
 * `documento` aparecen**. No es un olvido ni una optimizacion; es la frontera. Una prueba
 * en tests/damnificados.test.ts falla si alguien agrega un campo personal aqui.
 *
 * El ambito lo decide `municipiosVisiblesPara`, la misma funcion que usa el resto del
 * sistema: la gobernacion ve sus municipios, la nacion ve todos.
 */
export async function agregadosPorMunicipio(ambito: AmbitoMunicipios) {
  const donde =
    ambito.alcance === "TODOS"
      ? {}
      : ambito.alcance === "DEPARTAMENTO"
        ? { municipio: { departamentoId: ambito.departamentoId } }
        : { municipioId: ambito.municipioId };

  const hogares = await prisma.hogarDamnificado.findMany({
    where: donde,
    select: {
      municipioId: true,
      municipio: { select: { nombre: true } },
      personasTotal: true,
      personasNinez: true,
      personasAdultoMayor: true,
      personasDiscapacidad: true,
      hayHeridos: true,
      hayFallecidos: true,
      ayudas: { select: { estado: true } },
    },
  });

  const porMunicipio = new Map<string, {
    municipioId: string;
    municipio: string;
    hogares: number;
    personas: number;
    ninez: number;
    adultoMayor: number;
    discapacidad: number;
    hogaresConHeridos: number;
    hogaresConFallecidos: number;
    hogaresAtendidos: number;
    hogaresSinAyuda: number;
  }>();

  for (const h of hogares) {
    const fila = porMunicipio.get(h.municipioId) ?? {
      municipioId: h.municipioId,
      municipio: h.municipio.nombre,
      hogares: 0,
      personas: 0,
      ninez: 0,
      adultoMayor: 0,
      discapacidad: 0,
      hogaresConHeridos: 0,
      hogaresConFallecidos: 0,
      hogaresAtendidos: 0,
      hogaresSinAyuda: 0,
    };

    fila.hogares += 1;
    fila.personas += h.personasTotal;
    fila.ninez += h.personasNinez;
    fila.adultoMayor += h.personasAdultoMayor;
    fila.discapacidad += h.personasDiscapacidad;
    if (h.hayHeridos > 0) fila.hogaresConHeridos += 1;
    if (h.hayFallecidos > 0) fila.hogaresConFallecidos += 1;
    if (h.ayudas.some((a) => a.estado === "ENTREGADA")) fila.hogaresAtendidos += 1;
    else fila.hogaresSinAyuda += 1;

    porMunicipio.set(h.municipioId, fila);
  }

  return [...porMunicipio.values()].sort((a, b) => b.hogares - a.hogares);
}

export type FilaExport = {
  hogar: string;
  responsable: string;
  documento: string;
  personas: number;
  ninez: number;
  adultoMayor: number;
  discapacidad: number;
  heridos: number;
  fallecidos: number;
  inmueble: string;
  autorizacion: string;
  ayudasEntregadas: string;
  ayudasPendientes: string;
  registro: string;
};

/**
 * Columnas del archivo que recibe la UNGRD. Los nombres son los que va a leer una persona,
 * no los del modelo: quien abre el archivo no tiene por que saber como se llaman aqui.
 */
export const COLUMNAS_EXPORT: Columna<FilaExport>[] = [
  { clave: "hogar", titulo: "Id del hogar" },
  { clave: "responsable", titulo: "Responsable" },
  { clave: "documento", titulo: "Documento" },
  { clave: "personas", titulo: "Personas" },
  { clave: "ninez", titulo: "Niñez" },
  { clave: "adultoMayor", titulo: "Adultos mayores" },
  { clave: "discapacidad", titulo: "Con discapacidad" },
  { clave: "heridos", titulo: "Heridos" },
  { clave: "fallecidos", titulo: "Fallecidos" },
  { clave: "inmueble", titulo: "Inmueble afectado" },
  { clave: "autorizacion", titulo: "Autorizacion de datos" },
  { clave: "ayudasEntregadas", titulo: "Ayudas entregadas" },
  { clave: "ayudasPendientes", titulo: "Ayudas pendientes" },
  { clave: "registro", titulo: "Fecha de registro" },
];

/**
 * Registro del municipio en filas planas para exportar.
 *
 * El documento sale solo si el hogar autorizo el tratamiento: es el mismo candado de
 * `puedeGuardarDocumento`, aplicado a la salida. Si no hay autorizacion, la celda dice
 * que falta, en vez de quedar vacia y parecer un error de digitacion.
 */
export async function filasParaExport(municipioId: string): Promise<FilaExport[]> {
  const hogares = await prisma.hogarDamnificado.findMany({
    where: { municipioId },
    include: {
      inmueble: { select: { nombre: true } },
      autorizacion: { select: { otorgada: true } },
      ayudas: { include: { oferta: { select: { nombre: true } } } },
    },
    orderBy: { creadoEn: "asc" },
  });

  return hogares.map((h) => {
    const autorizado = puedeGuardarDocumento(h.autorizacion);
    const nombres = (estado: EstadoAyudaHogar) =>
      h.ayudas.filter((a) => a.estado === estado).map((a) => a.oferta.nombre).join("; ");

    return {
      hogar: h.id,
      responsable: h.responsableNombre,
      documento: autorizado ? (h.documento ?? "") : "sin autorizacion",
      personas: h.personasTotal,
      ninez: h.personasNinez,
      adultoMayor: h.personasAdultoMayor,
      discapacidad: h.personasDiscapacidad,
      heridos: h.hayHeridos,
      fallecidos: h.hayFallecidos,
      inmueble: h.inmueble?.nombre ?? "",
      autorizacion: autorizado ? "Otorgada" : "No otorgada",
      ayudasEntregadas: nombres("ENTREGADA"),
      ayudasPendientes: nombres("PENDIENTE"),
      registro: h.creadoEn.toISOString().slice(0, 10),
    };
  });
}

/**
 * Punto de extension para el RUD (FR-011), sin implementar todavia.
 *
 * El Registro Unico de Damnificados lo administra la UNGRD y hoy no tiene API publica: la
 * entrega se hace con archivo, que es lo que resuelve `filasParaExport`. Cuando exista una
 * API, el adaptador entra aqui —una funcion que reciba estas mismas filas y las envie— sin
 * tocar ni las pantallas ni las acciones.
 *
 * El mapeo que habria que acordar con la UNGRD:
 *
 * | nagomu                      | RUD (por confirmar)                  |
 * | --------------------------- | ------------------------------------ |
 * | `id`                        | identificador externo del municipio  |
 * | `responsableNombre`         | jefe de hogar                        |
 * | `documento`                 | documento del jefe de hogar          |
 * | `personasTotal` y conteos   | composicion del hogar                |
 * | `inmueble.nombre`           | direccion o predio afectado          |
 * | `ayudas`                    | ayudas entregadas por entidad        |
 *
 * Dos condiciones que no se negocian cuando eso llegue: **no se envia el documento de un
 * hogar sin autorizacion otorgada**, y cada envio se audita con `ACCIONES.exportar`. Que el
 * canal cambie de archivo a API no cambia de quien son los datos.
 */
