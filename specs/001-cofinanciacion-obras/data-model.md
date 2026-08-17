# Data Model: Cofinanciación priorizada de obras de reconstrucción

**Fecha**: 2026-08-16 | **Plan**: [plan.md](./plan.md)

Todos los montos son `Decimal(18,2)`. Todos los identificadores son opacos (cuid), nunca
consecutivos ni derivados de datos personales. Todas las marcas de tiempo las pone el servidor.

---

## Entidades de referencia

### EntidadTerritorial

Municipio, gobernación o nación.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `nombre` | texto | "Buga", "Gobernación del Valle del Cauca", "Nación" |
| `nivel` | enum | `MUNICIPIO` \| `DEPARTAMENTO` \| `NACION` |
| `departamentoId` | cuid? | Solo en municipios: la gobernación a la que pertenece |
| `nbi` | decimal? | Índice de vulnerabilidad, 0 a 100. Solo en municipios |
| `codigoDane` | texto? | Para cruzar con fuentes oficiales |

**Invariantes**: un `MUNICIPIO` tiene `departamentoId`; un `DEPARTAMENTO` y la `NACION` no.
Existe exactamente una entidad de nivel `NACION`.

### Usuario

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `correo` | texto único | |
| `nombre` | texto | |
| `hashContrasena` | texto | `scrypt`, con sal y parámetros embebidos |
| `entidadId` | cuid | Entidad en cuyo nombre actúa |
| `activo` | booleano | |

Un usuario hereda su ámbito de edición de su entidad. No hay usuarios sin entidad.

### Sesion

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | Valor que viaja en la cookie |
| `usuarioId` | cuid | |
| `creadaEn` / `expiraEn` | fecha | |

Se borra para revocar. Es la única tabla del sistema donde se permite `DELETE`.

### Actor

Quien participa en una obra. Las entidades territoriales participan a través de su propio
registro; los demás actores no tienen usuario.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `tipo` | enum | `ENTIDAD_TERRITORIAL` \| `EMPRESA` \| `FUNDACION` \| `ONG` \| `VOLUNTARIADO` \| `PERSONA_NATURAL` \| `COOPERANTE_INTERNACIONAL` |
| `nombre` | texto | |
| `contacto` | texto? | Un solo dato de contacto. Nada más (Principio IV) |
| `entidadId` | cuid? | Presente solo si `tipo = ENTIDAD_TERRITORIAL` |

**Invariante**: si `tipo = PERSONA_NATURAL`, solo se almacenan `nombre` y `contacto`. No hay
campo para documento de identidad, y no debe agregarse sin enmienda de la constitución.

---

## Inventario y obra

### ItemInventario

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `municipioId` | cuid | Dueño. Un ítem pertenece a un solo municipio |
| `nombre` | texto | "Teatro Municipal", "Escuela vereda El Cairo" |
| `ubicacion` | texto | Descriptiva. Sin coordenadas en esta versión |
| `categoria` | enum | Determina el nivel de prioridad. Ver tabla abajo |
| `descripcionDano` | texto | |
| `personasBeneficiadas` | entero? | Nulo permitido: la obra queda con puntaje incompleto |
| `mesesFueraDeServicio` | entero | |
| `creadoEn` | fecha | |

**Mapa de categoría a nivel de prioridad** (FR-002, FR-003):

| Nivel | Categorías | ODS |
|---|---|---|
| 0 | `SUBSISTENCIA` — no se usa en esta versión | 1, 2, 6 |
| 1 | `MITIGACION_RIESGO`, `ESTRUCTURA_EN_RIESGO` | 11.5, 13 |
| 2 | `SALUD`, `ACUEDUCTO`, `VIA_UNICA_ACCESO` | 3, 6, 9 |
| 3 | `EDUCACION` | 4 |
| 4 | `PRODUCTIVO`, `VIA_SECUNDARIA` | 8, 9 |
| 5 | `CULTURAL`, `RECREATIVO` | 11.4 |

