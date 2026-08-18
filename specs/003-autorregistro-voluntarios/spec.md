# Feature Specification: Auto-registro de voluntariados con verificación por el municipio

**Feature Branch**: `003-autorregistro-voluntarios`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Auto-registro de voluntariados con verificación por el municipio. Un voluntariado puede crear su propia cuenta no-territorial, iniciar sesión y mantener su registro (nombre, correo, un contacto, coordenada del punto de operación). No tiene autoridad territorial (Principio II); mínimo de datos personales (Principio IV); auditoría append-only (Principio I); vistas críticas sin JavaScript sobre 3G (Principio III). Un voluntariado auto-registrado aparece NO VERIFICADO y no se muestra como oficial hasta que un municipio lo verifica; el municipio puede verificar, rechazar o revocar con motivo. Solo los voluntariados verificados con coordenada aparecen en el mapa (spec 002)."

## Contexto y encuadre constitucional

Esta feature existe gracias a la **enmienda constitucional 2.0.0**, que habilitó una
clase de cuenta sin autoridad territorial. Antes, solo las entidades territoriales tenían
usuario. Ahora un voluntariado puede tener cuenta propia — pero bajo condiciones estrictas:

- **Principio II**: la cuenta de voluntariado **no tiene autoridad territorial**. No lee
  ni escribe datos operativos de ningún municipio; solo ve y edita su propio registro.
- **Principio IV (no negociable)**: se recolecta el mínimo — nombre, un correo para la
  cuenta, un dato de contacto y la coordenada del **punto de operación de la organización**
  (nunca de una persona). Solo el propio voluntario accede a su registro.
- **Principio I**: cada hecho (registro, edición, verificación, rechazo, revocación) queda
  en la auditoría append-only.
- **Principio III**: registro, inicio de sesión y edición del propio registro son vistas
  críticas: server-rendered, usables sin JavaScript sobre 3G, con envío de formulario.
- **Anti-suplantación**: un voluntariado auto-registrado nace **NO VERIFICADO** y no se
  muestra como oficial hasta que un municipio lo verifica con una acción explícita y
  auditada.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un voluntariado crea su cuenta y mantiene su registro (Priority: P1)

Una organización de socorro (brigada, ONG local) entra a una página pública de registro,
crea su cuenta con un correo y una contraseña, y aporta lo mínimo: nombre de la
organización, un dato de contacto, el municipio donde opera y la coordenada de su punto de
operación. Al terminar puede iniciar sesión y ver/editar únicamente su propio registro. Su
estado inicial es **NO VERIFICADO** y así se lo indica la interfaz.

**Why this priority**: Es la puerta que abrió la enmienda y el cimiento de todo lo demás.
Sin la cuenta y su registro no hay nada que verificar ni que mostrar.

**Independent Test**: Registrar una cuenta nueva, iniciar sesión, editar el propio
registro y cerrar sesión; verificar que el estado es NO VERIFICADO y que la cuenta no
puede abrir ninguna vista operativa de un municipio.

**Acceptance Scenarios**:

1. **Given** un visitante en la página de registro, **When** completa nombre, correo,
   contraseña, contacto, municipio de operación y coordenada válidos, **Then** se crea la
   cuenta, su registro queda NO VERIFICADO y puede iniciar sesión.
2. **Given** una cuenta de voluntariado con sesión iniciada, **When** abre su registro,
   **Then** ve y puede editar solo sus propios datos, y en ningún caso datos de un
   municipio u otra organización.
3. **Given** una cuenta de voluntariado, **When** intenta abrir una vista operativa de un
   municipio (inventario, aportes, capacidad fiscal), **Then** se le niega el acceso y el
   intento queda auditado (Principio II).
4. **Given** un correo ya usado por otra cuenta, **When** alguien intenta registrarse con
   él, **Then** el registro se rechaza sin revelar datos de la cuenta existente.
5. **Given** un cliente sin JavaScript sobre 3G, **When** hace el registro, el login y la
   edición, **Then** todo funciona mediante envío de formulario estándar (Principio III).
6. **Given** una coordenada fuera de rango o incompleta, **When** se envía el formulario,
   **Then** se rechaza en el servidor y no se guarda (reusa la validación de spec 002).

---

### User Story 2 - Un municipio verifica, rechaza o revoca un voluntariado (Priority: P2)

Un funcionario del municipio de operación ve la lista de voluntariados que declararon operar
en su territorio y están pendientes. Sobre cada uno puede **verificar**, **rechazar** o,
si ya estaba verificado, **revocar** la verificación. Rechazo y revocación exigen motivo.
Cada acción queda auditada. Solo el municipio de operación declarado por el voluntariado
tiene esta potestad.

**Why this priority**: Es el control anti-suplantación, el que convierte un auto-registro
en algo confiable. Va después de US1 porque necesita cuentas que verificar, pero es
imprescindible para que la feature entregue valor real.

**Independent Test**: Con un voluntariado NO VERIFICADO que opera en el municipio del
funcionario, verificarlo y confirmar el cambio de estado y el asiento de auditoría;
rechazar otro con motivo; revocar uno verificado con motivo.

