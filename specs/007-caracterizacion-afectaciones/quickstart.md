# Quickstart: validar la caracterización integral de afectaciones

**Fecha**: 2026-08-19 | **Plan**: [plan.md](./plan.md)

Guía de validación de extremo a extremo. Referencias: [contracts/rutas.md](./contracts/rutas.md),
[data-model.md](./data-model.md). Atender los candados de la enmienda 4.0.0.

## Prerrequisitos

- Base de dev con el seed; migración `caracterizacion` aplicada.
- Servidor de desarrollo levantado.

## Escenario 1 — Registrar bienes de varios tipos (US1)

1. Entrar como `buga@nagomu.test`. En el registro de bien afectado, crear:
   - una **vivienda** con dirección, corregimiento/vereda y coordenada;
   - un **cultivo perdido** (agropecuario) con lugar general, sin coordenada;
   - una **estructura pública** con categoría (que además se vuelve obra).
2. **Esperado**: los tres quedan en el inventario de Buga; solo la estructura pública tiene obra/cola;
   el cultivo no. La acción se audita.

**Público/reservado**:
- Abrir `/censo` (sin sesión) y verificar que NO aparece ninguna **dirección**; sí el punto, el
  lugar general, el tipo y la afectación.
- Subir una foto con GPS → se guarda sin metadatos.

## Escenario 2 — Caracterización del hogar y salud (US2)

1. En una vivienda afectada, registrar **dos familias** (dos hogares sobre el mismo inmueble) con su
   composición.
2. Registrar una **necesidad de salud** categorizada:
   - **sin** autorización de tratamiento → se rechaza;
   - **con** autorización → se guarda solo la categoría (nunca diagnóstico).
3. **Esperado**: el hogar muestra su necesidad para referir; otro municipio no ve nada del hogar.

## Escenario 3 — Censo público (US3)

1. Sin sesión, abrir `/censo` de un municipio (y del departamento).
2. **Esperado**: cantidades por tipo de bien y afectación, puntos en el mapa, lugar general. Ninguna
   dirección, nombre ni dato de persona. Un bien sin coordenada aparece contado por lugar general.
3. Recargar con JavaScript deshabilitado → el censo sigue usable.

## Escenario 4 — Aislamiento por ámbito (Principio II)

1. Como gobernación, ver la caracterización de su departamento.
2. **Esperado**: solo agregados por municipio; ningún detalle reservado (dirección, hogar, salud).

## Pruebas automatizadas que deben existir

- `tests/censo.test.ts`: una consulta pública **nunca** selecciona `ubicacion`, dueño ni detalle de
  hogar (falla si alguien agrega un campo reservado al select público).
- `tests/damnificados.test.ts`: "necesidad de salud ⇒ autorización" (contra base).
- `tests/bienes.test.ts`: tipos/estado; un municipio no ve el detalle de otro.

## Criterios de salida

Los cuatro escenarios pasan, las pruebas obligatorias en verde, `prisma migrate status` al día, y el
censo público carga sin JavaScript.
