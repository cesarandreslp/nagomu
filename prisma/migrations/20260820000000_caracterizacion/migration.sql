-- Caracterizacion integral de afectaciones (spec 007).
--
-- Generaliza ItemInventario a "bien afectado de cualquier tipo" (vivienda, comercio,
-- estructura publica, agropecuario) sin romper la cola de obras: 'categoria' pasa a
-- opcional y solo la estructura publica con categoria se vuelve una Obra (spec 001).
-- 'tipoBien' se backfillea a ESTRUCTURA_PUBLICA para los items que existian antes,
-- porque todos eran infraestructura publica. Sin perdida de datos.
--
-- Clasificacion publico/reservado (enmienda 4.0.0): 'ubicacion' (la direccion) es
-- RESERVADO; 'corregimiento'/'vereda' (lugar general) y el punto son publicos. La
-- separacion se aplica en las consultas (lib/censo.ts), no con constraints.
--
-- NecesidadSalud: indicador categorizado, RESERVADO. Como cuelga de HogarDamnificado
-- (que NO es append-only por habeas data, Ley 1581), tampoco lleva disparador de
-- inmutabilidad y se borra en cascada con el hogar. Ver la migracion de damnificados.

-- CreateEnum
CREATE TYPE "TipoBien" AS ENUM ('VIVIENDA', 'COMERCIO', 'ESTRUCTURA_PUBLICA', 'AGROPECUARIO');

-- CreateEnum
CREATE TYPE "SubtipoBien" AS ENUM ('CULTIVO', 'MAQUINARIA', 'BODEGA', 'CORRAL', 'ANIMALES', 'ESTANQUE', 'ALIMENTO_ANIMAL');

-- CreateEnum
CREATE TYPE "EstadoAfectacion" AS ENUM ('HABITABLE', 'REPARABLE', 'DEMOLER', 'PERDIDO', 'PARCIAL');

-- CreateEnum
CREATE TYPE "TipoNecesidadSalud" AS ENUM ('CONDICION_CRONICA', 'DIALISIS', 'EMBARAZO_RIESGO', 'DISCAPACIDAD', 'OXIGENO', 'OTRA');

-- AlterTable: nuevos campos del bien afectado
ALTER TABLE "ItemInventario" ADD COLUMN "tipoBien" "TipoBien";
ALTER TABLE "ItemInventario" ADD COLUMN "subtipoBien" "SubtipoBien";
ALTER TABLE "ItemInventario" ADD COLUMN "estadoAfectacion" "EstadoAfectacion";
ALTER TABLE "ItemInventario" ADD COLUMN "corregimiento" TEXT;
ALTER TABLE "ItemInventario" ADD COLUMN "vereda" TEXT;

-- Backfill: todo lo que existe hoy es infraestructura publica.
UPDATE "ItemInventario" SET "tipoBien" = 'ESTRUCTURA_PUBLICA' WHERE "tipoBien" IS NULL;
ALTER TABLE "ItemInventario" ALTER COLUMN "tipoBien" SET NOT NULL;

-- 'categoria' pasa a opcional: solo la infraestructura reconstruible la lleva.
ALTER TABLE "ItemInventario" ALTER COLUMN "categoria" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ItemInventario_tipoBien_idx" ON "ItemInventario"("tipoBien");

-- CreateTable
CREATE TABLE "NecesidadSalud" (
    "id" TEXT NOT NULL,
    "hogarId" TEXT NOT NULL,
    "tipo" "TipoNecesidadSalud" NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NecesidadSalud_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NecesidadSalud_hogarId_idx" ON "NecesidadSalud"("hogarId");

-- AddForeignKey
ALTER TABLE "NecesidadSalud" ADD CONSTRAINT "NecesidadSalud_hogarId_fkey" FOREIGN KEY ("hogarId") REFERENCES "HogarDamnificado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NecesidadSalud" ADD CONSTRAINT "NecesidadSalud_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
