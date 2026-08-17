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
    // Esta URL la usa unicamente el CLI (migraciones, studio), asi que apunta a la
    // conexion directa de Neon: el agrupador rompe los bloqueos que necesita
    // `prisma migrate`. La aplicacion en tiempo de ejecucion no pasa por aqui, usa
    // DATABASE_URL agrupada a traves del adaptador en lib/db.ts.
    //
    // Se lee con process.env y no con env(), que lanza al cargar el archivo:
    // `prisma generate` no necesita base de datos y no debe tumbar el build.
    //
    // Prisma 7.9.1 no acepta `directUrl` en este archivo pese a lo que dice su
    // documentacion; solo existen `url` y `shadowDatabaseUrl`.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
