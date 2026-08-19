---
description: "Task list — Gestión municipal de damnificados"
---

# Tasks: Gestión municipal de damnificados

**Input**: Design documents from `specs/006-gestion-damnificados/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/rutas.md](./contracts/rutas.md)

**Tests**: solo las que la constitución exige — acceso por ámbito (Principio II) y
**"documento ⇒ autorización"** (Principio IV, enmienda 3.0.0) — más las funciones puras
(patrón del proyecto). No es TDD completo.

**Advertencia**: este es el área más sensible del sistema. Las tareas marcadas 🔒 implementan
candados del Principio IV, que es NO NEGOCIABLE. Ninguna se puede simplificar sin enmienda.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivo distinto, sin dependencia pendiente)
- **[Story]**: US1 / US2 / US3

---

## Phase 1: Setup

- [X] T001 Crear `lib/damnificados.ts` con solo constantes y tipos por ahora: verbos de auditoría del feature (`damnificado.registrar`, `.actualizar`, `.autorizar`, `.ayuda`, `.suprimir`, `.exportar`) y etiquetas de estado de ayuda, siguiendo el patrón de `lib/verificacion.ts`

---

## Phase 2: Foundational (bloquea todas las historias)

**⚠️ Ninguna historia puede empezar hasta terminar esta fase.**

- [X] T002 Extender `prisma/schema.prisma`: enum `EstadoAyudaHogar` (PENDIENTE|ENTREGADA); modelo `HogarDamnificado` (`municipioId`→`EntidadTerritorial`, `responsableNombre`, `documento String?`, `inmuebleId String?`→`ItemInventario`, conteos `personasTotal/Ninez/AdultoMayor/Discapacidad`, `hayHeridos Int`, `hayFallecidos Int`, `registradoPorId`→`Usuario`, `creadoEn`/`actualizadoEn`); `AutorizacionTratamiento` (`hogarId` **único**, `otorgada`, `medio`, `fecha`, `registradoPorId`); `AyudaAHogar` (`hogarId`, `ofertaId`→`OfertaInstitucional`, `estado`, `fecha DateTime?`, `registradoPorId`); relaciones inversas en `EntidadTerritorial`, `ItemInventario`, `OfertaInstitucional` y `Usuario`; índices `(municipioId)`, `(municipioId, documento)` y `(hogarId)`
- [X] T003 Crear y aplicar la migración `damnificados` en `prisma/migrations/`. 🔒 **A diferencia del resto del sistema, `HogarDamnificado` NO lleva disparador de inmutabilidad**: el titular puede pedir supresión (hábeas data, research D4). Dejar el porqué escrito en el SQL para que nadie lo "corrija" después añadiéndolo
- [X] T004 Regenerar el cliente Prisma y verificar `npx tsc --noEmit`
- [X] T005 [P] 🔒 En `lib/authz.ts`: `puedeGestionarDamnificados(sesion, hogar)` — solo `FUNCIONARIO` de nivel `MUNICIPIO` con `entidadId === hogar.municipioId`; y `puedeVerAgregadosDamnificados(sesion)` — cualquier funcionario, para conteos sin detalle. Mismo patrón de `Veredicto` que el resto del archivo
- [X] T006 [P] 🔒 Ampliar `tests/authz.test.ts` con la matriz de [contracts/rutas.md](./contracts/rutas.md): municipio dueño ✅; otro municipio ❌; gobernación ❌; nación ❌; sin sesión ❌. Incluir los casos que deben fallar, no solo los permitidos
- [X] T007 [P] En `lib/export.ts` (nuevo): funciones puras `aCsv(filas, columnas)` y `aSpreadsheetML(filas, columnas, hoja)` (research D2 — sin dependencia nueva). Escapar comillas y separadores en CSV; escapar los caracteres reservados del XML
- [X] T008 [P] `tests/export.test.ts`: CSV con comas, comillas y saltos de línea dentro de una celda; XML con caracteres que hay que escapar; ambos formatos con cero filas

**Checkpoint**: modelo, permisos y export listos. Ninguna pantalla todavía.

---

## Phase 3: User Story 1 — Registro del hogar damnificado (Priority: P1) 🎯 MVP

**Goal**: un municipio registra los hogares afectados de su territorio, con el mínimo de datos y el documento solo si el hogar lo autoriza.

**Independent Test**: registrar un hogar con y sin autorización; verificar que sin autorización no se guarda documento, que otro municipio no lo ve y que la acción queda auditada.

- [X] T009 [US1] En `lib/damnificados.ts`: `listarHogaresDe(municipioId)` y `obtenerHogar(hogarId, municipioId)` (con autorización y ayudas). 🔒 Toda consulta de detalle recibe el `municipioId` de la sesión y filtra por él en el servidor: no existe una consulta de detalle sin ámbito
- [X] T010 [US1] 🔒 En `lib/damnificados.ts`: `puedeGuardarDocumento(autorizacion)` — función pura que devuelve verdadero solo si la autorización existe y `otorgada` es verdadera (research D1)
- [X] T011 [US1] 🔒 `tests/damnificados.test.ts` (nuevo, contra base, en transacción revertida): registrar un hogar con `documento` **sin** autorización deja `documento` en null; con autorización otorgada sí lo guarda; otorgar la autorización después permite completarlo. Es la prueba que vigila el candado del Principio IV
- [X] T012 [US1] `app/actions/damnificados.ts` (nuevo): `registrarHogar(formData)` — autoriza con `puedeGestionarDamnificados`; fuerza `municipioId = sesion.entidadId` (**nunca del formulario**); valida conteos como enteros no negativos; 🔒 si llega `documento` sin `autorizaTratamiento`, registra el hogar **sin** documento; crea `AutorizacionTratamiento` cuando se otorga; audita `damnificado.registrar` **sin ningún dato personal en `datos`**; redirige a la ficha del hogar
- [X] T013 [US1] `actualizarHogar` y `otorgarAutorizacion` en `app/actions/damnificados.ts` — solo el municipio dueño; al otorgar la autorización se habilita guardar el documento; auditan `damnificado.actualizar` / `.autorizar` sin datos personales
- [X] T014 [US1] 🔒 `suprimirHogar(formData)` en `app/actions/damnificados.ts` (hábeas data): borra `documento` y `responsableNombre` del hogar, y audita `damnificado.suprimir` con **el hecho** (hogar, fecha, motivo de la solicitud), **sin conservar lo borrado** (research D4). Exige confirmación explícita en el formulario
- [X] T015 [P] [US1] `app/damnificados/nuevo/page.tsx` (nuevo): formulario server-rendered con responsable, inmueble (select del inventario del municipio), conteos, indicadores, y el bloque de autorización de tratamiento con su texto de Ley 1581. Funciona sin JavaScript (Principio III)
- [X] T016 [P] [US1] `app/damnificados/page.tsx` (nuevo): lista de los hogares del municipio dentro de `Tablero` con `activo="damnificados"`, paginación de 50 filas (patrón de `/obras`) y mensaje claro cuando no hay ninguno
- [X] T017 [US1] `app/damnificados/[hogarId]/page.tsx` (nuevo): ficha del hogar con datos, estado de la autorización, ayudas y la acción de supresión. 🔒 Corta el acceso si el hogar no es del municipio de la sesión, y audita el intento
- [X] T018 [US1] Añadir la entrada `damnificados` (`/damnificados`, etiqueta "Damnificados", niveles `["MUNICIPIO"]`) en `app/navegacion.tsx` — solo municipio, porque solo el municipio ve el detalle
- [X] T019 [US1] Advertencia de documento duplicado en el mismo municipio al registrar (índice `(municipioId, documento)`): avisa para evitar el doble registro del mismo hogar, sin bloquear
- [X] T020 [US1] Foto del inmueble como **mejora progresiva** con `subirDocumento` de `lib/almacenamiento.ts` (blob privado): el registro se completa igual sin ella (Principio III, research D5)
- [X] T021 [US1] Ejecutar los escenarios 1 y 2 de [quickstart.md](./quickstart.md) (registrar hogar; aislamiento por municipio)

**Checkpoint**: el municipio ya tiene su registro y su trazabilidad. Es el MVP.

---

## Phase 4: User Story 2 — Ayudas por hogar (Priority: P2)

**Goal**: saber qué recibió cada hogar y qué le falta, aterrizando el catálogo de oferta a hogares reales.

**Independent Test**: marcar una ayuda como entregada y otra pendiente sobre un hogar; ver el estado en su ficha y los conteos en el resumen.

- [X] T022 [US2] En `lib/damnificados.ts`: `ayudasDeHogar(hogarId)` y `resumenAyudas(municipioId)` — conteos de hogares atendidos y pendientes por tipo de ayuda, sin exponer personas
- [X] T023 [US2] `asignarAyuda` y `cambiarEstadoAyuda` en `app/actions/damnificados.ts` — solo el municipio dueño; asocia una `OfertaInstitucional` con estado `PENDIENTE` o pasa a `ENTREGADA` con fecha; audita `damnificado.ayuda`
- [X] T024 [US2] En la ficha del hogar: sección de ayudas con lo recibido y lo pendiente, y el formulario para asignar del catálogo. 🔒 Ofrecer solo las ayudas **habilitadas** (`separarPorHabilitacion` de `lib/oferta.ts`): una medida anunciada sin reglamentar no se puede tramitar
- [X] T025 [US2] En `app/damnificados/page.tsx`: resumen de atención por tipo de ayuda (agregado, sin personas)
- [X] T026 [US2] Ejecutar el escenario 3 de [quickstart.md](./quickstart.md) (ayudas por hogar)

**Checkpoint**: el registro dejó de ser una lista y es gestión.

---

## Phase 5: User Story 3 — Agregados hacia arriba y export (Priority: P3)

**Goal**: la gobernación y la nación ven cifras del territorio sin detalle personal; el municipio entrega su registro a la UNGRD.

**Independent Test**: como gobernación, ver los agregados del departamento sin ningún dato personal; como municipio, exportar a Excel y CSV.

- [X] T027 [US3] 🔒 En `lib/damnificados.ts`: `agregadosPorMunicipio(ambito)` — conteos por municipio (hogares, personas por grupo, hogares con heridos/fallecidos, atendidos/pendientes). **La consulta no selecciona `responsableNombre` ni `documento`**; usa `municipiosVisiblesPara` de `lib/authz.ts` para el ámbito
- [X] T028 [US3] 🔒 En `tests/damnificados.test.ts`: los agregados no devuelven ningún campo personal, ni siquiera para la nación. La prueba falla si alguien agrega un campo personal al `select`
- [X] T029 [US3] En `app/departamento/page.tsx`: bloque de damnificados con los conteos agregados por municipio, sin enlace al detalle (no existe para ese nivel)
- [X] T030 [US3] `app/damnificados/export/route.ts` (nuevo): descarga por `GET ?formato=csv|excel` con `Content-Disposition`, siguiendo el patrón auditado de `app/documentos/[documentoId]/route.ts`. 🔒 Solo el municipio dueño y solo su propio registro; audita `damnificado.exportar`; el archivo lleva nota de tratamiento reservado (Ley 1581). **Un enlace, no una Server Action**: una descarga es un GET y así funciona sin JavaScript
- [X] T031 [US3] Enlaces de export (CSV y Excel) en `app/damnificados/page.tsx`
- [X] T032 [US3] Documentar en `lib/damnificados.ts` el punto de extensión para la futura sincronización con el RUD (FR-011): qué campos mapearían y dónde entraría el adaptador, sin implementarlo mientras no exista API oficial
- [X] T033 [US3] Ejecutar los escenarios 4 y 5 de [quickstart.md](./quickstart.md) (agregados sin detalle; export CSV y Excel)

**Checkpoint**: el circuito con el nivel nacional queda cerrado sin perder la trazabilidad municipal.

---

## Phase 6: Cierre

- [X] T034 🔒 Revisión de Principio IV: ningún dato personal en URLs, `searchParams`, mensajes de error ni asientos de auditoría. Revisar cada `redirect` y cada `datos` del feature (SC-003)
- [X] T035 🔒 Revisión de modelo: confirmar que no existe ningún campo clínico; los indicadores son solo conteos (SC-004)
- [X] T036 Ejecutar el escenario 6 de [quickstart.md](./quickstart.md) (hábeas data: la supresión deja constancia sin conservar el dato)
- [X] T037 `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` en verde

---

## Dependencias

```
Setup (T001) → Foundational (T002–T008) → US1 (T009–T021) → US2 (T022–T026) → US3 (T027–T033) → Cierre (T034–T037)
```

- **US2 y US3 dependen de US1**: sin hogares registrados no hay ayudas que asignar ni agregados que sumar.
- Dentro de Foundational, T005–T008 son paralelizables (archivos distintos); T002 → T003 → T004 son secuenciales.
- En US1, T015 y T016 son paralelizables entre sí; T017 depende de T009.

## Notas

- **Los 🔒 no son opcionales.** Son los candados con los que la enmienda 3.0.0 abrió la puerta al
  documento del damnificado. Relajar cualquiera exige otra enmienda, no una decisión de
  implementación.
- **La auditoría registra el hecho, no el dato.** Es la única forma de que el Principio I
  (trazabilidad) y el IV (mínimo) convivan: si el asiento guardara el documento, suprimir el hogar
  no serviría de nada, porque el dato seguiría ahí.
- **Desviación menor del contrato**: [contracts/rutas.md](./contracts/rutas.md) lista
  `exportarDamnificados` entre las acciones de escritura, pero una descarga es un `GET`. Se
  implementa como route handler (T030) para que funcione sin JavaScript, igual que la descarga de
  documentos de la spec 001.
