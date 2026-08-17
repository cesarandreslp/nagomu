# Feature Specification: Censo de hogares y seguimiento de la atención a damnificados

**Feature Branch**: `002-atencion-damnificados`

**Created**: 2026-08-17

**Status**: Draft — no habilitada

**Input**: nagomu ya cataloga qué ofrece cada entidad, pero ese catálogo dice qué existe, no si a una familia concreta le llegó. Esta funcionalidad hace el seguimiento hogar por hogar, y hace visible el cuello de botella real: el Registro Único de Damnificados. Si el municipio no censa, la ayuda nacional no llega por mucha plata que haya arriba.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Censo de hogares afectados (Priority: P1)

Una brigada del municipio de Sipí recorre la vereda El Cairo y registra los hogares
afectados: cuántas personas lo componen, en qué estado quedó la vivienda y qué necesitan con
urgencia. Cada hogar queda inscrito con su ubicación jerárquica y su estado en el Registro
Único de Damnificados. Desde ese momento existe para el sistema, y solo desde ese momento
puede acceder a la ayuda que lo exige.

**Why this priority**: Es la puerta de entrada a todo lo demás. Cinco de las diecisiete
ayudas del catálogo exigen estar inscrito, y en la práctica casi todas dependen del censo.
Por sí sola ya resuelve algo: hoy el censo se lleva en cuadernos y hojas de cálculo sueltas
que nadie puede consolidar.

**Independent Test**: Se registran hogares en varias veredas y se verifica que queden
inscritos con su ubicación, que el conteo por sitio sea consultable, y que un funcionario de
otro municipio no pueda verlos.

**Acceptance Scenarios**:

1. **Given** un funcionario municipal autenticado, **When** registra un hogar de cuatro
   personas con vivienda colapsada en la vereda El Cairo, **Then** el hogar queda inscrito
   en el RUD con fecha y responsable del registro.
2. **Given** hogares registrados en Sipí, **When** un funcionario de otro municipio consulta,
   **Then** no puede ver ningún dato identificable de esos hogares y el intento queda
   registrado.
3. **Given** hogares registrados, **When** un funcionario departamental consulta,
   **Then** ve cuántos hogares hay por sitio y en qué condición, pero **no** la identidad ni
   la ubicación exacta de ninguna familia.
4. **Given** un hogar ya inscrito, **When** se intenta inscribir de nuevo en el mismo sitio
   con los mismos datos de contacto, **Then** el sistema advierte del posible duplicado antes
   de crear otro registro.

---

### User Story 2 - Qué ayuda le corresponde y en qué va (Priority: P2)

El funcionario abre el hogar y ve qué ayudas del catálogo le aplican según la condición de su
vivienda y su composición. Vincula las que correspondan, y cada una avanza por estados:
identificada, solicitada, certificada, entregada o negada, con fecha y responsable. Las
medidas que están anunciadas pero sin reglamentar **no aparecen como vinculables**.

**Why this priority**: Convierte el catálogo en seguimiento. Es donde se ve que una familia
lleva tres semanas esperando un subsidio que ya fue aprobado, o que nunca le ofrecieron algo
a lo que tenía derecho.

**Independent Test**: Se vincula una ayuda vigente a un hogar y se recorre su ciclo de
estados; se verifica que una medida anunciada no aparece en la lista de vinculables.

**Acceptance Scenarios**:

1. **Given** un hogar con vivienda inhabitable, **When** el funcionario consulta las ayudas
   aplicables, **Then** aparece el subsidio temporal de arriendo entre las vinculables.
2. **Given** el catálogo con medidas anunciadas sin reglamentar, **When** el funcionario
   consulta las ayudas vinculables, **Then** esas medidas **no aparecen**, y si intenta
   vincular una por otra vía el sistema lo rechaza.
3. **Given** una ayuda vinculada en estado solicitada, **When** se registra su entrega,
   **Then** queda con fecha, responsable y actor que entregó.
4. **Given** una ayuda negada, **When** se registra, **Then** exige motivo.
5. **Given** un hogar sin inscripción en el RUD, **When** se intenta vincular una ayuda que
   lo exige, **Then** el sistema lo impide e indica que falta la inscripción.

---

### User Story 3 - La certificación que destraba la indemnización (Priority: P3)

Una familia de Sipí perdió a un integrante. Para que la ADRES pague la indemnización y los
gastos funerarios, el CMGRD debe certificar que la muerte se relaciona con el sismo. El
funcionario registra la solicitud de certificación; el sistema muestra desde cuándo está
pendiente y quién debe resolverla. Cuando pasa de cierto tiempo sin resolverse, aparece
señalada.

