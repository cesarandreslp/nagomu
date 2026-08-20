import { randomInt } from "node:crypto";
import dotenv from "dotenv";

/**
 * Rotacion de contrasenas del piloto.
 *
 * Existe porque el repositorio es publico y el README publica la contrasena inicial de las
 * cuentas del piloto (`nagomu-piloto`). Mientras el despliegue estuvo detras del SSO de
 * Vercel eso no alcanzaba a nadie; con el sitio abierto, esa linea del README es una llave
 * publicada.
 *
 * Que hace:
 *   1. genera una contrasena nueva por cuenta, aleatoria y legible en voz alta;
 *   2. la guarda con el mismo `scrypt` de la aplicacion (`lib/contrasenas.ts`);
 *   3. **borra las sesiones abiertas** de esa cuenta: cambiar la clave sin cerrar sesiones
 *      deja adentro a quien ya hubiera entrado, que es justo de quien uno se quiere sacar;
 *   4. deja un asiento en la auditoria — sin la contrasena, obviamente: solo el hecho.
 *
 * Que NO hace: no toca cuentas fuera del filtro, no imprime la cadena de conexion, y no
 * escribe las contrasenas en ningun archivo. Salen por pantalla una sola vez.
 *
 * Uso (desde la raiz del proyecto):
 *
 *   # 1. Ensayo: no escribe nada, solo dice a que base apuntaria y a quien tocaria
 *   DATABASE_URL="postgres://…"  npx tsx scripts/rotar-contrasenas.ts
 *
 *   # 2. De verdad
 *   DATABASE_URL="postgres://…"  npx tsx scripts/rotar-contrasenas.ts --ejecutar
 *
 * Opciones:
 *   --ejecutar          escribe. Sin esto es un ensayo.
 *   --correo <correo>   una sola cuenta, en vez de todo el piloto.
 *   --todas             incluye cuentas que no sean del dominio de piloto. Con cuidado.
 *
 * La cadena de conexion de produccion NO esta en este repositorio ni se puede sacar de
 * Vercel (`env pull` devuelve `[SENSITIVE]` para Production). Se toma de la consola de Neon,
 * de la rama `main`, y se pasa como variable de entorno solo para esta corrida.
 */

dotenv.config({ path: [".env.local", ".env"], quiet: true });

const args = process.argv.slice(2);
const ejecutar = args.includes("--ejecutar");
const todas = args.includes("--todas");
const correoPedido = args[args.indexOf("--correo") + 1];
const soloUna = args.includes("--correo") && correoPedido && !correoPedido.startsWith("--");

/** Dominio de las cuentas sembradas para el piloto. */
const DOMINIO_PILOTO = "@nagomu.test";

/**
 * Alfabeto sin caracteres que se confunden al dictar por telefono o al leer de un papel:
 * nada de 0/O, 1/l/I, 5/S, 2/Z. Una contrasena que se escribe mal tres veces termina
 * anotada en un post-it pegado al monitor.
 */
const ALFABETO = "abcdefghjkmnpqrtuvwxy346789";

function generarContrasena(): string {
  const grupo = () =>
    Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${grupo()}-${grupo()}-${grupo()}-${grupo()}`;
}

/** Solo el host, nunca la cadena completa: no vaya a quedar en el historial de la terminal. */
function hostDe(url: string | undefined): string {
  if (!url) return "(sin DATABASE_URL)";
  try {
    return new URL(url).host;
  } catch {
    return "(cadena ilegible)";
  }
}

async function principal() {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    console.error("Falta DATABASE_URL. Pasala solo para esta corrida, no la guardes en .env.");
    process.exit(1);
  }

  // Se importan aqui, despues de cargar el entorno: `lib/db.ts` lee DATABASE_URL al importarse.
  const { prisma } = await import("../lib/db");
  const { hashearContrasena } = await import("../lib/contrasenas");
  const { registrarPermitido } = await import("../lib/audit");

  const donde = soloUna
    ? { correo: correoPedido }
    : todas
      ? {}
      : { correo: { endsWith: DOMINIO_PILOTO } };

  const usuarios = await prisma.usuario.findMany({
    where: donde,
    select: { id: true, correo: true, nombre: true, entidadId: true, activo: true },
    orderBy: { correo: "asc" },
  });

  console.log(`\nBase de datos: ${hostDe(url)}`);
  console.log(`Cuentas que coinciden: ${usuarios.length}`);
  console.log(
    soloUna
      ? `Filtro: solo ${correoPedido}`
      : todas
        ? "Filtro: TODAS las cuentas"
        : `Filtro: cuentas del piloto (${DOMINIO_PILOTO})`,
  );

  if (usuarios.length === 0) {
    console.log("\nNo hay nada que rotar. Revisa el filtro o la base.\n");
    await prisma.$disconnect();
    return;
  }

  if (!ejecutar) {
    console.log("\n— ENSAYO: no se escribio nada —\n");
    for (const u of usuarios) {
      console.log(`  ${u.correo}${u.activo ? "" : "  (inactiva)"}`);
    }
    console.log(
      "\nSi la base de arriba es la correcta, vuelve a correrlo con --ejecutar.\n" +
        "Antes de eso: ten a mano como le vas a entregar la clave nueva a cada persona.\n",
    );
    await prisma.$disconnect();
    return;
  }

  const nuevas: { correo: string; contrasena: string; sesionesCerradas: number }[] = [];

  for (const usuario of usuarios) {
    const contrasena = generarContrasena();
    const hashContrasena = await hashearContrasena(contrasena);

    // Una transaccion por cuenta: si algo falla a la mitad, no queda una cuenta con la
    // clave cambiada y las sesiones viejas todavia abiertas.
    const { count } = await prisma.$transaction(async (tx) => {
      await tx.usuario.update({ where: { id: usuario.id }, data: { hashContrasena } });
      return tx.sesion.deleteMany({ where: { usuarioId: usuario.id } });
    });

    await registrarPermitido(
      { usuarioId: usuario.id, entidadId: usuario.entidadId },
      {
        accion: "usuario.rotarContrasena",
        objetivoTipo: "Usuario",
        objetivoId: usuario.id,
        // Ni la contrasena ni su hash: el hecho y sus consecuencias.
        datos: { porScript: true, sesionesCerradas: count },
      },
    );

    nuevas.push({ correo: usuario.correo, contrasena, sesionesCerradas: count });
  }

  console.log("\n— HECHO. Estas contrasenas se muestran UNA sola vez —\n");
  const ancho = Math.max(...nuevas.map((n) => n.correo.length));
  for (const n of nuevas) {
    console.log(`  ${n.correo.padEnd(ancho)}   ${n.contrasena}`);
  }

  const sesiones = nuevas.reduce((suma, n) => suma + n.sesionesCerradas, 0);
  console.log(
    `\n${nuevas.length} cuentas rotadas · ${sesiones} sesiones abiertas cerradas.\n\n` +
      "Entregalas por un canal donde no queden guardadas (llamada, en persona, o un gestor\n" +
      "de contrasenas). No las pegues en un chat, en un correo ni en este repositorio.\n" +
      "Limpia el historial de esta terminal cuando termines.\n",
  );

  await prisma.$disconnect();
}

principal().catch((error: unknown) => {
  console.error("\nLa rotacion fallo:", error instanceof Error ? error.message : error);
  console.error("Ninguna cuenta queda a medias: cada una se escribe en su propia transaccion.\n");
  process.exit(1);
});
