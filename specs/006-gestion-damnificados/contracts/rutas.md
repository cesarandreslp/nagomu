# Contrato de rutas y Server Actions: gestión municipal de damnificados

**Fecha**: 2026-08-19 | **Plan**: [plan.md](../plan.md)

Convención de spec 001: sin API pública; el contrato son rutas HTML y Server Actions por
formulario. Cada acción autoriza en el servidor antes de tocar datos, audita permita o rechace, y
termina en `redirect`. **Ningún dato personal viaja en la URL** (Principio IV): los ids son opacos
y el detalle solo lo ve el municipio dueño.

---

## Rutas de lectura

| Ruta | Quién | Qué muestra |
|---|---|---|
| `GET /damnificados` | Municipio | Sus hogares registrados (acotado a su territorio) + resumen; botón de export |
| `GET /damnificados/nuevo` | Municipio | Formulario de registro (server-rendered; foto/geolocalización como mejora progresiva) |
| `GET /damnificados/[hogarId]` | Municipio dueño | Ficha del hogar: datos, autorización, ayudas, supresión |
| `GET /departamento` (spec 005) | Gobernación, Nación | + conteos agregados de damnificados por municipio (sin detalle) |

**Cortes de acceso** (Principio II): `/damnificados*` exige `nivel = MUNICIPIO`; un `hogarId` de
otro municipio → negado y auditado. Gobernación/Nación NO acceden al detalle, solo a agregados.

**Sin JavaScript**: registro, consulta y export funcionan por formulario. Foto y geolocalización
son mejora progresiva (Principio III).

---

## Acciones de escritura

### `registrarHogar`

Campos: `responsableNombre`, `inmuebleId?`, conteos (`personasTotal`, `personasNinez`,
`personasAdultoMayor`, `personasDiscapacidad`), `hayHeridos`, `hayFallecidos`, `documento?`,
`autorizaTratamiento?` (+ `medioAutorizacion?`), `foto?`.

- Autoriza: `nivel = MUNICIPIO`; el hogar se crea con `municipioId = sesión.entidadId`.
- **Documento solo con autorización** (D1): si llega `documento` sin `autorizaTratamiento`, el
  documento NO se guarda (se registra el hogar sin él) o se pide la autorización; nunca se guarda
  el documento sin la constancia.
- Foto opcional → `@vercel/blob` privado. Audita `damnificado.registrar` (sin datos personales en
  el asiento). → `redirect("/damnificados/[hogarId]")`.

### `actualizarHogar` / `otorgarAutorizacion`

- Solo el municipio dueño. `otorgarAutorizacion` crea/actualiza `AutorizacionTratamiento` y habilita
  guardar el documento. Auditan `damnificado.actualizar` / `damnificado.autorizar`.

### `asignarAyuda` / `cambiarEstadoAyuda`

- Solo el municipio dueño. Asocia una `OfertaInstitucional` al hogar con estado `PENDIENTE`, o pasa
  a `ENTREGADA` con fecha. Audita `damnificado.ayuda`.

### `suprimirHogar`  (hábeas data)

- Solo el municipio dueño. Borra `documento` y `responsableNombre` (o la fila) y audita
  `damnificado.suprimir` con el **hecho**, sin conservar lo borrado (D4).

### `exportarDamnificados`

- Solo el municipio dueño, sobre su propio registro. Genera **CSV** y **Excel (SpreadsheetML XML)**.
  La descarga pasa por la aplicación (auditada `damnificado.exportar`), nunca un enlace directo al
  blob. El archivo lleva nota de tratamiento reservado.

---

## Matriz de autorización (para prueba)

| Acción | Municipio dueño | Otro municipio | Gobernación / Nación |
|---|---|---|---|
| Ver/editar detalle del hogar | ✅ | ❌ (audita) | ❌ (audita) |
| Registrar / asignar ayuda / suprimir | ✅ | ❌ | ❌ |
| Exportar su registro | ✅ | ❌ | ❌ |
| Ver conteos agregados | ✅ (los suyos) | — | ✅ (su ámbito, sin detalle) |

Pruebas obligatorias (constitución): esta matriz (Principio II) y "documento ⇒ autorización"
(Principio IV).
