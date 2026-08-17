import { redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";

/**
 * Cada nivel entra donde trabaja: el municipio a su inventario, la gobernacion y la
 * nacion al consolidado de su ambito.
 */
export default async function Inicio() {
  const sesion = await requerirSesion();
  redirect(sesion.nivel === "MUNICIPIO" ? "/obras" : "/departamento");
}
