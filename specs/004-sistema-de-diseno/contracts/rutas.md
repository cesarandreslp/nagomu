# Contrato de rutas: landing pública (US2)

**Fecha**: 2026-08-18 | **Plan**: [plan.md](../plan.md)

La landing no expone API: su contrato es la ruta HTML de la raíz y un formulario GET.

---

## Ruta

| Ruta | Quién | Qué muestra |
|---|---|---|
| `GET /` | Público sin sesión | Landing: navbar, hero, buscador territorial, tres tarjetas de impacto agregado (nacional por defecto), footer |
| `GET /?departamento=<id>` | Público | La misma landing con el resumen de impacto acotado al departamento |
| `GET /?departamento=<id>&municipio=<id>` | Público | La misma, acotada al municipio |
| `GET /` | Funcionario autenticado | Redirige a `/obras` (municipio) o `/departamento` (gobernación/nación) |
| `GET /` | Voluntariado autenticado | Redirige a `/voluntariado` |

**Vista crítica sin JavaScript**: la landing entera. El buscador es un `<form method="GET">` con
selects; recarga la raíz en el servidor. Sin componentes de cliente.

---

## Buscador territorial (formulario GET)

Campos: `departamento` (select de gobernaciones), `municipio` (select de municipios, con su
departamento entre paréntesis). Botón "Consultar".

- Envía por GET a `/`. El servidor toma el territorio **más específico** presente: municipio si
  viene, si no departamento, si no nación.
- Un `id` inválido o inexistente → se ignora y se cae al nivel superior (no error).
- Sin JavaScript: los selects muestran todas las opciones; la "cascada" es lógica, no dependiente
  del cliente.

---

## Resumen de impacto (agregados, sin datos personales)

Calculado por `resumenImpacto(scope)` (`lib/impacto.ts`), acotado al territorio:

| Tarjeta | Definición | Formato |
|---|---|---|
| Fondos asignados | Suma de aportes no anulados en el territorio | Pesos (formato colombiano) |
| % de ejecución | Obras `ENTREGADA` ÷ total de obras, por conteo | Porcentaje + barra |
| Alertas de retraso | Obras costeadas sin aporte vigente + municipios con capacidad vencida | Conteo (ámbar) |

Ninguna cifra identifica a una persona (Principio IV). Sin obras/aportes, las tarjetas muestran
ceros legibles, no vacíos.
