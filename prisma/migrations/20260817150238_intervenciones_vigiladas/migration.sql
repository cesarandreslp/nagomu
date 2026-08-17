-- CreateEnum
CREATE TYPE "EstadoIntervencion" AS ENUM ('SOLICITADA', 'APROBADA', 'EN_EJECUCION', 'RECIBIDA', 'RECHAZADA', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "ResultadoVerificacion" AS ENUM ('CONFORME', 'OBSERVACIONES', 'NO_CONFORME');

-- CreateTable
CREATE TABLE "Intervencion" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "alcance" TEXT NOT NULL,
    "valorEquivalente" DECIMAL(18,2) NOT NULL,
    "plazoComprometido" TIMESTAMP(3) NOT NULL,
    "responsableTecnico" TEXT NOT NULL,
    "autorizadaPreviamente" BOOLEAN NOT NULL DEFAULT true,
    "estado" "EstadoIntervencion" NOT NULL DEFAULT 'SOLICITADA',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Intervencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CambioEstadoIntervencion" (
    "id" TEXT NOT NULL,
    "intervencionId" TEXT NOT NULL,
    "estadoAnterior" "EstadoIntervencion" NOT NULL,
    "estadoNuevo" "EstadoIntervencion" NOT NULL,
    "motivo" TEXT,
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CambioEstadoIntervencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificacionCalidad" (
    "id" TEXT NOT NULL,
    "intervencionId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "resultado" "ResultadoVerificacion" NOT NULL,
    "observaciones" TEXT,
    "funcionarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificacionCalidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Intervencion_obraId_creadoEn_idx" ON "Intervencion"("obraId", "creadoEn");

-- CreateIndex
CREATE INDEX "Intervencion_estado_idx" ON "Intervencion"("estado");

-- CreateIndex
CREATE INDEX "CambioEstadoIntervencion_intervencionId_creadoEn_idx" ON "CambioEstadoIntervencion"("intervencionId", "creadoEn");

-- CreateIndex
CREATE INDEX "VerificacionCalidad_intervencionId_fecha_idx" ON "VerificacionCalidad"("intervencionId", "fecha");

-- AddForeignKey
ALTER TABLE "Intervencion" ADD CONSTRAINT "Intervencion_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervencion" ADD CONSTRAINT "Intervencion_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervencion" ADD CONSTRAINT "Intervencion_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CambioEstadoIntervencion" ADD CONSTRAINT "CambioEstadoIntervencion_intervencionId_fkey" FOREIGN KEY ("intervencionId") REFERENCES "Intervencion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CambioEstadoIntervencion" ADD CONSTRAINT "CambioEstadoIntervencion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificacionCalidad" ADD CONSTRAINT "VerificacionCalidad_intervencionId_fkey" FOREIGN KEY ("intervencionId") REFERENCES "Intervencion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificacionCalidad" ADD CONSTRAINT "VerificacionCalidad_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Una verificacion de calidad y una transicion de estado son constancias de algo que
-- alguien reviso en una fecha. No se editan.
CREATE TRIGGER "CambioEstadoIntervencion_inmutable"
  BEFORE UPDATE OR DELETE ON "CambioEstadoIntervencion"
  FOR EACH ROW EXECUTE FUNCTION nagomu_rechazar_modificacion();

CREATE TRIGGER "CambioEstadoIntervencion_inmutable_truncate"
  BEFORE TRUNCATE ON "CambioEstadoIntervencion"
  FOR EACH STATEMENT EXECUTE FUNCTION nagomu_rechazar_modificacion();

CREATE TRIGGER "VerificacionCalidad_inmutable"
  BEFORE UPDATE OR DELETE ON "VerificacionCalidad"
  FOR EACH ROW EXECUTE FUNCTION nagomu_rechazar_modificacion();

CREATE TRIGGER "VerificacionCalidad_inmutable_truncate"
  BEFORE TRUNCATE ON "VerificacionCalidad"
  FOR EACH STATEMENT EXECUTE FUNCTION nagomu_rechazar_modificacion();
