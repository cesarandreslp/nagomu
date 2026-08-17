---

description: "Tareas de implementación — Cofinanciación priorizada de obras de reconstrucción"
---

# Tasks: Cofinanciación priorizada de obras de reconstrucción

**Input**: Documentos de diseño en `/specs/001-cofinanciacion-obras/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/rutas.md](./contracts/rutas.md)

**Tests**: incluidos, pero no de forma general. La constitución del proyecto exige pruebas
sobre permisos, transiciones de estado y registro de auditoría. Se agregan además sobre
prioridad, cola y dinero, porque son aritmética con consecuencias públicas. El resto del código
—formularios y renderizado— no lleva pruebas automatizadas.

**Organization**: las tareas se agrupan por historia de usuario, de modo que cada una pueda
implementarse, probarse y desplegarse por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: a qué historia de usuario pertenece (US1 a US5)
- Cada tarea incluye la ruta exacta del archivo

## Path Conventions

Aplicación Next.js única en la raíz del repositorio: `app/`, `lib/`, `prisma/`, `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dejar el proyecto compilando, con dependencias y herramientas listas

- [x] T001 Inicializar proyecto Next.js con App Router y TypeScript en modo `strict` en `package.json`, `tsconfig.json`, `next.config.ts`
- [x] T002 [P] Configurar ESLint y Prettier en `eslint.config.mjs` y `.prettierrc`
- [x] T003 [P] Configurar Vitest en `vitest.config.ts` con la carpeta `tests/`
- [x] T004 Instalar Prisma e inicializar `prisma/schema.prisma` y `prisma.config.ts` con el generador `prisma-client` y el adaptador de Neon
- [x] T005 [P] Crear `.env.example` con `DATABASE_URL`, `DIRECT_URL` y `SESSION_COOKIE_SECRET`, y verificar en `.gitignore` que ningún `.env*` con valores reales se comitee — el repositorio es público
- [x] T006 [P] Definir scripts `dev`, `build`, `test`, `db:migrate` y `db:seed` en `package.json`

**Checkpoint**: `npx next build` compila y `npm run lint` pasa. Falta la base de datos, que
bloquea desde T009.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: identidad, auditoría inmutable y aritmética de dinero. Nada de lo anterior es
opcional para ninguna historia.

**⚠️ CRITICAL**: ninguna historia de usuario puede empezar hasta terminar esta fase

- [x] T007 Modelar `EntidadTerritorial`, `Usuario`, `Sesion` y `Actor` en `prisma/schema.prisma` según [data-model.md](./data-model.md)
- [x] T008 Modelar `RegistroAuditoria` en `prisma/schema.prisma`
- [x] T009 Crear la migración inicial en `prisma/migrations/` incluyendo el disparador SQL que rechaza `UPDATE`, `DELETE` y `TRUNCATE` sobre `RegistroAuditoria`
- [x] T010 [P] Implementar el cliente Prisma único reutilizable en `lib/db.ts`
- [x] T011 [P] Implementar aritmética decimal y formato en pesos colombianos en `lib/dinero.ts`, prohibiendo `number` para montos
- [x] T012 [P] Escribir `tests/dinero.test.ts` verificando que sumas y restas de montos grandes no pierden precisión
- [x] T013 Implementar hash `scrypt` con sal y verificación de contraseña en `lib/contrasenas.ts` usando `node:crypto`, separado de `lib/auth.ts` para que corra tambien fuera de Next
- [x] T014 Implementar creación, lectura y revocación de sesión opaca con cookie `httpOnly`, `Secure`, `SameSite=Lax` en `lib/auth.ts`
- [x] T015 [P] Implementar el registro append-only en `lib/audit.ts`, con función única que acepta acción, objetivo, resultado y datos sin campos personales
- [x] T016 [P] Implementar el esqueleto de reglas de autorización en `lib/authz.ts`: obtener sesión, resolver entidad y nivel, y funciones `puedeEditarObra`, `puedeEditarAporte`, `puedeAutorizarIntervencion`
- [x] T017 Implementar `iniciarSesion` y `cerrarSesion` en `app/actions/sesion.ts`, con mensaje de error genérico que no revele si el correo existe
- [x] T018 Crear el formulario de acceso sin componentes de cliente en `app/login/page.tsx`
- [x] T019 [P] Crear `app/layout.tsx` con estilos mínimos propios, sin framework de UI y con presupuesto de página pequeño
- [x] T020 Crear la semilla del piloto en `prisma/seed.ts`: nación, gobernaciones del Valle del Cauca y Chocó, municipios de Buga, Sipí y San José del Palmar, y un usuario por nivel
- [x] T021 Escribir `tests/auditoria.test.ts` contra Postgres real, verificando que `UPDATE`, `DELETE` y `TRUNCATE` sobre `RegistroAuditoria` son rechazados por la base

