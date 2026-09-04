# Phase 2 Engineering Audit: OmniWorkspace Integration & Hardening

**Date**: September 2026  
**Auditor**: Principal Systems, Agent & Security Architect  
**Scope**: Full Stack Inspection across Backend (`server/`), Frontend (`client/`), Desktop Container (`electron/`), Security Perimeter, Tools, Storage, and CI/CD  
**Branch**: `phase-2/integration-hardening`

---

## 1. Current Architecture Overview

OmniWorkspace is structured as a modular, local-first platform with three principal runtime layers:
1. **Frontend Client (`client/src/`)**: Built on React 19, TypeScript, Vite 6, and a Vanilla CSS design token system (`styles/design-system.css`). Features 12 perspective views, a Universal Command Bar, a Global Command Palette (`Cmd+K`), an Execution Timeline, and a collapsible Bottom Panel hosting sandbox shell, git, problems, and security audit logs.
2. **Backend Service (`server/src/`)**: Node.js 24+ running Express 4.21 with Server-Sent Events (SSE) streaming on port 3001. Embeds zero-dependency native SQLite (`node:sqlite DatabaseSync`), an AES-256-GCM BYOK credential vault, model registry, capability-based model router, multi-provider gateway (NVIDIA NIM, OpenRouter, Ollama, OpenAI), 20+ sandboxed tools, ReAct agent loops, AST project indexer, DAG workflow engine, and third-party plugin manager.
3. **Desktop Container (`electron/`)**: Electron 34 with secure context isolation, native menus, and an automated background child process supervisor that boots `dist-server/index.js` in production builds. Packages into Windows NSIS installers and portable executables via `electron-builder`.

---

## 2. Inventory of Subsystems & Existing Working Flows

### Verified Working Subsystems
* **Sandbox Security Perimeter**:
  - `PathShield` (`server/src/core/security/path_shield.ts`): Successfully intercepts path traversals (`../../`), blocks symlink escapes, and confines reads/writes strictly within `WORKSPACE_ROOT`.
  - `CommandShield` (`server/src/core/security/cmd_shield.ts`): Blocks fork bombs, root wipes (`rm -rf /`), raw drive writes, and exfiltration attempts.
  - `PromptDefense` (`server/src/core/security/defense.ts`): Encapsulates external inputs inside `<untrusted_data>` boundaries.
  - `PermissionManager` (`server/src/core/security/permissions.ts`): Enforces Level 0 to Level 4 authorization gates.
* **BYOK Credential Vault**:
  - `CredentialVault` (`server/src/core/credentials/vault.ts`): Encrypts API keys with AES-256-GCM. Provides in-memory secret redaction.
* **Project Intelligence Engine**:
  - `ProjectIndexer` (`server/src/core/intelligence/project_indexer.ts`): AST symbol parser extracting functions, classes, interfaces, import graphs, and circular dependency cycles. Exposed via `/api/workspace/architecture`.
* **Universal Command Palette (`Cmd+K`)**:
  - Fully functioning navigation between views, workspace files, and quick actions with keyboard accessibility.
* **Sandbox Terminal & Git Operations**:
  - Shell execution with command history recall (`↑`/`↓`), quick preset pills, and Git status/diff inspection.
* **Automated Test Matrix**:
  - 25 of 25 passing unit and integration tests across 7 test suites.

---

## 3. Broken Flows Identified

1. **Dual-Model Arena API Route (`ChatView.tsx`)**:
   - `ChatView.tsx` executes `fetch('/api/chat', { method: 'POST', body: JSON.stringify({ prompt, model }) })`.
   - **Defect**: The route `/api/chat` was not registered on the Express server in `server/src/index.ts` (returns 404).
2. **Missing SSE Abort / Cancellation**:
   - `server/src/index.ts` `/api/orchestrate/stream` does not listen for `req.on('close')` nor instantiate an `AbortController`.
   - If the user navigates away or hits Stop in the UI, agent reasoning loops and child processes continue executing as zombies.
3. **Missing Tool Execution Signal Passthrough**:
   - While `BaseAgent.execute(...)` accepts an optional `signal?: AbortSignal`, it did not pass the signal into child tools (`run_command`, `fetch_page`, `web_search`), preventing terminal processes and fetch requests from aborting.

---

## 4. Partially Implemented Flows

1. **Model Selection in Execution Timeline**:
   - `TaskOrchestrator.orchestrate(...)` selects an agent and generates classification and planning trace steps, but does not emit a dedicated `model_selection` trace step with scores, matched capabilities, and fallback chains before running the agent.
2. **Human-in-the-Loop Approvals (Level 2-4)**:
   - `ExecutionTimeline.tsx` renders approval cards when a step has `status === 'waiting_approval'`, but lacks an interactive callback API (`POST /api/orchestrate/approve/:id`) to unblock paused agent executions.
3. **Context Engine File Pinning**:
   - `ContextEngine.assembleContext(...)` collects basic workspace root and active file, but lacks dynamic token budgeting, selection context, git diff inclusion, and pinned file lists from open editor tabs.

---

## 5. Mock / Simulated Flows Requiring Real Implementations

