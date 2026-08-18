# Research: Auto-registro de voluntariados

**Fecha**: 2026-08-18 | **Plan**: [plan.md](./plan.md)

Decisiones de diseño previas a escribir código. Cada una resuelve una incógnita del plan.

---

## D1. Modelo de cuenta: extender `Usuario` vs tabla nueva

**Decisión**: extender `Usuario`. Hacer `entidadId` **nullable** y añadir `actorId` (opcional,
único) que apunta a un `Actor` de tipo `VOLUNTARIADO`. Una restricción `CHECK` en Postgres
garantiza que exactamente uno de los dos esté presente.

**Rationale**: `Sesion`, el hash `scrypt` (`lib/contrasenas.ts`) y `iniciarSesion` ya cuelgan
de `Usuario`. Una tabla `CuentaVoluntariado` separada obligaría a duplicar todo ese cableado
(sesión, cookie, señuelo de tiempo, auditoría de login). Reutilizar `Usuario` es menos código
y un solo camino de autenticación. La enmienda 2.0.0 levantó justamente el invariante "no hay
usuarios sin entidad" que lo impedía.

**Alternativas descartadas**: tabla de cuentas aparte (duplica login/sesión); reutilizar el
`Actor` como cuenta (un actor no tiene credenciales y muchos actores no son cuentas).

**Riesgo**: `entidadId` deja de ser `NOT NULL`. Se mitiga con el `CHECK` en la base (Principio
de integridad) y una prueba contra base que verifica que no se puede crear un `Usuario` sin
ninguno de los dos ni con los dos.

---

## D2. Forma de la sesión: unión discriminada

**Decisión**: la sesión pasa a ser una unión con discriminante `tipo`:

- `SesionFuncionario` = la `SesionActiva` actual (entidadId, entidadNombre, nivel, departamentoId).
- `SesionVoluntariado` = { tipo, usuarioId, actorId, nombre }. Sin ámbito territorial.

`requerirSesion()` sigue devolviendo **solo** funcionario y **redirige a `/voluntariado`** a
una cuenta de voluntariado: así ninguna vista operativa existente cambia y un voluntario nunca
entra a territorio ajeno (Principio II). Se añade `requerirVoluntario()` para las rutas del
voluntario.

**Rationale**: no tocar los ~15 llamadores de `requerirSesion` que leen `entidadId`/`nivel`.
El rechazo del voluntario en vistas territoriales queda en un solo lugar.

**Alternativas descartadas**: un campo `nivel = "VOLUNTARIADO"` dentro de `SesionActiva` —
contaminaría cada consumidor territorial con un caso que no aplica y arriesga fugas.

---

## D3. Estado de verificación: estado almacenado + historial append-only

**Decisión**: `Actor` (voluntariado) lleva `estadoVerificacion` ∈ {`PENDIENTE`, `VERIFICADO`,
`RECHAZADO`} (default `PENDIENTE`). Cada cambio inserta un asiento inmutable en
`VerificacionVoluntariado` con `resultado` ∈ {`VERIFICADO`, `RECHAZADO`, `REVOCADO`}. El estado
se actualiza en la misma transacción que el asiento.

**Rationale**: es exactamente el patrón ya probado de `Intervencion` (estado vigente + tabla
`CambioEstadoIntervencion` append-only). `REVOCADO` es un resultado del historial que deja el
estado en `RECHAZADO` (deja de ser oficial). No se inventa un mecanismo nuevo.

**Transiciones válidas** (irán en `lib/verificacion.ts`, función pura con test):

```
PENDIENTE  → VERIFICADO   (verificar)
PENDIENTE  → RECHAZADO    (rechazar, exige motivo)
VERIFICADO → RECHAZADO    (revocar, exige motivo; resultado histórico = REVOCADO)
RECHAZADO  → VERIFICADO   (reconsiderar)
```

**Alternativas descartadas**: un booleano `verificado` — pierde el historial (Principio I) y no
distingue rechazo de revocación.

---

## D4. Autoridad de verificación: el municipio de operación declarado

**Decisión**: en el registro el voluntariado elige **un** municipio de operación
(`municipioOperacionId`). Solo un funcionario de ese municipio puede verificar/rechazar/revocar.

**Rationale**: los actores son globales (sin dueño). Sin un municipio responsable, "cualquiera
verifica a cualquiera" reabre el hueco de confianza que la feature cierra. Un dueño claro es
simple y auditable. `puedeVerificarVoluntariado` es una función pura análoga a
`puedeAutorizarIntervencion`.

**Alternativas descartadas**: verificación por cualquier municipio (sin responsable claro);
verificación por la gobernación (aleja la decisión de quien conoce el terreno). Operar en
varios municipios queda **fuera de alcance** (assumption del spec).

---

## D5. Login unificado y anti-enumeración

**Decisión**: `iniciarSesion` bifurca tras autenticar: si el usuario tiene `actorId` (es
voluntario) crea sesión de voluntariado y redirige a `/voluntariado`; si tiene `entidadId`,
flujo territorial actual. Se conserva el camino de tiempo constante con `HASH_SENUELO` y el
mensaje genérico de credenciales.

**Rationale**: un solo formulario de login, un solo camino resistente a enumeración por tiempo
(`lib/contrasenas.ts` ya lo resuelve). El correo duplicado en el registro devuelve un error
genérico que no revela si la cuenta existe.

**Alternativas descartadas**: login separado para voluntarios (duplica el señuelo de tiempo y
el manejo de sesión).

---

## D6. Colisión de nombre con un actor existente

**Decisión**: el registro intenta vincularse a un `Actor(VOLUNTARIADO)` con ese nombre si
existe y **no tiene cuenta** (ningún `Usuario.actorId` lo referencia); en ese caso lo reclama y
lo deja en `PENDIENTE`. Si ya tiene cuenta, el registro se rechaza por nombre en uso (mismo
error genérico). Si no existe, se crea nuevo.

**Rationale**: respeta el índice único `(tipo, nombre)` ya existente y evita duplicar
"Cruz Roja" como dos actores. Reclamar un actor creado por un municipio no otorga verificación:
sigue `PENDIENTE` hasta que el municipio decida.

**Alternativas descartadas**: crear siempre uno nuevo (rompe el índice único); fusionar
automáticamente (podría secuestrar el historial de aportes de otro).

---

## D7. Coordenada del voluntariado

**Decisión**: `Actor` gana `latitud`/`longitud` opcionales (los que spec 002 difirió a aquí),
validados con `parsearCoordenada` de `lib/geo.ts`. Es el punto de operación de la organización.

**Rationale**: reutiliza la validación ya probada; no duplica reglas de rango. Nullable: un
voluntariado sin coordenada existe pero no se dibuja en el mapa.

---

## D8. Abuso del registro público

**Decisión**: en esta versión no se añade CAPTCHA ni límite de tasa. El control real
anti-suplantación es la verificación municipal: un registro sin verificar no aparece como
oficial. Se deja anotado como endurecimiento posterior (límite de tasa por IP, confirmación de
correo) para el piloto si aparece spam.

**Rationale**: no meter complejidad (Principio V) antes de una limitación medida. La puerta de
confianza ya existe aguas abajo. Se marca con comentario `ponytail:` en el código de registro.

**Alternativas descartadas**: exigir confirmación de correo antes de poder iniciar sesión
(bloquea el flujo sin cerrar el vector real, que es la falsedad de identidad de la organización,
no la del correo).
