import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { NivelTerritorial } from "@/lib/generated/prisma/enums";

export { hashearContrasena, verificarContrasena } from "@/lib/contrasenas";

const NOMBRE_COOKIE = "nagomu_sesion";
const DURACION_SESION_HORAS = 12;

/**
 * El identificador de sesion son 256 bits del generador criptografico del sistema.
 * Por eso la cookie no se firma: no hay nada que falsificar, el valor solo sirve si
 * existe la fila correspondiente, y borrar esa fila revoca el acceso de inmediato.
 * Esa revocacion inmediata es justo lo que un JWT firmado no daria sin agregar una
 * lista de revocacion, que es la complejidad que el JWT prometia evitar.
 */
export async function crearSesion(usuarioId: string): Promise<void> {
  const id = randomBytes(32).toString("hex");
  const expiraEn = new Date(Date.now() + DURACION_SESION_HORAS * 60 * 60 * 1000);

  await prisma.sesion.create({ data: { id, usuarioId, expiraEn } });

  const almacen = await cookies();
  almacen.set(NOMBRE_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiraEn,
  });
}

export type SesionActiva = {
  usuarioId: string;
  nombre: string;
  entidadId: string;
  entidadNombre: string;
  nivel: NivelTerritorial;
  /** Gobernacion del municipio, o null en departamento y nacion. */
  departamentoId: string | null;
};

/** Devuelve null si no hay cookie, la sesion expiro o el usuario esta inactivo. */
export async function obtenerSesion(): Promise<SesionActiva | null> {
  const almacen = await cookies();
  const id = almacen.get(NOMBRE_COOKIE)?.value;
  if (!id) return null;

  const sesion = await prisma.sesion.findUnique({
    where: { id },
    include: { usuario: { include: { entidad: true } } },
  });

  if (!sesion || sesion.expiraEn < new Date() || !sesion.usuario.activo) return null;

  const { usuario } = sesion;
  return {
    usuarioId: usuario.id,
    nombre: usuario.nombre,
    entidadId: usuario.entidadId,
    entidadNombre: usuario.entidad.nombre,
    nivel: usuario.entidad.nivel,
    departamentoId: usuario.entidad.departamentoId,
  };
}

export async function cerrarSesion(): Promise<void> {
  const almacen = await cookies();
  const id = almacen.get(NOMBRE_COOKIE)?.value;
  if (id) {
    await prisma.sesion.deleteMany({ where: { id } });
  }
  almacen.delete(NOMBRE_COOKIE);
}
