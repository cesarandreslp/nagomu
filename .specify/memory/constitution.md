<!--
Sync Impact Report
==================
Version change: (sin versión previa) → 1.0.0
Ratificación inicial: la plantilla sin rellenar fue reemplazada por la constitución del proyecto.

Principios definidos:
  - I. Trazabilidad de toda comunicación (NON-NEGOTIABLE)
  - II. Autoridad por nivel territorial
  - III. Operación en condiciones adversas
  - IV. Mínimo de datos personales (NON-NEGOTIABLE)
  - V. Simplicidad primero

Secciones añadidas:
  - Stack y Restricciones Técnicas (SECTION_2)
  - Flujo de Desarrollo (SECTION_3)
  - Governance

Secciones eliminadas: ninguna (la plantilla no tenía contenido propio).

TODOs diferidos:
  - TODO(ALCANCE_OPERATIVO): confirmar si nagomu manejará datos reales de
    emergencias con entidades públicas o si permanece como prototipo. La
    constitución asume el caso más exigente; si es prototipo académico, los
    principios III y IV pueden relajarse mediante enmienda MINOR.
  - TODO(ENTIDADES_PILOTO): nombrar la gobernación y el/los municipios del
    piloto; el modelo de datos de niveles territoriales depende de ello.
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

Cada usuario actúa dentro de un nivel (nación, gobernación, municipio) y de una
entidad concreta. Un municipio MUST NOT leer ni escribir datos operativos de
otro municipio; la escalación entre niveles MUST ser una acción explícita y
registrada, nunca un efecto secundario. Toda consulta a la base de datos MUST
filtrar por el ámbito del usuario autenticado en el servidor, no en el cliente.

Rationale: la estructura territorial no es una preferencia de UI, es la regla
de negocio central. Filtrar en el cliente convierte cualquier fallo de la vista
en una fuga de datos entre entidades.

### III. Operación en condiciones adversas

Las vistas críticas (alertas activas, reporte de incidente, directorio de
contactos) MUST ser utilizables en un teléfono de gama baja sobre red 3G. Estas
vistas MUST renderizarse en el servidor y MUST NOT depender de JavaScript del
cliente para mostrar su información esencial. Una operación de escritura crítica
MUST funcionar mediante un envío de formulario estándar.

Rationale: durante un desastre la conectividad se degrada justo cuando el
sistema más se necesita. Una aplicación que exige un bundle grande y una
conexión estable está caída en el único escenario para el que fue construida.

### IV. Mínimo de datos personales (NON-NEGOTIABLE)

Se recolecta únicamente el dato personal sin el cual la operación no puede
ejecutarse. Los datos personales MUST NOT aparecer en URLs, parámetros de
consulta, logs ni mensajes de error. El tratamiento MUST cumplir la Ley 1581 de
2012 y el Decreto 1377 de 2013 (Colombia). Un dato de salud o de ubicación de
una persona afectada es dato sensible y MUST tener control de acceso explícito.

Rationale: las víctimas de un desastre no eligieron estar en esta base de
datos. La exposición de su ubicación o condición médica les causa un daño real
que ninguna funcionalidad justifica.

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
- **Autenticación**: sesiones del lado del servidor. La identidad y el ámbito
  territorial se resuelven en el servidor en cada request.
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

**Version**: 1.0.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-08-16
