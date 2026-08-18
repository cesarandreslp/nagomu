# Pendientes (backlog)

Ideas y huecos identificados, para retomar. No son specs todavía; cuando se decida uno, se
abre con `/speckit-specify` (spec 006 en adelante).

## Surgidos de las preguntas sobre cofinanciación (2026-08-18)

### 1. Solicitud de cofinanciación (recomendado empezar por aquí)

**Hueco**: hoy no existe un trámite formal. El municipio registra la obra + costo → la brecha
queda visible, y cualquier entidad que quiera aporta por su cuenta. No hay una "solicitud" que
el municipio envíe y un nivel superior apruebe/asigne.

**Idea**: un flujo de solicitud de cofinanciación con dueño y estados (solicitada → en estudio →
aprobada/negada → asignada), auditado (Principio I), con autoridad por nivel (Principio II).
Es lo más parecido a cómo se pide plata pública de verdad.

Toca: `Aporte`/`Obra` (spec 001), authz (`puedeEditarAporte`), y el tablero (spec 005) para
mostrar el estado de la solicitud.

### 2. Asignación distribuible (un monto que se reparte entre varias obras)

**Hueco**: cada `Aporte` es a UNA obra. Si la nación/gobernación manda un solo monto para varias
obras, hoy se registra como varios aportes a mano. No hay una "bolsa" que se reparta.

**Idea**: una "asignación" de un nivel superior que se distribuye entre obras (por prioridad —
como ya hace la cola con la capacidad fiscal del municipio— o a criterio del aportante), generando
los aportes correspondientes de forma trazable.

Toca: `Aporte`, la cola (`lib/cola.ts`, `lib/financiacion.ts`), authz.

## Endurecimientos opcionales

### 3. Cierre de obra con acta

Hoy el municipio pasa la obra a `ENTREGADA` sin exigir el `ACTA_RECIBO` (el tipo de documento
existe pero no es obligatorio). Idea: exigir acta de recibo (y quizá una verificación) antes de
darla por finalizada. Toca `cambiarEstadoObra` en `app/actions/obras.ts`.

### 4. Mostrar el porcentaje de cofinanciación

El aporte se captura en pesos, no en %. El % es derivable (monto ÷ costo). Idea: mostrarlo
calculado en el detalle de la obra y en el tablero (sin cambiar el modelo).

## Otros (por definir con el usuario)

- _(el usuario mencionó que se le ocurren otros; se agregan aquí mañana)_

---

## Estado del proyecto al cerrar esta sesión

`main` integra: 001 cofinanciación · enmienda constitucional 2.0.0 · 002 mapa · 003 voluntariados
· 004 diseño/landing · 005 tablero territorial. Todo verificado en navegador y con pruebas en
verde (215 tests). Base de dev con seed cargado (incluye voluntariados de ejemplo en Buga).
