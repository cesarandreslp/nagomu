/**
 * Cola de envios capturados sin señal (spec 008).
 *
 * Lo que se captura en una vereda sin cobertura se guarda en el dispositivo y se reenvia
 * cuando vuelve la conexion. Vive en `localStorage` y no en memoria porque el telefono se
 * bloquea, la pestaña se cierra y el navegador descarta la pagina: la memoria no sobrevive
 * a un recorrido de campo.
 *
 * Estas funciones son puras sobre el almacen que reciben —sin `window`, sin `fetch`— para
 * poder probarse sin navegador. El componente de cliente pone el DOM y la red.
 *
 * ponytail: localStorage (~5 MB, solo texto). Si algun dia hay que encolar fotos, esto pasa
 * a IndexedDB; el resto de la interfaz no se entera porque el contrato es esta cola.
 */

export type EnvioPendiente = {
  /** Identificador local del envio. No viaja al servidor. */
  id: string;
  /** URL estable de captura, p. ej. `/api/captura/bien`. */
  ruta: string;
  /** Nombre legible para la persona que capturo, p. ej. "Bien afectado". */
  etiqueta: string;
  /** Pares nombre/valor del formulario, en orden. */
  campos: [string, string][];
  /** Momento de la captura en el dispositivo, ISO 8601. */
  capturadoEn: string;
  /** Por que el servidor lo rechazo. Con esto puesto ya no se reintenta solo. */
  problema?: string;
};

export const CLAVE_COLA = "nagomu.captura.pendientes";

const VACIA = "[]";

/** Un `localStorage` o cualquier cosa con la misma forma (para pruebas). */
export type Almacen = Pick<Storage, "getItem" | "setItem">;

/**
 * Lee la cola. Nunca lanza: si lo guardado esta corrupto se devuelve vacia, porque una
 * cola ilegible no puede tumbar el formulario que la persona tiene enfrente.
 */
export function leerCola(almacen: Almacen): EnvioPendiente[] {
  return parsearCola(almacen.getItem(CLAVE_COLA));
}

/** Igual de tolerante, pero sobre el texto crudo: lo que entrega `useSyncExternalStore`. */
export function parsearCola(bruto: string | null): EnvioPendiente[] {
  try {
    if (!bruto) return [];
    const valor: unknown = JSON.parse(bruto);
    if (!Array.isArray(valor)) return [];
    return valor.filter(esEnvio);
  } catch {
    return [];
  }
}

function esEnvio(valor: unknown): valor is EnvioPendiente {
  if (typeof valor !== "object" || valor === null) return false;
  const e = valor as Record<string, unknown>;
  return (
    typeof e["id"] === "string" &&
    typeof e["ruta"] === "string" &&
    typeof e["etiqueta"] === "string" &&
    typeof e["capturadoEn"] === "string" &&
    Array.isArray(e["campos"])
  );
}

export function guardarCola(almacen: Almacen, cola: EnvioPendiente[]): void {
  almacen.setItem(CLAVE_COLA, JSON.stringify(cola));
  for (const oyente of oyentes) oyente();
}

/**
 * Añade al final: se reenvia en el orden en que se capturo. Encolar dos veces el mismo
 * envio no hace nada: en desarrollo React invoca los efectos por duplicado, y una pestaña
 * repetida no debe convertirse en dos registros de la misma familia.
 */
export function encolar(almacen: Almacen, envio: EnvioPendiente): EnvioPendiente[] {
  const actual = leerCola(almacen);
  if (actual.some((e) => e.id === envio.id)) return actual;
  const cola = [...actual, envio];
  guardarCola(almacen, cola);
  return cola;
}

/** Saca un envio ya confirmado por el servidor. */
export function quitar(almacen: Almacen, id: string): EnvioPendiente[] {
  const cola = leerCola(almacen).filter((e) => e.id !== id);
  guardarCola(almacen, cola);
  return cola;
}

/** Reconstruye el cuerpo del POST tal como lo habria enviado el formulario. */
export function aFormData(envio: EnvioPendiente): FormData {
  const datos = new FormData();
  for (const [nombre, valor] of envio.campos) datos.append(nombre, valor);
  return datos;
}

/**
 * Serializa un formulario. Descarta los adjuntos: un archivo no cabe en `localStorage` y
 * fingir que se guardo seria peor que decir que no. Devuelve `null` si el formulario trae
 * archivos con contenido, para que la interfaz avise en vez de perder la foto en silencio.
 */
export function camposDe(datos: FormData): [string, string][] | null {
  const campos: [string, string][] = [];
  for (const [nombre, valor] of datos.entries()) {
    if (typeof valor !== "string") {
      if (valor.size > 0) return null;
      continue; // input de archivo vacio: no aporta nada
    }
    campos.push([nombre, valor]);
  }
  return campos;
}

/**
 * Suscripcion a la cola para `useSyncExternalStore`. La cola es estado externo a React —vive
 * en el dispositivo— y ademas la puede tocar otra pestaña abierta en el mismo telefono, asi
 * que se escucha tambien el evento `storage`.
 */
const oyentes = new Set<() => void>();

export function suscribirCola(oyente: () => void): () => void {
  oyentes.add(oyente);
  const alCambiarOtraPestana = (evento: StorageEvent) => {
    if (evento.key === CLAVE_COLA) oyente();
  };
  window.addEventListener("storage", alCambiarOtraPestana);
  return () => {
    oyentes.delete(oyente);
    window.removeEventListener("storage", alCambiarOtraPestana);
  };
}

/** Instantanea estable: el texto guardado. Cambia solo cuando cambia la cola. */
export function instantaneaCola(): string {
  return window.localStorage.getItem(CLAVE_COLA) ?? VACIA;
}

/** En el servidor no hay dispositivo: la cola es siempre vacia. */
export function instantaneaEnServidor(): string {
  return VACIA;
}
