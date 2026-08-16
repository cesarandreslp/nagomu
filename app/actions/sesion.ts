"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { cerrarSesion, crearSesion, verificarContrasena } from "@/lib/auth";
import { registrarPermitido, registrarRechazo } from "@/lib/audit";

/**
 * Entrada por formulario HTML normal: recibe FormData y termina en un `redirect`.
 * Asi funciona con JavaScript desactivado (Principio III), a costa de mostrar los
 * errores por la URL en lugar de en vivo.
 */
export async function iniciarSesion(formData: FormData): Promise<void> {
  const correo = String(formData.get("correo") ?? "")
    .trim()
    .toLowerCase();
  const contrasena = String(formData.get("contrasena") ?? "");

  if (!correo || !contrasena) redirect("/login?error=faltan");

  const usuario = await prisma.usuario.findUnique({
    where: { correo },
    include: { entidad: true },
  });

  // Mismo mensaje y mismo trabajo si el correo no existe o la clave esta mal: el
  // formulario no debe servir para averiguar quien tiene cuenta en el sistema.
  const valida =
    usuario && usuario.activo
      ? await verificarContrasena(contrasena, usuario.hashContrasena)
      : false;

  if (!usuario || !valida) {
    await registrarRechazo(
      null,
      { accion: "sesion.iniciar", objetivoTipo: "Usuario" },
      "Credenciales invalidas",
    );
    redirect("/login?error=credenciales");
  }

  await crearSesion(usuario.id);
  await registrarPermitido(
    { usuarioId: usuario.id, entidadId: usuario.entidadId, nivel: usuario.entidad.nivel },
    { accion: "sesion.iniciar", objetivoTipo: "Usuario", objetivoId: usuario.id },
  );

  redirect("/");
}

export async function salir(): Promise<void> {
  await cerrarSesion();
  redirect("/login");
}
