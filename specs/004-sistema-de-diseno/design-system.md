# Brief de diseño: identidad visual y landing pública

**Fecha**: 2026-08-18 | **Estado**: BRIEF CAPTURADO — no implementado. Base para un futuro
`/speckit-specify` (spec 004). No se ha tocado ningún estilo todavía.

Este documento captura el sistema de diseño solicitado para que no se pierda, lo cruza con la
constitución y con el CSS actual, y deja anotada una tensión de marca a resolver. **No es una
orden de implementación**: ver "Momento adecuado" al final.

---

## 1. Origen y decisiones abiertas

El brief lo entregó el usuario: una estética de **fiscalización técnica y neutral**, paleta azul
institucional, con manosunidas.org citada como referencia.

**Tensión a resolver (bloqueante para la paleta):** el brief escrito es **azul institucional
frío** (fiscalización). manosunidas.org es lo **opuesto**: NGO humanitaria **cálida** (verdes,
naranjas/rojos, fotografía documental, carrusel, foco en donaciones). No pueden gobernar las dos
la paleta a la vez.

- Interpretación asumida aquí: **gana la paleta azul escrita** (es específica y detallada);
  manosunidas se toma como referencia de **estructura y calidad** (navbar limpio, hero, tarjetas,
  footer), no de color.
- **Pendiente de confirmación del usuario** antes de implementar.

---

## 2. Tokens de color (mapean al CSS actual `app/globals.css`)

El CSS ya trabaja con variables en `:root` (`--tinta`, `--fondo`, `--acento`, …). El rediseño es
sobre todo **redefinir y ampliar** esos tokens. Acento actual es verde `#14532d`; pasa a azul.

| Token propuesto | Hex | Uso |
|---|---|---|
| `--azul-nacion` | `#1E3A8A` | Nivel Nación; botón primario; acento institucional |
| `--azul-nacion-oscuro` | `#172554` | Hover del botón primario |
| `--azul-departamento` | `#3B82F6` | Nivel Departamento |
| `--azul-municipio` | `#06B6D4` | Nivel Municipio (cian técnico) |
| `--azul-activo` | `#38BDF8` | Ítem activo en la barra lateral |
| `--fondo` | `#FFFFFF` | Fondo general claro |
| `--fondo-suave` | `#F1F5F9` | Fondo de ventanas internas (dashboards) |
| `--fondo-login` | `#F8F9FA` | Fondo de la pantalla de login |
| `--linea` | `#E2E8F0` | Bordes de tarjetas e inputs |
| `--sidebar-fondo` | `#1E293B` | Fondo de la barra lateral técnica |
| `--sidebar-texto` | `#94A3B8` | Texto/íconos de la barra lateral |
| `--tinta` | `#0F172A` | Texto principal (alto contraste, accesibilidad) |
| `--alerta` | `#DC2626` | Errores/validación (rojo atenuado) |
| `--ambar` | (ámbar) | Alertas de retraso |
| `--exito` | (verde) | Barra de ejecución/progreso |

> Nota accesibilidad: `#0F172A` sobre `#FFFFFF`/`#F1F5F9` cumple contraste AA. Verificar cada par
> texto/fondo (sidebar `#94A3B8` sobre `#1E293B` es límite: revisar tamaños).

---

## 3. Gradación territorial (funcionalmente útil)

Los tres niveles ya existen como enum `NivelTerritorial` (`NACION` / `DEPARTAMENTO` / `MUNICIPIO`).
El color los distingue en mapas, filtros y tablas:

```
NACIÓN        → Azul Marino  #1E3A8A   (el todo / presupuesto general / marco contenedor)
  └ DEPARTAMENTO → Azul Intermedio #3B82F6 (coordinación regional / intermunicipal)
      └ MUNICIPIO  → Cian Técnico  #06B6D4  (ejecución local / la base)
```

Esto conecta con el mapa (spec 002): la capa de inventario ya colorea por estado de obra; una capa
por nivel territorial usaría esta gradación. Es el token más reutilizable de todo el brief.

---

