import { CERO, sumar, type Pesos } from "@/lib/dinero";

/**
 * Cola de financiacion: en que año le toca a cada obra.
 *
 * La capacidad fiscal anual de un municipio no se reparte por igual entre sus obras:
 * se consume en orden de prioridad. La primera obra absorbe capacidad hasta cerrar su
 * brecha y solo el remanente pasa a la siguiente.
 *
 * Es la unica forma honesta de contarlo. Calcular el plazo de cada obra con la
 * capacidad completa diria que las veinte se hacen en tres años, y eso es falso:
 * compiten por la misma plata. La consecuencia de este modelo es que el sistema puede
 * decirle a un alcalde que su teatro no arranca hasta dentro de doce años, que es una
 * verdad incomoda pero verificable.
 *
 * Funcion pura, sin acceso a base de datos.
 */

/** Mas alla de esto no se proyecta: un numero de treinta y cuatro años no informa. */
export const HORIZONTE_ANIOS = 30;

export type ObraEnCola = {
  id: string;
  /** Lo que falta financiar. Cero si ya esta cubierta. */
  brecha: Pesos;
};

export type PosicionEnCola = {
  id: string;
  /** Lugar en la fila, empezando en 1. */
  posicion: number;
  /**
   * Años desde hoy en que empieza a recibir recursos propios. 0 es este año.
   * Null cuando queda fuera del horizonte de proyeccion.
   */
  anioInicio: number | null;
  /** Años desde hoy en que termina de cerrar su brecha. */
  anioCierre: number | null;
  /** Ya no necesita plata. */
  cubierta: boolean;
};

export type Proyeccion = {
  posiciones: PosicionEnCola[];
  /**
   * La cola no avanza: sin capacidad, o con una primera obra que la capacidad no
   * alcanza a cubrir dentro del horizonte.
   */
  bloqueada: boolean;
};

/**
 * Reparte la capacidad anual entre las obras, en el orden recibido.
 *
 * Las obras deben venir ya priorizadas: esta funcion no decide el orden, lo respeta.
 * Separar las dos cosas es a proposito — la prioridad es una regla publica y el
 * reparto es aritmetica.
 */
export function proyectarCola(
  obras: readonly ObraEnCola[],
  capacidadAnual: Pesos,
  horizonte = HORIZONTE_ANIOS,
): Proyeccion {
  const posiciones: PosicionEnCola[] = [];

  if (capacidadAnual <= CERO) {
    return {
      posiciones: obras.map((obra, i) => ({
        id: obra.id,
        posicion: i + 1,
        anioInicio: null,
        anioCierre: null,
        cubierta: obra.brecha <= CERO,
      })),
      bloqueada: obras.some((o) => o.brecha > CERO),
    };
  }

  let anio = 0;
  let disponibleEsteAnio = capacidadAnual;
  let sinFinanciacion = false;

  obras.forEach((obra, indice) => {
    if (obra.brecha <= CERO) {
      posiciones.push({
        id: obra.id,
        posicion: indice + 1,
        anioInicio: null,
        anioCierre: null,
        cubierta: true,
      });
      return;
    }

    // Si la obra anterior agoto la capacidad de este año, esta no recibe nada hasta
    // el siguiente. El año de inicio es aquel en que efectivamente entra plata, no
    // aquel en que le llega el turno: decir que arranca un año en el que no va a
    // recibir un peso es la clase de optimismo que vuelve inutil la proyeccion.
    if (disponibleEsteAnio <= CERO) {
      anio += 1;
      disponibleEsteAnio = capacidadAnual;
    }

    if (sinFinanciacion || anio >= horizonte) {
      sinFinanciacion = true;
      posiciones.push({
        id: obra.id,
        posicion: indice + 1,
        anioInicio: null,
        anioCierre: null,
        cubierta: false,
      });
      return;
    }

    const anioInicio = anio;
    let falta = obra.brecha;

    while (falta > CERO && anio < horizonte) {
      if (disponibleEsteAnio >= falta) {
        disponibleEsteAnio -= falta;
        falta = CERO;
      } else {
        falta -= disponibleEsteAnio;
        anio += 1;
        disponibleEsteAnio = capacidadAnual;
      }
    }

    if (falta > CERO) {
      sinFinanciacion = true;
      posiciones.push({
        id: obra.id,
        posicion: indice + 1,
        anioInicio,
        anioCierre: null,
        cubierta: false,
      });
      return;
    }

    posiciones.push({
      id: obra.id,
      posicion: indice + 1,
      anioInicio,
      anioCierre: anio,
      cubierta: false,
    });
  });

  return { posiciones, bloqueada: sinFinanciacion };
}

