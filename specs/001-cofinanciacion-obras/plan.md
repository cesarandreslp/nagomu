# Implementation Plan: Cofinanciación priorizada de obras de reconstrucción

**Branch**: `001-cofinanciacion-obras` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-cofinanciacion-obras/spec.md`

## Summary

Aplicación web única en Next.js (App Router) con Postgres a través de Prisma, desplegada en
Vercel. El sistema mantiene un inventario de obras de reconstrucción priorizado por una
fórmula pública, proyecta una cola de financiación que reparte la capacidad fiscal municipal
en orden de prioridad, y registra los aportes e intervenciones de entidades públicas, empresas,
voluntariados y personas naturales sobre cada obra.

Tres decisiones sostienen el diseño:

1. **La inmutabilidad se garantiza en la base de datos, no en el código.** Un disparador de
   Postgres rechaza `UPDATE` y `DELETE` sobre las tablas de auditoría y de movimientos. El
   principio de trazabilidad no depende de que la aplicación se porte bien.
2. **Toda la aritmética de prioridad y cola vive en funciones puras**, sin acceso a base de
   datos, calculadas en el servidor en cada petición. Son reproducibles a mano, que es lo que
   exige FR-005 y FR-007.
3. **Las vistas críticas se renderizan en el servidor y sus formularios funcionan sin
   JavaScript.** Los escenarios comparativos se calculan en el servidor y se navegan por URL,
   no con un simulador en el navegador.

## Technical Context

**Language/Version**: TypeScript 5.x en modo `strict`, Node.js 20+

**Primary Dependencies**: Next.js 15+ (App Router, React Server Components, Server Actions),
Prisma como única vía de acceso a datos. Sin librería de autenticación, sin librería de estado,
sin framework de UI. Autenticación construida sobre `node:crypto` de la biblioteca estándar.

**Storage**: PostgreSQL. En Vercel, cadena de conexión agrupada (`DATABASE_URL`) para la
aplicación y conexión directa (`DIRECT_URL`) para migraciones.

**Testing**: Vitest. Cobertura obligatoria sobre las funciones puras de prioridad y cola, sobre
las reglas de autorización y sobre la inmutabilidad de la auditoría. Sin pruebas de navegador.

**Target Platform**: Web. Navegadores móviles de gama baja sobre 3G como caso de referencia.

**Project Type**: Aplicación web única (un solo despliegue, sin backend separado).

**Performance Goals**: La lista priorizada de un departamento con 500 obras se muestra completa
en menos de tres segundos sobre 3G (SC-008). Esto implica presupuesto de página pequeño y
proyección de cola calculada en una sola consulta por municipio.

**Constraints**: Las vistas y escrituras críticas MUST funcionar sin JavaScript en el cliente.
Ningún dato personal en URL, parámetros de consulta ni registros de aplicación. Montos en
decimal exacto, nunca en punto flotante.

**Scale/Scope**: Piloto de dos departamentos, alrededor de 50 municipios, unas 2.000 obras y
200 usuarios. Volumen pequeño; la complejidad está en las reglas, no en la escala.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Exigencia | Cómo lo cumple este plan | Estado |
|---|---|---|---|
| **I. Trazabilidad** (NON-NEGOTIABLE) | Registro append-only, sin `UPDATE` ni `DELETE`; correcciones como registros nuevos | Tablas `RegistroAuditoria`, `Aporte`, `CostoObra` y `EstadoObra` protegidas por disparador de Postgres que rechaza modificación y borrado. Corrección mediante fila nueva con `corrigeId`. | PASA |
| **II. Autoridad territorial** | Filtrado y autorización resueltos en el servidor | Lectura abierta a todo usuario autenticado (FR-024), por lo que no hay filtrado de lectura que fallar. La escritura pasa por `lib/authz.ts`, invocado por cada Server Action, con pruebas obligatorias. | PASA |
| **III. Condiciones adversas** | Vistas críticas renderizadas en el servidor, escrituras por formulario estándar | React Server Components sin componentes de cliente en las rutas críticas. Server Actions invocadas por `<form action>`, que Next.js degrada a envío HTTP normal sin JavaScript. Escenarios comparativos calculados en el servidor y navegados por URL. | PASA |
| **IV. Mínimo de datos personales** (NON-NEGOTIABLE) | Solo lo indispensable; nada en URL ni logs | De persona natural solo nombre y un contacto. Identificadores opacos en rutas. Registro de aplicación sin campos de persona. | PASA |
| **V. Simplicidad** | Una app, una base, sin capas ni dependencias sin causa | Una aplicación Next.js, una base Postgres, un despliegue. Tres dependencias de producción. Autenticación con biblioteca estándar en lugar de framework de auth. | PASA |

No hay violaciones que justificar; la sección Complexity Tracking queda vacía.

**Riesgo señalado**: el principio III y la pantalla de escenarios comparativos están en tensión
natural. Se resuelve calculando cada escenario en el servidor y exponiéndolo como una URL
distinta, en lugar de un simulador interactivo. Detalle en [research.md](./research.md).

## Project Structure

### Documentation (this feature)

```text
specs/001-cofinanciacion-obras/
├── plan.md              # Este archivo
├── research.md          # Decisiones técnicas y alternativas descartadas
├── data-model.md        # Entidades, campos, relaciones, invariantes
├── quickstart.md        # Cómo levantar y validar la funcionalidad
├── contracts/
│   └── rutas.md         # Contrato de rutas y acciones de servidor
├── checklists/
│   └── requirements.md  # Validación de calidad de la especificación
└── tasks.md             # Salida de /speckit-tasks, aún no creado
```

### Source Code (repository root)

```text
app/
├── layout.tsx
├── page.tsx                        # Redirige según el nivel del usuario
├── login/
│   └── page.tsx                    # Formulario de acceso, sin JavaScript
├── obras/
│   ├── page.tsx                    # Inventario priorizado del municipio
│   ├── nueva/page.tsx              # Alta de ítem de inventario
│   └── [obraId]/
│       ├── page.tsx                # Detalle: prioridad, costos, cola, aportes
│       ├── costo/page.tsx          # Registro del resultado del estudio
│       ├── aportes/page.tsx        # Alta y corrección de aportes
│       ├── intervenciones/page.tsx # Solicitud, aprobación, verificación, recibo
│       └── historial/page.tsx      # Auditoría legible de la obra
├── departamento/
│   └── page.tsx                    # Consolidado por prioridad e impacto
├── municipio/
│   └── capacidad/page.tsx          # Reporte de capacidad fiscal
└── actions/
    ├── obras.ts                    # Server Actions de obras y costos
    ├── aportes.ts                  # Server Actions de aportes
    ├── intervenciones.ts           # Server Actions de solicitudes y verificaciones
    └── sesion.ts                   # Entrada y salida de sesión

