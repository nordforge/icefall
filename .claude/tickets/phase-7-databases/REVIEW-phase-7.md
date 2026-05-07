# Phase Review: Code quality, performance & security audit

**Priority:** High
**Estimate:** S

## Description

Run the `simplify` skill (3-agent parallel review) on all code written in this phase before marking the phase as complete.

## Acceptance Criteria

- [ ] Code reuse review: no duplicated utilities, shared patterns extracted
- [ ] Code quality review: no logic bugs, proper error handling, no stringly-typed code
- [ ] Efficiency review: no N+1 patterns, no hot-path blocking, no unbounded memory growth
- [ ] Security review: no unvalidated input, no secret leakage, OWASP basics
- [ ] `cargo build` + `cargo clippy` clean
- [ ] `cargo test` — all tests pass
- [ ] Frontend: `bun run build` succeeds (if applicable)
- [ ] All issues found are fixed or documented with justification for deferral
