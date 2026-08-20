# Tasks: Caracterización integral de afectaciones

**Input**: Design documents from `specs/007-caracterizacion-afectaciones/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/rutas.md](./contracts/rutas.md), [quickstart.md](./quickstart.md)

**Tests**: incluidos. La constitución (enmienda 4.0.0) EXIGE pruebas contra base para tres candados: (a) una consulta pública **nunca** selecciona un campo reservado; (b) `NecesidadSalud ⇒ AutorizacionTratamiento`; (c) acceso por ámbito (Principio II). No son opcionales.

**Organización**: por user story. US1 es el MVP (cimiento). US2 y US3 dependen de US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: US1 / US2 / US3

## Convenciones del repo (heredadas)

- Sin API pública: rutas HTML + Server Actions por formulario; cada acción autoriza en el servidor, audita y termina en `redirect`.
- Prisma 7 (cliente en `lib/generated/prisma`), Vitest, tokens CSS, fuentes del sistema. **Sin dependencias nuevas.**
- Reutilizar spec 006 (`HogarDamnificado`, `AutorizacionTratamiento`, `lib/imagen.ts`) y spec 001/002 (`ItemInventario`, `Obra`, mapa).

---

## Phase 1: Setup

**Purpose**: no hay proyecto nuevo; solo confirmar el punto de partida.

- [x] T001 Verificar rama `007-caracterizacion-afectaciones` y árbol limpio; `prisma migrate status` al día antes de tocar el esquema (`prisma/schema.prisma`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el esquema generalizado y los enums que TODAS las historias usan. Bloquea US1/US2/US3.

**⚠️ CRITICAL**: ninguna historia arranca hasta cerrar esta fase.

- [x] T002 Añadir enums a `prisma/schema.prisma`: `TipoBien` (VIVIENDA, COMERCIO, ESTRUCTURA_PUBLICA, AGROPECUARIO), `SubtipoBien` (CULTIVO, MAQUINARIA, BODEGA, CORRAL, ANIMALES, ESTANQUE, ALIMENTO_ANIMAL), `EstadoAfectacion` (HABITABLE, REPARABLE, DEMOLER, PERDIDO, PARCIAL), `TipoNecesidadSalud` (CONDICION_CRONICA, DIALISIS, EMBARAZO_RIESGO, DISCAPACIDAD, OXIGENO, OTRA).
- [x] T003 Generalizar `model ItemInventario` en `prisma/schema.prisma`: agregar `tipoBien TipoBien`, `subtipoBien SubtipoBien?`, `estadoAfectacion EstadoAfectacion?`, `corregimiento String?`, `vereda String?`; cambiar `categoria CategoriaItem` → `categoria CategoriaItem?` (opcional). Mantener `ubicacion` (reservado) y `latitud/longitud`. Añadir `@@index([tipoBien])`. Comentar que `ubicacion` es RESERVADO y nunca sale en consultas públicas.
- [x] T004 Añadir `model NecesidadSalud` en `prisma/schema.prisma`: `id`, `hogarId` → `HogarDamnificado`, `tipo TipoNecesidadSalud`, `registradoPorId` → `Usuario`, `creadoEn`, `@@index([hogarId])`; agregar la relación inversa `necesidadesSalud NecesidadSalud[]` en `HogarDamnificado`. Reservada.
- [x] T005 Escribir la migración `caracterizacion` a mano (SQL, `text eol=lf`): `categoria` → nullable; `tipoBien` NOT NULL con backfill `'ESTRUCTURA_PUBLICA'` para los ítems existentes; resto de columnas nullable; tabla `NecesidadSalud`. Aplicar con `prisma db execute --file` + `prisma migrate resolve --applied` (flujo no destructivo del repo). Regenerar cliente.
- [x] T006 Correr `npm test` y `prisma migrate status` para confirmar que el backfill no rompió las 248 pruebas existentes ni la cola de obras (spec 001 intacto).

**Checkpoint**: esquema listo — las tres historias pueden empezar.

---

## Phase 3: User Story 1 - Caracterizar cualquier bien afectado (Priority: P1) 🎯 MVP

**Goal**: registrar bienes de cualquier tipo (vivienda/comercio/estructura pública/agropecuario) con estado, punto y lugar general; clasificación público/reservado; foto sin metadatos; solo la estructura pública con categoría se vuelve obra.

**Independent Test**: registrar un cultivo perdido (con punto+vereda, sin obra), una vivienda (con dirección reservada) y una estructura pública (con categoría → obra); verificar que la dirección no aparece en `/censo`, que la foto se guarda sin GPS, y que un bien sin coordenada queda por lugar general.

### Tests for User Story 1 ⚠️ (escribir primero, deben fallar)

- [x] T007 [P] [US1] `tests/bienes.test.ts`: registrar bienes de los cuatro tipos; `estadoAfectacion` coherente con `tipoBien`; solo `ESTRUCTURA_PUBLICA` + `categoria` crea `Obra`; un agropecuario NO entra a la cola. Un municipio no ve el inventario de otro (Principio II).
- [x] T008 [P] [US1] `tests/censo.test.ts`: la función pública de `lib/censo.ts` **nunca** selecciona `ubicacion`, dueño ni detalle de hogar (la prueba falla si alguien agrega un campo reservado al select público). Un bien sin coordenada se cuenta por lugar general, no como punto.

### Implementation for User Story 1

- [x] T009 [US1] Extender `crearItemInventario` en `app/actions/obras.ts` (o renombrar a `registrarBien`): leer `tipoBien`, `subtipoBien?`, `estadoAfectacion?`, `categoria?`, `corregimiento?`, `vereda?`, `ubicacion?` (dirección reservada), `latitud?/longitud?`, `foto?`. Autorizar `nivel = MUNICIPIO`; crear con `municipioId = sesion.entidadId`. Crear `Obra` **solo** si `tipoBien = ESTRUCTURA_PUBLICA` y hay `categoria`. Foto → `lib/imagen.ts` → blob privado. Auditar `bien.registrar` (sin datos reservados en el asiento).
- [x] T010 [US1] Validar rangos de coordenada en `lib/geo.ts` (reutilizado) e invariante `estadoAfectacion` ↔ `tipoBien` en la acción (habitabilidad para estructuras; perdido/parcial para productivos).
- [x] T011 [P] [US1] `lib/censo.ts` (nuevo): agregados **solo públicos** por territorio — cantidades por `tipoBien`/`estadoAfectacion`, puntos (`latitud/longitud`), y agrupación por lugar general (`corregimiento/vereda`) cuando no hay punto. `select` explícito sin campos reservados.
- [x] T012 [US1] Extender el formulario `app/obras/nueva/page.tsx` (registro de bien): selector de tipo/subtipo, estado, categoría (solo si estructura pública), dirección (reservada), corregimiento/vereda, foto y geolocalización como mejora progresiva (usable sin JS, Principio III).
- [x] T013 [US1] Actualizar el inventario del municipio (`lib/consultas.ts` `listarObrasDe`/vista de `app/obras/page.tsx`) para listar bienes de todo tipo, no solo obras; el dueño ve público + reservado (dirección) por ser el municipio.

**Checkpoint**: US1 funcional e independientemente testeable. MVP entregable.

---

## Phase 4: User Story 2 - Caracterización integral del hogar (Priority: P2)

**Goal**: sobre una vivienda, registrar varias familias con su composición y un indicador **categorizado** de necesidad de salud, solo con `AutorizacionTratamiento`, para referir. Reservado y acotado al municipio dueño.

**Independent Test**: sobre una vivienda, registrar dos hogares con composición; registrar una necesidad de salud con y sin autorización (sin → se rechaza); verificar que no hay diagnóstico y que otro municipio no ve el detalle.

### Tests for User Story 2 ⚠️ (escribir primero, deben fallar)

- [ ] T014 [P] [US2] Añadir a `tests/damnificados.test.ts`: "necesidad de salud ⇒ autorización" (contra base) — crear `NecesidadSalud` sin `AutorizacionTratamiento.otorgada` se rechaza; con autorización, se guarda solo la categoría. Otro municipio no ve la necesidad ni el hogar (Principio II).

### Implementation for User Story 2

- [ ] T015 [US2] `registrarNecesidadSalud` en `lib/damnificados.ts` + `app/actions/damnificados.ts`: campos `hogarId`, `tipo` (lista cerrada `TipoNecesidadSalud`). Solo el municipio dueño; **requiere** `AutorizacionTratamiento(hogar).otorgada`, si no se rechaza. Crear `NecesidadSalud`; auditar `hogar.necesidadSalud` sin el detalle en el asiento.
- [ ] T016 [US2] Mostrar las necesidades de salud del hogar en `app/damnificados/[hogarId]/page.tsx` con formulario de alta (lista cerrada), visible solo al municipio dueño. Reutiliza `app/damnificados/autorizacion.tsx` como puerta.
- [ ] T017 [US2] Confirmar que la composición multi-familia ya soportada por `HogarDamnificado` (varios hogares con `inmuebleId` al mismo bien) se refleja en la ficha de la vivienda; ajustar la vista de inventario para listar los hogares del inmueble.

**Checkpoint**: US1 + US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Censo público de transparencia (Priority: P3)

**Goal**: vista pública sin sesión con solo lo público por territorio (cantidades por tipo/afectación, puntos, lugar general); nunca direcciones ni personas. Extiende landing (004) y mapa (002).

**Independent Test**: sin sesión, abrir `/censo` de un municipio y del departamento; inspeccionar que no hay dirección ni dato de persona; un bien sin coordenada aparece contado por lugar general; recargar sin JS y sigue usable.

### Tests for User Story 3 ⚠️

- [ ] T018 [P] [US3] Ampliar `tests/censo.test.ts`: agregados por municipio y por departamento (Principio II — hacia arriba solo conteos); un bien sin coordenada cuenta por lugar general; la respuesta del censo no contiene ninguna clave reservada.

### Implementation for User Story 3

- [ ] T019 [US3] `app/censo/page.tsx` (nuevo, **sin sesión**): consume `lib/censo.ts`; muestra cantidades por tipo de bien y afectación, puntos en el mapa y lugar general por territorio. Server-rendered, usable sin JavaScript (Principio III).
- [ ] T020 [P] [US3] Extender el mapa (`app/mapa/page.tsx` + `app/mapa/mapa-cliente.tsx`, `listarPuntosMapa` en `lib/consultas.ts`) con capa/censo de bienes por tipo, usando solo campos públicos.
- [ ] T021 [P] [US3] Extender la landing (`app/page.tsx`) y el tablero (`app/tablero.tsx`) con las cifras del censo por tipo de bien; enlazar a `/censo`.
- [ ] T022 [US3] Añadir enlace a `/censo` en `app/navegacion.tsx` (visible público).

**Checkpoint**: las tres historias funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T023 [P] Verificar hábeas data sobre el hogar (spec 006): la supresión borra también la `NecesidadSalud` asociada (cascade) y deja constancia del hecho sin conservar lo borrado. Ajustar en `lib/damnificados.ts` si hace falta.
- [ ] T024 Ejecutar `quickstart.md` completo (los 4 escenarios) y `prisma migrate status`; confirmar censo sin JS.
- [ ] T025 [P] `npm test` en verde (existentes + `bienes`, `censo`, `damnificados`); lint/typecheck `strict`.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T006)**: bloquea todo.
- **US1 (T007–T013)**: tras Foundational. Es el cimiento — US2 y US3 dependen de sus datos/`lib/censo.ts`.
- **US2 (T014–T017)**: tras US1 (necesita `HogarDamnificado`↔bien y el esquema de salud). Independiente de US3.
- **US3 (T018–T022)**: tras US1 (consume `lib/censo.ts`). Independiente de US2.
- **Polish (T023–T025)**: al final.

### Dentro de cada historia

- Tests primero (deben fallar) → esquema/acciones → vistas.
- El candado público/reservado (T008) se escribe antes que `lib/censo.ts` (T011).

### Parallel Opportunities

- Foundational: T002 antes; T003/T004 juntos; T005 tras ambos.
- US1: T007 y T008 en paralelo (tests); T011 en paralelo con T012/T013 tras T009.
- US3: T020, T021 en paralelo; T019 y T022 secuenciales con la ruta.
- Con equipo: tras Foundational, un dev en US1; al cerrar US1, US2 y US3 en paralelo.

---

## Parallel Example: User Story 1

```bash
# Tests de US1 juntos:
Task: "tests/bienes.test.ts — tipos/estado, obra solo para estructura pública, aislamiento por ámbito"
Task: "tests/censo.test.ts — consulta pública nunca selecciona campo reservado"
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 Setup → 2. Phase 2 Foundational (esquema) → 3. Phase 3 US1 → **validar** (registrar bienes de los 4 tipos, dirección nunca pública, foto sin GPS) → entregable.

### Incremental Delivery

US1 (cimiento + público/reservado) → US2 (hogar + salud categorizada) → US3 (censo público). Cada historia agrega valor sin romper la anterior. El spec 001 (cola de obras) permanece intacto: solo la infra pública con categoría se vuelve obra.
