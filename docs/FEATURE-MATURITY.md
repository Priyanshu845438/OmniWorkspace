# OmniWorkspace Feature Maturity Matrix (Phase 2 Post-Hardening)

This document reflects the **actual implementation reality** of OmniWorkspace following Phase 2: Integration, Production Hardening & End-to-End Execution.

Features are classified using strict criteria:
* **Production**: Fully implemented, connected to live backend systems, covered by automated unit/integration tests, zero simulated or placeholder data, real security gating.
* **Functional**: Live and operational; handles primary flows with resilient fallbacks; may require additional user configuration (e.g. BYOK keys for external models).
* **Partial**: Core backend and UI connected, but specialized sub-capabilities require specific external infrastructure.
* **Simulation**: Features that simulate behaviour rather than executing real mutations (e.g. dry-run workflows).
* **Mock**: Synthetic mockups or hardcoded responses (eliminated in completed features).
* **Planned**: Architected on roadmap but pending implementation.

---

## 1. Core Subsystems Matrix

| Subsystem | Maturity Status | Live Backend Service | Verified By Tests | Notes & Security Gates |
| :--- | :--- | :--- | :--- | :--- |
| **Execution Contract** | **Production** | `server/src/types/execution_contract.ts` | `golden_pipeline_integration.test.ts` | Strongly-typed execution lifecycle, ApprovalState, CancellationState, CandidateRoute. |
| **Golden Pipeline** | **Production** | `TaskOrchestrator.orchestrate(...)` | `task_orchestrator.test.ts`, `golden_pipeline_integration.test.ts` | 9-stage sequence: Intent ➔ Classification ➔ Capability Analysis ➔ Context ➔ Risk Analysis ➔ Model Selection ➔ Plan ➔ Agent Execution ➔ Verification. |
| **Model Router** | **Production** | `ModelRouter.selectRoute(...)` | `model_router.test.ts`, `golden_pipeline_integration.test.ts` | Composite weighted scoring (context, priority, local affinity), dynamic fallback chains. |
| **Provider Gateway** | **Production** | `ProviderGateway`, `OpenAICompatibleAdapter`, `OllamaAdapter` | Gateway error normalizer | Normalized error codes (AUTHENTICATION_FAILED, RATE_LIMIT_EXCEEDED, etc.), automatic secret scrubbing. |
| **BYOK Credential Vault** | **Production** | `CredentialVault` | `tools_security.test.ts`, `diagnostics_exporter.test.ts` | AES-256-GCM authenticated encryption at rest, secure IVs, machine salt, 0% telemetry leakage. |
| **Task Cancellation** | **Production** | `activeTasks` Map, `POST /api/orchestrate/cancel`, `AbortController` | `golden_pipeline_integration.test.ts` | End-to-end signal propagation: UI ➔ Server ➔ Agent ➔ Gateway ➔ Tool ➔ Child Process. |
| **Context Engine** | **Production** | `ContextEngine`, `PathShield` | `task_orchestrator.test.ts` | Token-budgeted context assembly, active file, git status, terminal output, sensitive file exclusion. |
| **Verification Engine** | **Production** | `VerificationEngine` | `golden_pipeline_integration.test.ts` | Automated compilation check (`npm run typecheck`), SQLite EXPLAIN execution plan, DAG validation. |
| **Plugin Security** | **Production** | `PluginManager` | `security_hardening.test.ts` | Alphanumeric manifest ID validation, elevated permission gating (`terminal`, `database`, `writeWorkspace`). |
| **SQLite Persistence** | **Production** | `WorkspaceDatabase` (`node:sqlite`) | `security_hardening.test.ts` | Durable storage for conversations, workflows, providers, audit logs using Node built-in SQLite engine. |
| **PathShield** | **Production** | `PathShield` | `tools_security.test.ts` | Canonicalization, symlink escape defense, forbidden pattern blacklists (`.env`, `.git`, `credentials`). |
| **CommandShield** | **Production** | `CommandShield` | `tools_security.test.ts` | Blocks hazardous shell commands (`rm -rf /`, fork bombs, curl piped to bash, sudo). |
| **PromptDefense** | **Production** | `PromptDefense` | `prompt_injection_defense.test.ts` | System prompt hardening, external context quarantine `<untrusted_content>` tags. |

