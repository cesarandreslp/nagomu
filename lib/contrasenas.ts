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
  opciones: { N: number; r: number; p: number },
) => Promise<Buffer>;

// ponytail: parametros de coste fijos. Deben calibrarse en el hardware de despliegue
// hasta que un hash tome entre 100 y 250 ms (tarea T086). Estan aqui y en ningun otro
// lugar, asi que subirlos no toca nada mas.
const COSTE = { N: 16384, r: 8, p: 1 };
const LONGITUD_CLAVE = 64;

/** Formato almacenado: `scrypt$N$r$p$sal$hash`, todo en hexadecimal. */
export async function hashearContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await derivar(contrasena, sal, LONGITUD_CLAVE, COSTE);
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
  const calculado = await derivar(contrasena, sal, esperado.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}
