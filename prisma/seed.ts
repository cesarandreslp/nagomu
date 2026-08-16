/**
 * Semilla del piloto: nacion, dos gobernaciones y tres municipios, con un usuario
 * por nivel.
 *
 * Idempotente: usa `upsert` en todo, asi que puede correrse varias veces sin
 * duplicar. No borra nada, porque en esta base ya podria haber datos reales.
 */
import dotenv from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import type { NivelTerritorial } from "../lib/generated/prisma/enums.js";
import { hashearContrasena } from "../lib/contrasenas.js";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) throw new Error("Falta DATABASE_URL");

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

/** Contrasena inicial del piloto. Debe cambiarse antes de cualquier uso real. */
const CONTRASENA_INICIAL = "nagomu-piloto";

type SemillaEntidad = {
  clave: string;
  nombre: string;
  nivel: NivelTerritorial;
  // TODO(codigos-dane): verificar contra el Marco Geoestadistico Nacional del DANE
  // antes del piloto. Estos valores son provisionales.
  codigoDane: string;
  nbi?: string;
  departamento?: string;
  correo: string;
  usuario: string;
};

const ENTIDADES: SemillaEntidad[] = [
  {
    clave: "nacion",
    nombre: "Nacion",
    nivel: "NACION",
    codigoDane: "00",
    correo: "nacion@nagomu.test",
    usuario: "Coordinacion nacional",
  },
  {
    clave: "valle",
    nombre: "Gobernacion del Valle del Cauca",
    nivel: "DEPARTAMENTO",
    codigoDane: "76",
    correo: "valle@nagomu.test",
    usuario: "Gestion del riesgo - Valle",
  },
  {
    clave: "choco",
    nombre: "Gobernacion del Choco",
    nivel: "DEPARTAMENTO",
    codigoDane: "27",
    correo: "choco@nagomu.test",
    usuario: "Gestion del riesgo - Choco",
  },
  {
    clave: "buga",
    nombre: "Guadalajara de Buga",
    nivel: "MUNICIPIO",
    codigoDane: "76111",
    nbi: "12.50",
    departamento: "valle",
    correo: "buga@nagomu.test",
    usuario: "Planeacion municipal - Buga",
  },
  {
    clave: "sipi",
    nombre: "Sipi",
    nivel: "MUNICIPIO",
    codigoDane: "27660",
    nbi: "78.90",
    departamento: "choco",
    correo: "sipi@nagomu.test",
    usuario: "Planeacion municipal - Sipi",
  },
  {
    clave: "sanjose",
    nombre: "San Jose del Palmar",
    nivel: "MUNICIPIO",
    codigoDane: "27665",
    nbi: "71.30",
    departamento: "choco",
    correo: "sanjose@nagomu.test",
    usuario: "Planeacion municipal - San Jose del Palmar",
  },
];

async function main(): Promise<void> {
  const hash = await hashearContrasena(CONTRASENA_INICIAL);
  const ids = new Map<string, string>();

  // El orden importa: un municipio necesita su gobernacion ya creada.
  for (const e of ENTIDADES) {
    const departamentoId = e.departamento ? ids.get(e.departamento) : undefined;

    const entidad = await prisma.entidadTerritorial.upsert({
      where: { codigoDane: e.codigoDane },
      update: { nombre: e.nombre, nivel: e.nivel, departamentoId, nbi: e.nbi },
      create: {
        nombre: e.nombre,
        nivel: e.nivel,
        codigoDane: e.codigoDane,
        departamentoId,
        nbi: e.nbi,
      },
    });
    ids.set(e.clave, entidad.id);

    // Cada entidad territorial es tambien un actor: puede aportar a una obra.
    await prisma.actor.upsert({
      where: { entidadId: entidad.id },
      update: { nombre: e.nombre },
      create: { tipo: "ENTIDAD_TERRITORIAL", nombre: e.nombre, entidadId: entidad.id },
    });

    await prisma.usuario.upsert({
      where: { correo: e.correo },
      update: { nombre: e.usuario, entidadId: entidad.id, activo: true },
      create: {
        correo: e.correo,
        nombre: e.usuario,
        hashContrasena: hash,
        entidadId: entidad.id,
      },
    });

    console.log(`  ${e.nombre} <- ${e.correo}`);
  }

  console.log(`\nContrasena inicial de todos: ${CONTRASENA_INICIAL}`);
  console.log("Cambiala antes de cualquier uso real.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
