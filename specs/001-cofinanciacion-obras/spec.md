# Feature Specification: Cofinanciación priorizada de obras de reconstrucción

**Feature Branch**: `001-cofinanciacion-obras`

**Created**: 2026-08-16

**Status**: Draft

**Input**: Cofinanciación priorizada de obras de reconstrucción entre municipio, gobernación y nación. Tras un desastre, el municipio es el primero que debe atender y direccionar recursos; progresivamente la gobernación y luego la nación pueden sumarse a financiar la misma obra, y también puede entrar cooperación internacional. Si nadie se suma, al municipio le tomaría muchos más años ejecutar la obra solo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inventario priorizado de intervenciones (Priority: P1)

Un funcionario del municipio de Buga registra el teatro municipal como edificación
afectada que requiere intervención. Indica de qué tipo es, cuántas personas se
benefician y hace cuánto está fuera de servicio. El sistema lo clasifica en el nivel
de prioridad 5 (cultural y recreativo) y calcula su puntaje dentro de ese nivel. Al
abrir la lista del municipio, el teatro aparece por debajo de la escuela con cubierta
colapsada y muy por debajo del muro de contención de la zona de derrumbes, y cada
obra muestra los números con los que se calculó su posición.

**Why this priority**: Sin inventario clasificado no hay nada que cofinanciar. Por sí
solo ya resuelve un problema real: hoy la priorización se decide por presión política
o cobertura mediática, y este listado la vuelve una regla escrita que cualquiera puede
verificar. Es la única historia que no depende de ninguna otra.

**Independent Test**: Se registra un conjunto de obras de tipos distintos y se verifica
que la lista quede ordenada por nivel y, dentro del nivel, por puntaje, mostrando en
cada obra los factores que produjeron ese puntaje.

**Acceptance Scenarios**:

1. **Given** un funcionario municipal autenticado, **When** registra un muro de contención
   en zona de derrumbes y una escuela con cubierta colapsada, **Then** el muro aparece
   antes que la escuela en la lista, porque el nivel 1 manda sobre el nivel 3.
2. **Given** dos escuelas del mismo municipio en nivel 3, una que beneficia a 800 personas
   y otra a 120, **When** se consulta la lista, **Then** la de 800 aparece primero y ambas
   muestran el número de beneficiados usado en el cálculo.
3. **Given** una obra registrada, **When** un usuario abre su detalle, **Then** ve el nivel
   asignado, los ODS asociados, cada factor del puntaje con su valor y el puntaje final.
4. **Given** un funcionario del municipio de Sipí, **When** intenta editar una obra del
   municipio de Buga, **Then** el sistema se lo impide y registra el intento.

---

### User Story 2 - Costeo determinado por el estudio (Priority: P2)

El teatro de Buga está en el inventario pero nadie sabe cuánto cuesta intervenirlo. El
municipio consigue una cotización de los estudios estructurales por $200 millones y la
registra; la obra pasa a "En estudios". Meses después el estudio entrega su resultado:
la intervención vale $3.000 millones. El funcionario registra ese valor con la fecha y
el documento que lo respalda, y la obra pasa a "Costeado". Solo desde ese momento el
sistema muestra brecha y plazos.

**Why this priority**: Es la condición para que exista cualquier cifra de dinero
confiable. Impide que el sistema publique brechas y plazos calculados sobre costos
inventados, que es como estos ejercicios pierden credibilidad.

**Independent Test**: Se registra una obra sin estudio y se verifica que no muestre
brecha ni plazos; se registra el resultado del estudio y se verifica que ambas cifras
aparezcan y queden asociadas al documento de respaldo.

**Acceptance Scenarios**:

1. **Given** una obra en estado "Identificado", **When** se consulta su detalle, **Then**
   no se muestra brecha ni tiempo estimado, sino la leyenda "pendiente de estudios",
   pero sí se muestra su prioridad.
2. **Given** una obra en estado "En estudios" con cotización de $200 millones, **When**
   se registra el resultado del estudio por $3.000 millones con fecha y documento,
   **Then** la obra pasa a "Costeado" y expone ambos valores por separado.
3. **Given** una obra costeada, **When** un estudio posterior actualiza el valor, **Then**
   el costo anterior se conserva en el historial y la brecha se recalcula con el nuevo.