**Why this priority**: Es el cuello de botella invisible más costoso del sistema. La familia
tiene derecho a una indemnización de decenas de millones y no accede porque un trámite
municipal no salió. Hoy nadie lleva la cuenta de cuántas certificaciones están pendientes ni
desde cuándo.

**Independent Test**: Se registra una solicitud de certificación, se deja envejecer, y se
verifica que aparezca señalada como demorada con el número de días.

**Acceptance Scenarios**:

1. **Given** un hogar con una víctima mortal, **When** se registra la solicitud de
   certificación ante el CMGRD, **Then** queda pendiente con fecha de solicitud y
   responsable.
2. **Given** una certificación pendiente, **When** se consulta la lista del municipio,
   **Then** se muestra cuántos días lleva esperando.
3. **Given** una certificación pendiente más allá del plazo definido, **When** se consulta,
   **Then** aparece señalada como demorada, y también en el consolidado departamental como
   cifra agregada.
4. **Given** una certificación, **When** el CMGRD la expide o la niega, **Then** exige fecha,
   responsable y, si es negada, motivo.

---

### User Story 4 - Entregas en terreno y quién las hizo (Priority: P4)

Una brigada entrega doscientos mercados en la vereda El Cairo. Un funcionario lo registra:
sitio, fecha, tipo de ayuda, cuántos hogares se atendieron y qué actor entregó. Lo mismo si
quien entregó fue la Cruz Roja, una fundación o una iglesia.

**Why this priority**: Sin registro de entregas no hay forma de saber qué llegó a dónde, y
las dos historias siguientes dependen de este dato.

**Independent Test**: Se registran entregas de varios actores en varios sitios y se verifica
que el consolidado por sitio y tipo sea correcto.

**Acceptance Scenarios**:

1. **Given** un funcionario municipal, **When** registra una entrega de alimentación en un
   sitio con doscientos hogares atendidos, **Then** queda con fecha, tipo, cantidad y actor.
2. **Given** entregas de varios actores, **When** se consulta un sitio, **Then** se ve el
   historial completo sin importar quién entregó.
3. **Given** una entrega mal registrada, **When** se corrige, **Then** se crea un registro
   nuevo que referencia al anterior y el original sigue consultable.

---

### User Story 5 - Dónde sobra y dónde no ha llegado nada (Priority: P5)

El coordinador municipal abre el tablero de cobertura. Ve que la vereda El Cairo recibió
alimentación tres veces en cinco días por tres actores distintos, y que la vereda Taparal
no ha recibido nada en doce días. La segunda lista está ordenada por vulnerabilidad.

**Why this priority**: Es la razón de ser de esta funcionalidad. Evita que la ayuda se
concentre donde hay cobertura mediática mientras las veredas rurales quedan sin nada. Depende
de que existan entregas registradas (US4) y de que los terceros reporten (US6).

**Independent Test**: Con entregas cargadas, se verifica que el sistema señale las
duplicadas dentro de la ventana y liste los sitios sin atención ordenados por vulnerabilidad.

**Acceptance Scenarios**:

1. **Given** dos entregas del mismo tipo en el mismo sitio dentro de la ventana definida,
   **When** se consulta el tablero, **Then** aparecen señaladas como posible duplicación,
   indicando qué actores entregaron y en qué fechas.
2. **Given** sitios sin ninguna entrega en el periodo definido, **When** se consulta el
   tablero, **Then** se listan ordenados por vulnerabilidad, primero los más vulnerables.
3. **Given** el tablero, **When** lo consulta un funcionario departamental, **Then** ve la
   cobertura de todos sus municipios por sitio, sin ningún dato identificable de familias.
4. **Given** un sitio con hogares censados pero sin ninguna entrega, **When** se consulta,
   **Then** se distingue de un sitio sin hogares censados: no es lo mismo no haber llegado
   que no haber nadie.

---

### User Story 6 - Que reporten los que no tienen cuenta (Priority: P6)

Una fundación entregó cien colchonetas el jueves en El Cairo. Entra al enlace público del
municipio, sin cuenta, y reporta qué entregó, dónde y cuándo. El reporte aparece marcado como
declarado sin verificar hasta que un funcionario municipal lo confirma.

