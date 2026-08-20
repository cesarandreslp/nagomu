/**
 * Formularios de captura en campo (spec 008).
 *
 * Un formulario de captura envia por POST a una URL estable —`/api/captura/<id>`— en vez
 * de a una Server Action. La razon no es estetica: el identificador de una Server Action lo
 * genera el compilador en cada build, asi que un envio guardado en el telefono el martes
 * deja de existir si el jueves hay despliegue. Un registro de un hogar damnificado no puede
 * perderse por eso. La URL, en cambio, es un contrato.
 *
 * Sin JavaScript el formulario envia igual, por POST normal (Principio III).
 */

export const FORMULARIOS_CAPTURA = ["bien", "hogar"] as const;

export type FormularioCaptura = (typeof FORMULARIOS_CAPTURA)[number];

export function esFormularioCaptura(valor: string): valor is FormularioCaptura {
  return (FORMULARIOS_CAPTURA as readonly string[]).includes(valor);
}

/** A donde envia cada formulario. Lo usan la vista y la cola offline del navegador. */
export function rutaCaptura(formulario: FormularioCaptura): string {
  return `/api/captura/${formulario}`;
}

export const ETIQUETA_CAPTURA: Record<FormularioCaptura, string> = {
  bien: "Bien afectado",
  hogar: "Hogar damnificado",
};

/**
 * Nombre del campo con la clave de idempotencia. Lo pone el dispositivo antes del primer
 * intento y lo repite en cada reenvio; el indice unico de Postgres hace el resto.
 */
export const CAMPO_CLAVE = "claveCaptura";

/** Longitud maxima aceptada (un UUID cabe de sobra). Un campo libre no entra a la base. */
const LARGO_MAXIMO = 64;

export function claveValida(bruto: string): string | null {
  const clave = bruto.trim();
  if (clave === "" || clave.length > LARGO_MAXIMO) return null;
  return /^[A-Za-z0-9-]+$/.test(clave) ? clave : null;
}

/**
 * True si el error es el choque de DOS envios con la misma clave, no cualquier otra
 * violacion de unicidad: un correo repetido o un actor duplicado no se pueden confundir
 * con un reenvio, porque tratarlos como exito ocultaria un error real.
 */
export function esReenvio(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { code?: unknown; meta?: { target?: unknown } };
  if (e.code !== "P2002") return false;
  const objetivo = e.meta?.target;
  const texto = Array.isArray(objetivo) ? objetivo.join(",") : String(objetivo ?? "");
  return texto.includes(CAMPO_CLAVE);
}
