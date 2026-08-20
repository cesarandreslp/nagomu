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

### 5. Clasificación de habitabilidad del inmueble (fase de evaluación / EDAN) — ✅ EN SPEC 007

**Hueco**: `ItemInventario` no dice si el inmueble es **habitable / reparable / a demoler**. Eso
es justo lo que produce la inspección técnica del EDAN. **Absorbido por el spec 007
(caracterización integral de afectaciones)**, que generaliza el inventario a todo tipo de bien con
su estado. Ya no es un pendiente suelto.

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

### Límite actualizado (tras las enmiendas 3.0.0 y 4.0.0)

> Corrección: la nota anterior ("nagomu no debe almacenar datos de damnificados") era una
> exageración; el usuario la corrigió. El municipio **sí** lleva su registro de damnificados
> (spec 006) y la caracterización integral (spec 007), porque el RUD nacional no le devuelve la
> trazabilidad. Los candados vigentes (Principio IV, enmiendas 3.0.0/4.0.0):

- nagomu **no es el RUD nacional**: lo complementa y lo alimenta (export/API), no lo reemplaza.
- **Público vs reservado**: público = cantidad, tipo, punto geográfico, lugar general; reservado =
  dueño, dirección exacta, persona. La **dirección textual nunca es pública**.
- **Salud**: nada de historia clínica ni diagnóstico; sí un **indicador categorizado de necesidad**
  (lista cerrada) solo para referir, con autorización.
- **Documento y salud** solo con autorización de tratamiento; acceso acotado al municipio dueño;
  hábeas data; fotos sin metadatos.
- La atención a heridos/fallecidos la presta salud/ADRES; nagomu **refiere**, no atiende.

## Otros (por definir con el usuario)

- _(el usuario mencionó que se le ocurren otros; se agregan aquí mañana)_

---

## Estado del proyecto (2026-08-20)

**Constitución**: v4.0.0 (enmiendas: 2.0.0 voluntarios · 2.1.0 mejora progresiva · 3.0.0 registro
de damnificados · 4.0.0 público/reservado + necesidad de salud categorizada).

**`main` integra y verifica**: 001 cofinanciación · 002 mapa · 003 voluntariados · 004
diseño/landing · 005 tablero territorial · 006 gestión municipal de damnificados · **007 US1
(MVP) caracterización de bienes por sector doliente** (255 tests en verde).

**Spec 007 — en curso**:
- **US1 (MVP) — IMPLEMENTADO**: bien afectado clasificado por **sector doliente** (a qué
  ministerio/secretaría sube: Vivienda, Transporte, Gestión del riesgo/UNGRD, Educación, Salud,
  Agua, Agropecuario, Cultura, Comercio, Deporte — lista fija) + **tipo concreto** (texto libre con
  sugerencias, se pueden crear otros). Clasificación público/reservado (dirección reservada; punto y
  lugar general públicos) + geografía sub-municipal (corregimiento/vereda). Registro unificado en
  `/bienes/nuevo`; vista `/bienes`; `lib/censo.ts` (corte público, agrupa por sector). Solo un bien
  de sector de obra pública con categoría entra a la cola (spec 001 intacto).
- **Pendiente en US1**: **foto sin metadatos del bien** (`lib/imagen.ts` ya existe; falta el campo
  `fotoRuta` en `ItemInventario` + la ruta de servido privado, como en spec 006).
- **US2 (sin construir)**: caracterización del hogar — varias familias por vivienda + **necesidad de
  salud categorizada** (entidad `NecesidadSalud` ya está en el esquema; falta acción/vista, con
  `AutorizacionTratamiento`).
- **US3 (sin construir)**: censo público visible en `/censo`, y capas en mapa (002) y landing (004).

**Backlog vivo** (features aún sin spec): #1 solicitud de cofinanciación · #2 asignación
distribuible · #3 cierre de obra con acta · #4 % de cofinanciación · #6 control de acopio de
donaciones · brigadas psicosociales · asistente de trámites ciudadano · ruta de ayuda internacional.
