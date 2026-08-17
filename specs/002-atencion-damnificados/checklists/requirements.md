# Specification Quality Checklist: Censo de hogares y seguimiento de la atención a damnificados

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-17
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

**Estado: creada, no habilitada.** Por decisión expresa, esta funcionalidad no se implementa
hasta que haya claridad sobre el manejo que se le va a dar. La especificación existe para que
la decisión se tome sobre algo concreto, no en abstracto.

Quedan 3 marcadores [NEEDS CLARIFICATION] pendientes, y los tres son precisamente decisiones
de manejo, no detalles técnicos:

1. **Identificación del hogar** — sin documento de identidad, qué distingue a una familia de
   otra y si el censo podrá cruzarse con el RUD nacional.
2. **Quién opera el canal público** — es lo que hace funcionar la detección de duplicados,
   pero traslada carga de verificación al municipio y abre la puerta a reportes falsos.
3. **Plazo de las certificaciones** — el número a partir del cual el sistema empieza a
   señalar a un municipio por demora.

Los demás criterios pasaron en la primera iteración de validación.

**Riesgo señalado para la fase de planeación**: esta funcionalidad rompe el modelo de lectura
abierta de la spec 001. Allí cualquier usuario autenticado ve cualquier obra; aquí el acceso a
datos identificables se restringe al municipio dueño. El plan técnico debe resolver esa
restricción en el servidor y probarla, no darla por hecha.
