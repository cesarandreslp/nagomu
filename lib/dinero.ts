/**
 * Aritmetica de dinero para nagomu.
 *
 * Los montos se representan como `bigint` de centavos. Nunca `number`: son recursos
 * publicos y un peso perdido por redondeo de punto flotante es un descuadre que
 * alguien tiene que explicar ante un concejo.
 *
 * Este modulo no conoce Prisma ni la base de datos: es aritmetica pura y se prueba
 * sin infraestructura. La conversion desde y hacia las columnas `Decimal(18,2)`
 * ocurre en la frontera, con `desdeDecimal` y `aDecimal`.
 */

/** Monto en centavos de peso colombiano. */
export type Pesos = bigint;

export const CERO: Pesos = 0n;

const CENTAVOS_POR_PESO = 100n;

/**
 * Convierte una cadena a centavos. Acepta "3000000000", "3000000000.50",
 * "3.000.000.000,50" y "$ 3.000.000.000,50".
 *
 * Lanza si la entrada no es un monto valido: un monto mal digitado debe fallar
 * ruidosamente, no convertirse en cero en silencio.
 */
export function parsearPesos(entrada: string): Pesos {
  const limpio = entrada.trim().replace(/^\$\s*/, "").replace(/\s/g, "");
  if (limpio === "") throw new Error("Monto vacio");

  // Formato colombiano (1.234,56) frente a formato simple (1234.56).
  const normalizado = limpio.includes(",")
    ? limpio.replace(/\./g, "").replace(",", ".")
    : limpio;

  const coincidencia = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalizado);
  if (!coincidencia) throw new Error(`Monto invalido: ${entrada}`);

  const [, signo, enteros, decimales = ""] = coincidencia;
  const centavos = BigInt(enteros!) * CENTAVOS_POR_PESO + BigInt(decimales.padEnd(2, "0"));
  return signo === "-" ? -centavos : centavos;
}

/** Convierte lo que viene de una columna Decimal(18,2) a centavos. */
export function desdeDecimal(valor: { toString(): string }): Pesos {
  return parsearPesos(valor.toString());
}

/** Cadena "1234.56" para persistir en una columna Decimal(18,2). */
export function aDecimal(monto: Pesos): string {
  const negativo = monto < CERO;
  const absoluto = negativo ? -monto : monto;
  const enteros = absoluto / CENTAVOS_POR_PESO;
  const centavos = absoluto % CENTAVOS_POR_PESO;
  return `${negativo ? "-" : ""}${enteros}.${centavos.toString().padStart(2, "0")}`;
}

/** Formato colombiano legible: "$ 3.000.000.000,50". */
export function formatearPesos(monto: Pesos): string {
  const negativo = monto < CERO;
  const absoluto = negativo ? -monto : monto;
  const enteros = (absoluto / CENTAVOS_POR_PESO).toString();
  const centavos = (absoluto % CENTAVOS_POR_PESO).toString().padStart(2, "0");
  const conPuntos = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negativo ? "-" : ""}$ ${conPuntos},${centavos}`;
}

export function sumar(...montos: Pesos[]): Pesos {
  return montos.reduce((acumulado, monto) => acumulado + monto, CERO);
}

export function restar(a: Pesos, b: Pesos): Pesos {
  return a - b;
}

/** Nunca negativo: una brecha cubierta de mas es cero, no un numero en rojo. */
export function restarSinBajarDeCero(a: Pesos, b: Pesos): Pesos {
  const resultado = a - b;
  return resultado > CERO ? resultado : CERO;
}

export function esPositivo(monto: Pesos): boolean {
  return monto > CERO;
}

/**
 * Cuantos periodos completos se necesitan para cubrir `monto` a razon de
 * `porPeriodo`. Redondea hacia arriba: cubrir el 10% de un año exige el año entero.
 *
 * Devuelve `null` cuando no hay capacidad, porque "infinitos años" no es un numero
 * que se pueda mostrar en pantalla sin mentir.
 */
export function periodosParaCubrir(monto: Pesos, porPeriodo: Pesos): number | null {
  if (monto <= CERO) return 0;
  if (porPeriodo <= CERO) return null;
  const completos = monto / porPeriodo;
  const sobra = monto % porPeriodo;
  return Number(sobra > CERO ? completos + 1n : completos);
}