El nivel no se almacena: se deriva de la categoría mediante una tabla en `lib/prioridad.ts`. Así
no puede quedar desincronizado con la categoría ni editarse a mano.

### Obra

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `itemId` | cuid | Uno a uno con el ítem en esta versión |
| `estado` | enum | `IDENTIFICADO` \| `EN_ESTUDIOS` \| `COSTEADO` \| `EN_EJECUCION` \| `ENTREGADA` |
| `costoEstudios` | decimal? | Conocido por cotización, antes del estudio |

**El costo de la obra no vive aquí.** Vive en `CostoObra`, porque tiene historial (FR-013). El
costo vigente es el `CostoObra` más reciente.

**Transiciones válidas** (FR-009):

```
IDENTIFICADO → EN_ESTUDIOS → COSTEADO → EN_EJECUCION → ENTREGADA
```

Ningún salto de etapa. `COSTEADO` requiere al menos un `CostoObra`. Las regresiones no se
modelan como cambio de estado hacia atrás sino como registros nuevos.

### CostoObra — inmutable

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `obraId` | cuid | |
| `valor` | decimal | Lo que determinó el estudio |
| `fechaEstudio` | fecha | |
| `referenciaDocumento` | texto | Respaldo del valor (FR-012) |
| `responsable` | texto | Quién hizo el estudio |
| `registradoPorId` | cuid | Usuario que digitó |
| `creadoEn` | fecha | |
| `corrigeId` | cuid? | Apunta al costo que corrige |

Un `UPDATE` o `DELETE` sobre esta tabla es rechazado por el disparador.

### CambioEstadoObra — inmutable

Un asiento por transición: `obraId`, `estadoAnterior`, `estadoNuevo`, `motivo`, `usuarioId`,
`creadoEn`.

---

## Financiación

### Aporte — inmutable

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `obraId` | cuid | |
| `actorId` | cuid | Quién aporta |
| `registradoPorId` | cuid | Usuario que digitó. Distinto del actor (FR-035) |
| `monto` | decimal | |
| `fecha` | fecha | |
| `estado` | enum | `COMPROMETIDO` \| `GIRADO` \| `EJECUTADO` |
| `origen` | enum | `RECURSOS_PROPIOS` \| `TRASLADO_PRESUPUESTAL` \| `CREDITO` \| `REGALIAS` \| `TRANSFERENCIA_NACIONAL` \| `COOPERACION_INTERNACIONAL` |
| `proyectoAplazado` | texto? | Obligatorio si `origen = TRASLADO_PRESUPUESTAL` (FR-017) |
| `corrigeId` | cuid? | Corrección: fila nueva que referencia la anterior (FR-029) |
| `anulado` | booleano | Derivado: verdadero si otra fila lo corrige |

**Invariante**: `monto > 0`. Una corrección a la baja se expresa con una fila nueva que
referencia la anterior, no con un monto negativo.

**Nota sobre el estado**: cambiar un aporte de `COMPROMETIDO` a `GIRADO` crea una fila nueva
con `corrigeId` apuntando a la anterior. La tabla no se actualiza nunca.

### Intervencion

Trabajo que un actor ejecuta por su cuenta. Tiene trámite de autorización y vigilancia.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `obraId` | cuid | |
| `actorId` | cuid | Quién ejecuta |
| `registradoPorId` | cuid | Funcionario del municipio dueño |
| `alcance` | texto | Qué parte de la obra cubre |
| `valorEquivalente` | decimal | Cuánto deja de haber que financiar (FR-034) |
| `plazoComprometido` | fecha | |
| `responsableTecnico` | texto | |
| `autorizadaPreviamente` | booleano | Falso si se registró después de ejecutada |
| `estadoActual` | enum | Derivado del último `CambioEstadoIntervencion` |