**Checkpoint**: hay identidad, auditoría que no se puede alterar y dinero exacto. Las historias
pueden comenzar.

---

## Phase 3: User Story 1 - Inventario priorizado de intervenciones (Priority: P1) 🎯 MVP

**Goal**: un funcionario municipal registra lo afectado y obtiene una lista ordenada por una
regla pública que cualquiera puede recalcular a mano.

**Independent Test**: registrar un muro de contención, una escuela y un teatro, y verificar que
el orden respeta los niveles aunque el teatro tenga muchos más beneficiados.

### Tests for User Story 1

- [x] T022 [P] [US1] Escribir `tests/prioridad.test.ts`: el nivel manda sobre el puntaje, orden por puntaje dentro del nivel, desempate determinista, y obra sin `personasBeneficiadas` al final de su nivel

### Implementation for User Story 1

- [x] T023 [P] [US1] Modelar `ItemInventario` y `Obra` en `prisma/schema.prisma`
- [x] T024 [US1] Crear la migración correspondiente en `prisma/migrations/`
- [x] T025 [P] [US1] Definir el mapa de categoría a nivel de prioridad y ODS, y los pesos configurables de la fórmula, en `lib/prioridad.ts`
- [x] T026 [US1] Implementar el cálculo de puntaje y el ordenamiento completo en `lib/prioridad.ts` (depende de T025)
- [x] T027 [US1] Implementar `crearItemInventario` en `app/actions/obras.ts`, tomando el municipio de la sesión y nunca del formulario, con verificación de autorización y escritura de auditoría
- [x] T028 [US1] Crear el formulario de alta en `app/obras/nueva/page.tsx`, sin componentes de cliente
- [x] T029 [US1] Crear la lista priorizada del municipio en `app/obras/page.tsx` con nivel, puntaje y estado por fila
- [x] T030 [US1] Crear el detalle en `app/obras/[obraId]/page.tsx` mostrando el nivel, los ODS y **cada factor con su valor**, no solo el puntaje final
- [x] T031 [US1] Ampliar `tests/authz.test.ts` con los casos de esta historia: otro municipio no puede crear ni editar en ámbito ajeno, y el rechazo queda auditado
- [x] T032 [US1] Ejecutar la validación V1 de [quickstart.md](./quickstart.md)

**Checkpoint**: el inventario priorizado funciona solo. Ya resuelve un problema real sin que
exista nada de dinero en el sistema.

---

## Phase 4: User Story 2 - Costeo determinado por el estudio (Priority: P2)

**Goal**: el costo de una obra existe únicamente cuando un estudio lo entrega, con fecha y
documento de respaldo.

**Independent Test**: una obra sin estudio no muestra brecha ni plazos en ninguna pantalla;
al registrar el resultado del estudio, ambos aparecen.

### Tests for User Story 2

- [x] T033 [P] [US2] Escribir `tests/estados.test.ts`: las transiciones válidas pasan, todo salto de etapa se rechaza, y `COSTEADO` exige al menos un `CostoObra`

### Implementation for User Story 2

