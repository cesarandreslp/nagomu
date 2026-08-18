---
description: "Task list — Auto-registro de voluntariados con verificación por el municipio"
---

# Tasks: Auto-registro de voluntariados con verificación por el municipio

**Input**: Design documents from `specs/003-autorregistro-voluntarios/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/rutas.md](./contracts/rutas.md)

**Tests**: Se incluyen solo las pruebas que la constitución exige — rutas de permiso
(Principio II) e inmutabilidad de tablas append-only (Principio I) — más las funciones puras
(patrón del proyecto). No es TDD completo.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivo distinto, sin dependencia pendiente)
- **[Story]**: US1 / US2 / US3

---

## Phase 1: Setup

- [x] T001 Añadir los verbos de auditoría del feature (`voluntariado.registrar`, `.actualizar`, `.verificar`, `.rechazar`, `.revocar`) como constantes junto a las etiquetas de estado en `lib/verificacion.ts` (archivo nuevo; solo constantes y tipos por ahora)

---

## Phase 2: Foundational (bloquea todas las historias)

**⚠️ Ninguna historia puede empezar hasta terminar esta fase.**

- [x] T002 Extender `prisma/schema.prisma`: enum `EstadoVerificacion` (PENDIENTE|VERIFICADO|RECHAZADO); `Usuario.entidadId` → opcional y `Usuario.actorId String? @unique` con relación a `Actor`; `Actor` gana `latitud Float?`, `longitud Float?`, `municipioOperacionId String?` (relación a `EntidadTerritorial`), `estadoVerificacion EstadoVerificacion @default(PENDIENTE)`, relación `cuenta Usuario?` y `verificaciones VerificacionVoluntariado[]`; modelo nuevo `VerificacionVoluntariado` (inmutable) con índice `(actorId, creadoEn)`
- [x] T003 Crear y aplicar la migración `cuentas_voluntariado` en `prisma/migrations/`: columnas nuevas, `entidadId` nullable, restricción `CHECK` de pertenencia única en `Usuario`, tabla `VerificacionVoluntariado` y disparador que rechaza UPDATE/DELETE (calcado del de `RegistroAuditoria`/`CostoObra`)
- [x] T004 Regenerar el cliente Prisma (`prisma generate`) y verificar `tsc --noEmit`
- [x] T005 [P] En `lib/auth.ts`: definir la unión de sesión (`SesionFuncionario` con `tipo`, `SesionVoluntariado`, `Cuenta`); adaptar `obtenerSesion` para que una cuenta con `actorId` NO se resuelva como funcionario; añadir `obtenerVoluntario()`/`requerirVoluntario()`; hacer que `requerirSesion()` mande al voluntario a `/voluntariado`
- [x] T006 [P] En `lib/verificacion.ts`: función pura `transicionVerificacion(actual, accion)` con las reglas de [data-model.md](./data-model.md) (verificar/rechazar/revocar/reconsiderar) devolviendo `{valida, resultado, requiereMotivo}`
- [x] T007 [P] Test de las transiciones de verificación en `tests/verificacion.test.ts` (función pura; casos válidos e inválidos, motivo obligatorio en rechazar/revocar)

**Checkpoint**: modelo de cuenta, sesión y transiciones listos.

---

## Phase 3: User Story 1 — Auto-registro y registro propio (Priority: P1) 🎯 MVP

**Goal**: un voluntariado crea su cuenta, inicia sesión y edita su propio registro; nace NO VERIFICADO y no puede entrar a vistas operativas.

**Independent Test**: registrar una cuenta, iniciar sesión, editar el registro; confirmar estado NO VERIFICADO y que `/obras` la redirige a `/voluntariado`.

- [x] T008 [US1] En `lib/authz.ts`: `puedeEditarPropioVoluntariado` no hace falta (se opera sobre `sesion.actorId`), pero añadir el guard `rechazarVoluntarioEnVistaTerritorial`/documentar el corte; añadir helper de ámbito para voluntariados si aplica
- [x] T009 [P] [US1] Test de autorización en `tests/authz.test.ts`: una `SesionVoluntariado` es rechazada de vistas territoriales; el voluntario solo alcanza su propio `actorId`
- [x] T010 [P] [US1] Test contra base en `tests/voluntariados.test.ts`: el `CHECK` de `Usuario` rechaza cuenta sin entidad ni actor y con ambos (transacción revertida)
- [x] T011 [US1] `app/actions/voluntariados.ts` (nuevo): `registrarVoluntariado(formData)` — valida campos, municipio (`MUNICIPIO`), coordenada con `parsearCoordenada` de `lib/geo.ts`; correo único con error genérico; colisión de nombre según research D6; crea `Actor`+`Usuario` en transacción; `crearSesion`; audita; `redirect("/voluntariado")`
- [x] T012 [US1] `actualizarVoluntariado(formData)` en `app/actions/voluntariados.ts` — opera sobre `sesion.actorId`; valida coordenada; audita `voluntariado.actualizar`; `redirect("/voluntariado")`
- [x] T013 [US1] Bifurcar `iniciarSesion` en `app/actions/sesion.ts`: tras autenticar, `actorId` → sesión de voluntariado y `redirect("/voluntariado")`; `entidadId` → flujo actual; conservar `HASH_SENUELO` y mensaje genérico
- [x] T014 [P] [US1] `app/voluntariado/registro/page.tsx` (nuevo, público, server-rendered): formulario nombre/correo/contraseña/contacto/municipio de operación (select de municipios)/latitud/longitud, con mensajes de error por `searchParams`
- [x] T015 [P] [US1] `app/voluntariado/page.tsx` (nuevo): `requerirVoluntario`; muestra el registro propio y su estado de verificación con aviso "NO VERIFICADO"; formulario de edición hacia `actualizarVoluntariado`
- [x] T016 [US1] Enlace a `/voluntariado/registro` desde `app/login/page.tsx`; guard en `app/page.tsx` para enrutar la sesión de voluntariado a `/voluntariado`

**Checkpoint**: US1 funcional e independientemente testeable.

---

## Phase 4: User Story 2 — Verificación por el municipio (Priority: P2)

**Goal**: el municipio de operación verifica, rechaza o revoca (con motivo), todo append-only.

**Independent Test**: con un voluntariado PENDIENTE que opera en el municipio del funcionario, verificarlo, rechazar otro con motivo, revocar uno verificado; confirmar el historial inmutable.

- [x] T017 [US2] En `lib/authz.ts`: `puedeVerificarVoluntariado(sesion, { municipioOperacionId })` (municipio y `sesion.entidadId === municipioOperacionId`), análoga a `puedeAutorizarIntervencion`
- [x] T018 [P] [US2] Test en `tests/authz.test.ts`: municipio de operación sí; otro municipio, gobernación y nación, no
- [x] T019 [P] [US2] Test contra base en `tests/voluntariados.test.ts`: `VerificacionVoluntariado` rechaza UPDATE y DELETE (disparador)
- [x] T020 [US2] `lib/voluntariados.ts` (nuevo): `pendientesDelMunicipio(sesion)` y `registrarDecision(...)` que en una transacción inserta el asiento y actualiza `estadoVerificacion` según `transicionVerificacion`
- [x] T021 [US2] En `app/actions/voluntariados.ts`: `verificarVoluntariado`, `rechazarVoluntariado`, `revocarVoluntariado` — autorizan con T017, exigen motivo donde aplica, usan `registrarDecision`, auditan y `redirect("/voluntariados")`
- [x] T022 [US2] `app/voluntariados/page.tsx` (nuevo): `requerirSesion` (municipio); lista pendientes/verificados/rechazados de su territorio con formularios de verificar/rechazar (motivo)/revocar (motivo)
- [x] T023 [US2] `app/obras/[obraId]/historial` ya existe para obras; añadir vista/legibilidad del historial de verificación en `app/voluntariados/page.tsx` (orden cronológico, sin sobrescritura)

**Checkpoint**: US1 + US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 — Solo verificados en el mapa (Priority: P3)

**Goal**: la capa de voluntariados del mapa muestra solo VERIFICADOS con coordenada del ámbito.

**Independent Test**: con un voluntariado VERIFICADO con coordenada y otro PENDIENTE, la capa muestra solo el verificado; al revocar, desaparece.

- [x] T024 [US3] En `lib/voluntariados.ts`: `listarPuntosVoluntariados(sesion)` — actores VOLUNTARIADO, `estadoVerificacion=VERIFICADO`, coordenada no nula, `municipioOperacion` en el ámbito del usuario (reutiliza `municipiosVisiblesPara`)
- [x] T025 [P] [US3] Extender `app/mapa/mapa-cliente.tsx`: capa de voluntariados con marcador distinguible del inventario (color/forma), popup con nombre y "voluntariado verificado"
- [x] T026 [US3] En `app/mapa/page.tsx`: consultar `listarPuntosVoluntariados`, añadir la leyenda de voluntariados y la lista esencial server-rendered (misma info que el marcador)

**Checkpoint**: las tres historias funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting

- [x] T027 [P] Sembrar un voluntariado de ejemplo (PENDIENTE y otro VERIFICADO) en `prisma/seed.ts` para el piloto y las demos
- [x] T028 [P] Comentario `ponytail:` en `registrarVoluntariado` anotando la ausencia de límite de tasa/CAPTCHA y su vía de endurecimiento (research D8)
- [x] T029 Ejecutar la validación de [quickstart.md](./quickstart.md) (4 escenarios) contra el servidor de desarrollo y dejar evidencia
- [x] T030 `npx tsc --noEmit` y `npx vitest run` en verde; `prisma migrate status` al día

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T007)**: T002→T003→T004 en serie (esquema→migración→cliente); T005/T006/T007 en paralelo tras T004.
- **US1 (T008–T016)**: tras Foundational. T011/T012/T013 dependen de T005; las páginas T014/T015 en paralelo. Es el MVP.
- **US2 (T017–T023)**: tras Foundational; integra con US1 (verifica cuentas creadas por US1) pero es testeable sembrando un pendiente. T020 depende de T006/T017.
- **US3 (T024–T026)**: tras US2 (necesita el estado VERIFICADO) y sobre el mapa de spec 002 ya presente.
- **Polish (T027–T030)**: al final.

### Paralelizables

- Foundational: T005, T006, T007 (archivos distintos).
- US1: T009, T010, T014, T015.
- US2: T018, T019.
- Polish: T027, T028.

---

## Implementation Strategy

**MVP** = Setup + Foundational + US1 (auto-registro y registro propio). Se puede validar y
demostrar solo. US2 le da el valor real (verificación); US3 cierra el círculo con el mapa.

**Regla transversal** (constitución): cada Server Action autoriza en el servidor antes de tocar
datos y escribe en `RegistroAuditoria` permita o rechace; las vistas críticas no dependen de
JavaScript de cliente.
