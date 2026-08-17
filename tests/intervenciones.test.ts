import { describe, expect, it } from "vitest";
import {
  cuentaComo,
  estaVencida,
  puedeTransicionar,
  transicionesPosibles,
} from "@/lib/intervenciones";
import { calcularBrecha } from "@/lib/brecha";
import { CERO, parsearPesos } from "@/lib/dinero";

const M = (t: string) => parsearPesos(t);

describe("transiciones validas", () => {
  it("el camino normal: solicitada, aprobada, en ejecucion, recibida", () => {
    expect(puedeTransicionar("SOLICITADA", "APROBADA", null).valida).toBe(true);
    expect(puedeTransicionar("APROBADA", "EN_EJECUCION", null).valida).toBe(true);
    expect(puedeTransicionar("EN_EJECUCION", "RECIBIDA", null).valida).toBe(true);
  });

  it("una suspension no es el final: se corrige y se retoma", () => {
    expect(puedeTransicionar("SUSPENDIDA", "EN_EJECUCION", null).valida).toBe(true);
  });
});

describe("transiciones rechazadas", () => {
  it("no se recibe algo que nunca se aprobo", () => {
    expect(puedeTransicionar("SOLICITADA", "RECIBIDA", null).valida).toBe(false);
  });

  it("no se salta la aprobacion", () => {
    expect(puedeTransicionar("SOLICITADA", "EN_EJECUCION", null).valida).toBe(false);
  });

  it("lo recibido y lo rechazado ya no se mueven", () => {
    expect(transicionesPosibles("RECIBIDA")).toEqual([]);
    expect(transicionesPosibles("RECHAZADA")).toEqual([]);

    const r = puedeTransicionar("RECIBIDA", "SUSPENDIDA", "por si acaso");
    expect(r.valida).toBe(false);
    if (!r.valida) expect(r.motivo).toContain("ya no cambia");
  });

  it("no se suspende algo que apenas se solicito", () => {
    expect(puedeTransicionar("SOLICITADA", "SUSPENDIDA", "motivo").valida).toBe(false);
  });
});

describe("rechazar y suspender exigen decir por que", () => {
  it("sin motivo no pasa", () => {
    expect(puedeTransicionar("SOLICITADA", "RECHAZADA", null).valida).toBe(false);
    expect(puedeTransicionar("SOLICITADA", "RECHAZADA", "   ").valida).toBe(false);
    expect(puedeTransicionar("EN_EJECUCION", "SUSPENDIDA", "").valida).toBe(false);
  });

  it("con motivo si", () => {
    expect(puedeTransicionar("SOLICITADA", "RECHAZADA", "No acredita experiencia").valida).toBe(
      true,
    );
    expect(
      puedeTransicionar("EN_EJECUCION", "SUSPENDIDA", "Cubierta sin anclaje sismico").valida,
    ).toBe(true);
  });

  it("aprobar y recibir no exigen motivo", () => {
    expect(puedeTransicionar("SOLICITADA", "APROBADA", null).valida).toBe(true);
    expect(puedeTransicionar("EN_EJECUCION", "RECIBIDA", null).valida).toBe(true);
  });
});

describe("cuanto pesa una intervencion sobre la brecha", () => {
  it("solo lo recibido cuenta como hecho", () => {
    expect(cuentaComo("RECIBIDA")).toBe("EJECUTADO");
  });

  it("lo aprobado y lo que esta en ejecucion es una promesa", () => {
    expect(cuentaComo("APROBADA")).toBe("COMPROMETIDO");
    expect(cuentaComo("EN_EJECUCION")).toBe("COMPROMETIDO");
  });

  it("lo solicitado, lo rechazado y lo suspendido no cuenta", () => {
    expect(cuentaComo("SOLICITADA")).toBe("NADA");
    expect(cuentaComo("RECHAZADA")).toBe("NADA");
    expect(cuentaComo("SUSPENDIDA")).toBe("NADA");
  });
});

describe("efecto sobre la brecha", () => {
  const costo = M("1000000000");
  const intervencion = (estado: Parameters<typeof cuentaComo>[0]) => [
    { id: "i1", valorEquivalente: M("400000000"), estado },
  ];

  it("una solicitud no mueve la brecha", () => {
    const b = calcularBrecha(costo, [], intervencion("SOLICITADA"));
    expect(b.brecha).toBe(costo);
  });

  it("una aprobada cuenta como comprometida, no como hecha", () => {
    const b = calcularBrecha(costo, [], intervencion("APROBADA"));
    expect(b.comprometido).toBe(M("400000000"));
    expect(b.girado).toBe(CERO);
    expect(b.brecha).toBe(M("600000000"));
    expect(b.brechaSinPromesas).toBe(costo);
  });

  it("solo al recibirla cuenta como ejecutada", () => {
    const b = calcularBrecha(costo, [], intervencion("RECIBIDA"));
    expect(b.girado).toBe(M("400000000"));
    expect(b.brechaSinPromesas).toBe(M("600000000"));
  });

  it("al suspenderla la brecha se reabre", () => {
    const antes = calcularBrecha(costo, [], intervencion("EN_EJECUCION"));
    const despues = calcularBrecha(costo, [], intervencion("SUSPENDIDA"));

    expect(antes.brecha).toBe(M("600000000"));
    expect(despues.brecha).toBe(costo);
  });

  it("una obra puede quedar cubierta solo con trabajo de un tercero, sin plata publica", () => {
    const b = calcularBrecha(costo, [], [
      { id: "i1", valorEquivalente: costo, estado: "RECIBIDA" },
    ]);

    expect(b.brecha).toBe(CERO);
    expect(b.girado).toBe(costo);
  });

  it("se suma con los aportes en dinero", () => {
    const b = calcularBrecha(
      costo,
      [{ id: "a1", monto: M("300000000"), estado: "GIRADO", corrigeId: null }],
      intervencion("RECIBIDA"),
    );

    expect(b.girado).toBe(M("700000000"));
    expect(b.brecha).toBe(M("300000000"));
  });
});

describe("plazo vencido", () => {
  const hoy = new Date("2026-08-17T00:00:00Z");

  it("una aprobada cuyo plazo paso esta vencida", () => {
    expect(estaVencida("APROBADA", new Date("2026-07-01T00:00:00Z"), hoy)).toBe(true);
    expect(estaVencida("EN_EJECUCION", new Date("2026-07-01T00:00:00Z"), hoy)).toBe(true);
  });

  it("con plazo por delante no", () => {
    expect(estaVencida("APROBADA", new Date("2026-12-01T00:00:00Z"), hoy)).toBe(false);
  });

  it("lo recibido o rechazado nunca esta vencido", () => {
    expect(estaVencida("RECIBIDA", new Date("2020-01-01T00:00:00Z"), hoy)).toBe(false);
    expect(estaVencida("RECHAZADA", new Date("2020-01-01T00:00:00Z"), hoy)).toBe(false);
  });
});