**Estados** (FR-039): `SOLICITADA` → `APROBADA` → `EN_EJECUCION` → `RECIBIDA`. Desde
`SOLICITADA` puede ir a `RECHAZADA`; desde `APROBADA` o `EN_EJECUCION`, a `SUSPENDIDA`.
`RECHAZADA` y `SUSPENDIDA` exigen motivo.

**Regla central** (FR-042): el `valorEquivalente` cuenta como **comprometido** desde `APROBADA`
y como **ejecutado** solo desde `RECIBIDA`. Si pasa a `SUSPENDIDA`, deja de contar y la brecha
se reabre.

### VerificacionCalidad — inmutable

`intervencionId`, `fecha`, `funcionarioId`, `resultado` (`CONFORME` \| `OBSERVACIONES` \|
`NO_CONFORME`), `observaciones`, `creadoEn`.

### CapacidadFiscal — inmutable

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `municipioId` | cuid | |
| `montoAnual` | decimal | |
| `fechaReporte` | fecha | |
| `reportadoPor` | texto | Nombre de quien lo informó desde hacienda (FR-019) |
| `registradoPorId` | cuid | |

La vigente es la de `fechaReporte` más reciente. Se conserva la serie. Si tiene más de doce
meses, la interfaz advierte (FR-022).

---

## Auditoría

### RegistroAuditoria — inmutable

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `usuarioId` | cuid? | Nulo en acciones del sistema |
| `entidadId` | cuid? | Entidad en cuyo nombre se actuó |
| `nivel` | enum? | Nivel territorial del actor |
| `accion` | texto | `obra.crear`, `aporte.registrar`, `intervencion.aprobar`, ... |
| `objetivoTipo` / `objetivoId` | texto / cuid | Sobre qué recayó |
| `resultado` | enum | `PERMITIDO` \| `RECHAZADO` |
| `motivoRechazo` | texto? | |
| `datos` | json | Instantánea de lo relevante. **Sin datos personales** |
| `creadoEn` | fecha | Marca del servidor |

Cubre FR-028 a FR-031. Los intentos rechazados por permisos también se registran, con
`resultado = RECHAZADO`.

---

## Cálculos derivados

No se almacenan. Se calculan en funciones puras a partir de las tablas anteriores.

**Puntaje de prioridad** (`lib/prioridad.ts`):

```
nivel          = mapa[categoria]
factorNbi      = 1 + (nbi ?? 0) / 100
factorTiempo   = min(1 + mesesFueraDeServicio / 12, 2)
puntaje        = personasBeneficiadas × factorNbi × factorTiempo
```

Sin `personasBeneficiadas`, la obra queda marcada "puntaje incompleto" y se ubica al final de su
nivel. Ordenamiento: primero por nivel ascendente, luego por puntaje descendente, luego por
costo por beneficiado ascendente cuando exista, y finalmente por fecha de creación como
desempate determinista.

Los pesos son configurables (FR-008) y su valor vigente es consultable.

**Brecha de una obra**:

```
brecha = costoVigente − (aportes no anulados + intervenciones recibidas)
comprometido = aportes COMPROMETIDO + intervenciones APROBADA o EN_EJECUCION
```

Sin `costoVigente` no hay brecha: la obra muestra "pendiente de estudios" (FR-010).

**Cola de financiación** (`lib/cola.ts`, decisión Q1=B):

Las obras costeadas del municipio se ordenan por prioridad. Se recorre año por año repartiendo
la capacidad fiscal anual: la primera obra con brecha consume hasta cerrarla y el remanente pasa
a la siguiente. De ahí salen, para cada obra, su posición en la cola, el año estimado de inicio y
el de cierre (FR-044).

Los escenarios recalculan la cola completa con los aportes hipotéticos incorporados, de modo que
un aporte a una obra prioritaria adelanta a las que vienen detrás (FR-021).

Horizonte de 30 años. Más allá, "sin financiación previsible". Si la primera obra de la cola
excede la capacidad indefinidamente, la cola se marca bloqueada.
