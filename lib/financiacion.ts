import { prisma } from "@/lib/db";
import { desdeDecimal, CERO, type Pesos } from "@/lib/dinero";
import { calcularBrecha, aportesVigentes, type Brecha } from "@/lib/brecha";
import { costoVigente } from "@/lib/consultas";
import { priorizar } from "@/lib/prioridad";
import { proyectarCola, type ObraConOrigen, type PosicionEnCola } from "@/lib/cola";

/**
 * Une el inventario priorizado con el dinero: brecha por obra y proyeccion de la cola
 * de financiacion de un municipio.
 *
 * Toda la aritmetica vive en funciones puras (`brecha.ts`, `cola.ts`, `prioridad.ts`).
 * Aqui solo se consulta y se arma.
 */

export type ObraFinanciada = {
  id: string;
  nombre: string;
  municipioId: string;
  brecha: Brecha;
  posicion: PosicionEnCola | null;
  creadoEn: Date;
};

/** La capacidad vigente es la del reporte mas reciente. */
export async function capacidadVigenteDe(municipioId: string) {
  return prisma.capacidadFiscal.findFirst({
    where: { municipioId },
    orderBy: { fechaReporte: "desc" },
  });
}

const DIAS_PARA_VENCER = 365;

export function capacidadVencida(fechaReporte: Date, hoy: Date): boolean {
  const dias = (hoy.getTime() - fechaReporte.getTime()) / (1000 * 60 * 60 * 24);
  return dias > DIAS_PARA_VENCER;
}

/**
 * Obras de un municipio, priorizadas, con su brecha y su lugar en la cola.
 *
 * Solo las costeadas entran a la cola: una obra sin costo no tiene brecha que repartir.
 * Las demas siguen en el inventario con su prioridad, sin cifras.
 */
export async function colaDelMunicipio(municipioId: string, hoy: Date) {
  const [obras, capacidad] = await Promise.all([
    prisma.obra.findMany({
      where: { item: { municipioId } },
      include: {
        item: { include: { municipio: { select: { nombre: true, nbi: true } } } },
        costos: { orderBy: { creadoEn: "desc" } },
        aportes: {
          orderBy: { creadoEn: "desc" },
          include: { actor: { select: { nombre: true } } },
        },
        intervenciones: { orderBy: { creadoEn: "desc" } },
      },
    }),
    capacidadVigenteDe(municipioId),
  ]);

  const conBrecha = obras.map((obra) => {
    const vigente = costoVigente(obra.costos);
    const brecha = calcularBrecha(
      vigente ? desdeDecimal(vigente.valor) : null,
      obra.aportes.map((a) => ({
        id: a.id,
        monto: desdeDecimal(a.monto),
        estado: a.estado,
        corrigeId: a.corrigeId,
      })),
      obra.intervenciones.map((i) => ({
        id: i.id,
        valorEquivalente: desdeDecimal(i.valorEquivalente),
        estado: i.estado,
      })),
    );

    // Cofinanciadores: aportantes vigentes agrupados por entidad, con cuanto pone cada uno.
    // Son entidades/actores, nunca personas afectadas (Principio IV).
    const porActor = new Map<string, Pesos>();
    for (const a of aportesVigentes(obra.aportes)) {
      porActor.set(a.actor.nombre, (porActor.get(a.actor.nombre) ?? CERO) + desdeDecimal(a.monto));
    }
    const cofinanciadores = [...porActor.entries()]
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((x, y) => (y.monto > x.monto ? 1 : y.monto < x.monto ? -1 : 0));

    return {
      id: obra.id,
      nombre: obra.item.nombre,
      municipioId,
      estado: obra.estado,
      cofinanciadores,
      categoria: obra.item.categoria,
      personasBeneficiadas: obra.item.personasBeneficiadas,
      mesesFueraDeServicio: obra.item.mesesFueraDeServicio,
      nbi: obra.item.municipio.nbi === null ? null : Number(obra.item.municipio.nbi),
      costoPorBeneficiado:
        brecha.costo !== null && obra.item.personasBeneficiadas
          ? Number(brecha.costo) / obra.item.personasBeneficiadas
          : null,
      creadoEn: obra.creadoEn,
      brecha,
    };
  });

  const priorizadas = priorizar(conBrecha);

  // A la cola solo entran las que tienen costo: sin costo no hay brecha que repartir.
  const enCola: ObraConOrigen[] = priorizadas
    .filter((o) => o.brecha.costo !== null)
    .map((o) => ({ id: o.id, brecha: o.brecha.brecha, creadoEn: o.creadoEn }));

  const montoAnual: Pesos = capacidad ? desdeDecimal(capacidad.montoAnual) : CERO;
  const proyeccion = proyectarCola(enCola, montoAnual);
  const porId = new Map(proyeccion.posiciones.map((p) => [p.id, p]));

  return {
    obras: priorizadas.map((o) => ({ ...o, cola: porId.get(o.id) ?? null })),
    enCola,
    capacidad,
    montoAnual,
    proyeccion,
    vencida: capacidad ? capacidadVencida(capacidad.fechaReporte, hoy) : false,
  };
}
