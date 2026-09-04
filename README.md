# OmniWorkspace: Model-Agnostic Universal AI Platform

[![CI Pipeline](https://github.com/omniworkspace/omni-workspace/actions/workflows/ci.yml/badge.svg)](https://github.com/omniworkspace/omni-workspace/actions)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Web-brightgreen.svg)]()
[![Privacy](https://img.shields.io/badge/Telemetry-0%25%20(Local--First)-emerald.svg)]()

> **OmniWorkspace** is a production-grade, open-source, model-agnostic desktop and web platform that unifies:
> **MODEL + TOOL + AGENT + CONTEXT + DATA + WORKFLOW + VERIFICATION**.

---

## 🎯 Product Vision

OmniWorkspace is not a chatbot wrapper or a toy demo. It is a central orchestration layer engineered for professional developers, data scientists, researchers, and automation engineers.

```
USER
  ↓
TASK UNDERSTANDING & CLASSIFICATION
  ↓
CAPABILITY REQUIREMENTS EXTRACTION
  ↓
EXECUTION PLAN & MODEL ROUTING
  ↓
SPECIALIZED AGENT & TOOL EXECUTION (LEVEL 0-4 PERMISSIONS)
  ↓
MULTI-DOMAIN VERIFICATION
  ↓
ACTIONABLE RESULT
```

---

## ⚡ Key Capabilities

| Domain | Description | Specialized Tools & Agents |
| :--- | :--- | :--- |
| **Software Engineering** | Project exploration, code editing, symbol search, build & test runners | `read_file`, `write_file`, `edit_file`, `search_symbols`, `run_tests`, `run_build` |
| **Web & Deep Research** | Multi-source web search, page extraction, fact-checking, citation synthesis | `web_search`, `fetch_page`, `extract_content`, Epistemic Fact vs Inference Tags |
| **SQL & Database Studio** | SQLite/PostgreSQL schema explorer, query execution, EXPLAIN plan inspection | `inspect_schema`, `execute_sql`, `explain_query` |
| **Data Analysis & Charts** | CSV/JSON statistics (mean, median, nulls), real-time dynamic SVG visualizers | `inspect_csv`, `inspect_json`, Bar & Line SVG Chart Engines |
| **Workflow Automation** | Directed Acyclic Graph (DAG) executor with triggers, conditions, and actions | `create_workflow`, `execute_workflow`, Node DAG Pipeline Canvas |
| **Generative Media Studio** | Image generation, speech-to-text (STT), neural text-to-speech (TTS) | `generate_image`, `text_to_speech`, unified media router |
| **Document Processing** | Technical documentation parsing, chunking, and multi-section extraction | `read_document`, verified executive summarizer |
| **Universal AI Chat** | Streaming markdown, code blocks with copy, execution traces, approval cards | SSE streaming, multi-turn ReAct reasoning loop |

---

## 🔒 Security, Privacy & BYOK (Bring Your Own Key)

1. **Direct-to-Provider AI Calls**: Remote AI inference calls communicate directly from your environment to your configured AI provider (NVIDIA NIM, OpenRouter, OpenAI, vLLM). No central proxy.
2. **Local-First Privacy**: Project files, project indices, SQLite databases, and conversation histories stay strictly on your local machine. Zero tracking or telemetry.
3. **AES-256-GCM Encrypted Vault**: API keys are encrypted at rest using machine-derived cryptographic salts. Keys are never logged, exposed in URLs, or leaked in crash dumps. Automatic log redaction is active.
4. **Untrusted Content Boundaries**: All external content (source code, READMEs, web results, SQL data) is wrapped in `<untrusted_data>` blocks to defend against prompt injection and jailbreak attacks.
5. **Multi-Tier Permissions**:
   - **Level 0 (Read-Only)**: File inspection, symbol searches, schema views.
   - **Level 1 (Modify)**: File modifications, git staging.
   - **Level 2 (Execute)**: Terminal commands, test execution.
   - **Level 3 (Network)**: External HTTP and browser scraping with SSRF guardrails.
   - **Level 4 (Destructive)**: File deletions, destructive git operations (requires explicit UI confirmation).

---

## 🖥️ Running as a Windows Desktop App (.exe)

OmniWorkspace includes full **Electron Desktop** packaging for Microsoft Windows.

### 1. Run Windows Desktop App in Development
```bash
npm run dev:electron
```

### 2. Package Windows Installer (.exe) & Portable Executable
To build the standalone Windows `.exe` setup installer and portable executable:
```bash
npm run dist:win
```
The compiled Windows binaries will be generated inside the `release/` directory:
- `release/OmniWorkspace Setup 1.0.0.exe` (NSIS Installer with desktop and start menu shortcuts)
- `release/OmniWorkspace 1.0.0.exe` (Standalone portable single-file executable)

---

## 🚀 GitHub Deployment Guide

To deploy this repository to your GitHub account:

### 1. Initialize Git and Commit
```bash
git init
git add .
git commit -m "feat: initial commit of OmniWorkspace platform"
```

### 2. Connect to Your GitHub Repository
```bash
git remote add origin git@github.com:Priyanshu845438/OmniWorkspace.git
git push -u origin main
```

### 3. Automated CI/CD & Releases
- Every push and PR automatically triggers `.github/workflows/ci.yml` across **Ubuntu, Windows, and macOS**.
- To automatically build and publish Windows `.exe` installers to GitHub Releases, push a tag or trigger the workflow manually:
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## 🛠️ Quickstart (Web, Desktop & Docker)

### Prerequisites
- Node.js **>= 22.5.0** (for built-in `node:sqlite` persistence)
- npm **>= 10.0.0**

### 1. Development Mode (Hot Reloading)
```bash
# Install dependencies
npm install

# Start development server and client simultaneously
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Standalone Production Mode
```bash
# Build production client, server, and electron bundles
npm run build

# Start production server with integrated frontend serving
npm start
```
Access the complete workspace on [http://localhost:3001](http://localhost:3001).

### 3. Docker Container Deployment
```bash
# Launch containerized OmniWorkspace with persistent storage
docker compose up -d
```
The container exposes the unified web workspace on [http://localhost:3001](http://localhost:3001).

### 4. Running Automated Tests & Typecheck
```bash
# Run 35 automated unit, security, and integration tests
npm test

# Full strict typecheck across server, client, and electron
npm run typecheck
```

---

## 🗺️ Project Architecture

```
omni-workspace/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # Multi-OS test & build matrix
│   │   └── release.yml            # Automated Windows .exe & multi-platform releases
│   └── ISSUE_TEMPLATE/            # Community contribution templates
├── client/
│   ├── src/
│   │   ├── components/            # Header, Sidebar, ExecutionTimeline, BottomPanel
│   │   ├── views/                 # Code, Research, Data, SQL, Automation, Media, Docs
│   │   ├── styles/                # Vanilla CSS tokens & design system
│   │   ├── App.tsx                # Central workspace orchestrator
│   │   └── main.tsx               # React 19 entrypoint
│   ├── index.html
│   └── vite.config.ts
├── server/
│   └── src/
│       ├── core/
│       │   ├── security/          # PathShield, CommandShield, PromptDefense, Permissions
│       │   ├── credentials/       # AES-256-GCM BYOK Vault
│       │   ├── gateway/           # OpenAI, Ollama, NVIDIA NIM, OpenRouter adapters
│       │   ├── models/            # Model registry catalog
│       │   ├── router/            # Capability router & safe fallback pipeline
│       │   ├── tools/             # Schema-validated tools (File, Terminal, Git, SQL, Web)
│       │   ├── agents/            # Modular ReAct agents & agent factory
│       │   ├── orchestrator/      # Universal 8-stage NLP orchestrator
│       │   ├── context/           # Dynamic context engine with token budgeting
│       │   ├── workflows/         # Directed Acyclic Graph (DAG) execution engine
│       │   ├── verification/      # Multi-domain compilation, SQL, and claim verifier
│       │   └── db/                # Node native SQLite workspace database
│       └── index.ts               # Express & SSE streaming server
├── electron/
│   └── src/
│       ├── main.ts                # Electron Windows container process
│       └── preload.ts             # Secure IPC bridge
├── tests/                         # Vitest unit, security, and integration suites
├── package.json                   # Scripts, electron-builder NSIS config
└── LICENSE                        # Apache 2.0
```

---

## 📜 License

Licensed under the [Apache License, Version 2.0](LICENSE).
You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).