## 4. Estructura de páginas

**Landing pública (NUEVA — hoy no existe; la app entra directo a `/login`):**
- Navbar: logo azul a la izquierda; enlaces (Inicio, Datos, Reportes, Transparencia); botón
  "Ingresar a la Plataforma" a la derecha.
- Hero: fondo blanco/gris muy claro; título institucional; subtítulo de fiscalización; buscador
  central con placeholder "Busca por Municipio, Departamento o Proyecto".
- Buscador territorial: tres selectores en cascada `Nación → Departamento → Municipio`.
- Resumen de impacto: tres tarjetas — Total de Fondos Asignados, % de Ejecución (barra verde),
  Alertas de Retraso (ámbar).
- Footer: fondo azul profundo; enlaces legales, mapa del sitio, denuncia anónima, sellos de datos
  abiertos.

**Login:** fondo `#F8F9FA`; tarjeta blanca con borde `#E2E8F0` y sombra; inputs con foco azul
`#1E3A8A`; botón primario azul (hover `#172554`); errores en `#DC2626`.

**Dashboards internos:** sidebar `#1E293B` (texto `#94A3B8`, activo `#38BDF8`); fondo de ventana
`#F1F5F9`; tarjetas blancas redondeadas; texto `#0F172A`.

---

## 5. Restricciones constitucionales (NO negociables al implementar)

- **Principio III (condiciones adversas):** las **vistas críticas operativas** (inventario,
  reporte, directorio) MUST seguir server-rendered, sin depender de JS de cliente, usables en gama
  baja sobre 3G. El estilo rico (carrusel, fotografía pesada tipo manosunidas, sidebar con JS) solo
  cabe en el **shell público** (landing, login) y como mejora progresiva en dashboards. La paleta
  (solo CSS) no cuesta nada; la carruselería y las imágenes grandes sí. **No se introduce un
  framework de UI** (el CSS actual evita justamente eso).
- **Principio IV:** ninguna tarjeta de impacto, mapa ni buscador expone datos personales de
  afectados. Los "datos" son agregados (fondos, ejecución, obras), nunca personas.
- **Principio V (simplicidad):** tokens CSS y componentes propios antes que dependencias. Tipografía
  del sistema (cero fuentes que descargar), como hoy.

---

## 6. Alcance real (por qué es un spec propio)

No es solo "cambiar colores". Incluye trabajo funcional nuevo:
- Landing pública nueva (hero, buscador territorial en cascada, tarjetas de impacto agregadas).
- Barra lateral de navegación (hoy la navegación es una línea de enlaces).
- Restyle transversal de login y de todas las vistas operativas.
- Sistema de tokens formalizado + gradación territorial aplicada a mapa/tablas.

Esto toca casi todos los archivos de `app/` y es transversal a todas las features.

---

## 7. Momento adecuado para implementar

**Recomendación: como spec 004, DESPUÉS de terminar el spec 003 (US3 + polish) y fusionarlo.**

Razones:
1. **No re-estilizar un blanco móvil.** US2 y US3 están agregando páginas ahora mismo
   (`/voluntariados`, capa de mapa). Estilizarlas mientras cambian obliga a re-tocarlas.
2. **El sistema es coherente en una sola pasada.** Definir los tokens una vez y aplicarlos a todo
   pesa menos que hacerlo página por página con criterios que derivan.
3. **Parte del brief es funcionalidad nueva** (landing, buscador, tarjetas de impacto, sidebar),
   no CSS: merece su propio `spec.md` + `plan.md`, con su chequeo constitucional (Principio III es
   el que más aprieta aquí).
4. **Barato adelantar solo los tokens.** Si se quiere avanzar algo antes, lo único de bajo riesgo
   es introducir la **paleta de tokens** (incluida la gradación territorial) en `globals.css`; el
   resto (landing, sidebar) es el grueso y espera a spec 004.

Orden sugerido: **US3 → polish de spec 003 → confirmar la tensión de marca (§1) → `/speckit-specify`
para spec 004 (identidad visual + landing).**
