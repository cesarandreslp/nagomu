"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CAMPO_CLAVE } from "@/lib/captura";
import {
  aFormData,
  camposDe,
  encolar,
  guardarCola,
  instantaneaCola,
  instantaneaEnServidor,
  leerCola,
  parsearCola,
  quitar,
  suscribirCola,
  type EnvioPendiente,
} from "@/lib/cola-offline";

/**
 * Captura en campo sin señal (spec 008), montada en el marco de toda la aplicacion.
 *
 * Es mejora progresiva sobre una base que ya funciona: los formularios marcados con
 * `data-captura` envian por POST normal a `/api/captura/<id>`, y sin este guion siguen
 * enviando igual. Lo que añade es: intentar el envio por red y, si la red no responde,
 * guardar el registro en el dispositivo y reenviarlo cuando vuelva la conexion.
 *
 * `navigator.onLine` no basta como señal: en una vereda el telefono suele reportar conexion
 * con datos que no salen. Por eso siempre se intenta el envio real con un plazo, y es el
 * fallo —no el indicador del sistema— lo que manda a la cola.
 *
 * La cola es estado del dispositivo, no de React: se lee con `useSyncExternalStore`, asi que
 * dos pestañas abiertas en el mismo telefono muestran lo mismo.
 */

const PLAZO_MS = 8000;

/**
 * Un solo vaciado a la vez. El evento "online" puede llegar mientras ya se esta enviando, y
 * en desarrollo React monta los efectos por duplicado. Del duplicado real protege la clave de
 * idempotencia del servidor; este candado solo evita el trabajo inutil.
 */
let vaciando = false;

/** Una redireccion a `...?error=algo` es un rechazo de validacion, no un exito. */
function motivoDeRechazo(respuesta: Response): string | null {
  if (!respuesta.ok) return `El servidor respondio ${respuesta.status}.`;
  try {
    const error = new URL(respuesta.url).searchParams.get("error");
    return error ? `Rechazado: ${error}.` : null;
  } catch {
    return null;
  }
}

async function enviar(ruta: string, datos: FormData): Promise<Response> {
  return fetch(ruta, {
    method: "POST",
    body: datos,
    redirect: "follow",
    signal: AbortSignal.timeout(PLAZO_MS),
  });
}

export function CapturaOffline() {
  const bruto = useSyncExternalStore(suscribirCola, instantaneaCola, instantaneaEnServidor);
  const cola = useMemo(() => parsearCola(bruto), [bruto]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const almacen = window.localStorage;

    // El service worker guarda el cascaron para que los formularios abran sin conexion.
    //
    // Solo en produccion: en desarrollo los fragmentos de JavaScript no llevan hash estable,
    // asi que una cache "primero lo guardado" sirve codigo viejo y se depura contra una
    // version que ya no existe. (Se descubrio asi: una correccion no surtia efecto porque el
    // navegador seguia ejecutando el fragmento anterior.)
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin service worker la aplicacion sigue funcionando en linea: no hay que avisar.
      });
    }

    async function vaciar() {
      if (vaciando) return;
      vaciando = true;
      try {
        for (const envio of leerCola(almacen)) {
          if (envio.problema) continue; // necesita a una persona, no otro reintento
          try {
            const respuesta = await enviar(envio.ruta, aFormData(envio));
            const problema = motivoDeRechazo(respuesta);
            if (problema) {
              guardarCola(
                almacen,
                leerCola(almacen).map((e) => (e.id === envio.id ? { ...e, problema } : e)),
              );
            } else {
              quitar(almacen, envio.id);
            }
          } catch {
            break; // sigue sin haber red: se reintenta en el proximo evento
          }
        }
      } finally {
        vaciando = false;
      }
    }

    async function alEnviar(evento: SubmitEvent) {
      const form = evento.target;
      if (!(form instanceof HTMLFormElement) || !form.dataset["captura"]) return;

      evento.preventDefault();
      const datos = new FormData(form);

      // La clave se genera ANTES del primer intento y viaja igual en el reenvio: si la
      // respuesta se pierde en el camino, el servidor reconoce que es el mismo envio y no
      // crea un segundo registro (lib/captura.ts).
      datos.set(CAMPO_CLAVE, crypto.randomUUID());
      const campos = camposDe(datos);

      try {
        const respuesta = await enviar(form.action, datos);
        window.location.href = respuesta.url || form.action;
        return;
      } catch {
        // Sin red. Cae a la cola del dispositivo.
      }

      if (campos === null) {
        // Con un adjunto no se puede prometer el envio: se dice, no se pierde en silencio.
        alert(
          "Sin conexion no se puede guardar un archivo adjunto. Registra los datos sin la " +
            "foto y adjuntala cuando vuelvas a tener señal.",
        );
        return;
      }

      encolar(almacen, {
        id: crypto.randomUUID(),
        ruta: form.action,
        etiqueta: form.dataset["captura"] ?? "Registro",
        campos,
        capturadoEn: new Date().toISOString(),
      });
      form.reset();
      const destino = form.dataset["capturaVuelve"];
      if (destino) window.location.href = destino;
    }

    document.addEventListener("submit", alEnviar);
    window.addEventListener("online", vaciar);
    if (navigator.onLine) void vaciar();

    return () => {
      document.removeEventListener("submit", alEnviar);
      window.removeEventListener("online", vaciar);
    };
  }, []);

  if (cola.length === 0) return null;

  const rechazados = cola.filter((e) => e.problema);

  return (
    <div className="cinta-offline" role="status" aria-live="polite">
      <span>
        {cola.length} {cola.length === 1 ? "registro guardado" : "registros guardados"} en este
        dispositivo
        {rechazados.length > 0 ? ` · ${rechazados.length} necesita revision` : ""}
      </span>
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        {abierto ? "Ocultar" : "Ver"}
      </button>
      {abierto ? (
        <ul>
          {cola.map((envio: EnvioPendiente) => (
            <li key={envio.id}>
              {envio.etiqueta} · {new Date(envio.capturadoEn).toLocaleString("es-CO")}
              {envio.problema ? ` · ${envio.problema}` : ""}{" "}
              <button type="button" onClick={() => quitar(window.localStorage, envio.id)}>
                Descartar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
