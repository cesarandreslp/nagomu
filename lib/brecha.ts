import { CERO, restarSinBajarDeCero, sumar, type Pesos } from "@/lib/dinero";
import { cuentaComo } from "@/lib/intervenciones";
import type { EstadoAporte, EstadoIntervencion } from "@/lib/generated/prisma/enums";

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

export type IntervencionParaBrecha = {
  id: string;
  valorEquivalente: Pesos;
  estado: EstadoIntervencion;
};

export function calcularBrecha(
  costo: Pesos | null,
  aportes: readonly AporteParaBrecha[],
  intervenciones: readonly IntervencionParaBrecha[] = [],
): Brecha {
  const vigentes = aportesVigentes(aportes);

  // Una intervencion recibida a satisfaccion es alcance que ya no hay que financiar,
  // asi que pesa igual que plata girada. Una aprobada todavia es una promesa.
  const ejecutadasEnEspecie = intervenciones.filter((i) => cuentaComo(i.estado) === "EJECUTADO");
  const comprometidasEnEspecie = intervenciones.filter(
    (i) => cuentaComo(i.estado) === "COMPROMETIDO",
  );

  const girado = sumar(
    ...vigentes.filter((a) => a.estado !== "COMPROMETIDO").map((a) => a.monto),
    ...ejecutadasEnEspecie.map((i) => i.valorEquivalente),
  );
  const comprometido = sumar(
    ...vigentes.filter((a) => a.estado === "COMPROMETIDO").map((a) => a.monto),
    ...comprometidasEnEspecie.map((i) => i.valorEquivalente),
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
