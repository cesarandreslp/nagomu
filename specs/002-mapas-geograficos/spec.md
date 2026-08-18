# Feature Specification: Mapas geográficos como vista complementaria

**Feature Branch**: `002-mapas-geograficos`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Mapas geográficos como vista complementaria del sistema. Agregar coordenadas geográficas (latitud/longitud) opcionales a los ítems de inventario y a los actores de tipo voluntariado, y mostrar cuatro capas en un mapa: (1) inventario de infraestructura afectada, (2) ubicación de voluntariados, (3) obras realizadas y próximas a intervenir, (4) entregas de ayuda agregadas por municipio o punto de entrega. Restricciones constitucionales: NO se geolocalizan personas afectadas ni se registran beneficiarios individuales (Principio IV, no negociable); el mapa es una vista COMPLEMENTARIA de la lista/tabla server-rendered (Principio III); filtrado por ámbito territorial del usuario (Principio II)."

## Contexto y encuadre constitucional

Esta feature nace de una necesidad operativa: durante y después de un desastre,
las entidades territoriales necesitan **ver en el territorio** qué infraestructura
está afectada, dónde están los voluntariados, qué obras van y dónde ha llegado la
ayuda. Hoy toda la ubicación es texto descriptivo, sin coordenadas.

Tres principios de la constitución acotan el diseño y **no son negociables aquí**:

- **Principio IV (mínimo de datos personales)**: la ubicación de una persona
  afectada es dato sensible. Por eso **no** se geolocalizan ni registran
  beneficiarios individuales. La capa de ayuda mapea **entregas y puntos**
  (con conteos agregados de hogares), nunca personas.
- **Principio III (operación en condiciones adversas)**: el mapa es una vista
  **complementaria**. La lista/tabla renderizada en el servidor sigue siendo la
  vista esencial y debe funcionar sin JavaScript del cliente sobre 3G. Ningún dato
  operativo es accesible **solo** a través del mapa.
- **Principio II (autoridad por nivel territorial)**: el mapa filtra por el ámbito
  del usuario autenticado en el servidor. Un municipio ve solo sus ítems, obras y
  entregas; nunca los de otro municipio.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ubicar el inventario afectado y las obras en el territorio (Priority: P1)

Un funcionario del municipio abre la vista de inventario. Junto a la lista de ítems
afectados (que ya existe y sigue siendo la vista base), aparece un mapa complementario
que muestra cada ítem que tiene coordenada registrada, con un indicador de su estado de
obra (identificado, en estudios, costeado, en ejecución, entregada). Los ítems sin
coordenada no aparecen en el mapa pero permanecen íntegros en la lista.

**Why this priority**: Es el núcleo de la feature y el que más valor entrega de
inmediato: da lectura territorial de lo que el sistema ya sabe (inventario + obras +
cola de priorización). No requiere modelar entidades nuevas, solo agregar la coordenada
opcional. Es el MVP.

**Independent Test**: Cargar un municipio con algunos ítems con coordenada y otros sin
ella; verificar que la lista muestra todos, que el mapa muestra solo los que tienen
coordenada, y que el estado de obra se distingue visualmente.

**Acceptance Scenarios**:

1. **Given** un ítem con latitud/longitud válidas, **When** el funcionario abre la vista
   de inventario, **Then** el ítem aparece como marcador en el mapa y también en la lista.
2. **Given** un ítem sin coordenada, **When** se abre la vista, **Then** el ítem aparece
   en la lista pero no en el mapa, y no se produce ningún error.
3. **Given** un ítem con obra en estado `EN_EJECUCION` y otro `ENTREGADA`, **When** se ven
   en el mapa, **Then** cada uno se distingue por su estado.
4. **Given** un usuario del municipio A, **When** abre el mapa, **Then** no ve ningún ítem
   del municipio B, aunque tengan coordenada.
5. **Given** un cliente sin JavaScript o con la conexión caída al servicio de mapa,
   **When** abre la vista de inventario, **Then** la lista/tabla sigue mostrando toda la
   información esencial.

---

### User Story 2 - Ubicar los voluntariados disponibles (Priority: P2)

Un funcionario necesita saber qué voluntariados están operando y dónde. La ficha de un
actor de tipo `VOLUNTARIADO` admite una coordenada opcional (la base o punto de operación
de la organización, no de una persona). En el mapa aparece una capa de voluntariados que
se puede mostrar u ocultar.

**Why this priority**: Alto valor de coordinación, pero depende de que los voluntariados
tengan coordenada cargada; se apoya en la infraestructura de mapa del P1. Solo aplica a
actores de tipo voluntariado.

