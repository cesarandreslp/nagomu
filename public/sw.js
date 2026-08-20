/*
 * Service worker de nagomu (spec 008).
 *
 * Hace una sola cosa: que los formularios de captura en campo se puedan ABRIR sin señal.
 * El envio no pasa por aqui —de eso se encarga la cola del dispositivo en la pagina—, y el
 * cascaron que se guarda es deliberadamente diminuto.
 *
 * Que NO se guarda, y por que: ninguna vista con datos de personas. Un listado de hogares
 * damnificados en la cache del navegador es la direccion de una familia viajando en un
 * telefono que se presta, se pierde o se decomisa (Principio IV). Por eso la cache de
 * navegacion es una lista blanca de formularios vacios, no "todo lo que se visite".
 */

const VERSION = "nagomu-v1";
// Lo unico que se guarda en la instalacion: el aviso de sin conexion. Los formularios se
// guardan la primera vez que se visitan con sesion abierta, no al instalar (al instalar la
// respuesta seria la pagina de login, y offline apareceria eso en vez del formulario).
const PRECARGA = ["/sin-conexion"];
const CACHEABLES = ["/sin-conexion", "/bienes/nuevo", "/damnificados/nuevo"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECARGA))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Los estaticos de Next llevan hash en el nombre: si estan en cache, son los correctos. */
function esEstatico(url) {
  return url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icono/");
}

function esCacheable(url) {
  return CACHEABLES.includes(url.pathname);
}

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET") return; // los envios los maneja la pagina, no el worker

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  if (esEstatico(url)) {
    evento.respondWith(
      caches.match(peticion).then(
        (guardada) =>
          guardada ||
          fetch(peticion).then((respuesta) => {
            const copia = respuesta.clone();
            caches.open(VERSION).then((cache) => cache.put(peticion, copia));
            return respuesta;
          }),
      ),
    );
    return;
  }

  if (peticion.mode !== "navigate") return;

  evento.respondWith(
    fetch(peticion)
      .then((respuesta) => {
        // Solo se refresca la lista blanca. Todo lo demas se sirve y se olvida.
        if (esCacheable(url) && respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(VERSION).then((cache) => cache.put(peticion, copia));
        }
        return respuesta;
      })
      .catch(async () => {
        const guardada = await caches.match(peticion, { ignoreSearch: true });
        return guardada || caches.match("/sin-conexion");
      }),
  );
});
