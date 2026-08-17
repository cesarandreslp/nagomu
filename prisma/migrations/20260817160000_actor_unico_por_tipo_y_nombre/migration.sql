-- Un actor por tipo y nombre.
--
-- Sin esta restriccion, cada aporte o intervencion de la misma empresa creaba una fila
-- nueva de Actor: la lista se llenaba de "Constructora del Valle SAS" repetida y era
-- imposible sumar cuanto habia puesto. La garantia vive en la base para que no dependa
-- de que cada llamador se acuerde de buscar antes de crear.

CREATE UNIQUE INDEX "Actor_tipo_nombre_key" ON "Actor"("tipo", "nombre");
