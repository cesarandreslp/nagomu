import { describe, expect, it } from "vitest";
import { COSTE, HASH_SENUELO, hashearContrasena, verificarContrasena } from "@/lib/contrasenas";

describe("hash de contrasenas", () => {
  it("acepta la contrasena correcta y rechaza la incorrecta", async () => {
    const hash = await hashearContrasena("nagomu-piloto");
    expect(await verificarContrasena("nagomu-piloto", hash)).toBe(true);
    expect(await verificarContrasena("nagomu-pilot", hash)).toBe(false);
    expect(await verificarContrasena("", hash)).toBe(false);
  });

  it("usa una sal distinta cada vez", async () => {
    const a = await hashearContrasena("misma");
    const b = await hashearContrasena("misma");
    expect(a).not.toBe(b);
    expect(await verificarContrasena("misma", a)).toBe(true);
    expect(await verificarContrasena("misma", b)).toBe(true);
  });

  it("rechaza hashes malformados sin lanzar", async () => {
    expect(await verificarContrasena("x", "")).toBe(false);
    expect(await verificarContrasena("x", "bcrypt$1$2$3$4$5")).toBe(false);
    expect(await verificarContrasena("x", "scrypt$16384$8$1$solo-cinco-partes")).toBe(false);
  });
});

describe("hash señuelo", () => {
  /**
   * Existe para que verificar un correo inexistente cueste lo mismo que verificar
   * uno real. Si alguien lo reemplaza por una cadena cualquiera, `verificarContrasena`
   * saldria por el camino de "hash malformado" en microsegundos y volveria a abrirse
   * el canal de tiempo que delata quien tiene cuenta.
   */
  it("es un hash scrypt valido, no una cadena cualquiera", () => {
    const partes = HASH_SENUELO.split("$");
    expect(partes).toHaveLength(6);
    expect(partes[0]).toBe("scrypt");
    expect(partes[4]).toMatch(/^[0-9a-f]{32}$/);
    expect(partes[5]).toMatch(/^[0-9a-f]{128}$/);
  });

  it("no lo satisface ninguna contrasena", async () => {
    expect(await verificarContrasena("nagomu-piloto", HASH_SENUELO)).toBe(false);
    expect(await verificarContrasena("", HASH_SENUELO)).toBe(false);
  });

  /**
   * Esta es la prueba que importa, y existe porque el fallo ya ocurrio: al subir el
   * coste de 16384 a 65536 el señuelo quedo con el valor viejo, y verificar un correo
   * inexistente paso a costar 37 ms contra 148 ms de uno real. El mensaje de error
   * seguia siendo identico, pero el cronometro volvia a delatar quien tiene cuenta.
   *
   * Comparar tiempos seria inestable; comparar parametros es exacto y basta, porque el
   * tiempo depende solo de ellos.
   */
  it("usa exactamente el mismo coste que los hashes nuevos", () => {
    const [, n, r, p] = HASH_SENUELO.split("$");

    expect(Number(n), "N del señuelo").toBe(COSTE.N);
    expect(Number(r), "r del señuelo").toBe(COSTE.r);
    expect(Number(p), "p del señuelo").toBe(COSTE.p);
  });

  it("cuesta lo mismo que verificar un hash real", async () => {
    const real = await hashearContrasena("cualquiera");

    const medir = async (hash: string): Promise<number> => {
      const inicio = performance.now();
      await verificarContrasena("intento", hash);
      return performance.now() - inicio;
    };

    const tiempoReal = await medir(real);
    const tiempoSenuelo = await medir(HASH_SENUELO);

    // Margen amplio para que la prueba no sea inestable, pero lo bastante estrecho
    // para detectar un señuelo con parametros distintos: eso daria una diferencia de
    // cuatro veces, no de uno y medio.
    expect(tiempoSenuelo).toBeGreaterThan(tiempoReal / 2);
    expect(tiempoSenuelo).toBeLessThan(tiempoReal * 2);
  });
});
