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

Neon permite ramificar la base: una rama `dev` arranca como copia de `main` y las
migraciones se prueban ahí sin tocar los datos del piloto. **Hoy no existe, y por eso
desarrollar en local escribe sobre la base de producción.**

Para separarlos:

1. En la consola de Neon: *Branches* → *Create branch* desde `main`, nombre `dev`.
2. Copiar sus dos cadenas de conexión: la agrupada (`-pooler`) y la directa.
3. En Vercel → *Settings* → *Environment Variables*, poner esos valores en `DATABASE_URL`
   y `DIRECT_URL` para los entornos **Development** y **Preview**. Producción sigue
   apuntando a `main`.
4. En local, `vercel env pull .env.local` recoge el cambio y `npx prisma migrate deploy`
   aplica el esquema a la rama nueva.

A la directa hay que agregarle `&connect_timeout=30`: Neon suspende el cómputo tras unos
minutos de inactividad y el arranque en frío supera el tiempo de espera por defecto de
Prisma, que falla con `P1001` aunque el servidor esté perfectamente accesible.

Las cadenas van directo en Vercel, no en un archivo del repositorio.

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

150 pruebas. Cubren lo que la constitución exige —permisos, transiciones de estado,
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
| `specs/001-cofinanciacion-obras/` | Especificación, plan, modelo de datos y decisiones técnicas |
| `specs/002-atencion-damnificados/` | Censo de hogares y seguimiento de la ayuda. **Creada, no habilitada** |

El proyecto se construyó con [Spec Kit](https://github.com/github/spec-kit): la
especificación es el artefacto duradero y el código sale de ella.

## Lo que falta

- **Spec 002**: censo de hogares, seguimiento de la oferta institucional por familia,
  detección de ayudas duplicadas y de veredas sin atención. Está especificada y en espera de
  tres decisiones de manejo.
- **Limpiar el EXIF de las fotografías** antes de que la 002 acepte imágenes de viviendas:
  el GPS de esa foto es la dirección de una familia.
- **Verificar los códigos DANE** de la semilla y los fondos creados por la emergencia de
  agosto de 2026, que están anunciados pero sin reglamentar.
