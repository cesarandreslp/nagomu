import { CERO, restarSinBajarDeCero, sumar, type Pesos } from "@/lib/dinero";
import type { EstadoAporte } from "@/lib/generated/prisma/enums";

/**
 * Cuanto falta para financiar una obra.
 *
 * Funcion pura: recibe numeros y devuelve numeros. No sabe de Prisma ni de HTTP.
 */

export type AporteParaBrecha = {
  id: string;
  monto: Pesos;
  estado: EstadoAporte;
  corrigeId: string | null;
};

export type Brecha = {
  /** Costo vigente de la obra. Null mientras ningun estudio lo haya determinado. */
  costo: Pesos | null;
  /** Plata que ya salio de la entidad o ya se gasto. */
  girado: Pesos;
  /** Plata prometida que todavia no sale. */
  comprometido: Pesos;
  /**
   * Lo que falta contando lo prometido. Es la cifra con la que se proyecta la cola:
   * si alguien se comprometio, esa parte tiene doliente.
   */
  brecha: Pesos;
  /**
   * Lo que falta contando solo lo que efectivamente salio. Es mayor o igual que la
   * anterior, y la diferencia es exactamente el riesgo de que una promesa no se cumpla.
   */
  brechaSinPromesas: Pesos;
  /** Cuanto se aporto de mas, si se aporto de mas. */
  excedente: Pesos;
};

/**
 * Un aporte corregido deja de contar: lo reemplaza la fila que lo corrige. Asi una
 * correccion no suma dos veces ni obliga a borrar el original.
 */
export function aportesVigentes<T extends { id: string; corrigeId: string | null }>(
  aportes: readonly T[],
): T[] {
  const corregidos = new Set(aportes.map((a) => a.corrigeId).filter(Boolean));
  return aportes.filter((a) => !corregidos.has(a.id));
}

export function calcularBrecha(
  costo: Pesos | null,
  aportes: readonly AporteParaBrecha[],
): Brecha {
  const vigentes = aportesVigentes(aportes);

  const girado = sumar(
    ...vigentes.filter((a) => a.estado !== "COMPROMETIDO").map((a) => a.monto),
  );
  const comprometido = sumar(
    ...vigentes.filter((a) => a.estado === "COMPROMETIDO").map((a) => a.monto),
  );

  if (costo === null) {
    return {
      costo: null,
      girado,
      comprometido,
      brecha: CERO,
      brechaSinPromesas: CERO,
      excedente: CERO,
    };
  }

  const total = sumar(girado, comprometido);

  return {
    costo,
    girado,
    comprometido,
    brecha: restarSinBajarDeCero(costo, total),
    brechaSinPromesas: restarSinBajarDeCero(costo, girado),
    excedente: restarSinBajarDeCero(total, costo),
  };
}
