import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Hash de contrasenas con `scrypt` de la biblioteca estandar de Node.
 *
 * Vive separado de `lib/auth.ts` a proposito: aquel importa `next/headers` para las
 * cookies y por tanto solo corre dentro de Next. Esto tiene que funcionar tambien
 * desde la semilla y desde las pruebas, que son Node a secas.
 */

const derivar = promisify(scrypt) as (
  clave: string,
  sal: Buffer,
  longitud: number,
  opciones: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Coste calibrado el 2026-08-17 midiendo, no suponiendo. Medianas de cinco corridas:
 *
 *   N=16384   16 MB    37 ms
 *   N=32768   32 MB    73 ms
 *   N=65536   64 MB   148 ms   <- elegido
 *   N=131072 128 MB   299 ms
 *
 * El objetivo es entre 100 y 250 ms: suficiente para que probar contrasenas a fuerza
 * bruta sea caro, sin que un funcionario espere frente a la pantalla.
 *
 * Estos numeros son de la maquina de desarrollo. Una funcion serverless suele tener
 * menos CPU, asi que conviene volver a medir en el destino real antes del piloto; si
 * alli 65536 se pasa de 250 ms, bajar a 32768 es preferible a que la gente espere.
 *
 * Subir el coste no invalida las contrasenas ya guardadas: cada hash lleva sus propios
 * parametros y `verificarContrasena` los lee de ahi.
 */
export const COSTE = { N: 65536, r: 8, p: 1 } as const;

/**
 * scrypt necesita unos 128 x N x r bytes. Con N=65536 son 64 MB, y el limite por
 * defecto de Node son 32 MB: sin subirlo, derivar falla con "memory limit exceeded".
 */
const MEMORIA_MAXIMA = 256 * 1024 * 1024;

const LONGITUD_CLAVE = 64;

/**
 * Hash señuelo contra el que se verifica cuando el correo no corresponde a ninguna
 * cuenta.
 *
 * Sin esto, un correo inexistente responde en milisegundos mientras que uno real
 * tarda lo que tarda `scrypt`. Esa diferencia de tiempo permite averiguar quien
 * tiene cuenta aunque el mensaje de error sea identico, que es precisamente lo que
 * el mensaje generico pretendia evitar.
 *
 * Es un hash real de una cadena aleatoria de 256 bits que nadie conoce: verificar
 * contra el cuesta lo mismo que verificar contra uno legitimo y siempre falla.
 *
 * **Sus parametros tienen que ser los mismos de COSTE.** Al subir el coste de 16384 a
 * 65536 este señuelo quedo con el valor viejo, y durante un momento verificar un correo
 * inexistente costaba 37 ms contra 148 ms de uno real: exactamente el canal de tiempo
 * que el señuelo existe para cerrar. Hay una prueba que lo vigila.
 */
export const HASH_SENUELO =
  "scrypt$65536$8$1$1abf31c10fc58a2e8b90b3c9dd9c217f$f0104f282c300744b47b86ffd80c097324040fcc367ddf721b4723cd1bc253a372b27aab5c83f3956e39a1c56cab18c2dcef720bfb854d4ae126e4e66764d4d0";

/** Formato almacenado: `scrypt$N$r$p$sal$hash`, todo en hexadecimal. */
export async function hashearContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await derivar(contrasena, sal, LONGITUD_CLAVE, {
    ...COSTE,
    maxmem: MEMORIA_MAXIMA,
  });
  return `scrypt$${COSTE.N}$${COSTE.r}$${COSTE.p}$${sal.toString("hex")}$${hash.toString("hex")}`;
}

/**
 * Comparacion en tiempo constante. Una comparacion normal filtra informacion por lo
 * que tarda en encontrar la primera diferencia.
 */
export async function verificarContrasena(
  contrasena: string,
  almacenado: string,
): Promise<boolean> {
  const partes = almacenado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;

  const [, n, r, p, salHex, hashHex] = partes;
  const sal = Buffer.from(salHex!, "hex");
  const esperado = Buffer.from(hashHex!, "hex");
  // Los parametros salen del hash guardado, no de la constante: asi subir el coste no
  // invalida las contrasenas creadas con el coste anterior.
  const calculado = await derivar(contrasena, sal, esperado.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MEMORIA_MAXIMA,
  });

  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}
