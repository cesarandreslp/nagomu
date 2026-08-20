<!--
Sync Impact Report
==================
Version actual: 4.0.0 (changelog de enmiendas abajo)

--- Enmienda 1.0.0 → 2.0.0 (MAJOR) ---

Motivo del bump MAJOR: se redefine el Principio II (deja de ser cierto que todo
usuario actúa en nombre de una entidad territorial: se admite una clase de cuenta
sin autoridad territorial) y se amplía el Principio IV, marcado NON-NEGOTIABLE. La
gobernanza exige enmienda MAJOR para tocar un principio NON-NEGOTIABLE.

Principios modificados:
  - II. Autoridad por nivel territorial → añade la cuenta de voluntariado
    auto-registrado, sin ámbito territorial, y el requisito de verificación por el
    municipio antes de mostrarse como oficial (anti-suplantación).
  - IV. Mínimo de datos personales (NON-NEGOTIABLE) → acota qué datos recolecta un
    voluntariado auto-registrado y exige que solo vea/edite su propio registro.

Secciones modificadas:
  - Stack y Restricciones Técnicas → "Autenticación" reconoce cuentas sin ámbito
    territorial.

Principios sin cambio: I (trazabilidad), III (condiciones adversas), V (simplicidad).

--- Enmienda 2.0.0 → 2.1.0 (MINOR) ---

Motivo del bump MINOR: se REFINA el Principio III (Operación en condiciones adversas)
ampliando su guía sin debilitar el núcleo. Se conserva la base server-rendered
utilizable sin JavaScript, y se permite explícitamente la mejora progresiva rica
(JS de cliente, offline/PWA, captura en campo) encima de esa base. Principio III no es
NON-NEGOTIABLE, así que corresponde MINOR.

Principios modificados:
  - III. Operación en condiciones adversas → añade que la mejora progresiva rica es
    permitida sobre una base degradable, y que nunca puede ser el único camino para un
    dato o acción esencial.

Principios sin cambio: I (trazabilidad), II (autoridad por nivel), IV (mínimo de datos
personales, NON-NEGOTIABLE, INTACTO), V (simplicidad).

Habilita: herramientas de captura de campo modernas (fotos, geolocalización, formularios
dinámicos, offline) manteniendo la resiliencia. El diseño concreto va en el spec que lo use.

--- Enmienda 2.1.0 → 3.0.0 (MAJOR) ---

Motivo del bump MAJOR: se AMPLÍA el Principio IV (Mínimo de datos personales), marcado
NON-NEGOTIABLE, para permitir un registro municipal de damnificados (el registro nacional
no le devuelve la trazabilidad al municipio). La gobernanza exige MAJOR para tocar un
principio NON-NEGOTIABLE. La ampliación es acotada y con candados; no debilita el IV.

Principios modificados:
  - IV. Mínimo de datos personales (NON-NEGOTIABLE) → un municipio puede registrar los
    damnificados de su territorio: unidad hogar, datos mínimos (incluido documento SOLO
    aquí y SOLO con autorización de tratamiento, Ley 1581), indicadores mínimos de
    heridos/fallecidos (nada clínico), acceso acotado al municipio dueño (Principio II),
    hábeas data, finalidad y retención acotadas.

Principios sin cambio: I (trazabilidad), II (autoridad por nivel), III (condiciones
adversas), V (simplicidad).

Habilita: spec 006 (gestión municipal de damnificados). El modelo, el export a Excel/CSV
y la preparación para la API del RUD van en ese spec, no aquí.

--- Enmienda 3.0.0 → 4.0.0 (MAJOR) ---

Motivo del bump MAJOR: se AMPLÍA de nuevo el Principio IV (NON-NEGOTIABLE) con dos cosas
motivadas por la caracterización integral de afectaciones: (a) una política de
**clasificación público/reservado** (qué se publica: cantidades, tipo, punto geográfico,
lugar general; nunca dirección ni persona) y (b) un **indicador categorizado de necesidad
de salud** para referir a la atención, con consentimiento y máximos controles — refinando
el "nada clínico" del registro de damnificados. La gobernanza exige MAJOR para tocar un
principio NON-NEGOTIABLE. No debilita el IV: define qué es público y acota el dato de salud.

