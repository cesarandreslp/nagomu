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
| `sector` | enum `Sector` | público | **Doliente ministerial** (lista fija): VIVIENDA / TRANSPORTE / GESTION_RIESGO / EDUCACION / SALUD / AGUA_SANEAMIENTO / AGROPECUARIO / CULTURA_PATRIMONIO / COMERCIO / DEPORTE_RECREACION (**nuevo**) |
| `tipoBien` | **texto** | público | Tipo concreto dentro del sector ("Escuela", "Puente", "Cultivo", "Muro de contención"). **Texto libre con sugerencias** — se pueden crear otros (**nuevo**) |
| `estadoAfectacion` | enum? `EstadoAfectacion` | público | HABITABLE/REPARABLE/DEMOLER (edificaciones) · PERDIDO/PARCIAL (infraestructura y agropecuario) (**nuevo**) |
| `categoria` | enum? `CategoriaItem` | público | **Ahora opcional**: solo el bien de un sector de obra pública que entra a la cola |
| `descripcionDano` | texto | público | |
| `latitud`/`longitud` | Float? | público | El **punto** (transparencia) |
| `corregimiento` | texto? | público | Lugar general (**nuevo**) |
| `vereda` | texto? | público | Lugar general (**nuevo**) |
| `ubicacion` | texto | **RESERVADO** | La **dirección** exacta. NUNCA pública |
| `obra` | relación | — | `Obra?` — solo sectores de obra pública con categoría |
| `hogares` | relación | reservado | `HogarDamnificado[]` — varias familias por vivienda (spec 006) |

**Por qué sector + tipo (no un `tipoBien` enum plano)**: cada afectación tiene un **doliente
ministerial** distinto (un cultivo → Agricultura, una escuela → Educación, un puente → Transporte,
un muro de contención → Gestión del riesgo/UNGRD, un bien patrimonial → Cultura). El reporte sube al
doliente correcto en departamento y nación. Los dolientes (sectores) son fijos; los tipos concretos
dentro de cada sector son texto libre (con sugerencias en `lib/bienes.ts`) porque ahí sí pueden
faltar. No se mezclan cosas de dolientes distintos en un solo saco.

**Invariantes**: `estadoAfectacion` coherente con el **sector** (habitabilidad para edificaciones —
vivienda/educación/salud/comercio/cultura/deporte—; perdido/parcial para el resto). Un bien de un
**sector de obra pública** (transporte, gestión del riesgo, educación, salud, agua, cultura, deporte)
con `categoria` puede tener `Obra`; vivienda, comercio y agropecuario no. `ubicacion` MUST NOT
aparecer en ninguna consulta pública.

**Migración**: `categoria` → nullable; se agrega `sector` NOT NULL con backfill desde la `categoria`
existente (cada categoría mapea a su doliente); `tipoBien` pasa de enum a **texto** con backfill del
tipo concreto por categoría; se elimina `subtipoBien`. Sin pérdida.

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
