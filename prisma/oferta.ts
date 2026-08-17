import type {
  AmbitoFondo,
  DestinatarioOferta,
  EstadoOferta,
  TipoOferta,
} from "../lib/generated/prisma/enums.js";

/**
 * Oferta institucional para los damnificados del sismo del 10 de agosto de 2026.
 *
 * Verificado en fuentes publicas el 16 de agosto de 2026. Fuentes y advertencias en
 * specs/001-cofinanciacion-obras/instituciones-y-fondos.md
 *
 * `ANUNCIADO` significa que la medida se comunico pero aun no esta reglamentada.
 * Mostrarla como vigente mandaria a una familia a hacer una fila que no existe.
 */

export type SemillaOferta = {
  nombre: string;
  entidad: string;
  ambito: AmbitoFondo;
  tipo: TipoOferta;
  destinatario: DestinatarioOferta;
  estado: EstadoOferta;
  descripcion: string;
  requisito: string;
  requiereRud?: boolean;
  certificaEntidad?: string;
  canal?: string;
  monto?: string;
  norma?: string;
};

export const OFERTA: SemillaOferta[] = [
  // ── El tramite que abre todos los demas ──────────────────────────────────────
  {
    nombre: "Inscripcion en el Registro Unico de Damnificados (RUD)",
    entidad: "Alcaldia municipal, con la UNGRD",
    ambito: "MUNICIPAL",
    tipo: "ALOJAMIENTO_TEMPORAL",
    destinatario: "HOGAR",
    estado: "VIGENTE",
    descripcion:
      "Censo oficial de hogares afectados. Es la puerta de entrada a practicamente toda la ayuda: sin inscripcion, un hogar no accede aunque tenga derecho. Lo elaboran las alcaldias, las gobernaciones, la UNGRD y el Ministerio de Vivienda.",
    requisito: "Presentarse en un punto de atencion oficial del municipio. Es gratuito.",
    certificaEntidad: "Alcaldia municipal",
    canal: "Puntos de atencion municipales",
  },
  {
    nombre: "Certificacion de condicion de damnificado",
    entidad: "CMGRD / CDGRD",
    ambito: "MUNICIPAL",
    tipo: "INDEMNIZACION",
    destinatario: "PERSONA",
    estado: "VIGENTE",
    descripcion:
      "Certificacion del consejo de gestion del riesgo que acredita que la lesion o la muerte se relaciona con el evento catastrofico. Sin ella la ADRES no paga.",
    requisito: "Solicitud ante el Consejo Municipal o Departamental de Gestion del Riesgo.",
    certificaEntidad: "CMGRD o CDGRD",
    norma: "Ley 1523 de 2012",
  },

  // ── Subsistencia inmediata ───────────────────────────────────────────────────
  {
    nombre: "Kits de asistencia humanitaria",
    entidad: "UNGRD",
    ambito: "NACIONAL",
    tipo: "ALIMENTACION_Y_KITS",
    destinatario: "HOGAR",
    estado: "VIGENTE",
    descripcion: "Alimentos, agua potable, colchonetas y articulos de higiene.",
    requisito: "Inscripcion en el Registro Unico de Damnificados.",
    requiereRud: true,
    canal: "Puntos de atencion oficiales",
  },
  {
    nombre: "Kits de asistencia humanitaria",
    entidad: "Defensa Civil Colombiana",
    ambito: "NACIONAL",
    tipo: "ALIMENTACION_Y_KITS",
    destinatario: "HOGAR",
    estado: "VIGENTE",
    descripcion: "Entrega de ayuda humanitaria en terreno.",
    requisito: "Inscripcion en el Registro Unico de Damnificados.",
    requiereRud: true,
  },
  {
    nombre: "Kits de asistencia humanitaria y evaluacion de viviendas",
    entidad: "Cruz Roja Colombiana",
    ambito: "EXTERNO",
    tipo: "ALIMENTACION_Y_KITS",
    destinatario: "HOGAR",
    estado: "VIGENTE",
    descripcion: "Ayuda humanitaria y evaluacion tecnica de viviendas afectadas.",
    requisito: "Solicitud de evaluacion previa en el punto de atencion municipal.",
    canal: "Puntos de atencion municipales",
  },

  // ── Salud e indemnizacion ────────────────────────────────────────────────────
  {
    nombre: "Indemnizacion por muerte y gastos funerarios",
    entidad: "ADRES, subcuenta ECAT",
    ambito: "NACIONAL",
    tipo: "INDEMNIZACION",
    destinatario: "PERSONA",
    estado: "VIGENTE",
    descripcion:
      "Indemnizacion a familias de victimas mortales y a personas con incapacidad permanente derivada del evento.",
    requisito:
      "Certificacion del CMGRD o CDGRD que relacione el hecho con el evento, y certificacion de la UNGRD.",
    certificaEntidad: "CMGRD o CDGRD, y UNGRD",
    monto: "Hasta $43.773.000 segun cifras de prensa para 2026. Confirmar con la ADRES.",
    canal: "servicios.adres.gov.co/ecat",
  },
  {
    nombre: "Pago de servicios de salud a victimas lesionadas",
    entidad: "ADRES, subcuenta ECAT",
    ambito: "NACIONAL",
    tipo: "SALUD",
    destinatario: "PERSONA",
    estado: "VIGENTE",
    descripcion:
      "Urgencias, cirugia, hospitalizacion, rehabilitacion y traslado. Lo reclama la IPS que atendio, no la persona.",
    requisito: "Que la atencion se relacione con el evento catastrofico.",
    monto: "Hasta $46.690.800 segun cifras de prensa para 2026. Confirmar con la ADRES.",
  },

  // ── Vivienda ─────────────────────────────────────────────────────────────────
  {
    nombre: "Subsidio temporal de arriendo",
    entidad: "Ministerio de Vivienda",
    ambito: "NACIONAL",
    tipo: "ALOJAMIENTO_TEMPORAL",
    destinatario: "HOGAR",
    estado: "VIGENTE",
    descripcion:
      "Para hogares cuya vivienda colapso, se perdio totalmente o quedo inhabitable. Primera etapa del plan de vivienda, mientras se define si la vivienda se repara o se demuele.",
    requisito:
      "Estar inscrito en el censo oficial y que la vivienda este declarada inhabitable tras inspeccion tecnica.",
    requiereRud: true,
    certificaEntidad: "Alcaldia municipal e inspeccion tecnica",
  },
  {
    nombre: "Plan de vivienda en tres etapas",
    entidad: "Ministerio de Vivienda",
    ambito: "NACIONAL",
    tipo: "VIVIENDA",
    destinatario: "HOGAR",
    estado: "ANUNCIADO",
    descripcion:
      "Atencion inmediata con arriendo, diagnostico tecnico de la vivienda, y reconstruccion o reparacion estructural. Se ejecuta con participacion del sector privado de la construccion.",
    requisito: "Inscripcion en el censo oficial y diagnostico tecnico de la vivienda.",
    requiereRud: true,
  },
  {
    nombre: "Evaluacion tecnica de habitabilidad de vivienda",
    entidad: "Cuerpo de Bomberos y organismos de socorro",
    ambito: "MUNICIPAL",
    tipo: "EVALUACION_TECNICA",
    destinatario: "HOGAR",
    estado: "VIGENTE",
    descripcion:
      "Determina si la vivienda se puede habitar, reparar o debe demolerse. Es el dato que decide a que etapa del plan de vivienda pasa el hogar.",
    requisito: "Solicitud en el punto de atencion municipal.",
    certificaEntidad: "Cuerpo de Bomberos",
  },
  {
    nombre: "Alivio en el pago de servicios publicos",
    entidad: "Gobierno Nacional",
    ambito: "NACIONAL",
    tipo: "SERVICIOS_PUBLICOS",
    destinatario: "HOGAR",
    estado: "ANUNCIADO",
    descripcion: "Decreto que alivia el pago de servicios publicos a hogares afectados.",
    requisito: "Por reglamentar.",
    requiereRud: true,
  },

  // ── Ingresos, niñez y trabajo ────────────────────────────────────────────────
  {
    nombre: "Continuidad de transferencias y atencion virtual",
    entidad: "Prosperidad Social (DPS)",
    ambito: "NACIONAL",
    tipo: "EMPLEO_E_INGRESOS",
    destinatario: "HOGAR",
    estado: "VIGENTE",
    descripcion:
      "Ocho gerencias regionales cerraron por daños en su infraestructura: Caldas, Cauca, Choco, Meta, Quindio, Risaralda, Uraba y Valle del Cauca. La atencion sigue por WhatsApp, chat web, formulario PQRSDF y videollamada en Lengua de Señas Colombiana.",
    requisito: "Ser beneficiario de los programas de transferencias.",
    canal: "Canales virtuales de Prosperidad Social",
  },
  {
    nombre: "Reporte de niños, niñas y adolescentes no localizados",
    entidad: "ICBF",
    ambito: "NACIONAL",
    tipo: "NIÑEZ_Y_FAMILIA",
    destinatario: "PERSONA",
    estado: "VIGENTE",
    descripcion:
      "Canal habilitado para recibir informacion sobre menores desaparecidos o no localizados tras la emergencia.",
    requisito: "Ninguno.",
    canal: "icbfsismo@gmail.com",
  },
  {
    nombre: "Medidas de proteccion laboral",
    entidad: "Ministerio del Trabajo",
    ambito: "NACIONAL",
    tipo: "EMPLEO_E_INGRESOS",
    destinatario: "PERSONA",
    estado: "ANUNCIADO",
    descripcion: "Medidas de proteccion del empleo en los territorios afectados.",
    requisito: "Por reglamentar.",
  },

  // ── Alivios financieros y tributarios ────────────────────────────────────────
  {
    nombre: "Alivios crediticios",
    entidad: "Asobancaria y bancos afiliados",
    ambito: "EXTERNO",
    tipo: "ALIVIO_FINANCIERO",
    destinatario: "PERSONA",
    estado: "VIGENTE",
    descripcion:
      "Periodos de gracia de hasta doce meses, modificacion de condiciones de credito, tratamiento especial de tasas, proteccion del historial crediticio y suspension temporal del cobro juridico y prejuridico. Alcance estimado de 2,8 millones de usuarios.",
    requisito:
      "Cada banco evalua individualmente segun sus politicas y el nivel de daño sufrido. No es automatico.",
    canal: "Canales de cada banco",
  },
  {
    nombre: "Alivios tributarios",
    entidad: "DIAN y Ministerio de Hacienda",
    ambito: "NACIONAL",
    tipo: "ALIVIO_TRIBUTARIO",
    destinatario: "PERSONA",
    estado: "VIGENTE",
    descripcion:
      "Prorroga en la declaracion de renta y otras medidas de alivio. La DIAN anuncio mas de $86.000 millones en ayudas.",
    requisito:
      "Estar domiciliado en los departamentos afectados: Choco, Risaralda, Valle del Cauca y Quindio.",
  },
  {
    nombre: "Exencion temporal de predial e ICA",
    entidad: "Municipios afectados, con compensacion nacional",
    ambito: "MUNICIPAL",
    tipo: "ALIVIO_TRIBUTARIO",
    destinatario: "PERSONA",
    estado: "ANUNCIADO",
    descripcion:
      "Propuesta de exencion temporal del impuesto predial y del ICA, con compensacion de la Nacion al municipio por el ingreso que deja de recibir.",
    requisito: "Por reglamentar.",
  },
];