**Why this priority**: Sin esto, la detección de duplicados no funciona. El municipio ya sabe
lo que él mismo entregó; lo que no sabe es que el jueves pasó una fundación y el sábado una
iglesia. Va de última porque exige que todo lo anterior funcione, pero sin ella la US5
solo confirma lo que ya se sabía.

**Independent Test**: Se envía un reporte desde el enlace público sin sesión, se verifica que
entre como no verificado y que no aparezca en los conteos oficiales hasta ser confirmado.

**Acceptance Scenarios**:

1. **Given** el enlace público de un municipio, **When** alguien sin cuenta reporta una
   entrega, **Then** queda registrada como declarada sin verificar, con la fecha del reporte.
2. **Given** un reporte sin verificar, **When** se consulta el tablero de cobertura,
   **Then** se muestra distinguido de las entregas confirmadas y no altera los conteos
   oficiales.
3. **Given** un reporte sin verificar, **When** un funcionario municipal lo confirma o lo
   descarta, **Then** queda con responsable y fecha, y si lo descarta, con motivo.
4. **Given** el formulario público, **When** alguien intenta enviar datos de personas
   identificables, **Then** el formulario no los solicita ni los admite: reporta entregas por
   sitio, nunca por familia.

---

### Edge Cases

- **Hogar sin inscripción en el RUD**: se puede censar, pero las ayudas que exigen inscripción
  quedan bloqueadas con el motivo visible. No se bloquea el censo mismo.
- **Hogar que se muda de sitio**: se registra el cambio conservando el historial; la cobertura
  histórica del sitio anterior no se altera retroactivamente.
- **Sitio sin hogares censados y sin entregas**: se distingue explícitamente de un sitio con
  hogares censados y sin entregas. El primero puede ser que nadie haya llegado a censar.
- **Entrega registrada por dos actores distintos para el mismo hecho**: el tablero la señala
  como posible duplicación de registro, no como duplicación de ayuda; la resuelve el municipio.
- **Reporte público malicioso o falso**: entra sin verificar, no altera conteos, y el municipio
  lo descarta con motivo. Un reporte falso nunca puede aumentar la cobertura aparente de un
  sitio.
- **Avalancha de reportes públicos desde un mismo origen**: se limita la frecuencia de envío
  por municipio; la limitación no puede impedir que una brigada legítima reporte su jornada.
- **Certificación pendiente cuyo solicitante ya no aparece**: se conserva pendiente y visible;
  no se cierra automáticamente por inactividad.
- **Ayuda que pasa de vigente a cerrada mientras hay vinculaciones en curso**: las
  vinculaciones existentes conservan su estado y su historial; no se pueden crear nuevas.
- **Municipio sin índice de vulnerabilidad cargado**: sus sitios aparecen en la lista de
  huecos, ordenados al final, marcados como dato faltante. Nunca se excluyen.

## Requirements *(mandatory)*

### Functional Requirements

**Censo de hogares**

- **FR-001**: El sistema MUST permitir a un funcionario municipal registrar un hogar afectado
  con su ubicación jerárquica, número de integrantes, condición de la vivienda y necesidades
  urgentes.
- **FR-002**: El sistema MUST manejar la ubicación como jerarquía: municipio, luego
  corregimiento o comuna, luego vereda o barrio, y opcionalmente un sitio concreto.
- **FR-003**: El sistema MUST registrar el estado de inscripción del hogar en el Registro
  Único de Damnificados, con fecha y responsable.
- **FR-004**: El sistema MUST advertir de un posible duplicado antes de inscribir un hogar con
  los mismos datos de contacto en el mismo sitio, sin impedirlo: dos familias pueden compartir
  un teléfono.
- **FR-005**: El municipio MUST poder registrar hogares únicamente en su propio territorio.

**Seguimiento de la oferta**

- **FR-006**: El sistema MUST permitir vincular a un hogar únicamente las ofertas del catálogo
  que estén **habilitadas**. Una medida anunciada sin reglamentar MUST NOT poder vincularse,
  ni aparecer entre las opciones, ni admitirse por ninguna otra vía.
- **FR-007**: Cada vinculación MUST manejar los estados identificada, solicitada, certificada,
  entregada y negada, con fecha y responsable en cada cambio.
- **FR-008**: El sistema MUST exigir motivo al registrar una negativa.
- **FR-009**: El sistema MUST impedir vincular una ayuda que exige inscripción en el RUD a un
  hogar que no la tiene, indicando el motivo.
- **FR-010**: El sistema MUST sugerir qué ofertas aplican a un hogar según la condición de su
  vivienda y su composición, sin vincularlas automáticamente: la decisión es del funcionario.

