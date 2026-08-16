import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El cliente de Prisma 7 no debe empaquetarse: se resuelve en tiempo de ejecucion.
  serverExternalPackages: ["@prisma/adapter-neon", "@neondatabase/serverless"],
};

export default nextConfig;
