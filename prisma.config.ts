import "dotenv/config";
import { defineConfig } from "prisma/config";

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
