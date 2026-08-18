# Feature Specification: Tablero territorial por nivel

**Feature Branch**: `005-tablero-territorial`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Tres vistas de inicio diferenciadas (Nación, Departamento, Municipio), cada una acotada a su territorio, con tarjetas de impacto, la lista de construcciones (estado + financiación/cofinanciación) y el mapa. Estados con términos ciudadanos, mismo modelo. Reutiliza lo existente; sin entidades nuevas."

## Contexto

La landing pública (spec 004) piensa como Nación: muestra el agregado del país. Pero un
funcionario de Buga, al entrar, no quiere el país — quiere **su** territorio: qué construcciones
hay que intervenir, en qué estado están, y si tienen plata. Y eso es distinto para cada nivel.

Esta feature convierte el **inicio autenticado** en un tablero acotado al ámbito del usuario, que
reúne en un solo lugar lo que hoy está disperso entre `/obras`, `/mapa` y el consolidado. **No
crea entidades ni cambia el modelo**: reutiliza impacto (spec 004), obras/cola/brecha (spec 001) y
el mapa (spec 002).

**Encuadre constitucional:**
- **Principio II**: cada nivel ve y filtra **solo su ámbito**, resuelto en el servidor. Buga ve
  Buga; la gobernación, los municipios de su departamento; la nación, todo.
- **Principio III**: las tres vistas son server-rendered y usables sin JavaScript sobre 3G; el
  mapa sigue siendo un complemento con su lista esencial.
- **Principio IV**: todo es agregado o de infraestructura/obras; ningún dato personal de afectados.

**Etiquetas ciudadanas** (solo presentación; el enum `EstadoObra` no cambia):

| Estado del modelo | Etiqueta ciudadana |
|---|---|
| `IDENTIFICADO` | Impactado |
| `EN_ESTUDIOS` | En estudio |
| `COSTEADO` | Costeado |
| `EN_EJECUCION` | En intervención |
| `ENTREGADA` | Beneficiado |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El municipio ve su tablero (Buga) (Priority: P1)

Un funcionario del municipio entra y aterriza en el tablero de **su** municipio: tres tarjetas de
impacto de su territorio (fondos asignados, % de ejecución, alertas), la lista de sus
construcciones a intervenir con su estado en términos ciudadanos y su situación de financiación
(sin financiar / parcial / financiada, con la brecha restante) y quiénes cofinancian y cuánto, y
el mapa de sus lugares impactados y beneficiados coloreado por estado. No ve nada de otro
municipio.

**Why this priority**: Es el caso que motivó la feature y el más rico. Entrega valor completo a
quien más lo usa. Es el MVP.

**Independent Test**: Entrar como un municipio; verificar que el tablero muestra solo sus
construcciones, con estado ciudadano, financiación/cofinanciadores y su mapa; y que ninguna
construcción de otro municipio aparece.

**Acceptance Scenarios**:

1. **Given** un funcionario de municipio, **When** entra a su inicio, **Then** ve las tarjetas de
   impacto de su municipio, la lista de sus construcciones y el mapa de su territorio.
2. **Given** una construcción, **When** se ve en la lista, **Then** muestra su estado en término
   ciudadano (p. ej. "En intervención") y su situación de financiación.
3. **Given** una construcción con aportes de varias entidades, **When** se ve, **Then** lista los
   cofinanciadores y cuánto aporta cada uno, y la brecha restante.
4. **Given** una construcción sin ningún aporte, **When** se ve, **Then** aparece como "sin
   financiar".
5. **Given** un municipio distinto, **When** el funcionario mira su tablero, **Then** no ve ninguna
   construcción, aporte ni punto de mapa de otro municipio (Principio II).
6. **Given** JavaScript deshabilitado sobre 3G, **When** entra, **Then** las tarjetas, la lista y
   la lista esencial del mapa cargan completas y usables.

---

### User Story 2 - La gobernación ve su departamento (Priority: P2)

Un funcionario de la gobernación entra y ve el tablero de **su departamento**: el impacto agregado
del departamento, las construcciones de todos sus municipios (con el municipio al que pertenecen),
su estado y financiación, y el mapa de todo el departamento.

**Why this priority**: Da la lectura regional de coordinación. Reutiliza el mismo tablero del P1,
solo cambia el alcance a "los municipios de mi departamento".

**Independent Test**: Entrar como gobernación; verificar que ve las construcciones de sus
municipios (no de otro departamento), con la columna de municipio, y su mapa.

**Acceptance Scenarios**:

1. **Given** un funcionario de gobernación, **When** entra, **Then** ve el impacto agregado y las
   construcciones de los municipios de su departamento, cada una con su municipio.
2. **Given** un municipio de otro departamento, **When** la gobernación mira, **Then** no aparece.
3. **Given** el mapa, **When** se abre, **Then** muestra los puntos de todo el departamento.

---

### User Story 3 - La nación ve todo el país (Priority: P3)

Un funcionario de la nación entra y ve el tablero **nacional**: el impacto agregado del país y las
construcciones de todos los territorios, con su departamento y municipio, estado y financiación, y
el mapa nacional.

**Why this priority**: Es la vista más amplia y coincide en cifras con la landing pública, pero ya
autenticada y con el detalle de construcciones. Menor urgencia operativa que municipio/gobernación.

**Independent Test**: Entrar como nación; verificar que ve construcciones de todos los territorios
y el mapa nacional.

