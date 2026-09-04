# Architecture Overview

OmniWorkspace follows a clean, modular, layered architecture designed for extensibility and performance.

```
+-------------------------------------------------------------+
|                  OmniWorkspace Client UI                     |
|  (React 19 + TypeScript + Vanilla CSS Design System)        |
|                                                             |
|  [Universal Command Bar]  [Perspective Switchers]  [Editor] |
|  [Execution Timeline]     [Bottom Drawer / Terminal / Git]  |
+-------------------------------------------------------------+
                              |
                     SSE / JSON REST IPC
                              |
+-------------------------------------------------------------+
|                  Core Orchestration Engine                  |
|                                                             |
|  1. Task Classifier (NLP intent & capability mapping)       |
|  2. Capability Registry & Model Router (Safe Fallback)      |
|  3. Context Engine (Token budgeting & active file pinning)  |
|  4. Specialized Agents (Coding, SQL, Research, Auto, Media) |
|  5. Verification Engine (Code compilation, SQL explain)     |
+-------------------------------------------------------------+
       |                      |                      |
+--------------+       +--------------+       +---------------+
| Provider     |       | Security &   |       | Tool Registry |
| Gateway      |       | Permissions  |       |               |
|              |       |              |       | - File Tools  |
| - NVIDIA NIM |       | - AES Vault  |       | - Terminal    |
| - OpenRouter |       | - PathShield |       | - Git Tools   |
| - Ollama     |       | - CmdShield  |       | - SQL Tools   |
| - OpenAI     |       | - PromptDef  |       | - Web Scraper |
+--------------+       +--------------+       +---------------+
```

## Security Boundaries
1. Filesystem boundary managed by `PathShield`.
2. Process boundary managed by `CommandShield`.
3. AI Context boundary managed by `PromptDefense`.
4. Authorization boundary managed by `PermissionManager`.
