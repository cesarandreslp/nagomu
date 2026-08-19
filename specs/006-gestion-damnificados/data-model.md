# Data Model: gestión municipal de damnificados

**Fecha**: 2026-08-19 | **Plan**: [plan.md](./plan.md)

Convenciones del proyecto: ids opacos (cuid), marcas de tiempo del servidor, auditoría append-only.
**Excepción deliberada**: `HogarDamnificado` NO es append-only — el titular puede pedir supresión
(hábeas data, Ley 1581). Ninguna de estas tablas expone datos personales en URLs, logs ni errores.

---

## Entidades nuevas

### `HogarDamnificado`

El detalle vive acotado a su municipio (Principio II). El `documento` solo existe con autorización
(Principio IV, enmienda 3.0.0).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | Opaco; nunca deriva del documento |
| `municipioId` | cuid | Dueño. Acota todo el acceso al detalle |
| `responsableNombre` | texto | Nombre del responsable del hogar (mínimo para gestionar) |
| `documento` | texto? | Documento del responsable. **Nulo salvo que exista `AutorizacionTratamiento` otorgada** |
| `inmuebleId` | cuid? | → `ItemInventario` (el inmueble afectado, con su habitabilidad) |
| `personasTotal` | entero | Conteo |
| `personasNinez` | entero | Conteo |
| `personasAdultoMayor` | entero | Conteo |
| `personasDiscapacidad` | entero | Conteo |
| `hayHeridos` | entero | Indicador mínimo (conteo). **Nada clínico** |
| `hayFallecidos` | entero | Indicador mínimo (conteo). **Nada clínico** |
| `registradoPorId` | cuid | Usuario (funcionario) que digitó |
| `creadoEn` / `actualizadoEn` | fecha | Marca del servidor |

**Invariantes**: `municipioId` es de nivel `MUNICIPIO`. `documento` no se guarda sin una
`AutorizacionTratamiento` otorgada del mismo hogar (D1). Sin `municipioId` de la sesión, no hay
lectura ni escritura del detalle.

**Índices**: `(municipioId)`, y `(municipioId, documento)` para advertir duplicados.

### `AutorizacionTratamiento`

Constancia de que el hogar autorizó el tratamiento de sus datos (Ley 1581 / Decreto 1377). Sin
ella no se guarda el documento.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `hogarId` | cuid único | Uno a uno con el hogar |
| `otorgada` | booleano | Verdadero cuando el hogar autoriza |
| `medio` | texto | Cómo se otorgó (firma, verbal registrada, etc.) |
| `fecha` | fecha | |
| `registradoPorId` | cuid | Funcionario que la registró |

### `AyudaAHogar`

Aterriza el catálogo de oferta a un hogar concreto.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `hogarId` | cuid | → `HogarDamnificado` |
| `ofertaId` | cuid | → `OfertaInstitucional` (qué ayuda) |
| `estado` | enum | `PENDIENTE` \| `ENTREGADA` |
| `fecha` | fecha? | Fecha de entrega, cuando aplica |
| `registradoPorId` | cuid | Funcionario que la registró |

**Índice**: `(hogarId)`.

---

## Reutiliza (sin cambios de modelo)

- `ItemInventario` (spec 001/002) — el inmueble afectado y su habitabilidad.
- `OfertaInstitucional` (catálogo de ayudas, con `requiereRud`, `certificaEntidad`).
- `EntidadTerritorial` — el municipio dueño y el filtro por ámbito.
- `RegistroAuditoria` (append-only) — cada acción, **sin** datos personales en `datos`.

---

## Reglas derivadas

**Acceso al detalle** (Principio II + IV):

```
ver/editar detalle de un hogar  ⟺  sesión.tipo = FUNCIONARIO
                                   ∧ sesión.nivel = MUNICIPIO
                                   ∧ sesión.entidadId = hogar.municipioId
```

**Agregados hacia arriba** (lo único que ven gobernación/nación):

```
conteos por municipio del ámbito: nº de hogares, personas por grupo (niñez, adulto mayor,
discapacidad), hogares con heridos/fallecidos, hogares atendidos/pendientes por tipo de ayuda.
NUNCA se selecciona responsableNombre ni documento.
```

**Documento** (Principio IV):

```
guardar documento  ⟺  existe AutorizacionTratamiento(hogarId).otorgada = verdadero
```

**Supresión (hábeas data)**: borra `documento` y `responsableNombre` (o la fila completa) y deja un
asiento de auditoría del hecho, sin conservar lo borrado.
