-- Registro municipal de damnificados (spec 006).
--
-- IMPORTANTE — por que estas tablas NO llevan el disparador nagomu_rechazar_modificacion()
-- que protege al resto del sistema (RegistroAuditoria, Aporte, CostoObra, Documento...):
--
-- El titular de los datos tiene derecho a que se supriman (habeas data, Ley 1581 de 2012 y
-- Decreto 1377 de 2013). Una tabla append-only haria imposible ejercer ese derecho: el dato
-- personal quedaria ahi para siempre. La enmienda constitucional 3.0.0 abrio la puerta al
-- documento del damnificado justamente con esa condicion.
--
-- Lo que SI queda registrado de forma inmutable es el HECHO: la auditoria anota que el hogar
-- X se suprimio en la fecha Y, sin conservar lo suprimido. Asi conviven el Principio I
-- (trazabilidad) y el Principio IV (minimo de datos personales).
--
-- NO agregar disparadores de inmutabilidad aqui. Si alguna vez parece necesario, lo que hace
-- falta es una enmienda constitucional, no un ALTER TABLE.
-- CreateEnum
CREATE TYPE "EstadoAyudaHogar" AS ENUM ('PENDIENTE', 'ENTREGADA');

-- CreateTable
CREATE TABLE "HogarDamnificado" (
    "id" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "responsableNombre" TEXT NOT NULL,
    "documento" TEXT,
    "inmuebleId" TEXT,
    "personasTotal" INTEGER NOT NULL DEFAULT 0,
    "personasNinez" INTEGER NOT NULL DEFAULT 0,
    "personasAdultoMayor" INTEGER NOT NULL DEFAULT 0,
    "personasDiscapacidad" INTEGER NOT NULL DEFAULT 0,
    "hayHeridos" INTEGER NOT NULL DEFAULT 0,
    "hayFallecidos" INTEGER NOT NULL DEFAULT 0,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HogarDamnificado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutorizacionTratamiento" (
    "id" TEXT NOT NULL,
    "hogarId" TEXT NOT NULL,
    "otorgada" BOOLEAN NOT NULL DEFAULT false,
    "medio" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutorizacionTratamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AyudaAHogar" (
    "id" TEXT NOT NULL,
    "hogarId" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "estado" "EstadoAyudaHogar" NOT NULL DEFAULT 'PENDIENTE',
    "fecha" TIMESTAMP(3),
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AyudaAHogar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HogarDamnificado_municipioId_idx" ON "HogarDamnificado"("municipioId");

-- CreateIndex
CREATE INDEX "HogarDamnificado_municipioId_documento_idx" ON "HogarDamnificado"("municipioId", "documento");

-- CreateIndex
CREATE UNIQUE INDEX "AutorizacionTratamiento_hogarId_key" ON "AutorizacionTratamiento"("hogarId");

-- CreateIndex
CREATE INDEX "AyudaAHogar_hogarId_idx" ON "AyudaAHogar"("hogarId");

-- CreateIndex
CREATE INDEX "AyudaAHogar_ofertaId_idx" ON "AyudaAHogar"("ofertaId");

-- AddForeignKey
ALTER TABLE "HogarDamnificado" ADD CONSTRAINT "HogarDamnificado_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "EntidadTerritorial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HogarDamnificado" ADD CONSTRAINT "HogarDamnificado_inmuebleId_fkey" FOREIGN KEY ("inmuebleId") REFERENCES "ItemInventario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HogarDamnificado" ADD CONSTRAINT "HogarDamnificado_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutorizacionTratamiento" ADD CONSTRAINT "AutorizacionTratamiento_hogarId_fkey" FOREIGN KEY ("hogarId") REFERENCES "HogarDamnificado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutorizacionTratamiento" ADD CONSTRAINT "AutorizacionTratamiento_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AyudaAHogar" ADD CONSTRAINT "AyudaAHogar_hogarId_fkey" FOREIGN KEY ("hogarId") REFERENCES "HogarDamnificado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AyudaAHogar" ADD CONSTRAINT "AyudaAHogar_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "OfertaInstitucional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AyudaAHogar" ADD CONSTRAINT "AyudaAHogar_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


