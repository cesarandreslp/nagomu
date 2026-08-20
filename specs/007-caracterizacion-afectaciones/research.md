# Research: caracterización integral de afectaciones

**Fecha**: 2026-08-19 | **Plan**: [plan.md](./plan.md)

Decisiones de diseño. El alcance ya lo confirmó el usuario (spec); aquí las técnicas, todas bajo la
enmienda 4.0.0 (público/reservado + necesidad de salud categorizada).

---

## D1. Generalizar `ItemInventario` en vez de crear un modelo paralelo

**Decisión**: `ItemInventario` pasa a ser el "bien afectado" de cualquier tipo. Se le agrega
`tipoBien` (VIVIENDA / COMERCIO / ESTRUCTURA_PUBLICA / AGROPECUARIO) y `subtipoBien`
(CULTIVO / MAQUINARIA / BODEGA / CORRAL / ANIMALES / ESTANQUE / ALIMENTO_ANIMAL, para agropecuario),
`estadoAfectacion` (HABITABLE / REPARABLE / DEMOLER para estructuras; PERDIDO / PARCIAL para
productivos), `corregimiento` y `vereda`. `categoria` pasa a **opcional**.

**Rationale**: el ítem YA tiene `obra Obra?` (opcional) y `hogares HogarDamnificado[]`. Reutilizar
evita duplicar el inventario, el mapa y el vínculo con hogares. La infra pública sigue igual
(categoría + obra + cola, spec 001 intacto); un cultivo o un animal es un ítem sin obra.

**Migración**: `categoria` a nullable; `tipoBien` NOT NULL con backfill `ESTRUCTURA_PUBLICA` para los
ítems existentes (todos son infra hoy); nuevos campos nullable. Sin pérdida de datos.

**Alternativa descartada**: una entidad `BienAfectado` separada — duplicaría inventario, mapa y la
relación con hogares que el ítem ya tiene.

---

## D2. Clasificación público / reservado (Principio IV, 4.0.0)

**Decisión**: la separación es de **campos**, no de tablas:
- **Público**: `tipoBien`, `subtipoBien`, `estadoAfectacion`, `latitud`/`longitud` (punto),
  `corregimiento`/`vereda` (lugar general), y las cantidades derivadas.
- **Reservado**: `ubicacion` (la dirección textual), el dueño, y el detalle del hogar.

Se aplica en las **consultas**: las funciones públicas (`lib/censo.ts`) seleccionan SOLO campos
públicos; nunca `ubicacion`. Una prueba verifica que un select público no incluye campos reservados.

**Rationale**: dirección ≠ punto. El punto es transparencia; la dirección señala directo al hogar.
Separar por campo (no por tabla) es lo más simple y deja el ítem como una sola cosa.

---

## D3. Geografía sub-municipal: campos, no catálogo (por ahora)

**Decisión**: `corregimiento` y `vereda` como **texto** en el ítem (el lugar general público). El
censo agrupa por ellos. Un catálogo normalizado (división político-administrativa) queda como
refinamiento posterior si el piloto lo exige.

**Rationale**: Principio V. Texto resuelve el "lugar general" y el agrupamiento del censo sin
introducir un catálogo con carga de datos. Cuando falte, se cae a municipio; nunca a dirección.

---

## D4. Necesidad de salud categorizada (US2)

**Decisión**: nueva entidad `NecesidadSalud` ligada a `HogarDamnificado`, con `tipo`
(CONDICION_CRONICA / DIALISIS / EMBARAZO_RIESGO / DISCAPACIDAD / OXIGENO / OTRA — lista cerrada).
Un hogar puede tener varias. Es **reservada** y solo se crea si el hogar tiene
`AutorizacionTratamiento` otorgada (la misma de spec 006). Sin diagnóstico, historia ni detalle.

**Rationale**: reutiliza la autorización de 006; el indicador dice QUÉ necesidad para referir, nunca
el detalle clínico (enmienda 4.0.0). "Necesidad ⇒ autorización" se vigila con prueba contra base,
igual que "documento ⇒ autorización".

**Alternativa descartada**: un texto libre de salud — reintroduce el detalle clínico prohibido.

---

## D5. Qué es obra y qué no

**Decisión**: solo `ESTRUCTURA_PUBLICA` con `categoria` puede volverse `Obra` (con su cola de
priorización, spec 001). Vivienda, comercio y agropecuario se caracterizan pero NO entran a la cola
(no son obras de reconstrucción cofinanciable).

**Rationale**: mantiene spec 001 intacto (las obras siguen exigiendo categoría) y separa
"caracterizar la pérdida" de "priorizar la reconstrucción pública".

---

## D6. Censo público de transparencia

**Decisión**: ruta `/censo` **sin sesión** que consulta `lib/censo.ts` (agregados públicos por
territorio: cantidades por tipo/afectación, puntos, lugar general). Extiende la landing (004) y el
mapa (002). Un bien sin coordenada se cuenta por lugar general, no como punto.

**Rationale**: es la cara de transparencia; al usar solo campos públicos, no puede filtrar datos
personales. La descarga/consulta no requiere sesión y funciona sin JavaScript (III).

---

## D7. Fotos sin metadatos

**Decisión**: se reutiliza `lib/imagen.ts` (spec 006), que despoja metadatos (GPS incluido) antes de
almacenar en `@vercel/blob` privado. La geolocalización del bien se toma de la captura del
formulario, no del archivo.

**Rationale**: la foto pública nunca debe revelar la coordenada de un hogar; el punto se maneja como
dato aparte, clasificado (público para bienes; con más cuidado cuando es la vivienda de un hogar).
