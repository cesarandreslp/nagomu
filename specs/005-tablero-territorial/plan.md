# Implementation Plan: Tablero territorial por nivel

**Branch**: `005-tablero-territorial` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

## Summary

Feature de composición: casi todo existe. El tablero del **municipio** (US1, MVP) se arma
enriqueciendo su inicio (`/obras`) con: las tarjetas de impacto acotadas (reutiliza
`resumenImpacto`, spec 004), etiquetas ciudadanas de estado, y la situación de financiación por
obra derivada de la **brecha que la cola ya calcula** (spec 001), más los cofinanciadores. El mapa
del territorio ya existe (`/mapa`, filtrado por ámbito). US2 (gobernación) y US3 (nación) aplican
el mismo tablero al consolidado. **Sin entidades nuevas, sin migración.**

## Technical Context

**Language/Version**: TypeScript strict, Next.js 16, React 19. **Sin dependencias nuevas.**

**Storage**: PostgreSQL vía Prisma. No hay cambios de esquema. Todo se deriva.

**Testing**: Vitest. Se prueban las funciones puras nuevas (etiqueta ciudadana, situación de
financiación).

**Constraints**: Principios II (filtro por ámbito en el servidor — ya lo hacen las libs), III
(server-rendered, sin JS; el mapa sigue siendo complemento), IV (agregados/obras, sin datos
personales).

## Constitution Check

| Principio | Cómo lo cumple | ¿Pasa? |
|---|---|---|
| I | Solo lectura; no escribe ni requiere auditoría nueva. | ✅ |
| II | `colaDelMunicipio`, `listarObrasDe`, `resumenImpacto` y las capas del mapa ya filtran por ámbito en el servidor. El tablero no relaja eso. | ✅ |
| III | El tablero es server-rendered; la lista pagina (como hoy); el mapa se enlaza/embebe con su lista esencial. | ✅ |
| IV | Etiquetas de estado, brecha y cofinanciadores (entidades, no personas). Sin datos de afectados. | ✅ |
| V | Reutiliza libs; una etiqueta ciudadana y un derivador de situación de financiación, ambos puros. Sin dependencias. | ✅ |

Sin violaciones.

## Project Structure

```text
lib/
├── estados.ts        (modificado)  # + ETIQUETA_CIUDADANA + situacionFinanciacion(brecha) (puras)
└── financiacion.ts   (modificado)  # colaDelMunicipio incluye cofinanciadores por obra (nombre+monto)

app/
└── obras/page.tsx    (modificado)  # municipio: tarjetas de impacto + etiquetas ciudadanas +
                                    # situacion de financiacion + cofinanciadores + enlace al mapa

tests/
└── estados.test.ts   (modificado o nuevo)  # etiqueta ciudadana y situacion de financiacion
```

**Structure Decision**: US1 enriquece el inicio del municipio (`/obras`), que ya es su tablero de
inventario. US2/US3 (gobernación/nación) enriquecen el consolidado (`/departamento`) con la misma
lógica en increments siguientes.

## Complexity Tracking

Sin violaciones. La situación de financiación se **deriva** de la brecha ya calculada; no se
recalcula distinto (evita divergencia con spec 001).