**Certificaciones**

- **FR-011**: El sistema MUST permitir registrar solicitudes de certificación de condición de
  damnificado ante el CMGRD o el CDGRD, con fecha de solicitud y responsable.
- **FR-012**: El sistema MUST mostrar cuántos días lleva pendiente cada certificación.
- **FR-013**: El sistema MUST señalar las certificaciones que superen el plazo definido, y
  MUST reflejarlas como cifra agregada en el consolidado departamental y nacional.
- **FR-014**: Expedir o negar una certificación MUST exigir fecha y responsable, y motivo en
  caso de negativa.

**Entregas en terreno**

- **FR-015**: El sistema MUST permitir registrar entregas de ayuda humanitaria con sitio,
  fecha, tipo, cantidad de hogares atendidos y actor que entregó.
- **FR-016**: Los tipos de ayuda MUST incluir al menos alimentación, agua potable, colchonetas
  y dormida, estufas y cocina, kits de aseo, materiales de construcción, herramientas y salud.
- **FR-017**: El actor que entrega MUST poder ser una entidad pública, un organismo de socorro,
  una empresa, una fundación, un voluntariado o una persona natural.
- **FR-018**: Las correcciones de una entrega MUST crearse como registros nuevos que
  referencian al anterior, nunca sobrescribiendo.

**Cobertura territorial**

- **FR-019**: El sistema MUST señalar como posible duplicación dos o más entregas del mismo
  tipo en el mismo sitio dentro de una ventana de días configurable, indicando actores y
  fechas.
- **FR-020**: El sistema MUST listar los sitios sin ninguna entrega en un periodo definido,
  ordenados por vulnerabilidad de mayor a menor.
- **FR-021**: El sistema MUST distinguir un sitio sin hogares censados de un sitio con hogares
  censados y sin entregas.
- **FR-022**: Los sitios sin índice de vulnerabilidad MUST aparecer en la lista marcados como
  dato faltante, nunca excluidos.

**Auto-reporte de terceros**

- **FR-023**: El sistema MUST ofrecer un canal público por municipio, sin cuenta, para reportar
  entregas realizadas.
- **FR-024**: Todo reporte público MUST entrar marcado como declarado sin verificar y MUST NOT
  alterar los conteos oficiales de cobertura hasta ser confirmado.
- **FR-025**: Un funcionario municipal MUST poder confirmar o descartar un reporte, con
  responsable y fecha, y motivo al descartar.
- **FR-026**: El formulario público MUST NOT solicitar ni admitir datos de personas
  identificables: reporta entregas por sitio, nunca por familia.
- **FR-027**: El sistema MUST limitar la frecuencia de envío desde el canal público sin
  impedir que una brigada legítima reporte una jornada completa.

**Protección de datos** *(NO NEGOCIABLE)*

- **FR-028**: Solo el municipio dueño MUST poder ver datos identificables de sus hogares.
- **FR-029**: Los niveles departamental y nacional MUST ver únicamente agregados por sitio,
  tipo de ayuda y condición de vivienda. El sistema MUST NOT exponerles la identidad, el
  contacto ni la ubicación exacta de ninguna familia.
- **FR-030**: El sistema MUST recolectar el mínimo dato personal indispensable para la
  operación, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013.
- **FR-031**: Los datos de salud y la ubicación exacta de una persona afectada son datos
  sensibles y MUST tener control de acceso explícito y registro de cada consulta.
- **FR-032**: El sistema MUST NOT incluir datos personales en URLs, parámetros de consulta,
  registros de aplicación ni mensajes de error.
- **FR-033**: El sistema MUST registrar el propósito declarado de cada consulta a datos
  sensibles, de modo que una revisión posterior pueda distinguir una consulta operativa de una
  exploración indebida.

**Trazabilidad**

- **FR-034**: Todo registro de hogar, vinculación de ayuda, cambio de estado, certificación,
  entrega y confirmación de reporte MUST quedar en el registro append-only, con actor, entidad,
  nivel territorial y marca de tiempo del servidor.
- **FR-035**: El sistema MUST registrar los intentos rechazados por permisos, incluidos los
  intentos de acceder a datos de hogares de otro municipio.

### Key Entities

- **Sitio**: nodo de la jerarquía territorial —corregimiento, comuna, vereda, barrio o punto
  concreto— que pertenece a un municipio. Es la unidad sobre la que se mide cobertura.
