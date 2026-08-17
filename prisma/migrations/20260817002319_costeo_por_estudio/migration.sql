-- AlterTable
ALTER TABLE "Obra" ADD COLUMN     "costoEstudios" DECIMAL(18,2);

-- CreateTable
CREATE TABLE "CostoObra" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "fechaEstudio" TIMESTAMP(3) NOT NULL,
    "referenciaDocumento" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "corrigeId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostoObra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CambioEstadoObra" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "estadoAnterior" "EstadoObra" NOT NULL,
    "estadoNuevo" "EstadoObra" NOT NULL,
    "motivo" TEXT,
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CambioEstadoObra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CostoObra_corrigeId_key" ON "CostoObra"("corrigeId");

-- CreateIndex
CREATE INDEX "CostoObra_obraId_creadoEn_idx" ON "CostoObra"("obraId", "creadoEn");

-- CreateIndex
CREATE INDEX "CambioEstadoObra_obraId_creadoEn_idx" ON "CambioEstadoObra"("obraId", "creadoEn");

-- AddForeignKey
ALTER TABLE "CostoObra" ADD CONSTRAINT "CostoObra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostoObra" ADD CONSTRAINT "CostoObra_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostoObra" ADD CONSTRAINT "CostoObra_corrigeId_fkey" FOREIGN KEY ("corrigeId") REFERENCES "CostoObra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CambioEstadoObra" ADD CONSTRAINT "CambioEstadoObra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CambioEstadoObra" ADD CONSTRAINT "CambioEstadoObra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Inmutabilidad de las cifras de dinero y de la historia de estados.
--
-- Reutiliza nagomu_rechazar_modificacion(), creada en la migracion inicial.
-- Un costo entregado por un estudio y una transicion de estado son hechos
-- ocurridos: se corrigen agregando una fila nueva que referencia la anterior,
-- nunca alterando la original.
-- ============================================================================

CREATE TRIGGER "CostoObra_inmutable"
  BEFORE UPDATE OR DELETE ON "CostoObra"
  FOR EACH ROW EXECUTE FUNCTION nagomu_rechazar_modificacion();

CREATE TRIGGER "CostoObra_inmutable_truncate"
  BEFORE TRUNCATE ON "CostoObra"
  FOR EACH STATEMENT EXECUTE FUNCTION nagomu_rechazar_modificacion();

CREATE TRIGGER "CambioEstadoObra_inmutable"
  BEFORE UPDATE OR DELETE ON "CambioEstadoObra"
  FOR EACH ROW EXECUTE FUNCTION nagomu_rechazar_modificacion();

CREATE TRIGGER "CambioEstadoObra_inmutable_truncate"
  BEFORE TRUNCATE ON "CambioEstadoObra"
  FOR EACH STATEMENT EXECUTE FUNCTION nagomu_rechazar_modificacion();
