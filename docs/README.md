# Documentation

[English](README.md) · [Português](pt-BR/README.md)

Everything here is in English, and each document has its Portuguese twin at the same path under [pt-BR/](pt-BR/). `python scripts/check-docs.py` (it runs in CI) checks that every link works and that no document is missing its twin.

## Guides: how to do things

| Document | For |
|----------|-----|
| [DEVELOPMENT.md](guides/DEVELOPMENT.md) | Running the database, the API and the site on your machine; the configuration variables; when something goes wrong |
| [TESTING.md](guides/TESTING.md) | The test strategy: the layers, how to run them, the accessibility checklist, performance, coverage notes |
| [DEPLOYMENT.md](guides/DEPLOYMENT.md) | The runbook: creating and preparing the VM, connecting GitHub, deploying, rolling back, monitoring, backups, secrets |

## Decisions: why it is the way it is

| Document | Decision |
|----------|----------|
| [ADR-001](decisions/ADR-001-stack-and-layout.md) | Stack and repository layout |
| [ADR-002](decisions/ADR-002-voice-approach.md) | The voice: model, tone, treatment, guards, fallback |
| [ADR-003](decisions/ADR-003-data-model-and-retention.md) | Data model and retention |
| [ADR-004](decisions/ADR-004-hosting.md) | Hosting and how it is built |
| [ADR-005](decisions/ADR-005-error-monitoring.md) | Error monitoring and what may leave the server |

A new decision is a short ADR (context, decision, alternatives, consequences) numbered in order.

## Reference

| Document | What it describes |
|----------|-------------------|
| [api/README.md](api/README.md) · [api/openapi.yaml](api/openapi.yaml) | The four endpoints, the single-use behaviour, the contract (OpenAPI 3.1) |
| [design/tokens.md](design/tokens.md) · [design/wireframes.md](design/wireframes.md) | The visual direction: colours, type, spacing, the screens. [reference.html](design/reference.html) is the approved visual reference |

## Project: how it is run

| Document | What it is |
|----------|-----------|
| [project/PLAN.md](project/PLAN.md) | The master plan: phases, checkpoints, the rules, and the changes made along the way |
| [project/STATUS.md](project/STATUS.md) | Where the project is right now, with its history |
| [project/releases/v1.0.0.md](project/releases/v1.0.0.md) · [CHANGELOG.md](../CHANGELOG.md) | The release notes of v1.0.0 (what it does well, its known limits) and the changelog of every release |

## Other

[assets/](assets/) holds the images used by the READMEs. Each of [backend/](../backend/README.md) and [frontend/](../frontend/README.md) has its own README for working inside it.
