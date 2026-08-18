import { describe, expect, it } from "vitest";
import { parsearCoordenada } from "@/lib/geo";

describe("parsearCoordenada", () => {
  it("acepta un par valido", () => {
    expect(parsearCoordenada("3.9006", "-76.2978")).toEqual({
      latitud: 3.9006,
      longitud: -76.2978,
    });
  });

  it("ambos campos vacios es null: el item no tendra coordenada", () => {
    expect(parsearCoordenada("", "")).toBeNull();
    expect(parsearCoordenada("  ", " ")).toBeNull();
  });

  it("una sola coordenada es invalida: un punto a medio digitar no es ubicacion", () => {
    expect(parsearCoordenada("3.9", "")).toBe("invalido");
    expect(parsearCoordenada("", "-76.2")).toBe("invalido");
  });

  it("rechaza valores no numericos", () => {
    expect(parsearCoordenada("norte", "-76")).toBe("invalido");
    expect(parsearCoordenada("3.9", "oeste")).toBe("invalido");
  });

  it("rechaza rangos imposibles", () => {
    expect(parsearCoordenada("91", "0")).toBe("invalido");
    expect(parsearCoordenada("-91", "0")).toBe("invalido");
    expect(parsearCoordenada("0", "181")).toBe("invalido");
    expect(parsearCoordenada("0", "-181")).toBe("invalido");
  });

  it("acepta los limites y el (0,0) explicito como coordenada real, no como vacio", () => {
    expect(parsearCoordenada("90", "180")).toEqual({ latitud: 90, longitud: 180 });
    expect(parsearCoordenada("-90", "-180")).toEqual({ latitud: -90, longitud: -180 });
    expect(parsearCoordenada("0", "0")).toEqual({ latitud: 0, longitud: 0 });
  });
});