export type Escenario = {
  nombre: string;
  /** Aporte hipotetico por obra. */
  aportes: Record<string, Pesos>;
  proyeccion: Proyeccion;
};

/**
 * Recalcula la cola completa con aportes hipoteticos incorporados.
 *
 * Recalcular todo y no solo la obra que recibe el aporte es el punto: cuando alguien
 * financia la obra que va de primera, la fila entera se corre hacia adelante y las que
 * venian detras adelantan su año de inicio sin haber recibido un peso. Ese efecto en
 * cadena es el argumento mas fuerte que un municipio le puede dar a una gobernacion.
 */
export function proyectarConAportes(
  obras: readonly ObraEnCola[],
  capacidadAnual: Pesos,
  aportes: Record<string, Pesos>,
  horizonte = HORIZONTE_ANIOS,
): Proyeccion {
  const conAportes = obras.map((obra) => {
    const aporte = aportes[obra.id] ?? CERO;
    const brecha = obra.brecha - aporte;
    return { id: obra.id, brecha: brecha > CERO ? brecha : CERO };
  });

  return proyectarCola(conAportes, capacidadAnual, horizonte);
}

/**
 * Cuanto se retrasa una obra por las que se le metieron adelante despues de que ella
 * ya existia.
 *
 * No hace falta guardar historia de la cola: basta comparar la proyeccion actual con
 * la que habria si las obras de mayor prioridad creadas despues no existieran. La
 * diferencia son los años de retraso, y las culpables son esas obras.
 *
 * El sistema explica asi sus propios retrasos, en vez de dejar que alguien tenga que
 * averiguarlos.
 */
export type ObraConOrigen = ObraEnCola & { creadoEn: Date };

export function explicarDesplazamiento(
  obrasOrdenadas: readonly ObraConOrigen[],
  capacidadAnual: Pesos,
  obraId: string,
  horizonte = HORIZONTE_ANIOS,
): { anios: number; desplazadaPor: string[] } | null {
  const indice = obrasOrdenadas.findIndex((o) => o.id === obraId);
  if (indice === -1) return null;

  const obra = obrasOrdenadas[indice]!;

  // Obras que van antes en la fila pero entraron al inventario despues que esta.
  const posteriores = obrasOrdenadas
    .slice(0, indice)
    .filter((o) => o.creadoEn.getTime() > obra.creadoEn.getTime());

  if (posteriores.length === 0) return null;

  const ahora = proyectarCola(obrasOrdenadas, capacidadAnual, horizonte);
  const excluidas = new Set(posteriores.map((o) => o.id));
  const antes = proyectarCola(
    obrasOrdenadas.filter((o) => !excluidas.has(o.id)),
    capacidadAnual,
    horizonte,
  );

  const conActual = ahora.posiciones.find((p) => p.id === obraId);
  const conAnterior = antes.posiciones.find((p) => p.id === obraId);

  if (!conActual || !conAnterior) return null;
  if (conActual.anioInicio === null || conAnterior.anioInicio === null) {
    return { anios: 0, desplazadaPor: posteriores.map((o) => o.id) };
  }

  const anios = conActual.anioInicio - conAnterior.anioInicio;
  if (anios <= 0) return null;

  return { anios, desplazadaPor: posteriores.map((o) => o.id) };
}

/** Cuanto adelanta cada obra si una entidad aporta cierto monto a la primera con brecha. */
export function impactoDeAportar(
  obrasOrdenadas: readonly ObraEnCola[],
  capacidadAnual: Pesos,
  obraId: string,
  monto: Pesos,
  horizonte = HORIZONTE_ANIOS,
): { obrasAdelantadas: number; aniosAhorradosEnTotal: number } {
  const base = proyectarCola(obrasOrdenadas, capacidadAnual, horizonte);
  const con = proyectarConAportes(obrasOrdenadas, capacidadAnual, { [obraId]: monto }, horizonte);

  let obrasAdelantadas = 0;
  let aniosAhorradosEnTotal = 0;

  for (const antes of base.posiciones) {
    const despues = con.posiciones.find((p) => p.id === antes.id);
    if (!despues || antes.anioCierre === null || despues.anioCierre === null) continue;

    const ahorro = antes.anioCierre - despues.anioCierre;
    if (ahorro > 0) {
      obrasAdelantadas += 1;
      aniosAhorradosEnTotal += ahorro;
    }
  }

  return { obrasAdelantadas, aniosAhorradosEnTotal };
}

/** Suma de brechas, para mostrar cuanto falta en total. */
export function brechaTotal(obras: readonly ObraEnCola[]): Pesos {
  return sumar(...obras.map((o) => o.brecha));
}