---

## 2. Perspective Views Maturity Matrix

| View | Maturity Status | Live Backend Connection | Key Capabilities | Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Chat Studio** | **Production** | `POST /api/orchestrate/stream`, `POST /api/chat` | Natural language universal intent classification, streaming tokens, dual-model arena comparison, timeline inspection. | Live SSE streaming & cancellation verified |
| **Code Studio** | **Production** | `GET/POST /api/workspace/files`, `GET/POST /api/workspace/file`, `GET /api/git/status` | File tree explorer, tab management, find/replace, git branch indicator, Side-by-Side Diff against disk, AI Review & Fix, AI Test & Repair. | File read/write, diffing, AI dispatch verified |
| **SQL Console** | **Production** | `GET /api/sql/schema`, `POST /api/sql/query` | Schema table & column browser, query presets, live query execution, EXPLAIN plan inspection, CSV export, **Destructive SQL Confirmation Gating**. | `security_hardening.test.ts` |
| **Data View** | **Production** | Client statistical engine + `data` agent integration | CSV import/export, statistical distribution (mean, median, min, max, IQR, stdDev), sorting, multi-column filters, SVG chart export, AI Dataset Analysis. | Real dataset computations verified |
| **Research View** | **Production** | `POST /api/research/search`, `web_search` tool | Real web search queries via DDG HTML gateway, SSRF-guarded network fetching, epistemic badges (FACT, INFERENCE, ESTIMATE, UNKNOWN), AI Evidence Synthesis. | `security_hardening.test.ts` |
| **Automation Studio** | **Production** | `GET/POST /api/workflows`, `POST /api/workflows/:id/run` | DAG editor, node configuration (trigger, action, condition, transform, output), visual step traversal, **Dry-Run Validation**, Live Execution, Export. | `golden_pipeline_integration.test.ts` |
| **Document Studio** | **Production** | `GET /api/workspace/file`, `document` agent | Real workspace documentation browser (`README.md`, `ARCHITECTURE.md`, `SECURITY.md`, etc.), line/word/char counting, zero-fabrication AI summarization. | Workspace file loading & AI dispatch verified |
| **Media Studio** | **Functional** | `GET /api/models`, `media` agent | Genuine model capability discovery, multimodal compatibility reporting (vision vs image generation), technical prompt & specification generation. (No fake renders). | Capability discovery & prompt synthesis verified |
| **Architecture Graph** | **Production** | `GET /api/workspace/architecture` | Project indexer graph, dependency visualizer, symbol inspector, direct file open in Code Studio. | `project_indexer.test.ts` |
| **Model Manager** | **Production** | `GET /api/models`, `GET /api/models/providers`, `POST /api/models/test` | Provider status, model enablement toggles, capability checklist, connection latency test, priority ranking. | Provider gateway connection test verified |
| **Settings & Security** | **Production** | `GET /api/credentials/keys`, `POST /api/credentials/key`, `GET /api/diagnostics/export` | BYOK secret vault management (AES-256-GCM), theme switcher (dark/light), safe redacted diagnostic export. | `diagnostics_exporter.test.ts` |

---

## 3. Epistemic & Security Commitments

1. **Local-First Zero Telemetry**: OmniWorkspace makes zero external telemetry pings. All credentials remain on the user's workstation.
2. **Never Mask Failures**: Unconfigured capabilities (e.g. image diffusion without an active image provider) explicitly inform the user rather than faking results with static stock imagery.
3. **Destructive SQL Safety**: Schema alteration and unconstrained deletions require explicit parameter `isUserConfirmed: true` and UI confirmation banners.
4. **End-to-End Task Cancellation**: Halts running fetches, agent iterations, gateway streams, and kills child command processes with SIGTERM.
