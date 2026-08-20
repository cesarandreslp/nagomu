# Feature Specification: Caracterización integral de afectaciones

**Feature Branch**: `007-caracterizacion-afectaciones`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Caracterizar TODO lo afectado (vivienda, comercio, estructura pública, agropecuario), con geografía sub-municipal, caracterización integral del hogar (familias + necesidad de salud categorizada) y un censo público de transparencia. Dos capas: público (no identifica a nadie) y reservado. Enmienda 4.0.0."

## Contexto y encuadre constitucional

Tras una emergencia el municipio debe caracterizar **todo lo afectado**, no solo viviendas:
comercios, estructuras públicas y el mundo agropecuario (cultivos, maquinaria, bodegas, corrales,
animales, estanques, y hasta el **alimento** de esos animales, que también se pierde). Y debe
caracterizar a las personas de forma **integral** — cuántas familias viven en una vivienda, cómo se
componen, y quién tiene una **enfermedad de base que por el sismo no se está atendiendo** — para
poder actuar. Todo esto respetando la ley de protección de datos.

La **enmienda constitucional 4.0.0** fija dos reglas que gobiernan esta feature:

- **Clasificación público / reservado (Principio IV)**: es **público** solo lo que NO identifica a
  una persona — cantidad, tipo de afectación, **punto geográfico** de un bien y **lugar general**
  (corregimiento/vereda/municipio). Es **reservado** el resto — dueño, **dirección exacta**,
  detalle. La **dirección textual NUNCA es pública**; en público van el punto y el lugar general.
  Las fotos se guardan **sin metadatos** (GPS incluido); si una foto no trae geolocalización, se
  usa el lugar general.
- **Necesidad de salud categorizada (Principio IV)**: se permite un **indicador de lista cerrada**
  (condición crónica, diálisis, embarazo de riesgo, discapacidad, dependencia de oxígeno) con la
  **única** finalidad de **referir** a la atención en salud, bajo autorización explícita y máximos
  controles. **Nunca** historia clínica, diagnóstico ni detalle médico.

Y los principios de siempre: I (auditoría append-only), II (el detalle reservado acotado al
municipio dueño; hacia arriba solo agregados), III (captura server-rendered usable sin JavaScript,
con captura de campo rica como mejora progresiva).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Caracterizar cualquier bien afectado (Priority: P1)

Un funcionario del municipio registra un bien afectado de **cualquier tipo**: vivienda, comercio,
estructura pública, o agropecuario (cultivo, maquinaria, bodega, corral, animales, estanque,
alimento animal). Cada bien lleva su tipo/subtipo, el tipo de afectación, su estado cuando aplica
(habitable / reparable / a demoler para estructuras; perdido / parcial para cultivos y animales),
su **punto geográfico** y su **lugar general** (corregimiento/vereda). El dueño y la **dirección
exacta** quedan como **reservado**; el punto y el lugar general son públicos. Las fotos se guardan
sin metadatos.

**Why this priority**: Es el cimiento — generaliza el inventario a todo lo afectado y fija la
clasificación público/reservado que todo lo demás usa. Es el MVP.

**Independent Test**: Registrar bienes de varios tipos con y sin coordenada; verificar la
clasificación de estado, que la dirección no aparece en ninguna vista pública, que la foto se
guarda sin GPS, y que sin coordenada queda ubicado por lugar general.

**Acceptance Scenarios**:

1. **Given** un funcionario de municipio, **When** registra un bien (p. ej. un cultivo perdido con
   su punto y vereda), **Then** queda en el inventario de su municipio con tipo, afectación, estado
   y ubicación, y la acción se audita.
2. **Given** un bien con dirección exacta, **When** se ve en una vista **pública**, **Then** la
   dirección NO aparece; solo el punto y el lugar general.
3. **Given** una foto con GPS, **When** se sube, **Then** se guarda sin metadatos; el punto se toma
   de la geolocalización capturada, no del archivo.
4. **Given** un bien sin coordenada, **When** se registra, **Then** queda ubicado por su lugar
   general (corregimiento/vereda), nunca por dirección.
5. **Given** una estructura pública afectada, **When** se caracteriza, **Then** puede convertirse en
   una **obra** con su cola de priorización (spec 001); un cultivo o animal perdido NO es obra, es
   solo caracterización.
6. **Given** JavaScript deshabilitado sobre 3G, **When** se registra un bien, **Then** funciona por
   formulario; la foto y la geolocalización son mejora progresiva.

---

### User Story 2 - Caracterización integral del hogar (Priority: P2)

