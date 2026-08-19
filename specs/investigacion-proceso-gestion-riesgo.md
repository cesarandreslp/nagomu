# Investigación: cómo funciona de verdad el proceso (Colombia, SNGRD)

Base para futuros specs. Recopila cómo opera realmente la atención de un desastre natural
(terremoto, avalancha, etc.) en Colombia, para que el diseño de nagomu no se aleje de la
realidad institucional. **No es un spec**; es material de referencia.

Fecha: 2026-08-18. Marco legal: **Ley 1523 de 2012** (Sistema Nacional de Gestión del Riesgo de
Desastres — SNGRD). Contexto actual: hay un **terremoto en el Chocó (2026)** en curso, y el Chocó
está en el piloto (Sipí, San José del Palmar).

---

## Principios que rigen la plata (Ley 1523)

- **Subsidiariedad positiva**: el nivel superior (departamento, nación) DEBE acudir en ayuda del
  inferior cuando este no tiene los medios. No antes.
- **Concurrencia**: varios niveles unen aportes (cofinancian) de forma no jerárquica.
- Más solidaridad y coordinación.

Esto explica el ámbito de los fondos (un municipio no gasta del fondo nacional) que nagomu ya
modela.

---

## El flujo completo, por fases

### Fase 0 — Evaluación (el paso PREVIO a declarar calamidad)

1. **EDAN** (Evaluación de Daños y Análisis de Necesidades): evaluación estandarizada que hacen
   los equipos de respuesta. Diagnostica daños, necesidades y capacidad de respuesta.
2. **Inventario de inmuebles afectados + inspección técnica/estructural**: una brigada
   (bomberos, ingenieros, la alcaldía) visita y **clasifica cada inmueble**:
   **habitable / daño parcial (reparable) / debe demolerse**.
3. **Certificado de afectación**: con base en la inspección, la alcaldía lo emite. Es el documento
   que acredita a una persona/hogar como damnificado ante el gobierno nacional.
4. **RUD (Registro Único de Damnificados)**: censo oficial de personas/hogares afectados. **NO es
   en línea**: se hace en la alcaldía / CMGRD. Es la puerta a casi todas las ayudas.

### Fase 1 — Declaratoria y plan

5. El **CMGRD** (Consejo Municipal de Gestión del Riesgo) consolida el EDAN y evalúa **su propia
   capacidad**. Si la supera, el **alcalde declara Calamidad Pública** y se elabora un
   **Plan de Acción Específico (PAE)**.

### Fase 2 — Solicitud y cofinanciación (la plata para reconstruir)

6. **Solicitud (subsidiariedad)**: en el PAE el municipio **solicita los recursos que le faltan**
   al nivel superior. Escala municipio → **CDGRD** (departamental) → **UNGRD** (nacional). Cada
   nivel evalúa su capacidad antes de pedir arriba.
7. **Formulación y radicación**: se formula el proyecto (estudios, presupuesto) y se **radica** en
   el banco de proyectos / ante la UNGRD.
8. **Viabilización**: evaluación técnica y económica. Viable → entra al banco; si no, se devuelve
   con observaciones.
9. **Aprobación y cofinanciación (concurrencia)**: el **ordenador del gasto y/o la Junta Directiva
   del FNGRD** aprueba según prioridades y disponibilidad. El reparto entre niveles se pacta en un
   **convenio interadministrativo de cofinanciación** (cuánto pone cada uno). El monto/% NO lo
   decide unilateralmente el aportante.
10. **Fondos que se reparten**: FNGRD (con **subcuentas**) y el SGR reciben recursos y la Junta los
    **distribuye entre subcuentas/proyectos según prioridades**. → patrón real de "una bolsa que
    se divide entre obras".

### Fase 3 — Atención a las personas (paralela a la reconstrucción)

Puerta única: **alcaldía / CMGRD**. Prerrequisito: estar en el **RUD**. Ayudas y quién las da:

- **Ayuda humanitaria** (kits: alimentos, agua, colchonetas, aseo): UNGRD, Cruz Roja, Defensa Civil.
- **Subsidio de arriendo**: para vivienda colapsada o inhabitable. Ministerio de Vivienda.
- **Subsidio/solución de vivienda**: Ministerio de Vivienda.
- **Salud de heridos**: el **sistema de salud (EPS/IPS)** atiende, incluso sin afiliación; las IPS
  reclaman el reembolso ante **ADRES**. Incluye urgencias, cirugía, hospitalización, traslados.
- **Fallecidos / discapacidad permanente**: **indemnizaciones y auxilio funerario** (vía
  ADRES/UNGRD), priorizado para familias sin seguro exequial; requiere certificación de la UNGRD.
- Se prioriza además la **afiliación al régimen subsidiado** de los afectados.

El proceso es **gratuito y sin intermediarios** (hay alertas de fraude: nadie debe cobrar por
inscribir en el RUD ni por tramitar subsidios).

### Fase 4 — Ejecución y cierre de la obra

