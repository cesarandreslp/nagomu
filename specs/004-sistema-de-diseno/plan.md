# Implementation Plan: Identidad visual, sistema de diseño y landing pública

**Branch**: `004-sistema-de-diseno` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-sistema-de-diseno/spec.md`

## Summary

US1 (tokens/identidad) y US3 (barra lateral) **ya están implementados** en esta rama. Este plan
cubre lo que falta: **US2, la landing pública**. La raíz deja de ir directo al login: un visitante
sin sesión ve una landing institucional (navbar, hero, buscador territorial, tres tarjetas de
impacto agregado, footer); un visitante autenticado se redirige a su espacio. Todo server-rendered,
sin depender de JavaScript, reutilizando las libs de dominio que ya existen. Sin datos personales.

## Technical Context

**Language/Version**: TypeScript `strict`, Next.js 16 (App Router), React 19.

**Primary Dependencies**: Prisma 7. Sin dependencias nuevas (Principio V).

**Storage**: PostgreSQL (Neon) vía Prisma. Los agregados se **derivan**; no hay entidades nuevas.

**Testing**: Vitest. Se prueban las funciones puras de agregación y el ruteo de la raíz.

**Target Platform**: Vercel; la landing debe cargar sobre 3G en gama baja, sin bloquearse por JS.

**Project Type**: Aplicación web única.

**Constraints**: Principios III (landing server-rendered, buscador por GET sin JS, sin framework,
tipografía del sistema), IV (impacto agregado, sin datos personales), V (sin dependencias).

## Constitution Check

| Principio | Cómo lo cumple | ¿Pasa? |
|---|---|---|
| I — Trazabilidad | La landing es de solo lectura pública; no escribe nada, no requiere auditoría. | ✅ |
| II — Autoridad territorial | La landing es pública y muestra **agregados**; no expone datos operativos de una entidad a otra. El buscador solo acota cifras agregadas públicas. | ✅ |
| III — Condiciones adversas | Landing y buscador renderizan en el servidor; el buscador es un `<form method="GET">` con selects: funciona sin JavaScript. Sin carrusel ni imágenes pesadas. | ✅ |
| IV — Mínimo de datos personales | Las tres tarjetas son sumas/conteos agregados; ningún dato identifica a una persona. | ✅ |
| V — Simplicidad | Reutiliza libs existentes; sin framework de UI; tipografía del sistema. | ✅ |

Sin violaciones. Complexity Tracking vacío.

## Project Structure

### Documentation (this feature)

```text
specs/004-sistema-de-diseno/
├── design-system.md   # brief (paleta/estructura)
├── spec.md            # qué/por qué
├── plan.md            # este archivo
├── research.md        # decisiones de US2
├── contracts/rutas.md # raíz pública + buscador
├── quickstart.md      # validación de la landing
└── tasks.md           # (lo genera /speckit-tasks)
```

### Source Code (repository root)

```text
lib/
└── impacto.ts   (nuevo)   # resumenImpacto(scope): fondos asignados, % ejecucion, alertas

app/
├── page.tsx     (modificado)  # raíz: landing si no hay sesión; si la hay, redirige al espacio
├── landing/     (componentes de la landing, o inline en page.tsx)
│   ├── navbar, hero, buscador-territorial, tarjetas-impacto, footer
└── globals.css  (modificado)  # estilos de navbar/hero/tarjetas/footer (tokens ya existen)

tests/
└── impacto.test.ts (nuevo)    # agregados puros y ruteo de scope
```

**Structure Decision**: la landing vive en la raíz (`app/page.tsx`) con sus piezas como
componentes server. El buscador es un formulario GET que recarga la propia raíz con parámetros de
territorio.

## Complexity Tracking

Sin violaciones que justificar.
