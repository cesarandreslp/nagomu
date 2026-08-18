"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { PuntoMapa } from "@/lib/consultas";
import type { EstadoObra } from "@/lib/generated/prisma/enums";

/**
 * Mapa complementario. NO es la vista esencial: la lista server-rendered de al lado
 * carga sin JavaScript (Principio III). Este div queda vacio en el servidor y solo se
 * puebla en el cliente, asi Leaflet nunca entra al camino critico ni toca `window` en
 * el render del servidor.
 *
 * Se usan `circleMarker` (vectoriales) y no los pines por defecto para no arrastrar los
 * iconos-imagen de Leaflet, que se rompen con el empaquetado.
 */

// Progresion legible: gris (sin arrancar) → ambar/azul/naranja (en curso) → verde
// (entregada). Asi "realizadas" y "proximas a intervenir" se distinguen en el mapa.
const COLOR_ESTADO: Record<EstadoObra, string> = {
  IDENTIFICADO: "#6b7280",
  EN_ESTUDIOS: "#d97706",
  COSTEADO: "#2563eb",
  EN_EJECUCION: "#ea580c",
  ENTREGADA: "#16a34a",
};

function estadoLegible(estado: EstadoObra): string {
  return estado.toLowerCase().replace(/_/g, " ");
}

function escaparHtml(texto: string): string {
  return texto.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export default function MapaCliente({ puntos }: { puntos: PuntoMapa[] }) {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;
    let mapa: import("leaflet").Map | undefined;

    (async () => {
      const mod = await import("leaflet");
      const L = mod.default ?? mod;
      if (cancelado || !contenedor.current) return;

      mapa = L.map(contenedor.current, { scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(mapa);

      const marcadores = puntos.map((p) =>
        L.circleMarker([p.latitud, p.longitud], {
          radius: 8,
          color: COLOR_ESTADO[p.estado] ?? "#6b7280",
          fillColor: COLOR_ESTADO[p.estado] ?? "#6b7280",
          fillOpacity: 0.7,
          weight: 2,
        }).bindPopup(
          `<strong>${escaparHtml(p.nombre)}</strong><br>${escaparHtml(p.municipio)} · ${estadoLegible(p.estado)}<br><a href="/obras/${p.id}">Ver obra</a>`,
        ),
      );

      if (marcadores.length > 0) {
        const grupo = L.featureGroup(marcadores).addTo(mapa);
        mapa.fitBounds(grupo.getBounds().pad(0.2));
      } else {
        mapa.setView([4.6, -74.1], 5); // Colombia, por si acaso
      }
    })();

    return () => {
      cancelado = true;
      mapa?.remove();
    };
  }, [puntos]);

  return (
    <div
      ref={contenedor}
      style={{ height: "70vh", width: "100%", borderRadius: 8 }}
      role="img"
      aria-label="Mapa de items del inventario con coordenada. La lista de abajo tiene la misma informacion."
    />
  );
}
