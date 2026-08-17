-- CreateEnum
CREATE TYPE "TipoOferta" AS ENUM ('ALOJAMIENTO_TEMPORAL', 'ALIMENTACION_Y_KITS', 'SALUD', 'INDEMNIZACION', 'VIVIENDA', 'EVALUACION_TECNICA', 'EMPLEO_E_INGRESOS', 'NIÑEZ_Y_FAMILIA', 'ALIVIO_FINANCIERO', 'ALIVIO_TRIBUTARIO', 'SERVICIOS_PUBLICOS');

-- CreateEnum
CREATE TYPE "DestinatarioOferta" AS ENUM ('HOGAR', 'PERSONA', 'EMPRESA', 'ENTIDAD_TERRITORIAL');

-- CreateEnum
CREATE TYPE "EstadoOferta" AS ENUM ('VIGENTE', 'ANUNCIADO', 'CERRADO');

-- CreateTable
CREATE TABLE "OfertaInstitucional" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "ambito" "AmbitoFondo" NOT NULL,
    "tipo" "TipoOferta" NOT NULL,
    "destinatario" "DestinatarioOferta" NOT NULL,
    "estado" "EstadoOferta" NOT NULL DEFAULT 'ANUNCIADO',
    "descripcion" TEXT NOT NULL,
    "requisito" TEXT NOT NULL,
    "requiereRud" BOOLEAN NOT NULL DEFAULT false,
    "certificaEntidad" TEXT,
    "canal" TEXT,
    "monto" TEXT,
    "norma" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfertaInstitucional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfertaInstitucional_tipo_idx" ON "OfertaInstitucional"("tipo");

-- CreateIndex
CREATE INDEX "OfertaInstitucional_estado_idx" ON "OfertaInstitucional"("estado");

-- CreateIndex
CREATE INDEX "OfertaInstitucional_ambito_idx" ON "OfertaInstitucional"("ambito");

-- CreateIndex
CREATE UNIQUE INDEX "OfertaInstitucional_entidad_nombre_key" ON "OfertaInstitucional"("entidad", "nombre");
