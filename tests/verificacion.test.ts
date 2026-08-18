import { describe, expect, it } from "vitest";
import { transicionVerificacion } from "@/lib/verificacion";

describe("transicionVerificacion", () => {
  it("verificar: pendiente o rechazado -> verificado, sin motivo", () => {
    expect(transicionVerificacion("PENDIENTE", "verificar")).toMatchObject({
      valida: true,
      estadoNuevo: "VERIFICADO",
      resultado: "VERIFICADO",
      requiereMotivo: false,
    });
    expect(transicionVerificacion("RECHAZADO", "verificar")).toMatchObject({
      valida: true,
      resultado: "VERIFICADO",
    });
  });

  it("verificar algo ya verificado es invalido", () => {
    expect(transicionVerificacion("VERIFICADO", "verificar")).toMatchObject({ valida: false });
  });

  it("rechazar: solo desde pendiente, exige motivo", () => {
    expect(transicionVerificacion("PENDIENTE", "rechazar")).toMatchObject({
      valida: true,
      estadoNuevo: "RECHAZADO",
      resultado: "RECHAZADO",
      requiereMotivo: true,
    });
    expect(transicionVerificacion("VERIFICADO", "rechazar")).toMatchObject({ valida: false });
    expect(transicionVerificacion("RECHAZADO", "rechazar")).toMatchObject({ valida: false });
  });

  it("revocar: solo desde verificado, deja resultado REVOCADO y estado RECHAZADO", () => {
    expect(transicionVerificacion("VERIFICADO", "revocar")).toMatchObject({
      valida: true,
      estadoNuevo: "RECHAZADO",
      resultado: "REVOCADO",
      requiereMotivo: true,
    });
    expect(transicionVerificacion("PENDIENTE", "revocar")).toMatchObject({ valida: false });
    expect(transicionVerificacion("RECHAZADO", "revocar")).toMatchObject({ valida: false });
  });
});