**Acceptance Scenarios**:

1. **Given** un funcionario de nación, **When** entra, **Then** ve el impacto y las construcciones
   de todo el país, con su territorio.
2. **Given** el mapa nacional, **When** se abre, **Then** muestra los puntos de todos los
   municipios con coordenada.

---

### Edge Cases

- **Territorio sin construcciones**: el tablero muestra las tarjetas en cero y un mensaje claro
  ("Aún no hay construcciones registradas"), no un vacío ambiguo.
- **Construcción sin costo (no costeada)**: su financiación se muestra como "pendiente de
  estudios" (no hay brecha sin costo), coherente con spec 001.
- **Construcción costeada sin aportes**: "sin financiar", con la brecha = costo completo.
- **Construcción con un solo aportante**: se muestra como financiada por una sola entidad (no
  "cofinanciada"); cofinanciada implica dos o más.
- **Sin coordenada**: la construcción aparece en la lista pero no en el mapa (como en spec 002).
- **Muchas construcciones**: la lista pagina (como ya hace `/obras`) para no romper Principio III.
- **JavaScript deshabilitado**: el mapa degrada a su lista esencial; el resto ya es server-side.

## Requirements *(mandatory)*

### Functional Requirements

**Tablero y alcance**

- **FR-001**: El inicio autenticado de un funcionario MUST ser un tablero acotado a su ámbito:
  municipio → su municipio; gobernación → los municipios de su departamento; nación → todo.
- **FR-002**: El tablero MUST reunir en una sola vista: tarjetas de impacto agregado del
  territorio, la lista de construcciones y el acceso al mapa del territorio.
- **FR-003**: El filtrado por ámbito MUST resolverse en el servidor; ningún nivel MUST poder ver
  construcciones, aportes ni puntos de mapa fuera de su ámbito (Principio II).

**Construcciones: estado y financiación**

- **FR-004**: Cada construcción MUST mostrar su estado con la etiqueta ciudadana (Impactado / En
  estudio / Costeado / En intervención / Beneficiado), manteniendo por debajo el estado real del
  modelo (sin cambiarlo).
- **FR-005**: Cada construcción MUST mostrar su situación de financiación: sin financiar / parcial
  / financiada, con la brecha restante cuando haya costo; "pendiente de estudios" cuando no lo hay.
- **FR-006**: Cada construcción MUST listar sus cofinanciadores (qué entidad aporta y cuánto) y
  distinguir "cofinanciada" (dos o más aportantes) de financiada por una sola entidad.

**Mapa y presentación**

- **FR-007**: El tablero MUST incluir el mapa del territorio (reutilizando la vista existente),
  coloreado por estado, con su lista esencial; sin coordenada, la construcción no se dibuja pero
  permanece en la lista.
- **FR-008**: Las tres vistas MUST ser server-rendered y usables sin JavaScript sobre 3G; el mapa
  sigue siendo complemento (Principio III).
- **FR-009**: En los niveles gobernación y nación, cada construcción MUST indicar a qué municipio
  (y departamento, en nación) pertenece.
- **FR-010**: Ninguna parte del tablero MUST exponer datos personales de personas afectadas
  (Principio IV).

### Key Entities *(include if feature involves data)*

No se introducen entidades nuevas. Se reutilizan: `ItemInventario`/`Obra` (construcciones y su
estado), `Aporte` (cofinanciadores y montos), el cálculo de brecha y cola (spec 001), el resumen de
impacto (spec 004) y las capas del mapa (spec 002). La etiqueta ciudadana de estado es una tabla de
presentación, no un dato almacenado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un funcionario de municipio ve, en su inicio, solo construcciones de su municipio;
  0 construcciones de otro municipio (verificable).
- **SC-002**: El 100% de las construcciones muestra su estado en término ciudadano y su situación
  de financiación (sin financiar / parcial / financiada, o pendiente de estudios).
- **SC-003**: Una construcción con dos o más aportantes se identifica como cofinanciada y lista a
  cada aportante con su monto; el 100% de las veces.
- **SC-004**: El tablero (tarjetas + lista + lista esencial del mapa) carga y es usable con
  JavaScript deshabilitado sobre una conexión lenta.
- **SC-005**: Ningún elemento del tablero expone datos personales de afectados (verificable por
  inspección).
- **SC-006**: Un funcionario ubica el estado y la financiación de una construcción de su territorio
  en menos de 30 segundos desde que entra.

## Assumptions

- El tablero **reemplaza** el inicio actual de cada nivel (municipio a `/obras`, gobernación/nación
  al consolidado), unificándolo; las páginas de detalle y edición existentes se conservan y se
  enlazan desde el tablero.
- Las etiquetas ciudadanas son solo de presentación; el enum `EstadoObra`, la cola de priorización
  y el spec 001 no se tocan (sin migración).
- "Cofinanciada" = dos o más entidades con aporte vigente sobre la misma obra. Un solo aportante es
  "financiada", no cofinanciada.
- La brecha y el estado de financiación se derivan del cálculo existente (spec 001); esta feature
  los presenta, no los recalcula distinto.
- Los "beneficiados" del mapa son las construcciones en estado Beneficiado (`ENTREGADA`); no se
  geolocaliza a personas (Principio IV).
- La barra lateral y el marco visual (spec 004) se reutilizan; el tablero es el contenido del
  inicio.
