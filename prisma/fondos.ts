import type { AmbitoFondo, NaturalezaFondo } from "../lib/generated/prisma/enums.js";

/**
 * Catalogo de fuentes de financiacion reales, verificado en agosto de 2026.
 *
 * Fuentes de la investigacion en:
 * specs/001-cofinanciacion-obras/instituciones-y-fondos.md
 *
 * Advertencia: los fondos creados por la emergencia economica de agosto de 2026
 * estan anunciados pero su reglamentacion puede cambiar. Verificar antes del piloto.
 */

export type SemillaFondo = {
  sigla: string;
  nombre: string;
  ambito: AmbitoFondo;
  naturaleza: NaturalezaFondo;
  administrador: string;
  norma?: string;
  descripcion: string;
  exigeProyectoAplazado?: boolean;
};

export const FONDOS: SemillaFondo[] = [
  // ── Municipal ────────────────────────────────────────────────────────────────
  {
    sigla: "FMGRD",
    nombre: "Fondo Municipal de Gestion del Riesgo de Desastres",
    ambito: "MUNICIPAL",
    naturaleza: "FONDO_GESTION_RIESGO",
    administrador: "Alcaldia municipal",
    norma: "Ley 1523 de 2012, art. 54",
    descripcion:
      "Cuenta especial con autonomia tecnica y financiera que cada municipio debe constituir. Financia conocimiento y reduccion del riesgo, preparacion, respuesta, rehabilitacion y reconstruccion.",
  },
  {
    sigla: "MUN-PROPIOS",
    nombre: "Recursos propios del municipio",
    ambito: "MUNICIPAL",
    naturaleza: "PROPIO",
    administrador: "Secretaria de Hacienda municipal",
    descripcion: "Ingresos corrientes de libre destinacion del municipio.",
  },
  {
    sigla: "MUN-TRASLADO",
    nombre: "Traslado presupuestal del Plan de Desarrollo Municipal",
    ambito: "MUNICIPAL",
    naturaleza: "TRASLADO_PRESUPUESTAL",
    administrador: "Secretaria de Hacienda municipal",
    descripcion:
      "Recursos que se retiran de un proyecto ya presupuestado para atender la emergencia. Es la via mas frecuente en la practica y tiene un costo de oportunidad que debe quedar visible.",
    exigeProyectoAplazado: true,
  },
  {
    sigla: "SGP-MUN",
    nombre: "Sistema General de Participaciones",
    ambito: "MUNICIPAL",
    naturaleza: "TRANSFERENCIA",
    administrador: "Municipio, con recursos girados por la Nacion",
    norma: "Ley 715 de 2001",
    descripcion:
      "Transferencias de la Nacion al municipio. Tras el sismo de agosto de 2026 se propuso permitir el uso extraordinario del 7% asignado a deporte y cultura.",
  },
  {
    sigla: "MUN-CREDITO",
    nombre: "Credito publico municipal",
    ambito: "MUNICIPAL",
    naturaleza: "CREDITO",
    administrador: "Secretaria de Hacienda municipal",
    descripcion: "Endeudamiento del municipio con banca comercial o de fomento.",
  },

  // ── Departamental ────────────────────────────────────────────────────────────
  {
    sigla: "FDGRD",
    nombre: "Fondo Departamental de Gestion del Riesgo de Desastres",
    ambito: "DEPARTAMENTAL",
    naturaleza: "FONDO_GESTION_RIESGO",
    administrador: "Gobernacion departamental",
    norma: "Ley 1523 de 2012, art. 54",
    descripcion:
      "Equivalente departamental del fondo municipal. Puede crear subcuentas por proceso de gestion del riesgo.",
  },
  {
    sigla: "DEP-PROPIOS",
    nombre: "Recursos propios del departamento",
    ambito: "DEPARTAMENTAL",
    naturaleza: "PROPIO",
    administrador: "Secretaria de Hacienda departamental",
    descripcion: "Ingresos corrientes de libre destinacion del departamento.",
  },
  {
    sigla: "DEP-TRASLADO",
    nombre: "Traslado presupuestal del Plan de Desarrollo Departamental",
    ambito: "DEPARTAMENTAL",
    naturaleza: "TRASLADO_PRESUPUESTAL",
    administrador: "Secretaria de Hacienda departamental",
    descripcion: "Recursos retirados de un proyecto departamental ya presupuestado.",
    exigeProyectoAplazado: true,
  },
  {
    sigla: "SGR-DEP",
    nombre: "Sistema General de Regalias, asignaciones departamentales",
    ambito: "DEPARTAMENTAL",
    naturaleza: "REGALIAS",
    administrador: "Gobernacion, con aprobacion del OCAD",
    norma: "Ley 2056 de 2020",
    descripcion:
      "Presupuesto bienal 2025-2026 de $30,9 billones. Tras el sismo se propuso flexibilizarlo para dar liquidez inmediata a los territorios.",
  },

  // ── Nacional ─────────────────────────────────────────────────────────────────
  {
    sigla: "FNGRD",
    nombre: "Fondo Nacional de Gestion del Riesgo de Desastres",
    ambito: "NACIONAL",
    naturaleza: "FONDO_GESTION_RIESGO",
    administrador: "UNGRD",
    norma: "Ley 1523 de 2012, art. 47",
    descripcion:
      "Fondo del nivel nacional. Tiene subcuentas de conocimiento del riesgo, reduccion del riesgo, manejo de desastres, recuperacion y proteccion financiera.",
  },
  {
    sigla: "FONDO-MILAGRO",
    nombre: "Fondo Milagro",
    ambito: "NACIONAL",
    naturaleza: "FONDO_GESTION_RIESGO",
    administrador: "Gobierno Nacional",
    norma: "Emergencia economica, social y ecologica de agosto de 2026",
    descripcion:
      "Creado tras el sismo del 10 de agosto de 2026 para canalizar recursos nacionales e internacionales de reconstruccion de hospitales, colegios, vivienda, vias y aeropuertos. Reglamentacion por confirmar.",
  },
  {
    sigla: "SUBCUENTA-SISMO-2026",
    nombre: "Subcuenta Sismo 2026",
    ambito: "NACIONAL",
    naturaleza: "FONDO_GESTION_RIESGO",
    administrador: "UNGRD",
    norma: "Declaratoria de desastre nacional, agosto de 2026",
    descripcion:
      "Subcuenta creada para manejar de forma independiente los recursos de atencion de la emergencia y de apoyo a la reconstruccion del sismo del 10 de agosto de 2026.",
  },
  {
    sigla: "FONDO-ADAPTACION",
    nombre: "Fondo Adaptacion",
    ambito: "NACIONAL",
    naturaleza: "FONDO_GESTION_RIESGO",
    administrador: "Fondo Adaptacion, adscrito al Ministerio de Hacienda",
    norma: "Decreto 4819 de 2010",
    descripcion:
      "Creado tras el fenomeno de La Niña 2010-2011 para construccion y reconstruccion. Sigue ejecutando proyectos.",
  },
  {
    sigla: "PGN",
    nombre: "Presupuesto General de la Nacion",
    ambito: "NACIONAL",
    naturaleza: "PROPIO",
    administrador: "Ministerio de Hacienda y Credito Publico",
    descripcion:
      "Incluye la reasignacion de partidas de la vigencia, anunciada como fuente para la reconstruccion.",
  },
  {
    sigla: "SGR-NAL",
    nombre: "Sistema General de Regalias, asignaciones nacionales",
    ambito: "NACIONAL",
    naturaleza: "REGALIAS",
    administrador: "DNP",
    norma: "Ley 2056 de 2020",
    descripcion: "Asignaciones de regalias administradas desde el nivel nacional.",
  },
  {
    sigla: "OBRAS-IMPUESTOS",
    nombre: "Obras por impuestos",
    ambito: "NACIONAL",
    naturaleza: "EJECUCION_EN_ESPECIE",
    administrador: "Agencia de Renovacion del Territorio (ART) y DNP",
    norma: "Decretos 1650 y 893 de 2017; Decreto 1625 de 2016",
    descripcion:
      "La empresa ejecuta la obra en lugar de girar el impuesto. Exige concepto de viabilidad de la entidad nacional competente e inscripcion en el Banco de Proyectos. Hoy aplica en municipios ZOMAC y PDET; tras el sismo se propuso extenderlo a los municipios afectados. En nagomu se registra como intervencion directa, no como aporte en dinero.",
  },

  // ── Externo ──────────────────────────────────────────────────────────────────
  {
    sigla: "BM-CATDDO",
    nombre: "Banco Mundial, credito Cat DDO",
    ambito: "EXTERNO",
    naturaleza: "CREDITO",
    administrador: "Ministerio de Hacienda con el Banco Mundial",
    descripcion:
      "Linea de prestamo de politicas de desarrollo de gestion del riesgo con desembolso diferido ante catastrofes. Linea de USD 450 millones; USD 200 millones desembolsados el 13 de agosto de 2026.",
  },
  {
    sigla: "COOP-BILATERAL",
    nombre: "Cooperacion internacional bilateral",
    ambito: "EXTERNO",
    naturaleza: "COOPERACION_INTERNACIONAL",
    administrador: "APC-Colombia y la entidad receptora",
    descripcion:
      "Recursos no reembolsables de gobiernos extranjeros y organismos multilaterales. Ejemplo registrado: 4,5 millones de euros de Italia.",
  },
  {
    sigla: "DONACION-PRIVADA",
    nombre: "Donacion privada y gremial",
    ambito: "EXTERNO",
    naturaleza: "DONACION",
    administrador: "Entidad receptora",
    descripcion:
      "Aportes de empresas, gremios y cajas de compensacion, incluida la estrategia Juntos Reconstruimos Colombia.",
  },
];