4. **Given** una obra en estado "Identificado", **When** se intenta pasarla directamente
   a "En ejecución", **Then** el sistema lo rechaza indicando la transición faltante.

---

### User Story 3 - Cofinanciación y escenarios de tiempo (Priority: P3)

El municipio de Buga registra su aporte de $200 millones al teatro, indicando que salen
de aplazar la pavimentación de la vía a El Placer. El sistema muestra que, con la
capacidad fiscal reportada por hacienda, al municipio solo le tomaría cerca de 9 años
cerrar la brecha. Muestra además qué pasaría si se sumara la gobernación y qué pasaría
si además se sumara la nación. El municipio usa esa pantalla para pedir apoyo.

**Why this priority**: Es la razón de ser de nagomu. Convierte el inventario en un
argumento: no dice solo "falta plata", dice "si aportas esto, la obra pasa de 9 años a
4". Depende de que exista costo (US2), por eso va después.

**Independent Test**: Se registra un aporte sobre una obra costeada y se verifica que la
brecha disminuya, que el plazo estimado se acorte y que el aporte quede con su origen
declarado y su registro de auditoría.

**Acceptance Scenarios**:

1. **Given** una obra costeada en $3.000 millones sin aportes, **When** el municipio
   registra un aporte de $200 millones, **Then** la brecha queda en $2.800 millones.
2. **Given** un aporte, **When** se registra, **Then** exige declarar su origen, y si el
   origen es traslado presupuestal exige indicar qué proyecto se aplazó.
3. **Given** una obra costeada con brecha y una capacidad fiscal municipal vigente,
   **When** se consulta el detalle, **Then** se muestran los escenarios de plazo con y
   sin la participación de cada nivel.
7. **Given** un municipio con capacidad de $500 millones anuales y varias obras costeadas,
   **When** se consulta el teatro ubicado en la posición 12 de la cola, **Then** se muestra
   que no recibiría recursos propios sino hasta el año en que se cierren las once anteriores.
8. **Given** esa misma cola, **When** la gobernación aporta a la obra que está de primera,
   **Then** todas las obras que venían detrás adelantan su año estimado de inicio.
9. **Given** una obra en la cola, **When** se registra un muro de contención de nivel 1 que
   la desplaza, **Then** su detalle indica cuántos años se retrasó y por cuál obra.
4. **Given** un aporte registrado con monto equivocado, **When** se corrige, **Then** se
   crea un registro nuevo que referencia al anterior y el original permanece consultable.
5. **Given** un funcionario de la gobernación, **When** intenta modificar un aporte
   inscrito por el municipio, **Then** el sistema se lo impide.
6. **Given** una capacidad fiscal reportada hace más de doce meses, **When** se muestran
   los plazos, **Then** se advierte que el dato está desactualizado y desde qué fecha.

---

### User Story 4 - Vista departamental y decisión de sumarse (Priority: P4)

Un funcionario de la Gobernación del Valle del Cauca abre nagomu y ve las obras de todos
sus municipios ordenadas por prioridad, con su brecha y cuánto se acortaría el plazo con
un aporte departamental. Identifica dónde su plata rinde más, y registra el aporte de la
gobernación al teatro de Buga.

**Why this priority**: Cierra el ciclo — sin un segundo nivel que pueda sumarse, la
cofinanciación es teórica. Va de último porque reutiliza todo lo construido en las
historias anteriores.

**Independent Test**: Con obras cargadas en varios municipios, se verifica que el
funcionario departamental las vea consolidadas y ordenadas, y que pueda inscribir un
aporte propio pero no editar la obra ni los aportes ajenos.

**Acceptance Scenarios**:

1. **Given** obras registradas en Buga y en Sipí, **When** un funcionario de la
   Gobernación del Valle consulta su lista, **Then** ve las de Buga y no puede editar
   las de otros departamentos.
2. **Given** la lista departamental, **When** se ordena por impacto, **Then** aparecen
   primero las obras donde un aporte departamental produce la mayor reducción de plazo.
3. **Given** un funcionario departamental, **When** registra el aporte de la gobernación,
   **Then** la brecha y los plazos se actualizan para todos los niveles.
