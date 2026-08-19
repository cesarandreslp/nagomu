-- Foto del inmueble afectado (spec 006, T020).
--
-- Opcional a proposito: el registro del hogar se completa sin ella (Principio III).
-- Guarda solo la ruta en almacenamiento privado; el archivo se sirve por la aplicacion
-- para que la descarga quede auditada, nunca por URL directa.
ALTER TABLE "HogarDamnificado" ADD COLUMN "fotoRuta" TEXT;