**Independent Test**: Registrar dos voluntariados, uno con coordenada y otro sin ella;
verificar que ambos siguen en el directorio de actores y que solo el que tiene coordenada
aparece en la capa de voluntariados del mapa.

**Acceptance Scenarios**:

1. **Given** un actor tipo `VOLUNTARIADO` con coordenada, **When** se activa la capa de
   voluntariados, **Then** aparece su marcador distinguible de la capa de inventario.
2. **Given** un actor que NO es voluntariado (empresa, fundación, persona natural),
   **When** se edita su ficha, **Then** no se ofrece campo de coordenada.
3. **Given** una persona natural, **When** se revisa su ficha, **Then** confirma que no
   existe ni se puede capturar coordenada para ese tipo (Principio IV).

---

### User Story 3 - Ver dónde ha llegado la ayuda, sin exponer personas (Priority: P3)

Un funcionario quiere ver, para un periodo (por defecto la última semana), dónde se han
entregado ayudas y en qué volumen, sin importar quién las entregó (alcaldía, gobernación,
nación o voluntariado). El sistema muestra entregas **agregadas**: por municipio o por
punto de entrega, con el tipo de oferta, la fecha y el conteo de hogares atendidos. Nunca
se muestra ni se almacena la identidad ni la ubicación de una persona.

**Why this priority**: Es la capa de mayor sensibilidad y la única que requiere una
entidad de datos nueva (`EntregaAyuda`). Se deja al final porque su diseño debe
garantizar por construcción que no haya datos personales.

**Independent Test**: Registrar varias entregas en distintos puntos y fechas; verificar
que el mapa y la lista muestran los agregados del periodo seleccionado, que ninguna
entrega referencia a una persona, y que el filtro por semana funciona.

**Acceptance Scenarios**:

1. **Given** entregas registradas en la última semana en dos puntos, **When** se abre la
   vista de ayuda con el periodo por defecto, **Then** se ven ambos puntos con su conteo
   de hogares y tipo de oferta.
2. **Given** una entrega registrada por un voluntariado y otra por la alcaldía, **When**
   se ven en el mapa, **Then** ambas aparecen sin distinción de trato (el origen se puede
   consultar, pero no filtra la visibilidad).
3. **Given** el modelo de `EntregaAyuda`, **When** se inspecciona su definición, **Then**
   no contiene ningún campo que identifique a una persona ni su ubicación individual.
4. **Given** una entrega sin punto geográfico pero con municipio, **When** se ve el mapa,
   **Then** el conteo se agrega a nivel del municipio en lugar de un marcador puntual.

---

### Edge Cases

- **Coordenada inválida o fuera de rango**: latitud fuera de [-90, 90] o longitud fuera
  de [-180, 180] debe rechazarse en captura; nunca se guarda una coordenada imposible.
- **Coordenada fuera del territorio del municipio**: se acepta pero se advierte (puede ser
  un error de digitación); no se bloquea, porque forzar geocerca sería frágil en el piloto.
- **Ítem/voluntariado sin coordenada**: permanece en todas las listas; simplemente no se
  dibuja. Nunca es causa de error.
- **Servicio de teselas de mapa no disponible**: la vista degrada a la lista; el mapa
  puede mostrar un aviso, pero la información esencial no depende de él.
- **Periodo sin entregas**: la vista de ayuda muestra "sin entregas en el periodo", no un
  error ni un mapa vacío ambiguo.
- **Entrega con conteo de hogares en cero o negativo**: se rechaza; el conteo es un entero
  positivo.

## Requirements *(mandatory)*

### Functional Requirements

**Coordenadas (base para todas las capas)**

- **FR-001**: El sistema MUST permitir asociar una coordenada geográfica opcional
  (latitud y longitud) a cada ítem de inventario.
- **FR-002**: El sistema MUST permitir asociar una coordenada geográfica opcional a cada
  actor de tipo `VOLUNTARIADO`, y MUST NOT ofrecer coordenada a actores de tipo
  `PERSONA_NATURAL`.
- **FR-003**: El sistema MUST validar en el servidor que latitud ∈ [-90, 90] y longitud ∈
  [-180, 180], rechazando cualquier valor fuera de rango.
- **FR-004**: El sistema MUST tratar la coordenada como opcional: la ausencia de
  coordenada MUST NOT impedir crear, editar ni listar el ítem o el actor.

**Vista de mapa (complementaria)**

- **FR-005**: El sistema MUST mostrar el mapa únicamente como complemento de una
  lista/tabla renderizada en el servidor; toda la información esencial MUST estar
  disponible sin el mapa.
- **FR-006**: El sistema MUST NOT depender de JavaScript del cliente para exponer datos
  operativos: ningún dato accesible en el mapa puede ser inaccesible en la lista.
