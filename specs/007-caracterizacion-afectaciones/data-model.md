# Data Model: caracterización integral de afectaciones

**Fecha**: 2026-08-19 | **Plan**: [plan.md](./plan.md)

Convenciones: ids opacos (cuid), marcas del servidor, auditoría append-only. La clasificación
**público/reservado** (enmienda 4.0.0) se marca por campo. Ninguna vista pública selecciona un
campo reservado.

---

## `ItemInventario` — generalizado a "bien afectado"

| Campo | Tipo | Clasif. | Notas |
|---|---|---|---|
| `id` | cuid | público | |
| `municipioId` | cuid | público | Dueño territorial |
| `nombre` | texto | público | Nombre/rótulo del bien |
| `tipoBien` | enum `TipoBien` | público | VIVIENDA / COMERCIO / ESTRUCTURA_PUBLICA / AGROPECUARIO (**nuevo**) |
| `subtipoBien` | enum? `SubtipoBien` | público | Para agropecuario: CULTIVO/MAQUINARIA/BODEGA/CORRAL/ANIMALES/ESTANQUE/ALIMENTO_ANIMAL (**nuevo**) |
| `estadoAfectacion` | enum? `EstadoAfectacion` | público | HABITABLE/REPARABLE/DEMOLER · PERDIDO/PARCIAL (**nuevo**) |
| `categoria` | enum? `CategoriaItem` | público | **Ahora opcional**: solo la infra que se vuelve obra |
| `descripcionDano` | texto | público | |
| `latitud`/`longitud` | Float? | público | El **punto** (transparencia) |
| `corregimiento` | texto? | público | Lugar general (**nuevo**) |
| `vereda` | texto? | público | Lugar general (**nuevo**) |
| `ubicacion` | texto | **RESERVADO** | La **dirección** exacta. NUNCA pública |
| `obra` | relación | — | `Obra?` — solo infra pública |
| `hogares` | relación | reservado | `HogarDamnificado[]` — varias familias por vivienda (spec 006) |

**Invariantes**: `estadoAfectacion` coherente con `tipoBien` (habitabilidad para estructuras;
perdido/parcial para productivos). Solo `tipoBien = ESTRUCTURA_PUBLICA` con `categoria` puede tener
`Obra`. `ubicacion` MUST NOT aparecer en ninguna consulta pública.

**Migración**: `categoria` → nullable; `tipoBien` NOT NULL con backfill `ESTRUCTURA_PUBLICA`; demás
campos nullable. Sin pérdida.

---

## `NecesidadSalud` — indicador categorizado (US2)

Ligada al hogar (spec 006). **Reservada**. Solo con `AutorizacionTratamiento` otorgada.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `hogarId` | cuid | → `HogarDamnificado` |
| `tipo` | enum `TipoNecesidadSalud` | CONDICION_CRONICA / DIALISIS / EMBARAZO_RIESGO / DISCAPACIDAD / OXIGENO / OTRA (lista cerrada) |
| `registradoPorId` | cuid | Funcionario |
| `creadoEn` | fecha | |

**Invariante**: no se crea sin `AutorizacionTratamiento(hogar).otorgada`. **NUNCA** diagnóstico,
historia ni detalle clínico — solo la categoría, para **referir** a salud.

**Índice**: `(hogarId)`.

---

## Reutiliza sin cambios (o con cambios menores)

- `HogarDamnificado` (spec 006): ya admite varias familias por inmueble (`inmuebleId`) y trae la
  composición como conteos, `AutorizacionTratamiento`, foto sin metadatos. **US2 solo le suma
  `NecesidadSalud`.**
- `AutorizacionTratamiento` (spec 006): la misma constancia habilita documento **y** salud.
- `lib/imagen.ts` (spec 006): fotos sin metadatos.
- `Obra` + cola (spec 001): intactas; solo las alcanza la infra pública.
- Mapa (002), tablero (005), landing (004): consumen lo público.

---

## Reglas derivadas

**Público vs reservado** (enmienda 4.0.0):

```
consulta pública (censo, mapa público, landing)  → selecciona SOLO campos públicos
                                                    NUNCA ubicacion, dueño ni detalle de hogar
detalle reservado (dirección, hogares, salud)     → solo el municipio dueño (Principio II)
agregados hacia arriba (gobernación/nación)       → conteos por tipo/afectación/lugar; sin reservado
```

**Salud** (enmienda 4.0.0):

```
crear NecesidadSalud  ⟺  existe AutorizacionTratamiento(hogar).otorgada
NecesidadSalud.tipo ∈ lista cerrada   (nunca diagnóstico ni detalle)
```

**Obra**: `tipoBien = ESTRUCTURA_PUBLICA ∧ categoria != null` ⇒ puede tener `Obra` con cola.
