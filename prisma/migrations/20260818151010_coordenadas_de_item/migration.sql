-- Coordenada opcional de la infraestructura afectada (no de personas: Principio IV).
-- Nullable: un item sin coordenada no se dibuja en el mapa pero permanece en la lista.
ALTER TABLE "ItemInventario" ADD COLUMN "latitud" DOUBLE PRECISION;
ALTER TABLE "ItemInventario" ADD COLUMN "longitud" DOUBLE PRECISION;
