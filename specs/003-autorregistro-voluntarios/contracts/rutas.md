# Contrato de rutas y Server Actions: auto-registro de voluntariados

**Fecha**: 2026-08-18 | **Plan**: [plan.md](../plan.md)

Sigue la convención de spec 001: sin API pública; el contrato son las rutas HTML y las Server
Actions invocadas por formularios. Cada acción verifica autorización antes de tocar datos,
escribe en `RegistroAuditoria` permita o rechace, y termina en un `redirect` a un `GET`.

---

## Rutas de lectura

| Ruta | Quién | Qué muestra |
|---|---|---|
| `GET /voluntariado/registro` | Público | Formulario de auto-registro (nombre, correo, contraseña, contacto, municipio de operación, coordenada) |
| `GET /voluntariado` | Voluntariado autenticado | Su propio registro y estado de verificación; formulario para editarlo |
| `GET /voluntariados` | Municipio | Voluntariados cuyo `municipioOperacion` es el suyo: pendientes, verificados y rechazados, con acciones |
| `GET /mapa` | Autenticado | (Existente, spec 002) + capa de voluntariados `VERIFICADO` con coordenada del ámbito |

**Vistas críticas sin JavaScript**: `/voluntariado/registro`, `/voluntariado`, `/login`. Sin
componentes de cliente; todo por envío de formulario (Principio III).

**Cortes de autoridad**:
- Una `SesionVoluntariado` que abra `/obras`, `/departamento`, `/municipio/*`, `/voluntariados`
  o cualquier vista operativa → `redirect("/voluntariado")`. El intento se audita (Principio II).
- Una `SesionFuncionario` que abra `/voluntariado` (espacio del voluntario) → `redirect("/")`.

---

## Acciones de escritura

### `registrarVoluntariado`  (pública, sin sesión)

Campos: `nombre`, `correo`, `contrasena`, `contacto`, `municipioOperacionId`, `latitud?`,
`longitud?`.

- Valida: campos obligatorios; `municipioOperacionId` existe y es `MUNICIPIO`; coordenada con
  `parsearCoordenada` (o ambas vacías).
- Correo único: si ya existe, `redirect("/voluntariado/registro?error=registro")` con mensaje
  genérico (no revela si el correo o el nombre ya existían — anti-enumeración).
- Colisión de nombre (`Actor(VOLUNTARIADO)` con ese nombre): reclama el actor si no tiene
  cuenta; si la tiene, mismo error genérico (ver research D6).
- Crea `Actor(VOLUNTARIADO, estadoVerificacion=PENDIENTE)` + `Usuario(actorId, hash)` en una
  transacción; inicia sesión; audita `voluntariado.registrar`. → `redirect("/voluntariado")`.
- Falla: coordenada inválida → `?error=coordenada`; municipio inválido → `?error=municipio`;
  faltantes → `?error=faltan`.

### `actualizarVoluntariado`  (voluntariado autenticado)

Campos: `contacto`, `latitud?`, `longitud?` (el nombre y el municipio de operación no se editan
en esta versión: cambiarlos alteraría la identidad ya evaluada por el municipio).

- Autoriza: la acción opera **siempre** sobre `sesion.actorId`; nunca recibe un id de actor del
  formulario (no hay forma de tocar otro registro).
- Valida coordenada. Audita `voluntariado.actualizar`. → `redirect("/voluntariado")`.
- **Efecto sobre verificación**: editar el propio contacto/coordenada NO cambia el estado. (Si
  el piloto exige re-verificar al mover la coordenada, se decide como enmienda; se deja anotado.)

### `verificarVoluntariado`  (municipio de operación)

Campos: `actorId`.

- Autoriza con `puedeVerificarVoluntariado(sesion, { municipioOperacionId })`. Si no, audita
  rechazo y `redirect("/voluntariados?error=permiso")`.
- Valida transición (`PENDIENTE`|`RECHAZADO` → `VERIFICADO`). En una transacción: inserta
  `VerificacionVoluntariado(resultado=VERIFICADO)` y pone `estadoVerificacion=VERIFICADO`.
- Audita `voluntariado.verificar`. → `redirect("/voluntariados")`.

### `rechazarVoluntariado`  (municipio de operación)

Campos: `actorId`, `motivo` (obligatorio).

- Autoriza igual. Sin motivo → `?error=motivo`. Transición `PENDIENTE → RECHAZADO`.
- Inserta asiento `RECHAZADO` con motivo; estado `RECHAZADO`. Audita `voluntariado.rechazar`.

### `revocarVoluntariado`  (municipio de operación)

Campos: `actorId`, `motivo` (obligatorio).

- Autoriza igual. Transición `VERIFICADO → RECHAZADO`. Inserta asiento `REVOCADO` con motivo;
  estado `RECHAZADO`. Audita `voluntariado.revocar`.
- Efecto inmediato: el voluntariado desaparece de la capa del mapa (FR-017).

### `iniciarSesion`  (existente, se modifica)

- Tras autenticar, bifurca por el tipo de cuenta (research D5): `actorId` → sesión de
  voluntariado, `redirect("/voluntariado")`; `entidadId` → flujo territorial, `redirect("/")`.
- Conserva el señuelo de tiempo (`HASH_SENUELO`) y el mensaje genérico de credenciales.

---

## Matriz de autorización (casos clave para prueba)

| Acción | Voluntario propio | Otro voluntario | Municipio de operación | Otro municipio | Gobernación/Nación |
|---|---|---|---|---|---|
| Editar registro | ✅ (el suyo) | ❌ (sin ruta) | ❌ | ❌ | ❌ |
| Verificar / rechazar / revocar | ❌ | ❌ | ✅ | ❌ (audita) | ❌ (audita) |
| Ver en mapa (si VERIFICADO+coord) | — | — | ✅ (los de su territorio) | ❌ | ✅ (su ámbito) |
| Abrir vista operativa (`/obras`…) | ❌ → `/voluntariado` | — | ✅ | ✅ | ✅ |

Las pruebas obligatorias (constitución) cubren esta matriz y la inmutabilidad de
`VerificacionVoluntariado`.
