import { redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";

export default async function Inicio() {
  await requerirSesion();
  redirect("/obras");
}
