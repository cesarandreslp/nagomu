import { describe, expect, it } from "vitest";
import { CERO, parsearPesos } from "@/lib/dinero";
import {
  HORIZONTE_ANIOS,
  brechaTotal,
  explicarDesplazamiento,
  impactoDeAportar,
  proyectarConAportes,
  proyectarCola,
} from "@/lib/cola";
import { calcularBrecha } from "@/lib/brecha";
import { capacidadVencida } from "@/lib/financiacion";

const M = (texto: string) => parsearPesos(texto);
const CAPACIDAD = M("500000000"); // 500 millones al año

describe("reparto de la capacidad", () => {
  it("la primera obra consume hasta cerrar su brecha y el remanente pasa a la siguiente", () => {
    // 800M de capacidad: la primera obra de 500M cierra en el año 0 y sobran 300M,
    // con los que la segunda de 300M tambien cierra el año 0.
    const p = proyectarCola(
      [
        { id: "a", brecha: M("500000000") },
        { id: "b", brecha: M("300000000") },
      ],
      M("800000000"),
    );

    expect(p.posiciones[0]!.anioCierre).toBe(0);
    expect(p.posiciones[1]!.anioInicio).toBe(0);
    expect(p.posiciones[1]!.anioCierre).toBe(0);
  });

  it("una obra que excede la capacidad de un año se lleva varios", () => {
    const p = proyectarCola([{ id: "a", brecha: M("1200000000") }], CAPACIDAD);

    expect(p.posiciones[0]!.anioInicio).toBe(0);
    expect(p.posiciones[0]!.anioCierre).toBe(2); // 500 + 500 + 200
  });

  it("la segunda obra no empieza hasta que la primera cierra", () => {
    const p = proyectarCola(
      [
        { id: "muro", brecha: M("1200000000") },
        { id: "teatro", brecha: M("500000000") },
      ],
      CAPACIDAD,
    );

    expect(p.posiciones[0]!.anioCierre).toBe(2);
    expect(p.posiciones[1]!.anioInicio).toBe(2);
  });

  it("una obra ya cubierta no consume capacidad ni ocupa años", () => {
    const p = proyectarCola(
      [
        { id: "cubierta", brecha: CERO },
        { id: "pendiente", brecha: M("500000000") },
      ],
      CAPACIDAD,
    );

    expect(p.posiciones[0]!.cubierta).toBe(true);
    expect(p.posiciones[1]!.anioInicio).toBe(0);
    expect(p.posiciones[1]!.anioCierre).toBe(0);
  });

  it("conserva el orden recibido: la prioridad la decide otro modulo", () => {
    const p = proyectarCola(
      [
        { id: "primera", brecha: M("100") },
        { id: "segunda", brecha: M("100") },
      ],
      M("1000"),
    );

    expect(p.posiciones.map((x) => x.id)).toEqual(["primera", "segunda"]);
    expect(p.posiciones.map((x) => x.posicion)).toEqual([1, 2]);
  });
});

describe("cuando la cola no avanza", () => {
  it("sin capacidad no se proyectan plazos, en vez de inventar numeros", () => {
    const p = proyectarCola([{ id: "a", brecha: M("100") }], CERO);

    expect(p.bloqueada).toBe(true);
    expect(p.posiciones[0]!.anioInicio).toBeNull();
    expect(p.posiciones[0]!.anioCierre).toBeNull();
  });

  it("mas alla del horizonte se dice sin financiacion previsible, no un numero enorme", () => {
    const enorme = M("1000000000000");
    const p = proyectarCola(
      [
        { id: "gigante", brecha: enorme },
        { id: "detras", brecha: M("100") },
      ],
      CAPACIDAD,
    );

    expect(p.posiciones[0]!.anioCierre).toBeNull();
    expect(p.posiciones[1]!.anioInicio).toBeNull();
    expect(p.bloqueada).toBe(true);
  });

  it("el horizonte es de treinta años", () => {
    expect(HORIZONTE_ANIOS).toBe(30);
  });
});

describe("efecto en cadena de un aporte", () => {
  it("aportar a la primera adelanta a las que venian detras sin darles un peso", () => {
    const obras = [
      { id: "muro", brecha: M("1500000000") },
      { id: "escuela", brecha: M("500000000") },
      { id: "teatro", brecha: M("500000000") },
    ];

    const solo = proyectarCola(obras, CAPACIDAD);
    const conAporte = proyectarConAportes(obras, CAPACIDAD, { muro: M("1000000000") });

    expect(solo.posiciones[2]!.anioInicio).toBe(4);
    expect(conAporte.posiciones[2]!.anioInicio).toBe(2);
  });

  it("mide cuantas obras adelanta un aporte y cuantos años ahorra en total", () => {
    const obras = [
      { id: "muro", brecha: M("1500000000") },
      { id: "escuela", brecha: M("500000000") },
      { id: "teatro", brecha: M("500000000") },
    ];

    const impacto = impactoDeAportar(obras, CAPACIDAD, "muro", M("1000000000"));

    expect(impacto.obrasAdelantadas).toBe(3);
    expect(impacto.aniosAhorradosEnTotal).toBeGreaterThan(0);
  });

  it("un aporte que cubre toda la brecha la marca como cubierta", () => {
    const p = proyectarConAportes([{ id: "a", brecha: M("500") }], M("1000"), {
      a: M("500"),
    });

    expect(p.posiciones[0]!.cubierta).toBe(true);
  });
});

