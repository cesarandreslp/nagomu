# Feature Specification: Gestión municipal de damnificados

**Feature Branch**: `006-gestion-damnificados`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Un municipio lleva el registro de los damnificados de su territorio para recuperar la trazabilidad de su gestión (el RUD es nacional). Unidad hogar; mínimo de datos; documento solo con autorización de tratamiento; indicadores mínimos de heridos/fallecidos; acceso acotado al municipio; export a Excel/CSV y diseño preparado para el RUD."

## Contexto y encuadre constitucional

El **RUD** (Registro Único de Damnificados) es **nacional**: cuando un municipio inscribe a su
gente ahí, **pierde la trazabilidad de su propia gestión**. Y un municipio necesita saber a quién
atiende y cómo va — más aún con personas afectadas. Esta feature le devuelve esa trazabilidad: un
**registro municipal de damnificados**, habilitado por la **enmienda constitucional 3.0.0**.

Es el caso más sensible del sistema, así que el Principio IV lo gobierna con candados:
- **Mínimo (IV)**: unidad **hogar**; solo lo esencial para gestionar; **nada clínico**.
- **Documento con autorización (IV)**: el documento del damnificado se guarda **solo** con una
  **autorización explícita de tratamiento de datos** (Ley 1581/Decreto 1377) registrada por hogar.
- **Acotado al dueño (II)**: solo el municipio dueño ve el **detalle personal**; ningún dato
  personal en URLs, parámetros, logs ni mensajes de error. Los niveles superiores ven **agregados**.
- **Trazable (I)**: cada registro, edición, entrega de ayuda y supresión queda en la auditoría.
- **Resiliente (III)**: registro y consulta server-rendered, usables sin JavaScript; la captura de
  campo rica (fotos, geolocalización) se permite como mejora progresiva sobre esa base.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El municipio registra un hogar damnificado (Priority: P1)

Un funcionario del municipio registra un hogar afectado: identificación del hogar (nombre del
responsable y, si el hogar lo autoriza, su documento), el **inmueble afectado** vinculado al
inventario, la composición del hogar como **conteos** (total, niños, adultos mayores, personas con
discapacidad) e **indicadores mínimos** (hay heridos / hay fallecidos, solo para priorizar). El
documento no se captura sin la autorización de tratamiento de datos del hogar.

**Why this priority**: Es el núcleo — sin el registro no hay gestión ni trazabilidad. Es el MVP.

**Independent Test**: Registrar un hogar con y sin autorización; verificar que sin autorización no
se guarda documento; que queda vinculado a un inmueble; que otro municipio no lo ve; que la acción
queda auditada.

**Acceptance Scenarios**:

1. **Given** un funcionario de municipio, **When** registra un hogar con su inmueble, conteos e
   indicadores, **Then** el hogar queda en el registro de su municipio y la acción se audita.
2. **Given** un hogar que otorga autorización de tratamiento, **When** se registra su documento,
   **Then** se guarda; **Given** un hogar sin autorización, **When** se intenta, **Then** el
   documento NO se guarda y el hogar se registra sin él.
3. **Given** un funcionario de otro municipio, **When** intenta ver o editar ese hogar, **Then** se
   le niega y el intento se audita (Principio II).
4. **Given** los indicadores de salud, **When** se inspecciona el registro, **Then** solo hay
   conteos/indicadores (hay heridos / hay fallecidos), nunca historia clínica ni detalle médico.
5. **Given** un cliente sin JavaScript sobre 3G, **When** registra un hogar, **Then** funciona por
   envío de formulario estándar; la captura rica (foto/geolocalización) es opcional encima.

---

### User Story 2 - Seguimiento de ayudas por hogar (Priority: P2)

El funcionario registra qué **ayudas** ha recibido cada hogar y cuáles le faltan, aterrizando el
catálogo de oferta institucional (spec 003/oferta) a hogares reales: alojamiento, kits, subsidio de
arriendo, salud, etc., con su estado (pendiente / entregada) y fecha.

**Why this priority**: Convierte el registro en gestión real (quién recibió qué), que es lo que da
trazabilidad. Va después del registro base.

