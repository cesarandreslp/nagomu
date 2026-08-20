import { describe, expect, it } from "vitest";
import { pendientesDe, type CifrasSituacion } from "@/lib/situacion";

/**
 * Lo que decide que ve un alcalde al entrar (spec 009).
 *
 * La portada de la atencion no es una lista de cifras: es una lista de lo que falta por
 * hacer, en orden. Estas pruebas fijan ese orden y una regla que importa mas de lo que
 * parece: **lo que esta al dia no aparece**. Un tablero que enumera ceros entrena a la
 * gente para no leerlo, y el dia que salga un numero de verdad tampoco lo van a mirar.
 */

const CERO: CifrasSituacion = {
  hogares: 0,
  personas: 0,
  ninez: 0,
  adultoMayor: 0,
  discapacidad: 0,
  heridos: 0,
  fallecidos: 0,
  hogaresSinAutorizacion: 0,
  hogaresSinAyuda: 0,
  necesidadesSalud: 0,
  ayudasPendientes: 0,
  bienes: 0,
  bienesSinCoordenada: 0,
  bienesSinFoto: 0,
  aDemoler: 0,
  perdidos: 0,
  porSector: [],
  obras: 0,
  obrasSinCosto: 0,
};

describe("pendientesDe", () => {
  it("un municipio al dia no muestra pendientes", () => {
    expect(pendientesDe(CERO)).toEqual([]);
  });

  it("solo aparece lo que tiene cantidad", () => {
    const pendientes = pendientesDe({ ...CERO, bienesSinFoto: 3 });
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]!.id).toBe("sin-foto");
    expect(pendientes[0]!.cantidad).toBe(3);
  });

  it("las personas van antes que los bienes, y los bienes antes que la plata", () => {
    const pendientes = pendientesDe({
      ...CERO,
      obrasSinCosto: 90, // plata, urgencia baja pero cifra enorme
      bienesSinCoordenada: 5, // bienes, urgencia media
      hogaresSinAyuda: 1, // personas, urgencia alta con la cifra mas pequeña
    });

    // Una cifra grande no adelanta a una urgencia mayor: es la misma regla del inventario,
    // donde el nivel manda sobre el puntaje y un teatro nunca pasa por encima de una escuela.
    expect(pendientes.map((p) => p.id)).toEqual(["sin-ayuda", "sin-coordenada", "sin-costo"]);
  });

  it("dentro de la misma urgencia manda la cantidad", () => {
    const pendientes = pendientesDe({
      ...CERO,
      necesidadesSalud: 2,
      hogaresSinAutorizacion: 9,
      hogaresSinAyuda: 4,
    });

    expect(pendientes.map((p) => p.id)).toEqual(["sin-autorizacion", "sin-ayuda", "salud"]);
    expect(pendientes.every((p) => p.urgencia === "alta")).toBe(true);
  });

  it("cada pendiente lleva a donde se resuelve", () => {
    const pendientes = pendientesDe({
      ...CERO,
      necesidadesSalud: 1,
      bienesSinCoordenada: 1,
      obrasSinCosto: 1,
    });

    expect(pendientes.map((p) => p.href)).toEqual(["/damnificados", "/bienes", "/obras"]);
    // Un pendiente sin destino es una queja, no una tarea.
    expect(pendientes.every((p) => p.href.startsWith("/"))).toBe(true);
    expect(pendientes.every((p) => p.detalle.length > 0)).toBe(true);
  });
});
