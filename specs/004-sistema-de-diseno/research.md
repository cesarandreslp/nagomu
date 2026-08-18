# Research: landing pública (US2)

**Fecha**: 2026-08-18 | **Plan**: [plan.md](./plan.md)

Decisiones para la landing. US1 y US3 ya están implementados; aquí solo se resuelve US2.

---

## D1. De dónde salen las tres tarjetas de impacto (agregados)

Definiciones confirmadas con el usuario. Todo se calcula filtrando por el territorio elegido en el
buscador (o nacional por defecto). Ninguna toca datos personales (Principio IV).

**Decisión**: una función `resumenImpacto(scope)` en `lib/impacto.ts` que devuelve las tres cifras:

1. **Fondos asignados** = suma de `Aporte.monto` de los aportes **no anulados** (un aporte está
   anulado si otra fila lo corrige) cuyas obras están en el territorio. Se agrega con una consulta
   sumando `monto` y restando las correcciones, reutilizando el criterio de `aportesVigentes`
   (`lib/brecha.ts`).
2. **% de ejecución** = obras en estado `ENTREGADA` ÷ total de obras del territorio, por conteo
   (dos `count` de Prisma). Si no hay obras, 0% (no división por cero).
3. **Alertas** = obras **costeadas sin ningún aporte vigente** (proxy de "sin financiación") +
   municipios con **capacidad fiscal vencida** (>12 meses, `capacidadVencida` de `lib/financiacion`).

**Rationale**: reutiliza las libs de dominio ya probadas. Son consultas de agregación baratas
(sumas y conteos), aptas para una página pública.

**Alternativa descartada para las alertas**: correr `colaDelMunicipio` por cada municipio para
detectar "sin financiación previsible" del horizonte. Es correcto pero **caro a escala nacional**
(recalcula la cola completa por municipio en cada visita pública). El proxy (obra costeada sin
aporte + capacidad vencida) captura el mismo riesgo con un par de conteos. Se anota como
`ponytail:` para subir a la definición exacta si el piloto lo exige y hay caché.

---

## D2. El buscador territorial en cascada sin JavaScript

**Decisión**: un `<form method="GET" action="/">` con dos `<select>` — departamento y municipio —
y un botón. Al enviar, la raíz se recarga con `?departamento=<id>&municipio=<id>` y el servidor
acota `resumenImpacto` al territorio más específico presente. Sin municipio pero con departamento,
acota al departamento; sin ninguno, nacional.

**Rationale**: un `<form>` GET recarga la página en el servidor; funciona sin JavaScript
(Principio III). La "cascada" es lógica (nación → departamento → municipio) aunque los selects
muestren todas las opciones: no se necesita filtrado en cliente para que sirva.

**Alternativa descartada**: cascada dependiente en cliente (al elegir departamento se filtran los
municipios) — requiere JavaScript; quedaría como mejora progresiva, no como base.

**Nota**: los municipios se muestran con su departamento entre paréntesis para desambiguar sin JS.

---

## D3. Ruteo de la raíz: landing vs redirección

**Decisión**: `app/page.tsx` llama `obtenerCuenta()`:
- Sin cuenta → renderiza la landing.
- Funcionario → `redirect("/")`... no: redirige a `/obras` (municipio) o `/departamento`
  (gobernación/nación), como hace hoy `requerirSesion` en la raíz.
- Voluntariado → `redirect("/voluntariado")`.

**Rationale**: la landing es para el público; quien ya entró va directo a trabajar. Reutiliza
`obtenerCuenta` (de spec 003). El login y los espacios internos no cambian.

**Alternativa descartada**: landing en una ruta aparte (`/inicio`) y raíz siempre al login —
menos natural; la raíz pública es lo que un ciudadano teclea.

---

## D4. Estructura visual (reutiliza tokens de US1)

**Decisión**: navbar + hero + buscador + tarjetas + footer como componentes server dentro de la
raíz, estilizados con los tokens azules ya definidos. Footer en `--azul-nacion`. Sin fotografía
pesada ni carrusel (Principio III; ver assumptions del spec). La tipografía sigue siendo del
sistema.

**Rationale**: US1 ya dejó la paleta; la landing solo agrega layout. Cero dependencias nuevas.

---

## D5. Qué se prueba

**Decisión**: `tests/impacto.test.ts` cubre la lógica pura de agregación con datos controlados
(contra base, en transacción revertida, como los demás tests de datos): fondos asignados suma solo
lo no anulado; % ejecución cuenta ENTREGADA sobre total; alertas cuentan los casos definidos. El
ruteo de scope (qué territorio se elige según los parámetros) se prueba como función pura si se
extrae; si no, se valida en quickstart.

**Rationale**: los agregados públicos son cifras de fiscalización: una suma mal hecha engaña. Es
justo lo que merece prueba automatizada.
