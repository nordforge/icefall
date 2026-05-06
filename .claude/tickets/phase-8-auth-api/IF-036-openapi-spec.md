# IF-036: OpenAPI specification

**Phase:** 8 — Auth & API
**Priority:** Medium
**Estimate:** S

## Description

Auto-generate an OpenAPI 3.1 specification from the Axum route handlers for API documentation.

## Acceptance Criteria

- [ ] OpenAPI spec generated at build time or served dynamically
- [ ] All REST endpoints documented with:
  - Request/response schemas
  - Authentication requirements
  - Path/query parameters
  - Example payloads
  - Error responses
- [ ] Spec served at `GET /api/v1/openapi.json`
- [ ] Swagger UI or Scalar served at `GET /api/v1/docs` (optional, can be a static asset)
- [ ] Spec validated: passes OpenAPI 3.1 linting
- [ ] Used by: MCP server tool definitions, CLI client, third-party integrations

## Dependencies

- IF-006 (all route handlers must exist)