- [x] T034 [P] [US2] Modelar `CostoObra` y `CambioEstadoObra` en `prisma/schema.prisma`, ambos inmutables y con `corrigeId`
- [x] T035 [US2] Crear la migración con los disparadores que rechazan `UPDATE`, `DELETE` y `TRUNCATE` sobre ambas tablas en `prisma/migrations/`
- [x] T036 [P] [US2] Implementar la máquina de estados de la obra en `lib/estados.ts` como función pura
- [x] T037 [US2] Implementar `registrarCotizacionEstudios` en `app/actions/obras.ts`
- [x] T038 [US2] Implementar `registrarCostoDeEstudio` en `app/actions/obras.ts`, exigiendo fecha, referencia de documento y responsable
- [x] T039 [US2] Implementar `cambiarEstadoObra` en `app/actions/obras.ts`
- [x] T040 [US2] Crear el formulario de costeo en `app/obras/[obraId]/costo/page.tsx`
- [x] T041 [US2] Ocultar brecha y plazos mientras la obra no esté `COSTEADO` en `app/obras/[obraId]/page.tsx`, mostrando "pendiente de estudios" y conservando visible la prioridad
- [x] T042 [US2] Mostrar el historial de costos cuando un estudio posterior actualiza el valor, en `app/obras/[obraId]/costo/page.tsx` y el vigente en el detalle
- [x] T043 [US2] Ejecutar la validación V2 de [quickstart.md](./quickstart.md)

**Checkpoint**: ninguna cifra de dinero aparece sin respaldo documental.

---

## Phase 5: User Story 3 - Cofinanciación y escenarios de tiempo (Priority: P3)

**Goal**: la razón de ser del sistema. Los aportes reducen la brecha, la capacidad fiscal se
reparte en orden de prioridad, y la pantalla muestra cuánto se acorta el plazo si alguien se suma.

**Independent Test**: con capacidad fiscal reportada y varias obras costeadas, cada obra muestra
su posición en la cola y su año estimado; un aporte a la primera adelanta a todas las de atrás.

### Tests for User Story 3

- [x] T044 [P] [US3] Escribir `tests/cola.test.ts`: reparto de capacidad en orden de prioridad, remanente que pasa a la siguiente obra, adelanto en cadena al aportar a la primera, desplazamiento al entrar una obra de nivel superior, cola bloqueada cuando la capacidad no alcanza, y horizonte de 30 años

### Implementation for User Story 3

- [x] T045 [P] [US3] Modelar `Aporte` y `CapacidadFiscal` en `prisma/schema.prisma`, ambos inmutables
- [x] T046 [US3] Crear la migración con sus disparadores en `prisma/migrations/`
- [x] T047 [P] [US3] Implementar el cálculo de brecha y de monto comprometido en `lib/brecha.ts` como función pura
- [x] T048 [P] [US3] Implementar el reparto de capacidad fiscal año a año en orden de prioridad en `lib/cola.ts`, devolviendo posición, año de inicio y año de cierre por obra
- [x] T049 [US3] Implementar el cálculo de los tres escenarios comparativos en `lib/cola.ts`, recalculando la cola completa en cada uno (depende de T048)
- [x] T050 [US3] Implementar `reportarCapacidadFiscal` en `app/actions/municipio.ts`, exigiendo fecha y nombre de quien lo reportó
- [x] T051 [US3] Crear la pantalla de capacidad fiscal con su serie histórica en `app/municipio/capacidad/page.tsx`
- [x] T052 [US3] Implementar `registrarAporte` en `app/actions/aportes.ts`, rechazando monto no positivo, obra no costeada, y origen `TRASLADO_PRESUPUESTAL` sin proyecto aplazado
- [x] T053 [US3] Implementar `corregirAporte` en `app/actions/aportes.ts` creando una fila nueva con `corrigeId`, nunca actualizando la anterior
- [x] T054 [US3] Crear el formulario de aportes en `app/obras/[obraId]/aportes/page.tsx`, con el campo de proyecto aplazado condicionado al origen
- [x] T055 [US3] Mostrar posición en cola, año de inicio y año de cierre por fila en `app/obras/page.tsx`
- [x] T056 [US3] Mostrar brecha, comprometido y los tres escenarios en `app/obras/[obraId]/page.tsx`
- [x] T057 [US3] Implementar la simulación de aporte como formulario `GET` que recarga la página con el monto en la URL en `app/obras/[obraId]/page.tsx`, sin JavaScript en el cliente
- [x] T058 [US3] Advertir cuando la capacidad fiscal usada tenga más de doce meses, indicando su fecha, en `app/obras/[obraId]/page.tsx`
- [x] T059 [US3] Mostrar cuántos años se retrasó una obra y por cuál obra la desplazó, en `app/obras/[obraId]/page.tsx`
- [x] T060 [US3] Ampliar `tests/authz.test.ts`: ninguna entidad puede editar aportes de otra, y el municipio dueño sí puede inscribir por actores sin usuario propio
- [x] T061 [US3] Ejecutar la validación V3 de [quickstart.md](./quickstart.md)

