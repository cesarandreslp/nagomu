-- CreateEnum
CREATE TYPE "NivelTerritorial" AS ENUM ('MUNICIPIO', 'DEPARTAMENTO', 'NACION');

-- CreateEnum
CREATE TYPE "TipoActor" AS ENUM ('ENTIDAD_TERRITORIAL', 'EMPRESA', 'FUNDACION', 'ONG', 'VOLUNTARIADO', 'PERSONA_NATURAL', 'COOPERANTE_INTERNACIONAL');

-- CreateEnum
CREATE TYPE "ResultadoAccion" AS ENUM ('PERMITIDO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "EntidadTerritorial" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivel" "NivelTerritorial" NOT NULL,
    "departamentoId" TEXT,
    "nbi" DECIMAL(5,2),
    "codigoDane" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntidadTerritorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "hashContrasena" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actor" (
    "id" TEXT NOT NULL,
    "tipo" "TipoActor" NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "entidadId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Actor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAuditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "entidadId" TEXT,
    "nivel" "NivelTerritorial",
    "accion" TEXT NOT NULL,
    "objetivoTipo" TEXT NOT NULL,
    "objetivoId" TEXT,
    "resultado" "ResultadoAccion" NOT NULL,
    "motivoRechazo" TEXT,
    "datos" JSONB NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntidadTerritorial_codigoDane_key" ON "EntidadTerritorial"("codigoDane");

-- CreateIndex
CREATE INDEX "EntidadTerritorial_nivel_idx" ON "EntidadTerritorial"("nivel");

-- CreateIndex
CREATE INDEX "EntidadTerritorial_departamentoId_idx" ON "EntidadTerritorial"("departamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE INDEX "Usuario_entidadId_idx" ON "Usuario"("entidadId");

-- CreateIndex
CREATE INDEX "Sesion_usuarioId_idx" ON "Sesion"("usuarioId");

-- CreateIndex
CREATE INDEX "Sesion_expiraEn_idx" ON "Sesion"("expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "Actor_entidadId_key" ON "Actor"("entidadId");

-- CreateIndex
CREATE INDEX "Actor_tipo_idx" ON "Actor"("tipo");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_objetivoTipo_objetivoId_idx" ON "RegistroAuditoria"("objetivoTipo", "objetivoId");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_creadoEn_idx" ON "RegistroAuditoria"("creadoEn");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_usuarioId_idx" ON "RegistroAuditoria"("usuarioId");

-- AddForeignKey
ALTER TABLE "EntidadTerritorial" ADD CONSTRAINT "EntidadTerritorial_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "EntidadTerritorial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_entidadId_fkey" FOREIGN KEY ("entidadId") REFERENCES "EntidadTerritorial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actor" ADD CONSTRAINT "Actor_entidadId_fkey" FOREIGN KEY ("entidadId") REFERENCES "EntidadTerritorial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAuditoria" ADD CONSTRAINT "RegistroAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAuditoria" ADD CONSTRAINT "RegistroAuditoria_entidadId_fkey" FOREIGN KEY ("entidadId") REFERENCES "EntidadTerritorial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Inmutabilidad (Principio I de la constitucion, NO NEGOCIABLE).
--
-- La garantia vive en la base y no en el codigo de la aplicacion: un
-- `prisma.registroAuditoria.update()` escrito por descuido dentro de seis meses
-- falla ruidosamente en el momento, sin importar quien escriba la consulta.
--
-- Se bloquea tambien TRUNCATE, que no dispara los triggers de fila y dejaria un
-- hueco en la garantia.
--
-- Esta funcion la reutilizan las migraciones posteriores para Aporte, CostoObra,
-- CambioEstadoObra, VerificacionCalidad y CapacidadFiscal.
-- ============================================================================

CREATE OR REPLACE FUNCTION nagomu_rechazar_modificacion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'La tabla % es de solo insercion: una correccion se registra como fila nueva que referencia la anterior',
    TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RegistroAuditoria_inmutable"
  BEFORE UPDATE OR DELETE ON "RegistroAuditoria"
  FOR EACH ROW EXECUTE FUNCTION nagomu_rechazar_modificacion();

CREATE TRIGGER "RegistroAuditoria_inmutable_truncate"
  BEFORE TRUNCATE ON "RegistroAuditoria"
  FOR EACH STATEMENT EXECUTE FUNCTION nagomu_rechazar_modificacion();
