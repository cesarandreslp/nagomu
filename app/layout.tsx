import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { CapturaOffline } from "@/app/captura-offline";
import "./globals.css";

export const metadata: Metadata = {
  title: "nagomu",
  description:
    "Cofinanciacion priorizada de obras de reconstruccion entre municipio, gobernacion y nacion",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "nagomu", statusBarStyle: "black-translucent" },
  icons: { icon: "/icono/192", apple: "/icono/192" },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  // La escala no se bloquea: en campo se hace zoom sobre una coordenada o un documento.
  initialScale: 1,
  width: "device-width",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <CapturaOffline />
        {children}
      </body>
    </html>
  );
}
