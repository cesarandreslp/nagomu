# Feature Specification: Identidad visual, sistema de diseño y landing pública

**Feature Branch**: `004-sistema-de-diseno`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Identidad visual azul institucional de fiscalización; landing pública nueva; restyle de login y dashboards con barra lateral; tokens de color y gradación territorial. Gana la paleta azul escrita; manosunidas.org es referencia de estructura, no de color."

## Contexto

Hoy nagomu funciona pero no tiene identidad visual: acento verde heredado, navegación como una
línea de enlaces, y **no existe una página pública** — la app entra directo al login. Esta
feature le da una estética de **fiscalización técnica y neutral** en azul institucional, una
puerta pública, y una navegación de dashboard, sin sacrificar los principios que hacen que el
sistema sirva en una emergencia.

El detalle de la paleta y la estructura está en
[design-system.md](./design-system.md). Aquí se define **qué** debe lograr y **por qué**.

**Encuadre constitucional (no negociable):**
- **Principio III**: las vistas operativas críticas (inventario, mapa, reportes, voluntariados)
  siguen renderizando en el servidor y usables sin JavaScript de cliente sobre 3G en gama baja.
  La estética rica (carrusel, imágenes grandes, barra lateral con JS) solo cabe en el shell
  público y como mejora progresiva. No se introduce framework de UI; tipografía del sistema.
- **Principio IV**: ninguna tarjeta de impacto, buscador ni mapa expone datos personales; todo
  son agregados.
- **Principio V**: tokens CSS y componentes propios antes que dependencias.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El sistema se ve coherente en azul institucional (Priority: P1)

Un funcionario abre cualquier vista (login, inventario, obra, mapa, voluntariados) y encuentra
una identidad visual consistente: paleta azul institucional, texto de alto contraste, botones y
enlaces con el mismo criterio, y los niveles territoriales (Nación, Departamento, Municipio)
distinguidos por su gradación de azul en tablas, filtros y mapa. Nada de esto rompe la carga sin
JavaScript ni añade peso perceptible.

**Why this priority**: Es el cimiento —los tokens— y el que más valor entrega de inmediato con el
menor riesgo: es sobre todo CSS. Sin él, la landing y el sidebar no tienen de dónde sacar el
lenguaje visual. Es el MVP.

**Independent Test**: Recorrer login y las vistas operativas; verificar paleta azul consistente,
contraste AA, gradación territorial visible, y que todo sigue cargando y siendo usable con
JavaScript deshabilitado.

**Acceptance Scenarios**:

1. **Given** cualquier vista del sistema, **When** se carga, **Then** usa la paleta azul definida
   (sin rastros del acento verde anterior) y el texto cumple contraste AA sobre su fondo.
2. **Given** una tabla, filtro o el mapa que muestra niveles territoriales, **When** se ven,
   **Then** Nación, Departamento y Municipio se distinguen por su gradación de azul.
3. **Given** cualquier vista operativa crítica con JavaScript deshabilitado, **When** se carga en
   una conexión lenta, **Then** su información esencial se muestra completa y usable.
4. **Given** el login, **When** se abre, **Then** presenta la tarjeta blanca con foco azul en los
   campos y botón azul, sobre fondo claro.

---

### User Story 2 - Una puerta pública que explica y da confianza (Priority: P2)

Un ciudadano o veedor llega a la raíz del sitio sin sesión y encuentra una landing institucional:
navbar con el logo y un botón "Ingresar a la Plataforma"; un hero con el propósito de
fiscalización; un buscador territorial en cascada (Nación → Departamento → Municipio); tres
tarjetas de resumen de impacto **agregado** (total de fondos asignados, porcentaje de ejecución
con barra, alertas de retraso en ámbar); y un footer con enlaces legales y un canal de denuncia.
Todo cargando en el servidor, sin depender de JavaScript.

**Why this priority**: Es la cara pública y el vehículo de transparencia, pero se apoya en el
lenguaje visual del P1 y es funcionalidad nueva de mayor alcance. Va después del cimiento.