4. **Given** cualquier usuario autenticado de cualquier nivel, **When** consulta una obra
   de cualquier municipio, **Then** puede verla completa aunque no pueda editarla.

---

### User Story 5 - Intervención de un tercero vigilada por el municipio (Priority: P5)

Una empresa de Buga se ofrece a reconstruir la cubierta de una escuela por su cuenta. Se
acerca a la alcaldía, diligencia el formato de intervención indicando qué va a hacer, en
cuánto tiempo y quién responde técnicamente. Un funcionario del municipio registra la
solicitud en nagomu y la aprueba. Durante la ejecución el municipio deja constancia de sus
visitas de verificación. Al terminar, el municipio recibe la obra y solo entonces queda
como ejecutada, con su valor equivalente descontado de la brecha. Lo mismo aplica si quien
interviene es una persona natural, una fundación o un voluntariado.

**Why this priority**: Sin autorización previa y vigilancia, el sistema estaría celebrando
obras que nadie revisó. Una escuela mal reconstruida por un tercero de buena fe es peor que
una escuela sin reconstruir. Va de última porque supone que ya existe todo lo anterior.

**Independent Test**: Se registra una solicitud de intervención de un tercero sobre una obra
existente, se aprueba, se dejan verificaciones y se recibe; se verifica que la brecha solo
cambie a ejecutada al momento del recibo.

**Acceptance Scenarios**:

1. **Given** una obra del inventario, **When** el municipio registra la solicitud de una
   empresa con alcance, plazo y responsable técnico, **Then** la intervención queda en
   estado Solicitada y aún no afecta la brecha.
2. **Given** una solicitud aprobada, **When** el municipio registra una verificación de
   calidad, **Then** queda constancia con fecha, responsable y resultado.
3. **Given** una intervención en ejecución, **When** el municipio la recibe a satisfacción,
   **Then** su valor equivalente pasa a contar como ejecutado y la brecha se actualiza.
4. **Given** una intervención con verificación desfavorable, **When** el municipio la
   suspende, **Then** debe registrarse el motivo y la brecha vuelve a reflejar lo pendiente.
5. **Given** una solicitud de intervención, **When** la registra un funcionario de la
   gobernación sobre una obra de Buga, **Then** el sistema se lo impide: solo el municipio
   dueño autoriza intervenciones sobre sus obras.

---

### Edge Cases

- **Obra sin estudio**: nunca muestra brecha ni plazos, solo prioridad y estado.
- **Aportes que superan el costo**: la brecha se muestra en cero y se señala el excedente;
  no se muestran plazos negativos.
- **Capacidad fiscal en cero, ausente o vencida**: no se calculan plazos; se indica que
  falta el dato y quién debe reportarlo, sin bloquear el registro de la obra.
- **Costo actualizado con aportes ya inscritos**: la brecha se recalcula; los aportes
  previos no se alteran y el costo anterior queda en el historial.
- **Capacidad fiscal menor que la brecha de la primera obra de la cola**: todas las demás
  quedan sin año estimado de inicio, y se indica explícitamente que la cola está bloqueada.
- **Obra desplazada indefinidamente**: cuando una obra queda fuera del horizonte de
  proyección se muestra como "sin financiación previsible", no con un número de años
  engañosamente grande.
- **Empate exacto de puntaje dentro de un nivel**: se desempata por criterio determinista
  y publicado, no aleatorio, para que la lista sea reproducible.
- **Personas beneficiadas desconocidas o cero**: la obra conserva su nivel pero se marca
  como "puntaje incompleto" y se ubica al final de su nivel, no se excluye de la lista.
- **NBI no disponible para el municipio**: el factor de vulnerabilidad se toma como
  neutro y la obra se marca para completar el dato.
- **Aporte comprometido que nunca se gira**: se distingue visualmente de lo girado; la
  brecha muestra por separado cuánto está comprometido y cuánto efectivamente disponible.
- **Obra entregada con brecha remanente**: se permite y se señala, porque ocurre cuando la
  obra se ejecuta por menos de lo costeado o se ajusta el alcance.
