# Quickstart: validar la landing pública (US2)

**Fecha**: 2026-08-18 | **Plan**: [plan.md](./plan.md)

Guía de validación de extremo a extremo. Referencias: [contracts/rutas.md](./contracts/rutas.md),
[research.md](./research.md).

## Prerrequisitos

- Base de desarrollo con el seed (municipios, fondos, obras, aportes de ejemplo).
- Servidor de desarrollo levantado.

## Escenario 1 — Un visitante sin sesión ve la landing

1. Sin sesión, abrir `GET /`.
2. **Esperado**: la landing (no el login): navbar con "Ingresar a la Plataforma", hero, buscador
   territorial, tres tarjetas de impacto (nacional), footer. El botón lleva a `/login`.

## Escenario 2 — El buscador acota el resumen (sin JavaScript)

1. Con JavaScript deshabilitado, en la landing elegir un departamento y enviar.
2. **Esperado**: la raíz recarga con `?departamento=<id>` y las tarjetas muestran las cifras de ese
   departamento. Elegir además un municipio y enviar → cifras del municipio.
3. **Prueba negativa**: un id inexistente en la URL cae al nivel superior sin error.

## Escenario 3 — Solo agregados, sin datos personales

1. Inspeccionar las tres tarjetas y el marcado de la landing.
2. **Esperado**: solo sumas y conteos; ningún nombre, documento ni ubicación de persona.

## Escenario 4 — Un autenticado no ve la landing

1. Con sesión de funcionario (p. ej. `buga@nagomu.test`), abrir `/`.
2. **Esperado**: redirige a `/obras` (municipio). Una gobernación va a `/departamento`; un
   voluntariado, a `/voluntariado`.

## Escenario 5 — Sin datos, ceros legibles

1. Acotar a un municipio sin obras ni aportes.
2. **Esperado**: "$ 0", "0% ejecutado", "0 alertas" — no espacios vacíos ambiguos.

## Pruebas automatizadas que deben existir

- `tests/impacto.test.ts` (contra base, transacción revertida): fondos asignados suman solo lo no
  anulado; % ejecución cuenta ENTREGADA sobre total; alertas cuentan obras costeadas sin aporte y
  capacidad vencida.

## Criterios de salida

Los cinco escenarios pasan, la landing carga sin JavaScript, y `tsc`/`vitest` en verde.
