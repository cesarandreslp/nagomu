-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('EVIDENCIA_DANO', 'COTIZACION_ESTUDIOS', 'ESTUDIO', 'AVANCE_OBRA', 'ACTA_RECIBO', 'OTRO');

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "nombre" TEXT NOT NULL,
    "rutaAlmacenamiento" TEXT NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "tipoContenido" TEXT NOT NULL,
    "subidoPorId" TEXT NOT NULL,
    "costoId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Documento_rutaAlmacenamiento_key" ON "Documento"("rutaAlmacenamiento");

-- CreateIndex
CREATE UNIQUE INDEX "Documento_costoId_key" ON "Documento"("costoId");

-- CreateIndex
CREATE INDEX "Documento_obraId_creadoEn_idx" ON "Documento"("obraId", "creadoEn");

-- CreateIndex
CREATE INDEX "Documento_hashSha256_idx" ON "Documento"("hashSha256");

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_costoId_fkey" FOREIGN KEY ("costoId") REFERENCES "CostoObra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Un documento de respaldo es un hecho: se aporto tal archivo, tal dia, por tal
-- funcionario. Corregirlo es subir otro, no alterar el registro del anterior.
CREATE TRIGGER "Documento_inmutable"
  BEFORE UPDATE OR DELETE ON "Documento"
  FOR EACH ROW EXECUTE FUNCTION nagomu_rechazar_modificacion();

CREATE TRIGGER "Documento_inmutable_truncate"
  BEFORE TRUNCATE ON "Documento"
  FOR EACH STATEMENT EXECUTE FUNCTION nagomu_rechazar_modificacion();