- **Intento de edición fuera del ámbito**: se rechaza y queda registrado con actor y fecha.
- **Intervención suspendida por mala calidad**: su valor equivalente deja de contar como
  ejecutado y la brecha vuelve a abrirse; el historial conserva el motivo de la suspensión.
- **Intervención aprobada que nunca se ejecuta**: al vencerse el plazo comprometido se
  señala como vencida, sin cerrarla automáticamente, porque la decisión es del municipio.
- **Tercero que ejecuta sin autorización previa**: el municipio puede registrar la
  intervención después de ocurrida, quedando marcada como no autorizada previamente.

## Requirements *(mandatory)*

### Functional Requirements

**Inventario y prioridad**

- **FR-001**: El sistema MUST permitir a un funcionario municipal registrar un ítem de
  inventario afectado, con nombre, ubicación descriptiva, tipo, personas beneficiadas,
  meses fuera de servicio y descripción del daño.
- **FR-002**: El sistema MUST asignar a cada ítem uno de seis niveles de prioridad, de
  mayor a menor: (0) vida y subsistencia, (1) riesgo activo, (2) servicios esenciales,
  (3) educación, (4) productivo, (5) cultural y recreativo. En esta versión no se registran
  ítems en el nivel 0: la atención humanitaria recurrente se maneja en una funcionalidad
  aparte que comparte esta misma escala.
- **FR-003**: El sistema MUST ordenar siempre por nivel antes que por puntaje, de modo que
  ningún ítem de un nivel inferior pueda superar a uno de nivel superior.
- **FR-004**: El sistema MUST calcular el puntaje interno de cada nivel mediante una
  fórmula pública que combine personas beneficiadas, vulnerabilidad de la población del
  municipio y tiempo fuera de servicio.
- **FR-005**: El sistema MUST mostrar, en el detalle de cada obra, el valor de cada factor
  usado y el puntaje resultante, no solo la posición final.
- **FR-006**: El sistema MUST asociar cada nivel de prioridad a uno o más Objetivos de
  Desarrollo Sostenible y mostrarlos en la obra.
- **FR-007**: El sistema MUST NOT determinar la posición de una obra mediante criterios no
  publicados ni mediante modelos cuya salida no pueda reproducirse a partir de los datos
  visibles.
- **FR-008**: Los pesos de la fórmula MUST ser configurables por administración y su valor
  vigente MUST ser consultable por cualquier usuario.

**Ciclo de vida y costeo**

- **FR-009**: El sistema MUST manejar los estados Identificado, En estudios, Costeado, En
  ejecución y Entregada, y MUST rechazar transiciones que salten etapas.
- **FR-010**: El sistema MUST NOT exponer costo de obra, brecha ni plazos mientras la obra
  no haya alcanzado el estado Costeado.
- **FR-011**: El sistema MUST registrar el costo de los estudios por separado del costo de
  la obra.
- **FR-012**: El sistema MUST exigir fecha y referencia del documento de respaldo al
  registrar el costo entregado por un estudio.
- **FR-013**: El sistema MUST conservar el historial completo de costos cuando un estudio
  posterior actualice el valor.

**Aportes y cofinanciación**

- **FR-014**: El sistema MUST permitir que municipio, gobernación, nación y cooperación
  internacional registren aportes a una misma obra.
- **FR-015**: Cada aporte MUST registrar monto, fecha, entidad aportante y estado
  (comprometido, girado o ejecutado).
- **FR-016**: Cada aporte MUST declarar de qué **fondo** proviene, escogido de un catálogo
  de fuentes reales con su ámbito, su administrador y su norma. El sistema MUST ofrecer a
  cada entidad únicamente los fondos de su propio ámbito más los externos: un municipio no
  puede declarar que gasta del fondo nacional.
- **FR-017**: Cuando el fondo escogido exija declarar el proyecto aplazado —caso de los
  traslados presupuestales— el sistema MUST exigir la identificación del proyecto del plan
  de desarrollo que se sacrificó. La exigencia viaja con el fondo, no repartida en el
  código.
- **FR-047**: El catálogo de fondos MUST ser consultable por cualquier usuario, con su
  ámbito, quién lo administra y la norma que lo crea.
- **FR-018**: El sistema MUST calcular la brecha como costo de la obra menos aportes, y
  MUST distinguir lo comprometido de lo efectivamente girado.

