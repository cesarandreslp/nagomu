# nagomu

Comunicación coordinada entre la nación, la gobernación y el municipio para la atención
organizada de desastres.

Tras un desastre el municipio es el primero que responde, y a menudo el único que puede.
Con recursos propios una obra puede tomar nueve años; con la gobernación, cuatro; con la
nación, catorce meses. **nagomu existe para que ese cálculo sea visible**, y para que un
alcalde pueda decirle a una gobernación *"si aportas esto, esta obra pasa de nueve años a
cuatro"* con números que cualquiera puede verificar.

## Qué hace hoy

- **Inventario priorizado.** Cada obra recibe un nivel de prioridad por una regla pública
  —vida, riesgo activo, servicios esenciales, educación, productivo, cultural— y un puntaje
  con sus factores a la vista. El nivel manda sobre el puntaje: un teatro nunca adelanta a
  una escuela, así beneficie a diez veces más gente.
- **Costeo por estudio.** El costo de una obra no existe hasta que un estudio lo determina,
  con fecha y documento de respaldo. Antes de eso no hay brecha ni plazos que mostrar.
- **Cofinanciación.** Municipio, gobernación, nación, cooperación internacional y actores
  privados aportan a la misma obra, cada uno desde los fondos de su ámbito.
- **Cola de financiación.** La capacidad fiscal anual del municipio se reparte entre sus
  obras en orden de prioridad. Un aporte a la obra que va de primera **adelanta también a
  las que vienen detrás**, sin darles un peso.
- **Intervenciones de terceros vigiladas.** Una empresa puede ejecutar la obra en lugar de
  girar dinero —el mecanismo de obras por impuestos—, con autorización previa del municipio
  y verificaciones de calidad. El valor solo cuenta como ejecutado cuando el municipio
  recibe a satisfacción.
- **Catálogo de fondos y de oferta institucional**, con las fuentes reales del Sistema
  Nacional de Gestión del Riesgo y lo que ofrece cada entidad a los damnificados.
- **Damnificados y bienes afectados.** El municipio censa los hogares damnificados y registra
  lo que el desastre dañó, clasificado por **sector doliente** —a qué ministerio o secretaría
  le toca responder: vivienda, transporte, gestión del riesgo, educación, salud, agua,
  agropecuario, cultura, comercio, deporte— y por su tipo concreto. La dirección de una
  familia es reservada; el lugar general es público. Solo un bien de un sector de obra pública
  entra a la cola de cofinanciación: un cultivo perdido se caracteriza, no se cofinancia.

## Decisiones que sostienen todo

**La auditoría no se puede alterar, y no porque el código se porte bien.** Un disparador de
Postgres rechaza `UPDATE`, `DELETE` y `TRUNCATE` sobre las tablas de hechos. Una corrección
es una fila nueva que referencia la anterior.

**El dinero es exacto.** Todos los montos son `bigint` de centavos. Nunca `number`: un peso
perdido por redondeo en recursos públicos es un descuadre que alguien tiene que explicar.

**Las vistas críticas funcionan sin JavaScript.** Los formularios envían por POST normal y
la simulación de aportes es un formulario GET. En una emergencia la conectividad se degrada
justo cuando el sistema más se necesita.

**La prioridad es una regla, no un modelo.** Cada obra muestra los factores con los que se
calculó su puntaje y los pesos vigentes de la fórmula. Si un concejal pregunta por qué su
escuela quedó de número 47, la respuesta se recalcula con una calculadora.

Los cinco principios completos están en [la constitución del proyecto](.specify/memory/constitution.md).

## Puesta en marcha

Requiere Node.js 20+ y una base PostgreSQL. No hay nada local: la base vive en Neon y el
despliegue en Vercel.

```bash
npm install
vercel env pull .env.local
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
npm run dev
```

### Variables de entorno

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión agrupada de Neon. La usa la aplicación |
| `DIRECT_URL` | Conexión directa. La usan las migraciones. Necesita `connect_timeout=30` |
| `BLOB_READ_WRITE_TOKEN` | Almacenamiento de documentos de respaldo |

`.env.example` explica cada una. **Ningún `.env` con valores reales se comitea**: el
repositorio es público.

### Entornos y ramas de base de datos

