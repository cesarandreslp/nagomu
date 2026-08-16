# Research: Cofinanciación priorizada de obras de reconstrucción

**Fecha**: 2026-08-16 | **Plan**: [plan.md](./plan.md)

Cada decisión responde a un principio de la constitución o a un requisito de la
especificación. Las alternativas descartadas se anotan para que una futura enmienda sepa qué
se consideró.

---

## 1. Inmutabilidad de la auditoría

**Decisión**: disparadores de Postgres que rechazan `UPDATE` y `DELETE` sobre
`RegistroAuditoria`, `Aporte`, `CostoObra`, `CambioEstadoObra` y `VerificacionCalidad`. Se
crean en una migración de Prisma con SQL explícito.

**Rationale**: el Principio I es NON-NEGOTIABLE. Una regla que solo vive en el código de la
aplicación se rompe con un `prisma.aporte.update()` escrito por descuido dentro de seis meses,
y nadie lo nota hasta que alguien audita. El disparador falla ruidosamente en el momento, sin
importar quién escriba la consulta. Son unas diez líneas de SQL por tabla.

**Alternativas consideradas**:
- *Disciplina en el código, revisada en code review*: descartada. Depende de la memoria humana
  para una garantía que se declaró no negociable.
- *Revocar permisos `UPDATE`/`DELETE` al rol de la aplicación*: complementario y deseable, pero
  no siempre disponible en Postgres gestionado con un solo rol. Se deja anotado como
  endurecimiento posterior.
- *Event sourcing completo*: descartado por el Principio V. El sistema necesita tablas
  inmutables, no un cambio de paradigma de persistencia.

---

## 2. Autenticación sin librería

**Decisión**: contraseñas con `scrypt` de `node:crypto`; sesión opaca guardada en tabla
`Sesion` y referenciada por una cookie `httpOnly`, `Secure`, `SameSite=Lax`. Sin Auth.js, sin
JWT.

**Rationale**: el piloto tiene usuarios cargados por administración, sin registro propio, sin
OAuth, sin recuperación de contraseña por correo. Un framework de autenticación traería
proveedores, callbacks y adaptadores que este caso no usa, contra el Principio V. `scrypt` está
en la biblioteca estándar de Node y es una función de derivación adecuada para contraseñas.

Una sesión opaca en base de datos, además, es **revocable de inmediato**: si un funcionario deja
la entidad, se borra la fila y la sesión muere. Con un JWT firmado habría que esperar su
expiración o construir una lista de revocación, que es justamente la complejidad que el JWT
prometía evitar.

**Alternativas consideradas**:
- *Auth.js / NextAuth*: descartada. Superficie grande para un flujo de usuario y contraseña.
- *JWT firmado en cookie*: descartada por la revocación, explicada arriba.
- *bcrypt / argon2*: son buenas opciones, pero exigen dependencia nativa. `scrypt` de la
  biblioteca estándar cumple sin agregar nada.

**Nota de calibración**: los parámetros de coste de `scrypt` (`N`, `r`, `p`) deben ajustarse al
hardware real de ejecución hasta que un hash tome entre 100 y 250 ms. Quedan en un solo lugar
de `lib/auth.ts` para poder subirlos sin tocar nada más.

---

## 3. Representación del dinero

**Decisión**: `Decimal(18,2)` en Postgres, `Prisma.Decimal` en TypeScript. Conversión a cadena
en la frontera de serialización. Prohibido `number` para montos.

**Rationale**: son recursos públicos. Un peso perdido por redondeo de punto flotante en una
suma de aportes es un descuadre que alguien tiene que explicar. `Decimal(18,2)` cubre montos
hasta el orden del billón de pesos con dos decimales exactos.

**Alternativas consideradas**:
- *`BigInt` en pesos enteros*: atractivo porque el peso colombiano no usa centavos en la
  práctica, pero los documentos presupuestales sí traen decimales y `BigInt` no serializa a JSON
  sin conversión manual. Igual de incómodo, menos estándar.
- *`number`*: descartado sin discusión.

---

## 4. Prioridad y cola como funciones puras

**Decisión**: `lib/prioridad.ts` y `lib/cola.ts` reciben datos planos y devuelven resultados;
no importan Prisma ni tocan la red. Se calculan en cada petición, sin tabla materializada ni
caché.

