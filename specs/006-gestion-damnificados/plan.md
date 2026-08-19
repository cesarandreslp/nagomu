# Implementation Plan: Gestión municipal de damnificados

**Branch**: `006-gestion-damnificados` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-gestion-damnificados/spec.md`

## Summary

Registro municipal de damnificados que le devuelve al municipio la trazabilidad que el RUD
nacional no le da. Es el área **más sensible** del sistema: el plan gira en torno a los candados
del Principio IV (enmienda 3.0.0). Modelo nuevo pequeño (`HogarDamnificado`,
`AutorizacionTratamiento`, `AyudaAHogar`), acceso acotado al municipio dueño (reutiliza el
filtro por ámbito), agregados hacia arriba sin detalle personal, export a CSV y Excel **sin
dependencia nueva** (CSV nativo + SpreadsheetML XML), y fotos de campo con el `@vercel/blob` que
ya se usa para documentos. Sin recalcular nada; reutiliza inventario, oferta y auditoría.

## Technical Context

**Language/Version**: TypeScript `strict`, Next.js 16 (App Router), React 19.

**Primary Dependencies**: Prisma 7, `@vercel/blob` (ya presente, para fotos). **Sin dependencias
nuevas**: CSV nativo y Excel como SpreadsheetML XML (Principio V).

**Storage**: PostgreSQL (Neon) vía Prisma. Entidades nuevas: `HogarDamnificado`,
`AutorizacionTratamiento`, `AyudaAHogar`. Fotos en Vercel Blob (privado), como los documentos.

**Testing**: Vitest. Pruebas obligatorias (constitución): acceso por ámbito (Principio II) y la
regla "sin autorización no se guarda documento" (Principio IV); ambas contra base.

**Target Platform**: Vercel; registro/consulta usables sin JavaScript sobre 3G; captura rica
(foto, geolocalización) como mejora progresiva (Principio III, enmienda 2.1.0).

**Constraints**: Principios I (auditoría), II (acotado al municipio), III (server-rendered + PE),
IV (mínimo, documento solo con autorización, nada clínico, hábeas data, sin PII en URLs/logs).

## Constitution Check

| Principio | Cómo lo cumple | ¿Pasa? |
|---|---|---|
| I — Trazabilidad | Registro, edición, entrega de ayuda, autorización y supresión escriben en `RegistroAuditoria`, **sin** el dato personal en el asiento. | ✅ |
| II — Autoridad territorial | `HogarDamnificado.municipioId` acota el detalle al municipio dueño; ninguna consulta de detalle cruza municipios; los niveles superiores solo reciben conteos agregados. Filtro en el servidor. | ✅ |
| III — Condiciones adversas | Registro y consulta server-rendered, usables sin JS; foto/geolocalización como mejora progresiva sobre la base. | ✅ |
| IV — Mínimo de datos (NON-NEGOTIABLE, enmienda 3.0.0) | Unidad hogar; documento **solo** con `AutorizacionTratamiento`; sin nada clínico (solo indicadores); hábeas data (supresión); ningún dato personal en URLs, params, logs ni errores. | ✅ |
| V — Simplicidad | Modelo pequeño; export sin dependencia (CSV + SpreadsheetML); reutiliza blob, inventario, oferta, tablero. | ✅ |

**Punto de integridad**: la regla "documento ⇒ existe autorización" se garantiza en la aplicación
y con una prueba contra base; se evalúa un disparador si el piloto lo exige (una restricción
cruzada entre tablas no es un `CHECK` simple).

Sin violaciones. Complexity Tracking vacío.

## Project Structure

```text
prisma/
├── schema.prisma                 # HogarDamnificado, AutorizacionTratamiento, AyudaAHogar + enums
└── migrations/<ts>_damnificados/

lib/
├── damnificados.ts   (nuevo)     # consultas acotadas por ámbito + agregados; regla de autorización
├── export.ts         (nuevo)     # a CSV y a SpreadsheetML XML (Excel), puros, con test
└── authz.ts          (modificado)# puedeEditarDamnificados (solo municipio dueño)

app/
├── damnificados/
│   ├── page.tsx                  # lista del municipio (acotada) + resumen
│   ├── nuevo/page.tsx            # registro del hogar (server-rendered; foto/geo progresivas)
│   └── [hogarId]/page.tsx        # ficha del hogar: datos, ayudas, autorización, supresión
├── actions/
│   └── damnificados.ts (nuevo)   # registrar, actualizar, autorizar, ayuda (asignar/estado),
│                                 # suprimir (hábeas data), exportar
└── (tablero/consolidado)         # + conteos agregados de damnificados por municipio

tests/
├── export.test.ts    (nuevo)     # CSV y SpreadsheetML (puro)
├── authz.test.ts     (modificado)# puedeEditarDamnificados (dueño sí, otros no)
└── damnificados.test.ts (nuevo)  # sin autorización no hay documento; supresión; acceso por ámbito (base)
```

**Structure Decision**: una sección `/damnificados` acotada al municipio, enlazada desde su
tablero (spec 005). Los agregados suben al consolidado (spec 005) como conteos. El detalle nunca
sale del municipio.

## Complexity Tracking

Sin violaciones. La decisión con peso —permitir el documento— ya la habilitó la enmienda 3.0.0 con
sus candados; el plan solo los implementa. El export evita dependencia nueva (research D2).