11. La obra se ejecuta con **interventoría/supervisión** (Ley 1474 de 2011).
12. **Acta de entrega y recibo a satisfacción**: el contratista entrega, la interventoría recibe.
13. **Acta de liquidación** del contrato (ordenador del gasto + interventor + contratista): cierre
    financiero/legal. → "obra finalizada" real = recibida a satisfacción y liquidada.

---

## Mapa a nagomu: qué hay, qué falta, qué NO replicar

**Ya modelado (bien encaminado):**
- Catálogo de **fondos** reales (FNGRD/FMGRD/FDGRD, SGR, cooperación) con su ámbito.
- **Inventario de ítems afectados** (`ItemInventario`) y **obras** con su ciclo de estado.
- **Oferta institucional** (`OfertaInstitucional`) con `requiereRud`, `certificaEntidad` y tipos
  (alojamiento, salud, vivienda, indemnización, alivios): ya "sabe" que el RUD es la puerta y que
  cada ayuda tiene quién la certifica.
- La **cola de priorización** (reparte la capacidad fiscal del municipio entre obras).

**Huecos identificados (candidatos a spec):**
- **Clasificación de habitabilidad** del inmueble (habitable / reparar / **demoler**) en
  `ItemInventario`. Es justo lo que produce el EDAN/inspección, y conecta con la primera pregunta
  de toda la sesión ("inventario de viviendas: intervenir vs demoler").
- **Solicitud de cofinanciación** con estado (solicitada → viabilizada → aprobada/negada): el
  trámite de la Fase 2 que hoy no tiene dueño.
- **Asignación distribuible** (bolsa que se reparte entre obras por prioridad): Fase 2, paso 10.
- **Cierre con acta de recibo** antes de dar la obra por Beneficiada: Fase 4.

**Lo que nagomu NO debe replicar (Principio IV — mínimo de datos personales):**
- **No ser el RUD** ni almacenar datos personales de los damnificados (nombres, salud, ubicación
  de personas). El RUD es el registro oficial externo. nagomu **cataloga y hace navegable la ruta**
  de ayudas (qué existe, quién certifica, si requiere RUD) sin duplicar el censo. La atención a
  heridos/fallecidos la manejan salud/ADRES/UNGRD, no nagomu; a lo sumo nagomu apunta a ellas
  desde la oferta institucional.

---

## Fuentes

Marco y cofinanciación:
- Ley 1523 de 2012 — https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=47141
- Ley 1523 (texto) — http://www.secretariasenado.gov.co/senado/basedoc/ley_1523_2012.html
- UNGRD, Guía de formulación de proyectos de intervención correctiva —
  http://portal.gestiondelriesgo.gov.co/Documents/SRR/guia_formulacion_proyectos_intervencion_correctiva.pdf
- UNGRD, Guía metodológica del Plan de Acción Específico (PAE) —
  https://portal.gestiondelriesgo.gov.co/Documents/Guias/Guia_Metodologica_Elaborar_Plan_Accion_Especifico_PAE.pdf
- SGR, orientaciones de gestión de proyectos (Minvivienda) —
  https://www.minvivienda.gov.co/sites/default/files/documentos/orientaciones-transitorias-gestion-proyectos-v-2.0-08-04-2021.pdf

Evaluación de daños y damnificados:
- EDAN — Guía metodológica (Minambiente) —
  https://www.minambiente.gov.co/wp-content/uploads/2021/12/Documento-preliminar-EDANA-C-V3-Diciembre-29.pdf
- EDAN — OCHA Colombia Wiki —
  https://wikicolombia.unocha.org/index.php?title=Evaluaci%C3%B3n_de_Da%C3%B1os_y_An%C3%A1lisis_de_Necesidades
- Registro Único de Damnificados (RUD) — Repositorio UNGRD —
  http://repositorio.gestiondelriesgo.gov.co/bitstream/handle/20.500.11762/19507/4.RUD-ASA-Cartagena-VF.pdf
- Ruta de ayudas para damnificados (terremoto 2026) —
  https://www.radionacional.co/actualidad/tu-vivienda-resulto-afectada-por-el-terremoto-esta-es-la-ruta-para-acceder-las-ayudas

Salud, cierre de obra:
- ADRES — recursos para víctimas (terremoto 2026) —
  https://www.lafm.com.co/sociedad/terremoto-colombia-adres-seguros-afectados-heridos-ayudas-pagos-dinero-407424
- Indemnizaciones y gastos funerarios —
  https://cambiocolombia.com/pais/articulo/2026/8/anuncian-indemnizaciones-y-apoyo-en-gastos-funerarios-para-victimas-del-terremoto-conozca-como-reclamarlas
- INVIAS — Manual de interventoría de obra pública —
  https://caminoscomunitarios.invias.gov.co/docs/caja-herramientas/anexos-modulo-tecnico/manual_interventoria_inv.pdf
- Acta de entrega y recibo a satisfacción (Findeter, ejemplo) —
  https://www.findeter.gov.co/system/files/convocatorias/PAF-ICBF-O-035-2016/1._acta_de_entrega.pdf
