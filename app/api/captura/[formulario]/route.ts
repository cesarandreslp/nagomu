import { NextResponse } from "next/server";
import { registrarBien } from "@/app/actions/obras";
import { registrarHogar } from "@/app/actions/damnificados";
import { esFormularioCaptura, type FormularioCaptura } from "@/lib/captura";

/**
 * Punto de entrada estable de los formularios de captura en campo (spec 008).
 *
 * Recibe exactamente el mismo `FormData` que recibia la Server Action y llama a la misma
 * funcion: la validacion, la autorizacion y la auditoria no se duplican aqui. Lo unico que
 * aporta esta ruta es una URL que sobrevive a los despliegues, para que la cola offline del
 * navegador pueda reenviar horas despues lo que se capturo sin señal.
 *
 * La sesion la resuelve la accion desde la cookie, como siempre: nada de identidad viaja en
 * el cuerpo del formulario (Principio II).
 */

const ACCIONES: Record<FormularioCaptura, (datos: FormData) => Promise<void>> = {
  bien: registrarBien,
  hogar: registrarHogar,
};

export async function POST(
  peticion: Request,
  { params }: { params: Promise<{ formulario: string }> },
) {
  // Frontera de confianza: un POST con cookies desde otro origen no entra. La cookie de
  // sesion es SameSite, pero la comprobacion explicita no depende de esa configuracion.
  const origen = peticion.headers.get("origin");
  if (origen && new URL(origen).host !== peticion.headers.get("host")) {
    return NextResponse.json({ error: "origen no permitido" }, { status: 403 });
  }

  const { formulario } = await params;
  if (!esFormularioCaptura(formulario)) {
    return NextResponse.json({ error: "formulario desconocido" }, { status: 404 });
  }

  const datos = await peticion.formData();

  // La accion termina siempre en `redirect(...)`, que aqui se propaga como respuesta 3xx.
  // El navegador la sigue con GET y el usuario aterriza en la vista de siempre.
  await ACCIONES[formulario](datos);

  // Inalcanzable con las acciones actuales; si alguna dejara de redirigir, esto evita que
  // el envio se quede colgado sin respuesta.
  return NextResponse.json({ ok: true });
}