**Capacidad fiscal y escenarios de plazo**

- **FR-019**: El sistema MUST permitir registrar manualmente la capacidad fiscal anual del
  municipio, con fecha del reporte y nombre de quien lo reportó.
- **FR-020**: El sistema MUST calcular los plazos repartiendo la capacidad fiscal anual del
  municipio entre sus obras en orden de prioridad: la obra mejor ubicada consume capacidad
  hasta cerrar su brecha, y solo el remanente pasa a la siguiente. MUST presentarlos como
  estimación, no como compromiso.
- **FR-021**: El sistema MUST mostrar escenarios comparativos de plazo: municipio solo,
  municipio con gobernación, y municipio con gobernación y nación. Cada escenario MUST
  recalcular la cola completa, de modo que un aporte a una obra prioritaria adelante también
  a las que vienen detrás.
- **FR-044**: El sistema MUST mostrar, para cada obra, su posición en la cola de
  financiación, el año estimado en que empezaría a recibir recursos propios y el año
  estimado de cierre de su brecha.
- **FR-045**: Cuando una obra nueva de mayor prioridad desplace a otras, el sistema MUST
  registrar el desplazamiento y MUST poder explicar en el detalle de una obra cuántos años
  se retrasó y por cuál obra.
- **FR-046**: Las obras ya cubiertas por aportes o intervenciones de terceros MUST NOT
  consumir capacidad fiscal futura en el cálculo de la cola.
- **FR-022**: El sistema MUST advertir cuando la capacidad fiscal usada en un cálculo tenga
  más de doce meses de antigüedad, indicando su fecha.
- **FR-023**: El sistema MUST NOT calcular plazos cuando falte la capacidad fiscal o sea
  cero, y MUST indicar qué dato falta.

**Permisos**

- **FR-024**: Cualquier usuario autenticado MUST poder consultar cualquier obra de
  cualquier municipio.
- **FR-025**: Solo el municipio dueño MUST poder editar los datos de una obra.
- **FR-026**: Cada entidad MUST poder editar únicamente los aportes que ella misma
  inscribió; ninguna entidad MUST poder inscribir ni modificar aportes de otra.
- **FR-027**: El sistema MUST resolver el ámbito territorial del usuario en el servidor en
  cada solicitud, y MUST NOT depender de la interfaz para restringir el acceso.

**Actores no estatales**

- **FR-032**: El sistema MUST permitir que actores no estatales participen en una obra:
  sector privado, fundaciones empresariales, voluntariados, organizaciones no
  gubernamentales y cooperación internacional.
- **FR-033**: El sistema MUST distinguir dos formas de participación: aporte financiero
  (dinero que entra a la financiación de la obra) e intervención directa (el actor ejecuta
  una parte de la obra por su cuenta).
- **FR-034**: Toda intervención directa MUST registrar el alcance ejecutado y su valor
  equivalente estimado, de modo que la brecha de la obra refleje lo que ya no hay que
  financiar.
- **FR-035**: El sistema MUST distinguir el actor que aporta del funcionario que inscribió
  el registro, cuando el actor no tiene usuario propio en el sistema.
- **FR-036**: Una obra MUST poder alcanzar el estado Entregada con brecha cero por
  intervención de un tercero, sin que ninguna entidad pública haya aportado recursos, y
  MUST permanecer visible en el inventario con ese hecho registrado.
- **FR-037**: Un actor MUST poder ser persona jurídica o persona natural. El sistema MUST
  registrar únicamente los datos de identificación y contacto indispensables para el
  trámite.

**Autorización y vigilancia de intervenciones**

- **FR-038**: Toda intervención directa MUST originarse en una solicitud que declare
  alcance, plazo comprometido, responsable técnico y valor equivalente estimado.
- **FR-039**: El sistema MUST manejar los estados Solicitada, Aprobada, En ejecución,
  Recibida, Rechazada y Suspendida, y MUST exigir motivo registrado en los dos últimos.
- **FR-040**: Solo el municipio dueño de la obra MUST poder aprobar, suspender o recibir
  una intervención sobre ella, cualquiera sea el actor que la ejecuta.
- **FR-041**: El sistema MUST permitir registrar verificaciones de calidad durante la
  ejecución, con fecha, funcionario responsable y resultado.
