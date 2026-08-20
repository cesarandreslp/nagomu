-- Doliente sectorial del bien afectado (spec 007, correccion de modelo).
--
-- El primer intento aplano todo en un `tipoBien` de 4 valores con un subtipo solo para
-- agropecuario. Eso mezclaba cosas con dolientes distintos: un cultivo (Agricultura),
-- una escuela (Educacion), un puente (Transporte) y un bien patrimonial (Cultura) no se
-- reportan al mismo ministerio. Ahora la clasificacion es por SECTOR (el doliente, lista
-- fija) y el TIPO concreto dentro del sector es texto libre con sugerencias (se pueden
-- crear otros). El reporte sube al doliente correcto en departamento y nacion.
--
-- Backfill sin perdida: los items que existian son obras publicas con `categoria`, asi
-- que el sector y el tipo concreto se derivan de la categoria.

-- CreateEnum
CREATE TYPE "Sector" AS ENUM (
  'VIVIENDA', 'TRANSPORTE', 'GESTION_RIESGO', 'EDUCACION', 'SALUD',
  'AGUA_SANEAMIENTO', 'AGROPECUARIO', 'CULTURA_PATRIMONIO', 'COMERCIO', 'DEPORTE_RECREACION'
);

-- AlterTable: nuevo sector (nullable para backfill)
ALTER TABLE "ItemInventario" ADD COLUMN "sector" "Sector";

-- Backfill del sector desde la categoria de la obra existente.
UPDATE "ItemInventario" SET "sector" = CASE "categoria"
  WHEN 'MITIGACION_RIESGO'    THEN 'GESTION_RIESGO'::"Sector"
  WHEN 'ESTRUCTURA_EN_RIESGO' THEN 'GESTION_RIESGO'::"Sector"
  WHEN 'SALUD'                THEN 'SALUD'::"Sector"
  WHEN 'ACUEDUCTO'            THEN 'AGUA_SANEAMIENTO'::"Sector"
  WHEN 'VIA_UNICA_ACCESO'     THEN 'TRANSPORTE'::"Sector"
  WHEN 'VIA_SECUNDARIA'       THEN 'TRANSPORTE'::"Sector"
  WHEN 'EDUCACION'            THEN 'EDUCACION'::"Sector"
  WHEN 'PRODUCTIVO'           THEN 'COMERCIO'::"Sector"
  WHEN 'CULTURAL'             THEN 'CULTURA_PATRIMONIO'::"Sector"
  WHEN 'RECREATIVO'           THEN 'DEPORTE_RECREACION'::"Sector"
  ELSE 'GESTION_RIESGO'::"Sector"
END
WHERE "sector" IS NULL;

ALTER TABLE "ItemInventario" ALTER COLUMN "sector" SET NOT NULL;

-- tipoBien pasa de enum a texto libre (tipo concreto dentro del sector).
DROP INDEX "ItemInventario_tipoBien_idx";
ALTER TABLE "ItemInventario" ALTER COLUMN "tipoBien" TYPE TEXT USING "tipoBien"::text;

-- Reemplaza el valor placeholder ('ESTRUCTURA_PUBLICA') por un tipo concreto por categoria.
UPDATE "ItemInventario" SET "tipoBien" = CASE "categoria"
  WHEN 'MITIGACION_RIESGO'    THEN 'Muro de contención'
  WHEN 'ESTRUCTURA_EN_RIESGO' THEN 'Estructura en riesgo'
  WHEN 'SALUD'                THEN 'Hospital / puesto de salud'
  WHEN 'ACUEDUCTO'            THEN 'Acueducto'
  WHEN 'VIA_UNICA_ACCESO'     THEN 'Vía de acceso'
  WHEN 'VIA_SECUNDARIA'       THEN 'Vía secundaria'
  WHEN 'EDUCACION'            THEN 'Escuela'
  WHEN 'PRODUCTIVO'           THEN 'Establecimiento comercial'
  WHEN 'CULTURAL'             THEN 'Casa de la cultura'
  WHEN 'RECREATIVO'           THEN 'Escenario deportivo'
  ELSE 'Bien de interés público'
END;

-- CreateIndex
CREATE INDEX "ItemInventario_sector_idx" ON "ItemInventario"("sector");

-- Drop del subtipo (ahora el tipo concreto es texto libre) y de los enums viejos.
ALTER TABLE "ItemInventario" DROP COLUMN "subtipoBien";
DROP TYPE "TipoBien";
DROP TYPE "SubtipoBien";
