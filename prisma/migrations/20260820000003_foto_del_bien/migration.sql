-- Foto del bien afectado (spec 007 US1).
--
-- Se guarda la RUTA en almacenamiento privado, no la imagen. Y la imagen que llega alli ya
-- pasó por lib/imagen.ts: sin metadatos. El EXIF de una foto de celular trae la coordenada
-- exacta de donde se tomó, y la direccion de un bien es reservada (Principio IV): seria
-- absurdo proteger el campo `ubicacion` y publicar la misma informacion dentro de un JPG.

ALTER TABLE "ItemInventario" ADD COLUMN "fotoRuta" TEXT;
