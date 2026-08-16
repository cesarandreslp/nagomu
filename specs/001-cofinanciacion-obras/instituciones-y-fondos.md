# Institucionalidad y fuentes de financiacion

**Investigado**: 2026-08-16 | **Feature**: [spec.md](./spec.md)

Quien atiende un desastre en Colombia y con que plata. Todo lo de este documento se
verifico en fuentes publicas en la fecha indicada; las fuentes estan al final.

> **Advertencia de vigencia.** Los fondos y medidas creados por la emergencia economica
> de agosto de 2026 estan anunciados, no consolidados. Su reglamentacion puede cambiar y
> hay que verificarlos antes del piloto. El marco de la Ley 1523 de 2012, en cambio, es
> estable desde hace mas de una decada.

---

## El sistema

La Ley 1523 de 2012 creo el **Sistema Nacional de Gestion del Riesgo de Desastres
(SNGRD)**. Su premisa es la misma de nagomu: la gestion del riesgo es responsabilidad de
todas las autoridades, y cada nivel actua dentro de su competencia y jurisdiccion.

La ley no solo permite la arquitectura de tres niveles del proyecto, **la exige**: obliga
a que cada nivel constituya su propio fondo, con autonomia tecnica y financiera.

## Quien responde, por nivel

| Nivel | Instancia colegiada | Preside | Entidad rectora |
|---|---|---|---|
| Municipal | **CMGRD** — Consejo Municipal de Gestion del Riesgo | Alcalde | Alcaldia |
| Departamental | **CDGRD** — Consejo Departamental de Gestion del Riesgo | Gobernador | Gobernacion |
| Nacional | **CNGRD** — Consejo Nacional de Gestion del Riesgo | Presidente | **UNGRD** |

La **UNGRD** coordina el sistema completo. Del nivel nacional dependen ademas tres comites
—conocimiento del riesgo, reduccion del riesgo y manejo de desastres— que preside el
director de la UNGRD y donde se sientan el DNP, las fuerzas militares, la Policia, la
Defensa Civil, la Cruz Roja y la Direccion Nacional de Bomberos.

**Para el sismo del 10 de agosto de 2026** se sumaron: el DAPRE, que emitio la declaratoria
de desastre; el Ministerio de Vivienda, que coordina la reconstruccion; el Ministerio del
Interior en orden publico y servicios; y el Ministerio de Trabajo en proteccion laboral.
Departamentos afectados: Choco, Valle del Cauca, Risaralda, Caldas y Quindio.

Esta institucionalidad **no se almacena en la base de datos**: se deriva del nivel de la
entidad en `lib/instituciones.ts`. Guardarla seria duplicar algo que la ley ya determina, y
abrir la puerta a que una fila afirme que el consejo de Buga es un CDGRD.

## Las fuentes de financiacion

Cargadas en la tabla `Fondo` por `prisma/fondos.ts`. Cada fondo tiene un **ambito**, y la
interfaz solo ofrece a cada entidad los de su ambito mas los externos. Un municipio no
puede declarar que gasta del FNGRD.

### Municipal

| Fondo | Naturaleza | Norma |
|---|---|---|
| **FMGRD** — Fondo Municipal de Gestion del Riesgo | Fondo de gestion del riesgo | Ley 1523/2012, art. 54 |
| Recursos propios del municipio | Propio | — |
| Traslado presupuestal del PDM | Traslado (exige proyecto aplazado) | — |
| **SGP** — Sistema General de Participaciones | Transferencia | Ley 715/2001 |
| Credito publico municipal | Credito | — |

### Departamental

| Fondo | Naturaleza | Norma |
|---|---|---|
| **FDGRD** — Fondo Departamental de Gestion del Riesgo | Fondo de gestion del riesgo | Ley 1523/2012, art. 54 |
| Recursos propios del departamento | Propio | — |
| Traslado presupuestal del PDD | Traslado (exige proyecto aplazado) | — |
| **SGR** — Regalias, asignaciones departamentales | Regalias | Ley 2056/2020 |

### Nacional

| Fondo | Naturaleza | Norma |
|---|---|---|
| **FNGRD** — Fondo Nacional de Gestion del Riesgo | Fondo de gestion del riesgo | Ley 1523/2012, art. 47 |
| **Fondo Milagro** | Fondo de gestion del riesgo | Emergencia economica, agosto 2026 |
| **Fondo Adaptacion** | Fondo de gestion del riesgo | Decreto 4819/2010 |
| Presupuesto General de la Nacion | Propio | — |
| **SGR** — Regalias, asignaciones nacionales | Regalias | Ley 2056/2020 |
| **Obras por impuestos** | Ejecucion en especie | Decretos 1650 y 893/2017 |

