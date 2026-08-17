# Contrato de rutas y acciones de servidor

**Fecha**: 2026-08-16 | **Plan**: [plan.md](../plan.md)

La aplicación no expone API pública en esta versión. Su contrato son las rutas HTML y las
Server Actions invocadas por formularios. Toda ruta exige sesión válida salvo `/login`.

**Regla transversal**: cada Server Action verifica autorización antes de tocar datos, escribe en
`RegistroAuditoria` tanto si permite como si rechaza, y responde con `redirect` a una ruta `GET`
para que el envío sin JavaScript termine en una página, no en una respuesta suelta.

---

## Rutas de lectura

| Ruta | Quién | Qué muestra |
|---|---|---|
| `GET /login` | Público | Formulario de correo y contraseña |
| `GET /` | Autenticado | Redirige a `/obras` o `/departamento` según el nivel |
| `GET /obras` | Autenticado | Inventario del municipio del usuario, ordenado por nivel y puntaje. Cada fila: nombre, nivel, puntaje, estado, brecha, posición en cola, año estimado |
| `GET /obras/[obraId]` | Autenticado | Detalle: factores del puntaje con sus valores, costos, aportes, intervenciones, brecha, escenarios de plazo |
| `GET /obras/[obraId]?aporteSimulado=<monto>&nivelSimulado=<nivel>` | Autenticado | La misma página con la cola recalculada incluyendo un aporte hipotético |
| `GET /obras/[obraId]/historial` | Autenticado | Auditoría legible de la obra en orden cronológico |
| `GET /departamento` | Departamento, Nación | Obras de todos los municipios del ámbito, ordenadas por prioridad |
| `GET /departamento?orden=impacto` | Departamento, Nación | Ordenadas por reducción de plazo que produciría un aporte |
| `GET /municipio/capacidad` | Municipio | Serie histórica de capacidad fiscal reportada |

**Vistas críticas sin JavaScript**: `/obras`, `/obras/[obraId]` y `/departamento`. No contienen
componentes de cliente. La simulación de aporte es un formulario `GET`, por lo que funciona con
el navegador solo.

---

## Acciones de escritura

Cada entrada indica los campos del formulario, quién puede ejecutarla y qué falla.

### `iniciarSesion`

`correo`, `contrasena` → crea `Sesion`, fija cookie `httpOnly`, redirige a `/`.
Falla con mensaje genérico: no revela si el correo existe.

### `crearItemInventario`

`nombre`, `ubicacion`, `categoria`, `descripcionDano`, `personasBeneficiadas?`,
`mesesFueraDeServicio`

Solo un usuario de nivel `MUNICIPIO`, y el ítem queda a nombre de su propio municipio: el
municipio destino no se recibe del formulario, se toma de la sesión. Crea el `ItemInventario` y
su `Obra` en estado `IDENTIFICADO`.

### `registrarCotizacionEstudios`

`obraId`, `costoEstudios` → pasa la obra a `EN_ESTUDIOS`. Solo el municipio dueño.

### `registrarCostoDeEstudio`

`obraId`, `valor`, `fechaEstudio`, `referenciaDocumento`, `responsable`, `corrigeId?`

Crea un `CostoObra` y pasa la obra a `COSTEADO`. Solo el municipio dueño. Rechaza si la obra
está en `IDENTIFICADO`: falta la etapa de estudios.

### `cambiarEstadoObra`

`obraId`, `estadoNuevo`, `motivo?` → crea `CambioEstadoObra`. Solo el municipio dueño. Rechaza
cualquier salto de etapa.

### `registrarAporte`

`obraId`, `actorId`, `monto`, `fecha`, `estado`, `origen`, `proyectoAplazado?`, `corrigeId?`

El actor debe corresponder a la entidad del usuario, salvo que el usuario sea del municipio
dueño, que puede inscribir por actores sin usuario propio (empresas, voluntariados, personas
naturales, cooperantes). `registradoPorId` siempre es el usuario de la sesión.

Rechaza si `origen = TRASLADO_PRESUPUESTAL` sin `proyectoAplazado`, si `monto <= 0`, o si la
obra no está `COSTEADO` o posterior.

### `solicitarIntervencion`

`obraId`, `actorId`, `alcance`, `valorEquivalente`, `plazoComprometido`, `responsableTecnico`,
`autorizadaPreviamente`

Crea la `Intervencion` en `SOLICITADA`. Solo el municipio dueño la registra.

### `resolverIntervencion`

`intervencionId`, `decision` (`APROBADA` | `RECHAZADA`), `motivo?`

Solo el municipio dueño. `RECHAZADA` exige motivo.

### `registrarVerificacionCalidad`

`intervencionId`, `resultado`, `observaciones` → crea `VerificacionCalidad`. Solo el municipio
dueño.

### `suspenderIntervencion`

`intervencionId`, `motivo` — obligatorio. El `valorEquivalente` deja de contar y la brecha se
reabre.

### `recibirIntervencion`

`intervencionId` → pasa a `RECIBIDA`; solo desde ahí el `valorEquivalente` cuenta como
ejecutado. Solo el municipio dueño.

### `reportarCapacidadFiscal`

`montoAnual`, `fechaReporte`, `reportadoPor` → crea `CapacidadFiscal` para el municipio de la
sesión. Solo nivel `MUNICIPIO`.

---

## Matriz de autorización

Es el contrato que `tests/authz.test.ts` recorre completo, incluidos los casos que deben fallar.

| Acción | Municipio dueño | Otro municipio | Gobernación del ámbito | Otra gobernación | Nación |
|---|---|---|---|---|---|
| Ver cualquier obra | Sí | Sí | Sí | Sí | Sí |
| Crear ítem / editar obra | Sí | No | No | No | No |
| Registrar costo de estudio | Sí | No | No | No | No |
| Cambiar estado de obra | Sí | No | No | No | No |
| Registrar aporte propio | Sí | No | Sí | No | Sí |
| Registrar aporte de tercero sin usuario | Sí | No | No | No | No |
| Editar aporte ajeno | No | No | No | No | No |
| Autorizar, suspender o recibir intervención | Sí | No | No | No | No |
| Verificar calidad | Sí | No | No | No | No |
| Reportar capacidad fiscal | Sí | No | No | No | No |

Todo `No` produce rechazo y un `RegistroAuditoria` con `resultado = RECHAZADO`.

---

## Errores

Sin JavaScript no hay validación en el cliente. Cada acción que falla vuelve a renderizar el
formulario en el servidor con los valores digitados y el mensaje de error. Ningún mensaje
incluye datos personales ni revela existencia de registros fuera del ámbito del usuario.
