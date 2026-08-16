import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Prisma 7 exige adaptador de driver: `new PrismaClient()` sin argumentos lanza.
// Se usa el de Neon y no el generico de `pg` porque va por el driver serverless,
// que encaja con funciones efimeras.
function crearCliente(): PrismaClient {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL. Ejecuta `vercel env pull .env.local`.");
  }
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

// En desarrollo Next.js recarga los modulos en caliente; sin este cache se abriria
// una conexion nueva por recarga hasta agotar el limite de Postgres.
const global_ = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = global_.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  global_.prisma = prisma;
}