**Independent Test**: Sobre un hogar registrado, marcar una ayuda como entregada y otra como
pendiente; verificar el estado por hogar y los conteos agregados de atención.

**Acceptance Scenarios**:

1. **Given** un hogar registrado, **When** se le asocia una ayuda de la oferta con su estado,
   **Then** queda registrada con fecha y auditada.
2. **Given** un hogar con ayudas, **When** se ve su ficha, **Then** muestra lo recibido y lo
   pendiente.
3. **Given** el municipio, **When** consulta el resumen, **Then** ve conteos de hogares atendidos /
   pendientes por tipo de ayuda (agregado, sin exponer personas).

---

### User Story 3 - Trazabilidad hacia arriba y export para la UNGRD (Priority: P3)

Los niveles superiores (gobernación, nación) ven **agregados** del territorio (cuántos hogares,
personas por grupo, atención) **sin el detalle personal**. El municipio puede **exportar a Excel y
CSV** su registro para entregarlo a la UNGRD cuando lo solicite; el registro se diseña, además,
para una eventual **sincronización con el RUD nacional** si existe una API oficial.

**Why this priority**: Cierra el circuito con el sistema nacional sin perder la trazabilidad
municipal; depende de que exista el registro (US1) y las ayudas (US2).

**Independent Test**: Como gobernación, ver los agregados del departamento sin detalle personal;
como municipio, exportar el registro a Excel/CSV y verificar que contiene sus hogares.

**Acceptance Scenarios**:

1. **Given** un funcionario de gobernación/nación, **When** consulta damnificados de su ámbito,
   **Then** ve conteos agregados por municipio, nunca el detalle personal de un hogar.
2. **Given** un municipio con hogares registrados, **When** exporta, **Then** obtiene un archivo
   Excel y uno CSV con sus hogares y ayudas.
3. **Given** la existencia (futura) de una API oficial del RUD, **When** se sincroniza, **Then** el
   registro está preparado para hacerlo sin rediseño; hasta entonces, el export es el puente.

---

### Edge Cases

- **Sin autorización de tratamiento**: el documento no se guarda; el hogar se registra sin él. La
  autorización puede otorgarse después, y ahí se completa.
- **Hogar sin inmueble identificado**: se registra igual (el inmueble puede vincularse después);
  no bloquea la atención.
- **Documento duplicado en el mismo municipio**: se advierte para evitar doble registro del mismo
  hogar; no se crea un duplicado silencioso.
- **Hábeas data (supresión/rectificación)**: un hogar puede pedir corregir o suprimir su dato; la
  supresión se ejecuta y queda constancia del hecho (sin conservar el dato suprimido).
- **Acceso de otro municipio o nivel**: negado al detalle personal; solo agregados hacia arriba.
- **Sin datos**: el municipio sin hogares registrados ve el registro vacío con un mensaje claro.
- **Sin JavaScript / 3G**: registro y consulta funcionan; la foto/geolocalización simplemente no
  se ofrecen, sin romper el flujo.

## Requirements *(mandatory)*

### Functional Requirements

**Registro del hogar (US1)**

- **FR-001**: El sistema MUST permitir a un funcionario del municipio registrar un hogar damnificado
  de **su** territorio, con: nombre del responsable, inmueble afectado (vínculo al inventario),
  composición como conteos (total, niños, adultos mayores, personas con discapacidad) e indicadores
  mínimos (hay heridos / hay fallecidos).
- **FR-002**: El sistema MUST NOT almacenar el documento de un damnificado sin una **autorización
  explícita de tratamiento de datos** registrada para ese hogar (Ley 1581/Decreto 1377).
- **FR-003**: El sistema MUST NOT almacenar historia clínica ni detalle médico; los indicadores de
  salud se limitan a conteos/sí-no para priorizar.
- **FR-004**: El acceso al detalle personal MUST estar acotado al municipio dueño (Principio II);
  ningún otro municipio ni nivel accede a él, y ningún dato personal aparece en URLs, parámetros,
  logs ni mensajes de error.
- **FR-005**: El sistema MUST registrar en la auditoría append-only cada registro, edición, entrega
  de ayuda, autorización y supresión, sin incluir el dato personal en el registro de auditoría.
