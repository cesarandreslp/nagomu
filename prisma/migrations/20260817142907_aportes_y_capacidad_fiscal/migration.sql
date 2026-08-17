-- CreateEnum
CREATE TYPE "EstadoAporte" AS ENUM ('COMPROMETIDO', 'GIRADO', 'EJECUTADO');

-- CreateTable
CREATE TABLE "Aporte" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fondoId" TEXT NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoAporte" NOT NULL,
    "proyectoAplazado" TEXT,
    "corrigeId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacidadFiscal" (
    "id" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "montoAnual" DECIMAL(18,2) NOT NULL,
    "fechaReporte" TIMESTAMP(3) NOT NULL,
    "reportadoPor" TEXT NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapacidadFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Aporte_corrigeId_key" ON "Aporte"("corrigeId");

-- CreateIndex
CREATE INDEX "Aporte_obraId_creadoEn_idx" ON "Aporte"("obraId", "creadoEn");

-- CreateIndex
CREATE INDEX "Aporte_actorId_idx" ON "Aporte"("actorId");

-- CreateIndex
CREATE INDEX "Aporte_fondoId_idx" ON "Aporte"("fondoId");

-- CreateIndex
CREATE INDEX "CapacidadFiscal_municipioId_fechaReporte_idx" ON "CapacidadFiscal"("municipioId", "fechaReporte");

-- AddForeignKey
ALTER TABLE "Aporte" ADD CONSTRAINT "Aporte_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aporte" ADD CONSTRAINT "Aporte_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aporte" ADD CONSTRAINT "Aporte_fondoId_fkey" FOREIGN KEY ("fondoId") REFERENCES "Fondo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aporte" ADD CONSTRAINT "Aporte_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aporte" ADD CONSTRAINT "Aporte_corrigeId_fkey" FOREIGN KEY ("corrigeId") REFERENCES "Aporte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacidadFiscal" ADD CONSTRAINT "CapacidadFiscal_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "EntidadTerritorial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacidadFiscal" ADD CONSTRAINT "CapacidadFiscal_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Un aporte y un reporte de capacidad fiscal son hechos declarados por alguien en una
-- fecha. Corregirlos es registrar de nuevo, no reescribir lo que ya se dijo.
CREATE TRIGGER "Aporte_inmutable"
  BEFORE UPDATE OR DELETE ON "Aporte"
  FOR EACH ROW EXECUTE FUNCTION nagomu_rechazar_modificacion();

CREATE TRIGGER "Aporte_inmutable_truncate"
  BEFORE TRUNCATE ON "Aporte"
  FOR EACH STATEMENT EXECUTE FUNCTION nagomu_rechazar_modificacion();

CREATE TRIGGER "CapacidadFiscal_inmutable"
  BEFORE UPDATE OR DELETE ON "CapacidadFiscal"
  FOR EACH ROW EXECUTE FUNCTION nagomu_rechazar_modificacion();

CREATE TRIGGER "CapacidadFiscal_inmutable_truncate"
  BEFORE TRUNCATE ON "CapacidadFiscal"
  FOR EACH STATEMENT EXECUTE FUNCTION nagomu_rechazar_modificacion();