**Checkpoint**: el municipio ya puede argumentarle a la gobernación con números.

---

## Phase 6: User Story 4 - Vista departamental y decisión de sumarse (Priority: P4)

**Goal**: la gobernación ve las obras de todos sus municipios y decide dónde su plata rinde más.

**Independent Test**: con obras en varios municipios, el funcionario departamental las ve
consolidadas y ordenadas, e inscribe su aporte sin poder tocar nada ajeno.

### Implementation for User Story 4

- [ ] T062 [US4] Crear el consolidado por prioridad de todos los municipios del ámbito en `app/departamento/page.tsx`
- [ ] T063 [US4] Implementar el orden por impacto —mayor reducción de plazo por aporte— en `app/departamento/page.tsx`
- [ ] T064 [US4] Habilitar el registro de aportes propios de gobernación y nación en `app/actions/aportes.ts`
- [ ] T065 [US4] Implementar la redirección por nivel del usuario en `app/page.tsx`
- [ ] T066 [US4] Ampliar `tests/authz.test.ts` con la fila departamental completa de la matriz de [contracts/rutas.md](./contracts/rutas.md)
- [ ] T067 [US4] Ejecutar la validación V4 de [quickstart.md](./quickstart.md)

**Checkpoint**: los tres niveles participan sobre la misma obra sin pisarse.

---

## Phase 7: User Story 5 - Intervención de un tercero vigilada por el municipio (Priority: P5)

**Goal**: una empresa, fundación, voluntariado o persona natural ejecuta parte de una obra, con
autorización previa del municipio y constancia de calidad.

**Independent Test**: una intervención aprobada cuenta como comprometida; solo al ser recibida a
satisfacción cuenta como ejecutada; al suspenderla, la brecha se reabre.

### Tests for User Story 5

- [ ] T068 [P] [US5] Escribir `tests/intervenciones.test.ts`: transiciones válidas e inválidas, motivo obligatorio en rechazo y suspensión, y efecto del valor equivalente sobre la brecha en cada estado

### Implementation for User Story 5

- [ ] T069 [P] [US5] Modelar `Intervencion`, `CambioEstadoIntervencion` y `VerificacionCalidad` en `prisma/schema.prisma`
- [ ] T070 [US5] Crear la migración con los disparadores de inmutabilidad en `prisma/migrations/`
- [ ] T071 [P] [US5] Implementar la máquina de estados de la intervención en `lib/intervenciones.ts` como función pura
- [ ] T072 [US5] Implementar `solicitarIntervencion` en `app/actions/intervenciones.ts`, incluyendo la marca de intervención no autorizada previamente
- [ ] T073 [US5] Implementar `resolverIntervencion` para aprobar o rechazar, con motivo obligatorio en el rechazo, en `app/actions/intervenciones.ts`
- [ ] T074 [US5] Implementar `registrarVerificacionCalidad` en `app/actions/intervenciones.ts`
- [ ] T075 [US5] Implementar `suspenderIntervencion` con motivo obligatorio en `app/actions/intervenciones.ts`
- [ ] T076 [US5] Implementar `recibirIntervencion` en `app/actions/intervenciones.ts`
- [ ] T077 [US5] Incorporar el valor equivalente al cálculo de brecha en `lib/brecha.ts`: comprometido desde `APROBADA`, ejecutado solo desde `RECIBIDA`, y sin efecto al ser suspendida
- [ ] T078 [US5] Crear la pantalla de solicitud, aprobación, verificaciones y recibo en `app/obras/[obraId]/intervenciones/page.tsx`
- [ ] T079 [US5] Ampliar `tests/authz.test.ts`: solo el municipio dueño autoriza, verifica, suspende y recibe intervenciones sobre sus obras
- [ ] T080 [US5] Ejecutar la validación V5 de [quickstart.md](./quickstart.md)