**Independent Test**: Sin sesión, abrir la raíz; verificar navbar, hero, buscador en cascada
funcional por envío de formulario, tres tarjetas de impacto con cifras agregadas, y footer;
confirmar que ningún dato mostrado identifica a una persona.

**Acceptance Scenarios**:

1. **Given** un visitante sin sesión, **When** abre la raíz, **Then** ve la landing (no el login),
   con navbar, hero, buscador territorial, tarjetas de impacto y footer.
2. **Given** el buscador territorial, **When** elige Nación → Departamento → Municipio y envía,
   **Then** el resumen de impacto se acota al territorio elegido, mediante envío de formulario
   (funciona sin JavaScript).
3. **Given** las tarjetas de impacto, **When** se inspeccionan, **Then** muestran solo agregados
   (fondos, % de ejecución, conteo de alertas) y ningún dato personal.
4. **Given** el botón "Ingresar a la Plataforma", **When** se pulsa, **Then** lleva al login.
5. **Given** la landing con JavaScript deshabilitado, **When** se carga, **Then** todo su
   contenido esencial y el buscador siguen funcionando.

---

### User Story 3 - Navegación de dashboard con barra lateral (Priority: P3)

Un analista dentro de la plataforma navega entre secciones (inventario, mapa, fondos, oferta,
capacidad fiscal, voluntariados) mediante una barra lateral técnica en gris oscuro, con el
elemento activo destacado, en lugar de la línea de enlaces actual. El contenido se ve sobre un
fondo neutro claro con tarjetas blancas.

**Why this priority**: Mejora la orientación en vistas densas, pero es la de menor urgencia: la
navegación actual funciona. Va al final y como mejora progresiva para no comprometer Principio III.

**Independent Test**: Entrar como funcionario; verificar la barra lateral con la sección activa
resaltada, que todos los enlaces existentes siguen alcanzables, y que la navegación esencial
funciona sin JavaScript (la barra es una lista de enlaces, no un componente que dependa de JS).

**Acceptance Scenarios**:

1. **Given** una vista operativa, **When** se carga, **Then** presenta la barra lateral con las
   secciones y el ítem actual resaltado en azul claro.
2. **Given** la barra lateral, **When** se navega con JavaScript deshabilitado, **Then** cada
   sección se alcanza por su enlace (es navegación server-side, no un menú dependiente de JS).
3. **Given** un usuario cuyo ámbito no incluye una sección (p. ej. un municipio y la vista de
   consolidación departamental), **When** ve la barra, **Then** no se le ofrece esa sección.

---

### Edge Cases

- **Sin datos para el resumen de impacto**: si un territorio no tiene fondos ni obras, las
  tarjetas muestran ceros legibles ("0% ejecutado", "0 alertas"), no un espacio vacío ambiguo.
- **JavaScript deshabilitado / red 3G**: el shell público y las vistas operativas cargan y son
  usables; el mapa (única pieza que necesita JS) degrada a su lista, como ya ocurre.
- **Contraste insuficiente**: ningún par texto/fondo puede quedar por debajo de AA; el gris del
  sidebar sobre su fondo oscuro se verifica explícitamente.
- **Territorio parcial en el buscador**: elegir solo Nación, o Nación+Departamento sin Municipio,
  acota el resumen a ese nivel; no exige llegar hasta municipio.
- **Modo oscuro del dispositivo**: no se promete tema oscuro en esta versión; la paleta es clara y
  consistente. (Si se pide, es enmienda posterior.)

## Requirements *(mandatory)*

### Functional Requirements

**Sistema de tokens y gradación territorial (US1)**

- **FR-001**: El sistema MUST definir la paleta como tokens reutilizables y aplicarlos en todas
  las vistas, sin dejar rastros del acento verde anterior.
- **FR-002**: El sistema MUST distinguir los tres niveles territoriales (Nación, Departamento,
  Municipio) por su gradación de azul en tablas, filtros y mapa.
