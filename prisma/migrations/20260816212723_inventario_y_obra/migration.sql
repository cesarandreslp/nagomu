-- CreateEnum
CREATE TYPE "CategoriaItem" AS ENUM ('SUBSISTENCIA', 'MITIGACION_RIESGO', 'ESTRUCTURA_EN_RIESGO', 'SALUD', 'ACUEDUCTO', 'VIA_UNICA_ACCESO', 'EDUCACION', 'PRODUCTIVO', 'VIA_SECUNDARIA', 'CULTURAL', 'RECREATIVO');

-- CreateEnum
CREATE TYPE "EstadoObra" AS ENUM ('IDENTIFICADO', 'EN_ESTUDIOS', 'COSTEADO', 'EN_EJECUCION', 'ENTREGADA');

-- CreateTable
CREATE TABLE "ItemInventario" (
    "id" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "categoria" "CategoriaItem" NOT NULL,
    "descripcionDano" TEXT NOT NULL,
    "personasBeneficiadas" INTEGER,
    "mesesFueraDeServicio" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obra" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "estado" "EstadoObra" NOT NULL DEFAULT 'IDENTIFICADO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemInventario_municipioId_idx" ON "ItemInventario"("municipioId");

-- CreateIndex
CREATE INDEX "ItemInventario_categoria_idx" ON "ItemInventario"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "Obra_itemId_key" ON "Obra"("itemId");

-- CreateIndex
CREATE INDEX "Obra_estado_idx" ON "Obra"("estado");

-- AddForeignKey
ALTER TABLE "ItemInventario" ADD CONSTRAINT "ItemInventario_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "EntidadTerritorial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemInventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
