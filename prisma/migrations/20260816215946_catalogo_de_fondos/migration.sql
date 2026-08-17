-- CreateEnum
CREATE TYPE "AmbitoFondo" AS ENUM ('MUNICIPAL', 'DEPARTAMENTAL', 'NACIONAL', 'EXTERNO');

-- CreateEnum
CREATE TYPE "NaturalezaFondo" AS ENUM ('PROPIO', 'TRASLADO_PRESUPUESTAL', 'FONDO_GESTION_RIESGO', 'CREDITO', 'REGALIAS', 'TRANSFERENCIA', 'COOPERACION_INTERNACIONAL', 'DONACION', 'EJECUCION_EN_ESPECIE');

-- CreateTable
CREATE TABLE "Fondo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sigla" TEXT,
    "ambito" "AmbitoFondo" NOT NULL,
    "naturaleza" "NaturalezaFondo" NOT NULL,
    "administrador" TEXT NOT NULL,
    "norma" TEXT,
    "descripcion" TEXT NOT NULL,
    "exigeProyectoAplazado" BOOLEAN NOT NULL DEFAULT false,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fondo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fondo_sigla_key" ON "Fondo"("sigla");

-- CreateIndex
CREATE INDEX "Fondo_ambito_idx" ON "Fondo"("ambito");

-- CreateIndex
CREATE INDEX "Fondo_vigente_idx" ON "Fondo"("vigente");
