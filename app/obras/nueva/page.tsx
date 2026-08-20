import { redirect } from "next/navigation";

/**
 * El registro se unifico en /bienes/nuevo (spec 007): un solo formulario para todo
 * bien afectado. Una estructura publica con categoria sigue creando su obra con cola
 * (spec 001). Esta ruta se conserva como redireccion para no romper enlaces viejos.
 */
export default function NuevoItem() {
  redirect("/bienes/nuevo");
}
