import { describe, expect, it } from "vitest";
import { estaHabilitada, separarPorHabilitacion } from "@/lib/oferta";
import { OFERTA } from "../prisma/oferta";

/**
 * Una medida anunciada pero sin reglamentar no se puede ofrecer ni tramitar.
 *
 * Esto no es una preferencia de presentacion: remitir a una familia damnificada a una
 * ayuda que todavia no existe le cuesta un dia de fila a alguien que duerme en una
 * carpa. La regla vive en una sola funcion para que ninguna pantalla pueda decidir
 * distinto por su cuenta.
 */

describe("habilitacion de la oferta", () => {
  it("solo lo vigente se habilita", () => {
    expect(estaHabilitada({ estado: "VIGENTE" })).toBe(true);
  });

  it("lo anunciado sin reglamentar no se habilita", () => {
    expect(estaHabilitada({ estado: "ANUNCIADO" })).toBe(false);
  });

  it("lo cerrado tampoco", () => {
    expect(estaHabilitada({ estado: "CERRADO" })).toBe(false);
  });

  it("separa sin perder ni duplicar ninguna", () => {
    const oferta = [
      { estado: "VIGENTE" as const, id: "a" },
      { estado: "ANUNCIADO" as const, id: "b" },
      { estado: "CERRADO" as const, id: "c" },
      { estado: "VIGENTE" as const, id: "d" },
    ];

    const { habilitadas, noHabilitadas } = separarPorHabilitacion(oferta);

    expect(habilitadas.map((o) => o.id)).toEqual(["a", "d"]);
    expect(noHabilitadas.map((o) => o.id)).toEqual(["b", "c"]);
    expect(habilitadas.length + noHabilitadas.length).toBe(oferta.length);
  });
});

describe("catalogo cargado", () => {
  it("las medidas sin reglamentar del sismo no estan marcadas como vigentes", () => {
    const sinReglamentar = [
      "Plan de vivienda en tres etapas",
      "Alivio en el pago de servicios publicos",
      "Medidas de proteccion laboral",
      "Exencion temporal de predial e ICA",
    ];

    for (const nombre of sinReglamentar) {
      const medida = OFERTA.find((o) => o.nombre === nombre);
      expect(medida, `falta la medida ${nombre}`).toBeDefined();
      expect(estaHabilitada(medida!), `${nombre} no deberia estar habilitada`).toBe(false);
    }
  });

  it("la inscripcion en el RUD si esta habilitada: es la puerta de entrada", () => {
    const rud = OFERTA.find((o) => o.nombre.includes("Registro Unico de Damnificados"));
    expect(rud).toBeDefined();
    expect(estaHabilitada(rud!)).toBe(true);
  });

  it("toda ayuda declara un requisito, aunque sea para decir que falta reglamentarlo", () => {
    for (const o of OFERTA) {
      expect(o.requisito.trim().length, `${o.nombre} sin requisito`).toBeGreaterThan(0);
    }
  });

  it("ninguna ayuda habilitada deja el requisito en 'por reglamentar'", () => {
    for (const o of OFERTA.filter(estaHabilitada)) {
      expect(o.requisito.toLowerCase(), `${o.nombre}`).not.toContain("por reglamentar");
    }
  });
});
