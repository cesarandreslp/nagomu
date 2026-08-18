import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

/** Sesion de un funcionario: actua en nombre de una entidad territorial. */
export type SesionActiva = {
  usuarioId: string;
  nombre: string;
  entidadId: string;
  entidadNombre: string;
  nivel: NivelTerritorial;
  /** Gobernacion del municipio, o null en departamento y nacion. */
  departamentoId: string | null;
};

/** Sesion de un voluntariado auto-registrado: sin autoridad territorial (enmienda 2.0.0). */
export type SesionVoluntariado = {
  usuarioId: string;
  nombre: string;
  actorId: string;
};

/**
 * Una cuenta es de un funcionario O de un voluntariado, nunca de ambos (lo garantiza el
 * CHECK de la base). El discriminante `tipo` decide a que espacio pertenece.
 */
export type Cuenta =
  | { tipo: "FUNCIONARIO"; sesion: SesionActiva }
  | { tipo: "VOLUNTARIADO"; sesion: SesionVoluntariado };

/** Devuelve null si no hay cookie, la sesion expiro o el usuario esta inactivo. */
export async function obtenerCuenta(): Promise<Cuenta | null> {
  const almacen = await cookies();
  const id = almacen.get(NOMBRE_COOKIE)?.value;
  if (!id) return null;

  const sesion = await prisma.sesion.findUnique({
    where: { id },
    include: { usuario: { include: { entidad: true, actor: true } } },
  });

  if (!sesion || sesion.expiraEn < new Date() || !sesion.usuario.activo) return null;

  const { usuario } = sesion;
  if (usuario.entidad) {
    return {
      tipo: "FUNCIONARIO",
      sesion: {
        usuarioId: usuario.id,
        nombre: usuario.nombre,
        entidadId: usuario.entidad.id,
        entidadNombre: usuario.entidad.nombre,
        nivel: usuario.entidad.nivel,
        departamentoId: usuario.entidad.departamentoId,
      },
    };
  }
  if (usuario.actor) {
    return {
      tipo: "VOLUNTARIADO",
      sesion: { usuarioId: usuario.id, nombre: usuario.nombre, actorId: usuario.actor.id },
    };
  }
  // El CHECK de pertenencia unica impide llegar aqui; si pasara, no es una sesion valida.
  return null;
}

/** Solo la sesion de funcionario. Una cuenta de voluntariado no es un funcionario. */
export async function obtenerSesion(): Promise<SesionActiva | null> {
  const cuenta = await obtenerCuenta();
  return cuenta?.tipo === "FUNCIONARIO" ? cuenta.sesion : null;
}

/** Solo la sesion de voluntariado. */
export async function obtenerVoluntario(): Promise<SesionVoluntariado | null> {
  const cuenta = await obtenerCuenta();
  return cuenta?.tipo === "VOLUNTARIADO" ? cuenta.sesion : null;
}

/**
 * Exige funcionario. Sin cuenta → login. Una cuenta de voluntariado se manda a su propio
 * espacio: no tiene nada que hacer en una vista territorial (Principio II).
 */
export async function requerirSesion(): Promise<SesionActiva> {
  const cuenta = await obtenerCuenta();
  if (!cuenta) redirect("/login");
  if (cuenta.tipo === "VOLUNTARIADO") redirect("/voluntariado");
  return cuenta.sesion;
}

/** Exige voluntariado. Sin cuenta → login. Un funcionario se manda a su inicio. */
export async function requerirVoluntario(): Promise<SesionVoluntariado> {
  const cuenta = await obtenerCuenta();
  if (!cuenta) redirect("/login");
  if (cuenta.tipo === "FUNCIONARIO") redirect("/");
  return cuenta.sesion;
}

export async function cerrarSesion(): Promise<void> {
  const almacen = await cookies();
  const id = almacen.get(NOMBRE_COOKIE)?.value;
  if (id) {
    await prisma.sesion.deleteMany({ where: { id } });
  }
  almacen.delete(NOMBRE_COOKIE);
}