- **Hogar**: familia afectada. Pertenece a un sitio y a un municipio. Guarda número de
  integrantes, condición de la vivienda, necesidades urgentes y estado en el RUD. Contiene el
  mínimo dato personal indispensable.
- **VinculacionOferta**: relación entre un hogar y una oferta del catálogo, con su estado,
  fechas, responsable y motivo cuando es negada.
- **Certificacion**: solicitud ante el CMGRD o CDGRD que acredita la condición de damnificado.
  Tiene estado, fecha de solicitud, fecha de resolución, responsable y motivo.
- **Entrega**: ayuda humanitaria entregada en un sitio en una fecha, por un actor, con tipo y
  cantidad de hogares atendidos.
- **ReportePublico**: entrega declarada por un tercero sin cuenta. Tiene estado de
  verificación, y no cuenta como cobertura hasta confirmarse.
- **OfertaInstitucional** *(existente)*: catálogo de ayudas con su regla de habilitación.
- **Actor** *(existente)*: quien entrega o interviene.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una brigada registra un hogar completo en menos de dos minutos en un teléfono de
  gama baja sobre 3G.
- **SC-002**: Ninguna medida anunciada sin reglamentar aparece como vinculable en ninguna
  pantalla, verificable por auditoría sobre los intentos rechazados.
- **SC-003**: El coordinador municipal identifica en menos de un minuto los tres sitios más
  vulnerables sin atención reciente.
- **SC-004**: El 100% de las certificaciones pendientes muestra desde cuándo espera.
- **SC-005**: Cero casos de un funcionario accediendo a datos identificables de hogares de
  otro municipio, verificado sobre el registro de intentos rechazados.
- **SC-006**: Cero datos personales presentes en URLs, registros de aplicación o mensajes de
  error, verificado por revisión.
- **SC-007**: Un reporte público no confirmado nunca aumenta la cobertura aparente de un sitio.
- **SC-008**: El estado de cualquier hogar y de cualquier trámite puede reconstruirse a
  cualquier fecha pasada.
- **SC-009**: En el piloto, al menos el 70% de los sitios con hogares censados registra al
  menos una entrega en los primeros treinta días.

## Assumptions

- El censo lo levantan funcionarios y brigadas municipales autenticados. El damnificado no se
  autorregistra en esta versión.
- La jerarquía territorial se carga previamente por administración a partir de fuentes
  oficiales. No se crea sobre la marcha desde el formulario de censo.
- El índice de vulnerabilidad usado para ordenar los huecos es el mismo del municipio que ya
  emplea la priorización de obras, aplicado al sitio mientras no exista un índice por vereda.
- La ventana de duplicación y el periodo sin atención son configurables por administración,
  con valores iniciales provisionales que deben calibrarse con datos reales del piloto.
- La escala de prioridad es la misma de la funcionalidad de obras. Aquí aplica el nivel 0,
  vida y subsistencia, que quedó explícitamente fuera de aquella.
- De una persona se registra únicamente lo indispensable para operar y contactar. No se
  capturan documentos de identidad ni historia clínica.
- Se reutiliza lo ya construido: catálogo de oferta con su regla de habilitación, registro de
  actores, auditoría inmutable, autenticación por sesión y escala de prioridad.
- Fuera de alcance en esta versión: mapa geográfico, canal por WhatsApp o SMS, operación
  offline con sincronización, integración con SISBEN o con el RUD nacional, y clasificación
  asistida por IA.
- El piloto abarca los municipios ya cargados del Valle del Cauca, Chocó y Risaralda.

## Clarifications Needed

- **[NEEDS CLARIFICATION: identificación del hogar]** ¿Con qué se identifica un hogar sin
  capturar documentos de identidad? Un nombre y un teléfono se repiten y se pierden; un
  documento es dato sensible que la constitución del proyecto evita. La decisión determina si
  el censo puede cruzarse con el RUD nacional más adelante.
- **[NEEDS CLARIFICATION: quién opera el canal público]** El auto-reporte de terceros es lo
  que hace funcionar la detección de duplicados, pero abre la puerta a reportes falsos y a
  carga de verificación sobre el municipio. ¿Se abre desde el inicio del piloto, o solo
  después de que el censo y las entregas estén funcionando?
- **[NEEDS CLARIFICATION: plazo de las certificaciones]** ¿A partir de cuántos días una
  certificación pendiente se considera demorada? No hay un plazo legal evidente y el número
  determina cuándo el sistema empieza a señalar a un municipio.