- **FR-006**: El registro y la consulta MUST ser server-rendered y usables sin JavaScript; la
  captura de campo rica (foto, geolocalización) MUST ser mejora progresiva, nunca el único camino.

**Ayudas por hogar (US2)**

- **FR-007**: El sistema MUST permitir asociar a un hogar ayudas del catálogo de oferta, con estado
  (pendiente / entregada) y fecha.
- **FR-008**: El sistema MUST mostrar, por hogar, las ayudas recibidas y pendientes.

**Agregados, export y RUD (US3)**

- **FR-009**: El sistema MUST exponer a gobernación y nación únicamente **agregados** (conteos por
  municipio y por grupo), sin el detalle personal de ningún hogar.
- **FR-010**: El sistema MUST permitir al municipio **exportar** su registro a Excel y CSV.
- **FR-011**: El registro MUST diseñarse de modo que una futura **sincronización con el RUD**
  nacional (si existe API oficial) sea posible sin rediseño.

**Derechos del titular**

- **FR-012**: El sistema MUST permitir ejercer hábeas data sobre un hogar: conocer, rectificar y
  suprimir su dato; la supresión MUST eliminar el dato y dejar constancia del hecho sin conservar
  lo suprimido.

### Key Entities *(include if feature involves data)*

- **HogarDamnificado**: hogar afectado registrado por un municipio. Atributos: municipio dueño,
  nombre del responsable, documento (opcional, solo con autorización), vínculo al inmueble afectado,
  conteos de composición (total, niños, adultos mayores, discapacidad), indicadores de salud (hay
  heridos / hay fallecidos), fecha de registro. Acotado a su municipio.
- **AutorizacionTratamiento**: constancia de que el hogar autorizó el tratamiento de sus datos
  (Ley 1581): fecha, medio, y qué habilita. Sin ella no se guarda el documento.
- **AyudaAHogar**: ayuda del catálogo de oferta asociada a un hogar, con estado (pendiente/
  entregada) y fecha. Aterriza `OfertaInstitucional` a hogares reales.
- Reutiliza: `ItemInventario`/inmueble (spec 001/002), `OfertaInstitucional` (catálogo de ayudas),
  el tablero territorial (spec 005) para los agregados, y la auditoría (spec 001).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un municipio ve, en un solo lugar, todos los hogares damnificados de su territorio y
  el estado de su atención; 0 hogares de otro municipio (verificable).
- **SC-002**: El 100% de los documentos almacenados tiene su autorización de tratamiento asociada;
  no existe ningún documento sin autorización.
- **SC-003**: Ningún dato personal de un hogar aparece en URLs, logs ni mensajes de error, ni es
  accesible por otro municipio o nivel (verificable por inspección).
- **SC-004**: Ningún registro contiene historia clínica ni detalle médico (verificable por
  inspección del modelo).
- **SC-005**: Un municipio puede exportar su registro a Excel y CSV en menos de 1 minuto.
- **SC-006**: Una solicitud de supresión (hábeas data) elimina el dato del hogar y deja constancia
  del hecho, el 100% de las veces.
- **SC-007**: Gobernación y nación pueden ver los agregados de damnificados de su ámbito sin acceder
  a ningún dato personal.

## Assumptions

- El registro municipal **complementa**, no reemplaza, al RUD nacional: le devuelve al municipio su
  trazabilidad y alimenta al RUD (por export hoy, por API el día que exista).
- La unidad es el **hogar**; las personas se representan como conteos e indicadores, no como
  registros individuales, salvo el responsable del hogar (mínimo para gestionar).
- Los "beneficiados" y la atención se reportan hacia arriba como **agregados**; el detalle personal
  nunca sube de nivel.
- La captura de campo rica (foto del inmueble, geolocalización) se apoya en la enmienda 2.1.0
  (mejora progresiva), con base server-rendered.
- La retención del dato personal es acotada a la finalidad (atención del desastre); su política
  concreta se define en el plan, dentro de Ley 1581.
- El export a Excel/CSV es el puente vigente con la UNGRD; la sincronización por API queda diseñada
  pero no implementada hasta que exista el canal oficial.