**Checkpoint**: todas las historias funcionan de forma independiente.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T081 [P] Crear la vista de auditoría legible de una obra en `app/obras/[obraId]/historial/page.tsx`
- [ ] T082 Completar `tests/authz.test.ts` con la matriz íntegra de [contracts/rutas.md](./contracts/rutas.md), incluidos todos los casos que deben fallar
- [ ] T083 Ejecutar las validaciones V6 (inmutabilidad desde SQL directo) y V7 (aplicación completa con JavaScript desactivado) de [quickstart.md](./quickstart.md)
- [ ] T084 [P] Medir el peso y el tiempo de carga de `app/obras/page.tsx` con 500 obras sobre 3G simulado, contra el criterio SC-008
- [ ] T085 [P] Revisar que ninguna URL, mensaje de error ni registro de aplicación contenga datos personales, conforme al Principio IV
- [ ] T086 Calibrar los parámetros de coste de `scrypt` en `lib/auth.ts` hasta que un hash tome entre 100 y 250 ms en el hardware de despliegue
- [ ] T087 Configurar el despliegue en Vercel con `DATABASE_URL` agrupada y `DIRECT_URL` directa para migraciones
- [ ] T088 [P] Escribir `README.md` con puesta en marcha, variables de entorno y cómo ejecutar las pruebas

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias
- **Foundational (Phase 2)**: depende del Setup. **Bloquea todas las historias**
- **US1 (Phase 3)**: depende de Foundational. Sin dependencias de otras historias
- **US2 (Phase 4)**: depende de US1 — necesita que exista la obra para costearla
- **US3 (Phase 5)**: depende de US2 — sin costo no hay brecha ni cola
- **US4 (Phase 6)**: depende de US3 — la vista departamental muestra brechas y escenarios
- **US5 (Phase 7)**: depende de US2. Puede desarrollarse en paralelo con US3 y US4, salvo T077, que toca `lib/brecha.ts` y debe hacerse después de T047
- **Polish (Phase 8)**: depende de las historias que se decidan entregar

### Cadena crítica

```
Setup → Foundational → US1 → US2 → US3 → US4
                               └──→ US5
```

Esta cadena es más lineal que en un proyecto típico, y es correcto que lo sea: cada historia
agrega una capa de significado sobre la anterior. No se puede costear lo que no existe, ni
repartir capacidad sobre un costo que nadie determinó.

### Parallel Opportunities

- Setup: T002, T003, T005 y T006 en paralelo
- Foundational: T010, T011, T012 y T019 en paralelo; T015 y T016 en paralelo una vez exista T009
- Dentro de cada historia, las funciones puras (`lib/`) y sus pruebas se pueden escribir antes y
  en paralelo con el modelado, porque no dependen de la base de datos
- Con dos personas: una toma US3 y otra US5 después de terminar US2, coordinando solo `lib/brecha.ts`

---

## Parallel Example: User Story 3

```bash
# Las funciones puras y sus pruebas, sin tocar base de datos:
Tarea: "Escribir tests/cola.test.ts"
Tarea: "Implementar lib/brecha.ts"
Tarea: "Implementar lib/cola.ts"

# En paralelo, el modelado:
Tarea: "Modelar Aporte y CapacidadFiscal en prisma/schema.prisma"
```

---

## Implementation Strategy

### MVP: solo US1

1. Fase 1 — Setup
2. Fase 2 — Foundational
3. Fase 3 — US1
4. **Parar y validar** V1 del quickstart
5. Desplegar

Con eso ya hay algo demostrable ante una alcaldía: un inventario priorizado por una regla
escrita, que hoy no existe. Sirve para conseguir el permiso de seguir.

### Entrega incremental

| Incremento | Qué queda demostrable |
|---|---|
| Setup + Foundational | Nada visible, pero la auditoría ya es inviolable |
| + US1 | Inventario priorizado. **MVP** |
| + US2 | Costos con respaldo documental |
| + US3 | Brecha, cola y escenarios de plazo. **Aquí nagomu hace lo que promete** |
| + US4 | Los tres niveles participando |
| + US5 | Terceros interviniendo bajo vigilancia |

### Notas

- Comitear al terminar cada tarea o grupo lógico
- Las pruebas de `authz` crecen historia por historia y se completan en T082; no se dejan para
  el final porque son la garantía del Principio II
- `tests/auditoria.test.ts` y `tests/authz.test.ts` necesitan Postgres levantado; el resto corre
  sin infraestructura
- Detenerse en cualquier checkpoint es una entrega válida
