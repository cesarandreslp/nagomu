-- CreateEnum
CREATE TYPE "EstadoVerificacion" AS ENUM ('PENDIENTE', 'VERIFICADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "ResultadoVerificacionVoluntariado" AS ENUM ('VERIFICADO', 'RECHAZADO', 'REVOCADO');

-- AlterTable
ALTER TABLE "Actor" ADD COLUMN     "estadoVerificacion" "EstadoVerificacion" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "latitud" DOUBLE PRECISION,
ADD COLUMN     "longitud" DOUBLE PRECISION,
ADD COLUMN     "municipioOperacionId" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "actorId" TEXT,
ALTER COLUMN "entidadId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "VerificacionVoluntariado" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "resultado" "ResultadoVerificacionVoluntariado" NOT NULL,
    "motivo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificacionVoluntariado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificacionVoluntariado_actorId_creadoEn_idx" ON "VerificacionVoluntariado"("actorId", "creadoEn");

-- CreateIndex
CREATE INDEX "Actor_municipioOperacionId_idx" ON "Actor"("municipioOperacionId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_actorId_key" ON "Usuario"("actorId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actor" ADD CONSTRAINT "Actor_municipioOperacionId_fkey" FOREIGN KEY ("municipioOperacionId") REFERENCES "EntidadTerritorial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificacionVoluntariado" ADD CONSTRAINT "VerificacionVoluntariado_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificacionVoluntariado" ADD CONSTRAINT "VerificacionVoluntariado_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "EntidadTerritorial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificacionVoluntariado" ADD CONSTRAINT "VerificacionVoluntariado_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Un Usuario pertenece a EXACTAMENTE uno: una entidad territorial (funcionario) o un actor
-- voluntariado (cuenta auto-registrada). La garantia vive en la base (enmienda 2.0.0).
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_pertenece_a_uno"
  CHECK ((("entidadId" IS NOT NULL)::int + ("actorId" IS NOT NULL)::int) = 1);

-- Historial de verificacion inmutable: se reusa la funcion compartida ya definida en la
-- migracion inicial. Una correccion se registra como fila nueva, nunca como UPDATE/DELETE.
CREATE TRIGGER "VerificacionVoluntariado_inmutable"
  BEFORE UPDATE OR DELETE ON "VerificacionVoluntariado"
  FOR EACH ROW EXECUTE FUNCTION nagomu_rechazar_modificacion();

CREATE TRIGGER "VerificacionVoluntariado_inmutable_truncate"
  BEFORE TRUNCATE ON "VerificacionVoluntariado"
  FOR EACH STATEMENT EXECUTE FUNCTION nagomu_rechazar_modificacion();
