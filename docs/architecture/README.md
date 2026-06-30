# Architecture Documentation

This directory contains the default architecture documentation for the
Workforce Planning application. Each article covers one cross-cutting concern.

| Article | What it covers |
|---------|---------------|
| [Communication Flow](./communication-flow.md) | How components talk to each other — client↔server, server↔storage, CI↔Azure · [diagram](./communication-flow.excalidraw) |
| [Data Flow](./data-flow.md) | How data moves through the system — read paths, write paths, scenario engine · [diagram](./data-flow.excalidraw) |
| [Azure Resources](./azure-resources.md) | Cloud resource inventory, topology, and configuration · [diagram](./azure-resources.excalidraw) |
| [Security & Identity](./security-identity.md) | Threat model, auth posture, input validation, accepted risks · [diagram](./security-identity.excalidraw) |
| [Architecture Decisions](./decisions.md) | ADR-style records incorporating Azure best-practices recommendations |

A visual overview diagram is available at
[../architecture.excalidraw](../architecture.excalidraw) and
[../ARCHITECTURE.md](../ARCHITECTURE.md).
