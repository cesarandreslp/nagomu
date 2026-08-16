"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requerirSesion } from "@/lib/auth";
import { puedeCrearItemInventario } from "@/lib/authz";
import { registrarPermitido, registrarRechazo } from "@/lib/audit";
import { ETIQUETA_CATEGORIA, nivelDe } from "@/lib/prioridad";
import type { CategoriaItem } from "@/lib/generated/prisma/enums";

const CATEGORIAS = Object.keys(ETIQUETA_CATEGORIA) as CategoriaItem[];

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/**
 * Devuelve null si el campo viene vacio, y el numero si es un entero no negativo.
 * Un valor mal escrito no se convierte en cero en silencio: eso alteraria la
 * prioridad de una obra sin que nadie lo note.
 */
function enteroOpcional(formData: FormData, campo: string): number | null | "invalido" {
  const bruto = texto(formData, campo);
  if (bruto === "") return null;
  if (!/^\d+$/.test(bruto)) return "invalido";
  return Number(bruto);
}

export async function crearItemInventario(formData: FormData): Promise<void> {
  const sesion = await requerirSesion();

  const veredicto = puedeCrearItemInventario(sesion);
  if (!veredicto.permitido) {
    await registrarRechazo(
      sesion,
      { accion: "item.crear", objetivoTipo: "ItemInventario" },
      veredicto.motivo,
    );
    redirect("/obras?error=permiso");
  }

  const nombre = texto(formData, "nombre");
  const ubicacion = texto(formData, "ubicacion");
  const categoria = texto(formData, "categoria") as CategoriaItem;
  const descripcionDano = texto(formData, "descripcionDano");
  const personas = enteroOpcional(formData, "personasBeneficiadas");
  const meses = enteroOpcional(formData, "mesesFueraDeServicio");

  if (!nombre || !ubicacion || !descripcionDano) redirect("/obras/nueva?error=faltan");
  if (!CATEGORIAS.includes(categoria)) redirect("/obras/nueva?error=categoria");
  if (personas === "invalido" || meses === "invalido") redirect("/obras/nueva?error=numero");

  // El municipio sale de la sesion y nunca del formulario: si viniera del cliente,
  // cualquiera podria inscribir obras en territorio ajeno (Principio II).
  const obra = await prisma.obra.create({
    data: {
      item: {
        create: {
          municipioId: sesion.entidadId,
          nombre,
          ubicacion,
          categoria,
          descripcionDano,
          personasBeneficiadas: personas,
          mesesFueraDeServicio: meses ?? 0,
        },
      },
    },
    include: { item: true },
  });

  await registrarPermitido(sesion, {
    accion: "item.crear",
    objetivoTipo: "Obra",
    objetivoId: obra.id,
    // Sin datos personales: nombre del bien, categoria y nivel resultante.
    datos: {
      nombre,
      categoria,
      nivel: nivelDe(categoria),
      personasBeneficiadas: personas,
      mesesFueraDeServicio: meses ?? 0,
    },
  });

  redirect(`/obras/${obra.id}`);
}