**Rationale**: FR-005 y FR-007 exigen que un tercero pueda recalcular el orden a mano. Una
función pura es exactamente eso, y se prueba sin base de datos. Con 2.000 obras en el piloto,
recalcular la cola de un municipio en cada petición es trabajo despreciable frente a la consulta.

```
// ponytail: cola recalculada en cada request, O(n log n) sobre las obras del municipio.
// Con miles de obras por municipio, materializar posición y año estimado en tabla
// con recálculo por evento.
```

**Alternativas consideradas**:
- *Posición y años materializados en la tabla de obras*: descartado por ahora. Invalidarlos
  correctamente ante cada aporte, cambio de costo y obra nueva es más código y más formas de
  quedar desincronizado que simplemente recalcular.
- *Cálculo en SQL con funciones de ventana*: rápido, pero deja de ser reproducible a mano y no
  se puede probar sin base de datos. Contra FR-007.

---

## 5. Escenarios comparativos sin JavaScript

**Decisión**: los tres escenarios (municipio solo, con gobernación, con gobernación y nación)
se calculan en el servidor y se renderizan juntos en la misma página. La simulación de un aporte
concreto es un formulario `GET` que recarga la página con el monto en la URL.

**Rationale**: resuelve la tensión señalada entre el Principio III y una pantalla naturalmente
interactiva. Recalcular la cola tres veces en el servidor es barato; enviar un simulador al
navegador es exactamente el peso que el principio prohíbe en las vistas críticas. Como el
resultado queda en la URL, además se puede compartir por correo con la gobernación, que es el
uso real de esa pantalla.

**Alternativas consideradas**:
- *Simulador en el cliente con deslizador*: mejor sensación de uso, inservible en 3G y en un
  teléfono de gama baja. Descartado por el Principio III.
- *Mejora progresiva con `fetch` opcional*: dos caminos de código para la misma función.
  Descartado por el Principio V. Se puede agregar después sin rehacer nada.

**Restricción derivada**: ningún monto simulado puede llevar datos personales, por lo que la URL
solo transporta cifras y el identificador opaco de la obra. Cumple el Principio IV.

---

## 6. Autorización

**Decisión**: un módulo `lib/authz.ts` con funciones explícitas (`puedeEditarObra`,
`puedeEditarAporte`, `puedeAutorizarIntervencion`), invocadas al inicio de cada Server Action.
Sin extensión de cliente Prisma ni filtrado implícito.

**Rationale**: la especificación abre la lectura a todo usuario autenticado (FR-024), así que no
existe filtrado de lectura que pueda fallar. Toda la superficie de riesgo son las escrituras, que
son pocas y pasan por Server Actions. Una extensión de Prisma que inyecte ámbito resolvería un
problema que este diseño no tiene, y escondería la regla justo donde debe estar visible.

`tests/authz.test.ts` recorre la matriz completa de actor por acción por obra, incluidos los
casos que deben fallar. Es obligatorio por la constitución.

**Alternativas consideradas**:
- *Extensión de cliente Prisma con ámbito automático*: útil cuando la lectura es restringida. No
  es el caso.
- *Row Level Security en Postgres*: garantía más fuerte, pero exige propagar la identidad del
  usuario a la conexión, lo que choca con el agrupamiento de conexiones de Vercel. Se anota como
  endurecimiento si la lectura llegara a restringirse.

---

## 7. Prisma sobre Vercel y Neon

**Decisión**: Prisma 7 con el adaptador `@prisma/adapter-neon` sobre `@neondatabase/serverless`.
`DATABASE_URL` con agrupador para la aplicación y `DIRECT_URL` sin agrupar para las migraciones.
Cliente Prisma único reutilizado entre invocaciones.

**Rationale**: cada función serverless abre su propia conexión; sin agrupador, Postgres agota el
límite con poca concurrencia.

**Corregido el 2026-08-16 al instalar**: el plan original asumía Prisma 6, donde bastaba declarar
la URL en el esquema. Prisma 7 cambió tres cosas que afectan el código:

