# Contrato de rutas y Server Actions: caracterización integral de afectaciones

**Fecha**: 2026-08-19 | **Plan**: [plan.md](../plan.md)

Convención de spec 001: sin API pública; rutas HTML + Server Actions por formulario. Cada acción
autoriza en el servidor, audita, y termina en `redirect`. **Ningún dato reservado (dirección, dueño,
persona) viaja en la URL ni sale en una vista pública** (Principio IV, 4.0.0).

---

## Rutas de lectura

| Ruta | Quién | Qué muestra |
|---|---|---|
| `GET /obras` (extendida) | Municipio | Su inventario de bienes de todo tipo (público + reservado, por ser el dueño) |
| `GET /obras/nueva` (extendida) | Municipio | Registro de un bien: tipo/subtipo, afectación, estado, punto/geo, corregimiento/vereda, dirección (reservada), foto |
| `GET /damnificados/[hogarId]` (extendida, spec 006) | Municipio dueño | + necesidad de salud categorizada del hogar |
| `GET /censo` | **Público (sin sesión)** | Censo de transparencia: cantidades por tipo de bien y afectación, puntos en el mapa, lugar general. **Nunca** dirección ni persona |
| `GET /` (landing) y `GET /mapa` | Público / Autenticado | + capas/cifras del censo por tipo de bien |

**Cortes**: el detalle reservado (dirección, hogares, salud) solo lo ve el municipio dueño; el
censo público y los niveles superiores solo campos públicos/agregados (Principio II).

**Sin JavaScript**: registro y censo funcionan por formulario/servidor. Foto y geolocalización son
mejora progresiva (Principio III).

---

## Acciones de escritura

### `registrarBien` (extiende `crearItemInventario`)

Campos: `nombre`, `sector` (doliente, enum fijo), `tipoBien` (tipo concreto, **texto libre**),
`estadoAfectacion?`, `categoria?` (solo sectores de obra pública), `descripcionDano`, `corregimiento?`,
`vereda?`, `latitud?`/`longitud?`, `ubicacion?` (dirección, reservada), `foto?`.

- Autoriza: `nivel = MUNICIPIO`; el bien se crea con `municipioId = sesión.entidadId`.
- Solo si `sector` es de obra pública (transporte, gestión del riesgo, educación, salud, agua,
  cultura, deporte) **y** hay `categoria` se crea también la `Obra` (cola, spec 001). Vivienda,
  comercio y agropecuario se registran sin obra.
- Foto → `lib/imagen.ts` (sin metadatos) → `@vercel/blob` privado. Audita `bien.registrar`.

### `registrarNecesidadSalud` (en la ficha del hogar, spec 006)

Campos: `hogarId`, `tipo` (lista cerrada).

- Solo el municipio dueño. **Requiere** `AutorizacionTratamiento` otorgada del hogar; si no, se
  rechaza (D4). Crea `NecesidadSalud`. Audita `hogar.necesidadSalud` (sin el detalle en el asiento).

### Hábeas data / edición

- Como spec 006: rectificar/suprimir el dato personal del hogar; la supresión borra el reservado y
  deja constancia del hecho.

---

## Matriz de clasificación (para prueba)

| Vista | Municipio dueño | Otro municipio / nivel superior | Público (sin sesión) |
|---|---|---|---|
| Dirección (`ubicacion`) | ✅ | ❌ | ❌ (nunca) |
| Punto + lugar general + tipo + afectación | ✅ | ✅ (agregado) | ✅ |
| Detalle del hogar / necesidad de salud | ✅ | ❌ | ❌ |
| Cantidades por tipo/afectación | ✅ | ✅ | ✅ |

Pruebas obligatorias (constitución): que una **consulta pública nunca selecciona un campo
reservado** (Principio IV), "necesidad de salud ⇒ autorización", y el acceso por ámbito (II).