Principios modificados:
  - IV. Mínimo de datos personales (NON-NEGOTIABLE) → añade la clasificación público/
    reservado (dirección nunca pública; punto y lugar general sí; foto sin metadatos) y
    permite un indicador categorizado de necesidad de salud, solo para referir, bajo
    autorización y control estricto.

Principios sin cambio: I (trazabilidad), II (autoridad por nivel), III (condiciones
adversas), V (simplicidad).

Habilita: spec 007 (caracterización integral de afectaciones) — bienes de todo tipo
(vivienda, comercio, pública, agropecuario), geografía sub-municipal, caracterización del
hogar y censo público. El modelo va en ese spec, no aquí.

Historial: 1.0.0 → 2.0.0 (MAJOR): voluntariados sin ámbito (II, IV), spec 003. 2.0.0 →
2.1.0 (MINOR): Principio III permite mejora progresiva. 2.1.0 → 3.0.0 (MAJOR): registro
municipal de damnificados (IV), spec 006. 3.0.0 → 4.0.0 (MAJOR): clasificación público/
reservado + necesidad de salud categorizada (IV), habilita spec 007.
-->

# nagomu Constitution

nagomu coordina la comunicación entre la nación, la gobernación y el municipio
para la atención organizada de desastres. Un desastre es precisamente el momento
en que los sistemas fallan: esta constitución existe para que el software no sea
una fuente adicional de fallo.

## Core Principles

### I. Trazabilidad de toda comunicación (NON-NEGOTIABLE)

Toda comunicación, alerta, reporte o cambio de estado MUST quedar registrado de
forma append-only con actor, nivel territorial, marca de tiempo del servidor y
contenido íntegro. Los registros MUST NOT actualizarse ni borrarse: una
corrección se modela como un registro nuevo que referencia al anterior.

Rationale: después de una emergencia, la pregunta que se investiga es quién
supo qué y cuándo. Si ese historial se puede sobrescribir, el sistema no sirve
como evidencia y su valor institucional desaparece.

### II. Autoridad por nivel territorial

Cada usuario **con autoridad** actúa dentro de un nivel (nación, gobernación,
municipio) y de una entidad concreta. Un municipio MUST NOT leer ni escribir
datos operativos de otro municipio; la escalación entre niveles MUST ser una
acción explícita y registrada, nunca un efecto secundario. Toda consulta a la
base de datos MUST filtrar por el ámbito del usuario autenticado en el servidor,
no en el cliente.

Existe una segunda clase de cuenta: el **voluntariado auto-registrado**. Esta
cuenta NO tiene autoridad territorial: no pertenece a ninguna entidad, MUST NOT
leer ni escribir datos operativos de ningún municipio, y solo puede ver y editar
su propio registro de actor y su coordenada. Su participación en el mapa o en la
operación MUST NOT mostrarse como oficial hasta que el municipio correspondiente
la verifique; hasta entonces MUST mostrarse marcada como no verificada. Esa
verificación es una acción explícita y auditada (Principio I).

Rationale: la estructura territorial no es una preferencia de UI, es la regla
de negocio central. Filtrar en el cliente convierte cualquier fallo de la vista
en una fuga de datos entre entidades. Y sin un paso de verificación, cualquiera
se auto-registra como un organismo de socorro y aparece en un mapa oficial: la
suplantación desvía ayuda y cuesta vidas, así que un registro sin verificar
nunca puede pasar por oficial.

### III. Operación en condiciones adversas

Las vistas críticas (alertas activas, reporte de incidente, directorio de
contactos) MUST ser utilizables en un teléfono de gama baja sobre red 3G. Estas
vistas MUST tener una base renderizada en el servidor que MUST NOT depender de
JavaScript del cliente para mostrar su información esencial. Una operación de
escritura crítica MUST funcionar mediante un envío de formulario estándar.

Sobre esa base **se PERMITE la mejora progresiva rica**: JavaScript del cliente,
comportamiento offline/PWA y captura en campo (fotos, geolocalización, formularios
dinámicos). La condición es una sola: la funcionalidad esencial MUST seguir
disponible y usable cuando esa mejora no cargue (sin JavaScript o sin conexión). La
mejora progresiva MUST NOT ser el único camino para capturar un dato o ejecutar una
acción esencial.

