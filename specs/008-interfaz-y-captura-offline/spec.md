# Feature Specification: Interfaz profesional y captura de campo sin señal

**Feature Branch**: `008-interfaz-y-captura-offline`

**Created**: 2026-08-20

**Status**: Implementado

**Input**: User description: "aplícale estilos y que se vea como un software profesional, a todas y cada una de las pantallas existentes, full responsive; y los formularios de captura deben funcionar alternamente como PWA para recopilar información en sitios sin señal de internet."

## Contexto y encuadre constitucional

El spec 004 dejó el sistema de diseño —paleta azul institucional, gradación territorial, barra
lateral técnica— pero solo lo aplicó a la landing, el login y el marco del tablero. Las vistas
operativas quedaron con estilos de elemento: títulos sueltos, tablas sin caja, formularios de una
sola columna, y varias pantallas (registro de bienes, detalle de obra, aportes, costos, documentos,
historial, intervenciones) **sin el marco**, así que al entrar en ellas la navegación desaparecía.
Esta feature termina esa pasada y añade lo que el trabajo de campo exige.

La **enmienda 2.1.0 del Principio III** es la que habilita la segunda mitad: sobre la base
server-rendered *se permite explícitamente* la mejora progresiva rica —JavaScript de cliente,
comportamiento offline/PWA y captura en campo—, con una sola condición: **la mejora nunca puede ser
el único camino** para capturar un dato esencial. De ahí sale la regla de diseño de todo lo que
sigue: sin JavaScript los formularios envían igual, por POST normal.

Y los de siempre: I (auditoría append-only; la captura offline pasa por las mismas acciones y deja
los mismos asientos), II (el `municipioId` sale de la sesión, nunca del formulario), IV (mínimo de
datos personales: **nada de lo cacheado en el dispositivo identifica a nadie**), V (simplicidad: sin
framework de UI, sin librería de iconos, sin dependencia nueva).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Una sola aplicación, no veintitrés pantallas (Priority: P1)

Un funcionario entra a cualquier vista y ve el mismo marco: barra lateral con su ámbito, identidad
territorial arriba, contenido en tarjetas blancas sobre fondo claro. Las acciones principales son
botones, no enlaces sueltos en un párrafo. Los estados son pastillas, no texto corrido.

**Por qué importa**: una herramienta que en cada pantalla se ve distinta se usa como un formulario
de trámite, no como el sistema con el que se coordina una emergencia. Y perder la navegación al
entrar a una obra obliga a volver con el botón del navegador.

**Criterios de aceptación**:

1. Las 23 rutas existentes renderizan dentro de un marco coherente (tablero para las operativas,
   `.pagina` para las públicas, tarjeta centrada para el login, full-bleed para la landing).
2. Ninguna vista produce desplazamiento horizontal de la página en 375 px de ancho; lo que no cabe
   —las tablas— se desplaza **dentro de su caja**.
3. Los objetivos táctiles miden al menos 2.75 rem: en campo se toca con el dedo, con lluvia.
4. Contraste AA en claro y en oscuro; el modo oscuro se resuelve con los mismos tokens.

### User Story 2 - Capturar sin señal (Priority: P1)

Una brigada llega a una vereda sin cobertura. Abre el formulario de bien afectado o de hogar
damnificado (ya visitado antes, así que está en el dispositivo), lo llena y lo envía. El registro
queda guardado en el teléfono con un aviso visible de cuántos hay pendientes. Al recuperar señal se
envían solos, sin que nadie tenga que acordarse.

**Criterios de aceptación**:

1. Sin JavaScript el formulario envía por POST normal y funciona como siempre (Principio III).
2. Con JavaScript y sin red, el envío se guarda en el dispositivo y la persona ve cuántos hay.
3. Al volver la conexión se reenvían en el orden en que se capturaron.
4. **Un registro capturado una vez entra una sola vez**, aunque el reenvío ocurra dos veces.
5. Lo que se guarda en el dispositivo no incluye vistas con datos de personas.

### User Story 3 - Instalable en el teléfono (Priority: P3)

El funcionario instala nagomu desde el navegador y la abre como una aplicación más.

**Criterios de aceptación**: manifiesto válido, iconos 192/512 generados en el build, atajos
directos a los dos formularios de captura.

## Decisiones de diseño

### D1 — POST a una URL estable, no a una Server Action

Las Server Actions se identifican con un `$ACTION_ID` que **el compilador genera en cada build**.
Un envío guardado en el teléfono el martes deja de existir si el jueves hay un despliegue: el
reenvío daría 404 y el registro se perdería en silencio. Los dos formularios de captura envían a
`/api/captura/bien` y `/api/captura/hogar`, que llaman a **la misma función** de siempre
(`registrarBien`, `registrarHogar`): misma validación, misma autorización, misma auditoría. Lo único
que aporta la ruta es una dirección que sobrevive a los despliegues.

El resto de formularios de la aplicación siguen siendo Server Actions: no se capturan en campo.

### D2 — La idempotencia la garantiza Postgres, no el cliente

El reenvío es "al menos una vez": si la respuesta se pierde en el camino, o si dos pestañas vacían
la cola a la vez, el mismo registro llega dos veces. El dispositivo genera una **clave** antes del
primer intento y la repite en cada reenvío; `ItemInventario.claveCaptura` y
`HogarDamnificado.claveCaptura` llevan índice único (los NULL no molestan a los registros hechos en
línea). La acción consulta la clave antes de crear y traduce el choque del índice a "ya estaba".

**Se descubrió probándolo, no razonándolo**: la primera versión —cola en el cliente, sin clave—
registró el mismo cultivo **cuatro veces** en una sola captura. Un bien duplicado es ruido; un hogar
duplicado es una familia contada dos veces y otra que nadie va a buscar.

### D3 — La caché del service worker es una lista blanca, no "todo lo visitado"

Se guardan el aviso de sin conexión, los dos formularios **vacíos** y los estáticos con hash. **No**
se guarda ninguna vista con datos de personas: un listado de hogares damnificados en la caché del
navegador es la dirección de una familia viajando en un teléfono que se presta, se pierde o se
decomisa (Principio IV).

### D4 — Cola en `localStorage`, sin adjuntos

Texto plano, ~5 MB, sin dependencias. Si el formulario trae un archivo con contenido, la captura
offline **avisa en vez de fingir**: una foto no cabe y perderla en silencio sería peor. Marcado en
el código con `ponytail:`; el día que haya que encolar fotos, pasa a IndexedDB sin tocar el resto.

### D5 — Sin framework de UI, sin librería de iconos

Los tokens del spec 004 se amplían con una capa de componentes propia (`.panel`, `.pastilla`,
`.campos`, `.cabecera-pagina`, `.vacio`, `.acciones`). Los nueve iconos de la barra lateral son
trazos SVG en línea. Cero peticiones extra, cero dependencias nuevas (Principio V).

## Alcance

**Dentro**: las 23 rutas existentes; captura offline de bien afectado y hogar damnificado;
manifiesto e iconos; página de sin conexión.

**Fuera**: subir fotos sin señal (D4); captura offline del resto de formularios (aportes, costos,
intervenciones: se registran desde una oficina); tablas en formato tarjeta en móvil (hoy se
desplazan dentro de su caja).

## Pruebas

`tests/captura-offline.test.ts` (15) cubre la cola —orden, corrupción, no duplicar, serializar,
rechazar adjuntos— y las claves de idempotencia, incluido que **una violación de unicidad
cualquiera no se confunda con un reenvío**: un correo repetido tiene que seguir siendo un error.

Lo visual se verificó en el navegador a 1280 px y a 375 px, en claro y en oscuro.