Sobre una vivienda afectada, el funcionario caracteriza a quienes la habitan: **cuántas familias**
viven ahí y cómo se compone cada una (conteos: total, niñez, adultos mayores, personas con
discapacidad), y registra un **indicador categorizado de necesidad de salud** para las personas con
enfermedades de base sin atender — con autorización explícita, solo para **referir** a salud. Todo
esto es **reservado** y acotado al municipio dueño; hacia arriba solo suben conteos.

**Why this priority**: Es lo que permite actuar sobre las personas (referir salud, dimensionar
ayuda), pero es lo más sensible y se apoya en el registro de damnificados (spec 006). Va después del
cimiento de bienes.

**Independent Test**: Sobre una vivienda, registrar dos familias con su composición; registrar una
necesidad de salud categorizada con y sin autorización; verificar que sin autorización no se guarda,
que no hay diagnóstico ni detalle clínico, y que otro municipio no ve nada.

**Acceptance Scenarios**:

1. **Given** una vivienda afectada, **When** se registran las familias que la habitan con su
   composición, **Then** quedan asociadas a esa vivienda, en el registro del municipio.
2. **Given** una persona con condición crónica sin atender, **When** se registra su necesidad de
   salud **con** autorización, **Then** se guarda el indicador **categorizado** (nunca el
   diagnóstico) para referir; **sin** autorización, **Then** no se guarda.
3. **Given** el registro de salud, **When** se inspecciona, **Then** solo hay categorías de una
   lista cerrada; ninguna historia clínica ni detalle médico.
4. **Given** un funcionario de otro municipio o nivel, **When** intenta ver el detalle del hogar,
   **Then** se le niega; solo existen agregados hacia arriba (Principio II).

---

### User Story 3 - Censo público de transparencia (Priority: P3)

Un ciudadano o veedor, **sin sesión**, consulta el censo público de afectaciones de un territorio:
cantidades por tipo de bien, tipo de afectación, los puntos en el mapa y el lugar general — nunca
direcciones ni personas. Alimenta y extiende la landing pública (spec 004) y el mapa (spec 002).

**Why this priority**: Es la cara de transparencia del censo; depende de que exista la
caracterización (US1) y no expone nada personal. Va al final.

**Independent Test**: Sin sesión, ver el censo de un municipio; verificar que muestra cantidades,
tipos, puntos y lugar general, y que no aparece ninguna dirección ni dato de persona.

**Acceptance Scenarios**:

1. **Given** un visitante sin sesión, **When** abre el censo público de un territorio, **Then** ve
   cantidades por tipo de bien y afectación, los puntos en el mapa y el lugar general.
2. **Given** el censo público, **When** se inspecciona, **Then** no hay ninguna dirección, nombre ni
   dato de una persona.
3. **Given** un bien sin coordenada, **When** se ve en el censo, **Then** aparece contado por su
   lugar general, no como punto.

---

### Edge Cases

- **Bien que no es obra**: un cultivo o un animal perdido se caracteriza pero NO entra a la cola de
  cofinanciación (no es una obra a reconstruir); una estructura pública sí puede volverse obra.
- **Foto sin GPS**: se acepta; el bien se ubica por lugar general. La foto siempre se guarda sin
  metadatos, tenga o no GPS.
- **Dirección exacta**: se puede registrar (reservado), pero NUNCA se publica ni sube de nivel.
- **Necesidad de salud sin autorización**: no se guarda el indicador; el hogar se caracteriza sin él.
- **Vivienda con varias familias**: se registran todas; los conteos suman por vivienda y por
  territorio.
- **Corregimiento/vereda faltante**: si el territorio no tiene la división cargada, se ubica al
  menos por municipio; nunca por dirección en lo público.
- **Hábeas data**: aplica igual que en spec 006 — el titular puede rectificar o suprimir su dato
  personal; la supresión deja constancia del hecho sin conservar lo borrado.

## Requirements *(mandatory)*

### Functional Requirements

**Bien afectado generalizado y clasificación (US1)**

- **FR-001**: El sistema MUST permitir registrar bienes afectados de tipo vivienda, comercio,
  estructura pública y agropecuario (subtipos: cultivo, maquinaria, bodega, corral, animales,
  estanque, alimento animal), cada uno con tipo/subtipo, tipo de afectación y estado cuando aplica
  (habitable/reparable/a demoler; perdido/parcial).
- **FR-002**: El sistema MUST clasificar cada dato como público o reservado: **público** = cantidad,
  tipo de afectación, punto geográfico y lugar general; **reservado** = dueño, dirección exacta,
  detalle. La dirección textual MUST NOT aparecer en ninguna vista pública ni subir de nivel.
- **FR-003**: El sistema MUST guardar las fotografías **sin metadatos** (GPS incluido); la
  geolocalización del bien se toma de la captura, no del archivo.