El FNGRD tiene cinco subcuentas: conocimiento del riesgo, reduccion del riesgo, manejo de
desastres, recuperacion y proteccion financiera. No se modelan todavia; cuando haga falta,
son un campo mas en el aporte.

### Externo

| Fondo | Naturaleza |
|---|---|
| **Banco Mundial**, credito Cat DDO | Credito |
| Cooperacion internacional bilateral | Cooperacion |
| Donacion privada y gremial | Donacion |

---

## Dos hallazgos que cambiaron el diseño

### 1. Obras por impuestos ya es la intervencion directa de nagomu

En este mecanismo **la empresa ejecuta la obra en lugar de girar el impuesto**. El proyecto
necesita concepto de viabilidad de la entidad nacional competente e inscripcion en un banco
de proyectos; lo administran la Agencia de Renovacion del Territorio y el DNP.

Es, punto por punto, la `Intervencion` que la especificacion ya define: un tercero ejecuta
con alcance declarado, valor equivalente y autorizacion previa. No hay que inventar nada;
hay que reconocer que el mecanismo existe y tiene norma.

Hoy aplica solo en municipios ZOMAC y PDET. Tras el sismo se propuso extenderlo a los
municipios afectados, lo que lo volveria una fuente central de la reconstruccion.

### 2. El catalogo de fondos reemplaza al enum de origen

La especificacion original definia `origen` como un enum plano: recursos propios, traslado
presupuestal, credito, regalias, transferencia nacional, cooperacion internacional.

Ese enum no distingue el FNGRD del FMGRD —ambos serian "fondo"— ni sabe que un municipio no
puede gastar del nacional. Un catalogo con ambito hace tres cosas que el enum no puede:

1. La interfaz ofrece a cada entidad solo lo que le corresponde.
2. La auditoria dice de que fondo concreto salio cada peso, no de que categoria.
3. La regla de "exige proyecto aplazado" viaja con el fondo, no repartida en el codigo.

El cambio se hizo antes de que existiera `Aporte`, asi que no hubo migracion que deshacer.

---

## Pendientes de verificacion

- **Codigos DANE** de municipios y departamentos en la semilla: provisionales.
- **Fondo Milagro**: anunciado el 13 de agosto de 2026. Falta el decreto que lo reglamenta,
  y con el sabremos quien lo administra exactamente y como se accede.
- **Extension de obras por impuestos** a municipios no ZOMAC ni PDET: propuesta, no norma.
- **Flexibilizacion del SGR** y uso extraordinario del 7% de SGP de deporte y cultura:
  anunciadas como medidas de la emergencia, sin reglamentar al momento de escribir esto.
- **Subcuentas del FNGRD**: existen pero no se modelan. Se agregan cuando un aporte real
  necesite decir de cual salio.

## Fuentes

- [Ley 1523 de 2012 — Gestor Normativo, Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=47141)
- [Estructura del SNGRD — portal UNGRD](https://portal.gestiondelriesgo.gov.co/paginas/estructura.aspx)
- [Manual del Estado — UNGRD, Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/manual-estado/estructura-estado.php?id=519)
- [Abecé de las medidas del Gobierno ante la crisis por el terremoto — El Tiempo](https://www.eltiempo.com/politica/gobierno/abece-de-las-medidas-tomadas-por-el-gobierno-ante-la-crisis-por-el-terremoto-declaratoria-de-desastre-emergencia-economica-creditos-y-auxilios-3578670)
- [Obras por impuestos para financiar la reconstrucción — Infobae](https://www.infobae.com/colombia/2026/08/15/obras-por-impuestos-se-perfila-como-via-para-financiar-la-reconstruccion-tras-el-terremoto-en-colombia-asi-funcionaria/)
- [Fondo Milagro y emergencia económica — France 24](https://www.france24.com/es/am%C3%A9rica-latina/20260813-de-la-espriella-anuncia-medidas-de-emergencia-econ%C3%B3mica-incluido-el-fondo-milagro)
- [Emergencia económica y crédito del Banco Mundial — Infobae](https://www.infobae.com/colombia/2026/08/11/gobierno-declarara-emergencia-economica-por-terremoto-en-colombia-el-banco-mundial-destinara-usd450-millones-para-atender-la-situacion/)
- [Presupuesto bienal de regalías 2025-2026 — Presidencia](https://www.presidencia.gov.co/prensa/Paginas/Congreso-aprobo-el--presupuesto-bienal-de-regalias-2025-2026-por-309-billones-241205.aspx)
- [Fondo Adaptación](https://www.fondoadaptacion.gov.co/)