- **FR-042**: Una intervención MUST contar como comprometida al ser aprobada y como
  ejecutada únicamente cuando el municipio la reciba a satisfacción.
- **FR-043**: Las intervenciones y aportes acordados entre dos entidades públicas
  (municipio–gobernación, municipio–nación, nación–gobernación) MUST seguir el mismo
  trámite de autorización que las de actores privados.

**Trazabilidad**

- **FR-028**: El sistema MUST registrar en forma append-only toda creación de obra, cambio
  de estado, actualización de costo y movimiento de aporte, con actor, entidad, nivel
  territorial y marca de tiempo del servidor.
- **FR-029**: El sistema MUST NOT permitir borrar ni sobrescribir un registro histórico;
  las correcciones MUST crearse como registros nuevos que referencian al corregido.
- **FR-030**: El sistema MUST permitir reconstruir el estado de cualquier obra a una fecha
  pasada a partir de sus registros.
- **FR-031**: El sistema MUST registrar los intentos de acción rechazados por permisos.

### Key Entities

- **Entidad territorial**: municipio, gobernación o nación. Tiene nombre, nivel y, en el
  caso del municipio, el departamento al que pertenece y su índice de vulnerabilidad.
- **Funcionario**: usuario que actúa siempre en nombre de una entidad territorial y hereda
  de ella su ámbito de edición.
- **Ítem de inventario**: edificación, zona o necesidad afectada. Pertenece a un municipio.
  Concentra los datos que alimentan la prioridad.
- **Obra (frente de intervención)**: lo que hay que hacer sobre un ítem. Tiene estado,
  costo de estudios, costo de obra, ODS asociados y prioridad calculada.
- **Estudio**: entrega el costo de la obra. Tiene fecha, responsable, valor entregado y
  documento de respaldo.
- **Actor**: quien participa en una obra. Puede ser una entidad territorial, un cooperante
  internacional, una empresa, una fundación, una ONG, un voluntariado o una persona
  natural. Solo las entidades territoriales tienen usuarios propios en esta versión.
- **Solicitud de intervención**: trámite mediante el cual un actor pide autorización para
  ejecutar una obra por su cuenta. Declara alcance, plazo, responsable técnico y valor
  equivalente. El municipio dueño la aprueba, la rechaza o la suspende.
- **Verificación de calidad**: constancia de una revisión hecha por el municipio durante la
  ejecución de una intervención, con fecha, funcionario y resultado.
- **Fondo**: fuente de financiación real, con ámbito (municipal, departamental, nacional o
  externo), naturaleza, entidad administradora y norma que lo crea. El catálogo y sus
  fuentes están en [instituciones-y-fondos.md](./instituciones-y-fondos.md).
- **Aporte**: dinero que un actor inscribe sobre una obra. Tiene monto, fecha, estado,
  fondo de origen y, cuando el fondo lo exige, el proyecto aplazado.
- **Intervención directa**: trabajo que un actor ejecuta por su cuenta sobre una obra, con
  alcance descrito y valor equivalente estimado. Reduce la brecha sin pasar por caja.
- **Capacidad fiscal**: monto anual disponible reportado por un municipio, con fecha y
  responsable del reporte. Se conserva la serie histórica.
- **Registro de auditoría**: asiento inmutable de cada hecho ocurrido en el sistema.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un funcionario sin entrenamiento previo registra una obra completa en menos
  de cinco minutos.
- **SC-002**: El 100% de las obras muestra los factores que produjeron su posición, de modo
  que un tercero pueda recalcular el orden a mano.
- **SC-003**: Un funcionario departamental identifica en menos de dos minutos las cinco
  obras donde su aporte produce la mayor reducción de plazo.
- **SC-004**: El 100% de los aportes registrados declara su origen, y los de traslado
  presupuestal identifican el proyecto aplazado.
- **SC-005**: Ninguna obra sin estudio muestra cifras de brecha o plazo en ninguna pantalla.
- **SC-006**: Cero casos de una entidad modificando datos de otra, verificado por auditoría
  sobre el registro de intentos rechazados.
- **SC-007**: El estado de cualquier obra puede reconstruirse a cualquier fecha pasada sin
  ambigüedad.