describe("explicar el desplazamiento", () => {
  const viejo = new Date("2026-08-01T00:00:00Z");
  const nuevo = new Date("2026-09-01T00:00:00Z");

  it("dice cuantos años se retraso una obra y por cual", () => {
    // El muro entro despues pero va de primero por prioridad, y empuja al teatro.
    const obras = [
      { id: "muro", brecha: M("1000000000"), creadoEn: nuevo },
      { id: "teatro", brecha: M("500000000"), creadoEn: viejo },
    ];

    const explicacion = explicarDesplazamiento(obras, CAPACIDAD, "teatro");

    expect(explicacion).not.toBeNull();
    expect(explicacion!.anios).toBe(2);
    expect(explicacion!.desplazadaPor).toEqual(["muro"]);
  });

  it("no hay desplazamiento si la de adelante ya existia antes", () => {
    const obras = [
      { id: "muro", brecha: M("1000000000"), creadoEn: viejo },
      { id: "teatro", brecha: M("500000000"), creadoEn: nuevo },
    ];

    expect(explicarDesplazamiento(obras, CAPACIDAD, "teatro")).toBeNull();
  });

  it("la primera de la fila nunca esta desplazada", () => {
    const obras = [
      { id: "muro", brecha: M("1000000000"), creadoEn: nuevo },
      { id: "teatro", brecha: M("500000000"), creadoEn: viejo },
    ];

    expect(explicarDesplazamiento(obras, CAPACIDAD, "muro")).toBeNull();
  });
});

describe("brecha", () => {
  const aporte = (id: string, monto: string, estado: "COMPROMETIDO" | "GIRADO" | "EJECUTADO", corrigeId: string | null = null) => ({
    id,
    monto: M(monto),
    estado,
    corrigeId,
  });

  it("resta lo girado y lo comprometido", () => {
    const b = calcularBrecha(M("3000000000"), [
      aporte("1", "200000000", "GIRADO"),
      aporte("2", "700000000", "COMPROMETIDO"),
    ]);

    expect(b.girado).toBe(M("200000000"));
    expect(b.comprometido).toBe(M("700000000"));
    expect(b.brecha).toBe(M("2100000000"));
  });

  it("distingue lo prometido de lo que efectivamente salio", () => {
    const b = calcularBrecha(M("1000"), [aporte("1", "400", "COMPROMETIDO")]);

    expect(b.brecha).toBe(M("600"));
    expect(b.brechaSinPromesas).toBe(M("1000"));
  });

  it("un aporte corregido deja de contar", () => {
    const b = calcularBrecha(M("1000"), [
      aporte("1", "400", "GIRADO"),
      aporte("2", "250", "GIRADO", "1"),
    ]);

    expect(b.girado).toBe(M("250"));
  });

  it("sin costo no hay brecha que calcular", () => {
    const b = calcularBrecha(null, [aporte("1", "400", "GIRADO")]);

    expect(b.costo).toBeNull();
    expect(b.brecha).toBe(CERO);
    expect(b.girado).toBe(M("400"));
  });

  it("aportes que superan el costo dan brecha cero y excedente, nunca negativo", () => {
    const b = calcularBrecha(M("1000"), [aporte("1", "1200", "GIRADO")]);

    expect(b.brecha).toBe(CERO);
    expect(b.excedente).toBe(M("200"));
  });
});

describe("vigencia de la capacidad fiscal", () => {
  const hoy = new Date("2026-08-17T00:00:00Z");

  it("un reporte reciente sirve", () => {
    expect(capacidadVencida(new Date("2026-06-01T00:00:00Z"), hoy)).toBe(false);
  });

  it("uno de hace mas de un año no", () => {
    expect(capacidadVencida(new Date("2025-06-01T00:00:00Z"), hoy)).toBe(true);
  });

  it("justo en el limite todavia sirve", () => {
    expect(capacidadVencida(new Date("2025-08-18T00:00:00Z"), hoy)).toBe(false);
  });
});

describe("brecha total", () => {
  it("suma lo que falta en todas las obras", () => {
    expect(brechaTotal([{ id: "a", brecha: M("100") }, { id: "b", brecha: M("250") }])).toBe(
      M("350"),
    );
  });
});
