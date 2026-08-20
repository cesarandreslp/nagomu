-- Clave de idempotencia de la captura en campo (spec 008).
--
-- Lo que se captura sin señal se guarda en el dispositivo y se reenvia despues. Ese reenvio
-- es "al menos una vez": si la respuesta del servidor se pierde, o si dos pestañas vacian la
-- cola a la vez, el mismo registro llega dos veces. El dispositivo genera la clave ANTES del
-- primer intento y la repite en cada reintento, asi que el segundo envio se reconoce.
--
-- La unicidad la impone Postgres y no la aplicacion (Restricciones Tecnicas): un hogar
-- damnificado duplicado es una familia contada dos veces y otra que nadie va a buscar.
-- El indice unico ignora los NULL, asi que los registros hechos en linea —que no llevan
-- clave— no se ven afectados.

ALTER TABLE "ItemInventario" ADD COLUMN "claveCaptura" TEXT;
ALTER TABLE "HogarDamnificado" ADD COLUMN "claveCaptura" TEXT;

CREATE UNIQUE INDEX "ItemInventario_claveCaptura_key" ON "ItemInventario"("claveCaptura");
CREATE UNIQUE INDEX "HogarDamnificado_claveCaptura_key" ON "HogarDamnificado"("claveCaptura");