**Acceptance Scenarios**:

1. **Given** un funcionario del municipio de operación y un voluntariado NO VERIFICADO,
   **When** lo verifica, **Then** su estado pasa a VERIFICADO y queda un asiento de
   auditoría con el funcionario y la marca de tiempo del servidor.
2. **Given** un voluntariado NO VERIFICADO, **When** el funcionario lo rechaza sin motivo,
   **Then** la acción se bloquea; el motivo es obligatorio en rechazo y revocación.
3. **Given** un voluntariado VERIFICADO, **When** el municipio revoca la verificación con
   motivo, **Then** su estado deja de ser oficial, sale del mapa y queda auditado.
4. **Given** un funcionario de un municipio distinto al de operación del voluntariado,
   **When** intenta verificarlo, **Then** se le niega y el intento queda auditado
   (Principio II).
5. **Given** el historial de un voluntariado, **When** se consulta, **Then** se ven todas
   sus verificaciones/rechazos/revocaciones en orden, sin que ninguna se haya sobrescrito
   (Principio I).

---

### User Story 3 - Solo los voluntariados verificados aparecen en el mapa (Priority: P3)

La capa de voluntariados del mapa (spec 002) muestra únicamente voluntariados **VERIFICADOS
que tienen coordenada**. Un voluntariado NO VERIFICADO, rechazado o revocado no aparece
como marcador. La lista esencial puede indicar cuántos hay pendientes, pero nunca los
presenta como oficiales.

**Why this priority**: Es la integración que cierra el círculo con el mapa, pero depende de
que existan cuentas (US1) y verificación (US2). Sin ellas no hay nada verificado que
dibujar.

**Independent Test**: Con un voluntariado VERIFICADO con coordenada y otro NO VERIFICADO
con coordenada, abrir la capa de voluntariados del mapa y confirmar que solo el verificado
aparece.

**Acceptance Scenarios**:

1. **Given** un voluntariado VERIFICADO con coordenada, **When** se abre la capa de
   voluntariados, **Then** aparece su marcador, distinguible de la capa de inventario.
2. **Given** un voluntariado NO VERIFICADO con coordenada, **When** se abre el mapa,
   **Then** NO aparece como marcador oficial.
3. **Given** un voluntariado VERIFICADO sin coordenada, **When** se abre el mapa, **Then**
   no se dibuja, pero permanece en las listas correspondientes.

---

### Edge Cases

- **Correo duplicado**: no se puede registrar dos cuentas con el mismo correo; el mensaje
  no revela si el correo existe (evita enumeración de cuentas).
- **Nombre que choca con un actor existente**: si el municipio ya había creado un actor
  VOLUNTARIADO con ese nombre (al inscribir un aporte), el auto-registro se vincula a ese
  actor o crea uno nuevo, pero en ambos casos nace NO VERIFICADO; reclamar un actor
  existente no otorga por sí mismo la verificación.
- **Voluntariado que opera en varios municipios**: en esta versión declara **un** municipio
  de operación, que es quien lo verifica. Operar en varios queda fuera de alcance.
- **Coordenada de una persona**: no hay campo para ello; la única coordenada es la del
  punto de operación de la organización (Principio IV).
- **Revocación tras verificación**: al revocar, el voluntariado sale del mapa de inmediato;
  su historial de verificación no se borra.
- **Cuenta inactiva o sesión revocada**: se aplica el mismo mecanismo de sesiones del resto
  del sistema (borrar la sesión revoca el acceso).
- **Intento de escalar privilegios**: una cuenta de voluntariado nunca obtiene ámbito
  territorial por editar su propio registro ni por ser verificada; verificado sigue sin
  poder leer datos de un municipio.

## Requirements *(mandatory)*

### Functional Requirements

**Cuenta y registro (US1)**

- **FR-001**: El sistema MUST permitir a un visitante crear una cuenta de voluntariado
  aportando nombre de la organización, correo, contraseña, un dato de contacto, el
  municipio de operación y la coordenada del punto de operación.
- **FR-002**: El sistema MUST tratar la cuenta de voluntariado como **no-territorial**: sin
  entidad ni nivel, y MUST NOT permitirle leer ni escribir datos operativos de ningún
  municipio.
- **FR-003**: El sistema MUST permitir a la cuenta de voluntariado ver y editar
  **únicamente** su propio registro, y ningún otro (Principio IV).
- **FR-004**: El sistema MUST recolectar de la cuenta de voluntariado solo: nombre, correo,
  contraseña (almacenada con hash, nunca en claro), un dato de contacto y la coordenada de
  la organización. MUST NOT recolectar ningún otro dato personal.
- **FR-005**: El sistema MUST asignar a todo voluntariado auto-registrado el estado inicial
  **NO VERIFICADO** y MUST indicarlo en la interfaz del propio voluntario.
- **FR-006**: El sistema MUST validar el correo como único y MUST NOT revelar, ante un
  correo ya existente, información de la cuenta asociada.
