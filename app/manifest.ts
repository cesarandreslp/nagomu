import type { MetadataRoute } from "next";

/**
 * Manifiesto de aplicacion instalable (spec 008). Instalar nagomu en el telefono no cambia
 * lo que hace: es la misma aplicacion servidor. Lo que cambia es que abre en un toque, sin
 * barra de direcciones, y que el service worker queda activo para la captura sin señal.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "nagomu · atencion de desastres",
    short_name: "nagomu",
    description:
      "Caracterizacion de afectaciones y cofinanciacion de obras entre municipio, gobernacion y nacion.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f5f9",
    theme_color: "#1e3a8a",
    lang: "es-CO",
    categories: ["government", "productivity"],
    icons: [
      { src: "/icono/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icono/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icono/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Registrar bien afectado", url: "/bienes/nuevo" },
      { name: "Registrar hogar damnificado", url: "/damnificados/nuevo" },
    ],
  };
}