- **FR-007**: El sistema MUST filtrar en el servidor todo lo que se dibuja en el mapa por
  el ámbito territorial del usuario autenticado (un municipio ve solo lo suyo).
- **FR-008**: El sistema MUST omitir del mapa, sin error, todo ítem/actor/entrega que no
  tenga coordenada, conservándolos en las listas.
- **FR-009**: El sistema MUST permitir mostrar u ocultar cada capa (inventario,
  voluntariados, entregas) de forma independiente.
- **FR-010**: El sistema MUST distinguir en la capa de inventario el estado de obra de
  cada ítem (identificado, en estudios, costeado, en ejecución, entregada), de modo que
  "obras realizadas" y "próximas a intervenir" sean legibles en el mapa.

**Capa de entregas de ayuda (sin datos personales)**

- **FR-011**: El sistema MUST registrar entregas de ayuda como hechos **agregados**, con:
  tipo de oferta, municipio, punto de entrega opcional (coordenada), fecha y conteo de
  hogares atendidos. La entidad MUST NOT contener ningún campo que identifique a una
  persona ni la ubicación individual de un afectado.
- **FR-012**: El sistema MUST validar que el conteo de hogares atendidos sea un entero
  positivo.
- **FR-013**: El sistema MUST permitir filtrar las entregas por periodo, con la última
  semana como periodo por defecto.
- **FR-014**: El sistema MUST mostrar las entregas independientemente de su origen
  (municipio, gobernación, nación o voluntariado); el origen es consultable pero no
  cambia la visibilidad.
- **FR-015**: El sistema MUST agregar a nivel de municipio las entregas sin coordenada
  puntual, en lugar de descartarlas.

**Trazabilidad**

- **FR-016**: El sistema MUST registrar en la auditoría append-only la creación de una
  entrega de ayuda y la asignación/cambio de coordenada de un ítem o actor (Principio I),
  sin incluir datos personales en el registro.

### Key Entities *(include if feature involves data)*

- **Coordenada de ítem de inventario**: latitud y longitud opcionales sobre el ítem
  existente; representa la ubicación de la infraestructura afectada, no de personas.
- **Coordenada de voluntariado**: latitud y longitud opcionales sobre el actor de tipo
  voluntariado; representa la base/punto de operación de la organización.
- **EntregaAyuda** (nueva): hecho agregado de ayuda entregada. Atributos: tipo de oferta,
  municipio, coordenada opcional del punto de entrega, fecha, conteo de hogares atendidos,
  origen (nivel/entidad que entregó), quién lo registró y marca de tiempo del servidor.
  **Sin ningún atributo que identifique o ubique a una persona.** Append-only, coherente
  con el resto del sistema.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un funcionario puede ubicar en el mapa todos los ítems con coordenada de su
  municipio en una sola vista, sin ver los de otro municipio (0 fugas entre entidades).
- **SC-002**: El 100% de los ítems y actores sin coordenada siguen visibles y editables en
  las listas; la ausencia de coordenada nunca produce un error.
- **SC-003**: Con el servicio de mapa deshabilitado o sin JavaScript, el 100% de la
  información operativa esencial sigue disponible en la lista/tabla.
- **SC-004**: Ninguna entidad, registro de auditoría, URL ni mensaje del sistema contiene
  la identidad ni la ubicación individual de una persona afectada (verificable por
  inspección del modelo y de los registros).
- **SC-005**: Un funcionario puede ver las entregas de ayuda de la última semana y su
  conteo de hogares por punto/municipio en menos de 1 minuto desde que abre la vista.
- **SC-006**: Una coordenada fuera de rango es rechazada el 100% de las veces en la
  captura del lado del servidor.

## Assumptions

- El piloto opera sobre municipios y una gobernación ya modelados; no se introduce un
  catálogo geográfico externo más allá de las coordenadas puntuales.
- Las coordenadas se capturan manualmente (digitación o selección en el mapa); no se
  integra un servicio de geocodificación de direcciones en esta versión.
- No se impone una geocerca estricta al municipio: una coordenada fuera del territorio se
  advierte pero se acepta, para no bloquear la operación por bordes imprecisos.
- El proveedor de teselas/base cartográfica se decide en la fase de planificación; la spec
  solo exige que el mapa sea complementario y degradable.
- "Obras realizadas" y "próximas a intervenir" se derivan del estado de obra y de la cola
  de priorización ya existentes (spec 001); esta feature las representa geográficamente,
  no redefine su cálculo.
- El registro de entregas de ayuda lo hacen funcionarios de las entidades; los
  voluntariados sin usuario propio se registran a través de la entidad territorial, como
  ocurre hoy con los aportes.
