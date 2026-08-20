# Feature Specification: Situación del municipio y elegibilidad auditable

**Feature Branch**: `main` (implementado directo, como el 008)

**Created**: 2026-08-20

**Status**: Implementado

**Input**: User description: "cuando una persona es caracterizada de una vez ese registro sirve para acceder a la oferta local (sec agricultura y fomento, hacienda, salud, educación, vivienda, ayudas humanitarias, etc.), la idea es que el damnificado no tenga que volver a registrarse para acceder a las ayudas; finalmente si el gobierno o la gobernación cofinancian algo es el gobierno local quien lo ejecuta" + "quiero saber si es multitenant y si entro como el tenant Buga la página inicial de ese tenant me muestra la información propia del municipio durante la atención del siniestro" + "la elegibilidad es auditable".

## Contexto

Dos huecos que se vieron al mirar el sistema desde adentro de un municipio:

1. **La portada era la equivocada.** Al entrar, un municipio aterrizaba en el inventario
   priorizado de obras. Eso es la portada de la **reconstrucción**, que viene después. Durante la
   atención lo que importa es a cuánta gente hay que atender, qué se dañó y qué falta por hacer.
2. **La caracterización no servía para postular.** El hogar quedaba caracterizado y, para cada
   ayuda, alguien tenía que volver a decidir a mano —leyendo el catálogo entero— si le
   correspondía. El damnificado terminaba re-registrándose en cada entidad, que es exactamente lo
   que el registro municipal debía evitar.

Sobre multitenencia: **ya lo era**, por fila y resuelto en el servidor (`municipiosVisiblesPara`,
`lib/authz.ts`), no por base de datos. Lo que faltaba no era aislamiento sino una portada que
usara ese aislamiento para decir algo útil.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La portada de la atención (Priority: P1)

Un funcionario de Buga entra y ve, en este orden: cuántas personas hay que atender, qué falta por
hacer, qué se dañó, y con qué se paga.

**Por qué ese orden**: es el mismo de la regla de prioridad del proyecto. Un tablero que abre con
cifras de dinero mientras hay familias sin ubicar está diciendo lo que le importa.

**Criterios de aceptación**:

1. `/municipio` muestra solo datos del municipio de la sesión; el `municipioId` sale de la sesión.
2. "Lo que falta por hacer" lista pendientes en orden de urgencia, cada uno con su cantidad, por
   qué importa y a dónde ir a resolverlo.
3. **Lo que está al día no aparece.** Un tablero que enumera ceros entrena a la gente para no
   leerlo, y el día que salga un número de verdad tampoco lo van a mirar.
4. Una cantidad grande no adelanta a una urgencia mayor (probado).

### User Story 2 - Una caracterización, toda la oferta (Priority: P1)

Sobre un hogar ya caracterizado, el funcionario ve qué ayudas le corresponden **con lo ya
capturado** y postula desde ahí, sin volver a pedirle nada a la familia.

**Criterios de aceptación**:

1. La regla es **pura y pública**: `lib/elegibilidad.ts`, sin base de datos, recalculable a mano.
2. Cada veredicto trae sus **factores**, no solo el resultado. Si a una familia le dicen que no le
   corresponde algo, tiene derecho a ver por qué.
3. Lo que **no** corresponde no se esconde: se muestra con su motivo.
4. La regla **no bloquea**. El funcionario puede asignar contra ella —tiene enfrente a la familia y
   el sistema no—, y esa decisión queda en la auditoría con el veredicto que la regla dio
   (`elegibleSegunLaRegla`) y su motivo.
5. Estar caracterizado por el municipio **satisface el requisito de registro**: ese es el punto.

### User Story 3 - La regla se puede leer completa (Priority: P2)

Cualquier funcionario abre `/oferta#regla` y lee las cuatro compuertas generales y la condición de
cada tipo de ayuda, en las mismas palabras que usa el código.

## Decisiones de diseño

### D1 — La elegibilidad sugiere con argumento; no decide

Fue la decisión que pidió el usuario explícitamente ("la elegibilidad es auditable"). Una regla que
no se puede desobedecer mandaría a la gente a pelear con el software en vez de con un funcionario
que responde. Una que se puede desobedecer **en silencio** no sirve de nada. La salida es la del
Principio I: se puede, y queda registrado.

### D2 — Reglas simples y en un solo lugar

Cuatro compuertas generales (vigente · dirigida a hogares · no repetida · el registro municipal
cuenta como registro) y **una** condición por tipo de ayuda, todas en un `switch` que cabe en una
pantalla. Una regla que un concejal puede leer completa vale más que una que acierta un 3 % más y
nadie entiende.

### D3 — Las cifras se cuentan en la base

`situacionDe` usa `count`/`aggregate`/`groupBy`. Traer filas para contarlas en memoria funciona con
cuatro hogares y se cae con cuarenta mil, que es justo cuando importa.

## Alcance

**Dentro**: portada `/municipio`; regla de elegibilidad y su publicación; postular desde el hogar;
veredicto en la auditoría.

**Fuera**: montos (la regla dice a qué puerta tocar, no cuánto dan); inscripción automática en el
RUD nacional; constancia de caracterización presentable ante otra entidad (siguiente paso natural);
elegibilidad para bienes/obras, que es otra regla.

## Pruebas

`tests/situacion.test.ts` (5) fija el orden de los pendientes y que lo que está al día no aparezca.
`tests/elegibilidad.test.ts` (15) cubre las cuatro compuertas, la condición de cada tipo, y que
**todo veredicto traiga factores**: sin factores sería una opinión, no una regla.