Rationale: durante un desastre la conectividad se degrada justo cuando el
sistema más se necesita. Una aplicación que exige un bundle grande y una
conexión estable está caída en el único escenario para el que fue construida.
Pero la captura en campo se hace mejor con herramientas modernas: la solución no es
prohibirlas, sino exigir que haya un camino que funcione sin ellas. La base
degradable es el piso; la mejora es el techo.

### IV. Mínimo de datos personales (NON-NEGOTIABLE)

Se recolecta únicamente el dato personal sin el cual la operación no puede
ejecutarse. Los datos personales MUST NOT aparecer en URLs, parámetros de
consulta, logs ni mensajes de error. El tratamiento MUST cumplir la Ley 1581 de
2012 y el Decreto 1377 de 2013 (Colombia). Un dato de salud o de ubicación de
una persona afectada es dato sensible y MUST tener control de acceso explícito.

**Clasificación y publicación.** Todo dato del sistema es **público** o **reservado**.
Es **público** únicamente lo que NO identifica a una persona: cantidades, tipo de
afectación, la **ubicación geográfica (el punto)** de un bien afectado, y el **lugar
general** (corregimiento, vereda, municipio). Es **reservado** todo lo demás: la
identidad y el documento de una persona, la **dirección exacta** de un bien, y el
detalle. La **dirección textual NUNCA es pública** —señala directo al hogar—; en
público solo van el punto y el lugar general. Cuando una fotografía no traiga su
ubicación geográfica (debería, pero puede faltar), se publica el lugar general, nunca
la dirección; y una fotografía MUST despojarse de metadatos (GPS incluido) antes de
almacenarse. Un dato reservado MUST NOT publicarse ni filtrarse a un nivel que no
tenga acceso.

Una cuenta de voluntariado auto-registrado recolecta ÚNICAMENTE: un nombre (de
la organización o de contacto), un correo para la cuenta, un dato de contacto y
la coordenada del **punto de operación de la organización**. Esa coordenada es
de la organización, NUNCA la ubicación de una persona. Ningún otro dato personal
del voluntario se recolecta sin una enmienda a esta constitución. El voluntario
MUST poder ver y editar solo su propio registro; ningún funcionario ajeno al
municipio que lo verifica accede a más de lo necesario para verificarlo.

Un municipio PUEDE mantener un **registro de damnificados de su territorio** como
operación esencial de gestión (el registro nacional no le devuelve la trazabilidad de
su propia respuesta). Ese registro se rige por candados estrictos:

- **Unidad e mínimo**: se registra el **hogar**, con lo mínimo para gestionarlo —
  identificación del hogar (nombre del responsable y su documento de identidad), el
  **inmueble afectado** (vínculo al inventario), la composición del hogar como CONTEOS
  (total, niños, adultos mayores, personas con discapacidad) e **indicadores mínimos**
  (hay heridos / hay fallecidos, solo para priorizar), y las ayudas recibidas/pendientes.
- **Salud, solo para referir**: MUST NOT almacenarse historia clínica ni detalle médico;
  eso lo maneja el sistema de salud / ADRES. SÍ se permite un **indicador categorizado de
  necesidad de salud** —de una lista cerrada (p. ej. condición crónica, diálisis, embarazo
  de riesgo, discapacidad, dependencia de oxígeno)— con la ÚNICA finalidad de **referir a la
  atención en salud**, bajo autorización explícita del titular y máximos controles de
  acceso. Dice QUÉ necesidad, para poder actuar; nunca el diagnóstico, la historia ni el
  detalle clínico.
- **Documento**: el documento de identidad de un damnificado queda permitido
  ÚNICAMENTE dentro de este registro y bajo estas condiciones. La prohibición general de
  almacenar el documento de una persona natural en el contexto operativo de obras y
  aportes **se mantiene**.
- **Autorización**: la recolección EXIGE una **autorización explícita de tratamiento de
  datos personales** (Ley 1581 de 2012, Decreto 1377 de 2013) registrada por hogar. Sin
  esa autorización no se recolecta el dato sensible.
- **Acceso acotado (Principio II)**: solo el municipio dueño accede al detalle personal;
  ningún otro municipio ni nivel lo ve. Ningún dato personal aparece en URLs, parámetros,
  logs ni mensajes de error.