- **SC-008**: La lista priorizada de un departamento con 500 obras se muestra completa en
  menos de tres segundos sobre una conexión móvil lenta.
- **SC-009**: Al menos el 80% de las obras registradas en el piloto alcanza el estado
  Costeado o superior en los primeros seis meses.
- **SC-010**: El 100% de las obras desplazadas en la cola puede explicar, sin intervención
  técnica, cuántos años se retrasó y por cuál obra de mayor prioridad.
- **SC-011**: Ninguna intervención de un tercero figura como ejecutada sin al menos un
  registro de recibo por parte del municipio dueño.

## Assumptions

- Las entidades territoriales y sus funcionarios son cargados previamente por
  administración; no hay autoregistro de usuarios.
- Los actores sin usuario propio (empresas, fundaciones, voluntariados, personas naturales,
  cooperantes) coordinan directamente con el municipio dueño de la obra, y es un funcionario
  de ese municipio quien inscribe la solicitud, el aporte o la intervención. El sistema
  distingue siempre el actor del funcionario que registró. No hay portal de autoservicio
  para terceros en esta versión.
- De una persona natural se registra solo nombre y un dato de contacto. No se capturan
  documentos de identidad ni información adicional, conforme al principio de mínimo de datos
  personales de la constitución del proyecto.
- Los montos se expresan en pesos colombianos corrientes, sin ajuste por inflación ni valor
  del dinero en el tiempo. Los plazos se proyectan año a año repartiendo la capacidad fiscal
  entre las obras según su prioridad, y se presentan como orden de magnitud, no como
  cronograma.
- La proyección de la cola supone que la capacidad fiscal reportada se mantiene constante en
  los años siguientes y que el municipio destina toda esa capacidad a obras de
  reconstrucción. Ambos supuestos se muestran junto al resultado.
- La atención humanitaria recurrente (alimentación, agua potable, alojamiento) queda fuera de
  esta versión y se aborda en una funcionalidad posterior con ciclo de vida propio, junto con
  el mapa de cobertura y la detección de ayudas duplicadas. Comparte la misma escala de
  prioridad y el mismo registro de actores.
- El costo no participa en el puntaje de prioridad, porque la mayoría de las obras aún no
  lo tienen y su inclusión haría inestable el ordenamiento. Cuando existe, se muestra el
  costo por beneficiado como dato informativo y como criterio de desempate.
- El índice de vulnerabilidad del municipio se carga manualmente por administración a
  partir de fuentes públicas; no hay integración automática.
- Un ítem de inventario pertenece a un solo municipio. Las obras que cruzan varios
  municipios quedan fuera de esta versión.
- La lista priorizada de la gobernación mezcla obras de municipios distintos en un único
  ordenamiento, con filtro opcional por municipio.
- Los ODS se asocian al nivel de prioridad, no se capturan obra por obra.
- Fuera de alcance en esta versión: vista pública para ciudadanía y cooperantes, mapa
  geográfico, censo de damnificados en terreno, canal por WhatsApp o SMS, operación
  offline con sincronización, integración con SIIF, CHIP o SECOP, módulo estructurado del
  plan de desarrollo, modelo de amortización de deuda, y clasificación asistida por IA.
- El piloto abarca un departamento con sus municipios y el nivel nacional. Referencia:
  Valle del Cauca con Buga, y Chocó con Sipí y San José del Palmar.

## Clarifications

- **Capacidad fiscal compartida** (2026-08-16): la capacidad fiscal anual se reparte entre
  las obras del municipio en orden de prioridad. La primera consume hasta cerrar su brecha y
  solo el remanente pasa a la siguiente. Un aporte externo a una obra prioritaria adelanta
  también a las que vienen detrás.
- **Actores sin usuario propio** (2026-08-16): coordinan con el municipio dueño de la obra,
  que inscribe la solicitud, el aporte o la intervención. El sistema distingue siempre el
  actor del funcionario que registró.
- **Nivel 0 y atención humanitaria** (2026-08-16): queda fuera de esta versión. Se aborda en
  una funcionalidad posterior con ciclo de vida propio, junto con el mapa de cobertura y la
  detección de ayudas duplicadas.
