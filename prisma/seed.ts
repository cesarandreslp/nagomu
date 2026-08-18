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
import { FONDOS } from "./fondos.js";
import { OFERTA } from "./oferta.js";

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
    clave: "risaralda",
    nombre: "Gobernacion de Risaralda",
    nivel: "DEPARTAMENTO",
    codigoDane: "66",
    correo: "risaralda@nagomu.test",
    usuario: "Gestion del riesgo - Risaralda",
  },
  {
    clave: "caldas",
    nombre: "Gobernacion de Caldas",
    nivel: "DEPARTAMENTO",
    codigoDane: "17",
    correo: "caldas@nagomu.test",
    usuario: "Gestion del riesgo - Caldas",
  },
  {
    clave: "quindio",
    nombre: "Gobernacion del Quindio",
    nivel: "DEPARTAMENTO",
    codigoDane: "63",
    correo: "quindio@nagomu.test",
    usuario: "Gestion del riesgo - Quindio",
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
  {
    clave: "cali",
    nombre: "Santiago de Cali",
    nivel: "MUNICIPIO",
    codigoDane: "76001",
    nbi: "11.20",
    departamento: "valle",
    correo: "cali@nagomu.test",
    usuario: "Planeacion municipal - Cali",
  },
  {
    clave: "pereira",
    nombre: "Pereira",
    nivel: "MUNICIPIO",
    codigoDane: "66001",
    nbi: "13.40",
    departamento: "risaralda",
    correo: "pereira@nagomu.test",
    usuario: "Planeacion municipal - Pereira",
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

  // Catalogo de fondos reales. La sigla es la clave natural: reejecutar la semilla
  // actualiza los datos sin duplicar ni romper aportes ya registrados.
  console.log("\nFondos:");
  for (const f of FONDOS) {
    await prisma.fondo.upsert({
      where: { sigla: f.sigla },
      update: {
        nombre: f.nombre,
        ambito: f.ambito,
        naturaleza: f.naturaleza,
        administrador: f.administrador,
        norma: f.norma ?? null,
        descripcion: f.descripcion,
        exigeProyectoAplazado: f.exigeProyectoAplazado ?? false,
      },
      create: {
        sigla: f.sigla,
        nombre: f.nombre,
        ambito: f.ambito,
        naturaleza: f.naturaleza,
        administrador: f.administrador,
        norma: f.norma ?? null,
        descripcion: f.descripcion,
        exigeProyectoAplazado: f.exigeProyectoAplazado ?? false,
      },
    });
    console.log(`  ${f.ambito.padEnd(14)} ${f.sigla.padEnd(18)} ${f.nombre}`);
  }

  // Oferta institucional. La clave natural es entidad + nombre: la misma ayuda la
  // ofrecen varias entidades (los kits los entregan UNGRD, Defensa Civil y Cruz Roja)
  // y cada una tiene su propio requisito.
  console.log("\nOferta institucional:");
  for (const o of OFERTA) {
    const datos = {
      entidad: o.entidad,
      nombre: o.nombre,
      ambito: o.ambito,
      tipo: o.tipo,
      destinatario: o.destinatario,
      estado: o.estado,
      descripcion: o.descripcion,
      requisito: o.requisito,
      requiereRud: o.requiereRud ?? false,
      certificaEntidad: o.certificaEntidad ?? null,
      canal: o.canal ?? null,
      monto: o.monto ?? null,
      norma: o.norma ?? null,
    };

    await prisma.ofertaInstitucional.upsert({
      where: { entidad_nombre: { entidad: o.entidad, nombre: o.nombre } },
      update: datos,
      create: datos,
    });
    console.log(`  ${o.estado.padEnd(10)} ${o.entidad.padEnd(38)} ${o.nombre}`);
  }

  // Voluntariados de ejemplo para el piloto y las demos: sin ellos el mapa y la vista de
  // verificacion arrancan vacios en una base recien sembrada. Operan en Buga. Uno verificado
  // (aparece en el mapa) y uno pendiente (espera decision del municipio). No tienen cuenta:
  // el auto-registro crea las suyas; estos solo pueblan las vistas del funcionario.
  const bugaId = ids.get("buga");
  if (bugaId) {
    const VOLUNTARIADOS = [
      {
        nombre: "Cruz Roja Seccional Buga",
        contacto: "voluntariado@cruzrojabuga.test",
        direccion: "Calle 6 con carrera 14, Buga",
        latitud: 3.9008,
        longitud: -76.2985,
        estadoVerificacion: "VERIFICADO" as const,
      },
      {
        nombre: "Bomberos Voluntarios de Buga",
        contacto: "contacto@bomberosbuga.test",
        direccion: "Carrera 13 # 4-50, Buga",
        latitud: 3.9021,
        longitud: -76.2969,
        estadoVerificacion: "PENDIENTE" as const,
      },
    ];

    console.log("\nVoluntariados de ejemplo (Buga):");
    for (const v of VOLUNTARIADOS) {
      const datos = {
        contacto: v.contacto,
        direccion: v.direccion,
        latitud: v.latitud,
        longitud: v.longitud,
        municipioOperacionId: bugaId,
        estadoVerificacion: v.estadoVerificacion,
      };
      await prisma.actor.upsert({
        where: { tipo_nombre: { tipo: "VOLUNTARIADO", nombre: v.nombre } },
        update: datos,
        create: { tipo: "VOLUNTARIADO", nombre: v.nombre, ...datos },
      });
      console.log(`  ${v.estadoVerificacion.padEnd(11)} ${v.nombre}`);
    }
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