- **Hábeas data y finalidad**: se respetan los derechos de conocer, actualizar, rectificar
  y suprimir; la finalidad es la atención del desastre; la retención es acotada.

Rationale: las víctimas de un desastre no eligieron estar en esta base de
datos, y quien se ofrece a ayudar tampoco entrega su vida entera a cambio. La
exposición de una ubicación o condición personal causa un daño real que ninguna
funcionalidad justifica; por eso incluso la puerta que abrimos a los voluntarios
se abre al mínimo. Y sin embargo el municipio necesita saber a quién atiende y cómo
va su gestión: por eso el registro de damnificados existe, pero con documento solo
bajo autorización, acotado a su dueño y sin nada clínico. La regla no es "no
recolectar nunca"; es "recolectar lo esencial, con consentimiento y bajo llave".

### V. Simplicidad primero

Una sola aplicación Next.js, una sola base de datos Postgres, un solo
despliegue. NO se introducen microservicios, colas, caché ni capas de
abstracción sin una limitación medida que las exija. Toda dependencia nueva MUST
justificarse frente a lo que ya existe en el stack.

Rationale: el equipo es pequeño y el sistema debe seguir siendo operable y
depurable bajo presión. Cada pieza móvil añadida es una pieza que puede fallar
a las 3 de la madrugada de una emergencia.

## Stack y Restricciones Técnicas

- **Framework**: Next.js (App Router) con TypeScript en modo `strict`.
- **Base de datos**: PostgreSQL, accedida exclusivamente vía Prisma. El archivo
  `schema.prisma` es la única fuente de verdad del modelo de datos.
- **Migraciones**: todo cambio de esquema MUST pasar por `prisma migrate` y
  quedar versionado en el repositorio. NO se modifica la base en producción a
  mano.
- **Despliegue**: Vercel. La rama `main` es desplegable en todo momento.
- **Configuración**: secretos y cadenas de conexión MUST vivir en variables de
  entorno. NO se comitea ningún `.env` con valores reales — el repositorio es
  público.
- **Autenticación**: sesiones del lado del servidor. La identidad y, cuando la
  cuenta la tiene, el ámbito territorial se resuelven en el servidor en cada
  request. Las cuentas de voluntariado auto-registrado no tienen ámbito
  territorial y su autorización se resuelve sobre su propio registro, nunca sobre
  datos operativos de un municipio.
- **Integridad**: las reglas que la base puede garantizar (unicidad, claves
  foráneas, `NOT NULL`) MUST expresarse como restricciones de Postgres, no solo
  como validación en la aplicación.

## Flujo de Desarrollo

- **Spec-driven**: toda funcionalidad nace de `/speckit-specify`; el código sin
  spec no entra. Cada feature vive en su rama y su carpeta `specs/NNN-*/`.
- **Pruebas**: las rutas de permisos (Principio II), la escalación entre
  niveles y el registro de auditoría (Principio I) MUST tener pruebas
  automatizadas. El resto del código no requiere cobertura obligatoria.
- **Revisión**: antes de fusionar a `main` se verifica que el cambio no viole
  ningún principio de esta constitución. Una violación necesaria MUST
  documentarse en el `plan.md` de la feature con su justificación.
- **Preview**: cada rama genera un despliegue de preview en Vercel; ahí se
  valida antes de fusionar.

## Governance

Esta constitución prevalece sobre cualquier otra práctica del proyecto. Cuando
una decisión técnica la contradiga, gana la constitución o se enmienda la
constitución — no ambas cosas a la vez.

**Enmiendas**: se proponen mediante `/speckit-constitution`, quedan registradas
en el Sync Impact Report de este archivo y se comitean como cambio propio,
separado de código de funcionalidad.

**Versionado** (semántico):
- MAJOR: se elimina o redefine un principio de forma incompatible.
- MINOR: se añade un principio o se amplía materialmente una guía.
- PATCH: aclaraciones, redacción, correcciones sin cambio semántico.

**Cumplimiento**: los artefactos de Spec Kit (`spec.md`, `plan.md`,
`tasks.md`) MUST revisarse contra estos principios antes de implementar. Los
principios marcados NON-NEGOTIABLE no admiten excepción documentada: requieren
enmienda MAJOR.

**Version**: 4.0.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-08-19
