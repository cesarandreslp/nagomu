# Quickstart: validar la gestión municipal de damnificados

**Fecha**: 2026-08-19 | **Plan**: [plan.md](./plan.md)

Guía de validación de extremo a extremo. Referencias: [contracts/rutas.md](./contracts/rutas.md),
[data-model.md](./data-model.md). Área sensible: prestar atención a los candados del Principio IV.

## Prerrequisitos

- Base de desarrollo con el seed (municipios, oferta institucional, algún ítem de inventario).
- Migración `damnificados` aplicada.
- Servidor de desarrollo levantado.

## Escenario 1 — Registrar un hogar (US1)

1. Entrar como `buga@nagomu.test` (municipio). Abrir `GET /damnificados/nuevo`.
2. Registrar un hogar: responsable, inmueble (uno de Buga), conteos, indicadores.
3. **Esperado**: el hogar queda en el registro de Buga; la acción se audita; aparece en
   `/damnificados`.

**Documento y autorización**:
- Intentar guardar el documento **sin** marcar autorización → el documento NO se guarda.
- Marcar la autorización de tratamiento y guardar el documento → se guarda.

## Escenario 2 — Aislamiento por municipio (Principio II)

1. Entrar como `sipi@nagomu.test` (otro municipio). Intentar abrir el `hogarId` de Buga por URL.
2. **Esperado**: acceso negado y auditado; Sipí no ve ningún hogar de Buga.

## Escenario 3 — Ayudas por hogar (US2)

1. En la ficha del hogar, asignar una ayuda de la oferta como `PENDIENTE` y otra como `ENTREGADA`.
2. **Esperado**: la ficha muestra recibido/pendiente; el resumen del municipio cuenta hogares
   atendidos/pendientes por tipo (agregado).

## Escenario 4 — Agregados hacia arriba, sin detalle (US3)

1. Entrar como `valle@nagomu.test` (gobernación). Ver damnificados de su ámbito.
2. **Esperado**: solo **conteos** por municipio; ningún nombre ni documento; el detalle de un hogar
   es inaccesible.

## Escenario 5 — Export CSV y Excel (US3)

1. Como Buga, exportar el registro.
2. **Esperado**: se descargan un CSV y un archivo Excel (SpreadsheetML) con sus hogares y ayudas;
   la descarga queda auditada; el archivo lleva nota de tratamiento reservado.

## Escenario 6 — Hábeas data (supresión)

1. En la ficha de un hogar, ejecutar la supresión.
2. **Esperado**: el documento y el nombre se eliminan; queda un asiento de auditoría del hecho, sin
   conservar lo borrado.

## Pruebas automatizadas que deben existir

- `tests/damnificados.test.ts` (contra base): "documento ⇒ existe autorización"; supresión elimina
  el dato; un municipio no accede al detalle de otro.
- `tests/authz.test.ts`: `puedeEditarDamnificados` (dueño sí; otro municipio, gobernación, nación,
  no).
- `tests/export.test.ts` (puro): CSV y SpreadsheetML generados correctamente.

## Criterios de salida

Los seis escenarios pasan, las pruebas obligatorias en verde, `prisma migrate status` al día, y
ninguna vista rompe sin JavaScript.
