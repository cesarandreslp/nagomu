import { describe, expect, it } from "vitest";
import {
  CLAVE_COLA,
  aFormData,
  camposDe,
  encolar,
  guardarCola,
  leerCola,
  parsearCola,
  quitar,
  type Almacen,
  type EnvioPendiente,
} from "@/lib/cola-offline";
import {
  CAMPO_CLAVE,
  claveValida,
  esFormularioCaptura,
  esReenvio,
  rutaCaptura,
} from "@/lib/captura";

/**
 * Lo que se prueba aqui es el camino de la captura sin señal (spec 008): que lo capturado
 * en una vereda no se pierda, y —sobre todo— que no entre dos veces. Un hogar damnificado
 * duplicado es una familia contada dos veces y otra que nadie va a buscar.
 */

function almacenFalso(inicial?: string): Almacen & { valor: string | null } {
  return {
    valor: inicial ?? null,
    getItem(clave: string) {
      return clave === CLAVE_COLA ? this.valor : null;
    },
    setItem(clave: string, valor: string) {
      if (clave === CLAVE_COLA) this.valor = valor;
    },
  };
}

const ENVIO: EnvioPendiente = {
  id: "11111111-1111-4111-8111-111111111111",
  ruta: "/api/captura/bien",
  etiqueta: "Bien afectado",
  campos: [
    ["nombre", "Escuela El Placer"],
    [CAMPO_CLAVE, "22222222-2222-4222-8222-222222222222"],
  ],
  capturadoEn: "2026-08-20T15:00:00.000Z",
};

describe("cola de captura offline", () => {
  it("guarda y devuelve lo capturado", () => {
    const almacen = almacenFalso();
    encolar(almacen, ENVIO);
    expect(leerCola(almacen)).toEqual([ENVIO]);
  });

  it("encolar el mismo envio dos veces no lo duplica", () => {
    const almacen = almacenFalso();
    encolar(almacen, ENVIO);
    const cola = encolar(almacen, ENVIO);
    expect(cola).toHaveLength(1);
    expect(leerCola(almacen)).toHaveLength(1);
  });

  it("conserva el orden de captura: se reenvia como se registro", () => {
    const almacen = almacenFalso();
    const segundo = { ...ENVIO, id: "otro", etiqueta: "Hogar damnificado" };
    encolar(almacen, ENVIO);
    encolar(almacen, segundo);
    expect(leerCola(almacen).map((e) => e.id)).toEqual([ENVIO.id, "otro"]);
  });

  it("quitar saca solo el confirmado", () => {
    const almacen = almacenFalso();
    const segundo = { ...ENVIO, id: "otro" };
    guardarCola(almacen, [ENVIO, segundo]);
    expect(quitar(almacen, ENVIO.id).map((e) => e.id)).toEqual(["otro"]);
  });

  it("una cola corrupta se lee como vacia: no puede tumbar el formulario", () => {
    expect(leerCola(almacenFalso("{no es json"))).toEqual([]);
    expect(leerCola(almacenFalso('"un texto"'))).toEqual([]);
    expect(leerCola(almacenFalso("[1, 2, 3]"))).toEqual([]);
    expect(leerCola(almacenFalso())).toEqual([]);
    expect(parsearCola(null)).toEqual([]);
  });

  it("reconstruye el cuerpo del envio tal como salio del formulario", () => {
    const datos = aFormData(ENVIO);
    expect(datos.get("nombre")).toBe("Escuela El Placer");
    expect(datos.get(CAMPO_CLAVE)).toBe("22222222-2222-4222-8222-222222222222");
  });
});

describe("camposDe", () => {
  it("serializa los campos de texto en orden", () => {
    const datos = new FormData();
    datos.append("nombre", "Cultivo de platano");
    datos.append("sector", "AGROPECUARIO");
    expect(camposDe(datos)).toEqual([
      ["nombre", "Cultivo de platano"],
      ["sector", "AGROPECUARIO"],
    ]);
  });

  it("ignora un campo de archivo vacio", () => {
    const datos = new FormData();
    datos.append("nombre", "Vivienda");
    datos.append("foto", new File([], ""));
    expect(camposDe(datos)).toEqual([["nombre", "Vivienda"]]);
  });

  it("con un archivo de verdad devuelve null: no se promete guardar lo que no cabe", () => {
    const datos = new FormData();
    datos.append("foto", new File(["contenido"], "casa.jpg", { type: "image/jpeg" }));
    expect(camposDe(datos)).toBeNull();
  });
});

describe("claves de idempotencia", () => {
  it("acepta un uuid", () => {
    expect(claveValida("22222222-2222-4222-8222-222222222222")).toBe(
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("rechaza vacio, texto raro y claves desmedidas", () => {
    expect(claveValida("")).toBeNull();
    expect(claveValida("   ")).toBeNull();
    expect(claveValida("clave con espacios")).toBeNull();
    expect(claveValida("'; drop table --")).toBeNull();
    expect(claveValida("a".repeat(65))).toBeNull();
  });

  it("reconoce el choque de dos envios con la misma clave", () => {
    expect(esReenvio({ code: "P2002", meta: { target: ["claveCaptura"] } })).toBe(true);
    expect(esReenvio({ code: "P2002", meta: { target: "ItemInventario_claveCaptura_key" } })).toBe(
      true,
    );
  });

  it("no confunde otra violacion de unicidad con un reenvio", () => {
    // Un correo repetido es un error real y debe seguir siendo un error.
    expect(esReenvio({ code: "P2002", meta: { target: ["correo"] } })).toBe(false);
    expect(esReenvio({ code: "P2025" })).toBe(false);
    expect(esReenvio(new Error("cualquier cosa"))).toBe(false);
    expect(esReenvio(null)).toBe(false);
  });
});

describe("formularios de captura", () => {
  it("solo los declarados tienen ruta estable", () => {
    expect(esFormularioCaptura("bien")).toBe(true);
    expect(esFormularioCaptura("hogar")).toBe(true);
    expect(esFormularioCaptura("aporte")).toBe(false);
    expect(esFormularioCaptura("../../etc/passwd")).toBe(false);
  });

  it("la ruta es la que el dispositivo guarda para reenviar", () => {
    expect(rutaCaptura("bien")).toBe("/api/captura/bien");
    expect(rutaCaptura("hogar")).toBe("/api/captura/hogar");
  });
});
