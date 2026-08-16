import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// `.env.local` es la convencion de Next.js para secretos locales y tiene prioridad.
// En Vercel no existe ningun archivo: las variables vienen de la plataforma.
dotenv.config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Las migraciones usan la conexion directa de Neon, sin agrupador.
    // Se lee con process.env y no con env(), que lanza al cargar el archivo:
    // `prisma generate` no necesita base de datos y no debe tumbar el build.
    url: process.env["DIRECT_URL"],
  },
});
