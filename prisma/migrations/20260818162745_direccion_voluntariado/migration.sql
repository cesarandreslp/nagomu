-- Direccion fisica opcional de la sede del voluntariado, para quien registra sin coordenadas.
-- Es la direccion de la organizacion, nunca de una persona (Principio IV).
ALTER TABLE "Actor" ADD COLUMN "direccion" TEXT;