lib/
├── db.ts                           # Cliente Prisma único
├── auth.ts                         # Hash scrypt, sesión opaca en cookie
├── authz.ts                        # Reglas de quién puede editar qué
├── audit.ts                        # Escritura del registro append-only
├── prioridad.ts                    # Nivel, factores y puntaje (función pura)
├── cola.ts                         # Proyección de cola y escenarios (función pura)
└── dinero.ts                       # Aritmética decimal y formato en pesos

prisma/
├── schema.prisma
├── migrations/
└── seed.ts                         # Entidades y usuarios del piloto

tests/
├── prioridad.test.ts               # Orden por nivel, puntaje, desempate
├── cola.test.ts                    # Reparto de capacidad, desplazamientos, escenarios
├── authz.test.ts                   # Matriz completa de permisos (obligatorio)
├── auditoria.test.ts               # El disparador rechaza UPDATE y DELETE
└── dinero.test.ts                  # Sin pérdida de precisión
```

**Structure Decision**: Aplicación Next.js única en la raíz del repositorio, sin separación
entre backend y frontend, conforme al Principio V. Las rutas de `app/` son servidor por defecto;
ningún componente de cliente aparece en las rutas críticas. La lógica que debe ser reproducible
a mano (`prioridad.ts`, `cola.ts`, `dinero.ts`) vive fuera de las rutas, sin acceso a base de
datos, para poder probarse sin infraestructura.

## Complexity Tracking

> Sin violaciones de la constitución. Nada que justificar.
