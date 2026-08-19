# Pendientes (backlog)

Ideas y huecos identificados, para retomar. No son specs todavía; cuando se decida uno, se
abre con `/speckit-specify` (spec 006 en adelante).

> **Contexto real**: cómo funciona de verdad la atención de un desastre en Colombia (SNGRD,
> Ley 1523) está investigado en
> [investigacion-proceso-gestion-riesgo.md](./investigacion-proceso-gestion-riesgo.md). Léelo
> antes de especificar cualquiera de estos pendientes.

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

## Surgidos de la investigación del proceso real (2026-08-18)

### 5. Clasificación de habitabilidad del inmueble (fase de evaluación / EDAN)

**Hueco**: `ItemInventario` no dice si el inmueble es **habitable / reparable / a demoler**. Eso
es justo lo que produce la inspección técnica del EDAN y define si la obra es reparación o
demolición+reconstrucción. Conecta con la primera pregunta de toda la sesión ("inventario de
viviendas: intervenir vs demoler"). Toca `ItemInventario` (spec 001/002).

### 6. Control de inventario de centros de acopio (donaciones)

**Hueco**: el municipio abre centros de acopio y hoy nagomu no lleva su inventario. El estándar
real es LSS/SUMA (OPS/OMS): registrar la donación (entrada) → clasificar por tipo → existencias en
bodega → salida/distribución → reportes de qué entró y qué se distribuyó. **Conecta con la capa de
"entregas de ayuda agregadas" del spec 002 (US3) que quedó planeada pero sin construir**: el acopio
es el origen de esas entregas.

**Límite (Principio IV)**: donantes (entidades) y bienes sí; beneficiarios como **conteos
agregados** (hogares/personas atendidas), nunca individualizados — coherente con la decisión de
spec 002 ("mapear entregas, no personas"). Toca modelo nuevo (`CentroAcopio`, `Donacion`/entrada,
`SalidaAcopio`/entrega) o el `EntregaAyuda` que ya se había pensado. Ver la investigación, sección
"Donaciones y centros de acopio".

### Límite claro (NO hacer — Principio IV)

nagomu **no debe ser el RUD** ni almacenar datos personales de damnificados (nombres, salud,
ubicación de personas), ni gestionar la atención a heridos/fallecidos (eso es salud/ADRES/UNGRD).
Su rol es catalogar y hacer navegable la **ruta de ayudas** (qué existe, quién certifica, si
requiere RUD) — que ya hace `OfertaInstitucional`. Ver la investigación para el detalle.

## Otros (por definir con el usuario)

- _(el usuario mencionó que se le ocurren otros; se agregan aquí mañana)_

---

## Estado del proyecto al cerrar esta sesión

`main` integra: 001 cofinanciación · enmienda constitucional 2.0.0 · 002 mapa · 003 voluntariados
· 004 diseño/landing · 005 tablero territorial. Todo verificado en navegador y con pruebas en
verde (215 tests). Base de dev con seed cargado (incluye voluntariados de ejemplo en Buga).
