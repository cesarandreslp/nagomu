# Data Model: Auto-registro de voluntariados

**Fecha**: 2026-08-18 | **Plan**: [plan.md](./plan.md)

Convenciones del proyecto: ids opacos (cuid), marcas de tiempo del servidor, tablas de
historial inmutables (disparador que rechaza UPDATE/DELETE). Nada de datos personales de
afectados aquí.

---

## Cambios sobre entidades existentes

### `Usuario` — pasa a doble pertenencia

| Campo | Antes | Ahora |
|---|---|---|
| `entidadId` | `String` (obligatorio) | `String?` (opcional) |
| `actorId` | — | `String?` único → `Actor` de tipo `VOLUNTARIADO` |

**Invariante (en la base, no solo en la app)**: exactamente uno de `entidadId` / `actorId` es
no nulo.

```sql
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_pertenece_a_uno"
  CHECK ((("entidadId" IS NOT NULL)::int + ("actorId" IS NOT NULL)::int) = 1);
```

Un `Usuario` con `actorId` es una cuenta de voluntariado: sin entidad, sin nivel, sin autoridad
territorial.

### `Actor` — el voluntariado gana coordenada, municipio de operación y estado

Estos campos aplican solo cuando `tipo = VOLUNTARIADO`; son nulos en los demás actores. La
garantía "solo voluntariados los usan" se valida en la aplicación (un `CHECK` por tipo sería
frágil frente a futuros tipos).

| Campo | Tipo | Notas |
|---|---|---|
| `latitud` | `Float?` | Punto de operación de la organización. Validado con `lib/geo.ts`. Diferido desde spec 002 |
| `longitud` | `Float?` | Idem |
| `municipioOperacionId` | `String?` | → `EntidadTerritorial` de nivel `MUNICIPIO`. Quién puede verificarlo |
| `estadoVerificacion` | enum `EstadoVerificacion` | `PENDIENTE` (default) \| `VERIFICADO` \| `RECHAZADO` |
| `cuenta` | relación | El `Usuario` que lo controla, si se auto-registró (0..1) |
| `verificaciones` | relación | Historial `VerificacionVoluntariado[]` |

**Enum nuevo**:

```
EstadoVerificacion = PENDIENTE | VERIFICADO | RECHAZADO
```

`estadoVerificacion` es el estado vigente; su historia vive en `VerificacionVoluntariado`. No se
edita a mano: se actualiza en la misma transacción que inserta el asiento (como `Obra.estado`).

---

## Entidad nueva

### `VerificacionVoluntariado` — inmutable

Un asiento por decisión del municipio sobre un voluntariado.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `actorId` | cuid | El voluntariado sobre el que recae |
| `municipioId` | cuid | Municipio que decide. MUST ser el `municipioOperacionId` del actor |
| `funcionarioId` | cuid | `Usuario` del municipio que actuó |
| `resultado` | enum | `VERIFICADO` \| `RECHAZADO` \| `REVOCADO` |
| `motivo` | texto? | Obligatorio en `RECHAZADO` y `REVOCADO` |
| `creadoEn` | fecha | Marca del servidor |

Un `UPDATE`/`DELETE` sobre esta tabla lo rechaza un disparador, igual que `RegistroAuditoria`,
`CostoObra` y `CambioEstadoIntervencion`.

**Índices**: `(actorId, creadoEn)`.

---

## Estados y transiciones

Estado vigente en `Actor.estadoVerificacion`, decidido por el municipio de operación. Motivo
obligatorio en las que restan confianza.

```
                 verificar
   PENDIENTE ───────────────▶ VERIFICADO
      │                          │
      │ rechazar (motivo)        │ revocar (motivo)  → asiento REVOCADO
      ▼                          ▼
   RECHAZADO ◀───────────────────┘
      │
      │ reconsiderar
      └──────────▶ VERIFICADO
```

Reglas (en `lib/verificacion.ts`, función pura con test):

- `verificar`: desde `PENDIENTE` o `RECHAZADO` → `VERIFICADO`. Sin motivo.
- `rechazar`: desde `PENDIENTE` → `RECHAZADO`. Motivo obligatorio.
- `revocar`: desde `VERIFICADO` → `RECHAZADO`. Motivo obligatorio. El asiento guarda `REVOCADO`.
- Cualquier otra transición se rechaza y se audita.

---

## Sesión (tipos en `lib/auth.ts`, no en la base)

```
SesionFuncionario  = { tipo: "FUNCIONARIO", usuarioId, nombre, entidadId, entidadNombre, nivel, departamentoId }
SesionVoluntariado = { tipo: "VOLUNTARIADO", usuarioId, actorId, nombre }
Cuenta             = SesionFuncionario | SesionVoluntariado
```

`SesionFuncionario` es la `SesionActiva` de hoy con el discriminante añadido. `requerirSesion`
devuelve funcionario y manda al voluntario a `/voluntariado`. `requerirVoluntario` hace lo
inverso.

---

## Reglas derivadas

**Visible en el mapa** (capa de voluntariados, integra spec 002):

```
voluntariado aparece  ⟺  tipo = VOLUNTARIADO
                          ∧ estadoVerificacion = VERIFICADO
                          ∧ latitud ≠ null ∧ longitud ≠ null
                          ∧ municipioOperacion ∈ ámbito del usuario que mira
```

**Puede verificar** (`puedeVerificarVoluntariado`):

```
sesión.tipo = FUNCIONARIO ∧ sesión.nivel = MUNICIPIO
                          ∧ sesión.entidadId = actor.municipioOperacionId
```

**Puede editar su registro**: solo la cuenta cuyo `actorId` coincide con el actor. No hay ruta
por la que una cuenta acceda a otro registro.