La base está ramificada en Neon. Cada entorno apunta a donde le corresponde:

| Entorno | Rama de Neon | Para qué |
|---|---|---|
| Production | `main` | Los datos del piloto |
| Preview y Development | `dev` | Migraciones y pruebas, sin tocar el piloto |

`vercel env pull .env.local` trae la rama `dev`, así que trabajar en local no escribe sobre
los datos reales. La rama arrancó como copia de `main`, con esquema, datos y auditoría.

**Las migraciones corren en el build de Vercel** (`prisma migrate deploy` va en el script
`build`), contra la rama que le corresponda al entorno. Si una migración falla, falla el
despliegue, que es preferible a servir una aplicación cuyo esquema no existe.

**A la conexión directa hay que agregarle `&connect_timeout=30`.** Neon suspende el cómputo
tras unos minutos de inactividad y el arranque en frío supera el tiempo de espera por
defecto de Prisma, que falla con `P1001` aunque el servidor esté perfectamente accesible.

Las cadenas se configuran en Vercel, nunca en un archivo del repositorio. Vercel marca como
sensibles las de Production y Preview, así que `env pull` devuelve `[SENSITIVE]` para ellas:
no se pueden releer una vez guardadas.

Para recrear la rama —o crear otra— en la consola de Neon: *Branches* → *Create branch*
desde `main`. **El campo `Auto-delete` viene en "After 1 day"**; hay que cambiarlo, o la
rama desaparece al día siguiente y todo vuelve a apuntar a producción sin que nadie lo note.

Cuando la spec 002 tenga hogares censados, la rama de desarrollo debe crearse con
*Branch & anonymize data*: copiar datos reales de víctimas a un entorno de pruebas es
justamente lo que el principio de mínimo de datos personales busca evitar.

### Usuarios del piloto

Contraseña inicial `nagomu-piloto` para todos. Cámbiala antes de cualquier uso real.

| Correo | Nivel |
|---|---|
| `buga@nagomu.test`, `sipi@nagomu.test`, `cali@nagomu.test`, `pereira@nagomu.test`, `sanjose@nagomu.test` | Municipio |
| `valle@nagomu.test`, `choco@nagomu.test`, `risaralda@nagomu.test`, `caldas@nagomu.test`, `quindio@nagomu.test` | Departamento |
| `nacion@nagomu.test` | Nación |

## Pruebas

```bash
npm test
```

255 pruebas. Cubren lo que la constitución exige —permisos, transiciones de estado,
auditoría— más la aritmética con consecuencias públicas: prioridad, cola de financiación y
dinero. `tests/auditoria.test.ts` necesita Postgres levantado, porque lo que verifica es el
disparador de la base, no el código.

## Cómo está organizado

| Carpeta | Qué contiene |
|---|---|
| `app/` | Rutas y Server Actions. Todo servidor por defecto |
| `lib/prioridad.ts`, `cola.ts`, `brecha.ts`, `dinero.ts`, `estados.ts` | Funciones puras, sin base de datos. Se prueban sin infraestructura |
| `lib/authz.ts` | Quién puede editar qué. Una sola definición |
| `prisma/` | Esquema, migraciones con sus disparadores, y semilla del piloto |
| `specs/00N-*/` | Una carpeta por spec: 001 cofinanciación · 002 mapas · 003 voluntariados · 004 diseño · 005 tablero · 006 damnificados · 007 afectaciones |
| `specs/PENDIENTES.md` | Estado del proyecto, qué está construido y el backlog vivo |

El proyecto se construyó con [Spec Kit](https://github.com/github/spec-kit): la
especificación es el artefacto duradero y el código sale de ella.

## Lo que falta

El detalle vive en [`specs/PENDIENTES.md`](specs/PENDIENTES.md). Lo grueso hoy:

- **Spec 007**: falta la foto sin metadatos del bien afectado, la caracterización del hogar
  (varias familias por vivienda, necesidad de salud categorizada) y el censo público en
  `/censo`.
- **Limpiar el EXIF de las fotografías de bienes**: `lib/imagen.ts` ya lo hace con las de
  hogares; el GPS de esa foto es la dirección de una familia.
- **Verificar los códigos DANE** de la semilla y los fondos creados por la emergencia de
  agosto de 2026, que están anunciados pero sin reglamentar.
