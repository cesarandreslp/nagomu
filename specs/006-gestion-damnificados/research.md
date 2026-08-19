# Research: gestión municipal de damnificados

**Fecha**: 2026-08-19 | **Plan**: [plan.md](./plan.md)

Decisiones de diseño. Las de alcance ya las confirmó el usuario y viven en el spec; aquí van las
técnicas, todas subordinadas a los candados del Principio IV (enmienda 3.0.0).

---

## D1. La regla "sin autorización no hay documento"

**Decisión**: el `documento` del hogar se almacena **solo** si existe una `AutorizacionTratamiento`
otorgada para ese hogar. Se garantiza en la Server Action (no se escribe `documento` sin la
autorización) y con una **prueba contra base**. Se evalúa un disparador de Postgres si el piloto lo
exige.

**Rationale**: es una restricción **cruzada entre tablas** (documento en `HogarDamnificado`,
autorización en otra), que un `CHECK` simple no expresa. La app es el punto único de escritura; la
prueba vigila que la regla no se relaje.

**Alternativa descartada**: guardar el documento y "confiar" en la UI — deja la puerta abierta a
que un camino olvide la autorización. Inaceptable para el dato más sensible.

---

## D2. Export a Excel y CSV sin dependencia nueva

**Decisión**: **CSV** nativo (texto, sin librería) y **Excel** como **SpreadsheetML XML** (el
formato XML que Excel abre nativamente, un solo archivo `.xls` de texto, sin ZIP ni librería). Dos
funciones puras en `lib/export.ts`, con test.

**Rationale**: Principio V. Un `.xlsx` real exige empaquetar ZIP + varios XML → una dependencia
(exceljs/SheetJS). SpreadsheetML da un archivo que Excel abre sin instalar nada y sin dependencia.
CSV además lo abre cualquier herramienta.

**Alternativa descartada**: agregar `exceljs`/`xlsx` — dependencia pesada para lo que un XML de
texto resuelve. Si el piloto exige `.xlsx` estricto, se reconsidera con justificación.

**Cuidado (Principio IV)**: el export incluye datos personales. Solo lo genera el **municipio
dueño** para su propio registro; la descarga pasa por la aplicación (auditada), nunca un enlace
directo. El archivo lleva una nota de tratamiento reservado.

---

## D3. Acceso acotado y agregados hacia arriba

**Decisión**: el **detalle** de un hogar solo lo consulta el municipio dueño
(`municipioId === sesión.entidadId`), reutilizando el patrón de filtro por ámbito. Para gobernación
y nación se exponen **solo conteos agregados** por municipio (una consulta de agregación, sin
seleccionar campos personales).

**Rationale**: Principio II + IV. El detalle personal no sube de nivel nunca; los agregados sí, y
alimentan el tablero territorial (spec 005) que ya muestra cifras por nivel.

---

## D4. Hábeas data (supresión y rectificación)

**Decisión**: rectificar edita el hogar (auditado). Suprimir **elimina** los datos personales del
hogar (documento y nombre) —o la fila completa si el hogar lo pide— y escribe un asiento de
auditoría del **hecho** (se suprimió el hogar X en fecha Y por solicitud), **sin conservar** el
dato suprimido.

**Rationale**: Ley 1581 (derecho de supresión) y Principio IV. La auditoría (Principio I) registra
que ocurrió, no el contenido; así no reintroduce por la puerta de atrás el dato que se borró.

**Nota**: `HogarDamnificado` NO es una tabla append-only (a diferencia de aportes/auditoría);
justamente porque el titular puede pedir supresión. Las ayudas asociadas se anonimizan o se borran
con el hogar.

---

## D5. Fotos e indicadores de campo

**Decisión**: la foto del inmueble/afectación se sube con `@vercel/blob` (privado), reutilizando
`lib/almacenamiento.ts`. Es **mejora progresiva**: el registro funciona sin ella. La
geolocalización del inmueble ya la da spec 002. Los indicadores de salud son **conteos/sí-no**
(`hayHeridos`, `hayFallecidos`), nunca detalle clínico.

**Rationale**: reutiliza almacenamiento existente; respeta III (progresiva) y IV (nada clínico).

---

## D6. Vínculo con inventario y oferta

**Decisión**: `HogarDamnificado.inmuebleId` apunta (opcional) a `ItemInventario` (el inmueble
afectado, con su habitabilidad cuando exista). `AyudaAHogar.ofertaId` apunta a
`OfertaInstitucional`. Así el registro aterriza el inventario y el catálogo a hogares reales sin
duplicar nada.

**Rationale**: reutiliza specs 001/002/003; el municipio ve, en un hogar, su inmueble y sus ayudas.