- **FR-007**: El sistema MUST validar la coordenada en el servidor (rango de latitud y
  longitud), reutilizando la validación de spec 002; una coordenada inválida se rechaza.
- **FR-008**: Las vistas de registro, inicio de sesión y edición del propio registro MUST
  renderizarse en el servidor y funcionar sin JavaScript del cliente (Principio III).
- **FR-009**: El sistema MUST reutilizar el mecanismo de sesiones del lado del servidor ya
  existente; borrar la sesión revoca el acceso.

**Verificación por el municipio (US2)**

- **FR-010**: El sistema MUST permitir a un funcionario del **municipio de operación**
  declarado por el voluntariado verificar, rechazar o revocar la verificación de ese
  voluntariado.
- **FR-011**: El sistema MUST exigir un motivo al rechazar y al revocar; verificar no
  requiere motivo.
- **FR-012**: El sistema MUST negar la verificación/rechazo/revocación a cualquier usuario
  que no sea del municipio de operación del voluntariado, y MUST auditar el intento
  (Principio II).
- **FR-013**: El sistema MUST registrar cada verificación, rechazo y revocación como un
  asiento append-only con el funcionario, el resultado, el motivo cuando aplica y la marca
  de tiempo del servidor (Principio I).
- **FR-014**: El sistema MUST conservar el historial completo de estados de verificación de
  un voluntariado, sin sobrescribir ninguno.

**Visibilidad oficial e integración con el mapa (US3)**

- **FR-015**: El sistema MUST mostrar como oficial (en el mapa y en cualquier vista
  operativa) únicamente a voluntariados en estado VERIFICADO.
- **FR-016**: El sistema MUST incluir en la capa de voluntariados del mapa (spec 002) solo
  a los voluntariados VERIFICADOS que tienen coordenada; los NO VERIFICADOS, rechazados o
  revocados MUST NOT aparecer como marcadores oficiales.
- **FR-017**: Al revocarse la verificación, el voluntariado MUST desaparecer del mapa de
  inmediato.

### Key Entities *(include if feature involves data)*

- **Cuenta de voluntariado**: credenciales de acceso de una organización voluntaria, sin
  ámbito territorial. Atributos: correo (único), contraseña con hash, estado activo, y el
  vínculo con su registro de actor voluntariado. Reutiliza el modelo de sesiones existente.
- **Registro de voluntariado (actor VOLUNTARIADO)**: nombre, un dato de contacto, municipio
  de operación declarado, coordenada del punto de operación (opcional para existir, pero
  necesaria para aparecer en el mapa), y estado de verificación (NO VERIFICADO / VERIFICADO
  / RECHAZADO). Se apoya en el actor VOLUNTARIADO ya existente en el modelo.
- **Asiento de verificación** (append-only): sobre qué voluntariado recayó, qué municipio y
  funcionario actuó, resultado (verificado / rechazado / revocado), motivo cuando aplica, y
  marca de tiempo del servidor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una organización puede registrarse, iniciar sesión y dejar su registro
  completo (con coordenada) en menos de 5 minutos, sin asistencia.
- **SC-002**: El 100% de las cuentas de voluntariado nacen NO VERIFICADAS y ninguna aparece
  como oficial ni en el mapa hasta ser verificada por su municipio de operación.
- **SC-003**: Una cuenta de voluntariado no puede acceder a ningún dato operativo de un
  municipio; el 100% de esos intentos se niegan y se auditan.
- **SC-004**: Ningún dato personal más allá de nombre, correo, contacto y coordenada de la
  organización se almacena para un voluntariado (verificable por inspección del modelo).
- **SC-005**: El 100% de las verificaciones, rechazos y revocaciones quedan en un historial
  que no se puede alterar ni borrar.
- **SC-006**: Un municipio solo puede verificar voluntariados que declararon operar en su
  territorio; los intentos de otros municipios se niegan el 100% de las veces.
- **SC-007**: Registro, login y edición del propio registro funcionan con JavaScript
  deshabilitado.

## Assumptions

- Un voluntariado declara **un** municipio de operación en el registro, y ese municipio es
  el único con potestad de verificarlo/revocarlo. Operar en varios municipios queda fuera
  de alcance de esta versión.
- La verificación de identidad real de la organización la hace el municipio por sus medios
  (fuera del sistema); el sistema registra la decisión, no la evidencia externa.
- La verificación de titularidad del correo (por ejemplo, un enlace de confirmación) es
  deseable como endurecimiento, pero el control anti-suplantación central es la
  verificación municipal; se trata como refinamiento posterior, no como bloqueante.
- Se reutilizan los mecanismos existentes de contraseñas (hash) y de sesiones del lado del
  servidor; no se introduce un proveedor de identidad externo.
- La capa de voluntariados del mapa se apoya en spec 002 (coordenada en el actor
  voluntariado); esta feature aporta el estado de verificación que la filtra.
- Los actores VOLUNTARIADO creados por un municipio al inscribir aportes siguen existiendo;
  una cuenta auto-registrada puede vincularse a uno o crear uno nuevo, y en ambos casos
  parte de NO VERIFICADO.