1. **El adaptador de driver es obligatorio.** `new PrismaClient()` sin argumentos lanza error. Se
   instancia siempre con `{ adapter }`. Para Neon el adaptador nativo es `@prisma/adapter-neon`,
   no el genérico `@prisma/adapter-pg`, porque usa el driver serverless de Neon y encaja mejor
   con funciones efímeras.
2. **La URL salió del esquema.** `datasource db` ya no lleva `url`; la configuración vive en
   `prisma.config.ts`, que también declara la ruta de migraciones y el comando de semilla.
3. **El generador es `prisma-client`, no `prisma-client-js`**, con salida obligatoria a
   `lib/generated/prisma`. La importación es `lib/generated/prisma/client.js`, nunca
   `@prisma/client`. El código generado es ESM, por lo que `package.json` lleva
   `"type": "module"`.

Estos puntos se verificaron contra la documentación que `prisma init` deja en el proyecto, no se
dedujeron. La carpeta `.agents/` queda fuera del repositorio: es referencia, no código.

**Versiones instaladas**: Next.js 16.3.1, React 19.2.8, Prisma 7.9.1, TypeScript 6.0.3,
Node 26.3.0.

---

## 8. Pruebas

**Decisión**: Vitest. Obligatorias sobre `prioridad`, `cola`, `authz`, `auditoria` y `dinero`.
Sin pruebas de navegador, sin cobertura obligatoria en el resto.

**Rationale**: la constitución exige pruebas en permisos, escalación entre niveles y registro de
auditoría. Se agregan prioridad, cola y dinero porque son aritmética con consecuencias públicas:
si la cola se calcula mal, el sistema miente sobre en qué año arranca una escuela. El resto del
código es formulario y renderizado, donde una prueba automatizada cuesta más de lo que protege.

`auditoria.test.ts` necesita una base Postgres real, porque lo que verifica es el disparador.

---

## 9. Intentos de acceso fallidos

**Decisión** (2026-08-16, tras verificar el flujo en el navegador): un inicio de sesión
rechazado se enlaza al usuario por clave foránea cuando la cuenta existe, y queda anónimo
cuando no. El correo intentado no se almacena nunca.

**Rationale**: sin atribución, veinte intentos fallidos contra un funcionario concreto se ven
iguales a veinte errores de dedo repartidos, y un ataque de fuerza bruta es indetectable.
Enlazar por clave foránea no agrega ningún dato personal a la auditoría: apunta a una fila que
ya está en la base. Guardar el correo tanteado sí lo agregaría, y convertiría la auditoría en
un listado de correos probados, que es justo lo que el Principio IV evita. Por eso los intentos
contra cuentas inexistentes siguen anónimos: de esos no hay nada que proteger ni que atribuir.

No requiere enmienda de la constitución, porque no se almacena información nueva sobre nadie.

**Dos canales de tiempo cerrados en el mismo cambio**, ambos detectados midiendo el flujo real,
no leyendo el código:

1. **`scrypt` solo se ejecutaba si el usuario existía.** Un correo inexistente respondía en
   milisegundos; uno real, en cientos. El mensaje de error era idéntico, pero el cronómetro
   delataba quién tiene cuenta. Se corrigió verificando siempre contra `HASH_SENUELO`, un hash
   real de una cadena aleatoria que nadie conoce.
2. **`include: { entidad: true }` costaba una consulta extra solo cuando el usuario existía.**
   Sobre una base remota eso son unos 95 ms de diferencia constante y perfectamente medible.
   Se corrigió con `select` de los campos indispensables; la entidad se consulta después de
   autenticar, donde una consulta de más ya no filtra nada.

Medición tras el arreglo, cuatro repeticiones por caso: cuentas reales 239–248 ms, cuentas
inexistentes 237–267 ms. Los rangos se solapan. El camino real, además, bajó de ~350 a ~245 ms
al eliminar la consulta.

## Pendientes conocidos

- Los pesos de la fórmula de puntaje (FR-008) quedan configurables y con valores iniciales
  provisionales. Deben calibrarse con datos reales del piloto antes de usarse para decidir plata.
- El horizonte de proyección de la cola se fija provisionalmente en 30 años; más allá, una obra
  se marca "sin financiación previsible" en lugar de mostrar un número.
- La versión exacta de Next.js debe confirmarse al instalar. El plan asume App Router con Server
  Actions con mejora progresiva, disponible desde Next.js 14.
