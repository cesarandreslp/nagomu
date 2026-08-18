"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { cerrarSesion, crearSesion, verificarContrasena } from "@/lib/auth";
import { HASH_SENUELO } from "@/lib/contrasenas";
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

  // `select` y no `include`: traer la entidad relacionada cuesta una consulta mas, y
  // esa consulta solo ocurre cuando el usuario existe. Sobre una base remota eso es
  // un viaje de red completo de diferencia entre un correo real y uno inventado, que
  // delata quien tiene cuenta con solo cronometrar la respuesta. El camino de fallo
  // hace exactamente el mismo trabajo en ambos casos: una consulta y un hash.
  const usuario = await prisma.usuario.findUnique({
    where: { correo },
    select: { id: true, activo: true, hashContrasena: true, entidadId: true, actorId: true },
  });

  // Mismo mensaje y mismo trabajo si el correo no existe o la clave esta mal. Sin el
  // hash señuelo, un correo inexistente responderia al instante y uno real tardaria
  // lo que tarda scrypt.
  const valida = await verificarContrasena(
    contrasena,
    usuario && usuario.activo ? usuario.hashContrasena : HASH_SENUELO,
  );

  if (!usuario || !valida) {
    // Cuando la cuenta existe, el rechazo queda enlazado a ella. Eso permite ver
    // veinte intentos fallidos seguidos contra el mismo funcionario, que es lo unico
    // que distingue un ataque de un dedo torpe.
    //
    // No agrega ningun dato personal a la auditoria: la fila apunta por clave foranea
    // a un usuario que ya esta en la base. El correo intentado, en cambio, no se
    // guarda nunca, asi que un intento contra una cuenta inexistente sigue siendo
    // anonimo y la auditoria no se convierte en un listado de correos tanteados.
    await registrarRechazo(
      usuario ? { usuarioId: usuario.id, entidadId: usuario.entidadId } : null,
      { accion: "sesion.iniciar", objetivoTipo: "Usuario", objetivoId: usuario?.id ?? null },
      usuario && !usuario.activo ? "Usuario inactivo" : "Credenciales invalidas",
    );
    redirect("/login?error=credenciales");
  }

  await crearSesion(usuario.id);

  // Una cuenta de voluntariado va a su propio espacio; un funcionario, a su inicio
  // territorial. El destino lo decide a que pertenece la cuenta, no el formulario.
  if (usuario.actorId) {
    await registrarPermitido(
      { usuarioId: usuario.id },
      { accion: "sesion.iniciar", objetivoTipo: "Usuario", objetivoId: usuario.id },
    );
    redirect("/voluntariado");
  }

  // Solo aqui, ya autenticado, se consulta la entidad: en el camino exitoso una
  // consulta de mas no filtra nada.
  const entidad = await prisma.entidadTerritorial.findUniqueOrThrow({
    where: { id: usuario.entidadId! },
    select: { nivel: true },
  });

  await registrarPermitido(
    { usuarioId: usuario.id, entidadId: usuario.entidadId, nivel: entidad.nivel },
    { accion: "sesion.iniciar", objetivoTipo: "Usuario", objetivoId: usuario.id },
  );

  redirect("/");
}

export async function salir(): Promise<void> {
  await cerrarSesion();
  redirect("/login");
}
