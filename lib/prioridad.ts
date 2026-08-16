import type { CategoriaItem } from "@/lib/generated/prisma/enums";

/**
 * Prioridad de una obra: nivel, puntaje y ordenamiento.
 *
 * Funciones puras. No consultan la base y se prueban sin infraestructura, porque
 * FR-007 exige que un tercero pueda reproducir el orden a partir de los datos
 * visibles. Si un alcalde pregunta por que su escuela quedo de numero 47, la
 * respuesta tiene que ser una regla que cualquiera pueda leer y recalcular a mano,
 * no la salida de un modelo que nadie puede auditar.
 */

export type NivelPrioridad = 0 | 1 | 2 | 3 | 4 | 5;

/** El nivel manda sobre el puntaje: un teatro nunca supera a una escuela (FR-003). */
export const NIVELES: Record<NivelPrioridad, { titulo: string; ods: string[] }> = {
  0: { titulo: "Vida y subsistencia", ods: ["ODS 1", "ODS 2", "ODS 6"] },
  1: { titulo: "Riesgo activo", ods: ["ODS 11.5", "ODS 13"] },
  2: { titulo: "Servicios esenciales", ods: ["ODS 3", "ODS 6", "ODS 9"] },
  3: { titulo: "Educacion", ods: ["ODS 4"] },
  4: { titulo: "Productivo", ods: ["ODS 8", "ODS 9"] },
  5: { titulo: "Cultural y recreativo", ods: ["ODS 11.4"] },
};

const NIVEL_POR_CATEGORIA: Record<CategoriaItem, NivelPrioridad> = {
  SUBSISTENCIA: 0,
  MITIGACION_RIESGO: 1,
  ESTRUCTURA_EN_RIESGO: 1,
  SALUD: 2,
  ACUEDUCTO: 2,
  VIA_UNICA_ACCESO: 2,
  EDUCACION: 3,
  PRODUCTIVO: 4,
  VIA_SECUNDARIA: 4,
  CULTURAL: 5,
  RECREATIVO: 5,
};

export const ETIQUETA_CATEGORIA: Record<CategoriaItem, string> = {
  SUBSISTENCIA: "Alimentacion, agua o alojamiento",
  MITIGACION_RIESGO: "Mitigacion de riesgo (muro de contencion, estabilizacion)",
  ESTRUCTURA_EN_RIESGO: "Estructura en riesgo de colapso",
  SALUD: "Salud (hospital, puesto de salud)",
  ACUEDUCTO: "Acueducto o alcantarillado",
  VIA_UNICA_ACCESO: "Via unica de acceso",
  EDUCACION: "Educacion (escuela, colegio)",
  PRODUCTIVO: "Productivo (mercado, riego)",
  VIA_SECUNDARIA: "Via secundaria",
  CULTURAL: "Cultural (teatro, casa de la cultura)",
  RECREATIVO: "Recreativo (parque, escenario deportivo)",
};

/**
 * Pesos de la formula (FR-008). Configurables y consultables por cualquier usuario:
 * la pantalla de una obra los muestra junto a sus factores.
 *
 * ponytail: constantes en codigo. Pasarlos a una tabla cuando alguien necesite
 * calibrarlos sin desplegar. Los valores actuales son provisionales y deben ajustarse
 * con datos reales del piloto antes de usarse para repartir plata.
 */
export const PESOS = {
  /** Cuanto pesa la vulnerabilidad del municipio. Con 1, un NBI de 80 multiplica por 1,8. */
  vulnerabilidad: 1,
  /** Cuanto pesa el tiempo sin servicio. Con 1, doce meses multiplican por 2. */
  tiempo: 1,
  /** Tope del factor de tiempo: sin el, una obra vieja desplazaria a una urgente. */
  topeTiempo: 2,
} as const;

export type Factores = {
  personasBeneficiadas: number | null;
  nbi: number | null;
  mesesFueraDeServicio: number;
  factorVulnerabilidad: number;
  factorTiempo: number;
};

export type Puntaje = {
  nivel: NivelPrioridad;
  titulo: string;
  ods: string[];
  /** Null cuando faltan datos: la obra no se excluye, va al final de su nivel. */
  valor: number | null;
  incompleto: boolean;
  factores: Factores;
};

export function nivelDe(categoria: CategoriaItem): NivelPrioridad {
  return NIVEL_POR_CATEGORIA[categoria];
}

export type DatosPuntaje = {
  categoria: CategoriaItem;
  personasBeneficiadas: number | null;
  mesesFueraDeServicio: number;
  /** Indice de vulnerabilidad del municipio, 0 a 100. Null se toma como neutro. */
  nbi: number | null;
};

export function calcularPuntaje(datos: DatosPuntaje): Puntaje {
  const nivel = nivelDe(datos.categoria);
  const factorVulnerabilidad = 1 + ((datos.nbi ?? 0) / 100) * PESOS.vulnerabilidad;
  const factorTiempo = Math.min(
    1 + (Math.max(datos.mesesFueraDeServicio, 0) / 12) * PESOS.tiempo,
    PESOS.topeTiempo,
  );

  const incompleto = datos.personasBeneficiadas === null || datos.personasBeneficiadas <= 0;
  const valor = incompleto
    ? null
    : datos.personasBeneficiadas! * factorVulnerabilidad * factorTiempo;

  return {
    nivel,
    titulo: NIVELES[nivel].titulo,
    ods: NIVELES[nivel].ods,
    valor,
    incompleto,
    factores: {
      personasBeneficiadas: datos.personasBeneficiadas,
      nbi: datos.nbi,
      mesesFueraDeServicio: datos.mesesFueraDeServicio,
      factorVulnerabilidad,
      factorTiempo,
    },
  };
}

export type Priorizable = DatosPuntaje & {
  id: string;
  /** Solo existe cuando la obra ya esta costeada. Sirve de desempate. */
  costoPorBeneficiado: number | null;
  creadoEn: Date;
};

export type Priorizada<T extends Priorizable> = T & { puntaje: Puntaje; posicion: number };

/**
 * Orden: nivel ascendente, luego puntaje descendente, luego costo por beneficiado
 * ascendente cuando exista, y finalmente fecha de creacion.
 *
 * El ultimo criterio no es decorativo: sin un desempate determinista, dos obras con
 * los mismos numeros cambiarian de puesto entre recargas y la lista dejaria de ser
 * reproducible.
 */
export function priorizar<T extends Priorizable>(items: readonly T[]): Priorizada<T>[] {
  return items
    .map((item) => ({ ...item, puntaje: calcularPuntaje(item) }))
    .sort((a, b) => {
      if (a.puntaje.nivel !== b.puntaje.nivel) return a.puntaje.nivel - b.puntaje.nivel;

      // Las incompletas van al final de su nivel, nunca fuera de la lista.
      if (a.puntaje.incompleto !== b.puntaje.incompleto) return a.puntaje.incompleto ? 1 : -1;

      if (!a.puntaje.incompleto && a.puntaje.valor !== b.puntaje.valor) {
        return b.puntaje.valor! - a.puntaje.valor!;
      }

      const costoA = a.costoPorBeneficiado;
      const costoB = b.costoPorBeneficiado;
      if (costoA !== null && costoB !== null && costoA !== costoB) return costoA - costoB;
      if (costoA !== null && costoB === null) return -1;
      if (costoA === null && costoB !== null) return 1;

      const tiempo = a.creadoEn.getTime() - b.creadoEn.getTime();
      return tiempo !== 0 ? tiempo : a.id.localeCompare(b.id);
    })
    .map((item, indice) => ({ ...item, posicion: indice + 1 }));
}
