/**
 * Bloque de autorizacion de tratamiento de datos (Ley 1581 de 2012).
 *
 * Vive en un solo archivo y lo usan el registro y la ficha del hogar. Si el texto que se le
 * lee a la familia estuviera copiado en dos pantallas, tarde o temprano una diria una cosa
 * y la otra, otra — y lo que la familia autorizo dejaria de estar claro.
 *
 * Es el gemelo en la interfaz del candado del servidor: sin esta casilla marcada, el
 * documento no se guarda, aunque venga escrito en el formulario.
 */
export function TextoLey1581({ otorgada = false }: { otorgada?: boolean }) {
  return (
    <fieldset>
      <legend>Autorizacion de tratamiento de datos</legend>
      <p className="discreto">
        Leale esto a la persona responsable antes de marcar la casilla:
      </p>
      <blockquote>
        El municipio va a guardar su nombre, su documento y la composicion de su hogar con un
        unico fin: coordinar la ayuda por la emergencia. No se comparte con nadie mas que las
        entidades que atienden la emergencia, y usted puede pedir en cualquier momento que se
        elimine su nombre y su documento, sin perder la ayuda ya asignada (Ley 1581 de 2012).
      </blockquote>

      <label>
        <input type="checkbox" name="autorizaTratamiento" value="si" defaultChecked={otorgada} />
        <span>La persona autoriza el tratamiento de sus datos</span>
      </label>

      <label>
        <span>Como lo autorizo</span>
        <select name="medioAutorizacion" defaultValue="VERBAL">
          <option value="VERBAL">Verbalmente, en la visita</option>
          <option value="FIRMA">Firmo el formato en papel</option>
          <option value="DIGITAL">Por medio digital</option>
        </select>
      </label>

      <p className="discreto">
        Sin esta autorizacion el hogar se registra igual, pero <strong>sin el documento</strong>:
        el resto de los datos alcanza para atenderlo.
      </p>
    </fieldset>
  );
}