- **FR-003**: Todo par texto/fondo MUST cumplir contraste AA.
- **FR-004**: El restyle MUST NOT introducir dependencia de JavaScript de cliente en ninguna vista
  operativa crítica, ni añadir fuentes que descargar, ni un framework de UI (Principios III, V).
- **FR-005**: El login MUST presentarse con la tarjeta y los estados de foco/botón de la paleta.

**Landing pública (US2)**

- **FR-006**: El sistema MUST servir una landing pública en la raíz para visitantes sin sesión,
  con navbar, hero, buscador territorial, resumen de impacto y footer.
- **FR-007**: El buscador territorial MUST funcionar en cascada Nación → Departamento → Municipio
  mediante envío de formulario, sin depender de JavaScript de cliente.
- **FR-008**: El resumen de impacto MUST mostrar únicamente agregados (total de fondos asignados,
  porcentaje de ejecución, número de alertas de retraso) y MUST NOT exponer ningún dato personal.
- **FR-009**: El resumen MUST poder acotarse al territorio elegido en el buscador.
- **FR-010**: La landing MUST ofrecer un acceso claro al login ("Ingresar a la Plataforma") y, en
  el footer, enlaces legales y un canal de denuncia.
- **FR-011**: Un visitante con sesión activa que llegue a la raíz MUST ser llevado a su espacio
  (funcionario a su inicio, voluntariado al suyo), no a la landing.

**Navegación de dashboard (US3)**

- **FR-012**: Las vistas operativas MUST presentar una barra lateral de navegación con la sección
  activa resaltada, que reemplaza la línea de enlaces actual.
- **FR-013**: La barra lateral MUST ser navegación server-side (enlaces), usable sin JavaScript, y
  MUST respetar el ámbito del usuario (no ofrecer secciones fuera de su nivel).

### Key Entities *(include if feature involves data)*

Esta feature es principalmente de presentación; no introduce entidades nuevas. Reutiliza:
- **NivelTerritorial** (enum existente) para la gradación de color.
- Los agregados del resumen de impacto se **derivan** de datos ya existentes (fondos/aportes,
  estado de obras, cola de financiación); no se almacena nada nuevo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las vistas usa la paleta azul; cero apariciones del acento verde anterior.
- **SC-002**: El 100% de las vistas operativas críticas sigue cargando y siendo usable con
  JavaScript deshabilitado.
- **SC-003**: El 100% de los pares texto/fondo cumple contraste AA (verificable con una
  herramienta de contraste).
- **SC-004**: Un visitante sin sesión llega a una landing que explica el propósito y muestra el
  impacto agregado en menos de 5 segundos sobre una conexión lenta, sin bloquearse por JavaScript.
- **SC-005**: Ningún elemento público (landing, buscador, tarjetas, mapa) expone datos personales
  (verificable por inspección).
- **SC-006**: La identidad no agrega peso que rompa el criterio de Principio III: el peso de la
  hoja de estilos se mantiene en el mismo orden de magnitud actual (sin framework, sin fuentes).

## Assumptions

- **Manos Unidas es referencia de estructura, no de color.** Su estética cálida NO gobierna; gana
  la paleta azul del brief. Se toma prestada la calidad de navbar/hero/tarjetas/footer.
- El resumen de impacto público muestra agregados de transparencia (nacional por defecto,
  acotable por territorio). La transparencia de cifras agregadas es el propósito del producto y no
  contradice el Principio II (que protege datos operativos entre entidades, no las cifras públicas
  agregadas).
- No se promete tema oscuro en esta versión.
- La landing no incluye fotografía documental pesada tipo carrusel en su primera versión: encaja
  mal con Principio III. Si se desea, entra como mejora progresiva medida más adelante.
- El buscador territorial acota el resumen público; el detalle operativo por obra sigue detrás del
  login, como hoy.
- Se conserva la tipografía del sistema (cero fuentes que descargar).