1. **Research Canvas (`ResearchView.tsx`)**:
   - Currently triggers a shell script command and populates **hardcoded mock search result cards** (`Primary Source: Comprehensive Analysis...`).
   - **Required Fix**: Connect directly to `server/src/core/tools/web_tools.ts` (`web_search`, `fetch_page`, `extract_content`) and `ResearchAgent` to produce real, verified search results with epistemic attribution.
2. **Generative Media Studio (`MediaView.tsx`)**:
   - Currently runs a `setTimeout(..., 1500)` and loads a static Unsplash photo URL.
   - **Required Fix**: Replace fake timeout with real capability detection. Check whether configured models/providers declare `image_generation` or `text_to_speech`. If unsupported, explicitly notify the user rather than faking generation.
3. **Document Studio (`DocumentView.tsx`)**:
   - Currently displays static text for `README.md` with an inert "Regenerate" button.
   - **Required Fix**: Connect to `/api/workspace/file` and `read_document` tool, parse actual workspace documents, and execute the real `DocumentAgent` via the orchestrator.
4. **Tool Dummy Image Return (`media_automation_doc_tools.ts`)**:
   - `generate_image` tool handler returns a static Unsplash URL. It must validate credentials, verify provider support, or return a clear diagnostic explaining that an image generation provider is not configured.

---

## 6. Missing Integrations

* **Unified Execution Contract**:
  - Currently, frontend and backend share generic interfaces. A single strongly typed `ExecutionContract` (representing task ID, session ID, task type, capabilities, selected model, fallback chain, step traces, verification, and cancellation) is needed across orchestrator, agents, tools, and UI.
* **Direct UI Chat to Dedicated Agents**:
  - When the user selects "Coding Specialist" or "SQL Specialist" in Chat, the orchestrator accepts `agentType`, but model capability routing must ensure the appropriate capability set is scored accordingly.
* **Coding Studio Repair Loop**:
  - Code View has "Explain with AI" and "Save", but lacks an automated "Test & Repair" loop that runs the test suite and feeds compilation errors back to the Coding Agent.

---

## 7. Security Risks & Threat Modeling

1. **Vault Encryption Seed**:
   - In desktop mode, `userKeySeed` defaults to an environment variable or deterministic string.
   - **Mitigation**: Utilize machine-unique hardware attributes (e.g., machine ID or OS secure storage) with fallback to local master key to harden against cross-system copying of `.vault.enc`.
2. **Plugin Execution Permissions**:
   - `PluginManager` loads third-party plugins without explicit permission boundaries (e.g. read workspace, write workspace, network, terminal).
   - **Mitigation**: Implement a plugin permission manifest validator and gate plugin tool registration.
3. **SQL Injection Guardrails**:
   - `execute_sql` in `data_sql_tools.ts` executes raw user SQL queries against SQLite.
   - **Mitigation**: Distinguish READ vs WRITE operations. For destructive operations (`DROP`, `DELETE`, `ALTER`), enforce Level 4 explicit confirmation.

---

## 8. Performance Risks

1. **AST Project Indexing Overhead**:
   - Running `projectIndexer.indexProject(true)` on every click re-parses all TypeScript files.
   - **Mitigation**: Ensure cache mtime checking is strictly adhered to, only re-indexing changed files.
2. **Terminal Output Buffering**:
   - Long-running terminal outputs could overwhelm DOM memory without truncation or virtualization.
   - **Mitigation**: Cap terminal buffer memory to the last 2,000 lines.

---

## 9. Test Gaps

* **Missing Integration Tests**:
  - End-to-end task execution from User Request ➔ Router ➔ Agent ➔ Tool ➔ Verification.
  - Dual-model comparison API test.
  - Real cancellation abort signal test.
  - Fallback state machine under simulated 429 rate limit.
  - SQL safety check blocking destructive queries without authorization.

---

## 10. Recommended Implementation Order

1. **Establish Unified Execution Contract (`server/src/types/execution_contract.ts`)**:
   - Define strict TypeScript types for tasks, routing decisions, agent steps, approvals, and observability events.
2. **Harden Model Router & Capability Registry**:
   - Enhance routing algorithm to produce a complete `RouteSelection` including candidate scores, capability matches, and a prioritized fallback chain.
3. **Connect API Endpoints & Implement Real Cancellation**:
   - Add `/api/chat` (dual model arena endpoint).
   - Add `/api/orchestrate/cancel` and wire `req.on('close')` AbortController to agent and tool child processes.
   - Add `/api/research/search` for real web scraping.
4. **Hardening Perspective Views**:
   - Wire `ResearchView.tsx` to real web search and `ResearchAgent`.
   - Wire `DocumentView.tsx` to real file reader and `DocumentAgent`.
   - Wire `MediaView.tsx` to real capability validation.
   - Connect `SqlView.tsx` with safety validation (read vs write vs destructive confirmation).
   - Connect `DataView.tsx` computed statistics to the Data Agent.
5. **Coding Studio Test & Repair Loop**:
   - Integrate code verification and test runner feedback into Code Studio.
6. **Plugin Permission Gating**:
   - Enforce permission limits on third-party plugin tools.
7. **Expand Automated Test Suites**:
   - Add integration tests for End-to-End Execution, Router Fallback, Cancellation, and SQL safety.
8. **Final Build, Audit & Git Push**:
   - Run typecheck, tests, and production build, then commit and push cleanly to `https://github.com/Priyanshu845438/OmniWorkspace`.