- **FR-004**: Un bien sin coordenada MUST poder ubicarse por su lugar general (corregimiento/
  vereda/municipio).
- **FR-005**: Una estructura pública afectada MUST poder asociarse a una obra (spec 001) con su cola
  de priorización; un bien agropecuario perdido MUST NOT entrar a esa cola (es caracterización, no
  obra).

**Geografía sub-municipal (US1)**

- **FR-006**: El sistema MUST modelar corregimiento y vereda por debajo del municipio, y usarlos
  como lugar general público y para ubicar cuando no hay coordenada.

**Caracterización del hogar (US2)**

- **FR-007**: El sistema MUST permitir registrar cuántas familias habitan una vivienda y la
  composición de cada una como conteos (total, niñez, adultos mayores, personas con discapacidad).
- **FR-008**: El sistema MUST permitir registrar un indicador **categorizado** de necesidad de salud
  (lista cerrada), **solo con autorización explícita de tratamiento**, con la única finalidad de
  referir a salud. MUST NOT almacenar historia clínica, diagnóstico ni detalle médico.
- **FR-009**: El detalle del hogar (familias, salud) MUST estar acotado al municipio dueño
  (Principio II); hacia arriba solo suben conteos agregados.

**Censo público (US3)**

- **FR-010**: El sistema MUST ofrecer un censo público (sin sesión) que muestre únicamente lo
  público (cantidades por tipo, tipo de afectación, puntos y lugar general) por territorio.
- **FR-011**: El censo público MUST NOT exponer ninguna dirección, nombre ni dato de una persona.

**Trazabilidad y derechos**

- **FR-012**: Cada registro, edición y supresión de caracterización MUST quedar en la auditoría
  append-only, sin datos personales en el asiento.
- **FR-013**: El titular MUST poder ejercer hábeas data (rectificar/suprimir) sobre su dato
  personal, como en spec 006.

### Key Entities *(include if feature involves data)*

- **BienAfectado**: generaliza el inventario a todo lo afectado. Tipo/subtipo, tipo de afectación,
  estado, punto geográfico, lugar general (corregimiento/vereda), dirección (reservada), dueño
  (reservado), fotos sin metadatos. Una estructura pública puede vincularse a una `Obra` (spec 001);
  un bien agropecuario no.
- **DivisiónTerritorial (corregimiento/vereda)**: geografía sub-municipal, bajo `EntidadTerritorial`
  municipio. Es el lugar general público.
- **Familia** (en una vivienda): conteos de composición; varias por vivienda.
- **NecesidadSalud** (categorizada): indicador de lista cerrada por persona/familia, solo con
  autorización, para referir. Reservado.
- Reutiliza: `ItemInventario`/inmueble y `Obra` (spec 001/002), el registro de damnificados y su
  `AutorizacionTratamiento` (spec 006), `OfertaInstitucional`, el mapa (spec 002), el tablero
  (spec 005) y la landing (spec 004).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un municipio puede caracterizar bienes de los cuatro tipos (vivienda, comercio,
  pública, agropecuario) y verlos en un solo inventario acotado a su territorio.
- **SC-002**: Ninguna vista pública (censo, mapa, landing) expone una dirección exacta, un nombre ni
  un dato de persona (verificable por inspección).
- **SC-003**: El 100% de las fotografías se almacena sin metadatos GPS.
- **SC-004**: El 100% de los indicadores de salud tiene su autorización asociada y es de la lista
  cerrada; no existe ningún diagnóstico ni detalle clínico.
- **SC-005**: Un bien sin coordenada queda ubicado por lugar general y aparece contado en el censo
  público sin punto.
- **SC-006**: Gobernación y nación ven solo agregados de la caracterización; ningún detalle
  reservado sube de nivel.
- **SC-007**: El censo público carga sin JavaScript sobre una conexión lenta.

## Assumptions

- **No todo bien afectado es una obra**: la reconstrucción (obras + cofinanciación, spec 001) aplica
  a lo público reconstruible; la caracterización cubre además lo privado/productivo, que se
  dimensiona pero no entra a la cola.
- La caracterización del hogar **extiende** el registro de damnificados (spec 006) y reutiliza su
  `AutorizacionTratamiento`; no duplica el modelo.
- El lugar general se apoya en la división político-administrativa (corregimientos/veredas); su
  carga inicial por municipio es un dato de referencia, no parte de esta feature capturarla toda.
- La necesidad de salud es un indicador de **referencia**, no de gestión clínica; la atención la
  presta el sistema de salud (EPS/ADRES), nagomu solo refiere.
- El censo público muestra el estado actual; su detalle histórico no es parte de esta versión.
- La captura de campo rica (foto sin metadatos, geolocalización) se apoya en la enmienda 2.1.0.
