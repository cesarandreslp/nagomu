import { ImageResponse } from "next/og";

/**
 * Iconos de instalacion (spec 008). Se generan en el build con el generador que ya trae
 * Next: cero dependencias nuevas y cero binarios en el repositorio (Principio V).
 */

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ tamano: "192" }, { tamano: "512" }];
}

export async function GET(_peticion: Request, { params }: { params: Promise<{ tamano: string }> }) {
  const { tamano } = await params;
  const lado = tamano === "512" ? 512 : 192;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1e3a8a",
        color: "#ffffff",
        fontSize: lado * 0.55,
        fontWeight: 700,
        letterSpacing: `-${lado * 0.02}px`,
      }}
    >
      n
    </div>,
    { width: lado, height: lado },
  );
}
