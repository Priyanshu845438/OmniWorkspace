# Privacy Manifesto

At OmniWorkspace, we believe that developers and organizations must own and control their data.

## Principles
1. **Zero Secret Telemetry**: OmniWorkspace collects 0% usage telemetry by default. No analytics pings, no event tracking.
2. **Direct-to-Provider AI Communication**: When you configure an API key for NVIDIA, OpenRouter, or OpenAI, requests travel directly from your local environment to the provider. We do not operate a proxy server that intercepts your prompts.
3. **Offline Mode First**: If you use local models via Ollama or vLLM, OmniWorkspace functions 100% offline without requiring internet access.
4. **Local Database Storage**: All chat histories, task executions, and project files are stored locally in SQLite (`.omni-data/workspace.db`).
