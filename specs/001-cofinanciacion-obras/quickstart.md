# Quickstart: Cofinanciación priorizada de obras de reconstrucción

**Fecha**: 2026-08-16 | **Plan**: [plan.md](./plan.md)

Cómo levantar la funcionalidad y comprobar que hace lo que la especificación dice. No contiene
código de implementación: eso sale de `/speckit-tasks`.

---

## Requisitos previos

- Node.js 20 o superior
- Una base de datos PostgreSQL. Para desarrollo sirve Docker; para el piloto, la base de Vercel
  o Neon.
- Variables en `.env.local`, nunca comiteadas:
  - `DATABASE_URL` — conexión agrupada, la que usa la aplicación
  - `DIRECT_URL` — conexión directa, la que usan las migraciones
  - `SESSION_COOKIE_SECRET` — secreto para firmar la cookie de sesión

## Puesta en marcha

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

La semilla carga las entidades del piloto y un usuario por nivel:

| Correo | Entidad | Nivel |
|---|---|---|
| `buga@nagomu.test` | Buga | Municipio |
| `sipi@nagomu.test` | Sipí | Municipio |
| `valle@nagomu.test` | Gobernación del Valle del Cauca | Departamento |
| `choco@nagomu.test` | Gobernación del Chocó | Departamento |
| `nacion@nagomu.test` | Nación | Nación |

## Pruebas

```bash
npm test
```

`tests/auditoria.test.ts` necesita Postgres levantado: lo que verifica es que el disparador de
la base rechace `UPDATE` y `DELETE`, no algo del código de aplicación.

---

## Validaciones de aceptación

Cada bloque corresponde a una historia de la [especificación](./spec.md). Se ejecutan a mano
contra la aplicación levantada.

### V1 — El orden respeta los niveles (US1)

1. Entra como `buga@nagomu.test`.
2. Registra tres ítems: un muro de contención (`MITIGACION_RIESGO`, 300 beneficiados), una
   escuela (`EDUCACION`, 800), un teatro (`CULTURAL`, 5.000).
3. Abre `/obras`.

**Esperado**: el muro primero, la escuela segunda, el teatro último, aunque el teatro tenga
muchos más beneficiados. El nivel manda sobre el puntaje.

4. Abre el detalle del teatro.

**Esperado**: se ven el nivel, los ODS, y cada factor con su valor, de modo que el puntaje se
pueda recalcular a mano.

### V2 — Sin estudio no hay cifras (US2)

1. Con el teatro recién creado, abre su detalle.

**Esperado**: "pendiente de estudios". Ninguna brecha, ningún año. La prioridad sí se ve.

2. Registra la cotización de estudios por $200.000.000.
3. Registra el costo del estudio: $3.000.000.000, con fecha y referencia de documento.

**Esperado**: la obra queda `COSTEADO` y aparecen brecha y plazos. Los dos costos se muestran
por separado.

4. Registra un costo posterior distinto.

**Esperado**: la brecha usa el nuevo; el anterior sigue visible en el historial.

### V3 — La cola reparte la capacidad (US3, decisión Q1=B)

1. Reporta capacidad fiscal de Buga: $500.000.000 anuales.
2. Con el muro, la escuela y el teatro costeados, abre `/obras`.

**Esperado**: cada obra muestra posición en la cola, año estimado de inicio y de cierre. El
teatro, de última, arranca solo cuando las anteriores cierran su brecha.

3. Abre el detalle del teatro y simula un aporte departamental sobre el muro.

**Esperado**: el teatro adelanta su año de inicio sin recibir un peso. El aporte a una obra
prioritaria destraba la fila.

4. Registra un ítem nuevo de nivel 1 y vuelve al teatro.

**Esperado**: el detalle indica cuántos años se retrasó y por cuál obra.

5. Registra un aporte con origen `TRASLADO_PRESUPUESTAL` sin indicar el proyecto aplazado.

**Esperado**: rechazado.

### V4 — Cada quien en lo suyo (US4)

1. Entra como `valle@nagomu.test`, abre `/departamento`.

**Esperado**: obras de Buga visibles y ordenadas por prioridad; nada de Chocó.

2. Ordena por impacto.

**Esperado**: primero las obras donde un aporte departamental produce la mayor reducción de plazo.

3. Registra el aporte de la gobernación e intenta editar el aporte del municipio.

**Esperado**: el aporte propio entra; el ajeno se rechaza.

4. Entra como `sipi@nagomu.test` e intenta editar una obra de Buga.

**Esperado**: rechazado, y el intento queda en el historial de la obra.

### V5 — La intervención se vigila (US5)

1. Como Buga, registra una solicitud de intervención de una empresa sobre la escuela, con
   alcance, plazo, responsable técnico y valor equivalente.

**Esperado**: estado `SOLICITADA`, la brecha no se mueve.

2. Apruébala.

**Esperado**: el valor cuenta como comprometido, no como ejecutado.

3. Registra una verificación con resultado `NO_CONFORME` y suspende la intervención con motivo.

**Esperado**: el valor deja de contar y la brecha se reabre. El motivo queda registrado.

4. Reactívala, recíbela a satisfacción.

**Esperado**: solo ahora el valor cuenta como ejecutado.

5. Como `valle@nagomu.test`, intenta aprobar una intervención sobre una obra de Buga.

**Esperado**: rechazado. El municipio dueño autoriza lo que pasa en su territorio.

### V6 — Nada se borra

1. Intenta modificar un aporte directamente en la base:

```sql
UPDATE "Aporte" SET monto = 1 WHERE id = '<id>';
```

**Esperado**: Postgres lo rechaza. La garantía no depende del código de la aplicación.

2. Corrige ese aporte desde la interfaz.

**Esperado**: aparece una fila nueva que referencia la anterior; la original sigue consultable
en el historial.

### V7 — Funciona sin JavaScript

1. Desactiva JavaScript en el navegador.
2. Entra, abre `/obras`, abre el detalle de una obra, simula un aporte y registra uno real.

**Esperado**: todo funciona. Es el escenario de un teléfono de gama baja en zona rural, que es
para lo que existe el sistema.
