# Quickstart: validar auto-registro de voluntariados

**Fecha**: 2026-08-18 | **Plan**: [plan.md](./plan.md)

Guía de validación de extremo a extremo. Prueba que la feature funciona; no es código de
implementación. Referencias: [contracts/rutas.md](./contracts/rutas.md),
[data-model.md](./data-model.md).

## Prerrequisitos

- Base de desarrollo con el seed cargado (municipios Buga, Sipí, etc.).
- Migración `cuentas_voluntariado` aplicada.
- Servidor de desarrollo levantado.

## Escenario 1 — Auto-registro y estado inicial (US1)

1. Sin sesión, abrir `GET /voluntariado/registro`.
2. Enviar: nombre "Brigada La Habana", correo nuevo, contraseña, contacto, municipio de
   operación = Buga, coordenada `3.9006, -76.2978`.
3. **Esperado**: queda con sesión iniciada en `/voluntariado`; el registro muestra estado
   **NO VERIFICADO**; existe un asiento de auditoría `voluntariado.registrar`.
4. Cerrar sesión y volver a entrar por `/login` con ese correo → aterriza en `/voluntariado`.

**Prueba negativa**: repetir el registro con el mismo correo → error genérico, sin revelar que
el correo existe. Coordenada `91, 0` → rechazada (`?error=coordenada`).

## Escenario 2 — Aislamiento territorial (Principio II)

1. Con la sesión de voluntariado, abrir `GET /obras`, `GET /departamento` y `GET /voluntariados`.
2. **Esperado**: cada una redirige a `/voluntariado`; queda auditado el intento.
3. Confirmar que el voluntario solo puede editar su propio registro (no hay ruta que reciba el
   id de otro actor).

## Escenario 3 — Verificación municipal (US2)

1. Entrar como `buga@nagomu.test` (municipio de operación declarado).
2. En `GET /voluntariados` aparece "Brigada La Habana" como **pendiente**.
3. **Verificar** → estado `VERIFICADO`; asiento en `VerificacionVoluntariado`.
4. **Rechazar** otro voluntariado sin motivo → bloqueado (`?error=motivo`). Con motivo → queda
   `RECHAZADO` con el motivo.
5. **Revocar** el verificado con motivo → vuelve a no-oficial; el historial conserva verificar y
   revocar, en orden, sin sobrescritura.

**Prueba negativa**: entrar como `sipi@nagomu.test` (otro municipio) e intentar verificar a la
brigada de Buga → negado y auditado.

## Escenario 4 — Solo verificados en el mapa (US3)

1. Con la brigada en `VERIFICADO` y coordenada, abrir `GET /mapa` como Buga → aparece su
   marcador en la capa de voluntariados, distinguible del inventario.
2. Revocar la verificación → recargar `/mapa` → el marcador desaparece.
3. Un voluntariado `VERIFICADO` sin coordenada → no se dibuja, pero sigue en `/voluntariados`.

## Pruebas automatizadas que deben existir (constitución)

- `tests/verificacion.test.ts`: transiciones válidas e inválidas de estado (función pura).
- `tests/authz.test.ts`: `puedeVerificarVoluntariado` (municipio correcto sí, otro no) y rechazo
  de sesión de voluntariado en vistas territoriales.
- `tests/voluntariados.test.ts` (contra base): el `CHECK` de `Usuario` rechaza una cuenta sin
  entidad ni actor y una con ambos; `VerificacionVoluntariado` rechaza UPDATE/DELETE.

## Criterios de salida

Todos los escenarios pasan, las pruebas obligatorias están en verde, y `prisma migrate status`
reporta la base al día.
