import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El cliente de Prisma 7 no debe empaquetarse: se resuelve en tiempo de ejecucion.
  serverExternalPackages: ["@prisma/adapter-neon", "@neondatabase/serverless"],

  experimental: {
    // Un estudio estructural con planos no cabe en el limite por defecto de 1 MB.
    // El limite real de cada archivo lo impone lib/documentos.ts.
    serverActions: { bodySizeLimit: "26mb" },
  },
};

export default nextConfig;
