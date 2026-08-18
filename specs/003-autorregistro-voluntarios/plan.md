# Implementation Plan: Auto-registro de voluntariados con verificación por el municipio

**Branch**: `003-autorregistro-voluntarios` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-autorregistro-voluntarios/spec.md`

## Summary

Se habilita una **cuenta no-territorial** para voluntariados (posible desde la enmienda
constitucional 2.0.0). El enfoque técnico reutiliza al máximo lo que ya existe: el modelo
`Usuario`, el mecanismo de sesiones opacas y el hash `scrypt`. Un voluntariado se
auto-registra, obtiene una cuenta ligada a un `Actor` de tipo `VOLUNTARIADO` (no a una
entidad territorial), y mantiene su propio registro. Nace `PENDIENTE`; un funcionario del
**municipio de operación** que declaró lo verifica, rechaza o revoca, todo append-only. La
capa de voluntariados del mapa (spec 002) muestra solo a los `VERIFICADO` con coordenada.

## Technical Context

**Language/Version**: TypeScript `strict`, Next.js 16 (App Router), React 19.

**Primary Dependencies**: Prisma 7 (+ adaptador Neon), Node `crypto` (scrypt), Leaflet
(ya presente por spec 002). Sin dependencias nuevas.

**Storage**: PostgreSQL (Neon) vía Prisma. `schema.prisma` es la única fuente de verdad.

**Testing**: Vitest. Rutas de permiso y la inmutabilidad del historial de verificación
llevan prueba obligatoria (constitución, Flujo de Desarrollo).

**Target Platform**: Vercel (funciones efímeras); vistas críticas usables en gama baja 3G.

**Project Type**: Aplicación web única (una app Next.js, una base Postgres).

**Performance Goals**: registro/login/edición sin dependencia de JS de cliente; coste de
hash calibrado 100–250 ms (reusa `lib/contrasenas.ts`).

**Constraints**: Principios I–IV (ver Constitution Check). Sin autoridad territorial nueva.

**Scale/Scope**: piloto; un puñado de municipios y voluntariados. Un voluntariado declara
**un** municipio de operación.

## Constitution Check

*GATE: pasa antes de Phase 0; re-evaluado tras Phase 1.*

| Principio | Cómo lo cumple el diseño | ¿Pasa? |
|---|---|---|
| I — Trazabilidad append-only | Registro, edición, verificación, rechazo y revocación escriben en `RegistroAuditoria`. La tabla `VerificacionVoluntariado` es inmutable (disparador que rechaza UPDATE/DELETE, como las demás). | ✅ |
| II — Autoridad por nivel territorial | La cuenta de voluntariado no tiene entidad ni nivel; `requerirSesion` (territorial) la rechaza de toda vista operativa. Solo el municipio de operación declarado puede verificar; se decide en el servidor. | ✅ |
| III — Condiciones adversas | Registro, login y edición son server-rendered, sin componentes de cliente, con envío de formulario y `redirect`. | ✅ |
| IV — Mínimo de datos personales (NO NEGOCIABLE) | Solo nombre, correo, contraseña (hash), un contacto y la coordenada de la organización. El voluntario solo ve/edita su propio registro. Ningún dato de persona afectada. | ✅ |
| V — Simplicidad | Se extiende `Usuario` en vez de crear un subsistema de cuentas nuevo; se reutilizan sesiones, hash y login. Sin dependencias nuevas. | ✅ |

**Punto de integridad (Stack técnico)**: `Usuario` pasa a pertenecer **o** a una entidad
territorial **o** a un actor voluntariado. La garantía "exactamente uno" MUST vivir en la
base como restricción `CHECK`, no solo en la aplicación.

Sin violaciones que justificar (Complexity Tracking vacío).

## Project Structure

### Documentation (this feature)

```text
specs/003-autorregistro-voluntarios/
├── plan.md              # Este archivo
├── research.md          # Phase 0: decisiones de diseño
├── data-model.md        # Phase 1: entidades y cambios de esquema
├── quickstart.md        # Phase 1: guía de validación
├── contracts/
│   └── rutas.md         # Phase 1: rutas y Server Actions
└── tasks.md             # (lo genera /speckit-tasks, no este comando)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                 # Usuario.entidadId nullable + actorId; Actor + coords,
│                                 # municipioOperacion, estadoVerificacion; VerificacionVoluntariado
└── migrations/<ts>_cuentas_voluntariado/

lib/
├── auth.ts                       # + tipo de sesión de voluntariado; obtenerVoluntario/requerirVoluntario
├── authz.ts                      # + puedeVerificarVoluntariado; rechazo de voluntario en vistas territoriales
├── voluntariados.ts  (nuevo)     # consultas: propio registro, pendientes del municipio, puntos del mapa
├── geo.ts                        # reutilizado (validación de coordenada, de spec 002)
└── verificacion.ts   (nuevo)     # transiciones válidas de estado de verificación (función pura + test)

app/
├── voluntariado/
│   ├── registro/page.tsx         # público: formulario de auto-registro
│   └── page.tsx                  # voluntario autenticado: ve/edita su registro
├── voluntariados/page.tsx        # municipio: lista y verifica/rechaza/revoca
├── actions/
│   └── voluntariados.ts (nuevo)  # registrarVoluntariado, actualizarVoluntariado, verificar/rechazar/revocar
├── actions/sesion.ts             # iniciarSesion bifurca: cuenta territorial vs voluntariado
└── mapa/                         # + capa de voluntariados VERIFICADOS con coordenada

tests/
├── verificacion.test.ts (nuevo)  # transiciones de estado (pura)
├── authz.test.ts                 # + casos de puedeVerificarVoluntariado y rechazo territorial
└── voluntariados.test.ts (nuevo) # inmutabilidad de VerificacionVoluntariado + CHECK de Usuario (contra base)
```

**Structure Decision**: se mantiene la app única. Los voluntarios viven bajo `/voluntariado`
(su espacio) y la gestión municipal bajo `/voluntariados` (vista del funcionario), separando
con claridad las dos autoridades.

## Complexity Tracking

Sin violaciones. La única decisión con peso —`Usuario` con doble pertenencia y sesión como
unión discriminada— se justifica en [research.md](./research.md) frente a la alternativa de
una tabla de cuentas separada, que duplicaría el cableado de sesión, login y hash que ya
cuelga de `Usuario`/`Sesion`.
