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

## #7 — Una caracterización, toda la oferta ✅ HECHO (spec 009)

**Lo que quedó fuera y sigue pendiente**: la **constancia de caracterización** que el hogar pueda
presentar ante otra entidad, los **montos** (la regla dice a qué puerta tocar, no cuánto dan), y la
inscripción automática en el RUD nacional, que depende de un tercero.

### El pedido original

**Pedido del usuario (2026-08-20)**: cuando una persona queda caracterizada, ese registro **ya
sirve** para acceder a la oferta local —secretarías de agricultura y fomento, hacienda, salud,
educación, vivienda, ayudas humanitarias—. El damnificado **no debe volver a registrarse** en cada
entidad para recibir cada ayuda. Y cuando la nación o la gobernación cofinancian algo, **quien
ejecuta es el gobierno local**.

**Qué ya existe** (no hay que construirlo): el hogar caracterizado (`HogarDamnificado`, spec 006),
el catálogo de oferta institucional por entidad (`lib/oferta.ts`, `/oferta`), la asignación de una
ayuda a un hogar con su estado (`AyudaAHogar`, acción `asignarAyuda`) y el agregado por tipo de
ayuda que sube de nivel sin exponer a nadie.

**Qué falta**:
- Que desde el hogar caracterizado se **postule** a cualquier ítem de la oferta con lo ya
  capturado, sin re-digitar: hoy la asignación no se cruza con el catálogo de `lib/oferta.ts`.
- **Elegibilidad calculada**: qué ayudas le corresponden a ese hogar por su caracterización
  (sector del bien, estado de la afectación, composición del hogar), en vez de que el funcionario
  la deduzca leyendo el catálogo entero.
- **Constancia de caracterización** que el hogar pueda presentar ante otra entidad, exponiendo lo
  mínimo que prueba el hecho (Principio IV).
- Dejar explícito que la **ejecución es del municipio** aunque el aporte venga de arriba (hoy está
  implícito: la obra pertenece al municipio dueño y solo él la edita).

**Decisión tomada (2026-08-20)**: la elegibilidad es una **regla pública y auditable**, como la de
prioridad. Es decir: factores y pesos a la vista, recalculable a mano por cualquiera, y cada
veredicto queda en la auditoría append-only. No es un filtro sugerido que el funcionario pueda
ignorar en silencio —si se aparta de la regla, eso también es un hecho auditable con su motivo—.
Eso convierte al #7 en un spec **de reglas**, con su función pura en `lib/` y sus pruebas, igual
que `lib/prioridad.ts`.

## Otros (por definir con el usuario)

- _(el usuario mencionó que se le ocurren otros; se agregan aquí mañana)_

---

## Estado del proyecto (2026-08-20)

**Constitución**: v4.0.0 (enmiendas: 2.0.0 voluntarios · 2.1.0 mejora progresiva · 3.0.0 registro
de damnificados · 4.0.0 público/reservado + necesidad de salud categorizada).

**`main` integra y verifica**: 001 cofinanciación · 002 mapa · 003 voluntariados · 004
diseño/landing · 005 tablero territorial · 006 gestión municipal de damnificados ·
**007 caracterización integral de afectaciones (US1+US2+US3)** · **008 interfaz profesional +
captura de campo sin señal · **009 portada del municipio + elegibilidad auditable**
(295 tests en verde).

**Spec 007 — COMPLETO (US1, US2, US3)**:
- **US1 — bien afectado**: clasificado por **sector doliente** (a qué ministerio/secretaría sube:
  Vivienda, Transporte, Gestión del riesgo/UNGRD, Educación, Salud, Agua, Agropecuario, Cultura,
  Comercio, Deporte — lista fija) + **tipo concreto** (texto libre con sugerencias). Clasificación
  público/reservado y geografía sub-municipal. Registro en `/bienes/nuevo`, listado en `/bienes` y
  **detalle reservado en `/bienes/[bienId]`** con la dirección, el punto y la **foto sin metadatos**
  (verificado: entra un JPG con GPS en el EXIF, sale sin EXIF y sin GPS). Solo un bien de sector de
  obra pública con categoría entra a la cola (spec 001 intacto).
- **US2 — caracterización del hogar**: en el detalle del bien se ven **las familias que habitan el
  inmueble** (varias por vivienda) con su composición. En la ficha del hogar, **necesidad de salud
  categorizada** (lista cerrada: condición crónica, diálisis, embarazo de riesgo, discapacidad,
  oxígeno, otra) que existe **solo** para referir a salud y **solo** con autorización de tratamiento
  otorgada. El candado vive en `registrarNecesidadSalud`, no en la vista, y cinco pruebas contra
  base lo vigilan — incluida una que verifica que la fila **no tiene ningún campo donde quepa un
  diagnóstico**.
- **US3 — censo público**: `/censo`, sin sesión, con buscador territorial por formulario GET.
  Cantidades por sector doliente y por estado, puntos con coordenada y lugar general. Enlazado
  desde la landing y desde el mapa. Verificado contra la base: **ninguna de las direcciones reales
  aparece en el HTML público, y ningún nombre de responsable de hogar tampoco**.

**Spec 008 — implementado**: el sistema de diseño del 004 aplicado a las 23 pantallas (marco único,
tarjetas, pastillas de estado, rejilla de campos, estados vacíos), responsive de 375 px en adelante,
y **captura de campo sin señal** en los dos formularios de terreno: envían por POST a una URL
estable (`/api/captura/bien`, `/api/captura/hogar`) en vez de a una Server Action —cuyo id cambia
en cada despliegue—, la cola vive en el dispositivo y se vacía sola al volver la conexión. Que un
registro capturado una vez entre una sola vez lo garantiza un **índice único** (`claveCaptura`), no
el cliente: probándolo, la versión sin clave registró el mismo bien cuatro veces. Instalable (PWA)
con iconos generados en el build. Pendiente: fotos sin señal, y tablas como tarjeta en móvil.

**Spec 009 — implementado**: **portada del municipio** (`/municipio`) con el orden de la atención
—personas, lo que falta por hacer, lo afectado, con qué se paga— y **elegibilidad auditable**: un
hogar caracterizado ya no vuelve a registrarse para postular. La regla es pura y pública
(`lib/elegibilidad.ts`, publicada en `/oferta#regla`), muestra sus factores, no esconde lo que
descarta, y **no bloquea**: asignar contra ella se puede, y queda en la auditoría con el veredicto
que la regla dio. Multitenencia: era y sigue siendo por fila, resuelta en el servidor.

**Backlog vivo** (features aún sin spec): #1 solicitud de cofinanciación · #2 asignación
distribuible · #3 cierre de obra con acta · #4 % de cofinanciación · #6 control de acopio de
donaciones · brigadas psicosociales · asistente de trámites ciudadano · ruta de ayuda internacional.
