# Implementation Plan: Caracterización integral de afectaciones

**Branch**: `007-caracterizacion-afectaciones` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-caracterizacion-afectaciones/spec.md`

## Summary

Feature grande pero muy apoyada en lo que ya existe. **Generaliza `ItemInventario`** a "bien
afectado de cualquier tipo" (vivienda, comercio, estructura pública, agropecuario) sin romper la
cola de obras: `Obra` ya es opcional en el ítem y `categoria` pasa a opcional (solo la infra
pública con categoría se vuelve obra). Añade la **clasificación público/reservado** (dirección
reservada; punto + lugar general públicos) y la **geografía sub-municipal** (corregimiento/vereda).
La **caracterización del hogar** reutiliza `HogarDamnificado` (que ya admite varias familias por
inmueble) y le suma un **indicador categorizado de necesidad de salud**, con la
`AutorizacionTratamiento` que ya existe (spec 006). El **censo público** es una vista sin sesión
que consulta solo campos públicos, extendiendo mapa (002) y landing (004). Fotos sin metadatos con
`lib/imagen.ts` (006). Enmienda 4.0.0 es la puerta.

## Technical Context

**Language/Version**: TypeScript `strict`, Next.js 16, React 19.

**Primary Dependencies**: Prisma 7, `@vercel/blob` (fotos, existente). **Sin dependencias nuevas**.

**Storage**: PostgreSQL (Neon) vía Prisma. Cambios: generalizar `ItemInventario`; entidad/campos de
salud categorizada; campos de lugar general. Reutiliza `HogarDamnificado`/`AutorizacionTratamiento`.

**Testing**: Vitest. Pruebas obligatorias (constitución): la **clasificación público/reservado** (que
la dirección nunca sale en lo público), "salud ⇒ autorización", y el acceso por ámbito (II).

**Target Platform**: Vercel; captura server-rendered usable sin JS; foto/geolocalización como mejora
progresiva (III, enmienda 2.1.0).

**Constraints**: Principios I (auditoría), II (detalle acotado al municipio; agregados hacia
arriba), III (server-rendered + PE), IV (público/reservado, salud/documento solo con autorización,
sin nada clínico salvo el indicador categorizado, hábeas data, foto sin metadatos).

## Constitution Check

| Principio | Cómo lo cumple | ¿Pasa? |
|---|---|---|
| I — Trazabilidad | Registro/edición/supresión de bienes y del hogar escriben en `RegistroAuditoria`, sin datos personales en el asiento. | ✅ |
| II — Autoridad territorial | El detalle reservado (dirección, dueño, hogar, salud) acotado al municipio dueño; los niveles superiores y el censo público solo reciben agregados/campos públicos. Filtro en el servidor. | ✅ |
| III — Condiciones adversas | Captura y censo server-rendered, usables sin JS; foto/geolocalización como mejora progresiva. | ✅ |
| IV — Mínimo (NON-NEGOTIABLE, 4.0.0) | Público/reservado aplicado en las consultas; dirección nunca pública; salud como indicador categorizado solo con autorización; foto sin metadatos; hábeas data. | ✅ |
| V — Simplicidad | Generaliza el modelo existente en vez de duplicar; reutiliza 006 (hogar, autorización, imagen), 002 (mapa), 004 (landing); sin dependencias. | ✅ |

**Punto de integridad**: "salud ⇒ autorización" y "público nunca incluye dirección" se garantizan en
la aplicación y con pruebas contra base (reglas cruzadas / de clasificación, no `CHECK` simples).

Sin violaciones. Complexity Tracking vacío.

## Project Structure

```text
prisma/
├── schema.prisma                 # ItemInventario: + tipoBien, subtipoBien, estadoAfectacion,
│                                 #   corregimiento, vereda; categoria → opcional. Ubicacion = reservado.
│                                 # NecesidadSalud (categorizada) ligada a HogarDamnificado.
└── migrations/<ts>_caracterizacion/

lib/
├── bienes.ts        (nuevo)      # registrar/consultar bienes por ámbito; separacion publico/reservado
├── censo.ts         (nuevo)      # agregados públicos por territorio (sin campos reservados)
├── damnificados.ts  (modificado) # + necesidad de salud categorizada (con autorización)
└── imagen.ts        (reutilizado)# fotos sin metadatos (spec 006)

app/
├── bienes/           (o extiende /obras/nueva)   # registro de bien de cualquier tipo
├── censo/page.tsx    (nuevo, público sin sesión) # censo de transparencia (extiende landing/mapa)
├── damnificados/[hogarId]  (modificado)          # + necesidad de salud
└── mapa/ , page.tsx (landing)                    # + capa/censo de bienes por tipo

tests/
├── censo.test.ts    (nuevo)      # una consulta pública NUNCA selecciona direccion/dueño/persona
├── bienes.test.ts   (nuevo)      # tipos/estado; acceso por ámbito
└── damnificados.test.ts (modif.) # "necesidad de salud ⇒ autorización"
```

**Structure Decision**: se generaliza `ItemInventario` (no se crea un modelo paralelo). La infra
pública sigue con `categoria` + `Obra` + cola (spec 001 intacto); los demás bienes existen como
ítems sin obra. El censo público vive en `/censo`, sin sesión.

## Complexity Tracking

Sin violaciones. La decisión con peso —generalizar `ItemInventario` en vez de crear `BienAfectado`
aparte— se justifica en [research.md](./research.md): el ítem ya tiene `Obra?` opcional y
`HogarDamnificado[]`, así que reutilizar evita duplicar el inventario y el mapa.
